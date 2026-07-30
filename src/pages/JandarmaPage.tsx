import { useContext, useMemo } from 'react';
import { ReservationContext } from '../context/ReservationContext';

export function JandarmaPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { guests, reservations, loading } = context;

  const today = new Date().toISOString().slice(0, 10);
  const todayGuestIds = useMemo(
    () => new Set(reservations.filter((r) => r.dates.includes(today)).map((r) => r.guestId)),
    [reservations, today]
  );

  const todayGuests = guests.filter((g) => todayGuestIds.has(g.id));
  const reportDate = new Date().toLocaleDateString('tr-TR');

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Jandarma KBS</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Günlük Konuk Bildirimi</h2>
          </div>
          <span className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            {reportDate} · {todayGuests.length} konuk
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 text-center text-slate-400">
          Yükleniyor...
        </div>
      ) : todayGuests.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 text-center text-slate-400">
          Bugün için bildirilecek konuk bulunmamaktadır.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel/80 p-4 shadow-soft">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-300">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400">
                <th className="px-4 py-4">Ad Soyad</th>
                <th className="px-4 py-4">TC Kimlik No</th>
                <th className="px-4 py-4">Uyruk</th>
                <th className="px-4 py-4">Telefon</th>
              </tr>
            </thead>
            <tbody>
              {todayGuests.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-t border-white/5 bg-slate-900/70 hover:bg-slate-900/80"
                >
                  <td className="px-4 py-4 font-medium text-white">{guest.fullName}</td>
                  <td className="px-4 py-4">{guest.idNumber}</td>
                  <td className="px-4 py-4">{guest.nationality}</td>
                  <td className="px-4 py-4">{guest.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
