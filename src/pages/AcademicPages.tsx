import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useCurrentAcademicYear, useLevels, usePrograms, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Modal, Select, EmptyState } from '../components/ui';
import { fullName, formatDate, ACADEMIC_STATUS_LABELS } from '../lib/utils';
import type { AcademicYear, Teacher, Module, Subject, Enrollment, Student } from '../types';
import { Plus, Calendar, School, Layers, GraduationCap, BookOpen, BookMarked, FileText, Users } from 'lucide-react';

// ============================================================================
// ACADEMIC YEARS PAGE
// ============================================================================
export function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', status: 'preparation' });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('academic_years').select('*').order('name', { ascending: false });
    setYears((data as AcademicYear[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setCurrent(id: string) {
    await supabase.from('academic_years').update({ is_current: false }).neq('id', id);
    await supabase.from('academic_years').update({ is_current: true }).eq('id', id);
    load();
    show('Année académique courante mise à jour', 'success');
  }

  async function create() {
    if (!form.name || !form.start_date || !form.end_date) {
      show('Tous les champs sont obligatoires', 'error');
      return;
    }
    const { error } = await supabase.from('academic_years').insert({
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
    });
    if (error) {
      show(error.message, 'error');
    } else {
      show('Année académique créée', 'success');
      setShowModal(false);
      setForm({ name: '', start_date: '', end_date: '', status: 'preparation' });
      load();
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Années académiques"
        subtitle="Gestion des années académiques"
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouvelle année</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {years.map((y) => (
          <Card key={y.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-ibr-600" />
                <h3 className="font-semibold text-gray-900">{y.name}</h3>
              </div>
              {y.is_current && <Badge color="green">Courante</Badge>}
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Début</dt><dd className="font-medium">{formatDate(y.start_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Fin</dt><dd className="font-medium">{formatDate(y.end_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Statut</dt><dd><Badge color={y.status === 'open' ? 'green' : y.status === 'closed' ? 'gray' : 'gold'}>{y.status}</Badge></dd></div>
            </dl>
            {!y.is_current && (
              <button className="btn-secondary w-full mt-4 text-sm" onClick={() => setCurrent(y.id)}>
                Définir comme année courante
              </button>
            )}
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle année académique">
        <div className="space-y-4">
          <div>
            <label className="label-field">Nom (ex: 2025-2026)</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Date de début</label>
              <input type="date" className="input-field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Date de fin</label>
              <input type="date" className="input-field" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Statut</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="preparation">Préparation</option>
              <option value="open">Ouverte</option>
              <option value="closed">Clôturée</option>
              <option value="archived">Archivée</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={create}>Créer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// PROGRAMS PAGE
// ============================================================================
export function ProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('programs').select('*').order('name');
    setPrograms(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.name || !form.code) { show('Nom et code obligatoires', 'error'); return; }
    const { error } = await supabase.from('programs').insert({
      name: form.name, code: form.code.toUpperCase(), description: form.description, is_active: true,
    });
    if (error) show(error.message, 'error');
    else { show('Programme créé', 'success'); setShowModal(false); setForm({ name: '', code: '', description: '' }); load(); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Programmes de formation"
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau programme</button>}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <School className="w-5 h-5 text-ibr-600" />
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
            </div>
            <p className="text-sm text-gray-500">Code: {p.code}</p>
            {p.description && <p className="text-sm text-gray-600 mt-2">{p.description}</p>}
            <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Actif' : 'Inactif'}</Badge>
          </Card>
        ))}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau programme">
        <div className="space-y-4">
          <div><label className="label-field">Nom *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label-field">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label className="label-field">Description</label><textarea className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Créer</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// LEVELS PAGE
// ============================================================================
export function LevelsPage() {
  const { levels, loading } = useLevels();
  const { programs } = usePrograms();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', order_index: 0, program_id: '' });
  const { show } = useToast();

  async function create() {
    if (!form.name || !form.code) { show('Nom et code obligatoires', 'error'); return; }
    const { error } = await supabase.from('levels').insert({
      name: form.name, code: form.code.toUpperCase(), order_index: parseInt(form.order_index.toString()) || 0,
      program_id: form.program_id || null, is_active: true,
    });
    if (error) show(error.message, 'error');
    else { show('Niveau créé', 'success'); setShowModal(false); setForm({ name: '', code: '', order_index: 0, program_id: '' }); window.location.reload(); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Niveaux"
        subtitle="Gestion des niveaux d'étude"
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau niveau</button>}
      />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ordre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {levels.map((l) => (
              <tr key={l.id} className="table-row-hover">
                <td className="px-4 py-3 font-medium text-ibr-700">{l.code}</td>
                <td className="px-4 py-3">{l.name}</td>
                <td className="px-4 py-3">{l.order_index}</td>
                <td className="px-4 py-3"><Badge color={l.is_active ? 'green' : 'gray'}>{l.is_active ? 'Actif' : 'Inactif'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau niveau">
        <div className="space-y-4">
          <div><label className="label-field">Nom *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label-field">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label className="label-field">Ordre</label><input type="number" className="input-field" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })} /></div>
          <div><label className="label-field">Programme</label><Select value={form.program_id} onChange={(v) => setForm({ ...form, program_id: v })} placeholder="Aucun" options={programs.map((p) => ({ value: p.id, label: p.name }))} /></div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Créer</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// TEACHERS PAGE
// ============================================================================
export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ last_name: '', first_name: '', title: '', phone: '', email: '', specialty: '', status: 'actif' });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('teachers').select('*').is('deleted_at', null).order('last_name');
    setTeachers((data as Teacher[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.last_name || !form.first_name) { show('Nom et prénom obligatoires', 'error'); return; }
    const { error } = await supabase.from('teachers').insert({
      last_name: form.last_name, first_name: form.first_name, title: form.title || null,
      phone: form.phone || null, email: form.email || null, specialty: form.specialty || null, status: form.status,
    });
    if (error) show(error.message, 'error');
    else { show('Enseignant créé', 'success'); setShowModal(false); setForm({ last_name: '', first_name: '', title: '', phone: '', email: '', specialty: '', status: 'actif' }); load(); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Enseignants"
        subtitle={`${teachers.length} enseignant(s)`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouvel enseignant</button>}
      />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">N°</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom et prénoms</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Téléphone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Spécialité</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teachers.map((t, i) => (
              <tr key={t.id} className="table-row-hover">
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{fullName(t.last_name, t.first_name)}</td>
                <td className="px-4 py-3">{t.title ?? '-'}</td>
                <td className="px-4 py-3">{t.phone ?? '-'}</td>
                <td className="px-4 py-3">{t.specialty ?? '-'}</td>
                <td className="px-4 py-3"><Badge color={t.status === 'actif' ? 'green' : 'gray'}>{t.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvel enseignant">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Nom *</label><input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            <div><label className="label-field">Prénoms *</label><input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
          </div>
          <div><label className="label-field">Titre</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Pasteur, Professeur..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Téléphone</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label-field">Email</label><input className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><label className="label-field">Spécialité</label><input className="input-field" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><label className="label-field">Statut</label><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="actif">Actif</option><option value="inactif">Inactif</option><option value="vacataire">Vacataire</option></select></div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Créer</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// MODULES PAGE
// ============================================================================
export function ModulesPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', order_index: 1, color: '#1e40af', level_id: '' });
  const { show } = useToast();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    let query = supabase.from('modules').select('*, level:levels(*)').eq('academic_year_id', year.id).order('order_index');
    if (levelFilter) query = query.eq('level_id', levelFilter);
    const { data } = await query;
    setModules(data ?? []);
    setLoading(false);
  }, [year, levelFilter]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.name || !form.code || !form.level_id || !year) { show('Tous les champs sont obligatoires', 'error'); return; }
    const { error } = await supabase.from('modules').insert({
      name: form.name, code: form.code, order_index: form.order_index, color: form.color,
      level_id: form.level_id, academic_year_id: year.id, status: 'actif',
    });
    if (error) show(error.message, 'error');
    else { show('Module créé', 'success'); setShowModal(false); setForm({ name: '', code: '', order_index: 1, color: '#1e40af', level_id: '' }); load(); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Modules"
        subtitle={`${modules.length} module(s) - ${year?.name ?? ''}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau module</button>}
      />
      <div className="mb-4">
        <Select value={levelFilter} onChange={setLevelFilter} placeholder="Tous les niveaux" options={levels.map((l) => ({ value: l.id, label: l.name }))} className="max-w-xs" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: m.color }}>
                {m.order_index}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{m.name}</h3>
                <p className="text-xs text-gray-500">{m.code} - {m.level?.name}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau module">
        <div className="space-y-4">
          <div><label className="label-field">Nom *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Module 1" /></div>
          <div><label className="label-field">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="M1-B1" /></div>
          <div><label className="label-field">Niveau *</label>
            <select className="input-field" value={form.level_id} onChange={(e) => setForm({ ...form, level_id: e.target.value })}>
              <option value="">--</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Ordre</label><input type="number" className="input-field" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 1 })} /></div>
            <div><label className="label-field">Couleur</label><input type="color" className="input-field h-10" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Créer</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// SUBJECTS PAGE
// ============================================================================
export function SubjectsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', name: '', module_id: '', level_id: '', teacher_id: '', coefficient: '1', passing_threshold: '10', order_index: '1' });
  const { show } = useToast();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    let query = supabase.from('subjects').select('*, module:modules(*), teacher:teachers(*), level:levels(*)').eq('academic_year_id', year.id).order('order_index');
    if (levelFilter) query = query.eq('level_id', levelFilter);
    const { data } = await query;
    setSubjects(data ?? []);
    setLoading(false);
  }, [year, levelFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('teachers').select('*').is('deleted_at', null).order('last_name').then(({ data }) => setTeachers((data as Teacher[]) ?? []));
  }, []);

  async function loadModules(levelId: string) {
    if (!year || !levelId) { setModules([]); return; }
    const { data } = await supabase.from('modules').select('*').eq('academic_year_id', year.id).eq('level_id', levelId).order('order_index');
    setModules(data ?? []);
  }

  async function create() {
    if (!form.code || !form.name || !form.level_id || !form.module_id || !year) { show('Champs obligatoires manquants', 'error'); return; }
    const { error } = await supabase.from('subjects').insert({
      code: form.code, name: form.name, module_id: form.module_id, level_id: form.level_id,
      academic_year_id: year.id, teacher_id: form.teacher_id || null,
      coefficient: parseFloat(form.coefficient) || 1, passing_threshold: parseFloat(form.passing_threshold) || 10,
      max_score: 20, min_score: 0, order_index: parseInt(form.order_index) || 1, is_active: true,
    });
    if (error) show(error.message, 'error');
    else { show('Matière créée', 'success'); setShowModal(false); setForm({ code: '', name: '', module_id: '', level_id: '', teacher_id: '', coefficient: '1', passing_threshold: '10', order_index: '1' }); load(); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Matières"
        subtitle={`${subjects.length} matière(s) - ${year?.name ?? ''}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouvelle matière</button>}
      />
      <div className="mb-4">
        <Select value={levelFilter} onChange={setLevelFilter} placeholder="Tous les niveaux" options={levels.map((l) => ({ value: l.id, label: l.name }))} className="max-w-xs" />
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Matière</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Module</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Enseignant</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Coef.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Niveau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((s) => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-4 py-3 font-medium text-ibr-700">{s.code}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.module?.color ?? '#ccc' }} />
                      {s.module?.name ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{s.teacher ? fullName(s.teacher.last_name, s.teacher.first_name) : '-'}</td>
                  <td className="px-4 py-3 text-center font-medium">{s.coefficient}</td>
                  <td className="px-4 py-3">{s.level?.name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle matière" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="label-field">Nom *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Niveau *</label>
              <select className="input-field" value={form.level_id} onChange={(e) => { setForm({ ...form, level_id: e.target.value, module_id: '' }); loadModules(e.target.value); }}>
                <option value="">--</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label className="label-field">Module *</label>
              <select className="input-field" value={form.module_id} onChange={(e) => setForm({ ...form, module_id: e.target.value })}>
                <option value="">--</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label-field">Enseignant</label>
            <select className="input-field" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
              <option value="">--</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t.last_name, t.first_name)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label-field">Coefficient</label><input type="number" step="0.5" className="input-field" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} /></div>
            <div><label className="label-field">Seuil validation</label><input type="number" className="input-field" value={form.passing_threshold} onChange={(e) => setForm({ ...form, passing_threshold: e.target.value })} /></div>
            <div><label className="label-field">Ordre</label><input type="number" className="input-field" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Créer</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// ENROLLMENTS PAGE
// ============================================================================
export function EnrollmentsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const { programs } = usePrograms();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [allLevels, setAllLevels] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [form, setForm] = useState({ student_id: '', level_id: '', program_id: '', enrollment_type: 'inscription' });
  const { show } = useToast();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    const { data } = await supabase
      .from('enrollments')
      .select('*, student:students(*), level:levels(*), program:programs(*), academic_year:academic_years(*)')
      .eq('academic_year_id', year.id)
      .order('created_at', { ascending: false });
    setEnrollments(data ?? []);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('students').select('*').is('deleted_at', null).order('last_name').then(({ data }) => setStudents((data as Student[]) ?? []));
    supabase.from('levels').select('*').order('order_index').then(({ data }) => setAllLevels(data ?? []));
    supabase.from('programs').select('*').eq('is_active', true).order('name').then(({ data }) => setAllPrograms(data ?? []));
  }, []);

  async function create() {
    if (!form.student_id || !form.level_id || !year) { show('Étudiant et niveau obligatoires', 'error'); return; }

    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', form.student_id)
      .eq('academic_year_id', year.id)
      .maybeSingle();
    if (existing) { show('Cet étudiant est déjà inscrit pour cette année', 'error'); return; }

    const { error } = await supabase.from('enrollments').insert({
      student_id: form.student_id, academic_year_id: year.id,
      program_id: form.program_id || null, level_id: form.level_id,
      enrollment_type: form.enrollment_type, status: 'validated',
      enrollment_date: new Date().toISOString().split('T')[0],
      validated_at: new Date().toISOString(),
    });
    if (error) show(error.message, 'error');
    else {
      // Copy fee structure to student account
      await copyFeesToStudent(form.student_id, form.level_id, year.id);
      show('Inscription validée avec succès', 'success');
      setShowModal(false);
      setForm({ student_id: '', level_id: '', program_id: '', enrollment_type: 'inscription' });
      load();
    }
  }

  async function copyFeesToStudent(studentId: string, levelId: string, ayId: string) {
    const { data: feeStructures } = await supabase
      .from('tuition_fee_structures')
      .select('*, fee_category:fee_categories(*)')
      .eq('academic_year_id', ayId)
      .eq('level_id', levelId);

    if (!feeStructures || feeStructures.length === 0) return;

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('academic_year_id', ayId)
      .maybeSingle();

    const totalDue = feeStructures.reduce((s, f: any) => s + f.amount, 0);

    const { data: account } = await supabase.from('student_fee_accounts').insert({
      student_id: studentId, academic_year_id: ayId, enrollment_id: enrollment?.id ?? null,
      level_id: levelId, total_due: totalDue, total_paid: 0, total_discount: 0,
      remaining: totalDue, currency: 'FCFA', is_up_to_date: false,
    }).select().single();

    if (account) {
      for (const fs of feeStructures) {
        await supabase.from('student_fee_items').insert({
          student_fee_account_id: account.id, fee_category_id: fs.fee_category_id,
          original_amount: fs.amount, discount_amount: 0, final_amount: fs.amount,
          amount_paid: 0, remaining: fs.amount, is_mandatory: fs.fee_category?.is_mandatory ?? true,
        });
      }
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Inscriptions"
        subtitle={`${enrollments.length} inscription(s) - ${year?.name ?? ''}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouvelle inscription</button>}
      />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Matricule</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Étudiant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Niveau</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrollments.map((e) => (
              <tr key={e.id} className="table-row-hover">
                <td className="px-4 py-3 font-medium text-ibr-700">{e.student?.matricule ?? '-'}</td>
                <td className="px-4 py-3">{e.student ? fullName(e.student.last_name, e.student.first_name) : '-'}</td>
                <td className="px-4 py-3">{e.level?.name ?? '-'}</td>
                <td className="px-4 py-3">{e.enrollment_type === 'inscription' ? 'Inscription' : 'Réinscription'}</td>
                <td className="px-4 py-3"><Badge color={e.status === 'validated' ? 'green' : 'gray'}>{e.status === 'validated' ? 'Validée' : 'En attente'}</Badge></td>
                <td className="px-4 py-3">{formatDate(e.enrollment_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle inscription" size="lg">
        <div className="space-y-4">
          <div><label className="label-field">Étudiant *</label>
            <select className="input-field" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">--</option>
              {students.map((s) => <option key={s.id} value={s.id}>{fullName(s.last_name, s.first_name)} ({s.matricule ?? 'sans matricule'})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Niveau *</label>
              <select className="input-field" value={form.level_id} onChange={(e) => setForm({ ...form, level_id: e.target.value })}>
                <option value="">--</option>
                {allLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label className="label-field">Programme</label>
              <select className="input-field" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
                <option value="">--</option>
                {allPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label-field">Type</label>
            <select className="input-field" value={form.enrollment_type} onChange={(e) => setForm({ ...form, enrollment_type: e.target.value })}>
              <option value="inscription">Inscription</option>
              <option value="reinscription">Réinscription</option>
            </select>
          </div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Valider l'inscription</button></div>
        </div>
      </Modal>
    </div>
  );
}
