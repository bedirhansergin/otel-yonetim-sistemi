import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { GuestsPage } from './pages/GuestsPage';
import { AccountingPage } from './pages/AccountingPage';
import { GanttPage } from './pages/GanttPage';
import { JandarmaPage } from './pages/JandarmaPage';
import { ReservationProvider } from './context/ReservationContext';
import { ReservationModal } from './components/ReservationModal';

const navItems = [
  { to: '/', label: 'Anasayfa' },
  { to: '/gantt', label: 'Aylık Çizelge' },
  { to: '/odalar', label: 'Odalar' },
  { to: '/misafirler', label: 'Misafir Bilgileri' },
  { to: '/muhasebe', label: 'Muhasebe Panosu' },
  { to: '/jandarma', label: 'Jandarma KBS' }
];

function App() {
  return (
    <ReservationProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-surface text-slate-100">
          <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-6 md:px-8">
            <aside className="hidden w-72 flex-col gap-4 rounded-3xl border border-white/10 bg-panel/80 p-6 shadow-soft md:flex">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avşa Berivan Motel</p>
                <h1 className="mt-3 text-3xl font-semibold text-white">Otel Yönetim Sistemi</h1>
                <p className="mt-3 text-sm text-slate-300">36 odalı apart otelin için uzman bir kontrol paneli.</p>
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
            </aside>

            <main className="flex-1">
              <div className="mb-6 rounded-3xl border border-white/10 bg-panel/80 p-6 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Genel Bakış</p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">Avşa Berivan Motel Yönetim Paneli</h2>
                  </div>
                  <div className="rounded-3xl bg-emerald-900/40 px-4 py-3 text-sm text-emerald-300">
                    Supabase bağlantısı aktif · Canlı veri
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/gantt" element={<GanttPage />} />
                  <Route path="/odalar" element={<RoomsPage />} />
                  <Route path="/misafirler" element={<GuestsPage />} />
                  <Route path="/muhasebe" element={<AccountingPage />} />
                  <Route path="/jandarma" element={<JandarmaPage />} />
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

export default App;
