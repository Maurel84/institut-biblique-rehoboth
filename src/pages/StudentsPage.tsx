import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useCurrentAcademicYear, useLevels, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, SearchInput, Select, Badge, EmptyState, ConfirmDialog, Modal } from '../components/ui';
import { ACADEMIC_STATUS_LABELS, fullName, formatDate, formatFCFA } from '../lib/utils';
import type { Student } from '../types';
import {
  Users, Plus, Eye, Search, Edit, Trash2, Calendar, Clock,
  ArrowUpRight, Award, CreditCard, DollarSign, Package, Check, ChevronRight
} from 'lucide-react';

export function StudentsListPage() {
  const { navigate } = useRouter();
  const { levels } = useLevels();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const { show } = useToast();

  const loadStudents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('students')
      .select('*, current_level:levels(*)')
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
    const { error } = await supabase.from('students').update({ deleted_at: new Date().toISOString() }).eq('id', student.id);
    if (error) show(error.message, 'error');
    else {
      show('Étudiant archivé avec succès', 'success');
      loadStudents();
    }
  }

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Liste des étudiants"
        subtitle={`${students.length} étudiant(s) inscrit(s)`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/students/new')}>
            <Plus className="w-4 h-4" /> Nouvel étudiant
          </button>
        }
      />

      <Card className="p-4 mb-6">
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
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">N°</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">N° Perm.</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Matricule Actuel</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Nom et prénoms</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Sexe</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Téléphone</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Niveau</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Statut</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s, i) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-5 py-3.5 text-gray-500">{i + 1}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-600 font-mono">{s.student_number ?? '-'}</td>
                    <td className="px-5 py-3.5 font-semibold text-ibr-700 font-mono">{s.matricule ?? '-'}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{fullName(s.last_name, s.first_name)}</td>
                    <td className="px-5 py-3.5 text-gray-600">{s.sex === 'M' ? 'M' : s.sex === 'F' ? 'F' : '-'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{s.phone ?? '-'}</td>
                    <td className="px-5 py-3.5 text-gray-700 font-medium">{s.current_level?.name ?? '-'}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={s.academic_status === 'actif' ? 'green' : s.academic_status === 'diplome' ? 'blue' : s.academic_status === 'suspendu' || s.academic_status === 'exclu' ? 'red' : 'gray'}>
                        {ACADEMIC_STATUS_LABELS[s.academic_status] ?? s.academic_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/students/${s.id}`)}
                          className="text-gray-400 hover:text-ibr-700 p-1"
                          title="Voir la fiche"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Archiver"
                        >
                          <Trash2 className="w-4 h-4" />
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
        title="Archiver l'étudiant"
        message={`Voulez-vous vraiment archiver ${deleteTarget ? fullName(deleteTarget.last_name, deleteTarget.first_name) : ''} ? Cette action est réversible.`}
      />
    </div>
  );
}

export function StudentCreatePage() {
  const { navigate } = useRouter();
  const { levels } = useLevels();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    last_name: '', first_name: '', sex: '', matricule: '', student_number: '',
    birth_date: '', birth_place: '', nationality: 'Ivoirienne',
    marital_status: '', phone: '', whatsapp_phone: '', email: '',
    residence_address: '', city: '', country: "Côte d'Ivoire",
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
    const seqStr = String(nextNum).padStart(4, '0');
    const matricule = `${seqStr}/IBR/${level.code}`;
    
    update('matricule', matricule);
    update('student_number', seqStr);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.last_name || !form.first_name) {
      show('Le nom et le prénom sont obligatoires', 'error');
      return;
    }

    setSaving(true);

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
      student_number: form.student_number || null,
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
    <div className="animate-slide-in">
      <PageHeader
        title="Nouvel étudiant"
        subtitle="Création d'une fiche étudiant"
        actions={<button className="btn-secondary" onClick={() => navigate('/students')}>Retour</button>}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Matricule et niveau d'affectation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Niveau</label>
              <select className="input-field" value={form.current_level_id} onChange={(e) => update('current_level_id', e.target.value)}>
                <option value="">--</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Matricule académique</label>
              <div className="flex gap-2">
                <input className="input-field" value={form.matricule} onChange={(e) => update('matricule', e.target.value)} placeholder="0137/IBR/B1" />
                <button type="button" className="btn-secondary whitespace-nowrap py-2" onClick={generateMatricule}>Générer</button>
              </div>
            </div>
            <div>
              <label className="label-field">N° dossier permanent</label>
              <input className="input-field" value={form.student_number} onChange={(e) => update('student_number', e.target.value)} placeholder="0137" />
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
            <div><label className="label-field">Téléphone</label><input className="input-field" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
            <div><label className="label-field">WhatsApp</label><input className="input-field" value={form.whatsapp_phone} onChange={(e) => update('whatsapp_phone', e.target.value)} /></div>
            <div><label className="label-field">Email</label><input type="email" className="input-field" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
            <div><label className="label-field">Adresse de résidence</label><input className="input-field" value={form.residence_address} onChange={(e) => update('residence_address', e.target.value)} /></div>
            <div><label className="label-field">Ville</label><input className="input-field" value={form.city} onChange={(e) => update('city', e.target.value)} /></div>
          </div>
        </Card>

        {/* Église */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Église et ministère</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="label-field">Église d'appartenance</label><input className="input-field" value={form.church} onChange={(e) => update('church', e.target.value)} /></div>
            <div><label className="label-field">Dénomination</label><input className="input-field" value={form.denomination} onChange={(e) => update('denomination', e.target.value)} /></div>
            <div><label className="label-field">Nom du pasteur</label><input className="input-field" value={form.pastor_name} onChange={(e) => update('pastor_name', e.target.value)} /></div>
            <div><label className="label-field">Ministère / fonction</label><input className="input-field" value={form.ministry_role} onChange={(e) => update('ministry_role', e.target.value)} /></div>
          </div>
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
  const { levels } = useLevels();
  const { show } = useToast();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [feeAccount, setFeeAccount] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'financial' | 'timeline'>('info');

  // Promotion state
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promotionForm, setPromotionForm] = useState({
    target_year_id: '',
    target_level_id: '',
    enrollment_type: 'reinscription' as 'inscription' | 'reinscription'
  });
  const [allYears, setAllYears] = useState<any[]>([]);

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    last_name: '', first_name: '', sex: '', birth_date: '', birth_place: '',
    nationality: '', marital_status: '', phone: '', whatsapp_phone: '', email: '',
    residence_address: '', city: '', country: '', church: '', denomination: '',
    pastor_name: '', ministry_role: '', emergency_contact_name: '', emergency_contact_phone: '',
    observations: '', photo_url: ''
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: s } = await supabase
      .from('students')
      .select('*, current_level:levels(*)')
      .eq('id', studentId)
      .maybeSingle();
    setStudent(s as any);

    const { data: enrolls } = await supabase
      .from('enrollments')
      .select('*, level:levels(*), program:programs(*), academic_year:academic_years(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    setEnrollments(enrolls ?? []);

    const { data: gr } = await supabase
      .from('grades')
      .select('*, subject:subjects(*, module:modules(*)), academic_year:academic_years(*)')
      .eq('student_id', studentId)
      .order('created_at');
    setGrades(gr ?? []);

    const { data: fa } = await supabase
      .from('student_fee_accounts')
      .select('*, student_fee_items(*, fee_category:fee_categories(*))')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    // Pick current year fee account
    const currentFa = fa?.find((x) => x.academic_year_id === year?.id) || fa?.[0] || null;
    setFeeAccount(currentFa);

    const { data: pays } = await supabase
      .from('payments')
      .select('*, academic_year:academic_years(*)')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false });
    setPayments(pays ?? []);

    // Load academic years for promotion list
    supabase.from('academic_years').select('*').order('name', { ascending: false }).then(({ data }) => {
      setAllYears(data ?? []);
      // Pre-select next year
      if (year && data) {
        const nextY = data.find((y) => y.id !== year.id);
        if (nextY) setPromotionForm((prev) => ({ ...prev, target_year_id: nextY.id }));
      }
    });

    setLoading(false);
  }, [studentId, year]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Set default level when level loads or dialog opens
  useEffect(() => {
    if (student?.current_level && levels.length > 0) {
      const currentIdx = student.current_level.order_index;
      const nextLevel = levels.find((l) => l.order_index === currentIdx + 1);
      if (nextLevel) {
        setPromotionForm((prev) => ({ ...prev, target_level_id: nextLevel.id }));
      }
    }
  }, [student, levels]);

  async function handlePromote() {
    if (!promotionForm.target_year_id || !promotionForm.target_level_id || !student) {
      show('Sélectionnez l\'année et le niveau d\'accueil', 'error');
      return;
    }

    setPromoting(true);
    try {
      const levelObj = levels.find((l) => l.id === promotionForm.target_level_id);
      if (!levelObj) return;

      // Query the next sequence number for the destination level
      const { data: seqData } = await supabase
        .from('matricule_sequences')
        .select('sequence_number')
        .eq('level_code', levelObj.code)
        .order('sequence_number', { ascending: false })
        .limit(1);

      const nextNum = seqData && seqData.length > 0 ? (seqData[0] as any).sequence_number + 1 : 1;
      const seqStr = String(nextNum).padStart(4, '0');
      const enrollmentMatricule = `${seqStr}/IBR/${levelObj.code}`;

      // 1. Create new enrollment
      const { data: enrollment, error: enrErr } = await supabase.from('enrollments').insert({
        student_id: student.id,
        academic_year_id: promotionForm.target_year_id,
        level_id: promotionForm.target_level_id,
        enrollment_type: promotionForm.enrollment_type,
        status: 'validated',
        enrollment_date: new Date().toISOString().split('T')[0],
        validated_at: new Date().toISOString(),
        enrollment_matricule: enrollmentMatricule,
      }).select().single();

      if (enrErr) throw new Error(enrErr.message);

      // Record matricule sequence
      await supabase.from('matricule_sequences').insert({
        sequence_number: nextNum,
        level_code: levelObj.code,
        used_by_student: student.id,
        used_at: new Date().toISOString(),
      });

      // 2. Fetch target fee structures
      const { data: feeStructures } = await supabase
        .from('tuition_fee_structures')
        .select('*')
        .eq('academic_year_id', promotionForm.target_year_id)
        .eq('level_id', promotionForm.target_level_id);

      const totalDue = feeStructures?.reduce((s, f) => s + f.amount, 0) || 0;

      // 3. Create student fee account
      const { data: feeAccount, error: accErr } = await supabase.from('student_fee_accounts').insert({
        student_id: student.id,
        academic_year_id: promotionForm.target_year_id,
        enrollment_id: enrollment.id,
        level_id: promotionForm.target_level_id,
        total_due: totalDue,
        total_paid: 0,
        total_discount: 0,
        remaining: totalDue,
        currency: 'FCFA',
        is_up_to_date: totalDue <= 0,
      }).select().single();

      if (accErr) throw new Error(accErr.message);

      if (feeStructures && feeAccount) {
        for (const fs of feeStructures) {
          await supabase.from('student_fee_items').insert({
            student_fee_account_id: feeAccount.id,
            fee_category_id: fs.fee_category_id,
            original_amount: fs.amount,
            discount_amount: 0,
            final_amount: fs.amount,
            amount_paid: 0,
            remaining: fs.amount,
            is_mandatory: true,
          });
        }
      }

      // 4. Update student level
      await supabase.from('students').update({
        current_level_id: promotionForm.target_level_id,
        matricule: enrollmentMatricule,
        academic_status: 'actif'
      }).eq('id', student.id);

      // 5. Resequence cohort alphabetically by last name
      await supabase.rpc('resequence_matricules_alphabetically', {
        target_year_id: promotionForm.target_year_id,
        target_level_id: promotionForm.target_level_id
      });

      show('Étudiant promu en classe supérieure avec succès !', 'success');
      setShowPromotionModal(false);
      loadAll();
    } catch (err: any) {
      show(err.message || 'Erreur lors de la promotion', 'error');
    } finally {
      setPromoting(false);
    }
  }

  function handleOpenEditModal() {
    if (!student) return;
    setEditForm({
      last_name: student.last_name || '',
      first_name: student.first_name || '',
      sex: student.sex || '',
      birth_date: student.birth_date || '',
      birth_place: student.birth_place || '',
      nationality: student.nationality || '',
      marital_status: student.marital_status || '',
      phone: student.phone || '',
      whatsapp_phone: student.whatsapp_phone || '',
      email: student.email || '',
      residence_address: student.residence_address || '',
      city: student.city || '',
      country: student.country || '',
      church: student.church || '',
      denomination: student.denomination || '',
      pastor_name: student.pastor_name || '',
      ministry_role: student.ministry_role || '',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_phone: student.emergency_contact_phone || '',
      observations: student.observations || '',
      photo_url: student.photo_url || ''
    });
    setShowEditModal(true);
  }

  async function handleUpdateProfile() {
    if (!editForm.last_name || !editForm.first_name) {
      show('Le nom et le prénom sont requis', 'error');
      return;
    }
    setUpdatingProfile(true);
    const { error } = await supabase.from('students').update({
      last_name: editForm.last_name,
      first_name: editForm.first_name,
      sex: editForm.sex || null,
      birth_date: editForm.birth_date || null,
      birth_place: editForm.birth_place || null,
      nationality: editForm.nationality || null,
      marital_status: editForm.marital_status || null,
      phone: editForm.phone || null,
      whatsapp_phone: editForm.whatsapp_phone || null,
      email: editForm.email || null,
      residence_address: editForm.residence_address || null,
      city: editForm.city || null,
      country: editForm.country || null,
      church: editForm.church || null,
      denomination: editForm.denomination || null,
      pastor_name: editForm.pastor_name || null,
      ministry_role: editForm.ministry_role || null,
      emergency_contact_name: editForm.emergency_contact_name || null,
      emergency_contact_phone: editForm.emergency_contact_phone || null,
      observations: editForm.observations || null,
      photo_url: editForm.photo_url || null
    }).eq('id', studentId);

    if (error) {
      show(error.message, 'error');
    } else {
      show('Profil étudiant mis à jour', 'success');
      setShowEditModal(false);
      loadAll();
    }
    setUpdatingProfile(false);
  }

  // Compile timeline events
  const timelineEvents: { date: string; title: string; desc: string; icon: any; color: string }[] = [];
  
  enrollments.forEach((e) => {
    timelineEvents.push({
      date: e.enrollment_date,
      title: `Inscription en ${e.level?.name ?? 'classe'}`,
      desc: `Type: ${e.enrollment_type === 'inscription' ? 'Première inscription' : 'Réinscription'} | Matricule spécifique: ${e.enrollment_matricule ?? '-'} (${e.academic_year?.name})`,
      icon: Calendar,
      color: 'bg-ibr-100 text-ibr-700',
    });
  });

  payments.forEach((p) => {
    timelineEvents.push({
      date: p.payment_date,
      title: 'Paiement de scolarité',
      desc: `Versement de ${formatFCFA(p.amount)} par ${p.payment_method} | Reçu N° ${p.receipt_number ?? '-'} (${p.academic_year?.name})`,
      icon: DollarSign,
      color: 'bg-green-100 text-green-700',
    });
  });

  if (student?.first_enrollment_date) {
    timelineEvents.push({
      date: student.first_enrollment_date,
      title: 'Création du dossier étudiant',
      desc: `Première admission enregistrée à l'IBR | Numéro de dossier permanent attribue : ${student.student_number ?? '-'}`,
      icon: Users,
      color: 'bg-blue-100 text-blue-700',
    });
  }

  // Sort timeline events descending
  timelineEvents.sort((a, b) => b.date.localeCompare(a.date));

  if (loading) return <LoadingSpinner />;
  if (!student) return <div className="text-center py-12 text-gray-500">Étudiant introuvable</div>;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={fullName(student.last_name, student.first_name)}
        subtitle={`Dossier permanent : ${student.student_number ?? '-'} | Matricule actif : ${student.matricule ?? '-'}`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-1 py-2 px-3 text-xs sm:text-sm font-semibold" onClick={handleOpenEditModal}>
              <Edit className="w-4 h-4" /> Modifier profil
            </button>
            {student.academic_status === 'actif' && (
              <button className="btn-primary flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-semibold" onClick={() => setShowPromotionModal(true)}>
                <ArrowUpRight className="w-4 h-4" /> Promouvoir / Réinscrire
              </button>
            )}
            <button className="btn-secondary py-2 px-3 text-xs sm:text-sm font-semibold" onClick={() => navigate('/students')}>Retour à la liste</button>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <Badge color={student.academic_status === 'actif' ? 'green' : student.academic_status === 'diplome' ? 'blue' : 'gray'}>
          {ACADEMIC_STATUS_LABELS[student.academic_status] ?? student.academic_status}
        </Badge>
        {student.current_level && <Badge color="ibr">{student.current_level.name}</Badge>}
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['info', 'academic', 'financial', 'timeline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-ibr-600 text-ibr-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'info' ? 'Informations' : tab === 'academic' ? 'Parcours' : tab === 'financial' ? 'Finances' : 'Historique (Timeline)'}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Identité</h3>
            <dl className="space-y-2 text-sm">
              <InfoRow label="N° permanent" value={student.student_number} />
              <InfoRow label="Matricule actif" value={student.matricule} />
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
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Matricule Annuel</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Statut</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="table-row-hover">
                      <td className="px-3 py-2 font-medium text-gray-900">{e.academic_year?.name}</td>
                      <td className="px-3 py-2">{e.level?.name}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-ibr-700">{e.enrollment_matricule ?? '-'}</td>
                      <td className="px-3 py-2">{e.enrollment_type === 'inscription' ? 'Inscription' : 'Réinscription'}</td>
                      <td className="px-3 py-2">
                        <Badge color={e.status === 'validated' ? 'green' : 'gray'}>{e.status === 'validated' ? 'Validée' : 'En attente'}</Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(e.enrollment_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Notes globales (Toutes sessions)</h3>
            {grades.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune note saisie.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Année</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Matière</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Module</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Note /20</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grades.map((g) => (
                    <tr key={g.id} className="table-row-hover">
                      <td className="px-3 py-2 text-xs font-semibold">{g.academic_year?.name}</td>
                      <td className="px-3 py-2 font-medium">{g.subject?.name}</td>
                      <td className="px-3 py-2">{g.subject?.module?.name ?? '-'}</td>
                      <td className="px-3 py-2 text-center font-bold">
                        {g.is_absent ? <span className="text-red-600">Absent</span> : g.is_exempted ? <span className="text-blue-600">Dispensé</span> : g.is_not_available ? 'N/A' : g.score !== null ? `${g.score}/20` : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge color={g.status === 'validated' || g.status === 'locked' ? 'green' : g.status === 'submitted' ? 'gold' : 'gray'}>{g.status}</Badge>
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
                <Card className="p-5 border-l-4 border-ibr-600">
                  <p className="text-sm text-gray-500 font-medium">Total à payer ({year?.name})</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatFCFA(feeAccount.total_due)}</p>
                </Card>
                <Card className="p-5 border-l-4 border-green-600">
                  <p className="text-sm text-gray-500 font-medium">Total payé</p>
                  <p className="text-xl font-bold text-green-600 mt-1">{formatFCFA(feeAccount.total_paid)}</p>
                </Card>
                <Card className="p-5 border-l-4 border-red-600">
                  <p className="text-sm text-gray-500 font-medium">Reste à payer</p>
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
                        <td className="px-3 py-2 font-medium text-gray-900">{item.fee_category?.name}</td>
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
              <p className="text-sm text-gray-400">Aucune situation financière pour l'année académique active.</p>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Historique des versements</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun paiement enregistré.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Année</th>
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
                      <td className="px-3 py-2 text-xs">{p.academic_year?.name}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-ibr-700">{p.receipt_number ?? '-'}</td>
                      <td className="px-3 py-2">{p.payment_method}</td>
                      <td className="px-3 py-2 text-right font-bold text-green-600">{formatFCFA(p.amount)}</td>
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

      {activeTab === 'timeline' && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Chronologie des événements (Timeline)</h3>
          
          <div className="relative pl-6 border-l-2 border-gray-100 ml-4 space-y-6">
            {timelineEvents.map((evt, idx) => {
              const IconComp = evt.icon;
              return (
                <div key={idx} className="relative">
                  {/* Point icon */}
                  <span className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${evt.color}`}>
                    <IconComp className="w-3.5 h-3.5" />
                  </span>
                  
                  <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-50">
                    <span className="text-xs font-mono font-semibold text-gray-400">{formatDate(evt.date)}</span>
                    <h4 className="font-bold text-gray-900 text-sm mt-0.5">{evt.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{evt.desc}</p>
                  </div>
                </div>
              );
            })}
            
            {timelineEvents.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun événement répertorié dans l'historique.</p>
            )}
          </div>
        </Card>
      )}

      {/* PROMOTION / REINSCRIPTION MODAL */}
      <Modal open={showPromotionModal} onClose={() => setShowPromotionModal(false)} title="Promouvoir / Réinscrire l'étudiant">
        <div className="space-y-4">
          <div className="p-3 bg-ibr-50/50 border border-ibr-100 rounded-xl text-ibr-950 text-xs">
            <p className="font-bold">Promotion sans duplication :</p>
            <p className="mt-1">
              Cette action génère une nouvelle ligne d'inscription annuelle pour l'année ciblée et crée son échéancier financier correspondant. L'historique académique passé reste conservé.
            </p>
          </div>

          <div>
            <label className="label-field">Année académique cible *</label>
            <select className="input-field" value={promotionForm.target_year_id} onChange={(e) => setPromotionForm({ ...promotionForm, target_year_id: e.target.value })}>
              <option value="">-- Sélectionner l'année --</option>
              {allYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label-field">Niveau d'accueil cible *</label>
            <select className="input-field" value={promotionForm.target_level_id} onChange={(e) => setPromotionForm({ ...promotionForm, target_level_id: e.target.value })}>
              <option value="">-- Sélectionner le niveau --</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
            </select>
          </div>

          <div>
            <label className="label-field">Type d'inscription</label>
            <select className="input-field" value={promotionForm.enrollment_type} onChange={(e) => setPromotionForm({ ...promotionForm, enrollment_type: e.target.value as any })}>
              <option value="reinscription">Réinscription (Recommandé)</option>
              <option value="inscription">Nouvelle inscription</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowPromotionModal(false)} disabled={promoting}>Annuler</button>
            <button className="btn-primary" onClick={handlePromote} disabled={promoting}>
              {promoting ? 'Promotion...' : 'Promouvoir l\'étudiant'}
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT PROFILE MODAL */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier les informations de l'étudiant" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nom *</label>
              <input className="input-field" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Prénoms *</label>
              <input className="input-field" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Sexe</label>
              <select className="input-field" value={editForm.sex} onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}>
                <option value="">--</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="label-field">Date de naissance</label>
              <input type="date" className="input-field" value={editForm.birth_date} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Lieu de naissance</label>
              <input className="input-field" value={editForm.birth_place} onChange={(e) => setEditForm({ ...editForm, birth_place: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Nationalité</label>
              <input className="input-field" value={editForm.nationality} onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Situation matrimoniale</label>
              <select className="input-field" value={editForm.marital_status} onChange={(e) => setEditForm({ ...editForm, marital_status: e.target.value })}>
                <option value="">--</option>
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié(e)</option>
                <option value="veuf">Veuf(ve)</option>
                <option value="divorce">Divorcé(e)</option>
              </select>
            </div>
            <div>
              <label className="label-field">URL Photo de profil</label>
              <input className="input-field" value={editForm.photo_url} onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>

          <div className="border-t pt-3 mt-3">
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Coordonnées de contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Téléphone</label>
                <input className="input-field" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="label-field">WhatsApp</label>
                <input className="input-field" value={editForm.whatsapp_phone} onChange={(e) => setEditForm({ ...editForm, whatsapp_phone: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Email</label>
                <input type="email" className="input-field" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Adresse de résidence</label>
                <input className="input-field" value={editForm.residence_address} onChange={(e) => setEditForm({ ...editForm, residence_address: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Ville</label>
                <input className="input-field" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Pays</label>
                <input className="input-field" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t pt-3 mt-3">
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Église et ministère</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Église d'appartenance</label>
                <input className="input-field" value={editForm.church} onChange={(e) => setEditForm({ ...editForm, church: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Dénomination</label>
                <input className="input-field" value={editForm.denomination} onChange={(e) => setEditForm({ ...editForm, denomination: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Nom du pasteur</label>
                <input className="input-field" value={editForm.pastor_name} onChange={(e) => setEditForm({ ...editForm, pastor_name: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Ministère / fonction</label>
                <input className="input-field" value={editForm.ministry_role} onChange={(e) => setEditForm({ ...editForm, ministry_role: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t pt-3 mt-3">
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Urgence & Observations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Contact d'urgence (Nom)</label>
                <input className="input-field" value={editForm.emergency_contact_name} onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Téléphone d'urgence</label>
                <input className="input-field" value={editForm.emergency_contact_phone} onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">Observations</label>
                <textarea className="input-field min-h-[70px]" value={editForm.observations} onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t mt-4">
            <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)} disabled={updatingProfile}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={updatingProfile}>
              {updatingProfile ? 'Modification...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <dt className="text-gray-500 font-medium">{label}</dt>
      <dd className="text-gray-900 font-semibold text-right">{value || '-'}</dd>
    </div>
  );
}
