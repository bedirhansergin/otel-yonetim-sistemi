import { useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ReservationContext, normalizeTurkish, parseStructuredNotes, buildStructuredNotes, getLocalDate, NEW_GROUP_ID, type ReservationGroup, type ExtraGuest } from '../context/ReservationContext';
import { supabase } from '../lib/supabaseClient';
import { Trash2 } from 'lucide-react';
import { ErrorDisplay } from './ErrorDisplay';

const mealOptions = ['Sadece Oda', 'Kahvaltı', 'Tam Pansiyon'];

export function ReservationModal() {
  const context = useContext(ReservationContext);
  if (!context) return null;

  const {
    selectedReservation,
    closeReservation,
    rooms,
    guests,
    reservations,
    updateReservationGroup,
    addReservationGroup,
    selectedGroupId,
    deleteReservationGroup,
  } = context;

  const [formState, setFormState] = useState<ReservationGroup | null>(null);
  const [error, setError] = useState('');
  const [errorDialog, setErrorDialog] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [suggestions, setSuggestions] = useState<typeof guests>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guestPhone, setGuestPhone] = useState('');
  const [guestIdNumber, setGuestIdNumber] = useState('');
  const [extraGuests, setExtraGuests] = useState<ExtraGuest[]>([]);
  const [egCounter, setEgCounter] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const isNew = !selectedReservation || showNewForm || selectedGroupId === NEW_GROUP_ID;

  const nights = useMemo(() => {
    if (!formState?.startDate || !formState?.endDate) return 0;
    const [sy, sm, sd] = formState.startDate.split('-').map(Number);
    const [ey, em, ed] = formState.endDate.split('-').map(Number);
    const diff = Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd);
    return Math.round(diff / 86400000) + 1;
  }, [formState?.startDate, formState?.endDate]);

  const handleClose = useCallback(() => {
    setShowNewForm(false);
    setFormState(null);
    setGuestSearch('');
    setGuestPhone('');
    setGuestIdNumber('');
    setExtraGuests([]);
    setEgCounter(0);
    setError('');
    setErrorDialog(null);
    setSuggestions([]);
    setShowSuggestions(false);
    closeReservation();
  }, [closeReservation]);

  useEffect(() => {
    if (selectedGroupId === NEW_GROUP_ID) {
      setShowNewForm(true);
      setGuestSearch('');
      setGuestPhone('');
      setGuestIdNumber('');
      setExtraGuests([]);
      setEgCounter(0);
      setFormState({
        groupId: '',
        roomId: rooms[0]?.id ?? 0,
        roomNumber: rooms[0]?.roomNumber ?? '',
        guestId: 0,
        guestName: '',
        startDate: getLocalDate(),
        endDate: getLocalDate(),
        status: 'occupied',
        mealPlan: 'Sadece Oda',
        totalPrice: 0,
        amountPaid: 0,
        notes: '',
        dates: [],
      });
      setError('');
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedReservation && !showNewForm) {
      const parsed = parseStructuredNotes(selectedReservation.notes);
      setFormState({ ...selectedReservation, notes: parsed.cleanNotes || null });
      setExtraGuests(parsed.extraGuests);
      const g = guests.find((x) => x.id === selectedReservation.guestId);
      setGuestPhone(g ? (g.phone !== '-' ? g.phone : '') : '');
      setGuestIdNumber(g ? (g.idNumber !== '-' ? g.idNumber : '') : '');
      setGuestSearch(selectedReservation.guestName);
      setSuggestions([]);
      setShowSuggestions(false);
      setError('');
    }
  }, [selectedReservation, guests, showNewForm]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (errorDialog) {
        setErrorDialog(null);
        return;
      }
      handleClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, errorDialog]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGuestSearch = (value: string) => {
    setGuestSearch(value);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = normalizeTurkish(value);
    const matches = guests.filter((g) => normalizeTurkish(g.fullName).includes(q)).slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const selectGuest = (guest: (typeof guests)[0]) => {
    setGuestSearch(guest.fullName);
    setGuestPhone(guest.phone !== '-' ? guest.phone : '');
    setGuestIdNumber(guest.idNumber !== '-' ? guest.idNumber : '');
    setFormState((cur) =>
      cur ? { ...cur, guestId: guest.id, guestName: guest.fullName } : null
    );
    setShowSuggestions(false);
  };

  function checkOverlap(): { guestName: string; startDate: string; endDate: string } | null {
    if (!formState) return null;
    const start = formState.startDate;
    const end = formState.endDate;
    const roomId = formState.roomId;
    const groupId = formState.groupId;

    for (const r of reservations) {
      if (r.roomId !== roomId) continue;
      if (groupId && r.groupId === groupId) continue;
      if (r.startDate < end && start < r.endDate) {
        return { guestName: r.guestName, startDate: r.startDate, endDate: r.endDate };
      }
    }
    return null;
  }

  async function resolveGuestId(name: string, phone: string, idNumber: string): Promise<number | null> {
    if (!supabase) return null;
    const normalized = normalizeTurkish(name);
    const existing = guests.find(
      (g) => normalizeTurkish(g.fullName) === normalized
    );
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('customers')
      .insert({ full_name: name.trim(), phone: phone || '-', id_number: idNumber || '-', nationality: 'TR' })
      .select('id')
      .single();

    if (error || !data) return null;
    return data.id;
  }

  async function updateGuestInfo(guestId: number, name: string, phone: string, idNumber: string) {
    if (!supabase || guestId <= 0) return;
    try {
      await supabase
        .from('customers')
        .update({ full_name: name.trim() || undefined, phone: phone || '-', id_number: idNumber || '-' })
        .eq('id', guestId);
    } catch {
      /* misafir güncelleme başarısız olursa kritik değil */
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState) return;

    if (isNew) {
      const guestName = guestSearch.trim();
      if (!guestName) {
        setErrorDialog('Lütfen misafir adını girin.');
        return;
      }
      if (!formState.roomId) {
        setErrorDialog('Lütfen bir oda seçin.');
        return;
      }
    }

    if (formState.startDate > formState.endDate) {
      setErrorDialog('Giriş tarihi çıkış tarihinden önce olmalı (en az 1 gece).');
      return;
    }

    const conflict = checkOverlap();
    if (conflict) {
      setErrorDialog(`${formState.roomNumber} numaralı oda seçilen tarihlerde ${conflict.guestName} tarafından dolu (${conflict.startDate} → ${conflict.endDate}). Lütfen farklı bir tarih veya oda seçin.`);
      return;
    }

    setErrorDialog(null);
    setSaving(true);

    if (isNew && formState.groupId === '') {
      const guestName = guestSearch.trim();
      const guestId = await resolveGuestId(guestName, guestPhone, guestIdNumber);
      if (guestId === null) {
        setErrorDialog('Misafir kaydı oluşturulamadı. Lütfen daha sonra tekrar deneyin.');
        setSaving(false);
        return;
      }
      await updateGuestInfo(guestId, guestName, guestPhone, guestIdNumber);

      const finalNotes = buildStructuredNotes(formState.notes ?? '', formState.mealPlan, extraGuests);
      const result = await addReservationGroup({
        roomId: formState.roomId,
        roomNumber: formState.roomNumber,
        guestId,
        guestName,
        startDate: formState.startDate,
        endDate: formState.endDate,
        status: formState.status,
        mealPlan: formState.mealPlan,
        totalPrice: formState.totalPrice,
        amountPaid: formState.amountPaid,
        notes: finalNotes,
      });
      if (!result.ok) {
        setErrorDialog(result.error || 'Rezervasyon veritabanına eklenemedi.');
        setSaving(false);
        return;
      }
      setSaving(false);
      handleClose();
    } else {
      const updatedName = guestSearch.trim();
      let guestId = formState.guestId;
      if (updatedName && normalizeTurkish(updatedName) !== normalizeTurkish(formState.guestName)) {
        const resolvedId = await resolveGuestId(updatedName, guestPhone, guestIdNumber);
        if (resolvedId !== null) guestId = resolvedId;
      }
      await updateGuestInfo(guestId, updatedName, guestPhone, guestIdNumber);
      const updatedFormState = { ...formState, guestId, guestName: updatedName };
      const result = await updateReservationGroup({
        ...updatedFormState,
        notes: buildStructuredNotes(formState.notes ?? '', formState.mealPlan, extraGuests),
      });
      if (!result.ok) {
        setErrorDialog(result.error || 'Güncelleme sırasında bir hata oluştu. Verileriniz korundu.');
        setSaving(false);
        return;
      }
      setSaving(false);
      setErrorDialog(null);
      handleClose();
    }
  };

  if (!selectedReservation && !showNewForm) {
    return null;
  }

  if (!formState) return null;

  const handleChange = (field: keyof ReservationGroup, value: string | number) => {
    if (field === 'roomId') {
      const room = rooms.find((r) => r.id === Number(value));
      setFormState((cur) =>
        cur
          ? { ...cur, roomId: Number(value), roomNumber: room?.roomNumber ?? cur.roomNumber }
          : null
      );
    } else {
      setFormState((cur) => (cur ? { ...cur, [field]: value } : null));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 px-4 py-6">
      {errorDialog && (
        <ErrorDisplay message={errorDialog} variant="modal" onClose={() => setErrorDialog(null)} />
      )}
      <div className="w-full max-w-2xl rounded-3xl border-2 border-slate-600 bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {isNew ? 'Yeni Rezervasyon' : 'Rezervasyon Düzenle'}
            </h2>
            <p className="mt-1 text-sm text-white/80">
              {isNew
                ? 'Yeni bir rezervasyon oluşturun.'
                : `${formState.guestName} · ${formState.roomNumber}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border-2 border-slate-600 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Kapat
          </button>
        </div>

        {error ? (
          <div className="mt-5">
            <ErrorDisplay message={error} />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {isNew ? (
            <>
              <div ref={searchRef} className="grid gap-2 text-sm text-white relative">
                <span>Misafir Adı</span>
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => handleGuestSearch(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Misafir adını yazın..."
                  className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
                />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-40 mt-1 rounded-xl border-2 border-slate-600 bg-slate-900 shadow-xl max-h-48 overflow-y-auto">
                    {suggestions.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selectGuest(g)}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl"
                      >
                        {g.fullName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-white">
                  Telefon
                  <input
                    type="text"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="5XX XXX XX XX"
                    className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  TC Kimlik No
                  <input
                    type="text"
                    value={guestIdNumber}
                    onChange={(e) => setGuestIdNumber(e.target.value)}
                    placeholder="11 haneli"
                    maxLength={11}
                    className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
            <div ref={searchRef} className="grid gap-2 text-sm text-white relative">
              <span>Misafir Adı</span>
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => handleGuestSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Misafir adını yazın..."
                className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-40 mt-1 rounded-xl border-2 border-slate-600 bg-slate-900 shadow-xl max-h-48 overflow-y-auto">
                  {suggestions.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectGuest(g)}
                      className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {g.fullName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-white">
                Telefon
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="5XX XXX XX XX"
                  className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
                />
              </label>
              <label className="grid gap-2 text-sm text-white">
                TC Kimlik No
                <input
                  type="text"
                  value={guestIdNumber}
                  onChange={(e) => setGuestIdNumber(e.target.value)}
                  placeholder="11 haneli"
                  maxLength={11}
                  className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
                />
              </label>
            </div>
            </>
          )}

          <label className="grid gap-2 text-sm text-white">
            Oda
            <select
              value={formState.roomId}
              onChange={(e) => handleChange('roomId', parseInt(e.target.value))}
              className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
            >
              {isNew && <option value={0}>Oda seçin...</option>}
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.bedType})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-white">
              Giriş Tarihi
              <input
                type="date"
                value={formState.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
            <label className="grid gap-2 text-sm text-white">
              Çıkış Tarihi
              <input
                type="date"
                value={formState.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
          </div>

          {nights > 0 ? (
            <div className="rounded-2xl border-2 border-accent/30 bg-accent/10 px-4 py-3 text-center">
              <span className="text-base font-bold text-accent">
                {nights} Gece
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-slate-600 bg-slate-900/60 px-4 py-3 text-center">
              <span className="text-sm text-white/70">
                Giriş ve çıkış tarihlerini seçin
              </span>
            </div>
          )}

          <label className="grid gap-2 text-sm text-white">
              Yemek Planı
              <select
                value={formState.mealPlan}
                onChange={(e) => handleChange('mealPlan', e.target.value)}
                className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              >
                {mealOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-white">
              Toplam Ücret (TL)
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formState.totalPrice || ''}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  handleChange('totalPrice', val === '' ? 0 : parseFloat(val));
                }}
                className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
            <label className="grid gap-2 text-sm text-white">
              Alınan Ücret (TL)
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formState.amountPaid || ''}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  handleChange('amountPaid', val === '' ? 0 : parseFloat(val));
                }}
                className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
          </div>

          <div className="border-t-2 border-slate-600 pt-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-sm font-semibold text-white">Ek Misafirler</span>
              <button
                type="button"
                onClick={() => {
                  setExtraGuests([...extraGuests, { name: '', phone: '', tc: '', _key: egCounter }]);
                  setEgCounter((c) => c + 1);
                }}
                className="rounded-xl border-2 border-slate-500 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 hover:border-slate-400 transition"
              >
                + Misafir Ekle
              </button>
            </div>
            {extraGuests.map((eg, i) => (
              <div key={eg._key ?? i} className="grid gap-3 sm:grid-cols-3 mb-3 p-3 rounded-2xl border border-slate-600 bg-slate-800/60">
                <label className="grid gap-1 text-xs text-white/80">
                  İsim
                  <input
                    type="text"
                    value={eg.name}
                    onChange={(e) => {
                      const updated = [...extraGuests];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setExtraGuests(updated);
                    }}
                    placeholder="Ad Soyad"
                    className="rounded-xl border border-slate-600 bg-surface px-3 py-2 text-sm text-white outline-none transition focus:border-accent/60"
                  />
                </label>
                <label className="grid gap-1 text-xs text-white/80">
                  Telefon
                  <input
                    type="text"
                    value={eg.phone}
                    onChange={(e) => {
                      const updated = [...extraGuests];
                      updated[i] = { ...updated[i], phone: e.target.value };
                      setExtraGuests(updated);
                    }}
                    placeholder="5XX XXX XX XX"
                    className="rounded-xl border border-slate-600 bg-surface px-3 py-2 text-sm text-white outline-none transition focus:border-accent/60"
                  />
                </label>
                <label className="grid gap-1 text-xs text-white/80">
                  TC Kimlik
                  <input
                    type="text"
                    value={eg.tc}
                    onChange={(e) => {
                      const updated = [...extraGuests];
                      updated[i] = { ...updated[i], tc: e.target.value };
                      setExtraGuests(updated);
                    }}
                    placeholder="11 haneli"
                    maxLength={11}
                    className="rounded-xl border border-slate-600 bg-surface px-3 py-2 text-sm text-white outline-none transition focus:border-accent/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setExtraGuests(extraGuests.filter((_, j) => j !== i))}
                  className="sm:col-span-3 rounded-xl border-2 border-rose-500/50 bg-rose-600/20 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-600/30 hover:border-rose-400 transition mt-2 text-center"
                >
                  Ek Misafir'i Kaldır
                </button>
              </div>
            ))}
            {extraGuests.length === 0 && (
              <p className="text-xs text-white/70">Ek misafir bulunmuyor.</p>
            )}
          </div>

          <label className="grid gap-2 text-sm text-white">
            Notlar
            <textarea
              value={formState.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="rounded-2xl border-2 border-slate-600 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
            {!isNew ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!formState) return;
                  if (!confirm('Bu rezervasyonu silmek istediğinize emin misiniz?')) return;
                  setSaving(true);
                  try {
                    const ok = await deleteReservationGroup(formState.groupId);
                    if (ok) handleClose();
                    else { setErrorDialog('Silme sırasında bir hata oluştu.'); setSaving(false); }
                  } catch {
                    setErrorDialog('Silme sırasında bir hata oluştu.');
                    setSaving(false);
                  }
                }}
                className="rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="rounded-2xl border-2 border-slate-600 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent/90 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Kaydediliyor...' : isNew ? 'Oluştur' : 'Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
