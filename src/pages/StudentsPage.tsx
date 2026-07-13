import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useCurrentAcademicYear, useLevels, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, SearchInput, Select, Badge, EmptyState, ConfirmDialog } from '../components/ui';
import { ACADEMIC_STATUS_LABELS, fullName, formatDate } from '../lib/utils';
import type { Student } from '../types';
import { Users, Plus, Eye, Search } from 'lucide-react';

export function StudentsListPage() {
  const { navigate } = useRouter();
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('students')
      .select('*')
      .is('deleted_at', null)
      .order('last_name');

    if (search) {
      query = query.or(`last_name.ilike.%${search}%,first_name.ilike.%${search}%,matricule.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (statusFilter) query = query.eq('academic_status', statusFilter);
    if (levelFilter) query = query.eq('current_level_id', levelFilter);

    const { data } = await query.limit(100);
    setStudents((data as Student[]) ?? []);
    setLoading(false);
  }, [search, statusFilter, levelFilter]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  async function handleDelete(student: Student) {
    await supabase.from('students').update({ deleted_at: new Date().toISOString() }).eq('id', student.id);
    loadStudents();
  }

  return (
    <div>
      <PageHeader
        title="Liste des étudiants"
        subtitle={`${students.length} étudiant(s) inscrit(s)`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/students/new')}>
            <Plus className="w-4 h-4" /> Nouvel étudiant
          </button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Nom, prénom, matricule, téléphone..." />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Tous les statuts"
            options={Object.entries(ACADEMIC_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            className="sm:max-w-xs"
          />
          <Select
            value={levelFilter}
            onChange={setLevelFilter}
            placeholder="Tous les niveaux"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
            className="sm:max-w-xs"
          />
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner label="Chargement..." />
      ) : students.length === 0 ? (
        <Card className="p-8">
          <EmptyState message="Aucun étudiant trouvé. Cliquez sur Nouvel étudiant pour commencer." icon={Users} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">N°</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Matricule</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom et prénoms</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sexe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Téléphone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s, i) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-ibr-700">{s.matricule ?? '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{fullName(s.last_name, s.first_name)}</td>
                    <td className="px-4 py-3">{s.sex === 'M' ? 'M' : s.sex === 'F' ? 'F' : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.phone ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Badge color={s.academic_status === 'actif' ? 'green' : s.academic_status === 'suspendu' || s.academic_status === 'exclu' ? 'red' : 'gray'}>
                        {ACADEMIC_STATUS_LABELS[s.academic_status] ?? s.academic_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/students/${s.id}`)}
                          className="text-ibr-600 hover:text-ibr-800"
                          title="Voir la fiche"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Supprimer l'étudiant"
        message={`Voulez-vous vraiment supprimer ${deleteTarget ? fullName(deleteTarget.last_name, deleteTarget.first_name) : ''} ? Cette action est réversible.`}
      />
    </div>
  );
}

export function StudentCreatePage() {
  const { navigate } = useRouter();
  const { levels } = useLevels();
  const { year } = useCurrentAcademicYear();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    last_name: '', first_name: '', sex: '', matricule: '',
    birth_date: '', birth_place: '', nationality: 'Béninoise',
    marital_status: '', phone: '', whatsapp_phone: '', email: '',
    residence_address: '', city: '', country: 'Bénin',
    church: '', denomination: '', pastor_name: '', ministry_role: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    current_level_id: '', academic_status: 'preinscrit',
    observations: '',
  });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generateMatricule() {
    if (!form.current_level_id) {
      show('Sélectionnez d\'abord un niveau', 'error');
      return;
    }
    const level = levels.find((l) => l.id === form.current_level_id);
    if (!level) return;

    const { data: seqData } = await supabase
      .from('matricule_sequences')
      .select('sequence_number')
      .eq('level_code', level.code)
      .order('sequence_number', { ascending: false })
      .limit(1);

    const nextNum = seqData && seqData.length > 0 ? (seqData[0] as any).sequence_number + 1 : 1;
    const matricule = `${String(nextNum).padStart(4, '0')}/IBR/${level.code}`;
    update('matricule', matricule);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.last_name || !form.first_name) {
      show('Le nom et le prénom sont obligatoires', 'error');
      return;
    }

    setSaving(true);

    // Check matricule uniqueness if provided
    if (form.matricule) {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('matricule', form.matricule)
        .is('deleted_at', null)
        .maybeSingle();
      if (existing) {
        show('Ce matricule existe déjà', 'error');
        setSaving(false);
        return;
      }
    }

    const insertData: Record<string, unknown> = {
      last_name: form.last_name,
      first_name: form.first_name,
      sex: form.sex || null,
      matricule: form.matricule || null,
      birth_date: form.birth_date || null,
      birth_place: form.birth_place || null,
      nationality: form.nationality || null,
      marital_status: form.marital_status || null,
      phone: form.phone || null,
      whatsapp_phone: form.whatsapp_phone || null,
      email: form.email || null,
      residence_address: form.residence_address || null,
      city: form.city || null,
      country: form.country || null,
      church: form.church || null,
      denomination: form.denomination || null,
      pastor_name: form.pastor_name || null,
      ministry_role: form.ministry_role || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      first_enrollment_date: new Date().toISOString().split('T')[0],
      current_level_id: form.current_level_id || null,
      academic_status: form.academic_status,
      observations: form.observations || null,
    };

    const { data, error } = await supabase.from('students').insert(insertData).select().single();

    if (error) {
      show(error.message, 'error');
      setSaving(false);
      return;
    }

    // Record matricule sequence
    if (form.matricule && data) {
      const level = levels.find((l) => l.id === form.current_level_id);
      if (level) {
        const match = form.matricule.match(/^(\d+)/);
        if (match) {
          const seqNum = parseInt(match[1]);
          await supabase.from('matricule_sequences').insert({
            sequence_number: seqNum,
            level_code: level.code,
            used_by_student: data.id,
            used_at: new Date().toISOString(),
          });
        }
      }
    }

    show('Étudiant créé avec succès', 'success');
    navigate(`/students/${data.id}`);
  }

  return (
    <div>
      <PageHeader
        title="Nouvel étudiant"
        subtitle="Création d'une fiche étudiant"
        actions={<button className="btn-secondary" onClick={() => navigate('/students')}>Retour</button>}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identité */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Identité</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Nom *</label>
              <input className="input-field" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} required />
            </div>
            <div>
              <label className="label-field">Prénoms *</label>
              <input className="input-field" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} required />
            </div>
            <div>
              <label className="label-field">Sexe</label>
              <select className="input-field" value={form.sex} onChange={(e) => update('sex', e.target.value)}>
                <option value="">--</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="label-field">Date de naissance</label>
              <input type="date" className="input-field" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Lieu de naissance</label>
              <input className="input-field" value={form.birth_place} onChange={(e) => update('birth_place', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Nationalité</label>
              <input className="input-field" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Situation matrimoniale</label>
              <select className="input-field" value={form.marital_status} onChange={(e) => update('marital_status', e.target.value)}>
                <option value="">--</option>
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié(e)</option>
                <option value="veuf">Veuf(ve)</option>
                <option value="divorce">Divorcé(e)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Matricule et niveau */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Matricule et niveau</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Matricule</label>
              <div className="flex gap-2">
                <input className="input-field" value={form.matricule} onChange={(e) => update('matricule', e.target.value)} placeholder="Auto-généré ou manuel" />
                <button type="button" className="btn-secondary whitespace-nowrap" onClick={generateMatricule}>Générer</button>
              </div>
            </div>
            <div>
              <label className="label-field">Niveau</label>
              <select className="input-field" value={form.current_level_id} onChange={(e) => update('current_level_id', e.target.value)}>
                <option value="">--</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Statut académique</label>
              <select className="input-field" value={form.academic_status} onChange={(e) => update('academic_status', e.target.value)}>
                {Object.entries(ACADEMIC_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Téléphone</label>
              <input className="input-field" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div>
              <label className="label-field">WhatsApp</label>
              <input className="input-field" value={form.whatsapp_phone} onChange={(e) => update('whatsapp_phone', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Adresse de résidence</label>
              <input className="input-field" value={form.residence_address} onChange={(e) => update('residence_address', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Ville</label>
              <input className="input-field" value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Pays</label>
              <input className="input-field" value={form.country} onChange={(e) => update('country', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Église */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Église et ministère</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Église d'appartenance</label>
              <input className="input-field" value={form.church} onChange={(e) => update('church', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Dénomination</label>
              <input className="input-field" value={form.denomination} onChange={(e) => update('denomination', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Nom du pasteur</label>
              <input className="input-field" value={form.pastor_name} onChange={(e) => update('pastor_name', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Ministère / fonction</label>
              <input className="input-field" value={form.ministry_role} onChange={(e) => update('ministry_role', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Urgence */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact d'urgence</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Personne à contacter</label>
              <input className="input-field" value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Téléphone d'urgence</label>
              <input className="input-field" value={form.emergency_contact_phone} onChange={(e) => update('emergency_contact_phone', e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Observations */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Observations</h3>
          <textarea className="input-field min-h-[80px]" value={form.observations} onChange={(e) => update('observations', e.target.value)} />
        </Card>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/students')}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Créer l\'étudiant'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const { navigate } = useRouter();
  const { year } = useCurrentAcademicYear();
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [feeAccount, setFeeAccount] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'financial'>('info');

  useEffect(() => {
    loadAll();
  }, [studentId]);

  async function loadAll() {
    const { data: s } = await supabase
      .from('students')
      .select('*, current_level:levels(*)')
      .eq('id', studentId)
      .maybeSingle();
    setStudent(s as any);

    if (year) {
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('*, level:levels(*), program:programs(*), academic_year:academic_years(*)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      setEnrollments(enrolls ?? []);

      const { data: gr } = await supabase
        .from('grades')
        .select('*, subject:subjects(*, module:modules(*))')
        .eq('student_id', studentId)
        .eq('academic_year_id', year.id)
        .order('created_at');
      setGrades(gr ?? []);

      const { data: fa } = await supabase
        .from('student_fee_accounts')
        .select('*, student_fee_items(*, fee_category:fee_categories(*))')
        .eq('student_id', studentId)
        .eq('academic_year_id', year.id)
        .maybeSingle();
      setFeeAccount(fa);

      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year_id', year.id)
        .order('payment_date', { ascending: false });
      setPayments(pays ?? []);
    }

    setLoading(false);
  }

  if (loading) return <LoadingSpinner />;
  if (!student) return <div className="text-center py-12 text-gray-500">Étudiant introuvable</div>;

  return (
    <div>
      <PageHeader
        title={fullName(student.last_name, student.first_name)}
        subtitle={student.matricule ?? 'Sans matricule'}
        actions={<button className="btn-secondary" onClick={() => navigate('/students')}>Retour à la liste</button>}
      />

      {/* Status badge */}
      <div className="flex items-center gap-3 mb-4">
        <Badge color={student.academic_status === 'actif' ? 'green' : 'gray'}>
          {ACADEMIC_STATUS_LABELS[student.academic_status] ?? student.academic_status}
        </Badge>
        {student.current_level && <Badge color="ibr">{student.current_level.name}</Badge>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['info', 'academic', 'financial'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-ibr-600 text-ibr-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'info' ? 'Informations' : tab === 'academic' ? 'Parcours académique' : 'Situation financière'}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Identité</h3>
            <dl className="space-y-2 text-sm">
              <InfoRow label="Matricule" value={student.matricule} />
              <InfoRow label="Sexe" value={student.sex === 'M' ? 'Masculin' : student.sex === 'F' ? 'Féminin' : '-'} />
              <InfoRow label="Date de naissance" value={formatDate(student.birth_date)} />
              <InfoRow label="Lieu de naissance" value={student.birth_place} />
              <InfoRow label="Nationalité" value={student.nationality} />
              <InfoRow label="Situation matrimoniale" value={student.marital_status} />
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
            <dl className="space-y-2 text-sm">
              <InfoRow label="Téléphone" value={student.phone} />
              <InfoRow label="WhatsApp" value={student.whatsapp_phone} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Adresse" value={student.residence_address} />
              <InfoRow label="Ville" value={student.city} />
              <InfoRow label="Pays" value={student.country} />
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Église et ministère</h3>
            <dl className="space-y-2 text-sm">
              <InfoRow label="Église" value={student.church} />
              <InfoRow label="Dénomination" value={student.denomination} />
              <InfoRow label="Pasteur" value={student.pastor_name} />
              <InfoRow label="Ministère" value={student.ministry_role} />
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Urgence et observations</h3>
            <dl className="space-y-2 text-sm">
              <InfoRow label="Contact d'urgence" value={student.emergency_contact_name} />
              <InfoRow label="Téléphone d'urgence" value={student.emergency_contact_phone} />
              <InfoRow label="Première inscription" value={formatDate(student.first_enrollment_date)} />
              <InfoRow label="Observations" value={student.observations} />
            </dl>
          </Card>
        </div>
      )}

      {activeTab === 'academic' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Inscriptions</h3>
            {enrollments.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune inscription.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Année</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Niveau</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Statut</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="table-row-hover">
                      <td className="px-3 py-2">{e.academic_year?.name}</td>
                      <td className="px-3 py-2">{e.level?.name}</td>
                      <td className="px-3 py-2">{e.enrollment_type === 'inscription' ? 'Inscription' : 'Réinscription'}</td>
                      <td className="px-3 py-2">
                        <Badge color={e.status === 'validated' ? 'green' : 'gray'}>{e.status === 'validated' ? 'Validée' : 'En attente'}</Badge>
                      </td>
                      <td className="px-3 py-2">{formatDate(e.enrollment_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Notes - {year?.name}</h3>
            {grades.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune note saisie.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Matière</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Module</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Note</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grades.map((g) => (
                    <tr key={g.id} className="table-row-hover">
                      <td className="px-3 py-2">{g.subject?.name}</td>
                      <td className="px-3 py-2">{g.subject?.module?.name ?? '-'}</td>
                      <td className="px-3 py-2 font-medium">
                        {g.is_absent ? 'Absent' : g.is_not_available ? 'N/A' : g.score !== null ? `${g.score}/20` : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge color={g.status === 'validated' ? 'green' : 'gray'}>{g.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="space-y-6">
          {feeAccount ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <p className="text-sm text-gray-500">Total à payer</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatFCFA(feeAccount.total_due)}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm text-gray-500">Payé</p>
                  <p className="text-xl font-bold text-green-600 mt-1">{formatFCFA(feeAccount.total_paid)}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm text-gray-500">Reste à payer</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{formatFCFA(feeAccount.remaining)}</p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Détail des frais</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Catégorie</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Montant</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Payé</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Reste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {feeAccount.student_fee_items?.map((item: any) => (
                      <tr key={item.id} className="table-row-hover">
                        <td className="px-3 py-2">{item.fee_category?.name}</td>
                        <td className="px-3 py-2 text-right">{formatFCFA(item.final_amount)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatFCFA(item.amount_paid)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatFCFA(item.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          ) : (
            <Card className="p-6">
              <p className="text-sm text-gray-400">Aucune situation financière pour cette année académique.</p>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Historique des paiements</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun paiement enregistré.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Reçu</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Moyen</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Montant</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="table-row-hover">
                      <td className="px-3 py-2">{formatDate(p.payment_date)}</td>
                      <td className="px-3 py-2 font-medium">{p.receipt_number ?? '-'}</td>
                      <td className="px-3 py-2">{p.payment_method}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatFCFA(p.amount)}</td>
                      <td className="px-3 py-2">
                        <Badge color={p.status === 'paid' ? 'green' : 'red'}>{p.status === 'paid' ? 'Payé' : p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium text-right">{value || '-'}</dd>
    </div>
  );
}
