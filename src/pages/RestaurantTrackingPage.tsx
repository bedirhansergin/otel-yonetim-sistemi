import { useContext, useMemo, useRef, useState } from 'react';
import {
  ReservationContext,
  buildStructuredNotes,
  getLocalDate,
  parseDate,
  parseStructuredNotes,
  type ReservationGroup,
  type YemekTakip,
} from '../context/ReservationContext';
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  Check,
  Coffee,
  Download,
  Eraser,
  FileImage,
  FileText,
  Loader2,
  Layers,
  LogIn,
  LogOut,
  Plus,
  UtensilsCrossed,
  Users,
  Wallet,
  X,
} from 'lucide-react';

const KADIOGLU_PRICE = 750;
const POYRAZ_PRICE = 300;

function getPersonCountFromNotes(notes: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/(\d{1,2})\s*k[iı][sş][iı](lik)?\b/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (n < 1) return null;
  const isKapasite =
    match[2] !== undefined && /^\s*(?:oda|yatak|suit|ranza)\b/i.test(notes.slice((match.index ?? 0) + match[0].length));
  if (isKapasite) return null;
  return Math.min(n, 25);
}

function getGuestInfo(r: ReservationGroup): { guests: string[]; namedCount: number } {
  const parsed = parseStructuredNotes(r.notes);
  const guests: string[] = [];
  let namedCount = 0;
  if (r.guestName && !/^#\d+$/.test(r.guestName)) {
    guests.push(r.guestName);
    namedCount = 1;
  } else {
    guests.push('İsimsiz Misafir');
  }
  for (const eg of parsed.extraGuests) {
    const n = eg.name.trim();
    if (!n) continue;
    guests.push(n);
    namedCount += 1;
  }
  const notesCount = getPersonCountFromNotes(r.notes);
  const total = Math.max(guests.length, notesCount ?? 0);
  let unnamedIdx = 1;
  while (guests.length < total) {
    unnamedIdx += 1;
    guests.push(`İsimsiz Misafir ${unnamedIdx}`);
  }
  return { guests, namedCount };
}

function getGuests(r: ReservationGroup): string[] {
  return getGuestInfo(r).guests;
}

function isContiguousFromZero(arr: number[]): boolean {
  if (arr.length === 0) return false;
  const set = new Set(arr);
  const max = Math.max(...arr);
  for (let i = 0; i <= max; i++) {
    if (!set.has(i)) return false;
  }
  return true;
}

function getTakip(r: ReservationGroup, guests: string[]): YemekTakip {
  const parsed = parseStructuredNotes(r.notes);
  if (parsed.yemekTakip) {
    const saved = parsed.yemekTakip.included.filter((i) => i >= 0 && i < guests.length);
    const guestCount = parsed.yemekTakip.guestCount;
    const isDefaultFull =
      saved.length > 0 &&
      (guestCount === undefined || guestCount === saved.length) &&
      isContiguousFromZero(saved);
    const included = isDefaultFull ? guests.map((_, i) => i) : saved;
    return { included, paid: parsed.yemekTakip.paid, guestCount };
  }
  return { included: guests.map((_, i) => i), paid: false, guestCount: guests.length };
}

function getNights(r: ReservationGroup): number {
  const s = parseDate(r.startDate);
  const e = parseDate(r.endDate);
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + second).toLocaleUpperCase('tr-TR');
}

function resolveVenue(r: ReservationGroup): 'restoran' | 'cafe' | null {
  const plan = (r.mealPlan ?? '').toLocaleLowerCase('tr-TR');
  if (plan === 'tam pansiyon' || plan === 'yemekli') return 'restoran';
  if (plan === 'kahvaltı' || plan === 'kahvaltılı') return 'cafe';
  const text = (r.notes ?? '').toLocaleLowerCase('tr-TR');
  if (text.includes('tam pansiyon') || text.includes('yemekli')) return 'restoran';
  if (text.includes('kahvaltılı') || text.includes('kahvaltı')) return 'cafe';
  return null;
}

interface GuestRow {
  key: string;
  reservation: ReservationGroup;
  name: string;
  index: number;
  kind: 'Ana' | 'Ek';
  nights: number;
  included: boolean;
  paid: boolean;
}

interface VenueTotals {
  count: number;
  meals: number;
  amount: number;
  paidAmount: number;
  remaining: number;
}

function computeTotals(reservations: ReservationGroup[], price: number): VenueTotals {
  let count = 0;
  let meals = 0;
  let amount = 0;
  let paidAmount = 0;
  for (const r of reservations) {
    const guests = getGuests(r);
    const takip = getTakip(r, guests);
    const nights = getNights(r);
    const c = takip.included.length;
    const a = c * nights * price;
    count += c;
    meals += c * nights;
    amount += a;
    if (takip.paid) paidAmount += a;
  }
  return { count, meals, amount, paidAmount, remaining: amount - paidAmount };
}

interface VenueTableProps {
  title: string;
  mealLabel: string;
  venue: 'restoran' | 'cafe';
  price: number;
  reservations: ReservationGroup[];
  onToggleGuest: (r: ReservationGroup, idx: number) => void;
  onTogglePaid: (r: ReservationGroup) => void;
}

function VenueTable({ title, mealLabel, venue, price, reservations, onToggleGuest, onTogglePaid }: VenueTableProps) {
  const formatter = useMemo(() => new Intl.NumberFormat('tr-TR'), []);
  const isRestoran = venue === 'restoran';
  const tone = isRestoran ? 'amber' : 'sky';

  const rows = useMemo(() => {
    const out: GuestRow[] = [];
    for (const r of reservations) {
      const guests = getGuests(r);
      const takip = getTakip(r, guests);
      const nights = getNights(r);
      guests.forEach((name, i) => {
        out.push({
          key: `${r.groupId}-${i}`,
          reservation: r,
          name,
          index: i,
          kind: i === 0 ? 'Ana' : 'Ek',
          nights,
          included: takip.included.includes(i),
          paid: takip.paid,
        });
      });
    }
    return out;
  }, [reservations]);

  const totals = useMemo(() => computeTotals(reservations, price), [reservations, price]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/90 shadow-card">
      <div
        className={`flex flex-wrap items-center gap-2.5 border-b border-slate-800 px-5 py-4 ${
          isRestoran
            ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent'
            : 'bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent'
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            isRestoran ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
          }`}
        >
          {isRestoran ? <UtensilsCrossed className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
        </span>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            isRestoran
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-sky-500/40 bg-sky-500/10 text-sky-300'
          }`}
        >
          {reservations.length} rezervasyon
        </span>
        <span className="ml-auto text-xs text-slate-400">
          Kişi başı gecelik <span className="font-semibold text-white">{formatter.format(price)} TL</span>
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 ${isRestoran ? 'text-amber-400/70' : 'text-sky-400/70'}`}>
            {isRestoran ? <UtensilsCrossed className="h-6 w-6" /> : <Coffee className="h-6 w-6" />}
          </span>
          <p className="max-w-md text-sm text-slate-400">
            {isRestoran
              ? "Akşam yemeği rezervasyonu yok. Notlarında 'Yemekli' veya 'Tam Pansiyon' yazanlar otomatik eklenir."
              : "Kahvaltı rezervasyonu yok. Notlarında 'Kahvaltılı' yazanlar otomatik eklenir."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Misafir</th>
                  <th className="px-4 py-3">Oda</th>
                  <th className="px-4 py-3 text-center">Gece</th>
                  <th className="px-4 py-3">Giriş / Çıkış</th>
                  <th className="px-4 py-3 text-center">{mealLabel}</th>
                  <th className="px-4 py-3 text-right">Ücret</th>
                  <th className="px-4 py-3 text-center">Ödendi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className={`transition-colors hover:bg-white/[0.04] ${
                      row.kind === 'Ana' ? 'border-t border-slate-800 bg-white/[0.02]' : ''
                    }`}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        {row.kind === 'Ana' ? (
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                              row.name.startsWith('İsimsiz')
                                ? 'border-slate-500/40 bg-slate-700/60 text-slate-300'
                                : isRestoran
                                  ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                                  : 'border-sky-500/30 bg-sky-500/15 text-sky-300'
                            }`}
                          >
                            {row.name.startsWith('İsimsiz') ? '?' : getInitials(row.name)}
                          </span>
                        ) : (
                          <span className="h-8 w-8 shrink-0" />
                        )}
                        <span
                          className={
                            row.kind === 'Ana'
                              ? row.name.startsWith('İsimsiz')
                                ? 'font-semibold italic text-slate-300'
                                : 'font-semibold text-white'
                              : 'text-slate-300'
                          }
                        >
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.kind === 'Ana' ? (
                        <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                          {row.reservation.roomNumber}
                        </span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.kind === 'Ana' ? (
                        <span className="text-slate-200">
                          {row.nights} <span className="text-xs text-slate-500">gece</span>
                        </span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.kind === 'Ana' ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
                            <LogIn className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            {formatTrDate(row.reservation.startDate)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
                            <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                            {formatTrDate(row.reservation.endDate)}
                          </span>
                        </div>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleGuest(row.reservation, row.index)}
                        title={
                          row.included
                            ? `${row.nights} ${mealLabel.toLowerCase()} - listeden çıkar`
                            : `${mealLabel.toLowerCase()} listesine ekle`
                        }
                        className={
                          row.included
                            ? 'mx-auto flex items-center gap-1.5 rounded-full border-2 border-emerald-400/70 bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 shadow-md shadow-emerald-500/10 transition-all hover:border-emerald-300 hover:bg-zinc-900'
                            : 'mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-500/60 bg-zinc-950 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-200'
                        }
                      >
                        {row.included ? (
                          <>
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            {row.nights}
                          </>
                        ) : (
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        )}
                      </button>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${row.included ? 'text-white' : 'text-slate-600'}`}>
                      {row.included ? `${formatter.format(row.nights * price)} TL` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.kind === 'Ana' ? (
                        <button
                          type="button"
                          onClick={() => onTogglePaid(row.reservation)}
                          title={row.paid ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}
                          className={`mx-auto flex h-7 w-12 items-center rounded-full border-2 p-0.5 transition-all ${
                            row.paid
                              ? 'justify-end border-emerald-400/80 bg-zinc-950'
                              : 'justify-start border-amber-500/70 bg-zinc-950 hover:border-amber-300'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                              row.paid ? 'bg-emerald-400 text-zinc-950' : 'bg-amber-400/80 text-transparent'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                        </button>
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className={`grid grid-cols-2 gap-3 border-t border-slate-800 bg-gradient-to-r px-5 py-4 sm:grid-cols-4 ${
              isRestoran ? 'from-amber-500/10 to-transparent' : 'from-sky-500/10 to-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-xs text-slate-400">Yemekli Kişi</p>
                <p className="text-base font-bold text-white">{totals.count}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {isRestoran ? (
                <UtensilsCrossed className="h-4 w-4 shrink-0 text-amber-400" />
              ) : (
                <Coffee className="h-4 w-4 shrink-0 text-sky-400" />
              )}
              <div>
                <p className="text-xs text-slate-400">Toplam {mealLabel}</p>
                <p className="text-base font-bold text-white">{totals.meals} adet</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-xs text-slate-400">Toplam Verecek</p>
                <p className="text-base font-bold text-white">{formatter.format(totals.amount)} TL</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <AlertCircle className={`h-4 w-4 shrink-0 ${totals.remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
              <div>
                <p className="text-xs text-slate-400">Kalan Verecek</p>
                <p className={`text-base font-bold ${totals.remaining > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {formatter.format(totals.remaining)} TL
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

interface DokumRow {
  name: string;
  room: string;
  start: string;
  end: string;
  nights: number;
  meals: number;
  amount: number;
}

interface DokumSection {
  title: string;
  mealLabel: string;
  rows: DokumRow[];
  meals: number;
  amount: number;
}

function buildDokum(restoran: ReservationGroup[], cafe: ReservationGroup[]) {
  const sections: DokumSection[] = [
    { title: 'Kadıoğlu Restoran', mealLabel: 'Akşam Yemeği', rows: [], meals: 0, amount: 0 },
    { title: 'Poyraz Cafe', mealLabel: 'Kahvaltı', rows: [], meals: 0, amount: 0 },
  ];

  const fill = (section: DokumSection, reservations: ReservationGroup[], price: number) => {
    for (const r of reservations) {
      const guests = getGuests(r);
      const takip = getTakip(r, guests);
      const nights = getNights(r);
      guests.forEach((name, i) => {
        if (!takip.included.includes(i)) return;
        section.rows.push({
          name,
          room: r.roomNumber,
          start: r.startDate,
          end: r.endDate,
          nights,
          meals: nights,
          amount: nights * price,
        });
        section.meals += nights;
        section.amount += nights * price;
      });
    }
  };

  fill(sections[0], restoran, KADIOGLU_PRICE);
  fill(sections[1], cafe, POYRAZ_PRICE);

  return {
    sections,
    dinnerMeals: sections[0].meals,
    breakfastMeals: sections[1].meals,
    totalMeals: sections[0].meals + sections[1].meals,
    totalAmount: sections[0].amount + sections[1].amount,
  };
}

function formatTrDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function formatTrDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[2]}.${parts[1]}`;
}

interface DokumModalProps {
  open: boolean;
  onClose: () => void;
  reservations: ReservationGroup[];
  dateFrom: string;
  dateTo: string;
}

function DokumModal({ open, onClose, reservations, dateFrom, dateTo }: DokumModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [scope, setScope] = useState<'both' | 'restoran' | 'cafe'>('both');

  const list = useMemo(
    () => [...reservations].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [reservations]
  );
  const restoran = useMemo(() => list.filter((r) => resolveVenue(r) === 'restoran'), [list]);
  const cafe = useMemo(() => list.filter((r) => resolveVenue(r) === 'cafe'), [list]);
  const dokum = useMemo(() => buildDokum(restoran, cafe), [restoran, cafe]);

  if (!open) return null;

  const formatter = new Intl.NumberFormat('tr-TR');
  const dateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const sections =
    scope === 'both' ? dokum.sections : scope === 'restoran' ? [dokum.sections[0]] : [dokum.sections[1]];
  const scopeTotalMeals = sections.reduce((s, x) => s + x.meals, 0);
  const scopeTotalAmount = sections.reduce((s, x) => s + x.amount, 0);
  const scopeTitle = scope === 'restoran' ? 'Kadıoğlu Restoran' : scope === 'cafe' ? 'Poyraz Cafe' : '';

  const capture = async () => {
    if (!reportRef.current) return null;
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
  };

  const downloadPng = async () => {
    setExporting(true);
    try {
      const canvas = await capture();
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restoran-dokum-${getLocalDate()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } finally {
      setExporting(false);
    }
  };

  const downloadPdf = async () => {
    setExporting(true);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`restoran-dokum-${getLocalDate()}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="my-4 w-full max-w-[860px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-card">
          <div>
            <h3 className="text-lg font-semibold text-white">Restoran Takip Dökümü</h3>
            <p className="text-xs text-slate-400">İsim Soyisim · Oda · Giriş/Çıkış · Kaç Gece · Öğün Adedi · Ücret</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl border-2 border-sky-400/70 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-sky-200 shadow-md shadow-sky-500/10 transition hover:border-sky-300 hover:bg-zinc-900 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              PDF İndir
            </button>
            <button
              type="button"
              onClick={downloadPng}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl border-2 border-slate-500 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-slate-300 hover:bg-zinc-900 disabled:opacity-60"
            >
              <FileImage className="h-4 w-4" />
              PNG İndir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-2 border-slate-500 bg-zinc-950 p-2.5 text-slate-300 transition hover:border-slate-300 hover:bg-zinc-900"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-card">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Layers className="h-3.5 w-3.5" />
            Döküm Kapsamı
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScope('both')}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-xs font-semibold transition ${
                scope === 'both'
                  ? 'border-slate-200 bg-zinc-900 text-white shadow-md shadow-white/5'
                  : 'border-slate-600 bg-zinc-950 text-slate-400 hover:border-slate-300 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Her İkisi
            </button>
            <button
              type="button"
              onClick={() => setScope('restoran')}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-xs font-semibold transition ${
                scope === 'restoran'
                  ? 'border-amber-400 bg-zinc-900 text-amber-200 shadow-md shadow-amber-500/10'
                  : 'border-slate-600 bg-zinc-950 text-slate-400 hover:border-amber-300 hover:text-amber-200'
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Sadece Restoran
            </button>
            <button
              type="button"
              onClick={() => setScope('cafe')}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-xs font-semibold transition ${
                scope === 'cafe'
                  ? 'border-sky-400 bg-zinc-900 text-sky-200 shadow-md shadow-sky-500/10'
                  : 'border-slate-600 bg-zinc-950 text-slate-400 hover:border-sky-300 hover:text-sky-200'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              Sadece Cafe
            </button>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl">
          <div ref={reportRef} className="bg-white p-8 text-slate-900" style={{ width: 794, minHeight: 1123 }}>
            <div className="mb-6 border-b-2 border-slate-900 pb-4 text-center">
              <h2 className="text-2xl font-bold">BERİVAN MOTEL</h2>
              <p className="mt-1 text-sm font-semibold">Restoran Takip Dökümü{scopeTitle ? ` — ${scopeTitle}` : ''}</p>
              <p className="mt-1 text-xs text-slate-500">
                Tarih: {dateStr}
                {(dateFrom || dateTo) &&
                  ` · Dönem: ${dateFrom ? formatTrDate(dateFrom) : 'Başlangıçsız'} – ${dateTo ? formatTrDate(dateTo) : 'Bitişsiz'}`}
              </p>
            </div>

            {sections.map((s) => (
              <div key={s.title} className="mb-6">
                <div className="mb-2 flex items-center justify-between border-b-2 border-slate-800 pb-1">
                  <h3 className="text-base font-bold">
                    {s.title} — {s.mealLabel}
                  </h3>
                  <span className="text-xs font-semibold">Toplam: {s.meals} adet</span>
                </div>
                {s.rows.length === 0 ? (
                  <p className="py-2 text-xs text-slate-500">Kayıt bulunmuyor.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-400 text-left text-xs uppercase text-slate-500">
                        <th className="py-1.5">İsim Soyisim</th>
                        <th className="py-1.5">Oda</th>
                        <th className="py-1.5">Giriş / Çıkış</th>
                        <th className="py-1.5 text-center">Kaç Gece</th>
                        <th className="py-1.5 text-center">{s.mealLabel}</th>
                        <th className="py-1.5 text-right">Ücret (TL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.rows.map((row, idx) => (
                        <tr key={`${row.name}-${row.room}-${row.start}-${idx}`} className="border-b border-slate-200">
                          <td className="py-1.5">{row.name}</td>
                          <td className="py-1.5">{row.room}</td>
                          <td className="whitespace-nowrap py-1.5">
                            {formatTrDateShort(row.start)} → {formatTrDateShort(row.end)}
                          </td>
                          <td className="py-1.5 text-center">{row.nights}</td>
                          <td className="py-1.5 text-center">{row.meals}</td>
                          <td className="py-1.5 text-right">{formatter.format(row.amount)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td className="py-1.5">TOPLAM</td>
                        <td className="py-1.5" />
                        <td className="py-1.5" />
                        <td className="py-1.5" />
                        <td className="py-1.5 text-center">{s.meals}</td>
                        <td className="py-1.5 text-right">{formatter.format(s.amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            <div className="mt-6 flex items-center justify-between border-t-2 border-slate-900 pt-3 text-sm font-bold">
              <span>
                Genel Toplam: {scopeTotalMeals} öğün
                {scope === 'both' && ` (Akşam Yemeği ${dokum.dinnerMeals} · Kahvaltı ${dokum.breakfastMeals})`}
              </span>
              <span>Genel Toplam Tutar: {formatter.format(scopeTotalAmount)} TL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RestaurantTrackingPage() {
  const context = useContext(ReservationContext);
  const [dokumOpen, setDokumOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (!context) return null;
  const { reservations, loading, updateReservationNotes } = context;

  const list = useMemo(
    () => [...reservations].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [reservations]
  );

  const visibleList = useMemo(() => {
    if (!dateFrom && !dateTo) return list;
    return list.filter((r) => {
      if (dateFrom && r.endDate <= dateFrom) return false;
      if (dateTo && r.startDate > dateTo) return false;
      return true;
    });
  }, [list, dateFrom, dateTo]);

  const restoranList = useMemo(() => visibleList.filter((r) => resolveVenue(r) === 'restoran'), [visibleList]);
  const cafeList = useMemo(() => visibleList.filter((r) => resolveVenue(r) === 'cafe'), [visibleList]);

  const notesCount = useMemo(
    () =>
      visibleList.filter((r) => {
        const venue = resolveVenue(r);
        return venue !== null && r.mealPlan !== 'Kahvaltı' && r.mealPlan !== 'Tam Pansiyon';
      }).length,
    [visibleList]
  );

  const restoranTotals = useMemo(() => computeTotals(restoranList, KADIOGLU_PRICE), [restoranList]);
  const cafeTotals = useMemo(() => computeTotals(cafeList, POYRAZ_PRICE), [cafeList]);

  const totalDinner = restoranTotals.meals;
  const totalBreakfast = cafeTotals.meals;
  const totalAmount = restoranTotals.amount + cafeTotals.amount;
  const totalRemaining = restoranTotals.remaining + cafeTotals.remaining;
  const formatter = useMemo(() => new Intl.NumberFormat('tr-TR'), []);

  const saveTakip = async (r: ReservationGroup, takip: YemekTakip) => {
    const parsed = parseStructuredNotes(r.notes);
    const venue = resolveVenue(r);
    const mealPlan = venue === 'restoran' ? 'Tam Pansiyon' : venue === 'cafe' ? 'Kahvaltı' : r.mealPlan;
    const guests = getGuests(r);
    const notes = buildStructuredNotes(parsed.cleanNotes, mealPlan, parsed.extraGuests, takip, guests.length);
    await updateReservationNotes(r.groupId, notes);
  };

  const toggleGuest = (r: ReservationGroup, idx: number) => {
    const guests = getGuests(r);
    const takip = getTakip(r, guests);
    const included = takip.included.includes(idx)
      ? takip.included.filter((i) => i !== idx)
      : [...takip.included, idx].sort((a, b) => a - b);
    void saveTakip(r, { included, paid: takip.paid });
  };

  const togglePaid = (r: ReservationGroup) => {
    const guests = getGuests(r);
    const takip = getTakip(r, guests);
    void saveTakip(r, { included: takip.included, paid: !takip.paid });
  };

  const applyToday = () => {
    const today = getLocalDate();
    setDateFrom(today);
    setDateTo(today);
  };

  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const filterActive = dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 p-6 shadow-soft">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">Restoran Takip Sistemi</p>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Restoran / Cafe Alış-Veriş</h2>
              <p className="mt-1.5 text-xs text-slate-400">
                Notlarında 'Yemekli', 'Kahvaltılı' veya 'Tam Pansiyon' yazan rezervasyonlar otomatik eklenir; notlardaki
                kişi sayısı esas alınır (bilgi yoksa 'İsimsiz Misafir' olarak görünür)
                {notesCount > 0 ? ` — ${notesCount} adet notlardan eklendi` : ''}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              {restoranList.length} Akşam Yemeği
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-300">
              <Coffee className="h-3.5 w-3.5" />
              {cafeList.length} Kahvaltı
            </span>
            <button
              type="button"
              onClick={() => setDokumOpen(true)}
              className="flex items-center gap-2 rounded-2xl border-2 border-sky-400/70 bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-sky-200 shadow-lg shadow-sky-500/10 transition hover:border-sky-300 hover:bg-zinc-900"
            >
              <Download className="h-4 w-4" />
              Döküm (PDF/PNG)
            </button>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 backdrop-blur">
          <CalendarDays className="h-4 w-4 shrink-0 text-sky-400" />
          <span className="text-sm font-semibold text-white">Tarih Filtresi</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Başlangıç tarihi"
            className="[color-scheme:dark] rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white transition focus:border-sky-400 focus:outline-none"
          />
          <span className="text-slate-500">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Bitiş tarihi"
            className="[color-scheme:dark] rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white transition focus:border-sky-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyToday}
            className="flex items-center gap-1.5 rounded-xl border-2 border-sky-500/60 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-sky-300 transition hover:border-sky-300 hover:bg-zinc-900"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Bugün
          </button>
          {filterActive && (
            <>
              <button
                type="button"
                onClick={clearFilter}
                className="flex items-center gap-1.5 rounded-xl border-2 border-slate-500 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-300 hover:bg-zinc-900"
              >
                <Eraser className="h-3.5 w-3.5" />
                Temizle
              </button>
              <span className="ml-auto rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
                {visibleList.length} rezervasyon gösteriliyor
              </span>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-10 text-center shadow-card">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <span className="text-sm text-slate-300">Yükleniyor...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-200/80">Toplam Akşam Yemeği</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {totalDinner} <span className="text-sm font-medium text-amber-200/70">adet</span>
              </p>
            </div>
            <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-sky-200/80">Toplam Kahvaltı</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                  <Coffee className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {totalBreakfast} <span className="text-sm font-medium text-sky-200/70">adet</span>
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-200/80">Toplam Verecek</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Wallet className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {formatter.format(totalAmount)} <span className="text-sm font-medium text-emerald-200/70">TL</span>
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-rose-200/80">Kalan Verecek</p>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    totalRemaining > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                </span>
              </div>
              <p className={`mt-3 text-2xl font-bold ${totalRemaining > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                {formatter.format(totalRemaining)} <span className="text-sm font-medium opacity-70">TL</span>
              </p>
            </div>
          </div>

          <VenueTable
            title="Kadıoğlu Restoran — Akşam Yemeği"
            mealLabel="Akşam Yemeği"
            venue="restoran"
            price={KADIOGLU_PRICE}
            reservations={restoranList}
            onToggleGuest={toggleGuest}
            onTogglePaid={togglePaid}
          />
          <VenueTable
            title="Poyraz Cafe — Kahvaltı"
            mealLabel="Kahvaltı"
            venue="cafe"
            price={POYRAZ_PRICE}
            reservations={cafeList}
            onToggleGuest={toggleGuest}
            onTogglePaid={togglePaid}
          />
        </>
      )}

      <DokumModal
        open={dokumOpen}
        onClose={() => setDokumOpen(false)}
        reservations={visibleList}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
}
