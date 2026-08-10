import { useContext, useMemo } from 'react';
import { ReservationContext } from '../context/ReservationContext';
import { Loader2 } from 'lucide-react';

export function AccountingPage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { reservations, loading } = context;

  const totals = useMemo(() => {
    const total = reservations.reduce((sum, r) => sum + r.totalPrice, 0);
    const paid = reservations.reduce((sum, r) => sum + r.amountPaid, 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [reservations]);

  const pendingReservations = useMemo(
    () => reservations.filter((r) => r.amountPaid < r.totalPrice),
    [reservations]
  );

  const formatter = useMemo(() => new Intl.NumberFormat('tr-TR'), []);

  const summary = [
    { label: 'Toplam Ücret', value: formatter.format(totals.total) + ' TL' },
    { label: 'Alınan Ücret', value: formatter.format(totals.paid) + ' TL' },
    { label: 'Kalan Ücret', value: formatter.format(totals.pending) + ' TL' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-900/95 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Muhasebe Panosu</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Finansal Özet</h2>
          </div>
          <span className="rounded-3xl bg-slate-800/95 px-4 py-3 text-sm text-slate-300">
            {reservations.length} rezervasyon
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border-2 border-slate-600 bg-panel/90 p-6 text-center text-slate-300">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span>Yükleniyor...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {summary.map((item) => (
              <article
                key={item.label}
                className="rounded-3xl border-2 border-slate-600 bg-slate-900/95 p-6 shadow-soft"
              >
                <p className="text-sm text-slate-300">{item.label}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border-2 border-slate-600 bg-panel/90 p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-white mb-4">Bekleyen Tahsilatlar</h3>
            <div className="space-y-3">
              {pendingReservations.map((r) => (
                <button
                  key={r.groupId}
                  type="button"
                  onClick={() => context.openReservation(r.groupId)}
                  className="rounded-3xl bg-slate-800/95 p-5 flex items-center justify-between gap-4 hover:bg-slate-700/95 transition w-full text-left"
                >
                  <div>
                    <p className="text-white font-medium">{r.guestName}</p>
                    <p className="text-sm text-slate-300">
                      {r.roomNumber} · {r.startDate} → {r.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-300 font-semibold">
                      Kalan: {formatter.format(r.totalPrice - r.amountPaid)} TL
                    </p>
                    <p className="text-xs text-slate-300">
                      Toplam: {formatter.format(r.totalPrice)} TL
                    </p>
                  </div>
                </button>
              ))}
              {pendingReservations.length === 0 && (
                <p className="text-sm text-slate-300 text-center py-4">
                  Bekleyen tahsilat bulunmamaktadır.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
