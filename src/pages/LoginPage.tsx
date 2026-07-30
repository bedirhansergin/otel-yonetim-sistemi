import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Kullanıcı adı ve şifre gerekli.');
      return;
    }
    const success = login(username, password);
    if (!success) {
      setError('Kullanıcı adı veya şifre hatalı.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-4">Avşa Berivan Motel</p>
          <h1 className="text-3xl font-semibold text-white">Otel Yönetim Sistemi</h1>
          <p className="mt-3 text-sm text-slate-400">Devam etmek için giriş yapın.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-panel/80 p-8 shadow-soft space-y-5"
        >
          <label className="grid gap-2 text-sm text-slate-300">
            Kullanıcı Adı
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              placeholder="Kullanıcı adınız"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-300">
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              placeholder="Şifreniz"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent/90 flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}
