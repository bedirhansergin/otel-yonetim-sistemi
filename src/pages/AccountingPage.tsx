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
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-950/90 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Muhasebe Panosu</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Finansal Özet</h2>
          </div>
          <span className="rounded-3xl bg-slate-900/90 px-4 py-3 text-sm text-slate-300">
            {reservations.length} rezervasyon
          </span>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-950/90 p-5 shadow-soft text-center">
        <p className="text-lg font-semibold text-white">Yüce Rabbim bereketimizi artırsın.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-950/90 shadow-soft">
        <div className="bg-slate-800 px-5 py-3 border-b-2 border-slate-600">
          <h3 className="text-base font-bold text-white text-center">Bereket Duası</h3>
        </div>
        <div className="p-5 space-y-3">
          {[
            { ar: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', tr: 'Allah\'ım, bize verdiğin rızıkta bereket kıl ve bizi cehennem azabından koru.' },
            { ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا', tr: 'Allah\'ım, senden faydalı ilim, helal rızık ve kabul olunmuş amel dilerim.' },
          ].map((d, i) => (
            <div key={i} className="rounded-2xl bg-slate-900/60 p-4 space-y-2">
              <p className="text-xl text-right text-white leading-relaxed" style={{ direction: 'rtl' }}>{d.ar}</p>
              <p className="text-sm text-slate-400 italic">{d.tr}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border-2 border-slate-600 bg-panel/90 p-6 text-center text-slate-400">
          Yükleniyor...
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {summary.map((item) => (
              <article
                key={item.label}
                className="rounded-3xl border-2 border-slate-600 bg-slate-950/90 p-6 shadow-soft"
              >
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border-2 border-slate-600 bg-panel/90 p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-white mb-4">Bekleyen Tahsilatlar</h3>
            <div className="space-y-3">
              {pendingReservations.map((r) => (
                <div
                  key={r.groupId}
                  className="rounded-3xl bg-slate-900/90 p-5 flex items-center justify-between gap-4"
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
