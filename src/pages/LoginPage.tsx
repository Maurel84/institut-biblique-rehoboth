import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
const logoSrc = '/Logo_IBR.jpeg';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, firstName, lastName);
      if (error) setError(error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ibr-900 via-ibr-800 to-ibr-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoSrc} alt="Logo IBR" className="w-24 h-24 rounded-2xl object-contain bg-white p-1 mx-auto mb-4 shadow-lg" />
          <h1 className="text-2xl font-bold text-white">IBR Gestion Académique</h1>
          <p className="text-ibr-300 text-sm mt-1">Institut Biblique Rehoboth - Bonoua</p>
          <p className="text-gold-300 text-xs font-bold mt-2 tracking-wide uppercase">VIVRE CHAQUE JOUR LA PLÉNITUDE DE LA PAROLE DE DIEU</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label-field">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="exemple@ibr-bonoua.org"
                required
              />
            </div>

            <div>
              <label className="label-field">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-4 bg-ibr-50 border border-ibr-200 rounded-lg px-4 py-3 text-xs text-ibr-700">
              <p className="font-semibold mb-1">💡 Premier compte inscrit</p>
              <p>Le tout premier compte enregistré via "Créer un compte" sera automatiquement promu <b>Super Administrateur</b>.</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-sm text-ibr-600 hover:text-ibr-800 font-medium"
            >
              {mode === 'login'
                ? 'Pas de compte ? Créer un compte'
                : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>

        <p className="text-center text-ibr-400 text-xs mt-6">
          © {new Date().getFullYear()} Institut Biblique Rehoboth - Bonoua, Côte d'Ivoire
        </p>
      </div>
    </div>
  );
}
