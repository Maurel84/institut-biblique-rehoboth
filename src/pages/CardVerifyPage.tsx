import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, Card, Badge } from '../components/ui';
import { fullName } from '../lib/utils';
import { CheckCircle2, ShieldCheck, XCircle, Award } from 'lucide-react';

export function CardVerifyPage({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // Fetch student details
      const { data: s } = await supabase
        .from('students')
        .select('*, current_level:levels(*)')
        .eq('id', studentId)
        .maybeSingle();
      setStudent(s);

      if (s) {
        // Fetch card details
        const { data: c } = await supabase
          .from('student_cards')
          .select('*, level:levels(*), academic_year:academic_years(*)')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setCard(c);
      }
      setLoading(false);
    }
    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <LoadingSpinner label="Vérification du certificat étudiant..." />
      </div>
    );
  }

  const isValid = student && student.academic_status === 'actif' && card && card.status === 'delivered';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center shadow-lg border-2 border-ibr-600/20 bg-white relative overflow-hidden">
        {/* Top visual accents */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ibr-600 to-gold-500" />

        <div className="flex flex-col items-center mt-4">
          <div className="w-16 h-16 bg-ibr-50 rounded-2xl flex items-center justify-center text-ibr-700 font-extrabold text-lg mb-3 shadow-inner">
            IBR
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Institut Biblique Rehoboth</h2>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Vérification de Certificat</p>
        </div>

        <div className="my-6 border-y py-6 space-y-4">
          {isValid ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 shadow-sm">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <Badge color="green">Carte valide & active</Badge>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 shadow-sm">
                <XCircle className="w-10 h-10" />
              </div>
              <Badge color="red">Certificat non valide</Badge>
            </div>
          )}

          {student ? (
            <div className="text-left space-y-2 mt-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Étudiant :</span>
                <span className="font-bold text-gray-900 uppercase">{fullName(student.last_name, student.first_name)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Matricule actif :</span>
                <span className="font-semibold text-ibr-800 font-mono">{student.matricule ?? '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Niveau d'études :</span>
                <span className="font-semibold text-gray-900">{student.current_level?.name ?? '-'}</span>
              </div>
              {card && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">N° de Carte :</span>
                    <span className="font-semibold text-gray-700 font-mono">{card.card_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Année académique :</span>
                    <span className="font-semibold text-gray-700">{card.academic_year?.name ?? '-'}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 font-medium my-4">
              Aucun enregistrement trouvé pour cet identifiant dans la base de données de l'institut.
            </p>
          )}
        </div>

        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
          Ce système de vérification en direct garantit l'authenticité des cartes d'étudiants de l'Institut Biblique Rehoboth de Bonoua, Côte d'Ivoire.
        </p>
      </Card>
    </div>
  );
}
