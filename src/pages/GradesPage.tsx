import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentAcademicYear, useLevels, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Select, EmptyState, Modal } from '../components/ui';
import { fullName, GRADE_STATUS_LABELS, formatNumber, formatFCFA } from '../lib/utils';
import {
  ClipboardList, Save, Lock, CheckCircle, AlertCircle, FileSpreadsheet,
  Award, ShieldAlert, CheckSquare, Edit3, HelpCircle, Plus
} from 'lucide-react';

export function GradesPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const { show } = useToast();

  const [activePanel, setActivePanel] = useState<'entry' | 'import' | 'deliberation'>('entry');

  const [levelId, setLevelId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const [modules, setModules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, any>>({});
  const [studentBonuses, setStudentBonuses] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  // Justification Modal state
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [justifyData, setJustifyData] = useState<{ studentId: string; newScore: number | null; oldScore: number | null; isAbsent?: boolean; isExempted?: boolean } | null>(null);
  const [justifyReason, setJustifyReason] = useState('');

  // Excel Import state
  const [excelPasteText, setExcelPasteText] = useState('');
  const [excelParsedRows, setExcelParsedRows] = useState<any[]>([]);
  const [excelErrors, setExcelErrors] = useState<string[]>([]);
  const [importStep, setImportStep] = useState(1);

  // Deliberation Dashboard state
  const [deliberationResults, setDeliberationResults] = useState<any[]>([]);
  const [showDelibModal, setShowDelibModal] = useState(false);
  const [selectedDelibRow, setSelectedDelibRow] = useState<any>(null);
  const [overrideDecision, setOverrideDecision] = useState('');
  const [delibObservations, setDelibObservations] = useState('');

  // Ranking method config from settings
  const [rankingMethod, setRankingMethod] = useState<'standard' | 'dense'>('standard');

  // Load modules when year/level changes
  useEffect(() => {
    if (!year || !levelId) { setModules([]); return; }
    supabase.from('modules').select('*').eq('academic_year_id', year.id).eq('level_id', levelId).order('order_index')
      .then(({ data }) => { setModules(data ?? []); setModuleId(''); setSubjects([]); setSubjectId(''); });
  }, [year, levelId]);

  // Load subjects when module changes
  useEffect(() => {
    if (!year || !moduleId) { setSubjects([]); return; }
    supabase.from('subjects').select('*, teacher:teachers(*)').eq('academic_year_id', year.id).eq('module_id', moduleId).order('order_index')
      .then(({ data }) => { setSubjects(data ?? []); setSubjectId(''); });
  }, [year, moduleId]);

  // Fetch ranking config
  useEffect(() => {
    supabase.from('settings').select('*').eq('key', 'grading_config').maybeSingle().then(({ data }) => {
      if (data && data.value) {
        const val = data.value as any;
        if (val.ranking_method) setRankingMethod(val.ranking_method);
      }
    });
  }, []);

  const loadGradesAndBonuses = useCallback(async () => {
    if (!year || !subjectId) return;
    setLoading(true);
    const subject = subjects.find((s) => s.id === subjectId);
    const levelIdToUse = subject?.level_id ?? levelId;

    // Get enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student:students(*)')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelIdToUse)
      .eq('status', 'validated');

    const enrolledStudents = (enrollments ?? []).map((e: any) => e.student).filter(Boolean);
    enrolledStudents.sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));
    setStudents(enrolledStudents);

    // Get academic bonuses for active students
    const { data: bonuses } = await supabase
      .from('student_academic_bonuses')
      .select('*')
      .eq('academic_year_id', year.id);

    const bonusMap: Record<string, number> = {};
    (bonuses ?? []).forEach((b: any) => {
      bonusMap[b.student_id] = (bonusMap[b.student_id] || 0) + parseFloat(b.points);
    });
    setStudentBonuses(bonusMap);

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
    if (subjectId) loadGradesAndBonuses();
  }, [subjectId, loadGradesAndBonuses]);

  function updateScore(studentId: string, scoreStr: string) {
    const existing = grades[studentId];
    const score = scoreStr === '' ? null : parseFloat(scoreStr);

    if (score !== null) {
      if (score < 0 || score > 20) {
        show('La note doit être entre 0 et 20', 'error');
        return;
      }
    }

    // Require justification if already validated/locked or previously saved
    if (existing && (existing.status === 'validated' || existing.status === 'locked')) {
      setJustifyData({ studentId, newScore: score, oldScore: existing.score });
      setJustifyReason('');
      setShowJustifyModal(true);
      return;
    }

    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(existing ?? { student_id: studentId, subject_id: subjectId, academic_year_id: year?.id, level_id: levelId }),
        score: score,
        is_absent: false,
        is_exempted: false,
        is_not_available: false,
        status: existing?.status === 'validated' ? 'corrected' : 'in_progress',
      },
    }));
    setDirty(true);
  }

  function markAbsent(studentId: string) {
    const existing = grades[studentId];

    if (existing && (existing.status === 'validated' || existing.status === 'locked')) {
      setJustifyData({ studentId, newScore: null, oldScore: existing.score, isAbsent: true });
      setJustifyReason('');
      setShowJustifyModal(true);
      return;
    }

    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(existing ?? { student_id: studentId, subject_id: subjectId, academic_year_id: year?.id, level_id: levelId }),
        is_absent: true,
        is_exempted: false,
        is_not_available: false,
        score: null,
        status: existing?.status === 'validated' ? 'corrected' : 'in_progress',
      },
    }));
    setDirty(true);
  }

  function markExempted(studentId: string) {
    const existing = grades[studentId];

    if (existing && (existing.status === 'validated' || existing.status === 'locked')) {
      setJustifyData({ studentId, newScore: null, oldScore: existing.score, isExempted: true });
      setJustifyReason('');
      setShowJustifyModal(true);
      return;
    }

    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(existing ?? { student_id: studentId, subject_id: subjectId, academic_year_id: year?.id, level_id: levelId }),
        is_exempted: true,
        is_absent: false,
        is_not_available: false,
        score: null,
        status: existing?.status === 'validated' ? 'corrected' : 'in_progress',
      },
    }));
    setDirty(true);
  }

  // Save changes with justification
  async function applyJustifiedCorrection() {
    if (!justifyData || !justifyReason.trim()) {
      show('Une justification écrite est requise pour modifier cette note.', 'error');
      return;
    }

    const { studentId, newScore, oldScore, isAbsent, isExempted } = justifyData;
    const existing = grades[studentId];

    const updatedGrade = {
      ...(existing ?? { student_id: studentId, subject_id: subjectId, academic_year_id: year?.id, level_id: levelId }),
      score: newScore,
      is_absent: isAbsent ?? false,
      is_exempted: isExempted ?? false,
      is_not_available: false,
      status: 'corrected',
    };

    setGrades((prev) => ({
      ...prev,
      [studentId]: updatedGrade,
    }));

    // Perform immediate DB update and log history to avoid status conflicts
    setSaving(true);
    let gradeId = existing?.id;

    if (!gradeId) {
      const { data } = await supabase.from('grades').insert({
        student_id: studentId, subject_id: subjectId, academic_year_id: year?.id,
        level_id: levelId, score: newScore, is_absent: isAbsent ?? false,
        is_exempted: isExempted ?? false, status: 'corrected'
      }).select().single();
      gradeId = data?.id;
    } else {
      await supabase.from('grades').update({
        score: newScore,
        is_absent: isAbsent ?? false,
        is_exempted: isExempted ?? false,
        status: 'corrected',
      }).eq('id', gradeId);
    }

    if (gradeId) {
      await supabase.from('grade_history').insert({
        grade_id: gradeId,
        old_score: oldScore,
        new_score: newScore,
        old_status: existing?.status ?? 'draft',
        new_status: 'corrected',
        change_reason: justifyReason,
      });
    }

    show('Correction enregistrée avec historique', 'success');
    setShowJustifyModal(false);
    setJustifyData(null);
    setSaving(false);
    loadGradesAndBonuses();
  }

  function handleKeyDown(e: React.KeyboardEvent, studentId: string, index: number) {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = students[index + 1];
      if (nextStudent) {
        inputRefs.current[nextStudent.id]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = students[index - 1];
      if (prevStudent) {
        inputRefs.current[prevStudent.id]?.focus();
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
      if (g.status === 'corrected') continue; // Handled dynamically in justification screen
      
      if (g.id) {
        await supabase.from('grades').update({
          score: g.score,
          is_absent: g.is_absent,
          is_exempted: g.is_exempted,
          is_not_available: g.is_not_available,
          status: g.status,
        }).eq('id', g.id);
      } else {
        await supabase.from('grades').insert({
          student_id: studentId,
          subject_id: subjectId,
          academic_year_id: year.id,
          level_id: levelIdToUse,
          score: g.score,
          is_absent: g.is_absent ?? false,
          is_exempted: g.is_exempted ?? false,
          is_not_available: g.is_not_available ?? false,
          status: g.status ?? 'in_progress',
        });
      }
    }

    show('Notes enregistrées', 'success');
    setDirty(false);
    setSaving(false);
    loadGradesAndBonuses();
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
          is_exempted: g.is_exempted,
          is_not_available: g.is_not_available,
          status: 'submitted',
        }).eq('id', g.id);
      } else {
        await supabase.from('grades').insert({
          student_id: studentId, subject_id: subjectId, academic_year_id: year.id,
          level_id: levelIdToUse, score: g.score,
          is_absent: g.is_absent ?? false, is_exempted: g.is_exempted ?? false,
          status: 'submitted',
        });
      }
    }

    show('Notes soumises avec succès pour validation', 'success');
    setDirty(false);
    setSaving(false);
    loadGradesAndBonuses();
  }

  // ============================================================================
  // EXCEL IMPORT ENGINE
  // ============================================================================
  function parseExcelPaste() {
    if (!excelPasteText.trim()) {
      show('Veuillez copier et coller des colonnes de données depuis Excel', 'error');
      return;
    }
    const lines = excelPasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows: any[] = [];
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      // Split by tab (Excel standard) or semicolon
      const parts = line.split(/\t|;/).map((p) => p.trim());
      if (parts.length < 2) {
        errors.push(`Ligne ${idx + 1}: Format incorrect. Attendu: 'Matricule [TAB/Semicolon] Note'`);
        return;
      }

      const mat = parts[0];
      const noteStr = parts[1];
      const parsedNote = noteStr.toLowerCase() === 'abs' || noteStr.toLowerCase() === 'absent'
        ? 'abs'
        : noteStr.toLowerCase() === 'disp' || noteStr.toLowerCase() === 'dispensé'
          ? 'disp'
          : parseFloat(noteStr.replace(',', '.'));

      if (parsedNote !== 'abs' && parsedNote !== 'disp' && (isNaN(parsedNote as number) || (parsedNote as number) < 0 || (parsedNote as number) > 20)) {
        errors.push(`Ligne ${idx + 1}: Note '${noteStr}' invalide. Doit être entre 0 et 20, 'ABS', ou 'DISP'`);
        return;
      }

      // Check if student exists in current level list
      const matchedStud = students.find((s) => (s.matricule && s.matricule.includes(mat)) || s.student_number === mat);
      
      rows.push({
        lineNo: idx + 1,
        inputMatricule: mat,
        score: typeof parsedNote === 'number' ? parsedNote : null,
        isAbsent: parsedNote === 'abs',
        isExempted: parsedNote === 'disp',
        student: matchedStud || null,
      });
    });

    setExcelParsedRows(rows);
    setExcelErrors(errors);
    setImportStep(2);
  }

  async function executeExcelImport() {
    if (!year || !subjectId) return;
    setSaving(true);
    let successCount = 0;

    for (const r of excelParsedRows) {
      if (!r.student) continue; // Skip unmapped rows

      const existing = grades[r.student.id];
      const gData = {
        student_id: r.student.id,
        subject_id: subjectId,
        academic_year_id: year.id,
        level_id: levelId,
        score: r.score,
        is_absent: r.isAbsent,
        is_exempted: r.isExempted,
        is_not_available: false,
        status: 'in_progress',
      };

      if (existing) {
        await supabase.from('grades').update(gData).eq('id', existing.id);
      } else {
        await supabase.from('grades').insert(gData);
      }
      successCount++;
    }

    show(`${successCount} note(s) importée(s) avec succès !`, 'success');
    setExcelPasteText('');
    setExcelParsedRows([]);
    setImportStep(1);
    setActivePanel('entry');
    loadGradesAndBonuses();
    setSaving(false);
  }

  // ============================================================================
  // DELIBERATION PANEL CALCULATIONS
  // ============================================================================
  const fetchDeliberationData = async () => {
    if (!year || !levelId) return;
    setLoading(true);

    // 1. Get subjects
    const { data: subjs } = await supabase.from('subjects').select('*').eq('academic_year_id', year.id).eq('level_id', levelId).eq('is_active', true);
    if (!subjs || subjs.length === 0) {
      show('Aucune matière configurée pour ce niveau.', 'error');
      setLoading(false);
      return;
    }

    // 2. Get students
    const { data: enrolls } = await supabase
      .from('enrollments')
      .select('student:students(*)')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelId)
      .eq('status', 'validated');
    const enrolledStudents = (enrolls ?? []).map((e: any) => e.student).filter(Boolean);

    // 3. Get grades
    const { data: allGrades } = await supabase
      .from('grades')
      .select('*')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelId);

    // 4. Get student bonuses
    const { data: bonuses } = await supabase
      .from('student_academic_bonuses')
      .select('*')
      .eq('academic_year_id', year.id);

    const bonusMap: Record<string, number> = {};
    (bonuses ?? []).forEach((b: any) => {
      bonusMap[b.student_id] = (bonusMap[b.student_id] || 0) + parseFloat(b.points);
    });

    // 5. Calculate weighted averages
    const classResults: any[] = [];
    for (const stud of enrolledStudents) {
      let totalPoints = 0;
      let totalCoefs = 0;
      let passed = 0;
      let failed = 0;
      let counted = 0;

      for (const sub of subjs) {
        const grade = allGrades?.find((g) => g.student_id === stud.id && g.subject_id === sub.id);
        if (!grade || grade.score === null || grade.is_exempted || grade.is_not_available) continue;

        const val = grade.is_absent ? 0 : grade.score;
        totalPoints += val * sub.coefficient;
        totalCoefs += sub.coefficient;
        counted++;

        if (val >= sub.passing_threshold) passed++;
        else failed++;
      }

      const weightedAvg = totalCoefs > 0 ? (totalPoints / totalCoefs) : 0;
      const bonusPoints = bonusMap[stud.id] || 0;
      const finalAverage = Math.round((weightedAvg + bonusPoints) * 100) / 100;

      // Classify decision draft
      let draftDecision = 'ajourne';
      if (finalAverage >= 10 && failed === 0) draftDecision = 'admis';
      else if (finalAverage >= 10) draftDecision = 'admis_reserve';
      else if (finalAverage >= 8) draftDecision = 'ajourne';
      else draftDecision = 'redoublant';

      // Check if decision override already exists in database
      const { data: dbDec } = await supabase
        .from('academic_decisions')
        .select('*')
        .eq('student_id', stud.id)
        .eq('academic_year_id', year.id)
        .maybeSingle();

      classResults.push({
        student: stud,
        finalAverage,
        weightedAvg,
        bonusPoints,
        subjectsCounted: counted,
        subjectsPassed: passed,
        subjectsFailed: failed,
        decision: dbDec?.decision ?? draftDecision,
        observations: dbDec?.reason ?? '',
        dbDecisionId: dbDec?.id ?? null,
      });
    }

    // Sort by final average descending
    classResults.sort((a, b) => b.finalAverage - a.finalAverage);

    // Apply ranking rules standard vs dense
    let rank = 0;
    let prevAvg: number | null = null;
    for (let i = 0; i < classResults.length; i++) {
      if (prevAvg === null || classResults[i].finalAverage !== prevAvg) {
        if (rankingMethod === 'standard') {
          rank = i + 1;
        } else {
          rank++;
        }
      }
      classResults[i].rank = rank;
      prevAvg = classResults[i].finalAverage;
    }

    setDeliberationResults(classResults);
    setLoading(false);
  };

  const saveOverrideDecision = async () => {
    if (!selectedDelibRow || !year) return;
    setSaving(true);

    const { student, dbDecisionId } = selectedDelibRow;

    if (dbDecisionId) {
      await supabase.from('academic_decisions').update({
        decision: overrideDecision,
        reason: delibObservations,
        decided_at: new Date().toISOString(),
      }).eq('id', dbDecisionId);
    } else {
      await supabase.from('academic_decisions').insert({
        student_id: student.id,
        academic_year_id: year.id,
        decision: overrideDecision,
        reason: delibObservations,
      });
    }

    show('Décision enregistrée avec succès', 'success');
    setShowDelibModal(false);
    setSaving(false);
    fetchDeliberationData();
  };

  const subject = subjects.find((s) => s.id === subjectId);

  return (
    <div className="animate-slide-in">
      <PageHeader title="Saisie des notes & délibérations" subtitle={year?.name ?? ''} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActivePanel('entry')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activePanel === 'entry' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Feuille de saisie
        </button>
        <button
          onClick={() => { setActivePanel('import'); setImportStep(1); }}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activePanel === 'import' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Import Excel / Copier-Coller
        </button>
        <button
          onClick={() => { setActivePanel('deliberation'); fetchDeliberationData(); }}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activePanel === 'deliberation' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Délibération du jury
        </button>
      </div>

      {/* ============================================================================
          PANEL 1: MANUAL GRADES ENTRY
          ============================================================================ */}
      {activePanel === 'entry' && (
        <>
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
                    <h3 className="font-bold text-gray-900 text-base">{subject?.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Coefficient: {subject?.coefficient} | Seuil de validation: {subject?.passing_threshold}/20 | Enseignant: {subject?.teacher ? fullName(subject.teacher.last_name, subject.teacher.first_name) : '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dirty && <Badge color="gold">Modifications en cours...</Badge>}
                    <button className="btn-secondary flex items-center gap-1.5 py-2" onClick={saveGrades} disabled={saving || !dirty}>
                      <Save className="w-4 h-4" /> Enregistrer brouillon
                    </button>
                    <button className="btn-primary flex items-center gap-1.5 py-2" onClick={validateGrades} disabled={saving}>
                      <CheckCircle className="w-4 h-4" /> Valider & Fermer
                    </button>
                  </div>
                </div>
              </Card>

              {/* Grades Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-600 w-12">N°</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Matricule</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Nom et prénoms</th>
                        <th className="text-center px-5 py-3.5 font-semibold text-gray-600 w-36">Note /20</th>
                        <th className="text-center px-5 py-3.5 font-semibold text-gray-600 w-28">Statut</th>
                        <th className="text-center px-5 py-3.5 font-semibold text-gray-600 w-44">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((s, i) => {
                        const g = grades[s.id];
                        const isLocked = g?.status === 'locked';
                        const scoreIsFailing = g?.score !== null && g?.score < (subject?.passing_threshold || 10);
                        return (
                          <tr key={s.id} className="table-row-hover">
                            <td className="px-5 py-3.5 text-gray-500">{i + 1}</td>
                            <td className="px-5 py-3.5 font-semibold text-ibr-700 font-mono">{s.matricule ?? '-'}</td>
                            <td className="px-5 py-3.5 font-semibold text-gray-900">{fullName(s.last_name, s.first_name)}</td>
                            <td className="px-5 py-3.5 text-center">
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
                                className={`w-24 text-center px-3 py-1.5 border rounded-xl focus:ring-4 focus:ring-ibr-500/10 focus:border-ibr-500 outline-none disabled:bg-gray-50 font-bold transition-all ${
                                  scoreIsFailing ? 'border-red-300 text-red-700 focus:border-red-500' : 'border-gray-200'
                                }`}
                                placeholder="-"
                              />
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {g?.is_absent ? <Badge color="red">Absent</Badge> :
                               g?.is_exempted ? <Badge color="blue">Dispensé</Badge> :
                               g?.status ? <Badge color={g.status === 'validated' || g.status === 'locked' ? 'green' : g.status === 'submitted' ? 'gold' : 'gray'}>{GRADE_STATUS_LABELS[g.status] ?? g.status}</Badge> :
                               <Badge color="gray">-</Badge>}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {!isLocked && (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => markAbsent(s.id)} className="btn-secondary py-1 px-2.5 text-xs text-red-600 hover:text-red-700 font-semibold" title="Marquer absent">ABS</button>
                                  <button onClick={() => markExempted(s.id)} className="btn-secondary py-1 px-2.5 text-xs text-blue-600 hover:text-blue-700 font-semibold" title="Non dispensé">DISP</button>
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
            </>
          )}
        </>
      )}

      {/* ============================================================================
          PANEL 2: EXCEL SPREADSHEET IMPORT
          ============================================================================ */}
      {activePanel === 'import' && (
        <div className="space-y-4">
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
              <EmptyState message="Sélectionnez d'abord un niveau, un module et une matière cible pour l'importation." icon={FileSpreadsheet} />
            </Card>
          ) : importStep === 1 ? (
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Copier-Coller vos colonnes Excel</h4>
                  <p className="text-xs text-gray-400 mt-1">Copiez deux colonnes depuis Excel (colonne 1: Matricule ou N° permanent, colonne 2: Note / ABS / DISP) puis collez-les ci-dessous.</p>
                </div>
                <Badge color="ibr">{subject?.name}</Badge>
              </div>

              <textarea
                className="input-field min-h-[220px] font-mono text-sm leading-relaxed"
                value={excelPasteText}
                onChange={(e) => setExcelPasteText(e.target.value)}
                placeholder="Exemple :&#10;0137&#9;15.5&#10;0138&#9;ABS&#10;0144&#9;12&#10;0145&#9;DISP"
              />

              <div className="flex justify-end">
                <button className="btn-primary" onClick={parseExcelPaste}>Analyser les données</button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="font-bold text-gray-900 text-sm">Prévisualisation de l'importation</h4>
                <button className="btn-secondary py-1 text-xs" onClick={() => setImportStep(1)}>Rééditer le collage</button>
              </div>

              {excelErrors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4" /> {excelErrors.length} erreur(s) détectée(s) :
                  </div>
                  <ul className="text-xs text-red-600 list-disc pl-5 max-h-36 overflow-y-auto space-y-0.5">
                    {excelErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto border rounded-xl max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-600 font-semibold">Ligne</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-semibold">Identifiant saisi</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-semibold">Étudiant détecté</th>
                      <th className="text-center px-4 py-2 text-gray-600 font-semibold">Note / Statut</th>
                      <th className="text-center px-4 py-2 text-gray-600 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {excelParsedRows.map((r, idx) => (
                      <tr key={idx} className={!r.student ? 'bg-amber-50/30' : ''}>
                        <td className="px-4 py-2 text-gray-400 font-mono text-xs">{r.lineNo}</td>
                        <td className="px-4 py-2 font-mono font-semibold text-gray-700">{r.inputMatricule}</td>
                        <td className="px-4 py-2">
                          {r.student ? (
                            <span className="font-semibold text-gray-900">{fullName(r.student.last_name, r.student.first_name)}</span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1 text-xs font-semibold">
                              <ShieldAlert className="w-3.5 h-3.5" /> Non trouvé (sera ignoré)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center font-bold">
                          {r.isAbsent ? <Badge color="red">Absent</Badge> : r.isExempted ? <Badge color="blue">Dispensé</Badge> : `${r.score}/20`}
                        </td>
                        <td className="px-4 py-2 text-center text-xs">
                          {r.student ? <Badge color="green">Prêt</Badge> : <Badge color="gray">Exclu</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button className="btn-secondary" onClick={() => setImportStep(1)}>Annuler</button>
                <button className="btn-primary" onClick={executeExcelImport} disabled={saving || excelParsedRows.filter((x) => x.student).length === 0}>
                  {saving ? 'Importation...' : 'Valider et importer les notes'}
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================================
          PANEL 3: DELIBERATION DASHBOARD
          ============================================================================ */}
      {activePanel === 'deliberation' && (
        <div className="space-y-4">
          <Card className="p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1">
                <label className="label-field">Niveau</label>
                <Select value={levelId} onChange={setLevelId} placeholder="Sélectionner..." options={levels.map((l) => ({ value: l.id, label: l.name }))} />
              </div>
              <button className="btn-primary flex items-center gap-1.5 py-2.5" onClick={fetchDeliberationData} disabled={!levelId || loading}>
                <Award className="w-4 h-4" /> Charger le jury de délibération
              </button>
            </div>
          </Card>

          {loading ? (
            <LoadingSpinner label="Calcul des classements et traitement du jury..." />
          ) : deliberationResults.length === 0 ? (
            <Card className="p-8">
              <EmptyState message="Choisissez un niveau académique pour afficher la synthèse de délibération." icon={Award} />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600 w-16">Rang</th>
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Matricule</th>
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Nom et prénoms</th>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600">Moy. Pondérée</th>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600">Bonus Assiduité</th>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600">Matières validées</th>
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Décision proposée / prise</th>
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Observations jury</th>
                      <th className="text-center px-4 py-3.5 font-semibold text-gray-600">Arbitrage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deliberationResults.map((r, idx) => {
                      const badgeColors: Record<string, any> = {
                        admis: 'green', admis_reserve: 'gold', ajourne: 'gold', redoublant: 'red'
                      };
                      return (
                        <tr key={r.student.id} className="table-row-hover">
                          <td className="px-4 py-3.5 text-center font-bold">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ibr-50 text-ibr-800 font-bold text-xs">{r.rank}</span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-gray-700 font-mono">{r.student.matricule ?? '-'}</td>
                          <td className="px-4 py-3.5 font-semibold text-gray-900">{fullName(r.student.last_name, r.student.first_name)}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-ibr-900">{r.finalAverage}/20</td>
                          <td className="px-4 py-3.5 text-center text-xs text-green-700 font-bold">+{r.bonusPoints} pt(s)</td>
                          <td className="px-4 py-3.5 text-center text-gray-600 font-medium">{r.subjectsPassed} / {r.subjectsCounted}</td>
                          <td className="px-4 py-3.5">
                            <Badge color={badgeColors[r.decision] ?? 'gray'}>
                              {r.decision === 'admis' ? 'Admis' : r.decision === 'admis_reserve' ? 'Admis avec réserve' : r.decision === 'ajourne' ? 'Ajourné' : 'Redoublant'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 italic max-w-xs truncate">{r.observations || '-'}</td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 mx-auto"
                              onClick={() => {
                                setSelectedDelibRow(r);
                                setOverrideDecision(r.decision);
                                setDelibObservations(r.observations);
                                setShowDelibModal(true);
                              }}
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Décider
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================================
          MODAL: JUSTIFICATION DE MODIFICATION DE NOTE VERROUILLÉE
          ============================================================================ */}
      <Modal open={showJustifyModal} onClose={() => setShowJustifyModal(false)} title="Justification de modification de note">
        <div className="space-y-4 animate-scale-in">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-950 text-xs flex gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Avertissement de sécurité RLS & Audit :</p>
              <p className="mt-0.5">
                Cette note a déjà été soumise ou validée académiquement. Modifier cette note nécessite de fournir une justification écrite obligatoire, qui sera enregistrée de manière permanente dans le journal d'audit (`grade_history`).
              </p>
            </div>
          </div>

          <div className="text-sm space-y-1 bg-gray-50 p-3 rounded-xl">
            <p className="text-gray-500">Matière : <span className="font-semibold text-gray-900">{subject?.name}</span></p>
            <p className="text-gray-500">Étudiant : <span className="font-semibold text-gray-900">{justifyData ? fullName(students.find(s=>s.id===justifyData.studentId)?.last_name, students.find(s=>s.id===justifyData.studentId)?.first_name) : ''}</span></p>
            <p className="text-gray-500">Ancienne note : <span className="font-bold text-gray-700">{justifyData?.oldScore !== null ? `${justifyData?.oldScore}/20` : '-'}</span></p>
            <p className="text-gray-500">Nouvelle valeur : <span className="font-bold text-ibr-800">{justifyData?.isAbsent ? 'ABSENT' : justifyData?.isExempted ? 'DISPENSÉ' : justifyData?.newScore !== null ? `${justifyData?.newScore}/20` : '-'}</span></p>
          </div>

          <div>
            <label className="label-field">Justification de la correction *</label>
            <textarea
              className="input-field min-h-[90px]"
              value={justifyReason}
              onChange={(e) => setJustifyReason(e.target.value)}
              placeholder="Exemple: Erreur matérielle lors de la saisie initiale de l'enseignant, validée par la direction le..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => { setShowJustifyModal(false); setJustifyData(null); }} disabled={saving}>Annuler</button>
            <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={applyJustifiedCorrection} disabled={saving || !justifyReason.trim()}>
              {saving ? 'Enregistrement...' : 'Enregistrer la correction'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================================
          MODAL: OVERRIDE DECISION / ARBITRAGE DU JURY
          ============================================================================ */}
      <Modal open={showDelibModal} onClose={() => setShowDelibModal(false)} title="Arbitrage du jury académique">
        <div className="space-y-4">
          <div className="text-sm bg-gray-50 p-4 rounded-xl space-y-1">
            <p className="text-gray-600">Étudiant : <span className="font-bold text-gray-900">{selectedDelibRow ? fullName(selectedDelibRow.student.last_name, selectedDelibRow.student.first_name) : ''}</span></p>
            <p className="text-gray-600">Moyenne finale : <span className="font-bold text-ibr-700">{selectedDelibRow?.finalAverage}/20</span></p>
            <p className="text-gray-600">Échecs (sous la moyenne de validation) : <span className="font-semibold text-red-600">{selectedDelibRow?.subjectsFailed} matière(s)</span></p>
          </div>

          <div>
            <label className="label-field">Décision finale du jury *</label>
            <select className="input-field" value={overrideDecision} onChange={(e) => setOverrideDecision(e.target.value)}>
              <option value="admis">Admis</option>
              <option value="admis_reserve">Admis avec réserve</option>
              <option value="ajourne">Ajourné</option>
              <option value="redoublant">Redoublant</option>
              <option value="exclu">Exclu</option>
              <option value="abandon">Abandon</option>
            </select>
          </div>

          <div>
            <label className="label-field">Motifs de décision / Observations du jury</label>
            <textarea
              className="input-field min-h-[90px]"
              value={delibObservations}
              onChange={(e) => setDelibObservations(e.target.value)}
              placeholder="Exemple: Admis par rachat après délibération de la commission..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowDelibModal(false)} disabled={saving}>Annuler</button>
            <button className="btn-primary" onClick={saveOverrideDecision} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer la décision'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

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

    // Get subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelId)
      .eq('is_active', true);

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
      .in('status', ['validated', 'submitted', 'corrected', 'locked']);

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
        if (!grade || grade.score === null || grade.is_exempted || grade.is_not_available) continue;

        const val = grade.is_absent ? 0 : grade.score;
        totalPoints += val * subj.coefficient;
        totalCoefficients += subj.coefficient;
        subjectsCounted++;
        if (val >= subj.passing_threshold) subjectsPassed++;
        else subjectsFailed++;
      }

      const weightedAverage = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;

      studentResults.push({
        student,
        totalPoints,
        totalCoefficients,
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
    for (let i = 0; i < studentResults.length; i++) {
      if (prevAvg === null || studentResults[i].weightedAverage !== prevAvg) {
        rank = i + 1;
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

    setResults(studentResults);
    setLoading(false);
    show('Classement calculé avec succès', 'success');
  }

  const decisionColors: Record<string, string> = {
    admis: 'green', admis_reserve: 'gold', ajourne: 'gold', redoublant: 'red',
  };

  return (
    <div className="animate-slide-in">
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
                {results.map((r) => (
                  <tr key={r.student.id} className="table-row-hover">
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        r.rank === 1 ? 'bg-gold-100 text-gold-700' : r.rank === 2 ? 'bg-gray-200 text-gray-700' : r.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-ibr-50 text-ibr-700'
                      }`}>{r.rank}</span>
                    </td>
                    <td className="px-3 py-2 font-medium text-ibr-700 font-mono">{r.student.matricule ?? '-'}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900">{fullName(r.student.last_name, r.student.first_name)}</td>
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

