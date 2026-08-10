import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, LogIn } from 'lucide-react';
import { ErrorDisplay } from '../components/ErrorDisplay';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    if (!result.ok) {
      setError(result.error || 'Giriş başarısız.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-300 mb-4">Avşa Berivan Motel</p>
          <h1 className="text-3xl font-semibold text-white">Avşa Berivan Motel - Bilgi ve Yönetim Sistemi</h1>
          <p className="mt-3 text-sm text-slate-300">Devam etmek için giriş yapın.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border-2 border-slate-600 bg-panel/90 p-8 shadow-soft space-y-5"
        >
          <label className="grid gap-2 text-sm text-slate-300">
            E-posta
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              placeholder="E-posta adresiniz"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-300">
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              placeholder="Şifreniz"
            />
          </label>

          {error && <ErrorDisplay message={error} />}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
