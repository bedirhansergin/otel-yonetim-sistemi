import { FormEvent, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ReservationContext, normalizeTurkish, type ReservationGroup } from '../context/ReservationContext';
import { supabase } from '../lib/supabaseClient';

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
  } = context;

  const [formState, setFormState] = useState<ReservationGroup | null>(null);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [suggestions, setSuggestions] = useState<typeof guests>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isNew = !selectedReservation || showNewForm;

  useEffect(() => {
    if (selectedReservation && !showNewForm) {
      setFormState({ ...selectedReservation });
      setGuestSearch('');
      setError('');
    }
  }, [selectedReservation]);

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
    setFormState((cur) =>
      cur ? { ...cur, guestId: guest.id, guestName: guest.fullName } : null
    );
    setShowSuggestions(false);
  };

  const handleClose = () => {
    setShowNewForm(false);
    setFormState(null);
    setGuestSearch('');
    setError('');
    setSuggestions([]);
    setShowSuggestions(false);
    closeReservation();
  };

  function checkOverlap(): boolean {
    if (!formState) return false;
    const start = formState.startDate;
    const end = formState.endDate;
    const roomId = formState.roomId;
    const groupId = formState.groupId;

    for (const r of reservations) {
      if (r.roomId !== roomId) continue;
      if (groupId && r.groupId === groupId) continue;
      if (r.startDate < end && start < r.endDate) return true;
    }
    return false;
  }

  async function resolveGuestId(name: string): Promise<number | null> {
    if (!supabase) return null;
    const normalized = normalizeTurkish(name);
    const existing = guests.find(
      (g) => normalizeTurkish(g.fullName) === normalized
    );
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('customers')
      .insert({ full_name: name.trim(), phone: '-', id_number: '-', nationality: 'TR' })
      .select('id')
      .single();

    if (error || !data) return null;
    return data.id;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState) return;

    if (isNew) {
      const guestName = guestSearch.trim();
      if (!guestName) {
        setError('Lütfen misafir adını girin.');
        return;
      }
      if (!formState.roomId) {
        setError('Lütfen bir oda seçin.');
        return;
      }
    }

    if (formState.startDate > formState.endDate) {
      setError('Giriş tarihi çıkış tarihinden önce olmalı.');
      return;
    }

    if (checkOverlap()) {
      setError('Bu oda seçilen tarihlerde doludur. Lütfen farklı bir tarih veya oda seçin.');
      return;
    }

    setError('');
    setSaving(true);

    if (isNew && formState.groupId === '') {
      const guestName = guestSearch.trim();
      const guestId = await resolveGuestId(guestName);
      if (guestId === null) {
        setError('Misafir kaydı oluşturulamadı. Lütfen daha sonra tekrar deneyin.');
        setSaving(false);
        return;
      }

      const ok = await addReservationGroup({
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
        notes: formState.notes,
      });
      if (!ok) {
        setError('Rezervasyon eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        setSaving(false);
        return;
      }
      setShowNewForm(false);
    } else {
      const ok = await updateReservationGroup(formState);
      if (!ok) {
        setError('Güncelleme sırasında bir hata oluştu. Verileriniz korundu.');
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    handleClose();
  };

  if (!selectedReservation && !showNewForm) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => {
            setShowNewForm(true);
            setGuestSearch('');
            setFormState({
              groupId: '',
              roomId: rooms[0]?.id ?? 0,
              roomNumber: rooms[0]?.roomNumber ?? '',
              guestId: 0,
              guestName: '',
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date().toISOString().slice(0, 10),
              status: 'occupied',
              mealPlan: 'Sadece Oda',
              totalPrice: 0,
              amountPaid: 0,
              notes: '',
              dates: [],
            });
            setError('');
          }}
          className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-accent/90"
        >
          + Yeni Rezervasyon
        </button>
      </div>
    );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {isNew ? 'Yeni Rezervasyon' : 'Rezervasyon Düzenle'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {isNew
                ? 'Yeni bir rezervasyon oluşturun.'
                : `${formState.guestName} · ${formState.roomNumber}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Kapat
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {isNew ? (
            <div ref={searchRef} className="grid gap-2 text-sm text-slate-300 relative">
              <span>Misafir Adı</span>
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => handleGuestSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Misafir adını yazın..."
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-40 mt-1 rounded-xl border border-white/10 bg-slate-900 shadow-xl max-h-48 overflow-y-auto">
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
          ) : (
            <label className="grid gap-2 text-sm text-slate-300">
              Misafir
              <select
                value={formState.guestId}
                onChange={(e) => {
                  const g = guests.find((x) => x.id === parseInt(e.target.value));
                  if (g) {
                    setFormState((cur) =>
                      cur ? { ...cur, guestId: g.id, guestName: g.fullName } : null
                    );
                  }
                }}
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              >
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="grid gap-2 text-sm text-slate-300">
            Oda
            <select
              value={formState.roomId}
              onChange={(e) => handleChange('roomId', parseInt(e.target.value))}
              className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
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
            <label className="grid gap-2 text-sm text-slate-300">
              Giriş Tarihi
              <input
                type="date"
                value={formState.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Çıkış Tarihi
              <input
                type="date"
                value={formState.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-300">
              Yemek Planı
              <select
                value={formState.mealPlan}
                onChange={(e) => handleChange('mealPlan', e.target.value)}
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              >
                {mealOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Durum
              <select
                value={formState.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              >
                <option value="occupied">Dolu</option>
                <option value="reserved">Rezerve</option>
                <option value="checked_out">Çıkış Yapıldı</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-300">
              Toplam Ücret (TL)
              <input
                type="number"
                value={formState.totalPrice}
                onChange={(e) => handleChange('totalPrice', parseFloat(e.target.value) || 0)}
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Alınan Ücret (TL)
              <input
                type="number"
                value={formState.amountPaid}
                onChange={(e) => handleChange('amountPaid', parseFloat(e.target.value) || 0)}
                className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm text-slate-300">
            Notlar
            <textarea
              value={formState.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
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
        </form>
      </div>
    </div>
  );
}
