import { useContext, useMemo } from 'react';
import { ReservationContext } from '../context/ReservationContext';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function GanttPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, loading, openReservation } = context;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDate = today.getDate();
  const todayStr = today.toISOString().slice(0, 10);

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const roomReservations = useMemo(() => {
    const map = new Map<number, typeof reservations>();
    for (const room of rooms) {
      const roomResvs = reservations.filter(
        (r) => r.roomId === room.id && r.dates.some((d) => d.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`))
      );
      map.set(room.id, roomResvs);
    }
    return map;
  }, [rooms, reservations, currentYear, currentMonth]);

  function getReservationForDay(roomId: number, day: number): (typeof reservations)[0] | undefined {
    const resvs = roomReservations.get(roomId) ?? [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return resvs.find((r) => r.dates.includes(dateStr));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Aylık Çizelge</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>
          <span className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            {rooms.length} oda
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 text-center text-slate-400">
          Yükleniyor...
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel/80 p-4 shadow-soft">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px] space-y-3">
              <div
                className="grid gap-2 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-500"
                style={{ gridTemplateColumns: `120px repeat(${daysInMonth}, minmax(0, 1fr))` }}
              >
                <div>Oda</div>
                {days.map((day) => (
                  <div
                    key={day}
                    className={`text-center ${day === todayDate ? 'text-accent font-bold' : ''}`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="grid gap-2 items-center px-4 py-3 border-t border-white/5"
                  style={{ gridTemplateColumns: `120px repeat(${daysInMonth}, minmax(0, 1fr))` }}
                >
                  <div className="font-semibold text-white text-sm truncate">
                    {room.roomNumber}
                  </div>
                  {days.map((day) => {
                    const res = getReservationForDay(room.id, day);
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isStart = res?.dates[0] === dateStr;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => res && openReservation(res.groupId)}
                        title={res ? `${res.guestName} - ${res.dates[0]} → ${res.dates[res.dates.length - 1]}` : ''}
                        className={
                          res
                            ? 'h-10 rounded-lg bg-accent/30 text-accent text-left px-1 transition hover:bg-accent/50'
                            : 'h-10 rounded-lg bg-white/5'
                        }
                      >
                        {res && isStart ? (
                          <span className="text-xs font-semibold truncate block">
                            {res.guestName}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
