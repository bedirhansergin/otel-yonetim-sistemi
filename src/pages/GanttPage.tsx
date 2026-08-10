import { useContext, useMemo, useState } from 'react';
import { ReservationContext, normalizeTurkish, getLocalDate, type ReservationGroup } from '../context/ReservationContext';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAY_ABBRS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const BLOCK_COLORS = [
  { bg: '#14532d', border: '#22c55e' },
  { bg: '#7f1d1d', border: '#ef4444' },
  { bg: '#1e3a5f', border: '#3b82f6' },
  { bg: '#78350f', border: '#f59e0b' },
  { bg: '#134e4a', border: '#14b8a6' },
  { bg: '#4a1942', border: '#d946ef' },
  { bg: '#3b3b1a', border: '#eab308' },
  { bg: '#1e293b', border: '#64748b' },
  { bg: '#3b1f47', border: '#a855f7' },
  { bg: '#1a3b2b', border: '#10b981' },
  { bg: '#4a2820', border: '#f97316' },
  { bg: '#0f2b3d', border: '#06b6d4' },
];

function getMonthInfo(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const days: { num: number; abbr: string; dateStr: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({
      num: d,
      abbr: DAY_ABBRS[(date.getDay() + 6) % 7],
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  return { days, daysInMonth };
}

interface GanttBar {
  groupId: string;
  guestName: string;
  mealPlan: string;
  startDay: number;
  endDay: number;
  startDate: string;
  endDate: string;
  bg: string;
  border: string;
}

export function GanttPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, loading, openReservation } = context;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + monthOffset);
    d.setDate(1);
    return d;
  }, [today, monthOffset]);

  const month = useMemo(() => getMonthInfo(baseDate), [baseDate]);
  const currentDay = today.getDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    const q = normalizeTurkish(trimmed);
    return reservations
      .filter((r) => normalizeTurkish(r.guestName).includes(q))
      .slice(0, 8);
  }, [reservations, searchQuery]);

  const roomBars = useMemo(() => {
    const map = new Map<number, GanttBar[]>();
    for (const room of rooms) map.set(room.id, []);

    const allBars: { roomId: number; bar: GanttBar }[] = [];
    const monthYear = baseDate.getMonth();
    const monthStart = new Date(baseDate.getFullYear(), monthYear, 1);
    const monthEnd = new Date(baseDate.getFullYear(), monthYear + 1, 0);

    for (const r of reservations) {
      const [sy, sm, sd] = r.startDate.split('-').map(Number);
      const [ey, em, ed] = r.endDate.split('-').map(Number);
      const s = new Date(sy, sm - 1, sd);
      const e = new Date(ey, em - 1, ed);

      if (
        (s.getMonth() === monthYear && s.getFullYear() === baseDate.getFullYear()) ||
        (e.getMonth() === monthYear && e.getFullYear() === baseDate.getFullYear()) ||
        (s <= monthEnd && e >= monthStart)
      ) {
        const startDay = s < monthStart ? 1 : s.getDate();
        const endDay = e > monthEnd ? monthEnd.getDate() : e.getDate();
        if (startDay <= endDay) {
          allBars.push({
            roomId: r.roomId,
            bar: {
              groupId: r.groupId,
              guestName: r.guestName,
              mealPlan: r.mealPlan,
              startDay,
              endDay,
              startDate: r.startDate,
              endDate: r.endDate,
              bg: '',
              border: '',
            },
          });
        }
      }
    }

    allBars.sort((a, b) => {
      if (a.roomId !== b.roomId) return a.roomId - b.roomId;
      return a.bar.startDay - b.bar.startDay;
    });

    let ci = 0;
    for (const { roomId, bar } of allBars) {
      const c = BLOCK_COLORS[ci % BLOCK_COLORS.length];
      bar.bg = c.bg;
      bar.border = c.border;
      ci++;
      const roomList = map.get(roomId);
      if (roomList) roomList.push(bar);
    }

    return map;
  }, [rooms, reservations, baseDate]);

  const handleSearchSelect = (group: ReservationGroup) => {
    openReservation(group.groupId);
    setSearchQuery('');
    setShowResults(false);
  };

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
    [rooms]
  );

  const todayStr = useMemo(() => getLocalDate(), []);
  const emptyRooms = useMemo(() => {
    const occupiedRoomIds = new Set<number>();
    for (const r of reservations) {
      if (r.startDate <= todayStr && r.endDate > todayStr) {
        occupiedRoomIds.add(r.roomId);
      }
    }
    return rooms.filter((room) => !occupiedRoomIds.has(room.id));
  }, [rooms, reservations, todayStr]);

  const isCurrentMonth = monthOffset === 0;
  const isTodayInView = isCurrentMonth;
  const monthYearLabel = `${MONTH_NAMES[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
  const daysInMonth = month.daysInMonth;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-900/95 p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Aylık Çizelge</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{monthYearLabel}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-500 bg-slate-800 px-4 py-3 ring-1 ring-slate-500/30">
                <Search className="h-5 w-5 text-slate-300" />
                <input
                  type="text"
                  placeholder="Misafir ara..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 150)}
                  className="w-48 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                />
              </div>
              {showResults && searchResults.length > 0 && (
                <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border-2 border-slate-600 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-600/50 bg-slate-800/50">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {searchResults.length} sonuç
                    </span>
                  </div>
                  {searchResults.map((r, i) => (
                    <button
                      key={r.groupId}
                      type="button"
                      onMouseDown={() => handleSearchSelect(r)}
                      className={`w-full text-left px-4 py-3 transition hover:bg-accent/10 group ${
                        i < searchResults.length - 1 ? 'border-b border-slate-600/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-accent transition-colors truncate">
                            {r.guestName}
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {r.startDate} → {r.endDate}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 border border-slate-600">
                          {r.roomNumber}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-2xl border-2 border-slate-600 bg-surface p-1">
              <button
                type="button"
                onClick={() => setMonthOffset((o) => o - 1)}
                className="rounded-xl p-2 text-slate-300 hover:bg-white/5 hover:text-white transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset(0)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${isCurrentMonth ? 'bg-accent/20 text-accent' : 'text-slate-300 hover:text-white'}`}
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset((o) => o + 1)}
                className="rounded-xl p-2 text-slate-300 hover:bg-white/5 hover:text-white transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border-2 border-slate-600 bg-panel/90 p-6 text-center text-slate-300">
          Yükleniyor...
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-slate-600 bg-slate-900/95 shadow-soft">
          <div className="overflow-x-auto">
            <div style={{ minWidth: '860px' }}>
              <div className="grid" style={{ gridTemplateColumns: '90px 1fr' }}>
                <div className="px-3 py-3 border-b-2 border-r-2 border-slate-600 bg-slate-900 sticky top-0 z-20">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Oda</span>
                </div>
                <div className="flex border-b-2 border-slate-600 bg-slate-900 sticky top-0 z-20">
                  {month.days.map((d) => {
                    const isToday = isTodayInView && d.num === currentDay;
                    const isWeekend = d.abbr === 'Cmt' || d.abbr === 'Paz';
                    return (
                      <div
                        key={d.num}
                        className={`flex-1 flex flex-col items-center justify-center py-2 border-r-2 border-slate-600 last:border-r-0 ${
                          isToday ? 'bg-accent/25 shadow-[inset_0_-2px_0_0] shadow-accent' : isWeekend ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-accent' : 'text-slate-400'}`}>{d.abbr}</span>
                        <span className={`text-lg font-extrabold leading-tight mt-0.5 ${isToday ? 'text-accent' : 'text-white'}`}>{d.num}</span>
                      </div>
                    );
                  })}
                </div>

                {sortedRooms.map((room, ri) => {
                  const bars = roomBars.get(room.id) ?? [];
                  const isEven = ri % 2 === 0;

                  return (
                    <div key={room.id} className="contents">
                      <div
                        className={`px-3 py-3 border-b-2 border-r-2 border-slate-600 flex items-center ${
                          isEven ? 'bg-slate-800/50' : 'bg-slate-800/70'
                        }`}
                      >
                        <span className="text-sm font-extrabold text-white tracking-wide">{room.roomNumber}</span>
                      </div>
                      <div
                        className={`relative border-b-2 border-slate-600 ${isEven ? 'bg-slate-800/10' : 'bg-slate-800/5'}`}
                        style={{ height: '52px' }}
                      >
                        {/* Weekend shading */}
                        {month.days.map((d, i) => {
                          const isWeekend = d.abbr === 'Cmt' || d.abbr === 'Paz';
                          if (!isWeekend) return null;
                          return (
                            <div
                              key={`we-${d.num}`}
                              className="absolute top-0 bottom-0"
                              style={{
                                left: `${(i / daysInMonth) * 100}%`,
                                width: `${(1 / daysInMonth) * 100}%`,
                                backgroundColor: 'rgba(30,41,59,0.2)',
                              }}
                            />
                          );
                        })}

                        {/* Today column highlight */}
                        {isTodayInView && (
                          <div
                            className="absolute top-0 bottom-0 bg-accent/20 pointer-events-none"
                            style={{
                              left: `${((currentDay - 1) / daysInMonth) * 100}%`,
                              width: `${(1 / daysInMonth) * 100}%`,
                            }}
                          />
                        )}

                        {/* Date column dividers */}
                        {month.days.map((d, i) =>
                          i < daysInMonth - 1 ? (
                            <div
                              key={`col-${d.num}`}
                              className="absolute top-0 bottom-0 border-r-2 border-slate-600 pointer-events-none"
                              style={{ left: `${((i + 1) / daysInMonth) * 100}%` }}
                            />
                          ) : null
                        )}

                        {/* Check-in/out guide lines - from header to this row */}
                        {bars.map((bar) => (
                          <div key={`guide-${bar.groupId}`}>
                            <div
                              className="absolute border-r-2 border-amber-400/60 pointer-events-none"
                              style={{
                                left: `${((bar.startDay - 1) / daysInMonth) * 100}%`,
                                top: `-${ri * 52}px`,
                                height: `${(ri + 1) * 52}px`,
                              }}
                            />
                            <div
                              className="absolute border-r-2 border-amber-400/60 pointer-events-none"
                              style={{
                                left: `${(bar.endDay / daysInMonth) * 100}%`,
                                top: `-${ri * 52}px`,
                                height: `${(ri + 1) * 52}px`,
                              }}
                            />
                          </div>
                        ))}

                        {/* Today marker */}
                        {isTodayInView && (
                          <div
                            className="absolute -top-[1px] -bottom-[1px] w-[3px] bg-accent z-20 rounded-full pointer-events-none"
                            style={{ left: `${((currentDay - 1) / daysInMonth) * 100}%` }}
                          />
                        )}

                        {/* Reservation bars */}
                        {bars.map((bar) => (
                          <button
                            key={bar.groupId}
                            type="button"
                            onClick={() => openReservation(bar.groupId)}
                            className="absolute top-0 bottom-0 flex items-center gap-1.5 overflow-hidden hover:brightness-125 transition z-10 font-bold text-sm text-white/95 shadow-lg"
                            style={{
                              left: `${((bar.startDay - 1) / daysInMonth) * 100}%`,
                              width: `calc(${((bar.endDay - bar.startDay + 1) / daysInMonth) * 100}% - 2px)`,
                              backgroundColor: bar.bg,
                              borderLeft: `4px solid ${bar.border}`,
                              borderRight: `4px solid ${bar.border}`,
                              borderTop: `3px solid ${bar.border}`,
                              borderBottom: `3px solid ${bar.border}`,
                              paddingLeft: '6px',
                              paddingRight: '6px',
                            }}
                            title={`${bar.guestName}\n${bar.startDate} → ${bar.endDate}\n${bar.mealPlan}`}
                          >
                            <span className="line-clamp-2 leading-tight">{bar.guestName}</span>
                            <span className="text-xs opacity-80 truncate hidden sm:inline font-normal">{bar.mealPlan}</span>
                          </button>
                        ))}

                        {bars.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[11px] text-slate-500">boş</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="px-3 py-3 border-r-2 border-slate-600 bg-slate-900">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Oda</span>
                </div>
                <div className="flex border-t-2 border-slate-600 bg-slate-900">
                  {month.days.map((d) => {
                    const isToday = isTodayInView && d.num === currentDay;
                    return (
                      <div
                        key={`ft-${d.num}`}
                        className={`flex-1 flex flex-col items-center justify-center py-2 border-r-2 border-slate-600 last:border-r-0 ${
                          isToday ? 'bg-accent/25' : ''
                        }`}
                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-accent' : 'text-slate-400'}`}>{d.abbr}</span>
                        <span className={`text-lg font-extrabold leading-tight mt-0.5 ${isToday ? 'text-accent' : 'text-white'}`}>{d.num}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 rounded-3xl border-2 border-slate-600 bg-slate-900/95 p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="h-3 w-3 rounded border-2 border-slate-600" />
          Boş
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: '#14532d', borderLeft: '3px solid #22c55e' }} />
          Dolu
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="h-[2px] w-6 rounded-full bg-accent/70" />
          Bugün
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="h-0.5 w-4 bg-amber-400/60 rounded-full" />
          Giriş / Çıkış
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(30,41,59,0.2)' }} />
          Hafta sonu
        </div>
      </div>

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-900/95 p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Boş Odaların Listesi</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">
          Bugün ({todayStr.split('-').reverse().join('.')})
        </h2>
        {emptyRooms.length === 0 ? (
          <p className="mt-4 text-slate-400">Bugün tüm odalar dolu.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {emptyRooms
              .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
              .map((room) => (
                <div
                  key={room.id}
                  className="flex flex-col items-center gap-1 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 px-4 py-3"
                >
                  <span className="text-lg font-extrabold text-emerald-400">{room.roomNumber}</span>
                  <span className="text-[11px] text-slate-400">{room.bedType}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
