import { useContext } from 'react';
import { ReservationContext } from '../context/ReservationContext';

export function GuestsPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { guests, loading } = context;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Misafir Bilgileri</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Misafir Kayıtları</h2>
          </div>
          <span className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            {guests.length} kayıt
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 text-center text-slate-400">
          Yükleniyor...
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel/80 p-4 shadow-soft">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-300">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400">
                <th className="px-4 py-4">İsim</th>
                <th className="px-4 py-4">Telefon</th>
                <th className="px-4 py-4">TC Kimlik</th>
                <th className="px-4 py-4">Uyruk</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-t border-white/5 bg-slate-900/70 hover:bg-slate-900/80"
                >
                  <td className="px-4 py-4 font-medium text-white">{guest.fullName}</td>
                  <td className="px-4 py-4">{guest.phone}</td>
                  <td className="px-4 py-4">{guest.idNumber}</td>
                  <td className="px-4 py-4">{guest.nationality}</td>
                </tr>
              ))}
              {guests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Henüz kayıtlı misafir bulunmamaktadır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
