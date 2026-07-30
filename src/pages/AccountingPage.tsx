import { useContext, useMemo } from 'react';
import { ReservationContext } from '../context/ReservationContext';

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

  const summary = [
    { label: 'Toplam Ücret', value: new Intl.NumberFormat('tr-TR').format(totals.total) + ' TL' },
    { label: 'Alınan Ücret', value: new Intl.NumberFormat('tr-TR').format(totals.paid) + ' TL' },
    { label: 'Kalan Ücret', value: new Intl.NumberFormat('tr-TR').format(totals.pending) + ' TL' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Muhasebe Panosu</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Finansal Özet</h2>
          </div>
          <span className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            {reservations.length} rezervasyon
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 text-center text-slate-400">
          Yükleniyor...
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {summary.map((item) => (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft"
              >
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-panel/80 p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-white mb-4">Bekleyen Tahsilatlar</h3>
            <div className="space-y-3">
              {pendingReservations.map((r) => (
                <div
                  key={r.groupId}
                  className="rounded-3xl bg-slate-900/80 p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-white font-medium">{r.guestName}</p>
                    <p className="text-sm text-slate-400">
                      {r.roomNumber} · {r.startDate} → {r.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-300 font-semibold">
                      Kalan: {new Intl.NumberFormat('tr-TR').format(r.totalPrice - r.amountPaid)} TL
                    </p>
                    <p className="text-xs text-slate-400">
                      Toplam: {new Intl.NumberFormat('tr-TR').format(r.totalPrice)} TL
                    </p>
                  </div>
                </div>
              ))}
              {pendingReservations.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">
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
