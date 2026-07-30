import { useContext } from 'react';
import { ReservationContext } from '../context/ReservationContext';

export function RoomsPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, loading } = context;

  const today = new Date().toISOString().slice(0, 10);
  const occupiedRoomIds = new Set(
    reservations.filter((r) => r.startDate <= today && r.endDate >= today).map((r) => r.roomId)
  );

  const roomStatuses = rooms.map((room) => ({
    ...room,
    status: occupiedRoomIds.has(room.id) ? 'Dolu' : 'Boş',
    currentGuest: reservations.find(
      (r) => r.roomId === room.id && r.startDate <= today && r.endDate >= today
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Odalar</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Oda Bilgileri ve Durum</h2>
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
          <div className="space-y-4">
            {roomStatuses.map((room) => (
              <div key={room.id} className="rounded-3xl bg-slate-950/80 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{room.roomNumber}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Kat: {room.floor} · Blok: {room.block ?? '-'} · {room.bedType}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        room.status === 'Boş'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {room.status}
                    </span>
                    {room.currentGuest && (
                      <span className="rounded-2xl bg-white/5 px-3 py-1 text-sm text-slate-300">
                        {room.currentGuest.guestName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
