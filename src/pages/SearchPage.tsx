import { useContext, useMemo, useState } from 'react';
import {
  ReservationContext,
  normalizeTurkish,
  parseStructuredNotes,
} from '../context/ReservationContext';
import {
  Search,
  UserSearch,
  StickyNote,
  Phone,
  CreditCard,
  Globe2,
  CalendarDays,
  DoorOpen,
  FileText,
} from 'lucide-react';

function norm(value: string): string {
  return normalizeTurkish(value);
}

function Highlighted({
  text,
  query,
  tone = 'sky',
}: {
  text: string;
  query: string;
  tone?: 'sky' | 'amber';
}) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const idx = text.toLocaleLowerCase('tr-TR').indexOf(trimmed.toLocaleLowerCase('tr-TR'));
  if (idx === -1) return <>{text}</>;
  const markClass =
    tone === 'sky' ? 'bg-sky-400/30 text-sky-100' : 'bg-amber-400/30 text-amber-100';
  return (
    <>
      {text.slice(0, idx)}
      <mark className={`rounded px-0.5 ${markClass}`}>{text.slice(idx, idx + trimmed.length)}</mark>
      {text.slice(idx + trimmed.length)}
    </>
  );
}

export function SearchPage() {
  const context = useContext(ReservationContext);
  const [guestQuery, setGuestQuery] = useState('');
  const [noteQuery, setNoteQuery] = useState('');

  if (!context) return null;
  const { guests, reservations, openReservation } = context;

  const formatter = useMemo(() => new Intl.NumberFormat('tr-TR'), []);

  const guestMatches = useMemo(() => {
    const q = norm(guestQuery.trim());
    if (!q) return [];
    return guests.filter((g) => norm(g.fullName).includes(q));
  }, [guests, guestQuery]);

  const noteMatches = useMemo(() => {
    const q = norm(noteQuery.trim());
    if (!q) return [];
    return reservations
      .filter((r) => norm(r.notes ?? '').includes(q))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [reservations, noteQuery]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border-2 border-slate-500/60 bg-slate-900/95 p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Arama</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Arama Merkezi</h2>
          </div>
          <span className="rounded-3xl bg-slate-800/95 px-4 py-3 text-sm text-slate-300">
            {guests.length} misafir · {reservations.length} rezervasyon
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border-2 border-sky-500/40 bg-slate-900/95 shadow-soft">
        <div className="bg-slate-800 px-5 py-3 border-b-2 border-slate-500/60 flex items-center gap-2.5">
          <UserSearch className="h-4 w-4 text-sky-400" />
          <h3 className="text-base font-bold text-white">Misafir Arama</h3>
          {guestQuery.trim() !== '' && (
            <span className="ml-auto rounded-full bg-sky-500/15 border border-sky-500/40 px-3 py-0.5 text-xs font-semibold text-sky-300">
              {guestMatches.length} sonuç
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sky-400" />
            <input
              type="text"
              value={guestQuery}
              onChange={(e) => setGuestQuery(e.target.value)}
              placeholder="Misafir adı veya soyadı ile arayın..."
              className="w-full rounded-2xl border-2 border-sky-500/50 bg-black/60 py-3.5 pl-12 pr-4 text-base text-white placeholder-slate-400 outline-none transition focus:border-sky-400 focus:bg-black/80 focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
          <div className="mt-4 space-y-3">
            {guestQuery.trim() === '' ? (
              <p className="rounded-2xl bg-black/70 px-4 py-6 text-center text-sm text-slate-400 border border-slate-600/30">
                Ad veya soyad yazmaya başlayın, sonuçlar anında listelenir.
              </p>
            ) : guestMatches.length === 0 ? (
              <p className="rounded-2xl bg-black/70 px-4 py-6 text-center text-sm text-slate-400 border border-slate-600/30">
                "{guestQuery}" ile eşleşen misafir bulunamadı.
              </p>
            ) : (
              <>
                {guestMatches.slice(0, 50).map((guest) => {
                  const guestReservations = reservations.filter((r) => r.guestId === guest.id);
                  return (
                    <div
                      key={guest.id}
                      className="rounded-2xl bg-black/90 border border-slate-600/40 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-base font-semibold text-white">
                          <Highlighted text={guest.fullName} query={guestQuery} />
                        </p>
                        <span className="rounded-full bg-sky-500/15 border border-sky-500/40 px-3 py-1 text-xs font-semibold text-sky-300">
                          {guestReservations.length} rezervasyon
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                          {guest.phone || '—'}
                        </span>
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                          {guest.idNumber || '—'}
                        </span>
                        <span className="flex items-center gap-2">
                          <Globe2 className="h-4 w-4 shrink-0 text-slate-400" />
                          {guest.nationality || '—'}
                        </span>
                      </div>
                      {guestReservations.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {guestReservations.map((r) => (
                            <button
                              key={r.groupId}
                              type="button"
                              onClick={() => openReservation(r.groupId)}
                              className="w-full text-left rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-600/40 hover:border-sky-500/50 px-4 py-3 transition"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <span className="inline-flex items-center gap-1.5 font-medium text-white">
                                    <DoorOpen className="h-4 w-4 text-sky-400/80" />
                                    {r.roomNumber}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                                    <CalendarDays className="h-4 w-4 text-slate-400" />
                                    {r.startDate} → {r.endDate}
                                  </span>
                                </div>
                                {r.amountPaid < r.totalPrice && (
                                  <span className="text-xs font-semibold text-rose-400">
                                    {formatter.format(r.totalPrice - r.amountPaid)} TL kalan
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {guestMatches.length > 50 && (
                  <p className="text-xs text-slate-500 text-center">
                    +{guestMatches.length - 50} daha
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-slate-900/95 shadow-soft">
        <div className="bg-slate-800 px-5 py-3 border-b-2 border-slate-500/60 flex items-center gap-2.5">
          <StickyNote className="h-4 w-4 text-amber-400" />
          <h3 className="text-base font-bold text-white">Not Arama</h3>
          {noteQuery.trim() !== '' && (
            <span className="ml-auto rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-0.5 text-xs font-semibold text-amber-300">
              {noteMatches.length} sonuç
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400" />
            <input
              type="text"
              value={noteQuery}
              onChange={(e) => setNoteQuery(e.target.value)}
              placeholder="Rezervasyon notları içinde arayın..."
              className="w-full rounded-2xl border-2 border-amber-500/50 bg-black/60 py-3.5 pl-12 pr-4 text-base text-white placeholder-slate-400 outline-none transition focus:border-amber-400 focus:bg-black/80 focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <div className="mt-4 space-y-3">
            {noteQuery.trim() === '' ? (
              <p className="rounded-2xl bg-black/70 px-4 py-6 text-center text-sm text-slate-400 border border-slate-600/30">
                Rezervasyonlara girdiğiniz notlar içinde arama yapın.
              </p>
            ) : noteMatches.length === 0 ? (
              <p className="rounded-2xl bg-black/70 px-4 py-6 text-center text-sm text-slate-400 border border-slate-600/30">
                "{noteQuery}" ile eşleşen not bulunamadı.
              </p>
            ) : (
              <>
                {noteMatches.slice(0, 50).map((r) => {
                  const parsed = parseStructuredNotes(r.notes);
                  const noteText = (parsed.cleanNotes.trim() || (r.notes ?? '').trim()).trim();
                  return (
                    <button
                      key={r.groupId}
                      type="button"
                      onClick={() => openReservation(r.groupId)}
                      className="w-full text-left rounded-2xl bg-black/90 hover:bg-gray-900 border border-slate-600/40 hover:border-amber-500/50 px-5 py-4 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-base font-semibold text-white">{r.guestName}</p>
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                          <DoorOpen className="h-4 w-4 text-amber-400/80" />
                          {r.roomNumber} · {r.startDate} → {r.endDate}
                        </span>
                      </div>
                      <div className="mt-2 flex items-start gap-2 text-sm text-slate-200">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" />
                        {noteText ? (
                          <p className="whitespace-pre-line">
                            <Highlighted text={noteText} query={noteQuery} tone="amber" />
                          </p>
                        ) : (
                          <p className="italic text-slate-400">Not metni yok</p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {noteMatches.length > 50 && (
                  <p className="text-xs text-slate-500 text-center">
                    +{noteMatches.length - 50} daha
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
