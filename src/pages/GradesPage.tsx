import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentAcademicYear, useLevels, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Select, EmptyState } from '../components/ui';
import { fullName, GRADE_STATUS_LABELS, formatNumber } from '../lib/utils';
import { ClipboardList, Save, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export function GradesPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const { show } = useToast();
  const [levelId, setLevelId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [modules, setModules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  useEffect(() => {
    if (!year || !levelId) { setModules([]); return; }
    supabase.from('modules').select('*').eq('academic_year_id', year.id).eq('level_id', levelId).order('order_index')
      .then(({ data }) => { setModules(data ?? []); setModuleId(''); setSubjects([]); setSubjectId(''); });
  }, [year, levelId]);

  useEffect(() => {
    if (!year || !moduleId) { setSubjects([]); return; }
    supabase.from('subjects').select('*, teacher:teachers(*)').eq('academic_year_id', year.id).eq('module_id', moduleId).order('order_index')
      .then(({ data }) => { setSubjects(data ?? []); setSubjectId(''); });
  }, [year, moduleId]);

  const loadGrades = useCallback(async () => {
    if (!year || !subjectId) return;
    setLoading(true);
    const subject = subjects.find((s) => s.id === subjectId);
    const levelIdToUse = subject?.level_id ?? levelId;

    // Get enrolled students for this level
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student:students(*)')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelIdToUse)
      .eq('status', 'validated');

    const enrolledStudents = (enrollments ?? []).map((e: any) => e.student).filter(Boolean);
    enrolledStudents.sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));
    setStudents(enrolledStudents);

    // Get existing grades
    const { data: existingGrades } = await supabase
      .from('grades')
      .select('*')
      .eq('academic_year_id', year.id)
      .eq('subject_id', subjectId);

    const gradeMap: Record<string, any> = {};
    (existingGrades ?? []).forEach((g: any) => {
      gradeMap[g.student_id] = g;
    });
    setGrades(gradeMap);
    setDirty(false);
    setLoading(false);
  }, [year, subjectId, subjects, levelId]);

  useEffect(() => {
    if (subjectId) loadGrades();
  }, [subjectId, loadGrades]);

  function updateScore(studentId: string, scoreStr: string) {
    const existing = grades[studentId];
    const score = scoreStr === '' ? null : parseFloat(scoreStr);

    if (score !== null) {
      if (score < 0 || score > 20) {
        show('La note doit être entre 0 et 20', 'error');
        return;
      }
    }

    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(existing ?? { student_id: studentId, subject_id: subjectId, academic_year_id: year?.id, level_id: levelId }),
        score: score,
        is_absent: false,
        is_not_available: false,
        status: existing?.status === 'validated' ? 'corrected' : 'in_progress',
      },
    }));
    setDirty(true);
  }

  function markAbsent(studentId: string) {
    const existing = grades[studentId];
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(existing ?? { student_id: studentId, subject_id: subjectId, academic_year_id: year?.id, level_id: levelId }),
        is_absent: true,
        is_not_available: false,
        score: null,
        status: existing?.status === 'validated' ? 'corrected' : 'in_progress',
      },
    }));
    setDirty(true);
  }

  function markNA(studentId: string) {
    const existing = grades[studentId];
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(existing ?? { student_id: studentId, subject_id: subjectId, academic_year_id: year?.id, level_id: levelId }),
        is_not_available: true,
        is_absent: false,
        score: null,
        status: existing?.status === 'validated' ? 'corrected' : 'in_progress',
      },
    }));
    setDirty(true);
  }

  function handleKeyDown(e: React.KeyboardEvent, studentId: string, index: number) {
    if (e.key === 'Enter' || (e.key === 'ArrowDown')) {
      e.preventDefault();
      const nextStudent = students[index + 1];
      if (nextStudent) {
        const ref = inputRefs.current[nextStudent.id];
        ref?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = students[index - 1];
      if (prevStudent) {
        const ref = inputRefs.current[prevStudent.id];
        ref?.focus();
      }
    }
  }

  async function saveGrades() {
    if (!year) return;
    setSaving(true);
    const subject = subjects.find((s) => s.id === subjectId);
    const levelIdToUse = subject?.level_id ?? levelId;

    for (const studentId of Object.keys(grades)) {
      const g = grades[studentId];
      if (g.id) {
        // Update existing
        await supabase.from('grades').update({
          score: g.score,
          is_absent: g.is_absent,
          is_not_available: g.is_not_available,
          status: g.status,
        }).eq('id', g.id);
      } else {
        // Insert new
        await supabase.from('grades').insert({
          student_id: studentId,
          subject_id: subjectId,
          academic_year_id: year.id,
          level_id: levelIdToUse,
          score: g.score,
          is_absent: g.is_absent ?? false,
          is_not_available: g.is_not_available ?? false,
          status: g.status ?? 'in_progress',
        });
      }
    }

    show('Notes enregistrées', 'success');
    setDirty(false);
    setSaving(false);
    loadGrades();
  }

  async function validateGrades() {
    if (!year) return;
    setSaving(true);
    const subject = subjects.find((s) => s.id === subjectId);
    const levelIdToUse = subject?.level_id ?? levelId;

    for (const studentId of Object.keys(grades)) {
      const g = grades[studentId];
      if (g.id) {
        await supabase.from('grades').update({
          score: g.score,
          is_absent: g.is_absent,
          is_not_available: g.is_not_available,
          status: 'submitted',
        }).eq('id', g.id);
      } else {
        await supabase.from('grades').insert({
          student_id: studentId, subject_id: subjectId, academic_year_id: year.id,
          level_id: levelIdToUse, score: g.score,
          is_absent: g.is_absent ?? false, is_not_available: g.is_not_available ?? false,
          status: 'submitted',
        });
      }
    }

    show('Notes soumises pour validation', 'success');
    setDirty(false);
    setSaving(false);
    loadGrades();
  }

  const subject = subjects.find((s) => s.id === subjectId);

  return (
    <div>
      <PageHeader title="Saisie des notes" subtitle={year?.name ?? ''} />

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label-field">Niveau</label>
            <Select value={levelId} onChange={setLevelId} placeholder="Sélectionner..." options={levels.map((l) => ({ value: l.id, label: l.name }))} />
          </div>
          <div>
            <label className="label-field">Module</label>
            <Select value={moduleId} onChange={setModuleId} placeholder="Sélectionner..." options={modules.map((m) => ({ value: m.id, label: m.name }))} />
          </div>
          <div>
            <label className="label-field">Matière</label>
            <Select value={subjectId} onChange={setSubjectId} placeholder="Sélectionner..." options={subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))} />
          </div>
        </div>
      </Card>

      {!subjectId ? (
        <Card className="p-8">
          <EmptyState message="Sélectionnez un niveau, un module et une matière pour saisir les notes." icon={ClipboardList} />
        </Card>
      ) : loading ? (
        <LoadingSpinner label="Chargement des notes..." />
      ) : students.length === 0 ? (
        <Card className="p-8">
          <EmptyState message="Aucun étudiant inscrit pour ce niveau." />
        </Card>
      ) : (
        <>
          {/* Subject info */}
          <Card className="p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{subject?.name}</h3>
                <p className="text-sm text-gray-500">
                  Coefficient: {subject?.coefficient} | Seuil: {subject?.passing_threshold}/20 | Enseignant: {subject?.teacher ? fullName(subject.teacher.last_name, subject.teacher.first_name) : '-'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {dirty && <Badge color="gold">Modifications non enregistrées</Badge>}
                <button className="btn-secondary flex items-center gap-2" onClick={saveGrades} disabled={saving || !dirty}>
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
                <button className="btn-primary flex items-center gap-2" onClick={validateGrades} disabled={saving}>
                  <CheckCircle className="w-4 h-4" /> Soumettre
                </button>
              </div>
            </div>
          </Card>

          {/* Grades table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 w-12">N°</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Matricule</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Nom et prénoms</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 w-32">Note /20</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 w-24">Statut</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s, i) => {
                    const g = grades[s.id];
                    const isLocked = g?.status === 'validated' || g?.status === 'locked';
                    return (
                      <tr key={s.id} className="table-row-hover">
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-ibr-700">{s.matricule ?? '-'}</td>
                        <td className="px-3 py-2 font-medium">{fullName(s.last_name, s.first_name)}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            ref={(el) => { if (el) inputRefs.current[s.id] = el; }}
                            type="number"
                            min="0"
                            max="20"
                            step="0.25"
                            value={g?.score ?? ''}
                            onChange={(e) => updateScore(s.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, s.id, i)}
                            disabled={isLocked}
                            className="w-20 text-center px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ibr-500 focus:border-transparent outline-none disabled:bg-gray-100"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {g?.is_absent ? <Badge color="red">Absent</Badge> :
                           g?.is_not_available ? <Badge color="gray">N/A</Badge> :
                           g?.status ? <Badge color={g.status === 'validated' ? 'green' : g.status === 'submitted' ? 'gold' : 'gray'}>{GRADE_STATUS_LABELS[g.status] ?? g.status}</Badge> :
                           <Badge color="gray">-</Badge>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!isLocked && (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => markAbsent(s.id)} className="text-xs px-2 py-1 rounded hover:bg-red-50 text-red-600" title="Marquer absent">Abs</button>
                              <button onClick={() => markNA(s.id)} className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-600" title="Non disponible">N/A</button>
                            </div>
                          )}
                          {isLocked && <Lock className="w-4 h-4 text-gray-400 mx-auto" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-gray-400 mt-2">
            Astuce: Utilisez la touche Entrée ou les flèches haut/bas pour passer à l'étudiant suivant.
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// RANKINGS PAGE
// ============================================================================
export function RankingsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [levelId, setLevelId] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  async function calculateAndShow() {
    if (!year || !levelId) return;
    setLoading(true);

    // Get all subjects for this level/year
    const { data: subjects } = await supabase.from('subjects').select('*').eq('academic_year_id', year.id).eq('level_id', levelId).eq('is_active', true);
    if (!subjects || subjects.length === 0) { show('Aucune matière trouvée', 'error'); setLoading(false); return; }

    // Get enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student:students(*)')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelId)
      .eq('status', 'validated');
    const students = (enrollments ?? []).map((e: any) => e.student).filter(Boolean);

    // Get all grades
    const { data: grades } = await supabase
      .from('grades')
      .select('*')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelId)
      .in('status', ['validated', 'submitted', 'corrected']);

    // Calculate averages
    const studentResults: any[] = [];
    for (const student of students) {
      let totalPoints = 0;
      let totalCoefficients = 0;
      let subjectsPassed = 0;
      let subjectsFailed = 0;
      let subjectsCounted = 0;

      for (const subj of subjects) {
        const grade = grades?.find((g: any) => g.student_id === student.id && g.subject_id === subj.id);
        if (!grade || grade.score === null || grade.is_absent || grade.is_not_available) continue;

        totalPoints += grade.score * subj.coefficient;
        totalCoefficients += subj.coefficient;
        subjectsCounted++;
        if (grade.score >= subj.passing_threshold) subjectsPassed++;
        else subjectsFailed++;
      }

      const weightedAverage = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;
      const simpleAverage = subjectsCounted > 0 ? totalPoints / totalCoefficients : 0;

      studentResults.push({
        student,
        totalPoints,
        totalCoefficients,
        average: Math.round(simpleAverage * 100) / 100,
        weightedAverage: Math.round(weightedAverage * 100) / 100,
        subjectsPassed,
        subjectsFailed,
        subjectsCounted,
        passRate: subjectsCounted > 0 ? Math.round((subjectsPassed / subjectsCounted) * 100) : 0,
      });
    }

    // Sort by weighted average descending
    studentResults.sort((a, b) => b.weightedAverage - a.weightedAverage);

    // Assign ranks (handle ex aequo)
    let rank = 0;
    let prevAvg: number | null = null;
    let sameRankCount = 0;
    for (let i = 0; i < studentResults.length; i++) {
      if (prevAvg === null || studentResults[i].weightedAverage !== prevAvg) {
        rank = i + 1;
        sameRankCount = 1;
      } else {
        sameRankCount++;
      }
      studentResults[i].rank = rank;
      prevAvg = studentResults[i].weightedAverage;
    }

    // Determine decision
    for (const r of studentResults) {
      if (r.weightedAverage >= 10 && r.subjectsFailed === 0) r.decision = 'admis';
      else if (r.weightedAverage >= 10) r.decision = 'admis_reserve';
      else if (r.weightedAverage >= 8) r.decision = 'ajourne';
      else r.decision = 'redoublant';
    }

    // Save to annual_results
    for (const r of studentResults) {
      const enrollment = enrollments?.find((e: any) => e.student?.id === r.student.id);
      const { data: existing } = await supabase
        .from('annual_results')
        .select('id')
        .eq('student_id', r.student.id)
        .eq('academic_year_id', year.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('annual_results').update({
          total_points: r.totalPoints, average: r.average, weighted_average: r.weightedAverage,
          subjects_passed: r.subjectsPassed, subjects_failed: r.subjectsFailed,
          subjects_counted: r.subjectsCounted, pass_rate: r.passRate, rank: r.rank,
          decision: r.decision, computed_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('annual_results').insert({
          student_id: r.student.id, academic_year_id: year.id, level_id: levelId,
          enrollment_id: enrollment?.id ?? null,
          total_points: r.totalPoints, average: r.average, weighted_average: r.weightedAverage,
          subjects_passed: r.subjectsPassed, subjects_failed: r.subjectsFailed,
          subjects_counted: r.subjectsCounted, pass_rate: r.passRate, rank: r.rank,
          decision: r.decision,
        });
      }

      // Save ranking
      await supabase.from('rankings').upsert({
        student_id: r.student.id, academic_year_id: year.id, level_id: levelId,
        rank: r.rank, average: r.weightedAverage, decision: r.decision,
        computed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,academic_year_id,level_id' });
    }

    setResults(studentResults);
    setLoading(false);
    show('Classement calculé avec succès', 'success');
  }

  const decisionColors: Record<string, string> = {
    admis: 'green', admis_reserve: 'gold', ajourne: 'gold', redoublant: 'red',
  };

  return (
    <div>
      <PageHeader title="Moyennes & classements" subtitle={year?.name ?? ''} />

      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="label-field">Niveau</label>
            <Select value={levelId} onChange={setLevelId} placeholder="Sélectionner..." options={levels.map((l) => ({ value: l.id, label: l.name }))} />
          </div>
          <button className="btn-primary" onClick={calculateAndShow} disabled={!levelId || loading}>
            {loading ? 'Calcul...' : 'Calculer les moyennes et classements'}
          </button>
        </div>
      </Card>

      {results.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 w-16">Rang</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Matricule</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Nom et prénoms</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Moy. pondérée</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Matières validées</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Taux réussite</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Décision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr key={r.student.id} className="table-row-hover">
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        r.rank === 1 ? 'bg-gold-100 text-gold-700' : r.rank === 2 ? 'bg-gray-200 text-gray-700' : r.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-ibr-50 text-ibr-700'
                      }`}>{r.rank}</span>
                    </td>
                    <td className="px-3 py-2 font-medium text-ibr-700">{r.student.matricule ?? '-'}</td>
                    <td className="px-3 py-2 font-medium">{fullName(r.student.last_name, r.student.first_name)}</td>
                    <td className="px-3 py-2 text-center font-bold">{formatNumber(r.weightedAverage)}/20</td>
                    <td className="px-3 py-2 text-center">{r.subjectsPassed}/{r.subjectsCounted}</td>
                    <td className="px-3 py-2 text-center">{r.passRate}%</td>
                    <td className="px-3 py-2 text-center">
                      <Badge color={decisionColors[r.decision] ?? 'gray'}>
                        {r.decision === 'admis' ? 'Admis' : r.decision === 'admis_reserve' ? 'Admis avec réserve' : r.decision === 'ajourne' ? 'Ajourné' : 'Redoublant'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
