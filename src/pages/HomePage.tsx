import { ArrowRight, Users } from 'lucide-react';
import { useContext, useMemo } from 'react';
import { ReservationContext, getLocalDate } from '../context/ReservationContext';

export function HomePage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, openReservation } = context;

  const today = getLocalDate();
  const allTodayReservations = reservations.filter((r) => r.startDate <= today && r.endDate > today);
  const todayCheckIns = reservations.filter((r) => r.startDate === today);
  const todayCheckOuts = reservations.filter((r) => r.endDate === today);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const tomorrowCheckIns = reservations.filter((r) => r.startDate === tomorrowStr);
  const tomorrowCheckOuts = reservations.filter((r) => r.endDate === tomorrowStr);
  const occupiedRoomIds = new Set(allTodayReservations.map((r) => r.roomId));
  const pendingReservations = reservations.filter((r) => r.amountPaid < r.totalPrice);
  const formatter = useMemo(() => new Intl.NumberFormat('tr-TR'), []);

  const summaryCards = [
    { label: 'Dolu Odalar', value: occupiedRoomIds.size },
    { label: 'Boş Odalar', value: rooms.length - occupiedRoomIds.size },
  ];

  function iconFor(label: string) {
    switch (label) {
      case 'Dolu Odalar':
        return <Users className="h-5 w-5" />;
      case 'Boş Odalar':
        return <ArrowRight className="h-5 w-5" />;
      default:
        return <ArrowRight className="h-5 w-5" />;
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-3xl border-2 border-slate-600 bg-slate-900/95 p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">{card.label}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{card.value}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-accent/10 text-accent">
                {iconFor(card.label)}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { title: 'Bugün Giriş', items: todayCheckIns, empty: 'Giriş yok' },
          { title: 'Bugün Çıkış', items: todayCheckOuts, empty: 'Çıkış yok' },
          { title: 'Yarın Giriş', items: tomorrowCheckIns, empty: 'Giriş yok' },
          { title: 'Yarın Çıkış', items: tomorrowCheckOuts, empty: 'Çıkış yok' },
        ].map((card) => (
          <div key={card.title} className="overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-900/95 shadow-soft">
            <div className="bg-slate-800 px-5 py-3 border-b-2 border-slate-600">
              <h4 className="text-base font-bold text-white">{card.title}</h4>
            </div>
            <div className="p-2">
              {card.items.length === 0 ? (
                <p className="rounded-2xl bg-slate-800/70 px-4 py-3 text-sm text-slate-400">{card.empty}</p>
              ) : (
                <>
                  {card.items.slice(0, 10).map((r, i) => (
                    <button
                      key={r.groupId}
                      type="button"
                      onClick={() => openReservation(r.groupId)}
                      className={`w-full text-left rounded-xl bg-slate-800/80 hover:bg-slate-800 px-4 py-3 transition ${
                        i < Math.min(card.items.length, 10) - 1 ? 'mb-1.5' : ''
                      }`}
                    >
                      <span className="text-sm font-medium text-white">{r.guestName}</span>
                      <span className="text-sm text-slate-300 ml-2">— {r.roomNumber}</span>
                    </button>
                  ))}
                  {card.items.length > 10 && (
                    <p className="text-xs text-slate-500 text-center mt-2">
                      +{card.items.length - 10} daha
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-900/95 shadow-soft">
          <div className="bg-slate-800 px-5 py-3 border-b-2 border-slate-600">
            <h3 className="text-base font-bold text-white">Bekleyen Tahsilatlar</h3>
          </div>
          <div className="p-2">
            {pendingReservations.length === 0 ? (
              <p className="rounded-2xl bg-slate-800/70 px-4 py-3 text-sm text-slate-400">Tahsilat bekleyen yok.</p>
            ) : (
              <>
                {pendingReservations.slice(0, 10).map((r, i) => (
                  <button
                    key={r.groupId}
                    type="button"
                    onClick={() => openReservation(r.groupId)}
                    className={`w-full text-left rounded-xl bg-slate-800/80 hover:bg-slate-800 px-4 py-3 transition ${
                      i < Math.min(pendingReservations.length, 10) - 1 ? 'mb-1.5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        <span className="text-sm font-medium text-white">{r.guestName}</span>
                        <span className="text-sm text-slate-300 ml-2">— {r.roomNumber}</span>
                      </span>
                      <span className="text-xs font-semibold text-rose-400">
                        {formatter.format(r.totalPrice - r.amountPaid)} TL
                      </span>
                    </div>
                  </button>
                ))}
                {pendingReservations.length > 10 && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    +{pendingReservations.length - 10} daha
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
