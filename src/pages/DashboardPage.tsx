import { useEffect, useState } from 'react';
import {
  Users, GraduationCap, BookOpen, ClipboardList, CreditCard,
  Award, TrendingUp, AlertCircle, Package,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCurrentAcademicYear } from '../lib/hooks';
import { StatCard, Card, LoadingSpinner, Badge } from '../components/ui';
import { formatFCFA, ACADEMIC_STATUS_LABELS } from '../lib/utils';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  teachers: number;
  subjects: number;
  gradesEntered: number;
  gradesMissing: number;
  totalExpectedFees: number;
  totalCollected: number;
  totalRemaining: number;
  bookletsInStock: number;
  lowStockCount: number;
}

export function DashboardPage() {
  const { year, loading: yearLoading } = useCurrentAcademicYear();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topStudents, setTopStudents] = useState<{ name: string; matricule: string; average: number }[]>([]);
  const [recentPayments, setRecentPayments] = useState<{ student_name: string; amount: number; method: string; date: string }[]>([]);

  useEffect(() => {
    if (!year) return;
    loadStats();
  }, [year]);

  async function loadStats() {
    if (!year) return;
    const ayId = year.id;

    const [studentsRes, teachersRes, subjectsRes, gradesRes, feesRes, paymentsRes, bookletsRes] = await Promise.all([
      supabase.from('students').select('id, academic_status').eq('deleted_at', null),
      supabase.from('teachers').select('id').eq('deleted_at', null),
      supabase.from('subjects').select('id').eq('academic_year_id', ayId),
      supabase.from('grades').select('id, score, status').eq('academic_year_id', ayId),
      supabase.from('student_fee_accounts').select('total_due, total_paid, remaining').eq('academic_year_id', ayId),
      supabase.from('payments').select('amount, payment_method, payment_date, student:students(first_name, last_name)').eq('academic_year_id', ayId).eq('status', 'paid').order('payment_date', { ascending: false }).limit(5),
      supabase.from('training_booklets').select('stock_quantity, min_stock_threshold'),
    ]);

    const students = studentsRes.data ?? [];
    const grades = gradesRes.data ?? [];
    const fees = feesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const booklets = bookletsRes.data ?? [];

    const totalExpected = fees.reduce((s, f: any) => s + (f.total_due || 0), 0);
    const totalCollected = fees.reduce((s, f: any) => s + (f.total_paid || 0), 0);
    const totalRemaining = fees.reduce((s, f: any) => s + (f.remaining || 0), 0);
    const lowStock = booklets.filter((b: any) => b.stock_quantity <= (b.min_stock_threshold || 0)).length;
    const stockTotal = booklets.reduce((s: number, b: any) => s + (b.stock_quantity || 0), 0);

    setStats({
      totalStudents: students.length,
      activeStudents: students.filter((s: any) => s.academic_status === 'actif').length,
      teachers: teachersRes.data?.length ?? 0,
      subjects: subjectsRes.data?.length ?? 0,
      gradesEntered: grades.filter((g: any) => g.score !== null).length,
      gradesMissing: grades.filter((g: any) => g.score === null && !g.is_not_available).length,
      totalExpectedFees: totalExpected,
      totalCollected,
      totalRemaining,
      bookletsInStock: stockTotal,
      lowStockCount: lowStock,
    });

    setRecentPayments(payments.map((p: any) => ({
      student_name: `${p.student?.last_name ?? ''} ${p.student?.first_name ?? ''}`.trim(),
      amount: p.amount,
      method: p.payment_method,
      date: p.payment_date,
    })));

    // Load top students from annual_results
    const { data: topData } = await supabase
      .from('annual_results')
      .select('average, student:students(first_name, last_name, matricule)')
      .eq('academic_year_id', ayId)
      .order('average', { ascending: false })
      .limit(5);

    setTopStudents((topData as any)?.map((r: any) => ({
      name: `${r.student?.last_name ?? ''} ${r.student?.first_name ?? ''}`.trim(),
      matricule: r.student?.matricule ?? '-',
      average: r.average ?? 0,
    })) ?? []);

    setLoading(false);
  }

  if (yearLoading || loading) return <LoadingSpinner label="Chargement du tableau de bord..." />;

  const collectionRate = stats && stats.totalExpectedFees > 0
    ? Math.round((stats.totalCollected / stats.totalExpectedFees) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-1">
            Année académique : <span className="font-medium text-ibr-700">{year?.name}</span>
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total étudiants" value={stats?.totalStudents ?? 0} icon={Users} color="ibr" subtitle={`${stats?.activeStudents ?? 0} actifs`} />
        <StatCard label="Enseignants" value={stats?.teachers ?? 0} icon={GraduationCap} color="gold" />
        <StatCard label="Matières" value={stats?.subjects ?? 0} icon={BookOpen} color="green" />
        <StatCard label="Notes saisies" value={stats?.gradesEntered ?? 0} icon={ClipboardList} color="gray" subtitle={`${stats?.gradesMissing ?? 0} manquantes`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scolarité attendue" value={formatFCFA(stats?.totalExpectedFees ?? 0)} icon={CreditCard} color="ibr" />
        <StatCard label="Scolarité encaissée" value={formatFCFA(stats?.totalCollected ?? 0)} icon={TrendingUp} color="green" />
        <StatCard label="Reste à encaisser" value={formatFCFA(stats?.totalRemaining ?? 0)} icon={AlertCircle} color="red" />
        <StatCard label="Taux de recouvrement" value={`${collectionRate}%`} icon={Award} color="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top students */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Meilleurs étudiants</h3>
          {topStudents.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucun résultat calculé pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {topStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-gold-100 text-gold-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-ibr-50 text-ibr-700'
                    }`}>{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.matricule}</p>
                    </div>
                  </div>
                  <Badge color={s.average >= 14 ? 'green' : s.average >= 10 ? 'gold' : 'red'}>
                    {s.average.toFixed(2)}/20
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent payments */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Paiements récents</h3>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucun paiement enregistré.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.student_name}</p>
                    <p className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{formatFCFA(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Stock alert */}
      {(stats?.lowStockCount ?? 0) > 0 && (
        <Card className="p-5 border-gold-200 bg-gold-50">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gold-600" />
            <div>
              <p className="text-sm font-medium text-gold-800">Alerte stock</p>
              <p className="text-xs text-gold-700">
                {stats?.lowStockCount} fascicule(s) en stock faible. Total en stock : {stats?.bookletsInStock} exemplaires.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
