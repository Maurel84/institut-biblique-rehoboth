import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentAcademicYear, useLevels, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Modal, Select, EmptyState, SearchInput } from '../components/ui';
import { formatFCFA, fullName, formatDate, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../lib/utils';
import type { FeeCategory, TuitionFeeStructure, Payment, Student } from '../types';
import {
  Plus, CreditCard, Receipt, Package, AlertCircle, TrendingUp, TrendingDown,
  ChevronRight, Check, Trash2, ShieldAlert, ShoppingBag, Truck, ShoppingCart
} from 'lucide-react';

// ============================================================================
// FEE STRUCTURES PAGE
// ============================================================================
export function FeesPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [deletingFee, setDeletingFee] = useState<any>(null);
  const [form, setForm] = useState({ level_id: '', fee_category_id: '', amount: '', number_of_installments: '1' });
  const { show } = useToast();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    const [fcRes, structRes] = await Promise.all([
      supabase.from('fee_categories').select('*').order('order_index'),
      supabase.from('tuition_fee_structures').select('*, level:levels(*), fee_category:fee_categories(*)').eq('academic_year_id', year.id).order('level_id'),
    ]);
    setFeeCategories((fcRes.data as FeeCategory[]) ?? []);
    setStructures(structRes.data ?? []);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.level_id || !form.fee_category_id || !form.amount || !year) { show('Tous les champs obligatoires', 'error'); return; }

    const saveData = {
      academic_year_id: year.id, level_id: form.level_id, fee_category_id: form.fee_category_id,
      amount: parseFloat(form.amount), number_of_installments: parseInt(form.number_of_installments) || 1,
      currency: 'FCFA', is_active: true,
    };

    if (editingFee) {
      const { error } = await supabase.from('tuition_fee_structures').update(saveData).eq('id', editingFee.id);
      if (error) show(error.message, 'error');
      else {
        show('Frais mis à jour', 'success');
        setShowModal(false);
        setEditingFee(null);
        load();
      }
    } else {
      const { error } = await supabase.from('tuition_fee_structures').insert(saveData);
      if (error) show(error.message, 'error');
      else {
        show('Frais scolarité configuré', 'success');
        setShowModal(false);
        setForm({ level_id: '', fee_category_id: '', amount: '', number_of_installments: '1' });
        load();
      }
    }
  }

  async function handleDelete() {
    if (!deletingFee) return;
    const { error } = await supabase.from('tuition_fee_structures').delete().eq('id', deletingFee.id);
    if (error) show(error.message, 'error');
    else {
      show('Frais scolarité supprimé', 'success');
      load();
    }
    setDeletingFee(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Frais de scolarité"
        subtitle={`Grille des frais - ${year?.name ?? ''}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => {
          setEditingFee(null);
          setForm({ level_id: '', fee_category_id: '', amount: '', number_of_installments: '1' });
          setShowModal(true);
        }}><Plus className="w-4 h-4" /> Configurer un frais</button>}
      />

      {levels.map((level) => {
        const levelFees = structures.filter((s) => s.level_id === level.id);
        if (levelFees.length === 0) return null;
        const total = levelFees.reduce((s, f) => s + f.amount, 0);
        return (
          <Card key={level.id} className="p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{level.name}</h3>
              <Badge color="ibr">Total: {formatFCFA(total)}</Badge>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Catégorie</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Montant</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Tranches</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Obligatoire</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {levelFees.map((f) => (
                  <tr key={f.id} className="table-row-hover">
                    <td className="px-3 py-2 font-medium">{f.fee_category?.name}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatFCFA(f.amount)}</td>
                    <td className="px-3 py-2 text-center">{f.number_of_installments}</td>
                    <td className="px-3 py-2 text-center">{f.fee_category?.is_mandatory ? 'Oui' : 'Non'}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-gray-400 hover:text-ibr-700" onClick={() => {
                          setEditingFee(f);
                          setForm({
                            level_id: f.level_id, fee_category_id: f.fee_category_id,
                            amount: f.amount.toString(), number_of_installments: f.number_of_installments.toString()
                          });
                          setShowModal(true);
                        }}>Mod.</button>
                        <button className="text-red-500 hover:text-red-700" onClick={() => setDeletingFee(f)}>Supp.</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}

      {structures.length === 0 && (
        <Card className="p-8"><EmptyState message="Aucune grille de frais configurée. Cliquez sur Configurer un frais pour commencer." icon={CreditCard} /></Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingFee ? "Modifier le frais" : "Configurer un frais"}>
        <div className="space-y-4">
          <div><label className="label-field">Niveau *</label>
            <select className="input-field" value={form.level_id} onChange={(e) => setForm({ ...form, level_id: e.target.value })}>
              <option value="">--</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div><label className="label-field">Catégorie de frais *</label>
            <select className="input-field" value={form.fee_category_id} onChange={(e) => setForm({ ...form, fee_category_id: e.target.value })}>
              <option value="">--</option>
              {feeCategories.map((fc) => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Montant (FCFA) *</label><input type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="label-field">Nombre de tranches</label><input type="number" className="input-field" value={form.number_of_installments} onChange={(e) => setForm({ ...form, number_of_installments: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSave}>Enregistrer</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deletingFee} onClose={() => setDeletingFee(null)} onConfirm={handleDelete} title="Supprimer le frais" message="Êtes-vous sûr de vouloir supprimer cette configuration de scolarité ?" />
    </div>
  );
}

// ============================================================================
// PAYMENTS PAGE
// ============================================================================
export function PaymentsPage() {
  const { year } = useCurrentAcademicYear();
  const { show } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Counter-pass modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingPayment, setCancellingPayment] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState({ student_id: '', amount: '', payment_method: 'especes', transaction_reference: '', observation: '' });
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, student:students(*)')
      .eq('academic_year_id', year.id)
      .order('payment_date', { ascending: false })
      .limit(100);
    setPayments(data ?? []);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('students').select('*').is('deleted_at', null).order('last_name').then(({ data }) => setStudents((data as Student[]) ?? []));
  }, []);

  useEffect(() => {
    if (form.student_id && year) {
      supabase.from('student_fee_accounts')
        .select('*, student_fee_items(*, fee_category:fee_categories(*))')
        .eq('student_id', form.student_id)
        .eq('academic_year_id', year.id)
        .maybeSingle()
        .then(({ data }) => {
          setSelectedAccount(data);
          if (data) {
            supabase.from('payment_schedules')
              .select('*')
              .eq('student_fee_account_id', data.id)
              .order('installment_number')
              .then(({ data: scheds }) => setSelectedSchedules(scheds ?? []));
          } else {
            setSelectedSchedules([]);
          }
        });
    } else {
      setSelectedAccount(null);
      setSelectedSchedules([]);
    }
  }, [form.student_id, year]);

  async function createPayment() {
    if (!form.student_id || !form.amount || !year) { show('Étudiant et montant obligatoires', 'error'); return; }
    const amount = parseFloat(form.amount);
    if (amount <= 0) { show('Le montant doit être positif', 'error'); return; }

    const receiptNum = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Create payment entry
    const { data: payment, error } = await supabase.from('payments').insert({
      student_id: form.student_id, academic_year_id: year.id,
      student_fee_account_id: selectedAccount?.id ?? null,
      amount, payment_method: form.payment_method,
      transaction_reference: form.transaction_reference || null,
      observation: form.observation || null,
      payment_date: new Date().toISOString().split('T')[0],
      receipt_number: receiptNum, status: 'paid',
    }).select().single();

    if (error) { show(error.message, 'error'); return; }

    // Create receipt
    await supabase.from('payment_receipts').insert({
      receipt_number: receiptNum, payment_id: payment.id,
      student_id: form.student_id, amount, payment_method: form.payment_method,
    });

    // Allocate payment FIFO & update schedules
    if (selectedAccount) {
      let remaining = amount;
      for (const item of selectedAccount.student_fee_items ?? []) {
        if (remaining <= 0) break;
        if (item.remaining > 0) {
          const allocation = Math.min(remaining, item.remaining);
          await supabase.from('payment_allocations').insert({
            payment_id: payment.id, student_fee_item_id: item.id, amount: allocation,
          });
          await supabase.from('student_fee_items').update({
            amount_paid: item.amount_paid + allocation,
            remaining: item.remaining - allocation,
          }).eq('id', item.id);
          remaining -= allocation;
        }
      }

      // Update payment schedules tranches
      let scheduleRem = amount;
      for (const s of selectedSchedules) {
        if (scheduleRem <= 0) break;
        const due = s.amount_due - s.amount_paid;
        if (due > 0) {
          const alloc = Math.min(scheduleRem, due);
          const nextPaid = s.amount_paid + alloc;
          await supabase.from('payment_schedules').update({
            amount_paid: nextPaid,
            status: nextPaid >= s.amount_due ? 'paid' : 'partially_paid'
          }).eq('id', s.id);
          scheduleRem -= alloc;
        }
      }

      // Update account totals
      const newPaid = (selectedAccount.total_paid ?? 0) + amount;
      const newRemaining = (selectedAccount.remaining ?? 0) - amount;
      await supabase.from('student_fee_accounts').update({
        total_paid: newPaid, remaining: newRemaining, is_up_to_date: newRemaining <= 0,
      }).eq('id', selectedAccount.id);
    }

    show(`Paiement de ${formatFCFA(amount)} validé. Reçu: ${receiptNum}`, 'success');
    setShowModal(false);
    setForm({ student_id: '', amount: '', payment_method: 'especes', transaction_reference: '', observation: '' });
    load();
  }

  // Annulation par contre-passation
  async function handleCounterPassation() {
    if (!cancellingPayment || !cancelReason.trim() || !year) {
      show('Un motif d\'annulation est obligatoire', 'error');
      return;
    }

    setLoading(true);
    const p = cancellingPayment;

    // 1. Mark original payment as cancelled
    await supabase.from('payments').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: cancelReason,
    }).eq('id', p.id);

    // 2. Insert negative entry (contre-passation)
    const revReceiptNum = `CAN-${p.receipt_number}`;
    await supabase.from('payments').insert({
      student_id: p.student_id,
      academic_year_id: year.id,
      student_fee_account_id: p.student_fee_account_id,
      amount: -p.amount,
      payment_method: p.payment_method,
      observation: `Contre-passation comptable de l'écriture ${p.receipt_number}. Motif: ${cancelReason}`,
      receipt_number: revReceiptNum,
      status: 'cancelled',
      payment_date: new Date().toISOString().split('T')[0],
    });

    // 3. Reverse account items allocations
    if (p.student_fee_account_id) {
      const { data: allocations } = await supabase.from('payment_allocations').select('*').eq('payment_id', p.id);
      for (const alloc of allocations ?? []) {
        const { data: item } = await supabase.from('student_fee_items').select('*').eq('id', alloc.student_fee_item_id).maybeSingle();
        if (item) {
          await supabase.from('student_fee_items').update({
            amount_paid: Math.max(0, item.amount_paid - alloc.amount),
            remaining: item.remaining + alloc.amount,
          }).eq('id', item.id);
        }
      }

      // Reverse schedules amount paid
      const { data: schedules } = await supabase.from('payment_schedules').select('*').eq('student_fee_account_id', p.student_fee_account_id).order('installment_number', { ascending: false });
      let reverseRem = p.amount;
      for (const s of schedules ?? []) {
        if (reverseRem <= 0) break;
        if (s.amount_paid > 0) {
          const sub = Math.min(reverseRem, s.amount_paid);
          const nextPaid = s.amount_paid - sub;
          await supabase.from('payment_schedules').update({
            amount_paid: nextPaid,
            status: nextPaid <= 0 ? 'pending' : nextPaid >= s.amount_due ? 'paid' : 'partially_paid'
          }).eq('id', s.id);
          reverseRem -= sub;
        }
      }

      // Update total account
      const { data: account } = await supabase.from('student_fee_accounts').select('*').eq('id', p.student_fee_account_id).maybeSingle();
      if (account) {
        const nextPaid = Math.max(0, account.total_paid - p.amount);
        const nextRem = account.remaining + p.amount;
        await supabase.from('student_fee_accounts').update({
          total_paid: nextPaid,
          remaining: nextRem,
          is_up_to_date: nextRem <= 0,
        }).eq('id', account.id);
      }
    }

    show(`Annulation enregistrée. Écriture de contre-passation ${revReceiptNum} créée.`, 'success');
    setShowCancelModal(false);
    setCancellingPayment(null);
    setCancelReason('');
    load();
  }

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const name = p.student ? fullName(p.student.last_name, p.student.first_name) : '';
    return name.toLowerCase().includes(search.toLowerCase()) || (p.receipt_number ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const totalCollected = payments
    .filter((p) => p.status === 'paid' || p.status === 'completed')
    .reduce((s, p) => s + p.amount, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Paiements scolarité"
        subtitle={`${payments.length} versement(s) | Total encaissé: ${formatFCFA(totalCollected)}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau paiement</button>}
      />

      <Card className="p-4 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou numéro de reçu..." />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">N° Reçu</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Étudiant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Moyen</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Arbitrage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((p) => {
                const isReversal = p.amount < 0 || (p.receipt_number && p.receipt_number.startsWith('CAN-'));
                return (
                  <tr key={p.id} className={`table-row-hover ${isReversal ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 font-semibold text-ibr-700 font-mono">{p.receipt_number ?? '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.student ? fullName(p.student.last_name, p.student.first_name) : '-'}</td>
                    <td className="px-4 py-3">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isReversal ? 'text-red-600' : 'text-green-600'}`}>
                      {formatFCFA(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge color={p.status === 'paid' || p.status === 'completed' ? 'green' : 'red'}>
                        {p.status === 'paid' || p.status === 'completed' ? 'Payé' : 'Annulé'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(p.status === 'paid' || p.status === 'completed') && p.amount > 0 && (
                        <button
                          className="text-red-500 hover:text-red-700 font-semibold text-xs py-1 px-2 border border-red-200 rounded-lg bg-red-50/50 hover:bg-red-100"
                          onClick={() => {
                            setCancellingPayment(p);
                            setCancelReason('');
                            setShowCancelModal(true);
                          }}
                        >
                          Contre-passer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredPayments.length === 0 && <EmptyState message="Aucun paiement trouvé." icon={Receipt} />}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau versement comptable" size="lg">
        <div className="space-y-4">
          <div><label className="label-field">Étudiant *</label>
            <select className="input-field" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">--</option>
              {students.map((s) => <option key={s.id} value={s.id}>{fullName(s.last_name, s.first_name)} ({s.matricule ?? 'sans matricule'})</option>)}
            </select>
          </div>

          {selectedAccount && (
            <Card className="p-4 bg-gray-50/50 border">
              <div className="grid grid-cols-3 gap-3 text-center text-sm mb-3">
                <div><p className="text-xs text-gray-500 font-medium">À payer</p><p className="font-bold text-gray-900">{formatFCFA(selectedAccount.total_due)}</p></div>
                <div><p className="text-xs text-gray-500 font-medium font-semibold text-green-700">Payé</p><p className="font-bold text-green-600">{formatFCFA(selectedAccount.total_paid)}</p></div>
                <div><p className="text-xs text-gray-500 font-medium font-semibold text-red-700">Reste</p><p className="font-bold text-red-600">{formatFCFA(selectedAccount.remaining)}</p></div>
              </div>
              
              {selectedSchedules.length > 0 && (
                <div className="border-t pt-2 mt-2 space-y-1 text-xs">
                  <p className="font-semibold text-gray-600 mb-1">Échéancier de paiement :</p>
                  {selectedSchedules.map((s) => (
                    <div key={s.id} className="flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0">
                      <span>Tranche {s.installment_number} ({formatDate(s.due_date)})</span>
                      <span className="font-semibold text-gray-700">
                        {formatFCFA(s.amount_due)} | Payé: <span className="text-green-600">{formatFCFA(s.amount_paid)}</span> 
                        <span className="ml-1.5 font-bold uppercase text-[9px]">[{s.status}]</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Montant (FCFA) *</label><input type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="label-field">Moyen de paiement</label>
              <select className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label-field">Référence de transaction (Wave ID, N° chèque...)</label><input className="input-field" value={form.transaction_reference} onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })} /></div>
          <div><label className="label-field">Observation</label><textarea className="input-field" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={createPayment}>Encaisser</button>
          </div>
        </div>
      </Modal>

      {/* COMPTABILITÉ CONTRE-PASSATION MODAL */}
      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Annuler une écriture comptable">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-950 text-xs flex gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Contre-passation comptable obligatoire :</p>
              <p className="mt-0.5">
                Conformément aux règles d'audit financier, un versement enregistré ne peut être supprimé. L'annulation va générer une écriture inverse négative (`-{cancellingPayment ? formatFCFA(cancellingPayment.amount) : ''}`) pour équilibrer les comptes.
              </p>
            </div>
          </div>

          <div>
            <label className="label-field">Motif de l'annulation *</label>
            <textarea
              className="input-field min-h-[90px]"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Exemple: Erreur de saisie du montant, chèque rejeté par la banque, etc..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => { setShowCancelModal(false); setCancellingPayment(null); }} disabled={loading}>Annuler</button>
            <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={handleCounterPassation} disabled={loading || !cancelReason.trim()}>
              Valider l'annulation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// BOOKLETS PAGE & PACKS
// ============================================================================
export function BookletsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [booklets, setBooklets] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'individual' | 'packs'>('individual');
  const [showModal, setShowModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);

  const [form, setForm] = useState({ code: '', title: '', level_id: '', unit_price: '', stock_quantity: '', min_stock_threshold: '5', is_mandatory: false });
  const [packForm, setPackForm] = useState({ name: '', level_id: '', pack_price: '', booklet_ids: [] as string[] });
  
  const { show } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [bRes, pRes] = await Promise.all([
      supabase.from('training_booklets').select('*, level:levels(*)').order('code'),
      supabase.from('booklet_packs').select('*, level:levels(*)').order('name'),
    ]);
    setBooklets(bRes.data ?? []);
    setPacks(pRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function createBooklet() {
    if (!form.code || !form.title) { show('Code et titre obligatoires', 'error'); return; }
    const { error } = await supabase.from('training_booklets').insert({
      code: form.code, title: form.title,
      level_id: form.level_id || null, academic_year_id: year?.id ?? null,
      unit_price: parseFloat(form.unit_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_stock_threshold: parseInt(form.min_stock_threshold) || 5,
      is_mandatory: form.is_mandatory, version: '1.0', is_active: true,
    });
    if (error) show(error.message, 'error');
    else {
      show('Fascicule créé avec succès', 'success');
      setShowModal(false);
      setForm({ code: '', title: '', level_id: '', unit_price: '', stock_quantity: '', min_stock_threshold: '5', is_mandatory: false });
      loadData();
    }
  }

  async function createPack() {
    if (!packForm.name || !packForm.level_id || !packForm.pack_price) {
      show('Champs obligatoires manquants', 'error');
      return;
    }

    const { data: newPack, error: packErr } = await supabase.from('booklet_packs').insert({
      name: packForm.name,
      level_id: packForm.level_id,
      academic_year_id: year?.id ?? null,
      pack_price: parseFloat(packForm.pack_price) || 0,
      is_mandatory: false,
      is_active: true,
    }).select().single();

    if (packErr) { show(packErr.message, 'error'); return; }

    if (newPack && packForm.booklet_ids.length > 0) {
      for (const bId of packForm.booklet_ids) {
        await supabase.from('booklet_pack_items').insert({
          pack_id: newPack.id,
          booklet_id: bId,
          quantity: 1
        });
      }
    }

    show('Pack de fascicules configuré', 'success');
    setShowPackModal(false);
    setPackForm({ name: '', level_id: '', pack_price: '', booklet_ids: [] });
    loadData();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Fascicules & Livrets"
        subtitle="Gestion des supports pédagogiques"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-1.5 text-xs py-2" onClick={() => setShowPackModal(true)}><ShoppingBag className="w-4 h-4" /> Configurer un pack</button>
            <button className="btn-primary flex items-center gap-2 text-xs py-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau fascicule</button>
          </div>
        }
      />

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button onClick={() => setActiveSubTab('individual')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeSubTab === 'individual' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500'}`}>Fascicules individuels</button>
        <button onClick={() => setActiveSubTab('packs')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeSubTab === 'packs' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500'}`}>Packs promotionnels</button>
      </div>

      {activeSubTab === 'individual' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Code</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Titre</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Niveau</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600">Prix unitaire</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Stock disponible</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {booklets.map((b) => (
                  <tr key={b.id} className="table-row-hover">
                    <td className="px-3 py-2 font-semibold text-ibr-700 font-mono">{b.code}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{b.title}</td>
                    <td className="px-3 py-2 text-gray-600">{b.level?.name ?? '-'}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatFCFA(b.unit_price)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold ${b.stock_quantity <= b.min_stock_threshold ? 'text-red-600' : 'text-green-600'}`}>{b.stock_quantity}</span>
                      {b.stock_quantity <= b.min_stock_threshold && <AlertCircle className="w-3.5 h-3.5 text-red-500 inline ml-1.5 align-middle" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {b.is_mandatory ? <Badge color="ibr">Obligatoire</Badge> : <Badge color="gray">Facultatif</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeSubTab === 'packs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col justify-between h-44 border-t-4 border-ibr-600">
              <div>
                <h4 className="font-bold text-gray-900 text-base">{p.name}</h4>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Niveau: {p.level?.name}</p>
                <div className="flex gap-2 items-center mt-3 text-sm">
                  <span className="text-gray-500 line-through">{formatFCFA(p.normal_price)}</span>
                  <span className="font-extrabold text-ibr-800 text-base">{formatFCFA(p.pack_price)}</span>
                </div>
              </div>
              <Badge color="green" className="mt-3 w-fit">Actif</Badge>
            </Card>
          ))}
          {packs.length === 0 && <div className="col-span-full"><EmptyState message="Aucun pack configuré pour l'instant." icon={Package} /></div>}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau fascicule">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="label-field">Titre *</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          </div>
          <div><label className="label-field">Niveau</label>
            <select className="input-field" value={form.level_id} onChange={(e) => setForm({ ...form, level_id: e.target.value })}>
              <option value="">--</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label-field">Prix (FCFA)</label><input type="number" className="input-field" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
            <div><label className="label-field">Stock initial</label><input type="number" className="input-field" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} /></div>
            <div><label className="label-field">Seuil alerte</label><input type="number" className="input-field" value={form.min_stock_threshold} onChange={(e) => setForm({ ...form, min_stock_threshold: e.target.value })} /></div>
          </div>
          <div><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_mandatory} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} /><span className="text-sm font-medium text-gray-700">Obligatoire</span></label></div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={createBooklet}>Créer</button>
          </div>
        </div>
      </Modal>

      <Modal open={showPackModal} onClose={() => setShowPackModal(false)} title="Nouveau pack de fascicules">
        <div className="space-y-4">
          <div><label className="label-field">Nom du pack *</label><input className="input-field" value={packForm.name} onChange={(e) => setPackForm({ ...packForm, name: e.target.value })} placeholder="Pack complet 1ère année" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Niveau *</label>
              <select className="input-field" value={packForm.level_id} onChange={(e) => setPackForm({ ...packForm, level_id: e.target.value, booklet_ids: [] })}>
                <option value="">--</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label className="label-field">Prix du pack (FCFA) *</label><input type="number" className="input-field" value={packForm.pack_price} onChange={(e) => setPackForm({ ...packForm, pack_price: e.target.value })} /></div>
          </div>

          {packForm.level_id && (
            <div>
              <label className="label-field">Sélectionner les fascicules du pack :</label>
              <div className="border rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 bg-white">
                {booklets.filter((b) => b.level_id === packForm.level_id).map((b) => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={packForm.booklet_ids.includes(b.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPackForm((prev) => ({ ...prev, booklet_ids: [...prev.booklet_ids, b.id] }));
                        } else {
                          setPackForm((prev) => ({ ...prev, booklet_ids: prev.booklet_ids.filter((id) => id !== b.id) }));
                        }
                      }}
                      className="rounded text-ibr-600 focus:ring-ibr-500"
                    />
                    <span>{b.code} - {b.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowPackModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={createPack}>Créer le pack</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// STOCK PAGE & PHYSICAL DELIVERIES
// ============================================================================
export function StockPage() {
  const [booklets, setBooklets] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'deliveries'>('inventory');
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ booklet_id: '', movement_type: 'in', quantity: '', note: '' });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, mRes, dRes] = await Promise.all([
      supabase.from('training_booklets').select('*, level:levels(*)').order('code'),
      supabase.from('booklet_stock_movements').select('*, booklet:training_booklets(*)').order('created_at', { ascending: false }).limit(50),
      supabase.from('booklet_orders').select('*, student:students(*), level:levels(*)').eq('status', 'pending').order('order_date', { ascending: false }),
    ]);
    setBooklets(bRes.data ?? []);
    setMovements(mRes.data ?? []);
    setPendingDeliveries(dRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createMovement() {
    if (!form.booklet_id || !form.quantity) { show('Fascicule et quantité obligatoires', 'error'); return; }
    const qty = parseInt(form.quantity);
    const booklet = booklets.find((b) => b.id === form.booklet_id);

    if (form.movement_type === 'in' || form.movement_type === 'correction') {
      await supabase.from('training_booklets').update({ stock_quantity: booklet.stock_quantity + qty }).eq('id', form.booklet_id);
    } else {
      if (qty > booklet.stock_quantity) { show('Stock insuffisant', 'error'); return; }
      await supabase.from('training_booklets').update({ stock_quantity: booklet.stock_quantity - qty }).eq('id', form.booklet_id);
    }

    await supabase.from('booklet_stock_movements').insert({
      booklet_id: form.booklet_id, movement_type: form.movement_type, quantity: qty,
      note: form.note || null,
    });

    show('Mouvement de stock enregistré', 'success');
    setShowModal(false);
    setForm({ booklet_id: '', movement_type: 'in', quantity: '', note: '' });
    load();
  }

  // Confirmer la livraison physique
  async function confirmPhysicalDelivery(order: any) {
    setLoading(true);
    
    // Mark order as completed
    await supabase.from('booklet_orders').update({
      status: 'delivered',
      amount_paid: order.final_amount,
      remaining: 0,
    }).eq('id', order.id);

    // Get order items and decrease booklet stock
    const { data: items } = await supabase.from('booklet_order_items').select('*').eq('order_id', order.id);
    for (const item of items ?? []) {
      const bObj = booklets.find((x) => x.id === item.booklet_id);
      if (bObj) {
        await supabase.from('training_booklets').update({
          stock_quantity: Math.max(0, bObj.stock_quantity - item.quantity),
        }).eq('id', item.booklet_id);

        // Record stock movement
        await supabase.from('booklet_stock_movements').insert({
          booklet_id: item.booklet_id,
          movement_type: 'sale',
          quantity: item.quantity,
          reference: `ORD-${order.id.slice(0, 8)}`,
          note: `Livraison physique confirmée pour l'élève ${fullName(order.student?.last_name, order.student?.first_name)}`,
        });
      }
    }

    show('Livraison confirmée et stock décrémenté !', 'success');
    load();
  }

  if (loading) return <LoadingSpinner />;

  const stockMovementLabels: Record<string, string> = {
    initial: 'Stock initial', in: 'Entrée', out: 'Sortie', sale: 'Vente',
    free_delivery: 'Remise gratuite', damaged: 'Endommagé', loss: 'Perte', correction: 'Correction',
  };

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Stock & Livraisons"
        subtitle="Contrôle des stocks de livrets"
        actions={<button className="btn-primary flex items-center gap-2 text-xs py-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Ajustement de stock</button>}
      />

      <div className="flex gap-1 mb-6 border-b border-gray-200 font-semibold text-sm">
        <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 border-b-2 ${activeTab === 'inventory' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500'}`}>État d'inventaire</button>
        <button onClick={() => setActiveTab('movements')} className={`px-4 py-2 border-b-2 ${activeTab === 'movements' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500'}`}>Mouvements de stock</button>
        <button onClick={() => setActiveTab('deliveries')} className={`px-4 py-2 border-b-2 ${activeTab === 'deliveries' ? 'border-ibr-600 text-ibr-700' : 'border-transparent text-gray-500'} flex items-center gap-2`}>
          Distribution élèves
          {pendingDeliveries.length > 0 && <span className="bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">{pendingDeliveries.length}</span>}
        </button>
      </div>

      {activeTab === 'inventory' && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Stock disponible</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Alerte stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {booklets.map((b) => (
                <tr key={b.id} className="table-row-hover">
                  <td className="px-3 py-2.5 font-semibold text-ibr-700 font-mono">{b.code}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{b.title}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-bold ${b.stock_quantity <= b.min_stock_threshold ? 'text-red-600' : 'text-green-600'}`}>{b.stock_quantity}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{b.min_stock_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'movements' && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Fascicule</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Type de mouvement</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Motif</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Quantité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((m) => (
                <tr key={m.id} className="table-row-hover">
                  <td className="px-3 py-2 text-xs font-semibold">{formatDate(m.created_at)}</td>
                  <td className="px-3 py-2 font-mono font-medium">{m.booklet?.code ?? '-'}</td>
                  <td className="px-3 py-2">
                    <Badge color={m.movement_type === 'in' || m.movement_type === 'initial' ? 'green' : 'red'}>
                      {stockMovementLabels[m.movement_type] ?? m.movement_type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-600 italic text-xs max-w-xs truncate">{m.note ?? '-'}</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                    {m.movement_type === 'in' || m.movement_type === 'initial' ? '+' : '-'}{m.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          <h4 className="font-bold text-gray-900 text-sm">Livraisons physiques en attente</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pendingDeliveries.map((d) => (
              <Card key={d.id} className="p-4 border-l-4 border-amber-500 flex justify-between items-center bg-amber-50/5">
                <div>
                  <p className="font-bold text-gray-900">{fullName(d.student?.last_name, d.student?.first_name)}</p>
                  <p className="text-xs text-gray-500 font-mono">Matricule: {d.student?.matricule} | Date commande: {formatDate(d.order_date)}</p>
                  <p className="text-xs text-ibr-800 font-semibold mt-2">Détail: Fascicule de Niveau {d.level?.code}</p>
                </div>
                <button
                  className="btn-primary py-1 px-3 text-xs flex items-center gap-1 shrink-0"
                  onClick={() => confirmPhysicalDelivery(d)}
                >
                  <Truck className="w-3.5 h-3.5" /> Livrer
                </button>
              </Card>
            ))}
            {pendingDeliveries.length === 0 && (
              <div className="col-span-full"><EmptyState message="Toutes les distributions élèves ont été honorées." icon={Check} /></div>
            )}
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Mouvement de stock / Ajustement">
        <div className="space-y-4">
          <div><label className="label-field">Fascicule *</label>
            <select className="input-field" value={form.booklet_id} onChange={(e) => setForm({ ...form, booklet_id: e.target.value })}>
              <option value="">--</option>
              {booklets.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.title} (stock actuel: {b.stock_quantity})</option>)}
            </select>
          </div>
          <div><label className="label-field">Type de mouvement *</label>
            <select className="input-field" value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
              <option value="in">Entrée en stock</option>
              <option value="out">Sortie (Ajustement)</option>
              <option value="damaged">Endommagé / Destruction</option>
              <option value="loss">Perte constatée</option>
              <option value="correction">Correction d'inventaire</option>
            </select>
          </div>
          <div><label className="label-field">Quantité *</label><input type="number" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          <div><label className="label-field">Note d'ajustement</label><input className="input-field" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={createMovement}>Enregistrer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
