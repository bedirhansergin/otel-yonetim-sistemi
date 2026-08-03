import { ArrowRight, CreditCard, Database, Trash2, Undo2, Users } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { ReservationContext, getLocalDate } from '../context/ReservationContext';
import { getBackups, deleteBackup, clearAllBackups, type BackupEntry } from '../lib/backup';

export function HomePage() {
  const context = useContext(ReservationContext);
  if (!context) return null;
  const { rooms, reservations, openReservation, restoreBackup } = context;
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (showBackups) setBackups(getBackups());
  }, [showBackups]);

  const today = getLocalDate();
  const allTodayReservations = reservations.filter((r) => r.startDate <= today && r.endDate >= today);
  const todayCheckIns = reservations.filter((r) => r.startDate === today);
  const todayCheckOuts = reservations.filter((r) => r.endDate === today);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const tomorrowCheckIns = reservations.filter((r) => r.startDate === tomorrowStr);
  const tomorrowCheckOuts = reservations.filter((r) => r.endDate === tomorrowStr);
  const occupiedRoomIds = new Set(allTodayReservations.map((r) => r.roomId));
  const totalPending = reservations.reduce((sum, r) => sum + (r.totalPrice - r.amountPaid), 0);
  const pendingReservations = reservations.filter((r) => r.amountPaid < r.totalPrice);

  const summaryCards = [
    { label: 'Dolu Odalar', value: occupiedRoomIds.size, icon: 'users' },
    { label: 'Boş Odalar', value: rooms.length - occupiedRoomIds.size, icon: 'door' },
  ];

  function iconFor(label: string) {
    switch (label) {
      case 'Dolu Odalar':
        return <Users className="h-5 w-5" />;
      case 'Boş Odalar':
        return <ArrowRight className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-3xl border-2 border-slate-600 bg-slate-950/90 p-6 shadow-soft">
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

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { title: 'Bugün Giriş', items: todayCheckIns, empty: 'Giriş yok' },
          { title: 'Bugün Çıkış', items: todayCheckOuts, empty: 'Çıkış yok' },
          { title: 'Yarın Giriş', items: tomorrowCheckIns, empty: 'Giriş yok' },
          { title: 'Yarın Çıkış', items: tomorrowCheckOuts, empty: 'Çıkış yok' },
        ].map((card) => (
          <div key={card.title} className="overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-950/90 shadow-soft">
            <div className="bg-slate-800 px-5 py-3 border-b-2 border-slate-600">
              <h4 className="text-base font-bold text-white">{card.title}</h4>
            </div>
            <div className="p-2">
              {card.items.length === 0 ? (
                <p className="rounded-2xl bg-slate-900/50 px-4 py-3 text-sm text-slate-500">{card.empty}</p>
              ) : (
                card.items.slice(0, 10).map((r, i) => (
                  <button
                    key={r.groupId}
                    type="button"
                    onClick={() => openReservation(r.groupId)}
                    className={`w-full text-left rounded-xl bg-slate-900/60 hover:bg-slate-800 px-4 py-3 transition ${
                      i < card.items.slice(0, 10).length - 1 ? 'mb-1.5' : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{r.guestName}</span>
                    <span className="text-sm text-slate-400 ml-2">— {r.roomNumber}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-950/90 shadow-soft">
          <div className="bg-slate-800 px-5 py-3 border-b-2 border-slate-600">
            <h3 className="text-base font-bold text-white">Bekleyen Tahsilatlar</h3>
          </div>
          <div className="p-2">
            {pendingReservations.length === 0 ? (
              <p className="rounded-2xl bg-slate-900/50 px-4 py-3 text-sm text-slate-500">Tahsilat bekleyen yok.</p>
            ) : (
              pendingReservations.slice(0, 10).map((r, i) => (
                <button
                  key={r.groupId}
                  type="button"
                  onClick={() => openReservation(r.groupId)}
                  className={`w-full text-left rounded-xl bg-slate-900/60 hover:bg-slate-800 px-4 py-3 transition ${
                    i < pendingReservations.slice(0, 10).length - 1 ? 'mb-1.5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="text-sm font-medium text-white">{r.guestName}</span>
                      <span className="text-sm text-slate-400 ml-2">— {r.roomNumber}</span>
                    </span>
                    <span className="text-xs font-semibold text-rose-400">
                      {new Intl.NumberFormat('tr-TR').format(r.totalPrice - r.amountPaid)} TL
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-slate-600 bg-slate-950/90 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-slate-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Veri Koruma Yedekleri</h3>
              <p className="text-sm text-slate-400">Her rezervasyon düzenlemesinde otomatik yedek alınır.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBackups(!showBackups)}
            className="rounded-2xl border border-slate-600 bg-surface px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition"
          >
            {showBackups ? 'Gizle' : `Yedekler (${getBackups().length})`}
          </button>
        </div>

        {showBackups && (
          <div className="mt-5">
            {backups.length === 0 ? (
              <p className="rounded-2xl bg-surface/60 p-4 text-sm text-slate-400">Henüz yedek bulunmuyor. Rezervasyon düzenledikçe otomatik oluşacak.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500">{backups.length} yedek (son 50)</span>
                  <button
                    type="button"
                    onClick={() => { clearAllBackups(); setBackups([]); }}
                    className="rounded-xl px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    Tümünü Sil
                  </button>
                </div>
                <div className="grid gap-2 max-h-80 overflow-y-auto">
                  {backups.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-surface/60 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(b.timestamp).toLocaleString('tr-TR')} · {b.operation === 'update_before' ? 'Düzenleme öncesi' : 'Yeni kayıt'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={restoringId === b.id}
                          onClick={async () => {
                            setRestoringId(b.id);
                            await restoreBackup(b);
                            setRestoringId(null);
                            setBackups(getBackups());
                          }}
                          className="rounded-xl p-2 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
                          title="Bu yedeği geri yükle"
                        >
                          <Undo2 className={`h-4 w-4 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { deleteBackup(b.id); setBackups(getBackups()); }}
                          className="rounded-xl p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Bu yedeği sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
