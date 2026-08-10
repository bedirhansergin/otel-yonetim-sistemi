import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReservationProvider, ReservationContext } from './context/ReservationContext';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { GuestsPage } from './pages/GuestsPage';
import { AccountingPage } from './pages/AccountingPage';
import { GanttPage } from './pages/GanttPage';
import { LoginPage } from './pages/LoginPage';
import { ReservationModal } from './components/ReservationModal';
import { LogOut, Menu, Plus, X } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Anasayfa' },
  { to: '/gantt', label: 'Aylık Çizelge' },
  { to: '/odalar', label: 'Odalar' },
  { to: '/misafirler', label: 'Misafir Bilgileri' },
  { to: '/muhasebe', label: 'Muhasebe Panosu' },
];

function MobileHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 md:hidden border-b-2 border-slate-600 bg-panel/95">
      <button
        type="button"
        onClick={onMenuToggle}
        className="rounded-xl p-2 text-slate-300 hover:bg-white/5"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Berivan Motel</p>
        <p className="text-xs text-slate-300">Yönetim Paneli</p>
      </div>
      <div className="w-10" />
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  username,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  username: string | null;
  onLogout: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-slate-900/90" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-panel border-r border-slate-600 shadow-2xl flex flex-col p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Avşa Berivan Motel</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Bilgi ve Yönetim Sistemi</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-300 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-accent/20 text-accent' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="pt-6 border-t border-slate-700">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-slate-300">{username}</span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Çıkış Yap"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewReservationButton() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  return (
    <button
      type="button"
      onClick={context.openNewReservation}
      className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-accent/90 flex items-center gap-2"
    >
      <Plus className="h-4 w-4" />
      Yeni Rezervasyon
    </button>
  );
}

function AuthenticatedApp() {
  const { username, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const dateTimeStr = now.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }) + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <ReservationProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-surface text-slate-100">
          <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />
          <MobileMenu
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            username={username}
            onLogout={logout}
          />

          <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-6 md:px-8">
            <aside className="hidden w-72 flex-col gap-4 rounded-3xl border-2 border-slate-600 bg-panel/90 p-6 shadow-soft md:flex">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Avşa Berivan Motel</p>
                <h1 className="mt-3 text-3xl font-semibold text-white">Avşa Berivan Motel - Bilgi ve Yönetim Sistemi</h1>
                <p className="mt-3 text-sm text-slate-300">{dateTimeStr}</p>
              </div>
              <nav className="mt-8 flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive ? 'bg-accent/20 text-accent' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-auto pt-6 border-t-2 border-slate-700">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-slate-300">{username}</span>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-xl p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Çıkış Yap"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              <div className="mb-6 rounded-3xl border-2 border-slate-600 bg-panel/90 p-4 sm:p-6 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-slate-300">Genel Bakış</p>
                    <h2 className="mt-2 text-xl sm:text-3xl font-semibold text-white">Avşa Berivan Motel Yönetim Paneli</h2>
                  </div>
                  <NewReservationButton />
                </div>
              </div>

              <div className="space-y-6">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/gantt" element={<GanttPage />} />
                  <Route path="/odalar" element={<RoomsPage />} />
                  <Route path="/misafirler" element={<GuestsPage />} />
                  <Route path="/muhasebe" element={<AccountingPage />} />
                </Routes>
              </div>
            </main>
          </div>
          <ReservationModal />
        </div>
      </BrowserRouter>
    </ReservationProvider>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-accent" />
          <p className="text-sm text-slate-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
