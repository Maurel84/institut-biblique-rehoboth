import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCurrentAcademicYear, useLevels, useRoles, useToast, useSettings } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Modal, Select, EmptyState } from '../components/ui';
import { fullName, formatDate, formatFCFA, CARD_STATUS_LABELS, ACADEMIC_STATUS_LABELS } from '../lib/utils';
import type { StudentCard, UserProfile } from '../types';
import {
  Plus, CreditCard as IdCardIcon, Users, Shield, Settings,
  FileBarChart, FileText, BookOpen, Printer, AlertTriangle, CheckCircle, RefreshCw, Eye, Edit
} from 'lucide-react';

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
    if (!student) return;

    let finalPhotoUrl = student.photo_url;

    // Verify if photo exists, if not, require photo upload
    if (!finalPhotoUrl && !photoFile) {
      show('La photo est obligatoire pour générer la carte d\'étudiant.', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const filePath = `${student.id}-${Math.random()}.${fileExt}`;
        
        // Upload photo to supabase storage bucket
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(filePath, photoFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw new Error("Téléversement photo échoué: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('student-photos')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;

        // Update student photo url in database
        const { error: updateErr } = await supabase
          .from('students')
          .update({ photo_url: finalPhotoUrl })
          .eq('id', student.id);

        if (updateErr) throw new Error("Mise à jour profil étudiant échouée: " + updateErr.message);

        // Sync local state
        student.photo_url = finalPhotoUrl;
      }

      const cardNumber = `IBR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const checkUrl = `${window.location.origin}/check-card/${student.id}`;

      const { error } = await supabase.from('student_cards').insert({
        card_number: cardNumber, student_id: form.student_id, academic_year_id: year.id,
        level_id: student.current_level_id ?? null,
        qr_code_data: checkUrl, issue_date: new Date().toISOString().split('T')[0],
        expiry_date: year.end_date, status: 'generated',
      });

      if (error) throw new Error(error.message);

      show('Carte générée avec succès', 'success');
      setShowModal(false);
      setForm({ student_id: '', level_id: '' });
      setPhotoFile(null);
      load();
    } catch (err: any) {
      show(err.message || 'Erreur lors de la génération', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function updateCardStatus(cardId: string, status: string) {
    const updates: any = { status };
    if (status === 'printed') updates.printed_at = new Date().toISOString();
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();
    await supabase.from('student_cards').update(updates).eq('id', cardId);
    load();
    show('Statut de la carte mis à jour', 'success');
  }

  // Impression de la carte Recto-Verso
  function printStudentCard(c: any) {
    const checkUrl = c.qr_code_data || `${window.location.origin}/check-card/${c.student?.id}`;
    const html = `
      <html>
        <head>
          <title>Carte d'étudiant - ${fullName(c.student?.last_name, c.student?.first_name)}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: white; }
              .no-print { display: none; }
            }
            body { font-family: 'Outfit', sans-serif; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px; }
            .card-container { display: flex; gap: 40px; }
            .id-card { width: 325px; height: 204px; border: 1px solid #1e40af; border-radius: 12px; position: relative; overflow: hidden; box-sizing: border-box; background: white; }
            .header { background: #1e40af; color: white; padding: 10px; display: flex; align-items: center; gap: 8px; }
            .logo { font-weight: 800; font-size: 14px; letter-spacing: 1px; }
            .tagline { font-size: 8px; opacity: 0.8; }
            .content { display: flex; padding: 10px; gap: 10px; }
            .photo-box { width: 70px; height: 90px; border: 2px solid #1e40af; background: #f0f4ff; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #1e40af; font-weight: bold; overflow: hidden; }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            .details { font-size: 11px; color: #1e293b; display: flex; flex-direction: column; gap: 4px; justify-content: center; }
            .details .name { font-weight: bold; font-size: 13px; color: #0f172a; text-transform: uppercase; }
            .details .matricule { font-family: monospace; font-weight: bold; color: #1e40af; }
            .footer-card { background: #f8fafc; border-top: 1px solid #e2e8f0; position: absolute; bottom: 0; width: 100%; padding: 6px 10px; font-size: 9px; color: #64748b; font-weight: 600; display: flex; justify-content: space-between; box-sizing: border-box; }
            
            /* Card Back (Verso) */
            .id-card.back { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 10px; background: #faf9f6; }
            .back-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
            .back-logo { width: 32px; height: 32px; border-radius: 6px; object-fit: contain; border: 1px solid #e2e8f0; background: white; }
            .back-title { font-weight: 800; font-size: 11px; color: #1e40af; text-align: left; line-height: 1.2; letter-spacing: 0.5px; }
            .back-subtitle { font-size: 8px; color: #64748b; font-weight: bold; display: block; }
            .back-content { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; box-sizing: border-box; padding: 0 10px; }
            .qr-code { width: 62px; height: 62px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; background: #fff; padding: 2px; border-radius: 4px; }
            .qr-code img { width: 100%; height: 100%; }
            .rules { font-size: 7px; color: #475569; text-align: left; line-height: 1.3; max-width: 190px; }
            .signature { font-size: 8px; font-weight: 800; margin-top: 8px; color: #1e40af; border-top: 1px dashed #cbd5e1; pt: 4px; text-align: left; }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #1e40af; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px;">Imprimer les cartes (Recto / Verso)</button>
          
          <div class="card-container">
            <!-- RECTO (Front) -->
            <div class="id-card">
              <div class="header">
                <div>
                  <div class="logo">INSTITUT BIBLIQUE REHOBOTH</div>
                  <div class="tagline">Bonoua, Côte d'Ivoire | Tel: +225 07000000</div>
                </div>
              </div>
              <div class="content">
                <div class="photo-box">
                  ${c.student?.photo_url ? `<img src="${c.student.photo_url}" />` : 'IBR'}
                </div>
                <div class="details">
                  <div class="name">${fullName(c.student?.last_name, c.student?.first_name)}</div>
                  <div>Matricule: <span class="matricule">${c.student?.matricule ?? '-'}</span></div>
                  <div>Niveau: <strong>${c.level?.name ?? '-'}</strong></div>
                  <div>Année Académique: <strong>${year?.name ?? ''}</strong></div>
                </div>
              </div>
              <div class="footer-card">
                <span>CARTE D'ÉTUDIANT</span>
                <span>Valide jusqu'au: ${formatDate(c.expiry_date)}</span>
              </div>
            </div>
            
            <!-- VERSO (Back) -->
            <div class="id-card back">
              <div class="back-header">
                <img src="/Logo_IBR.jpeg" class="back-logo" />
                <div class="back-title">
                  INSTITUT BIBLIQUE REHOBOTH
                  <span class="back-subtitle">COTONOU, BÉNIN</span>
                </div>
              </div>
              <div class="back-content">
                <div class="qr-code">
                  <img src="https://chart.googleapis.com/chart?chs=80x80&cht=qr&chl=${encodeURIComponent(checkUrl)}&choe=UTF-8" />
                </div>
                <div>
                  <div class="rules">
                    Cette carte est strictement personnelle et valide la qualité d'étudiant inscrit à l'Institut Rehoboth. Le scan du code QR confirme sa validité.
                  </div>
                  <div class="signature">
                    Le Secrétaire Général
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Cartes d'étudiant"
        subtitle={`${cards.length} carte(s) - ${year?.name ?? ''}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Générer une carte</button>}
      />

      {cards.length === 0 ? (
        <Card className="p-8"><EmptyState message="Aucune carte générée. Cliquez sur Générer une carte pour commencer." icon={IdCardIcon} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col justify-between h-56 relative border-t-4 border-ibr-700 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-gray-500 font-bold">{c.card_number}</span>
                  <Badge color={c.status === 'delivered' ? 'green' : c.status === 'generated' ? 'gold' : 'gray'}>
                    {CARD_STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-ibr-100 flex items-center justify-center text-ibr-700 font-bold text-base shadow-inner">
                    {c.student?.first_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{c.student ? fullName(c.student.last_name, c.student.first_name) : '-'}</p>
                    <p className="text-xs text-gray-400 font-semibold font-mono">{c.student?.matricule ?? '-'}</p>
                  </div>
                </div>
                <div className="text-xs space-y-1 mb-3">
                  <div className="flex justify-between"><span className="text-gray-500 font-medium">Niveau</span><span className="font-semibold text-gray-800">{c.level?.name ?? '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-medium">Émission</span><span className="text-gray-800">{formatDate(c.issue_date)}</span></div>
                </div>
              </div>
              <div className="flex gap-1.5 border-t pt-3 mt-2">
                <button className="btn-secondary py-1 text-xs px-2 flex items-center gap-1" onClick={() => printStudentCard(c)}>
                  <Printer className="w-3.5 h-3.5" /> Imprimer
                </button>
                {c.status === 'generated' && <button className="btn-primary py-1 text-xs px-2 flex-1" onClick={() => updateCardStatus(c.id, 'printed')}>Marquer imprimée</button>}
                {c.status === 'printed' && <button className="btn-primary py-1 text-xs px-2 flex-1" onClick={() => updateCardStatus(c.id, 'delivered')}>Marquer remise</button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setPhotoFile(null); }} title="Générer une carte d'étudiant">
        <div className="space-y-4">
          <div>
            <label className="label-field">Étudiant *</label>
            <select className="input-field" value={form.student_id} onChange={(e) => { setForm({ ...form, student_id: e.target.value }); setPhotoFile(null); }}>
              <option value="">-- Sélectionner l'étudiant --</option>
              {students.map((s) => <option key={s.id} value={s.id}>{fullName(s.last_name, s.first_name)} ({s.matricule ?? 'sans matricule'})</option>)}
            </select>
          </div>

          {form.student_id && (() => {
            const student = students.find((s) => s.id === form.student_id);
            const hasPhoto = !!student?.photo_url;
            return (
              <div className="p-3.5 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500 overflow-hidden font-bold">
                    {hasPhoto ? <img src={student.photo_url} className="w-full h-full object-cover" /> : 'SANS PHOTO'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{student ? fullName(student.last_name, student.first_name) : ''}</h4>
                    <p className="text-xs text-gray-500">Matricule: {student?.matricule ?? 'N/A'}</p>
                  </div>
                </div>

                {!hasPhoto && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-4 h-4" /> Photo obligatoire pour la génération de la carte :
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPhotoFile(file);
                      }}
                      className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-ibr-50 file:text-ibr-700 hover:file:bg-ibr-100 cursor-pointer w-full"
                    />
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => { setShowModal(false); setPhotoFile(null); }} disabled={uploadingPhoto}>Annuler</button>
            <button className="btn-primary" onClick={generateCard} disabled={uploadingPhoto}>
              {uploadingPhoto ? 'Envoi & Génération...' : 'Générer la carte'}
            </button>
          </div>
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
    <div className="animate-slide-in">
      <PageHeader title="Utilisateurs" subtitle={`${users.length} utilisateur(s)`} />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Nom complet</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Rôle d'accès</th>
              <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Statut</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Dernière connexion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="table-row-hover">
                <td className="px-5 py-3.5">
                  <p className="font-bold text-gray-900">{fullName(u.last_name, u.first_name)}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{u.user_id?.slice(0, 8)}...</p>
                </td>
                <td className="px-5 py-3.5">
                  <select
                    className="input-field text-sm max-w-[200px]"
                    value={u.role_id ?? ''}
                    onChange={(e) => updateRole(u.user_id, e.target.value)}
                    disabled={u.user_id === profile?.user_id}
                  >
                    <option value="">Aucun rôle</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button onClick={() => toggleActive(u.user_id, u.is_active)}>
                    <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Actif' : 'Inactif'}</Badge>
                  </button>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{formatDate(u.last_login)}</td>
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
    <div className="animate-slide-in">
      <PageHeader title="Rôles et permissions" subtitle="Gestion des rôles système" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((r) => (
          <Card key={r.id} className="p-5 flex flex-col justify-between h-40">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-ibr-600" />
                <h3 className="font-semibold text-gray-900">{r.label}</h3>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{r.description}</p>
            </div>
            {r.is_system && <Badge color="gold" className="w-fit mt-3">Rôle système</Badge>}
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
    <div className="animate-slide-in space-y-6">
      <PageHeader title="Paramètres" subtitle="Configuration générale" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4">Informations de l'institut</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-field">Nom complet</label><input className="input-field" value={institute.name} onChange={(e) => setInstitute({ ...institute, name: e.target.value })} /></div>
            <div><label className="label-field">Sigle</label><input className="input-field" value={institute.short_name} onChange={(e) => setInstitute({ ...institute, short_name: e.target.value })} /></div>
            <div><label className="label-field">Adresse</label><input className="input-field" value={institute.address} onChange={(e) => setInstitute({ ...institute, address: e.target.value })} /></div>
            <div><label className="label-field">Téléphone</label><input className="input-field" value={institute.phone} onChange={(e) => setInstitute({ ...institute, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label-field">Directeur</label><input className="input-field" value={institute.director} onChange={(e) => setInstitute({ ...institute, director: e.target.value })} /></div>
          </div>
          <button className="btn-primary mt-4" onClick={saveInstitute}>Enregistrer</button>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4">Configuration des matricules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-field">Sigle de l'institut</label><input className="input-field" value={matricule.institute_code} onChange={(e) => setMatricule({ ...matricule, institute_code: e.target.value })} /></div>
            <div><label className="label-field">Séparateur</label><input className="input-field" value={matricule.separator} onChange={(e) => setMatricule({ ...matricule, separator: e.target.value })} /></div>
            <div><label className="label-field">Nombre de chiffres</label><input type="number" className="input-field" value={matricule.digits} onChange={(e) => setMatricule({ ...matricule, digits: parseInt(e.target.value) || 4 })} /></div>
            <div><label className="label-field">Numéro de départ</label><input type="number" className="input-field" value={matricule.start_number} onChange={(e) => setMatricule({ ...matricule, start_number: parseInt(e.target.value) || 1 })} /></div>
          </div>
          <button className="btn-primary mt-4" onClick={saveMatricule}>Enregistrer</button>
        </Card>

        <Card className="p-6 sm:col-span-2">
          <h3 className="font-bold text-gray-900 text-base mb-4">Calcul des moyennes & classements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <option value="dense">Dense (ex aequo = rang suivant immédiat)</option>
              </select>
            </div>
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
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setLogs(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in space-y-4">
      <PageHeader title="Journal d'audit" subtitle="Historique complet des actions sensibles" />
      
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Date</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Action</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Entité</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Utilisateur</th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <tr key={l.id} className="table-row-hover">
                  <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">{formatDate(l.created_at)}</td>
                  <td className="px-5 py-3.5 font-bold text-gray-800">{l.action}</td>
                  <td className="px-5 py-3.5 text-gray-600">{l.entity_type}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-500">{l.user_id?.slice(0, 8) ?? '-'}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button className="text-ibr-600 hover:text-ibr-800" onClick={() => setSelectedLog(l)}>
                      <Eye className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && <EmptyState message="Aucune action enregistrée." icon={FileBarChart} />}
      </Card>

      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title="Détail du log d'audit">
        {selectedLog && (
          <div className="space-y-3 text-sm">
            <p><strong>Action :</strong> {selectedLog.action}</p>
            <p><strong>Date :</strong> {formatDate(selectedLog.created_at)}</p>
            <p><strong>Entité :</strong> {selectedLog.entity_type} (ID: {selectedLog.entity_id})</p>
            <p><strong>Utilisateur :</strong> {selectedLog.user_id}</p>
            <div>
              <p className="font-bold mb-1">Nouvelles valeurs :</p>
              <pre className="bg-gray-50 p-3 rounded-xl text-xs font-mono max-h-48 overflow-y-auto border border-gray-100">
                {JSON.stringify(selectedLog.new_values, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================================
// DOCUMENTS PAGE (TRANSCRIPTS & CLASS GENERAL SHEETS)
// ============================================================================
export function DocumentsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [selectedLevel, setSelectedLevel] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const { show } = useToast();

  const docTypes = [
    { label: 'Relevé général de classe (Paysage)', icon: FileText, type: 'general_grades' },
    { label: "Procès-verbal de délibération", icon: FileText, type: 'pv' },
  ];

  useEffect(() => {
    if (selectedLevel && year) {
      supabase.from('enrollments')
        .select('student:students(*)')
        .eq('academic_year_id', year.id)
        .eq('level_id', selectedLevel)
        .eq('status', 'validated')
        .then(({ data }) => {
          const list = (data ?? []).map((e: any) => e.student).filter(Boolean);
          list.sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));
          setStudents(list);
        });
    } else {
      setStudents([]);
    }
  }, [selectedLevel, year]);

  // Génération du relevé de notes individuel (CR80/A4 format)
  async function generateIndividualTranscript(studentId: string) {
    if (!year || !selectedLevel) return;

    // Load subjects, student details and grades
    const [subjsRes, studRes, gradesRes] = await Promise.all([
      supabase.from('subjects').select('*, module:modules(*)').eq('academic_year_id', year.id).eq('level_id', selectedLevel).order('order_index'),
      supabase.from('students').select('*').eq('id', studentId).maybeSingle(),
      supabase.from('grades').select('*').eq('academic_year_id', year.id).eq('student_id', studentId),
    ]);

    const student = studRes.data;
    const subjects = subjsRes.data ?? [];
    const grades = gradesRes.data ?? [];

    if (!student) { show('Étudiant introuvable', 'error'); return; }

    let totalPoints = 0;
    let totalCoefs = 0;
    let counted = 0;
    
    const rowsHtml = subjects.map((sub) => {
      const g = grades.find((x) => x.subject_id === sub.id);
      const isEx = g?.is_exempted;
      const isAb = g?.is_absent;
      const score = g?.score;
      const displayScore = isEx ? 'DISP' : isAb ? 'ABS' : score !== null && score !== undefined ? `${score}/100` : '-';
      const coef = isEx ? '-' : sub.coefficient;
      const points = isEx || score === null || score === undefined ? '-' : (isAb ? 0 : score * sub.coefficient);

      if (!isEx && score !== null && score !== undefined) {
        totalPoints += isAb ? 0 : (score * sub.coefficient);
        totalCoefs += sub.coefficient;
        counted++;
      }

      return `
        <tr>
          <td>${sub.code}</td>
          <td>${sub.name}</td>
          <td>${sub.module?.name ?? '-'}</td>
          <td style="text-align: center;">${coef}</td>
          <td style="text-align: center; font-weight: bold;">${displayScore}</td>
          <td style="text-align: center;">${points}</td>
        </tr>
      `;
    }).join('');

    const average = totalCoefs > 0 ? (totalPoints / totalCoefs) : 0;
    const validationUrl = `${window.location.origin}/check-card/${student.id}`;

    const html = `
      <html>
        <head>
          <title>Relevé de notes - ${fullName(student.last_name, student.first_name)}</title>
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #1e293b; background: white; }
            .header-table { width: 100%; margin-bottom: 30px; border-bottom: 2px solid #1e40af; pb: 10px; }
            .title { text-align: center; color: #1e40af; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
            .student-info { margin-bottom: 25px; font-size: 14px; line-height: 1.5; }
            table.grades { width: 100%; border-collapse: collapse; margin-top: 15px; }
            table.grades th, table.grades td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            table.grades th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
            .totals { margin-top: 25px; float: right; width: 300px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
            .totals-row { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0; }
            .totals-row:last-child { border: 0; background: #f8fafc; font-weight: bold; color: #1e40af; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-between; font-size: 14px; }
            .signature-box { text-align: center; width: 220px; }
            .qr-code { float: left; margin-top: 25px; text-align: center; font-size: 10px; color: #64748b; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #1e40af; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px;">Imprimer le relevé</button>
          
          <table class="header-table">
            <tr>
              <td>
                <div style="font-weight: 800; font-size: 18px; color: #1e40af;">INSTITUT BIBLIQUE REHOBOTH</div>
                <div style="font-size: 11px; color: #64748b;">Bonoua, Côte d'Ivoire | Tel: +225 07000000</div>
              </td>
              <td style="text-align: right;">
                <div class="title">RELEVÉ DE NOTES</div>
                <div style="font-size: 12px; font-weight: 600; color: #475569;">Année Académique: ${year?.name}</div>
              </td>
            </tr>
          </table>

          <div class="student-info">
            <table style="width: 100%;">
              <tr>
                <td>Nom et Prénoms: <strong>${fullName(student.last_name, student.first_name)}</strong></td>
                <td>N° Permanent: <strong>${student.student_number ?? '-'}</strong></td>
              </tr>
              <tr>
                <td>Niveau d'études: <strong>${levels.find(l=>l.id===selectedLevel)?.name}</strong></td>
                <td>Matricule Annuel: <strong>${student.matricule ?? '-'}</strong></td>
              </tr>
            </table>
          </div>

          <table class="grades">
            <thead>
              <tr>
                <th>Code</th>
                <th>Matière</th>
                <th>Module</th>
                <th style="text-align: center;">Coef.</th>
                <th style="text-align: center;">Note /100</th>
                <th style="text-align: center;">Points</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="qr-code">
            <img src="https://chart.googleapis.com/chart?chs=80x80&cht=qr&chl=${encodeURIComponent(validationUrl)}&choe=UTF-8" /><br/>
            <span>Scanner pour vérifier</span>
          </div>

          <div class="totals">
            <div class="totals-row"><span>Total des coefficients :</span><span>${totalCoefs}</span></div>
            <div class="totals-row"><span>Total des points obtenus :</span><span>${totalPoints}</span></div>
            <div class="totals-row"><span>Moyenne Générale :</span><span>${average.toFixed(2)} / 100</span></div>
          </div>

          <div style="clear: both;"></div>

          <div class="signatures">
            <div class="signature-box">
              <p>Le Directeur Académique</p>
              <div style="height: 60px;"></div>
              <p>Jacques GOME</p>
            </div>
            <div class="signature-box">
              <p>Le Secrétaire Général</p>
              <div style="height: 60px;"></div>
              <p>Honoré ASSAMOI</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  // Génération du relevé général de classe (Paysage)
  async function generateClassGrid() {
    if (!year || !selectedLevel) return;
    
    // Load subjects and students
    const [subjsRes, gradesRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('academic_year_id', year.id).eq('level_id', selectedLevel).order('order_index'),
      supabase.from('grades').select('*').eq('academic_year_id', year.id).eq('level_id', selectedLevel),
    ]);

    const subjects = subjsRes.data ?? [];
    const allGrades = gradesRes.data ?? [];
    const levelObj = levels.find((l) => l.id === selectedLevel);

    const tableHeaders = subjects.map((sub) => `
      <th style="font-size: 9px; text-align: center; min-width: 60px;">${sub.code}<br/><span style="font-weight: normal;">(x${sub.coefficient})</span></th>
    `).join('');

    const tableRows = students.map((s, idx) => {
      let totalPoints = 0;
      let totalCoefs = 0;

      const subjectCells = subjects.map((sub) => {
        const g = allGrades.find((x) => x.student_id === s.id && x.subject_id === sub.id);
        const isEx = g?.is_exempted;
        const isAb = g?.is_absent;
        const score = g?.score;
        const scoreVal = isAb ? 0 : (score ?? 0);

        if (!isEx && score !== null && score !== undefined) {
          totalPoints += scoreVal * sub.coefficient;
          totalCoefs += sub.coefficient;
        }

        const displayScore = isEx ? 'DISP' : isAb ? 'ABS' : score !== null && score !== undefined ? score.toString() : '-';
        return `<td style="text-align: center; font-size: 11px;">${displayScore}</td>`;
      }).join('');

      const avg = totalCoefs > 0 ? (totalPoints / totalCoefs) : 0;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${fullName(s.last_name, s.first_name)}</strong></td>
          <td style="font-family: monospace;">${s.matricule ?? '-'}</td>
          ${subjectCells}
          <td style="text-align: center; font-weight: bold; background: #f8fafc; color: #1e40af;">${avg.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Relevé général de classe - ${levelObj?.name}</title>
          <style>
            @media print {
              @page { size: landscape; margin: 1cm; }
              body { font-size: 10pt; }
              .no-print { display: none; }
            }
            body { font-family: 'Outfit', sans-serif; padding: 20px; color: #1e293b; background: white; }
            .header { border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #1e40af; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px;">Imprimer le relevé général (Paysage)</button>
          
          <div class="header">
            <div>
              <div style="font-weight: bold; font-size: 16px; color: #1e40af;">INSTITUT BIBLIQUE REHOBOTH</div>
              <div style="font-size: 10px; color: #64748b;">Bonoua, Côte d'Ivoire</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; font-size: 16px; color: #1e40af;">GRILLE GÉNÉRALE DES NOTES (PAYSAGE)</div>
              <div style="font-size: 11px; font-weight: 600; color: #475569;">Niveau: ${levelObj?.name} | Année Académique: ${year?.name}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">N°</th>
                <th>Nom et Prénoms</th>
                <th>Matricule</th>
                ${tableHeaders}
                <th style="text-align: center; background: #f1f5f9; color: #1e40af;">Moyenne</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="animate-slide-in space-y-6">
      <PageHeader title="Documents administratifs" subtitle="Génération et édition de relevés officiels" />

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 text-base mb-4">Génération de documents de classe</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="label-field">Niveau académique *</label>
            <Select value={selectedLevel} onChange={setSelectedLevel} placeholder="Sélectionner..." options={levels.map((l) => ({ value: l.id, label: l.name }))} />
          </div>
          <button className="btn-primary" onClick={generateClassGrid} disabled={!selectedLevel}>
            Générer le relevé général (Paysage)
          </button>
        </div>
      </Card>

      {students.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4">Édition des relevés de notes individuels</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Nom complet</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Matricule</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-semibold">Impression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3 font-semibold text-gray-900">{fullName(s.last_name, s.first_name)}</td>
                    <td className="px-4 py-3 font-semibold font-mono text-gray-500">{s.matricule ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button className="btn-secondary py-1 px-3 text-xs flex items-center gap-1.5 mx-auto" onClick={() => generateIndividualTranscript(s.id)}>
                        <Printer className="w-3.5 h-3.5" /> Relevé individuel
                      </button>
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

// ============================================================================
// CENTRE DE CONTRÔLE DES ANOMALIES DE DONNÉES
// ============================================================================
export function ArchivesPage() {
  const { year } = useCurrentAcademicYear();
  const [anomalies, setAnomalies] = useState<{
    studentsNoMatricule: any[];
    studentsDuplicateMatricule: any[];
    gradesOutOfRange: any[];
    bookletsLowStock: any[];
    cardsNoPhoto: any[];
  }>({
    studentsNoMatricule: [],
    studentsDuplicateMatricule: [],
    gradesOutOfRange: [],
    bookletsLowStock: [],
    cardsNoPhoto: [],
  });

  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  const scanForAnomalies = useCallback(async () => {
    setLoading(true);
    
    // 1. Students without matricule
    const { data: noMat } = await supabase.from('students').select('*').is('deleted_at', null).is('matricule', null);
    
    // 2. Duplicate matricules
    const { data: duplicates } = await supabase.rpc('check_duplicate_matricules');
    
    // 3. Grades out of range (< 0 or > 20)
    const { data: gradesOut } = await supabase.from('grades').select('*, student:students(*), subject:subjects(*)').or('score.lt.0,score.gt.20');
    
    // 4. Booklet low stock (below threshold)
    const { data: bookletsLow } = await supabase.from('training_booklets').select('*').eq('is_active', true).expr('stock_quantity <= min_stock_threshold' as any);
    const filteredLow = bookletsLow ? bookletsLow.filter((b: any) => b.stock_quantity <= b.min_stock_threshold) : [];

    // 5. Cards without photo URL
    const { data: noPhoto } = await supabase.from('students').select('*').is('deleted_at', null).is('photo_url', null);

    setAnomalies({
      studentsNoMatricule: noMat ?? [],
      studentsDuplicateMatricule: duplicates ?? [],
      gradesOutOfRange: gradesOut ?? [],
      bookletsLowStock: filteredLow ?? [],
      cardsNoPhoto: noPhoto ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    scanForAnomalies();
  }, [scanForAnomalies]);

  if (loading) return <LoadingSpinner label="Analyse complète de la base de données..." />;

  const totalAnomalies = Object.values(anomalies).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="animate-slide-in space-y-6">
      <PageHeader
        title="Centre de contrôle des anomalies"
        subtitle="Vérification en direct de la conformité des données académiques et de stock"
        actions={
          <button className="btn-secondary flex items-center gap-1.5 text-xs py-2" onClick={scanForAnomalies}>
            <RefreshCw className="w-4 h-4" /> Lancer un diagnostic
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={`p-5 border-l-4 ${totalAnomalies > 0 ? 'border-amber-500' : 'border-green-600'}`}>
          <p className="text-xs text-gray-500 font-semibold uppercase">Total Anomalies</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{totalAnomalies}</p>
        </Card>
        <Card className="p-5 border-l-4 border-ibr-700">
          <p className="text-xs text-gray-500 font-semibold uppercase">Conformité Base</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{totalAnomalies === 0 ? '100%' : 'Ajustements requis'}</p>
        </Card>
      </div>

      <div className="space-y-6">
        {/* SECTION 1: MATRICULES MANQUANTS */}
        {anomalies.studentsNoMatricule.length > 0 && (
          <Card className="p-5 border border-amber-200 bg-amber-50/5">
            <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Étudiants sans matricule académique ({anomalies.studentsNoMatricule.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left font-bold text-gray-500"><th>Nom et Prénom</th><th>N° Permanent</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {anomalies.studentsNoMatricule.map((s) => (
                    <tr key={s.id} className="border-t py-1">
                      <td className="py-2"><strong>{fullName(s.last_name, s.first_name)}</strong></td>
                      <td>{s.student_number ?? 'aucun'}</td>
                      <td><Badge color="gray">{s.academic_status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* SECTION 2: NOTES HORS INTERVALLES */}
        {anomalies.gradesOutOfRange.length > 0 && (
          <Card className="p-5 border border-red-200 bg-red-50/5">
            <h4 className="font-bold text-red-800 text-sm flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-red-600" /> Notes hors intervalle (0 à 20) ({anomalies.gradesOutOfRange.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left font-bold text-gray-500"><th>Étudiant</th><th>Matière</th><th>Note erronée</th></tr>
                </thead>
                <tbody>
                  {anomalies.gradesOutOfRange.map((g) => (
                    <tr key={g.id} className="border-t py-1">
                      <td className="py-2"><strong>{fullName(g.student?.last_name, g.student?.first_name)}</strong></td>
                      <td>{g.subject?.name}</td>
                      <td className="text-red-600 font-bold">{g.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* SECTION 3: STOCKS BAS */}
        {anomalies.bookletsLowStock.length > 0 && (
          <Card className="p-5 border border-amber-200 bg-amber-50/5">
            <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Alerte de stock de fascicules ({anomalies.bookletsLowStock.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left font-bold text-gray-500"><th>Code</th><th>Titre</th><th>Stock actuel</th><th>Seuil d'alerte</th></tr>
                </thead>
                <tbody>
                  {anomalies.bookletsLowStock.map((b) => (
                    <tr key={b.id} className="border-t py-1">
                      <td className="py-2 font-mono font-bold">{b.code}</td>
                      <td>{b.title}</td>
                      <td className="text-red-600 font-bold">{b.stock_quantity}</td>
                      <td>{b.min_stock_threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {totalAnomalies === 0 && (
          <div className="text-center py-12 p-6 bg-green-50/50 rounded-2xl border border-green-100 max-w-md mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h4 className="font-bold text-green-950 text-sm">Félicitations, aucune anomalie détectée !</h4>
            <p className="text-xs text-green-800 mt-1">
              Toutes les lignes de notes, de matricules d'inscription, de stocks de livrets et d'échéances financières sont parfaitement conformes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
