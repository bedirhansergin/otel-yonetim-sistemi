import { ArrowRight, CalendarDays, CreditCard, Users } from 'lucide-react';
import { useContext } from 'react';
import { ReservationContext } from '../context/ReservationContext';

export function HomePage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, loading, openReservation } = context;

  const today = new Date().toISOString().slice(0, 10);
  const todayReservations = reservations.filter((r) => r.startDate <= today && r.endDate >= today);
  const todayCheckIns = reservations.filter((r) => r.startDate === today);
  const todayCheckOuts = reservations.filter((r) => r.endDate === today);
  const occupiedRoomIds = new Set(todayReservations.map((r) => r.roomId));
  const totalPending = reservations.reduce((sum, r) => sum + (r.totalPrice - r.amountPaid), 0);

  const summaryCards = [
    { label: 'Toplam Oda', value: rooms.length, icon: 'door' },
    { label: 'Dolu Odalar', value: occupiedRoomIds.size, icon: 'users' },
    { label: 'Bugün Giriş', value: todayCheckIns.length, icon: 'calendar' },
    { label: 'Bugün Çıkış', value: todayCheckOuts.length, icon: 'calendar' },
  ];

  function iconFor(label: string) {
    switch (label) {
      case 'Toplam Oda':
        return <ArrowRight className="h-5 w-5" />;
      case 'Dolu Odalar':
        return <Users className="h-5 w-5" />;
      case 'Bugün Giriş':
      case 'Bugün Çıkış':
        return <CalendarDays className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{card.value}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-accent/10 text-accent">
                {iconFor(card.label)}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Aktif Rezervasyonlar</h3>
            <p className="mt-2 text-sm text-slate-400">Bugün otelde konaklayan misafirler.</p>
          </div>
          <span className="rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300">
            {todayReservations.length} kayıt
          </span>
        </div>
        <div className="grid gap-3">
          {loading ? (
            <p className="rounded-3xl border border-dashed border-white/10 bg-surface/80 px-5 py-4 text-sm text-slate-300">
              Yükleniyor...
            </p>
          ) : todayReservations.length > 0 ? (
            todayReservations.slice(0, 10).map((res) => (
              <button
                key={res.groupId}
                type="button"
                onClick={() => openReservation(res.groupId)}
                className="w-full text-left rounded-3xl border border-white/10 bg-panel/80 px-5 py-4 text-white transition hover:border-accent/40 hover:bg-accent/5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{res.roomNumber} | {res.mealPlan}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{res.guestName}</p>
                  </div>
                  <span className="rounded-2xl bg-accent/10 px-3 py-2 text-sm text-accent">
                    {res.startDate} → {res.endDate}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="rounded-3xl border border-dashed border-white/10 bg-surface/80 px-5 py-4 text-sm text-slate-300">
              Bugün için aktif rezervasyon bulunamadı.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Giriş/Çıkış Planı</h3>
              <p className="mt-2 text-sm text-slate-400">Bugün ve yarın için detaylar.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-surface/80 p-5">
              <h4 className="text-lg font-semibold text-white">Bugün Giriş Yapacaklar</h4>
              <ul className="mt-4 space-y-3">
                {todayCheckIns.slice(0, 5).map((r) => (
                  <li key={r.groupId} className="rounded-2xl bg-slate-900/80 p-3 text-sm text-slate-200">
                    {r.guestName} - {r.roomNumber}
                  </li>
                ))}
                {todayCheckIns.length === 0 && (
                  <li className="rounded-2xl bg-slate-900/80 p-3 text-sm text-slate-400">Giriş yok</li>
                )}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-surface/80 p-5">
              <h4 className="text-lg font-semibold text-white">Bugün Çıkış Yapacaklar</h4>
              <ul className="mt-4 space-y-3">
                {todayCheckOuts.slice(0, 5).map((r) => (
                  <li key={r.groupId} className="rounded-2xl bg-slate-900/80 p-3 text-sm text-slate-200">
                    {r.guestName} - {r.roomNumber}
                  </li>
                ))}
                {todayCheckOuts.length === 0 && (
                  <li className="rounded-2xl bg-slate-900/80 p-3 text-sm text-slate-400">Çıkış yok</li>
                )}
              </ul>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-white">Bekleyen Tahsilatlar</h3>
          <p className="mt-2 text-sm text-slate-400">Kalan ödemesi olan rezervasyonlar.</p>
          <div className="mt-5 space-y-3">
            {reservations
              .filter((r) => r.amountPaid < r.totalPrice)
              .slice(0, 5)
              .map((r) => (
                <div key={r.groupId} className="rounded-3xl bg-surface/80 p-4">
                  <p className="text-sm text-slate-300">
                    {r.guestName} - {r.roomNumber}
                  </p>
                  <p className="mt-1 text-xs text-rose-400">
                    Kalan: {new Intl.NumberFormat('tr-TR').format(r.totalPrice - r.amountPaid)} TL
                  </p>
                </div>
              ))}
            {totalPending === 0 && (
              <p className="rounded-3xl bg-surface/80 p-4 text-sm text-slate-400">Tahsilat bekleyen yok.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
