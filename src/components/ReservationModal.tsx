import { FormEvent, useContext, useEffect, useState } from 'react';
import { ReservationContext, type ReservationGroup } from '../context/ReservationContext';

const mealOptions = ['yemeksiz', 'kahvalti', 'yarim pansiyon', 'tam pansiyon'];

export function ReservationModal() {
  const context = useContext(ReservationContext);
  if (!context) return null;

  const {
    selectedReservation,
    closeReservation,
    rooms,
    guests,
    updateReservationGroup,
    addReservationGroup,
  } = context;

  const [formState, setFormState] = useState<ReservationGroup | null>(null);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const isNew = !selectedReservation || showNewForm;

  useEffect(() => {
    if (selectedReservation && !showNewForm) {
      setFormState({ ...selectedReservation });
      setError('');
    } else if (!selectedReservation) {
      setShowNewForm(false);
    }
  }, [selectedReservation, showNewForm]);

  if (!selectedReservation && !showNewForm) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => {
            setShowNewForm(true);
            setFormState({
              groupId: '',
              roomId: rooms[0]?.id ?? 0,
              roomNumber: rooms[0]?.roomNumber ?? '',
              guestId: guests[0]?.id ?? 0,
              guestName: guests[0]?.fullName ?? '',
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date().toISOString().slice(0, 10),
              status: 'occupied',
              mealPlan: 'yemeksiz',
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
    } else if (field === 'guestId') {
      const guest = guests.find((g) => g.id === Number(value));
      setFormState((cur) =>
        cur
          ? { ...cur, guestId: Number(value), guestName: guest?.fullName ?? cur.guestName }
          : null
      );
    } else {
      setFormState((cur) => (cur ? { ...cur, [field]: value } : null));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState) return;

    if (formState.startDate > formState.endDate) {
      setError('Giriş tarihi çıkış tarihinden önce olmalı.');
      return;
    }

    setError('');

    if (isNew && formState.groupId === '') {
      await addReservationGroup({
        roomId: formState.roomId,
        roomNumber: formState.roomNumber,
        guestId: formState.guestId,
        guestName: formState.guestName,
        startDate: formState.startDate,
        endDate: formState.endDate,
        status: formState.status,
        mealPlan: formState.mealPlan,
        totalPrice: formState.totalPrice,
        amountPaid: formState.amountPaid,
        notes: formState.notes,
      });
      setShowNewForm(false);
    } else {
      await updateReservationGroup(formState);
    }
    closeReservation();
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
            onClick={closeReservation}
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
          <label className="grid gap-2 text-sm text-slate-300">
            Misafir
            <select
              value={formState.guestId}
              onChange={(e) => handleChange('guestId', parseInt(e.target.value))}
              className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-slate-300">
            Oda
            <select
              value={formState.roomId}
              onChange={(e) => handleChange('roomId', parseInt(e.target.value))}
              className="rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/60"
            >
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
              onClick={closeReservation}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200 transition hover:bg-white/10"
            >
              İptal
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent/90"
            >
              {isNew ? 'Oluştur' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
