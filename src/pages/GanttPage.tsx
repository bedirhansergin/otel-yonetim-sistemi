import { useContext, useMemo, useState } from 'react';
import { ReservationContext, type ReservationGroup } from '../context/ReservationContext';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const BLOCK_COLORS = [
  'from-cyan-500/50 to-cyan-600/40 text-cyan-100 border-cyan-500/40',
  'from-emerald-500/50 to-emerald-600/40 text-emerald-100 border-emerald-500/40',
  'from-violet-500/50 to-violet-600/40 text-violet-100 border-violet-500/40',
  'from-amber-500/50 to-amber-600/40 text-amber-100 border-amber-500/40',
  'from-rose-500/50 to-rose-600/40 text-rose-100 border-rose-500/40',
  'from-sky-500/50 to-sky-600/40 text-sky-100 border-sky-500/40',
  'from-fuchsia-500/50 to-fuchsia-600/40 text-fuchsia-100 border-fuchsia-500/40',
  'from-lime-500/50 to-lime-600/40 text-lime-100 border-lime-500/40',
];

function hashColor(groupId: string): number {
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % BLOCK_COLORS.length;
}

function getWeekDates(baseDate: Date): { start: Date; end: Date; days: Date[]; dates: string[] } {
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
    dates.push(d.toISOString().slice(0, 10));
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end, days, dates };
}

function formatDateRange(start: Date, end: Date): string {
  const sD = start.getDate();
  const eD = end.getDate();
  const sM = start.getMonth();
  const eM = end.getMonth();
  const y = start.getFullYear();

  if (sM === eM) {
    return `${sD} - ${eD} ${MONTH_NAMES[sM]} ${y}`;
  }
  return `${sD} ${MONTH_NAMES[sM]} - ${eD} ${MONTH_NAMES[eM]} ${y}`;
}

export function GanttPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, loading, openReservation } = context;

  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  const week = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return reservations
      .filter((r) => r.guestName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [reservations, searchQuery]);

  const weekReservations = useMemo(() => {
    const roomMap = new Map<number, ReservationGroup[]>();
    for (const room of rooms) {
      roomMap.set(room.id, []);
    }
    for (const r of reservations) {
      if (r.dates.some((d) => week.dates.includes(d))) {
        const list = roomMap.get(r.roomId);
        if (list) list.push(r);
      }
    }
    return roomMap;
  }, [rooms, reservations, week.dates]);

  function getResForDate(roomId: number, dateStr: string): ReservationGroup | undefined {
    return (weekReservations.get(roomId) ?? []).find((r) => r.dates.includes(dateStr));
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

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Haftalık Çizelge</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {formatDateRange(week.start, week.end)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-surface px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Misafir ara..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
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
            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-surface p-1">
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o - 1)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${isCurrentWeek ? 'bg-accent/20 text-accent' : 'text-slate-400 hover:text-white'}`}
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o + 1)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 text-center text-slate-400">
          Yükleniyor...
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel/80 shadow-soft">
          <div className="grid gap-0" style={{ gridTemplateColumns: `180px repeat(7, 1fr)` }}>
            <div className="px-5 py-5 border-b border-r border-white/5">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Oda</span>
            </div>
            {week.days.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div
                  key={i}
                  className={`px-3 py-5 border-b border-r border-white/5 text-center last:border-r-0 ${isToday ? 'bg-accent/10' : ''}`}
                >
                  <p className={`text-base font-bold ${isToday ? 'text-accent' : 'text-white'}`}>
                    {d.getDate()}
                  </p>
                  <p className={`text-xs mt-0.5 uppercase tracking-wider ${isToday ? 'text-accent/70' : 'text-slate-500'}`}>
                    {DAY_NAMES[i]}
                  </p>
                </div>
              );
            })}

            {sortedRooms.map((room) => (
              <div key={room.id} className="contents">
                <div className="px-5 py-4 border-b border-r border-white/5 flex items-center">
                  <span className="text-base font-bold text-white">{room.roomNumber}</span>
                </div>
                {week.dates.map((dateStr, j) => {
                  const res = getResForDate(room.id, dateStr);
                  const isToday = dateStr === today.toISOString().slice(0, 10);
                  const colorClass = res ? BLOCK_COLORS[hashColor(res.groupId)] : '';

                  return (
                    <div
                      key={j}
                      className={`border-b border-r border-white/5 last:border-r-0 ${isToday ? 'bg-accent/[0.03]' : ''}`}
                    >
                      {res ? (
                        <button
                          type="button"
                          onClick={() => openReservation(res.groupId)}
                          className={`w-full h-full min-h-[80px] bg-gradient-to-br border-l-2 ${colorClass} px-3 py-3 text-left transition hover:brightness-110 flex flex-col justify-center`}
                        >
                          <span className="text-sm font-bold leading-tight line-clamp-2">
                            {res.guestName}
                          </span>
                          <span className="text-xs mt-1 opacity-70">
                            {res.mealPlan}
                          </span>
                        </button>
                      ) : (
                        <div className="w-full h-full min-h-[80px] px-3 py-3 text-left">
                          <span className="text-xs text-slate-600">Boş</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-3 w-3 rounded border border-white/10 bg-white/[0.03]"></div>
          Boş
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-3 w-3 rounded bg-gradient-to-br from-cyan-500/50 to-cyan-600/40 border border-cyan-500/40"></div>
          Rezervasyon
        </div>
      </div>
    </div>
  );
}
