import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCurrentAcademicYear, useLevels, useRoles, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Modal, Select, EmptyState } from '../components/ui';
import { fullName, formatDate, formatFCFA, CARD_STATUS_LABELS, ACADEMIC_STATUS_LABELS } from '../lib/utils';
import type { StudentCard, UserProfile } from '../types';
import { Plus, CreditCard as IdCardIcon, Users, Shield, Settings, FileBarChart, FileText, BookOpen } from 'lucide-react';

// ============================================================================
// STUDENT CARDS PAGE
// ============================================================================
export function CardsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ student_id: '', level_id: '' });
  const { show } = useToast();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    const { data } = await supabase
      .from('student_cards')
      .select('*, student:students(*), level:levels(*)')
      .eq('academic_year_id', year.id)
      .order('created_at', { ascending: false });
    setCards(data ?? []);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('students').select('*').is('deleted_at', null).order('last_name').then(({ data }) => setStudents(data ?? []));
  }, []);

  async function generateCard() {
    if (!form.student_id || !year) { show('Sélectionnez un étudiant', 'error'); return; }
    const student = students.find((s) => s.id === form.student_id);
    const cardNumber = `IBR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const qrData = JSON.stringify({ matricule: student?.matricule, year: year.name, student_id: student?.id });

    const { error } = await supabase.from('student_cards').insert({
      card_number: cardNumber, student_id: form.student_id, academic_year_id: year.id,
      level_id: student?.current_level_id ?? null,
      qr_code_data: qrData, issue_date: new Date().toISOString().split('T')[0],
      expiry_date: year.end_date, status: 'generated',
    });
    if (error) show(error.message, 'error');
    else { show('Carte générée avec succès', 'success'); setShowModal(false); setForm({ student_id: '', level_id: '' }); load(); }
  }

  async function updateCardStatus(cardId: string, status: string) {
    const updates: any = { status };
    if (status === 'printed') updates.printed_at = new Date().toISOString();
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();
    await supabase.from('student_cards').update(updates).eq('id', cardId);
    load();
    show('Statut de la carte mis à jour', 'success');
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Cartes d'étudiant"
        subtitle={`${cards.length} carte(s) - ${year?.name ?? ''}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Générer une carte</button>}
      />

      {cards.length === 0 ? (
        <Card className="p-8"><EmptyState message="Aucune carte générée. Cliquez sur Générer une carte pour commencer." icon={IdCardIcon} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-500">{c.card_number}</span>
                <Badge color={c.status === 'delivered' ? 'green' : c.status === 'generated' ? 'gold' : 'gray'}>
                  {CARD_STATUS_LABELS[c.status] ?? c.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-ibr-100 flex items-center justify-center text-ibr-700 font-bold">
                  {c.student?.first_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{c.student ? fullName(c.student.last_name, c.student.first_name) : '-'}</p>
                  <p className="text-xs text-gray-500">{c.student?.matricule ?? '-'}</p>
                </div>
              </div>
              <div className="text-xs space-y-1 mb-3">
                <div className="flex justify-between"><span className="text-gray-500">Niveau</span><span className="font-medium">{c.level?.name ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Émission</span><span>{formatDate(c.issue_date)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Expiration</span><span>{formatDate(c.expiry_date)}</span></div>
              </div>
              <div className="flex gap-2">
                {c.status === 'generated' && <button className="btn-secondary flex-1 text-xs" onClick={() => updateCardStatus(c.id, 'printed')}>Marquer imprimée</button>}
                {c.status === 'printed' && <button className="btn-secondary flex-1 text-xs" onClick={() => updateCardStatus(c.id, 'delivered')}>Marquer remise</button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Générer une carte d'étudiant">
        <div className="space-y-4">
          <div><label className="label-field">Étudiant *</label>
            <select className="input-field" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">--</option>
              {students.map((s) => <option key={s.id} value={s.id}>{fullName(s.last_name, s.first_name)} ({s.matricule ?? 'sans matricule'})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={generateCard}>Générer</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// USERS PAGE
// ============================================================================
export function UsersPage() {
  const { profile } = useAuth();
  const { roles } = useRoles();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*, role:roles(*)')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateRole(userId: string, roleId: string) {
    const { error } = await supabase.from('user_profiles').update({ role_id: roleId }).eq('user_id', userId);
    if (error) show(error.message, 'error');
    else { show('Rôle mis à jour', 'success'); load(); }
  }

  async function toggleActive(userId: string, current: boolean) {
    await supabase.from('user_profiles').update({ is_active: !current }).eq('user_id', userId);
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle={`${users.length} utilisateur(s)`} />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Dernière connexion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="table-row-hover">
                <td className="px-4 py-3">
                  <p className="font-medium">{fullName(u.last_name, u.first_name)}</p>
                  <p className="text-xs text-gray-500">{u.user_id?.slice(0, 8)}...</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="input-field text-sm"
                    value={u.role_id ?? ''}
                    onChange={(e) => updateRole(u.user_id, e.target.value)}
                    disabled={u.user_id === profile?.user_id}
                  >
                    <option value="">Aucun rôle</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(u.user_id, u.is_active)}>
                    <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Actif' : 'Inactif'}</Badge>
                  </button>
                </td>
                <td className="px-4 py-3">{formatDate(u.last_login)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============================================================================
// ROLES & PERMISSIONS PAGE
// ============================================================================
export function RolesPage() {
  const { roles } = useRoles();

  return (
    <div>
      <PageHeader title="Rôles et permissions" subtitle="Gestion des rôles système" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-ibr-600" />
              <h3 className="font-semibold text-gray-900">{r.label}</h3>
            </div>
            <p className="text-sm text-gray-600">{r.description}</p>
            {r.is_system && <Badge color="gold">Rôle système</Badge>}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS PAGE
// ============================================================================
export function SettingsPage() {
  const { settings, loading, refresh } = useSettings();
  const { show } = useToast();
  const [institute, setInstitute] = useState({ name: '', short_name: '', address: '', phone: '', email: '', director: '' });
  const [matricule, setMatricule] = useState({ institute_code: 'IBR', separator: '/', digits: 4, start_number: 1, allow_manual: false });
  const [grading, setGrading] = useState({ method: 'weighted', round_decimals: 2, use_coefficients: true, ranking_method: 'standard' });

  useEffect(() => {
    if (settings.institute_info) setInstitute(settings.institute_info.value as any);
    if (settings.matricule_config) setMatricule(settings.matricule_config.value as any);
    if (settings.grading_config) setGrading(settings.grading_config.value as any);
  }, [settings]);

  async function saveInstitute() {
    await supabase.from('settings').update({ value: institute as any }).eq('key', 'institute_info');
    show("Informations de l'institut enregistrées", 'success');
    refresh();
  }

  async function saveMatricule() {
    await supabase.from('settings').update({ value: matricule as any }).eq('key', 'matricule_config');
    show('Configuration des matricules enregistrée', 'success');
    refresh();
  }

  async function saveGrading() {
    await supabase.from('settings').update({ value: grading as any }).eq('key', 'grading_config');
    show('Configuration du calcul enregistrée', 'success');
    refresh();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Configuration de l'application" />

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Informations de l'institut</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-field">Nom complet</label><input className="input-field" value={institute.name} onChange={(e) => setInstitute({ ...institute, name: e.target.value })} /></div>
            <div><label className="label-field">Sigle</label><input className="input-field" value={institute.short_name} onChange={(e) => setInstitute({ ...institute, short_name: e.target.value })} /></div>
            <div><label className="label-field">Adresse</label><input className="input-field" value={institute.address} onChange={(e) => setInstitute({ ...institute, address: e.target.value })} /></div>
            <div><label className="label-field">Téléphone</label><input className="input-field" value={institute.phone} onChange={(e) => setInstitute({ ...institute, phone: e.target.value })} /></div>
            <div><label className="label-field">Email</label><input className="input-field" value={institute.email} onChange={(e) => setInstitute({ ...institute, email: e.target.value })} /></div>
            <div><label className="label-field">Directeur</label><input className="input-field" value={institute.director} onChange={(e) => setInstitute({ ...institute, director: e.target.value })} /></div>
          </div>
          <button className="btn-primary mt-4" onClick={saveInstitute}>Enregistrer</button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Configuration des matricules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-field">Sigle de l'institut</label><input className="input-field" value={matricule.institute_code} onChange={(e) => setMatricule({ ...matricule, institute_code: e.target.value })} /></div>
            <div><label className="label-field">Séparateur</label><input className="input-field" value={matricule.separator} onChange={(e) => setMatricule({ ...matricule, separator: e.target.value })} /></div>
            <div><label className="label-field">Nombre de chiffres</label><input type="number" className="input-field" value={matricule.digits} onChange={(e) => setMatricule({ ...matricule, digits: parseInt(e.target.value) || 4 })} /></div>
            <div><label className="label-field">Numéro de départ</label><input type="number" className="input-field" value={matricule.start_number} onChange={(e) => setMatricule({ ...matricule, start_number: parseInt(e.target.value) || 1 })} /></div>
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={matricule.allow_manual} onChange={(e) => setMatricule({ ...matricule, allow_manual: e.target.checked })} />
              <span className="text-sm font-medium text-gray-700">Autoriser la création manuelle de matricules</span>
            </label>
          </div>
          <button className="btn-primary mt-4" onClick={saveMatricule}>Enregistrer</button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Configuration du calcul des moyennes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-field">Méthode de calcul</label>
              <select className="input-field" value={grading.method} onChange={(e) => setGrading({ ...grading, method: e.target.value })}>
                <option value="simple">Moyenne simple</option>
                <option value="weighted">Moyenne pondérée</option>
              </select>
            </div>
            <div><label className="label-field">Décimales arrondi</label><input type="number" className="input-field" value={grading.round_decimals} onChange={(e) => setGrading({ ...grading, round_decimals: parseInt(e.target.value) || 2 })} /></div>
            <div><label className="label-field">Méthode de classement</label>
              <select className="input-field" value={grading.ranking_method} onChange={(e) => setGrading({ ...grading, ranking_method: e.target.value })}>
                <option value="standard">Standard (ex aequo = même rang)</option>
                <option value="dense">Dense (ex aequo = rang suivant sauté)</option>
              </select>
            </div>
            <div><label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={grading.use_coefficients} onChange={(e) => setGrading({ ...grading, use_coefficients: e.target.checked })} /><span className="text-sm font-medium text-gray-700">Utiliser les coefficients</span></label></div>
          </div>
          <button className="btn-primary mt-4" onClick={saveGrading}>Enregistrer</button>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// AUDIT LOGS PAGE
// ============================================================================
export function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setLogs(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Journal d'audit" subtitle="Historique des actions" />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Entité</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((l) => (
              <tr key={l.id} className="table-row-hover">
                <td className="px-4 py-2 text-xs">{formatDate(l.created_at)}</td>
                <td className="px-4 py-2 font-medium">{l.action}</td>
                <td className="px-4 py-2">{l.entity_type}</td>
                <td className="px-4 py-2 text-gray-500">{l.user_id?.slice(0, 8) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <EmptyState message="Aucune action enregistrée." icon={FileBarChart} />}
      </Card>
    </div>
  );
}

// ============================================================================
// DOCUMENTS PAGE (placeholder with document types)
// ============================================================================
export function DocumentsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [showList, setShowList] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('');

  const docTypes = [
    { label: "Fiche d'inscription", icon: FileText, type: 'inscription' },
    { label: 'Liste de classe', icon: Users, type: 'class_list' },
    { label: "Liste d'émargement", icon: FileText, type: 'attendance' },
    { label: 'Relevé de notes individuel', icon: FileText, type: 'transcript' },
    { label: 'Relevé général de classe', icon: FileText, type: 'general_grades' },
    { label: 'Procès-verbal de délibération', icon: FileText, type: 'pv' },
    { label: 'Liste de classement', icon: FileText, type: 'ranking' },
    { label: 'Attestation de réussite', icon: FileText, type: 'certificate' },
    { label: 'Certificat de scolarité', icon: FileText, type: 'school_cert' },
    { label: 'Bulletin annuel', icon: FileText, type: 'bulletin' },
    { label: 'Palmarès annuel', icon: FileText, type: 'palmares' },
    { label: 'Reçu de paiement', icon: FileText, type: 'receipt' },
    { label: 'Situation financière', icon: FileText, type: 'financial_situation' },
    { label: 'État des impayés', icon: FileText, type: 'unpaid' },
    { label: 'Journal de caisse', icon: FileText, type: 'cash_journal' },
    { label: 'Rapport journalier', icon: FileText, type: 'daily_report' },
    { label: 'Inventaire du stock', icon: FileText, type: 'stock_inventory' },
    { label: 'Rapport des ventes de fascicules', icon: FileText, type: 'booklet_sales' },
  ];

  async function generateClassList(levelId: string) {
    if (!year) return;
    const { data } = await supabase
      .from('enrollments')
      .select('student:students(*)')
      .eq('academic_year_id', year.id)
      .eq('level_id', levelId)
      .eq('status', 'validated');
    const list = (data ?? []).map((e: any) => e.student).filter(Boolean);
    list.sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

    // Generate printable HTML
    const level = levels.find((l) => l.id === levelId);
    const html = `
      <html><head><title>Liste de classe - ${level?.name}</title>
      <style>
        body { font-family: Arial; padding: 40px; }
        h1 { text-align: center; color: #1e40af; }
        h2 { text-align: center; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
      </style></head><body>
      <h1>Institut Biblique Rehoboth</h1>
      <h2>Liste de classe - ${level?.name} - ${year.name}</h2>
      <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom et prénoms</th><th>Sexe</th></tr></thead><tbody>
      ${list.map((s: any, i: number) => `<tr><td>${i + 1}</td><td>${s.matricule ?? '-'}</td><td>${fullName(s.last_name, s.first_name)}</td><td>${s.sex ?? '-'}</td></tr>`).join('')}
      </tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  return (
    <div>
      <PageHeader title="Documents" subtitle="Génération de documents officiels" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docTypes.map((d) => {
          const Icon = d.icon;
          return (
            <Card key={d.type} className="p-5 hover:shadow-md transition-shadow cursor-pointer" >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ibr-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-ibr-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{d.label}</p>
                  <p className="text-xs text-gray-500">Cliquez pour générer</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Générer une liste de classe</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label-field">Niveau</label>
            <Select value={selectedLevel} onChange={setSelectedLevel} placeholder="Sélectionner..." options={levels.map((l) => ({ value: l.id, label: l.name }))} />
          </div>
          <button className="btn-primary" onClick={() => generateClassList(selectedLevel)} disabled={!selectedLevel}>Générer (PDF)</button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// ARCHIVES PAGE
// ============================================================================
export function ArchivesPage() {
  const { year } = useCurrentAcademicYear();
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    supabase.from('academic_years').select('*').order('name', { ascending: false }).then(({ data }) => {
      setYears(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    Promise.all([
      supabase.from('enrollments').select('id').eq('academic_year_id', selectedYear),
      supabase.from('grades').select('id').eq('academic_year_id', selectedYear),
      supabase.from('payments').select('amount').eq('academic_year_id', selectedYear).eq('status', 'paid'),
    ]).then(([e, g, p]) => {
      setStats({
        enrollments: e.data?.length ?? 0,
        grades: g.data?.length ?? 0,
        payments: (p.data ?? []).reduce((s: number, x: any) => s + x.amount, 0),
      });
    });
  }, [selectedYear]);

  return (
    <div>
      <PageHeader title="Archives" subtitle="Consultation des données archivées" />

      <Card className="p-6">
        <div className="flex items-end gap-3 mb-6">
          <div className="flex-1">
            <label className="label-field">Année académique</label>
            <Select value={selectedYear} onChange={setSelectedYear} placeholder="Sélectionner..." options={years.map((y) => ({ value: y.id, label: y.name }))} />
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-gray-50">
              <p className="text-sm text-gray-500">Inscriptions</p>
              <p className="text-2xl font-bold mt-1">{stats.enrollments}</p>
            </Card>
            <Card className="p-4 bg-gray-50">
              <p className="text-sm text-gray-500">Notes enregistrées</p>
              <p className="text-2xl font-bold mt-1">{stats.grades}</p>
            </Card>
            <Card className="p-4 bg-gray-50">
              <p className="text-sm text-gray-500">Paiements encaissés</p>
              <p className="text-2xl font-bold mt-1">{formatFCFA(stats.payments)}</p>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
