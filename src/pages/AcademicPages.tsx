import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useCurrentAcademicYear, useLevels, usePrograms, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Modal, Select, EmptyState, ConfirmDialog } from '../components/ui';
import { fullName, formatDate, formatFCFA, ACADEMIC_STATUS_LABELS } from '../lib/utils';
import type { AcademicYear, Teacher, Module, Subject, Enrollment, Student, Program, Level } from '../types';
import {
  Plus, Calendar, School, Layers, GraduationCap, BookOpen, BookMarked,
  FileText, Users, Edit, Trash2, Eye, ChevronRight, ChevronLeft, Check, CheckCircle2,
  DollarSign, Package, UserCheck, AlertTriangle
} from 'lucide-react';

// ============================================================================
// ACADEMIC YEARS PAGE
// ============================================================================
export function AcademicYearsPage() {
  const { years, loading, refresh } = useCurrentAcademicYear() && { years: [] as AcademicYear[], loading: false, refresh: () => {} };
  const [localYears, setLocalYears] = useState<AcademicYear[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [deletingYear, setDeletingYear] = useState<AcademicYear | null>(null);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', status: 'preparation' as any });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLocalLoading(true);
    const { data } = await supabase.from('academic_years').select('*').order('name', { ascending: false });
    setLocalYears((data as AcademicYear[]) ?? []);
    setLocalLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setCurrent(id: string) {
    await supabase.from('academic_years').update({ is_current: false }).neq('id', id);
    await supabase.from('academic_years').update({ is_current: true }).eq('id', id);
    load();
    show('Année académique courante mise à jour', 'success');
  }

  async function handleSave() {
    if (!form.name || !form.start_date || !form.end_date) {
      show('Tous les champs sont obligatoires', 'error');
      return;
    }

    if (editingYear) {
      const { error } = await supabase.from('academic_years').update({
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
      }).eq('id', editingYear.id);

      if (error) show(error.message, 'error');
      else {
        show('Année académique mise à jour', 'success');
        setShowModal(false);
        setEditingYear(null);
        load();
      }
    } else {
      const { error } = await supabase.from('academic_years').insert({
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
      });

      if (error) show(error.message, 'error');
      else {
        show('Année académique créée', 'success');
        setShowModal(false);
        setForm({ name: '', start_date: '', end_date: '', status: 'preparation' });
        load();
      }
    }
  }

  async function handleDelete() {
    if (!deletingYear) return;
    const { error } = await supabase.from('academic_years').delete().eq('id', deletingYear.id);
    if (error) {
      show("Impossible de supprimer cette année car elle est liée à d'autres données.", 'error');
    } else {
      show('Année académique supprimée', 'success');
      load();
    }
    setDeletingYear(null);
  }

  if (localLoading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Années académiques"
        subtitle="Gestion des années académiques"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setEditingYear(null);
            setForm({ name: '', start_date: '', end_date: '', status: 'preparation' });
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4" /> Nouvelle année
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {localYears.map((y) => (
          <Card key={y.id} className={`p-5 relative ${y.is_current ? 'ring-2 ring-ibr-600/30 card-premium-accent' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-ibr-600" />
                <h3 className="font-semibold text-gray-900">{y.name}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {y.is_current && <Badge color="green">Courante</Badge>}
                <Badge color={y.status === 'open' ? 'green' : y.status === 'closed' ? 'red' : y.status === 'archived' ? 'gray' : 'gold'}>
                  {y.status}
                </Badge>
              </div>
            </div>
            <dl className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between"><dt className="text-gray-500">Début</dt><dd className="font-medium">{formatDate(y.start_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Fin</dt><dd className="font-medium">{formatDate(y.end_date)}</dd></div>
            </dl>
            <div className="flex gap-2">
              {!y.is_current && (
                <button className="btn-secondary py-1.5 text-xs flex-1" onClick={() => setCurrent(y.id)}>
                  Activer
                </button>
              )}
              <button className="btn-secondary p-2 hover:text-ibr-700" onClick={() => {
                setEditingYear(y);
                setForm({ name: y.name, start_date: y.start_date, end_date: y.end_date, status: y.status });
                setShowModal(true);
              }}>
                <Edit className="w-4 h-4" />
              </button>
              <button className="btn-secondary p-2 hover:text-red-600" onClick={() => setDeletingYear(y)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingYear ? "Modifier l'année académique" : "Nouvelle année académique"}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Nom (ex: 2025)</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2025" />
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
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="preparation">Préparation</option>
              <option value="open">Ouverte</option>
              <option value="closed">Clôturée</option>
              <option value="archived">Archivée</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave}>{editingYear ? "Enregistrer" : "Créer"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingYear}
        onClose={() => setDeletingYear(null)}
        onConfirm={handleDelete}
        title="Supprimer l'année académique"
        message={`Voulez-vous vraiment supprimer l'année académique ${deletingYear?.name} ? Cette action est irréversible.`}
      />
    </div>
  );
}

// ============================================================================
// PROGRAMS PAGE
// ============================================================================
export function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('programs').select('*').order('name');
    setPrograms((data as Program[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.name || !form.code) { show('Nom et code obligatoires', 'error'); return; }

    if (editingProgram) {
      const { error } = await supabase.from('programs').update({
        name: form.name,
        code: form.code.toUpperCase(),
        description: form.description,
      }).eq('id', editingProgram.id);

      if (error) show(error.message, 'error');
      else {
        show('Programme mis à jour', 'success');
        setShowModal(false);
        setEditingProgram(null);
        load();
      }
    } else {
      const { error } = await supabase.from('programs').insert({
        name: form.name, code: form.code.toUpperCase(), description: form.description, is_active: true,
      });
      if (error) show(error.message, 'error');
      else {
        show('Programme créé', 'success');
        setShowModal(false);
        setForm({ name: '', code: '', description: '' });
        load();
      }
    }
  }

  async function handleDelete() {
    if (!deletingProgram) return;
    const { error } = await supabase.from('programs').delete().eq('id', deletingProgram.id);
    if (error) {
      show("Impossible de supprimer ce programme car des niveaux ou étudiants y sont rattachés.", 'error');
    } else {
      show('Programme supprimé', 'success');
      load();
    }
    setDeletingProgram(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Programmes de formation"
        subtitle="Gestion des programmes"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setEditingProgram(null);
            setForm({ name: '', code: '', description: '' });
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4" /> Nouveau programme
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((p) => (
          <Card key={p.id} className="p-5 flex flex-col justify-between h-48">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-ibr-600" />
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{p.name}</h3>
                </div>
                <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Actif' : 'Inactif'}</Badge>
              </div>
              <p className="text-xs font-mono text-gray-500">Code: {p.code}</p>
              {p.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>}
            </div>
            <div className="flex gap-2 mt-4 pt-2 border-t border-gray-50">
              <button className="btn-secondary py-1 px-3 text-xs flex items-center gap-1.5" onClick={() => {
                setEditingProgram(p);
                setForm({ name: p.name, code: p.code, description: p.description ?? '' });
                setShowModal(true);
              }}>
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
              <button className="btn-secondary py-1 px-3 text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5" onClick={() => setDeletingProgram(p)}>
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingProgram ? "Modifier le programme" : "Nouveau programme"}>
        <div className="space-y-4">
          <div><label className="label-field">Nom *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label-field">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label className="label-field">Description</label><textarea className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave}>{editingProgram ? "Enregistrer" : "Créer"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingProgram}
        onClose={() => setDeletingProgram(null)}
        onConfirm={handleDelete}
        title="Supprimer le programme"
        message={`Voulez-vous vraiment supprimer le programme ${deletingProgram?.name} ?`}
      />
    </div>
  );
}

// ============================================================================
// LEVELS PAGE
// ============================================================================
export function LevelsPage() {
  const { levels, loading, refresh } = useLevels();
  const { programs } = usePrograms();
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);
  const [form, setForm] = useState({ name: '', code: '', order_index: 0, program_id: '' });
  const { show } = useToast();

  async function handleSave() {
    if (!form.name || !form.code) { show('Nom et code obligatoires', 'error'); return; }

    if (editingLevel) {
      const { error } = await supabase.from('levels').update({
        name: form.name,
        code: form.code.toUpperCase(),
        order_index: parseInt(form.order_index.toString()) || 0,
        program_id: form.program_id || null,
      }).eq('id', editingLevel.id);

      if (error) show(error.message, 'error');
      else {
        show('Niveau mis à jour', 'success');
        setShowModal(false);
        setEditingLevel(null);
        refresh();
      }
    } else {
      const { error } = await supabase.from('levels').insert({
        name: form.name, code: form.code.toUpperCase(), order_index: parseInt(form.order_index.toString()) || 0,
        program_id: form.program_id || null, is_active: true,
      });
      if (error) show(error.message, 'error');
      else {
        show('Niveau créé', 'success');
        setShowModal(false);
        setForm({ name: '', code: '', order_index: 0, program_id: '' });
        refresh();
      }
    }
  }

  async function handleDelete() {
    if (!deletingLevel) return;
    const { error } = await supabase.from('levels').delete().eq('id', deletingLevel.id);
    if (error) {
      show("Impossible de supprimer ce niveau car des modules ou étudiants y sont rattachés.", 'error');
    } else {
      show('Niveau supprimé', 'success');
      refresh();
    }
    setDeletingLevel(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Niveaux"
        subtitle="Gestion des niveaux d'étude"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setEditingLevel(null);
            setForm({ name: '', code: '', order_index: 0, program_id: '' });
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4" /> Nouveau niveau
          </button>
        }
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Code</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Nom</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Ordre</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Statut</th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {levels.map((l) => (
                <tr key={l.id} className="table-row-hover">
                  <td className="px-5 py-3.5 font-medium text-ibr-700 font-mono">{l.code}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{l.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{l.order_index}</td>
                  <td className="px-5 py-3.5"><Badge color={l.is_active ? 'green' : 'gray'}>{l.is_active ? 'Actif' : 'Inactif'}</Badge></td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-gray-400 hover:text-ibr-700 p-1" onClick={() => {
                        setEditingLevel(l);
                        setForm({ name: l.name, code: l.code, order_index: l.order_index, program_id: l.program_id ?? '' });
                        setShowModal(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => setDeletingLevel(l)}>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingLevel ? "Modifier le niveau" : "Nouveau niveau"}>
        <div className="space-y-4">
          <div><label className="label-field">Nom *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label-field">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label className="label-field">Ordre</label><input type="number" className="input-field" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })} /></div>
          <div><label className="label-field">Programme</label><Select value={form.program_id} onChange={(v) => setForm({ ...form, program_id: v })} placeholder="Aucun" options={programs.map((p) => ({ value: p.id, label: p.name }))} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave}>{editingLevel ? "Enregistrer" : "Créer"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingLevel}
        onClose={() => setDeletingLevel(null)}
        onConfirm={handleDelete}
        title="Supprimer le niveau"
        message={`Voulez-vous vraiment supprimer le niveau ${deletingLevel?.name} ?`}
      />
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
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ last_name: '', first_name: '', title: '', phone: '', email: '', specialty: '', status: 'actif' });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('teachers').select('*').is('deleted_at', null).order('last_name');
    setTeachers((data as Teacher[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.last_name || !form.first_name) { show('Nom et prénom obligatoires', 'error'); return; }

    const saveData = {
      last_name: form.last_name, first_name: form.first_name, title: form.title || null,
      phone: form.phone || null, email: form.email || null, specialty: form.specialty || null, status: form.status,
    };

    if (editingTeacher) {
      const { error } = await supabase.from('teachers').update(saveData).eq('id', editingTeacher.id);
      if (error) show(error.message, 'error');
      else {
        show('Enseignant mis à jour', 'success');
        setShowModal(false);
        setEditingTeacher(null);
        load();
      }
    } else {
      const { error } = await supabase.from('teachers').insert(saveData);
      if (error) show(error.message, 'error');
      else {
        show('Enseignant créé', 'success');
        setShowModal(false);
        setForm({ last_name: '', first_name: '', title: '', phone: '', email: '', specialty: '', status: 'actif' });
        load();
      }
    }
  }

  async function handleDelete() {
    if (!deletingTeacher) return;
    const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).eq('id', deletingTeacher.id);
    if (error) show(error.message, 'error');
    else {
      show('Enseignant supprimé', 'success');
      load();
    }
    setDeletingTeacher(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Enseignants"
        subtitle={`${teachers.length} enseignant(s)`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setEditingTeacher(null);
            setForm({ last_name: '', first_name: '', title: '', phone: '', email: '', specialty: '', status: 'actif' });
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4" /> Nouvel enseignant
          </button>
        }
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">N°</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Nom et prénoms</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Titre</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Téléphone</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Spécialité</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Statut</th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teachers.map((t, i) => (
                <tr key={t.id} className="table-row-hover">
                  <td className="px-5 py-3.5 text-gray-500">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{fullName(t.last_name, t.first_name)}</td>
                  <td className="px-5 py-3.5 text-gray-600">{t.title ?? '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{t.phone ?? '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{t.specialty ?? '-'}</td>
                  <td className="px-5 py-3.5"><Badge color={t.status === 'actif' ? 'green' : 'gray'}>{t.status}</Badge></td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-gray-400 hover:text-ibr-700 p-1" onClick={() => {
                        setEditingTeacher(t);
                        setForm({
                          last_name: t.last_name, first_name: t.first_name, title: t.title ?? '',
                          phone: t.phone ?? '', email: t.email ?? '', specialty: t.specialty ?? '', status: t.status
                        });
                        setShowModal(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => setDeletingTeacher(t)}>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingTeacher ? "Modifier l'enseignant" : "Nouvel enseignant"}>
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
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave}>{editingTeacher ? "Enregistrer" : "Créer"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingTeacher}
        onClose={() => setDeletingTeacher(null)}
        onConfirm={handleDelete}
        title="Supprimer l'enseignant"
        message={`Voulez-vous vraiment supprimer l'enseignant ${deletingTeacher ? fullName(deletingTeacher.last_name, deletingTeacher.first_name) : ''} ?`}
      />
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
  const [editingModule, setEditingModule] = useState<any>(null);
  const [deletingModule, setDeletingModule] = useState<any>(null);
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

  async function handleSave() {
    if (!form.name || !form.code || !form.level_id || !year) { show('Tous les champs sont obligatoires', 'error'); return; }

    const saveData = {
      name: form.name, code: form.code, order_index: form.order_index, color: form.color,
      level_id: form.level_id, academic_year_id: year.id, status: 'actif',
    };

    if (editingModule) {
      const { error } = await supabase.from('modules').update(saveData).eq('id', editingModule.id);
      if (error) show(error.message, 'error');
      else {
        show('Module mis à jour', 'success');
        setShowModal(false);
        setEditingModule(null);
        load();
      }
    } else {
      const { error } = await supabase.from('modules').insert(saveData);
      if (error) show(error.message, 'error');
      else {
        show('Module créé', 'success');
        setShowModal(false);
        setForm({ name: '', code: '', order_index: 1, color: '#1e40af', level_id: '' });
        load();
      }
    }
  }

  async function handleDelete() {
    if (!deletingModule) return;
    const { error } = await supabase.from('modules').delete().eq('id', deletingModule.id);
    if (error) show("Impossible de supprimer ce module car il contient des matières.", 'error');
    else {
      show('Module supprimé', 'success');
      load();
    }
    setDeletingModule(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Modules"
        subtitle={`${modules.length} module(s) - ${year?.name ?? ''}`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setEditingModule(null);
            setForm({ name: '', code: '', order_index: 1, color: '#1e40af', level_id: '' });
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4" /> Nouveau module
          </button>
        }
      />
      <div className="mb-4">
        <Select value={levelFilter} onChange={setLevelFilter} placeholder="Tous les niveaux" options={levels.map((l) => ({ value: l.id, label: l.name }))} className="max-w-xs" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((m) => (
          <Card key={m.id} className="p-5 flex flex-col justify-between h-40 relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm" style={{ backgroundColor: m.color }}>
                {m.order_index}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-1">{m.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{m.code} - {m.level?.name}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-gray-50 mt-4">
              <button className="text-gray-400 hover:text-ibr-700 p-1" onClick={() => {
                setEditingModule(m);
                setForm({ name: m.name, code: m.code, order_index: m.order_index, color: m.color, level_id: m.level_id });
                setShowModal(true);
              }}>
                <Edit className="w-4 h-4" />
              </button>
              <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => setDeletingModule(m)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingModule ? "Modifier le module" : "Nouveau module"}>
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
            <div><label className="label-field">Couleur</label><input type="color" className="input-field h-11 px-1.5 py-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave}>{editingModule ? "Enregistrer" : "Créer"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingModule}
        onClose={() => setDeletingModule(null)}
        onConfirm={handleDelete}
        title="Supprimer le module"
        message={`Voulez-vous vraiment supprimer le module ${deletingModule?.name} ?`}
      />
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
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [deletingSubject, setDeletingSubject] = useState<any>(null);
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

  async function handleSave() {
    if (!form.code || !form.name || !form.level_id || !form.module_id || !year) { show('Champs obligatoires manquants', 'error'); return; }

    const saveData = {
      code: form.code, name: form.name, module_id: form.module_id, level_id: form.level_id,
      academic_year_id: year.id, teacher_id: form.teacher_id || null,
      coefficient: parseFloat(form.coefficient) || 1, passing_threshold: parseFloat(form.passing_threshold) || 10,
      max_score: 20, min_score: 0, order_index: parseInt(form.order_index) || 1, is_active: true,
    };

    if (editingSubject) {
      const { error } = await supabase.from('subjects').update(saveData).eq('id', editingSubject.id);
      if (error) show(error.message, 'error');
      else {
        show('Matière mise à jour', 'success');
        setShowModal(false);
        setEditingSubject(null);
        load();
      }
    } else {
      const { error } = await supabase.from('subjects').insert(saveData);
      if (error) show(error.message, 'error');
      else {
        show('Matière créée', 'success');
        setShowModal(false);
        setForm({ code: '', name: '', module_id: '', level_id: '', teacher_id: '', coefficient: '1', passing_threshold: '10', order_index: '1' });
        load();
      }
    }
  }

  async function handleDelete() {
    if (!deletingSubject) return;
    const { error } = await supabase.from('subjects').delete().eq('id', deletingSubject.id);
    if (error) show("Impossible de supprimer cette matière car elle possède des notes associées.", 'error');
    else {
      show('Matière supprimée', 'success');
      load();
    }
    setDeletingSubject(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Matières"
        subtitle={`${subjects.length} matière(s) - ${year?.name ?? ''}`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setEditingSubject(null);
            setForm({ code: '', name: '', module_id: '', level_id: '', teacher_id: '', coefficient: '1', passing_threshold: '10', order_index: '1' });
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4" /> Nouvelle matière
          </button>
        }
      />
      <div className="mb-4">
        <Select value={levelFilter} onChange={setLevelFilter} placeholder="Tous les niveaux" options={levels.map((l) => ({ value: l.id, label: l.name }))} className="max-w-xs" />
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-800">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Code</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Matière</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Module</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Enseignant</th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Coef.</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Niveau</th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((s) => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-5 py-3.5 font-semibold text-ibr-700 font-mono">{s.code}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.module?.color ?? '#ccc' }} />
                      {s.module?.name ?? '-'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">{s.teacher ? fullName(s.teacher.last_name, s.teacher.first_name) : '-'}</td>
                  <td className="px-5 py-3.5 text-center font-bold">{s.coefficient}</td>
                  <td className="px-5 py-3.5 text-gray-600">{s.level?.name ?? '-'}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-gray-400 hover:text-ibr-700 p-1" onClick={() => {
                        setEditingSubject(s);
                        loadModules(s.level_id);
                        setForm({
                          code: s.code, name: s.name, module_id: s.module_id, level_id: s.level_id,
                          teacher_id: s.teacher_id ?? '', coefficient: s.coefficient.toString(),
                          passing_threshold: s.passing_threshold.toString(), order_index: s.order_index.toString()
                        });
                        setShowModal(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => setDeletingSubject(s)}>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingSubject ? "Modifier la matière" : "Nouvelle matière"} size="lg">
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
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave}>{editingSubject ? "Enregistrer" : "Créer"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingSubject}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleDelete}
        title="Supprimer la matière"
        message={`Voulez-vous vraiment supprimer la matière ${deletingSubject?.name} ?`}
      />
    </div>
  );
}

// ============================================================================
// ENROLLMENTS PAGE & ASSISTANT D'INSCRIPTION MULTI-ÉTAPES
// ============================================================================
export function EnrollmentsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const { programs } = usePrograms();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const { show } = useToast();

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Toggle for new student creation
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    last_name: '', first_name: '', sex: '', birth_date: '', birth_place: '',
    nationality: 'Ivoirienne', marital_status: '', phone: '', email: '', church: ''
  });

  // Academic choice state
  const [academicForm, setAcademicForm] = useState({
    level_id: '', program_id: '', enrollment_type: 'inscription' as 'inscription' | 'reinscription'
  });

  // Finance/Booklets configuration
  const [levelFeeStructures, setLevelFeeStructures] = useState<any[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [bookletsList, setBookletsList] = useState<any[]>([]);
  const [selectedBookletIds, setSelectedBookletIds] = useState<string[]>([]);

  // Initial Payment state
  const [recordInitialPayment, setRecordInitialPayment] = useState(false);
  const [paymentForm, setFormPayment] = useState({
    amount: '', payment_method: 'especes', transaction_reference: '', observation: ''
  });

  const loadEnrollments = useCallback(async () => {
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

  useEffect(() => { loadEnrollments(); }, [loadEnrollments]);

  // Load students for search
  useEffect(() => {
    supabase.from('students').select('*').is('deleted_at', null).order('last_name').then(({ data }) => {
      setStudentsList((data as Student[]) ?? []);
    });
  }, [showWizard]);

  // Load fees and booklets when level is chosen
  useEffect(() => {
    if (academicForm.level_id && year) {
      // Fetch fee structures
      supabase.from('tuition_fee_structures')
        .select('*, fee_category:fee_categories(*)')
        .eq('academic_year_id', year.id)
        .eq('level_id', academicForm.level_id)
        .then(({ data }) => setLevelFeeStructures(data ?? []));

      // Fetch booklets
      supabase.from('training_booklets')
        .select('*')
        .eq('level_id', academicForm.level_id)
        .eq('is_active', true)
        .then(({ data }) => {
          const list = data ?? [];
          setBookletsList(list);
          // Auto select mandatory booklets
          const mandatoryIds = list.filter((b) => b.is_mandatory).map((b) => b.id);
          setSelectedBookletIds(mandatoryIds);
        });
    }
  }, [academicForm.level_id, year]);

  const filteredStudents = studentsList.filter((s) => {
    if (!searchQuery) return true;
    const name = fullName(s.last_name, s.first_name).toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || (s.matricule ?? '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculations
  const baseFeesTotal = levelFeeStructures.reduce((sum, f) => sum + f.amount, 0);
  const selectedBookletsPrice = bookletsList
    .filter((b) => selectedBookletIds.includes(b.id))
    .reduce((sum, b) => sum + (b.unit_price || 0), 0);
  const finalTotalDue = baseFeesTotal + selectedBookletsPrice - discountAmount;

  // Next step handler
  function handleNext() {
    if (wizardStep === 1 && !selectedStudent && !isNewStudent) {
      show('Sélectionnez un étudiant ou cochez Nouveau dossier', 'error');
      return;
    }
    if (wizardStep === 1 && isNewStudent && (!newStudentForm.last_name || !newStudentForm.first_name)) {
      show('Nom et Prénoms requis pour le nouvel étudiant', 'error');
      return;
    }
    if (wizardStep === 2 && !academicForm.level_id) {
      show('Sélectionnez un niveau d\'études', 'error');
      return;
    }
    setWizardStep((s) => s + 1);
  }

  // Back step handler
  function handleBack() {
    setWizardStep((s) => s - 1);
  }

  // Complete Enrollment wizard
  async function handleFinish() {
    if (!year) return;
    setLoading(true);

    try {
      let studentId = selectedStudent?.id;

      // 1. Create student if new or update existing
      const levelObj = levels.find((l) => l.id === academicForm.level_id);
      let enrollmentMatricule = '';

      if (isNewStudent) {
        // Generate a student sequence number
        const { data: seqData } = await supabase
          .from('matricule_sequences')
          .select('sequence_number')
          .eq('level_code', levelObj?.code ?? 'B1')
          .order('sequence_number', { ascending: false })
          .limit(1);

        const nextNum = seqData && seqData.length > 0 ? (seqData[0] as any).sequence_number + 1 : 1;
        const studentSeqStr = String(nextNum).padStart(4, '0');
        enrollmentMatricule = `${studentSeqStr}/IBR/${levelObj?.code ?? 'B1'}`;

        const { data: newStud, error: studErr } = await supabase.from('students').insert({
          last_name: newStudentForm.last_name,
          first_name: newStudentForm.first_name,
          sex: newStudentForm.sex || null,
          birth_date: newStudentForm.birth_date || null,
          birth_place: newStudentForm.birth_place || null,
          nationality: newStudentForm.nationality,
          marital_status: newStudentForm.marital_status || null,
          phone: newStudentForm.phone || null,
          email: newStudentForm.email || null,
          church: newStudentForm.church || null,
          first_enrollment_date: new Date().toISOString().split('T')[0],
          student_number: studentSeqStr,
          matricule: enrollmentMatricule,
          current_level_id: academicForm.level_id,
          academic_status: 'actif',
        }).select().single();

        if (studErr) throw new Error(studErr.message);
        studentId = newStud.id;

        // Insert matricule sequence record
        await supabase.from('matricule_sequences').insert({
          sequence_number: nextNum,
          level_code: levelObj?.code ?? 'B1',
          used_by_student: newStud.id,
          used_at: new Date().toISOString(),
        });
      } else if (studentId) {
        const studentObj = studentsList.find((s) => s.id === studentId);
        const currentSeq = studentObj?.student_number || String(Math.floor(Math.random() * 1000)).padStart(4, '0');
        enrollmentMatricule = `${currentSeq}/IBR/${levelObj?.code}`;

        // Update existing student current level, status and active matricule
        await supabase.from('students').update({
          current_level_id: academicForm.level_id,
          academic_status: 'actif',
          matricule: enrollmentMatricule,
        }).eq('id', studentId);
      }

      if (!studentId) throw new Error("Échec d'identification de l'étudiant");

      // 2. Check if enrollment already exists
      const { data: existingEnr } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('academic_year_id', year.id)
        .maybeSingle();

      if (existingEnr) {
        throw new Error("Cet étudiant possède déjà un dossier d'inscription pour cette année.");
      }

      // Insert enrollment
      const { data: enrollment, error: enrErr } = await supabase.from('enrollments').insert({
        student_id: studentId,
        academic_year_id: year.id,
        level_id: academicForm.level_id,
        program_id: academicForm.program_id || null,
        enrollment_type: academicForm.enrollment_type,
        status: 'validated',
        enrollment_date: new Date().toISOString().split('T')[0],
        validated_at: new Date().toISOString(),
        enrollment_matricule: enrollmentMatricule,
      }).select().single();

      if (enrErr) throw new Error(enrErr.message);

      // 3. Create student fee account
      const { data: feeAccount, error: accErr } = await supabase.from('student_fee_accounts').insert({
        student_id: studentId,
        academic_year_id: year.id,
        enrollment_id: enrollment.id,
        level_id: academicForm.level_id,
        total_due: finalTotalDue,
        total_discount: discountAmount,
        total_paid: 0,
        remaining: finalTotalDue,
        currency: 'FCFA',
        is_up_to_date: finalTotalDue <= 0,
      }).select().single();

      if (accErr) throw new Error(accErr.message);

      // Insert base fee items
      for (const fee of levelFeeStructures) {
        // Adjust tuition structure discount if needed
        await supabase.from('student_fee_items').insert({
          student_fee_account_id: feeAccount.id,
          fee_category_id: fee.fee_category_id,
          original_amount: fee.amount,
          discount_amount: fee.fee_category?.code === 'scolarite' ? discountAmount : 0,
          final_amount: fee.fee_category?.code === 'scolarite' ? (fee.amount - discountAmount) : fee.amount,
          amount_paid: 0,
          remaining: fee.fee_category?.code === 'scolarite' ? (fee.amount - discountAmount) : fee.amount,
          is_mandatory: fee.fee_category?.is_mandatory ?? true,
        });
      }

      // Add checked booklets as sales or separate fee account items
      if (selectedBookletIds.length > 0) {
        // Add booklet fees to account
        const bookletFeeCat = await supabase.from('fee_categories').select('id').eq('code', 'fascicule').maybeSingle();
        const bCatId = bookletFeeCat.data?.id;
        if (bCatId) {
          for (const bId of selectedBookletIds) {
            const booklet = bookletsList.find((b) => b.id === bId);
            if (booklet) {
              await supabase.from('student_fee_items').insert({
                student_fee_account_id: feeAccount.id,
                fee_category_id: bCatId,
                original_amount: booklet.unit_price,
                discount_amount: 0,
                final_amount: booklet.unit_price,
                amount_paid: 0,
                remaining: booklet.unit_price,
                is_mandatory: false,
              });

              // Create booklet delivery/order
              const { data: bookletOrder } = await supabase.from('booklet_orders').insert({
                student_id: studentId,
                academic_year_id: year.id,
                level_id: academicForm.level_id,
                total_amount: booklet.unit_price,
                discount_amount: 0,
                final_amount: booklet.unit_price,
                amount_paid: 0,
                remaining: booklet.unit_price,
                status: 'pending',
                order_date: new Date().toISOString().split('T')[0],
              }).select().single();

              if (bookletOrder) {
                await supabase.from('booklet_order_items').insert({
                  order_id: bookletOrder.id,
                  booklet_id: bId,
                  quantity: 1,
                  unit_price: booklet.unit_price,
                  total_price: booklet.unit_price,
                });
              }
            }
          }
        }
      }

      // 4. Initial Payment if checked
      if (recordInitialPayment && paymentForm.amount) {
        const paymentAmount = parseFloat(paymentForm.amount);
        if (paymentAmount > 0) {
          const receiptNum = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
          
          const { data: payment } = await supabase.from('payments').insert({
            student_id: studentId,
            academic_year_id: year.id,
            student_fee_account_id: feeAccount.id,
            amount: paymentAmount,
            payment_method: paymentForm.payment_method,
            transaction_reference: paymentForm.transaction_reference || null,
            observation: paymentForm.observation || "Paiement d'inscription initial",
            receipt_number: receiptNum,
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0],
          }).select().single();

          if (payment) {
            await supabase.from('payment_receipts').insert({
              receipt_number: receiptNum,
              payment_id: payment.id,
              student_id: studentId,
              amount: paymentAmount,
              payment_method: paymentForm.payment_method,
            });

            // FIFO Allocation
            const { data: accountItems } = await supabase
              .from('student_fee_items')
              .select('*')
              .eq('student_fee_account_id', feeAccount.id)
              .order('is_mandatory', { ascending: false });

            let remainingPay = paymentAmount;
            for (const item of accountItems ?? []) {
              if (remainingPay <= 0) break;
              if (item.remaining > 0) {
                const allocation = Math.min(remainingPay, item.remaining);
                await supabase.from('payment_allocations').insert({
                  payment_id: payment.id,
                  student_fee_item_id: item.id,
                  amount: allocation,
                });
                await supabase.from('student_fee_items').update({
                  amount_paid: item.amount_paid + allocation,
                  remaining: item.remaining - allocation,
                }).eq('id', item.id);
                remainingPay -= allocation;
              }
            }

            // Update account values
            await supabase.from('student_fee_accounts').update({
              total_paid: paymentAmount,
              remaining: finalTotalDue - paymentAmount,
              is_up_to_date: (finalTotalDue - paymentAmount) <= 0,
            }).eq('id', feeAccount.id);
          }
        }
      }

      // 5. Generate Student Card record
      const cardNo = `IBR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      await supabase.from('student_cards').insert({
        card_number: cardNo,
        student_id: studentId,
        academic_year_id: year.id,
        level_id: academicForm.level_id,
        qr_code_data: JSON.stringify({ matricule: enrollmentMatricule, year: year.name, student_id: studentId }),
        status: 'generated',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: year.end_date,
      });

      show('Inscription validée avec succès !', 'success');
      setShowWizard(false);
      loadEnrollments();
    } catch (err: any) {
      show(err.message || 'Une erreur est survenue lors de l\'inscription', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Inscriptions"
        subtitle={`${enrollments.length} inscription(s) - ${year?.name ?? ''}`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setWizardStep(1);
            setSelectedStudent(null);
            setIsNewStudent(false);
            setAcademicForm({ level_id: '', program_id: '', enrollment_type: 'inscription' });
            setRecordInitialPayment(false);
            setFormPayment({ amount: '', payment_method: 'especes', transaction_reference: '', observation: '' });
            setDiscountAmount(0);
            setShowWizard(true);
          }}>
            <Plus className="w-4 h-4" /> Assistant d'inscription
          </button>
        }
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Matricule</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Étudiant</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Niveau</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Type</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Statut</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Date d'inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrollments.map((e) => (
                <tr key={e.id} className="table-row-hover">
                  <td className="px-5 py-3.5 font-semibold text-ibr-700 font-mono">{e.enrollment_matricule ?? e.student?.matricule ?? '-'}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{e.student ? fullName(e.student.last_name, e.student.first_name) : '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{e.level?.name ?? '-'}</td>
                  <td className="px-5 py-3.5">{e.enrollment_type === 'inscription' ? 'Inscription' : 'Réinscription'}</td>
                  <td className="px-5 py-3.5">
                    <Badge color={e.status === 'validated' ? 'green' : 'gray'}>
                      {e.status === 'validated' ? 'Validée' : 'En attente'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(e.enrollment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ASSISTANT D'INSCRIPTION MULTI-ÉTAPES */}
      <Modal open={showWizard} onClose={() => setShowWizard(false)} title="Assistant d'inscription Rehoboth" size="xl">
        <div className="flex flex-col h-[75vh]">
          {/* Header Step indicators */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-xl mb-4">
            {[
              { num: 1, label: 'Sélection' },
              { num: 2, label: 'Parcours' },
              { num: 3, label: 'Facturation' },
              { num: 4, label: 'Paiement' },
              { num: 5, label: 'Résumé' }
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  wizardStep === s.num
                    ? 'bg-ibr-700 text-white ring-4 ring-ibr-100'
                    : wizardStep > s.num
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                  {wizardStep > s.num ? <Check className="w-4 h-4" /> : s.num}
                </span>
                <span className={`text-xs font-semibold hidden sm:inline ${
                  wizardStep === s.num ? 'text-ibr-900 font-bold' : 'text-gray-500'
                }`}>
                  {s.label}
                </span>
                {s.num < 5 && <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:inline" />}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-1">
            {/* STEP 1: SELECT OR CREATE STUDENT */}
            {wizardStep === 1 && (
              <div className="space-y-4 animate-slide-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-gray-900">Identification de l'étudiant</h4>
                  <label className="flex items-center gap-2 cursor-pointer bg-ibr-50 px-3 py-1.5 rounded-lg border border-ibr-100 text-ibr-900 font-medium text-xs">
                    <input type="checkbox" checked={isNewStudent} onChange={(e) => {
                      setIsNewStudent(e.target.checked);
                      setSelectedStudent(null);
                    }} className="rounded text-ibr-600 focus:ring-ibr-500" />
                    Nouvel étudiant (Dossier vierge)
                  </label>
                </div>

                {!isNewStudent ? (
                  <div className="space-y-3">
                    <label className="label-field">Rechercher et sélectionner un étudiant existant</label>
                    <div className="flex gap-2">
                      <input className="input-field max-w-sm" placeholder="Saisir un nom ou matricule..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>

                    <div className="border rounded-xl divide-y max-h-64 overflow-y-auto bg-white shadow-inner">
                      {filteredStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedStudent(s)}
                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-ibr-50/20 transition-all ${
                            selectedStudent?.id === s.id ? 'bg-ibr-50/50 border-l-4 border-ibr-600' : ''
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{fullName(s.last_name, s.first_name)}</p>
                            <p className="text-xs text-gray-500 font-mono">Numéro permanent: {s.student_number ?? 'aucun'} | Sexe: {s.sex ?? '-'}</p>
                          </div>
                          {selectedStudent?.id === s.id && <CheckCircle2 className="w-5 h-5 text-ibr-600" />}
                        </div>
                      ))}
                      {filteredStudents.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">Aucun étudiant trouvé.</p>}
                    </div>
                  </div>
                ) : (
                  <div className="card p-5 bg-gray-50/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="label-field">Nom *</label>
                      <input className="input-field" value={newStudentForm.last_name} onChange={(e) => setNewStudentForm({ ...newStudentForm, last_name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="label-field">Prénoms *</label>
                      <input className="input-field" value={newStudentForm.first_name} onChange={(e) => setNewStudentForm({ ...newStudentForm, first_name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="label-field">Sexe</label>
                      <select className="input-field" value={newStudentForm.sex} onChange={(e) => setNewStudentForm({ ...newStudentForm, sex: e.target.value })}>
                        <option value="">--</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Date de naissance</label>
                      <input type="date" className="input-field" value={newStudentForm.birth_date} onChange={(e) => setNewStudentForm({ ...newStudentForm, birth_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-field">Lieu de naissance</label>
                      <input className="input-field" value={newStudentForm.birth_place} onChange={(e) => setNewStudentForm({ ...newStudentForm, birth_place: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-field">Téléphone</label>
                      <input className="input-field" value={newStudentForm.phone} onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-field">Email</label>
                      <input type="email" className="input-field" value={newStudentForm.email} onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-field">Église d'appartenance</label>
                      <input className="input-field" value={newStudentForm.church} onChange={(e) => setNewStudentForm({ ...newStudentForm, church: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: CHOOSE ACADEMIC LEVEL */}
            {wizardStep === 2 && (
              <div className="space-y-4 animate-slide-in">
                <h4 className="text-base font-semibold text-gray-900">Choix académique & Type de scolarité</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Niveau d'études d'accueil *</label>
                    <select className="input-field" value={academicForm.level_id} onChange={(e) => setAcademicForm({ ...academicForm, level_id: e.target.value })}>
                      <option value="">-- Sélectionner un niveau --</option>
                      {levels.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Programme associé</label>
                    <select className="input-field" value={academicForm.program_id} onChange={(e) => setAcademicForm({ ...academicForm, program_id: e.target.value })}>
                      <option value="">-- Aucun programme spécifique --</option>
                      {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Type d'inscription</label>
                    <select className="input-field" value={academicForm.enrollment_type} onChange={(e) => setAcademicForm({ ...academicForm, enrollment_type: e.target.value as any })}>
                      <option value="inscription">Première Inscription</option>
                      <option value="reinscription">Réinscription annuelle</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: TUITION FEES AND BOOKLET PACKS */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-slide-in">
                <h4 className="text-base font-semibold text-gray-900">Grille financière & Équipement pédagogique</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: tuition fee structure */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="font-semibold text-gray-700">Frais académiques standard</h5>
                      <Badge color="ibr">Total standard: {formatFCFA(baseFeesTotal)}</Badge>
                    </div>
                    
                    <div className="border rounded-xl p-4 bg-gray-50/50 space-y-2">
                      {levelFeeStructures.map((f) => (
                        <div key={f.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                          <span className="text-gray-600">{f.fee_category?.name}</span>
                          <span className="font-semibold text-gray-900">{formatFCFA(f.amount)}</span>
                        </div>
                      ))}
                      {levelFeeStructures.length === 0 && <p className="text-xs text-gray-400">Aucun frais configuré pour ce niveau.</p>}
                    </div>

                    <div>
                      <label className="label-field">Accorder une réduction de scolarité (Optionnel)</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" className="input-field max-w-[200px]" value={discountAmount} onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))} />
                        <span className="text-sm font-semibold text-gray-500">FCFA</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: booklets selection */}
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-700">Fascicules et manuels scolaires</h5>
                    <div className="border rounded-xl p-4 max-h-60 overflow-y-auto bg-white space-y-2">
                      {bookletsList.map((b) => (
                        <label key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-50">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedBookletIds.includes(b.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBookletIds((prev) => [...prev, b.id]);
                                } else {
                                  setSelectedBookletIds((prev) => prev.filter((id) => id !== b.id));
                                }
                              }}
                              className="rounded text-ibr-600 focus:ring-ibr-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                              <p className="text-xs text-gray-400 font-mono">Code: {b.code} {b.is_mandatory && '| Obligatoire'}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-700">{formatFCFA(b.unit_price)}</span>
                        </label>
                      ))}
                      {bookletsList.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Aucun fascicule disponible pour ce niveau.</p>}
                    </div>
                  </div>
                </div>

                <Card className="p-4 bg-ibr-50/30 border border-ibr-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total net à payer</p>
                    <p className="text-xs text-gray-400">Standard ({formatFCFA(baseFeesTotal)}) + Fascicules ({formatFCFA(selectedBookletsPrice)}) - Réduction ({formatFCFA(discountAmount)})</p>
                  </div>
                  <p className="text-xl font-bold text-ibr-900">{formatFCFA(finalTotalDue)}</p>
                </Card>
              </div>
            )}

            {/* STEP 4: INITIAL PAYMENT */}
            {wizardStep === 4 && (
              <div className="space-y-4 animate-slide-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-gray-900">Paiement initial (Optionnel)</h4>
                  <label className="flex items-center gap-2 cursor-pointer bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 text-green-900 font-semibold text-xs">
                    <input type="checkbox" checked={recordInitialPayment} onChange={(e) => setRecordInitialPayment(e.target.checked)} className="rounded text-green-600 focus:ring-green-500" />
                    Enregistrer un versement dès aujourd'hui
                  </label>
                </div>

                {recordInitialPayment && (
                  <div className="card p-5 bg-gray-50/50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label-field">Montant versé (FCFA) *</label>
                        <input type="number" className="input-field" value={paymentForm.amount} onChange={(e) => setFormPayment({ ...paymentForm, amount: e.target.value })} placeholder="0" />
                      </div>
                      <div>
                        <label className="label-field">Moyen de paiement</label>
                        <select className="input-field" value={paymentForm.payment_method} onChange={(e) => setFormPayment({ ...paymentForm, payment_method: e.target.value })}>
                          <option value="especes">Espèces / Caisse</option>
                          <option value="virement">Virement bancaire</option>
                          <option value="depot_bancaire">Dépôt sur compte</option>
                          <option value="mobile_money">Mobile Money (Wave/Orange/MTN)</option>
                          <option value="cheque">Chèque</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label-field">Référence de transaction (N° chèque, ID Wave...)</label>
                      <input className="input-field" value={paymentForm.transaction_reference} onChange={(e) => setFormPayment({ ...paymentForm, transaction_reference: e.target.value })} placeholder="Ex: TX-908123" />
                    </div>
                    <div>
                      <label className="label-field">Observations</label>
                      <input className="input-field" value={paymentForm.observation} onChange={(e) => setFormPayment({ ...paymentForm, observation: e.target.value })} placeholder="Renseignements supplémentaires..." />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: SUMMARY & VALIDATION */}
            {wizardStep === 5 && (
              <div className="space-y-4 animate-slide-in">
                <h4 className="text-base font-semibold text-gray-900">Résumé et confirmation</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Left column: Student identity */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <UserCheck className="w-5 h-5 text-ibr-600" />
                      <h5 className="font-semibold text-gray-800">Profil de l'étudiant</h5>
                    </div>
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Étudiant :</dt><dd className="font-bold">{isNewStudent ? `${newStudentForm.last_name} ${newStudentForm.first_name}` : selectedStudent ? fullName(selectedStudent.last_name, selectedStudent.first_name) : ''}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Origine dossier :</dt><dd className="font-semibold text-ibr-700">{isNewStudent ? 'Nouveau dossier' : 'Dossier existant'}</dd></div>
                      {!isNewStudent && selectedStudent && (
                        <div className="flex justify-between"><dt className="text-gray-500">N° permanent :</dt><dd className="font-mono">{selectedStudent.student_number ?? 'Non défini'}</dd></div>
                      )}
                    </dl>

                    <div className="flex items-center gap-2 border-b pb-2 mt-4">
                      <School className="w-5 h-5 text-ibr-600" />
                      <h5 className="font-semibold text-gray-800">Affectation académique</h5>
                    </div>
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Année académique :</dt><dd className="font-bold">{year?.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Niveau d'accueil :</dt><dd className="font-bold text-gray-900">{levels.find((l) => l.id === academicForm.level_id)?.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Type d'inscription :</dt><dd className="font-semibold">{academicForm.enrollment_type === 'inscription' ? 'Inscription' : 'Réinscription'}</dd></div>
                    </dl>
                  </div>

                  {/* Right column: Financial breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <DollarSign className="w-5 h-5 text-ibr-600" />
                      <h5 className="font-semibold text-gray-800">Situation financière d'accueil</h5>
                    </div>
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Frais académiques standard :</dt><dd className="font-semibold">{formatFCFA(baseFeesTotal)}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Fascicules & Manuels :</dt><dd className="font-semibold text-gray-900">{formatFCFA(selectedBookletsPrice)}</dd></div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between"><dt className="text-gray-500">Réduction accordée :</dt><dd className="font-semibold text-red-600">- {formatFCFA(discountAmount)}</dd></div>
                      )}
                      <div className="flex justify-between border-t pt-2"><dt className="text-gray-700 font-bold">Total net à payer :</dt><dd className="font-bold text-base text-ibr-900">{formatFCFA(finalTotalDue)}</dd></div>
                    </dl>

                    {recordInitialPayment && paymentForm.amount && (
                      <div className="mt-4 p-3 bg-green-50/50 border border-green-100 rounded-xl space-y-1 text-sm">
                        <div className="flex justify-between font-semibold text-green-900">
                          <span>Premier versement :</span>
                          <span>{formatFCFA(parseFloat(paymentForm.amount))}</span>
                        </div>
                        <div className="flex justify-between text-xs text-green-700">
                          <span>Moyen : {paymentForm.payment_method}</span>
                          {paymentForm.transaction_reference && <span>Réf: {paymentForm.transaction_reference}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-xs flex gap-2.5 items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    En confirmant, le système va générer le dossier d'inscription, créer le compte financier d'échéances et allouer automatiquement le premier versement s'il est spécifié. Une carte d'étudiant avec code QR sera également initialisée pour l'année courante.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action buttons */}
          <div className="flex justify-between border-t border-gray-200 pt-4 mt-4">
            <button className="btn-secondary flex items-center gap-1.5" onClick={handleBack} disabled={wizardStep === 1 || loading}>
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            
            {wizardStep < 5 ? (
              <button className="btn-primary flex items-center gap-1.5" onClick={handleNext} disabled={loading}>
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button className="btn-primary flex items-center gap-1.5" onClick={handleFinish} disabled={loading}>
                {loading ? 'Traitement...' : 'Valider l\'inscription'} <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
