import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentAcademicYear, useLevels, useToast } from '../lib/hooks';
import { Card, PageHeader, LoadingSpinner, Badge, Modal, Select, EmptyState, SearchInput } from '../components/ui';
import { formatFCFA, fullName, formatDate, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../lib/utils';
import type { FeeCategory, TuitionFeeStructure, Payment, Student } from '../types';
import { Plus, CreditCard, Receipt, Package, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

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

  async function create() {
    if (!form.level_id || !form.fee_category_id || !form.amount || !year) { show('Tous les champs obligatoires', 'error'); return; }
    const { error } = await supabase.from('tuition_fee_structures').insert({
      academic_year_id: year.id, level_id: form.level_id, fee_category_id: form.fee_category_id,
      amount: parseFloat(form.amount), number_of_installments: parseInt(form.number_of_installments) || 1,
      currency: 'FCFA', is_active: true,
    });
    if (error) show(error.message, 'error');
    else { show('Frais configuré', 'success'); setShowModal(false); setForm({ level_id: '', fee_category_id: '', amount: '', number_of_installments: '1' }); load(); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Frais de scolarité"
        subtitle={`Grille des frais - ${year?.name ?? ''}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Configurer un frais</button>}
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Catégorie</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Montant</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Tranches</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Obligatoire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {levelFees.map((f) => (
                  <tr key={f.id} className="table-row-hover">
                    <td className="px-3 py-2">{f.fee_category?.name}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatFCFA(f.amount)}</td>
                    <td className="px-3 py-2 text-center">{f.number_of_installments}</td>
                    <td className="px-3 py-2 text-center">{f.fee_category?.is_mandatory ? 'Oui' : 'Non'}</td>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Configurer un frais">
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
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Enregistrer</button></div>
        </div>
      </Modal>
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
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeAccounts, setFeeAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({ student_id: '', amount: '', payment_method: 'especes', transaction_reference: '', observation: '' });
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

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
        .then(({ data }) => setSelectedAccount(data));
    } else {
      setSelectedAccount(null);
    }
  }, [form.student_id, year]);

  async function createPayment() {
    if (!form.student_id || !form.amount || !year) { show('Étudiant et montant obligatoires', 'error'); return; }
    const amount = parseFloat(form.amount);
    if (amount <= 0) { show('Le montant doit être positif', 'error'); return; }

    // Generate receipt number
    const receiptNum = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

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

    // Allocate payment to fee items (FIFO)
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
      // Update account totals
      const newPaid = (selectedAccount.total_paid ?? 0) + amount;
      const newRemaining = (selectedAccount.remaining ?? 0) - amount;
      await supabase.from('student_fee_accounts').update({
        total_paid: newPaid, remaining: newRemaining, is_up_to_date: newRemaining <= 0,
      }).eq('id', selectedAccount.id);
    }

    show(`Paiement enregistré. Reçu: ${receiptNum}`, 'success');
    setShowModal(false);
    setForm({ student_id: '', amount: '', payment_method: 'especes', transaction_reference: '', observation: '' });
    load();
  }

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const name = p.student ? fullName(p.student.last_name, p.student.first_name) : '';
    return name.toLowerCase().includes(search.toLowerCase()) || (p.receipt_number ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const totalCollected = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Paiements"
        subtitle={`${payments.length} paiement(s) | Total encaissé: ${formatFCFA(totalCollected)}`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau paiement</button>}
      />

      <Card className="p-4 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou numéro de reçu..." />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Reçu</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Étudiant</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Moyen</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Montant</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td className="px-3 py-2">{formatDate(p.payment_date)}</td>
                  <td className="px-3 py-2 font-medium text-ibr-700">{p.receipt_number ?? '-'}</td>
                  <td className="px-3 py-2">{p.student ? fullName(p.student.last_name, p.student.first_name) : '-'}</td>
                  <td className="px-3 py-2">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatFCFA(p.amount)}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge color={p.status === 'paid' ? 'green' : p.status === 'cancelled' ? 'red' : 'gray'}>
                      {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPayments.length === 0 && <EmptyState message="Aucun paiement trouvé." icon={Receipt} />}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau paiement" size="lg">
        <div className="space-y-4">
          <div><label className="label-field">Étudiant *</label>
            <select className="input-field" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">--</option>
              {students.map((s) => <option key={s.id} value={s.id}>{fullName(s.last_name, s.first_name)} ({s.matricule ?? 'sans matricule'})</option>)}
            </select>
          </div>

          {selectedAccount && (
            <Card className="p-4 bg-gray-50">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xs text-gray-500">À payer</p><p className="font-bold">{formatFCFA(selectedAccount.total_due)}</p></div>
                <div><p className="text-xs text-gray-500">Payé</p><p className="font-bold text-green-600">{formatFCFA(selectedAccount.total_paid)}</p></div>
                <div><p className="text-xs text-gray-500">Reste</p><p className="font-bold text-red-600">{formatFCFA(selectedAccount.remaining)}</p></div>
              </div>
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
          <div><label className="label-field">Référence transaction</label><input className="input-field" value={form.transaction_reference} onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })} /></div>
          <div><label className="label-field">Observation</label><textarea className="input-field" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} /></div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={createPayment}>Encaisser</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// BOOKLETS PAGE
// ============================================================================
export function BookletsPage() {
  const { year } = useCurrentAcademicYear();
  const { levels } = useLevels();
  const [booklets, setBooklets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', title: '', level_id: '', unit_price: '', stock_quantity: '', min_stock_threshold: '5', is_mandatory: false });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('training_booklets').select('*, level:levels(*)').order('code');
    setBooklets(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
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
      // Record initial stock movement
      const { data: booklet } = await supabase.from('training_booklets').select('id').eq('code', form.code).maybeSingle();
      if (booklet && parseInt(form.stock_quantity) > 0) {
        await supabase.from('booklet_stock_movements').insert({
          booklet_id: booklet.id, movement_type: 'initial', quantity: parseInt(form.stock_quantity),
          reference: 'INIT', note: 'Stock initial',
        });
      }
      show('Fascicule créé', 'success');
      setShowModal(false);
      setForm({ code: '', title: '', level_id: '', unit_price: '', stock_quantity: '', min_stock_threshold: '5', is_mandatory: false });
      load();
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Fascicules"
        subtitle={`${booklets.length} fascicule(s)`}
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau fascicule</button>}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Niveau</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Prix unitaire</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {booklets.map((b) => (
                <tr key={b.id} className="table-row-hover">
                  <td className="px-3 py-2 font-medium text-ibr-700">{b.code}</td>
                  <td className="px-3 py-2">{b.title}</td>
                  <td className="px-3 py-2">{b.level?.name ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{formatFCFA(b.unit_price)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={b.stock_quantity <= b.min_stock_threshold ? 'text-red-600 font-bold' : ''}>{b.stock_quantity}</span>
                    {b.stock_quantity <= b.min_stock_threshold && <AlertCircle className="w-3 h-3 text-red-500 inline ml-1" />}
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
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={create}>Créer</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// STOCK PAGE
// ============================================================================
export function StockPage() {
  const [booklets, setBooklets] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ booklet_id: '', movement_type: 'in', quantity: '', note: '' });
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, mRes] = await Promise.all([
      supabase.from('training_booklets').select('*, level:levels(*)').order('code'),
      supabase.from('booklet_stock_movements').select('*, booklet:training_booklets(*)').order('created_at', { ascending: false }).limit(50),
    ]);
    setBooklets(bRes.data ?? []);
    setMovements(mRes.data ?? []);
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

  if (loading) return <LoadingSpinner />;

  const stockMovementLabels: Record<string, string> = {
    initial: 'Stock initial', in: 'Entrée', out: 'Sortie', sale: 'Vente',
    free_delivery: 'Remise gratuite', damaged: 'Endommagé', loss: 'Perte', correction: 'Correction',
  };

  return (
    <div>
      <PageHeader
        title="Stock des fascicules"
        subtitle="Gestion des mouvements de stock"
        actions={<button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Mouvement de stock</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <h3 className="font-semibold text-gray-900 p-4 border-b">État du stock</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Code</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Titre</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Stock</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Seuil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {booklets.map((b) => (
                <tr key={b.id} className="table-row-hover">
                  <td className="px-3 py-2 font-medium text-ibr-700">{b.code}</td>
                  <td className="px-3 py-2">{b.title}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={b.stock_quantity <= b.min_stock_threshold ? 'text-red-600 font-bold' : ''}>{b.stock_quantity}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500">{b.min_stock_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-hidden">
          <h3 className="font-semibold text-gray-900 p-4 border-b">Mouvements récents</h3>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Fascicule</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Qté</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m) => (
                  <tr key={m.id} className="table-row-hover">
                    <td className="px-3 py-2 text-xs">{formatDate(m.created_at)}</td>
                    <td className="px-3 py-2">{m.booklet?.code ?? '-'}</td>
                    <td className="px-3 py-2"><Badge color={m.movement_type === 'in' || m.movement_type === 'initial' ? 'green' : m.movement_type === 'out' || m.movement_type === 'sale' ? 'gold' : 'gray'}>{stockMovementLabels[m.movement_type] ?? m.movement_type}</Badge></td>
                    <td className="px-3 py-2 text-right font-medium">{m.movement_type === 'in' || m.movement_type === 'initial' ? '+' : '-'}{m.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Mouvement de stock">
        <div className="space-y-4">
          <div><label className="label-field">Fascicule *</label>
            <select className="input-field" value={form.booklet_id} onChange={(e) => setForm({ ...form, booklet_id: e.target.value })}>
              <option value="">--</option>
              {booklets.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.title} (stock: {b.stock_quantity})</option>)}
            </select>
          </div>
          <div><label className="label-field">Type de mouvement *</label>
            <select className="input-field" value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
              <option value="in">Entrée en stock</option>
              <option value="out">Sortie</option>
              <option value="damaged">Endommagé</option>
              <option value="loss">Perte</option>
              <option value="correction">Correction d'inventaire</option>
            </select>
          </div>
          <div><label className="label-field">Quantité *</label><input type="number" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          <div><label className="label-field">Note</label><input className="input-field" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button className="btn-primary" onClick={createMovement}>Enregistrer</button></div>
        </div>
      </Modal>
    </div>
  );
}
