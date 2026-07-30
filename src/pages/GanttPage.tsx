import { useContext, useMemo, useState } from 'react';
import { ReservationContext, type ReservationGroup } from '../context/ReservationContext';
import { Search } from 'lucide-react';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const BLOCK_COLORS = [
  'from-cyan-500/40 to-cyan-600/30 text-cyan-200 border-cyan-500/30',
  'from-emerald-500/40 to-emerald-600/30 text-emerald-200 border-emerald-500/30',
  'from-violet-500/40 to-violet-600/30 text-violet-200 border-violet-500/30',
  'from-amber-500/40 to-amber-600/30 text-amber-200 border-amber-500/30',
  'from-rose-500/40 to-rose-600/30 text-rose-200 border-rose-500/30',
  'from-sky-500/40 to-sky-600/30 text-sky-200 border-sky-500/30',
  'from-fuchsia-500/40 to-fuchsia-600/30 text-fuchsia-200 border-fuchsia-500/30',
  'from-lime-500/40 to-lime-600/30 text-lime-200 border-lime-500/30',
  'from-orange-500/40 to-orange-600/30 text-orange-200 border-orange-500/30',
  'from-teal-500/40 to-teal-600/30 text-teal-200 border-teal-500/30',
];

function hashColor(groupId: string): number {
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % BLOCK_COLORS.length;
}

export function GanttPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, loading, openReservation } = context;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDate = today.getDate();
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return reservations
      .filter((r) => r.guestName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [reservations, searchQuery]);

  const roomReservations = useMemo(() => {
    const map = new Map<number, ReservationGroup[]>();
    for (const room of rooms) {
      const roomResvs = reservations.filter(
        (r) => r.roomId === room.id && r.dates.some((d) => d.startsWith(monthPrefix))
      );
      map.set(room.id, roomResvs);
    }
    return map;
  }, [rooms, reservations, monthPrefix]);

  function getReservationForDay(roomId: number, day: number): ReservationGroup | undefined {
    const resvs = roomReservations.get(roomId) ?? [];
    const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
    return resvs.find((r) => r.dates.includes(dateStr));
  }

  const handleSearchSelect = (group: ReservationGroup) => {
    openReservation(group.groupId);
    setSearchQuery('');
    setShowResults(false);
  };

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
    [rooms]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Aylık Çizelge</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-surface px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Misafir ara..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                className="w-48 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
                {searchResults.map((r) => (
                  <button
                    key={r.groupId}
                    type="button"
                    onMouseDown={() => handleSearchSelect(r)}
                    className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-white/5 first:rounded-t-2xl last:rounded-b-2xl flex items-center justify-between gap-3"
                  >
                    <span className="font-medium text-white">{r.guestName}</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {r.roomNumber} · {r.startDate} → {r.endDate}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 text-center text-slate-400">
          Yükleniyor...
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel/80 p-4 shadow-soft">
          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              <div
                className="grid gap-1.5 px-4 py-4 items-center border-b border-white/5"
                style={{ gridTemplateColumns: `140px repeat(${daysInMonth}, minmax(0, 1fr))` }}
              >
                <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">Oda</div>
                {days.map((day) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-bold ${day === todayDate ? 'text-accent bg-accent/10 rounded-lg py-1' : 'text-slate-400'}`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {sortedRooms.map((room) => (
                <div
                  key={room.id}
                  className="grid gap-1.5 items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02]"
                  style={{ gridTemplateColumns: `140px repeat(${daysInMonth}, minmax(0, 1fr))` }}
                >
                  <div className="text-base font-bold text-white truncate">
                    {room.roomNumber}
                  </div>
                  {days.map((day) => {
                    const res = getReservationForDay(room.id, day);
                    const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
                    const isStart = res ? res.dates[0] === dateStr : false;
                    const isEnd = res ? res.dates[res.dates.length - 1] === dateStr : false;
                    const colorClass = res ? BLOCK_COLORS[hashColor(res.groupId)] : '';
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => res && openReservation(res.groupId)}
                        title={res ? `${res.guestName}\n${res.dates[0]} → ${res.dates[res.dates.length - 1]}\n${res.mealPlan} · ${res.totalPrice.toLocaleString('tr-TR')} TL` : ''}
                        className={
                          res
                            ? `h-12 rounded-lg bg-gradient-to-r border ${colorClass} text-left px-1.5 transition hover:brightness-125 flex items-center ${isStart ? 'rounded-l-lg' : ''} ${isEnd ? 'rounded-r-lg' : ''}`
                            : 'h-12 rounded-lg bg-white/[0.03]'
                        }
                      >
                        {res && (
                          <span className={`text-xs font-bold truncate block leading-tight ${isStart ? 'visible' : 'visible'}`}>
                            {res.guestName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {sortedRooms.length === 0 && (
                <div className="px-4 py-12 text-center text-slate-400">
                  Henüz oda kaydı bulunmamaktadır.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-3 w-3 rounded bg-white/[0.03]"></div>
          Boş
        </div>
        {BLOCK_COLORS.slice(0, 5).map((color, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
            <div className={`h-3 w-3 rounded bg-gradient-to-r border ${color}`}></div>
            Rezervasyon {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
