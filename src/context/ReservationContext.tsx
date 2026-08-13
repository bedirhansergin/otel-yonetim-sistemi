import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  fetchRooms,
  fetchCustomers,
  fetchReservations,
  supabase,
  type DbReservation,
  type DbRoom,
  type DbCustomer,
} from '../lib/supabaseClient';
import { saveBackup, type BackupEntry } from '../lib/backup';

export interface Room {
  id: number;
  roomNumber: string;
  block: string | null;
  floor: number;
  bedType: string;
}

export interface Guest {
  id: number;
  fullName: string;
  phone: string;
  idNumber: string;
  nationality: string;
}

export interface ReservationGroup {
  groupId: string;
  roomId: number;
  roomNumber: string;
  guestId: number;
  guestName: string;
  startDate: string;
  endDate: string;
  status: string;
  mealPlan: string;
  totalPrice: number;
  amountPaid: number;
  notes: string | null;
  dates: string[];
}

export interface ReservationContextValue {
  rooms: Room[];
  guests: Guest[];
  reservations: ReservationGroup[];
  loading: boolean;
  selectedReservation: ReservationGroup | null;
  openReservation: (groupId: string) => void;
  closeReservation: () => void;
  openNewReservation: () => void;
  selectedGroupId: string | null;
  addReservationGroup: (group: Omit<ReservationGroup, 'groupId' | 'dates'>) => Promise<{ ok: boolean; error?: string }>;
  updateReservationGroup: (group: ReservationGroup) => Promise<{ ok: boolean; error?: string }>;
  restoreBackup: (entry: BackupEntry) => Promise<boolean>;
  deleteReservationGroup: (groupId: string) => Promise<boolean>;
}

export const ReservationContext = createContext<ReservationContextValue | null>(null);

export const NEW_GROUP_ID = '__new__';

export interface ExtraGuest {
  name: string;
  phone: string;
  tc: string;
  _key?: number;
}

export function parseStructuredNotes(notes: string | null): { cleanNotes: string; mealPlan: string | null; extraGuests: ExtraGuest[] } {
  const raw = (notes ?? '').trimEnd();
  const lines = raw.split('\n');
  const metaStart = lines.findIndex((l) => l.startsWith('-- ') && (l.includes('Kahvaltı') || l.includes('Tam Pansiyon') || l.startsWith('-- Misafir:')));

  let cleanNotes = raw;
  let mealPlan: string | null = null;
  const extraGuests: ExtraGuest[] = [];

  if (metaStart >= 0) {
    cleanNotes = lines.slice(0, metaStart).join('\n').trimEnd();
    const metaLines = lines.slice(metaStart);

    for (const ml of metaLines) {
      if (ml === '-- Kahvaltı') mealPlan = 'Kahvaltı';
      else if (ml === '-- Tam Pansiyon') mealPlan = 'Tam Pansiyon';
      else if (ml.startsWith('-- Misafir: ')) {
        const parts = ml.slice(12).split('|');
        extraGuests.push({
          name: (parts[0] ?? '').trim(),
          phone: (parts[1] ?? '').trim(),
          tc: (parts[2] ?? '').trim(),
        });
      }
    }
  }

  return { cleanNotes, mealPlan, extraGuests };
}

export function buildStructuredNotes(cleanNotes: string, mealPlan: string, extraGuests: ExtraGuest[]): string {
  const parts: string[] = [];
  if (cleanNotes.trim()) parts.push(cleanNotes.trimEnd());

  if (mealPlan === 'Kahvaltı' || mealPlan === 'Tam Pansiyon') {
    parts.push(`-- ${mealPlan}`);
  }

  for (const eg of extraGuests) {
    const name = eg.name.trim();
    if (!name) continue;
    parts.push(`-- Misafir: ${name} | ${eg.phone.trim()} | ${eg.tc.trim()}`);
  }

  return parts.join('\n');
}

function mapMealPlanToDisplay(dbMealPlan: string, notes: string | null): string {
  const parsed = parseStructuredNotes(notes);
  if (parsed.mealPlan) return parsed.mealPlan;

  const db = dbMealPlan.toLowerCase();
  if (db === 'yemekli' || db === 'tam_pansiyon') return 'Tam Pansiyon';
  if (db === 'kahvalti' || db === 'kahvaltı') return 'Kahvaltı';
  return 'Sadece Oda';
}

function mapMealPlanToDb(display: string): string {
  if (display === 'Kahvaltı') return 'yemekli';
  if (display === 'Tam Pansiyon') return 'yemekli';
  return 'yemeksiz';
}

function groupReservations(
  dbReservations: DbReservation[],
  roomsMap: Map<number, Room>,
  guestsMap: Map<number, Guest>
): ReservationGroup[] {
  const groupMap = new Map<string, DbReservation[]>();
  for (const r of dbReservations) {
    const existing = groupMap.get(r.group_id) ?? [];
    existing.push(r);
    groupMap.set(r.group_id, existing);
  }

  const groups: ReservationGroup[] = [];
  for (const [groupId, rows] of groupMap) {
    if (rows.length === 0) continue;
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const first = rows[0];
    const last = rows[rows.length - 1];
    const room = roomsMap.get(first.room_id);
    const guest = guestsMap.get(first.customer_id);

    const lastPlusOne = new Date(last.date);
    lastPlusOne.setDate(lastPlusOne.getDate() + 1);

    groups.push({
      groupId,
      roomId: first.room_id,
      roomNumber: room?.roomNumber ?? `#${first.room_id}`,
      guestId: first.customer_id,
      guestName: guest?.fullName ?? `#${first.customer_id}`,
      startDate: first.date,
      endDate: formatDate(lastPlusOne),
      status: first.status,
      mealPlan: mapMealPlanToDisplay(first.meal_plan, first.notes),
      totalPrice: first.total_price,
      amountPaid: first.amount_paid,
      notes: first.notes,
      dates: rows.map((r) => r.date),
    });
  }
  groups.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return groups;
}

export function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

const CLEANUP_KEY = 'checkout_day_cleanup_v1';

async function cleanupOldReservations() {
  if (!supabase) return;
  if (localStorage.getItem(CLEANUP_KEY)) return;

  const { data: allRows } = await supabase
    .from('reservations')
    .select('id, group_id, date')
    .order('date', { ascending: true });

  if (!allRows || allRows.length === 0) {
    localStorage.setItem(CLEANUP_KEY, 'true');
    return;
  }

  const groups = new Map<string, { firstDate: string; lastRow: { id: number; date: string }; count: number }>();

  for (const row of allRows) {
    const entry = groups.get(row.group_id);
    if (!entry) {
      groups.set(row.group_id, { firstDate: row.date, lastRow: row, count: 1 });
    } else {
      if (row.date > entry.lastRow.date) {
        entry.lastRow = row;
      }
      if (row.date < entry.firstDate) {
        entry.firstDate = row.date;
      }
      entry.count++;
    }
  }

  for (const [groupId, entry] of groups) {
    if (entry.count <= 1) continue;

    const daysDiff = Math.round(
      (new Date(entry.lastRow.date).getTime() - new Date(entry.firstDate).getTime()) / 86400000
    );

    if (entry.count === daysDiff + 1) {
      await supabase.from('reservations').delete().eq('id', entry.lastRow.id);
      console.log(`Temizlendi: grup ${groupId}, checkout günü ${entry.lastRow.date} silindi`);
    }
  }

  localStorage.setItem(CLEANUP_KEY, 'true');
}

export function normalizeTurkish(value: string): string {
  return value
    .replace(/İ/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [dbReservations, setDbReservations] = useState<DbReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [roomsRes, guestsRes, reservationsRes] = await Promise.all([
      fetchRooms(),
      fetchCustomers(),
      fetchReservations(),
    ]);

    if (roomsRes.error) console.warn('Oda verisi yüklenirken hata:', roomsRes.error.message);
    if (guestsRes.error) console.warn('Misafir verisi yüklenirken hata:', guestsRes.error.message);
    if (reservationsRes.error) console.warn('Rezervasyon verisi yüklenirken hata:', reservationsRes.error.message);

    const roomList: Room[] = (roomsRes.data ?? []).map((r: DbRoom) => ({
      id: r.id,
      roomNumber: r.room_number,
      block: r.block,
      floor: r.floor,
      bedType: r.bed_type,
    }));

    const guestList: Guest[] = (guestsRes.data ?? []).map((g: DbCustomer) => ({
      id: g.id,
      fullName: g.full_name,
      phone: g.phone,
      idNumber: g.id_number,
      nationality: g.nationality,
    }));

    setRooms(roomList);
    setGuests(guestList);
    setDbReservations((reservationsRes.data ?? []) as DbReservation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadReservationsOnly = useCallback(async () => {
    const { data } = await fetchReservations();
    if (data) setDbReservations(data as DbReservation[]);
  }, []);

  const loadMetaOnly = useCallback(async () => {
    const [roomsRes, guestsRes] = await Promise.all([fetchRooms(), fetchCustomers()]);
    if (roomsRes.data) {
      setRooms(
        (roomsRes.data as DbRoom[]).map((r) => ({
          id: r.id,
          roomNumber: r.room_number,
          block: r.block,
          floor: r.floor,
          bedType: r.bed_type,
        }))
      );
    }
    if (guestsRes.data) {
      setGuests(
        (guestsRes.data as DbCustomer[]).map((g) => ({
          id: g.id,
          fullName: g.full_name,
          phone: g.phone,
          idNumber: g.id_number,
          nationality: g.nationality,
        }))
      );
    }
  }, []);

  const debounceReservationsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceMetaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const db = supabase;

    const channel = db
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          if (debounceReservationsRef.current) clearTimeout(debounceReservationsRef.current);
          debounceReservationsRef.current = setTimeout(() => { void loadReservationsOnly(); }, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          if (debounceMetaRef.current) clearTimeout(debounceMetaRef.current);
          debounceMetaRef.current = setTimeout(() => { void loadMetaOnly(); }, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          if (debounceMetaRef.current) clearTimeout(debounceMetaRef.current);
          debounceMetaRef.current = setTimeout(() => { void loadMetaOnly(); }, 300);
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && err) {
          console.warn('Realtime aboneliği başarısız:', err.message);
        }
      });

    return () => {
      void db.removeChannel(channel);
      if (debounceReservationsRef.current) clearTimeout(debounceReservationsRef.current);
      if (debounceMetaRef.current) clearTimeout(debounceMetaRef.current);
    };
  }, [loadReservationsOnly, loadMetaOnly]);

  const roomsMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const guestsMap = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const reservations = useMemo(
    () => groupReservations(dbReservations, roomsMap, guestsMap),
    [dbReservations, roomsMap, guestsMap]
  );

  const selectedReservation = useMemo(
    () => reservations.find((r) => r.groupId === selectedGroupId) ?? null,
    [reservations, selectedGroupId]
  );

  const openReservation = (groupId: string) => setSelectedGroupId(groupId);
  const closeReservation = () => setSelectedGroupId(null);
  const openNewReservation = () => setSelectedGroupId(NEW_GROUP_ID);

  const refreshCustomersAndRooms = useCallback(async () => {
    if (!supabase) return;
    const [roomsRes, guestsRes] = await Promise.all([
      fetchRooms(),
      fetchCustomers(),
    ]);
    if (roomsRes.data) {
      setRooms(
        (roomsRes.data as DbRoom[]).map((r) => ({
          id: r.id,
          roomNumber: r.room_number,
          block: r.block,
          floor: r.floor,
          bedType: r.bed_type,
        }))
      );
    }
    if (guestsRes.data) {
      setGuests(
        (guestsRes.data as DbCustomer[]).map((g) => ({
          id: g.id,
          fullName: g.full_name,
          phone: g.phone,
          idNumber: g.id_number,
          nationality: g.nationality,
        }))
      );
    }
  }, []);

  async function resolveOldCheckoutConflicts(roomId: number, newDates: string[]): Promise<boolean> {
    if (!supabase || newDates.length === 0) return false;

    const { data: conflicts } = await supabase
      .from('reservations')
      .select('id, group_id, date')
      .eq('room_id', roomId)
      .in('date', newDates);

    if (!conflicts || conflicts.length === 0) return true;

    for (const c of conflicts) {
      const { data: groupLast } = await supabase
        .from('reservations')
        .select('date')
        .eq('group_id', c.group_id)
        .order('date', { ascending: false })
        .limit(1);

      if (groupLast && groupLast.length > 0 && groupLast[0].date === c.date) {
        await supabase.from('reservations').delete().eq('id', c.id);
        console.log(`Eski checkout günü temizlendi: oda ${roomId}, tarih ${c.date}, grup ${c.group_id}`);
      } else {
        return false;
      }
    }

    return true;
  }

  const addReservationGroup = useCallback(async (group: Omit<ReservationGroup, 'groupId' | 'dates'>): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) return { ok: false, error: 'Veritabanı bağlantısı yok.' };
    const groupId = crypto.randomUUID();
    const date = parseDate(group.startDate);
    const endDate = parseDate(group.endDate);
    const rows: Omit<DbReservation, 'id' | 'created_at'>[] = [];

    while (date < endDate) {
      rows.push({
        room_id: group.roomId,
        customer_id: group.guestId,
        date: formatDate(date),
        status: group.status,
        group_id: groupId,
        total_price: group.totalPrice,
        amount_paid: group.amountPaid,
        notes: group.notes,
        meal_plan: mapMealPlanToDb(group.mealPlan),
      });
      date.setDate(date.getDate() + 1);
    }

    const { error } = await supabase.from('reservations').insert(rows);

    if (error) {
      const resolved = await resolveOldCheckoutConflicts(group.roomId, rows.map((r) => r.date));
      if (resolved) {
        const { error: retryErr } = await supabase.from('reservations').insert(rows);
        if (retryErr) {
          return { ok: false, error: retryErr.message };
        }
      } else {
        return { ok: false, error: error.message };
      }
    }

    const now = new Date().toISOString();
    const newRows: DbReservation[] = rows.map((r) => ({
      id: 0,
      room_id: r.room_id,
      customer_id: r.customer_id,
      date: r.date,
      status: r.status,
      group_id: r.group_id,
      total_price: r.total_price ?? 0,
      amount_paid: r.amount_paid ?? 0,
      notes: r.notes ?? null,
      created_at: now,
      meal_plan: r.meal_plan ?? 'yemeksiz',
    }));

    setDbReservations((prev) => [...prev, ...newRows]);

    saveBackup({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: 'create_after',
      label: `${group.guestName} - ${group.roomNumber} (${group.startDate} → ${group.endDate})`,
      reservation: {
        groupId,
        roomId: group.roomId,
        roomNumber: group.roomNumber,
        guestId: group.guestId,
        guestName: group.guestName,
        startDate: group.startDate,
        endDate: group.endDate,
        status: group.status,
        mealPlan: group.mealPlan,
        totalPrice: group.totalPrice,
        amountPaid: group.amountPaid,
        notes: group.notes,
        dates: rows.map((r) => r.date),
      },
    });

    await refreshCustomersAndRooms();

    return { ok: true };
  }, [refreshCustomersAndRooms]);

  const updateReservationGroup = useCallback(async (group: ReservationGroup): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) return { ok: false, error: 'Veritabanı bağlantısı yok.' };

    const oldReservation = reservations.find((r) => r.groupId === group.groupId);
    if (oldReservation) {
      saveBackup({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation: 'update_before',
        label: `${oldReservation.guestName} - ${oldReservation.roomNumber} (${oldReservation.startDate} → ${oldReservation.endDate})`,
        reservation: { ...oldReservation },
      });
    }

    const { data: oldRows } = await supabase
      .from('reservations')
      .select('id,room_id,customer_id,date,status,group_id,total_price,amount_paid,notes,meal_plan')
      .eq('group_id', group.groupId);

    const { error: deleteErr } = await supabase
      .from('reservations')
      .delete()
      .eq('group_id', group.groupId);
    if (deleteErr) return { ok: false, error: `Silme hatası: ${deleteErr.message}` };

    const date = parseDate(group.startDate);
    const endDate = parseDate(group.endDate);
    const rows: Omit<DbReservation, 'id' | 'created_at'>[] = [];

    while (date < endDate) {
      rows.push({
        room_id: group.roomId,
        customer_id: group.guestId,
        date: formatDate(date),
        status: group.status,
        group_id: group.groupId,
        total_price: group.totalPrice,
        amount_paid: group.amountPaid,
        notes: group.notes,
        meal_plan: mapMealPlanToDb(group.mealPlan),
      });
      date.setDate(date.getDate() + 1);
    }

    try {
      let insertErr = (await supabase.from('reservations').insert(rows)).error;

      if (insertErr) {
        const resolved = await resolveOldCheckoutConflicts(group.roomId, rows.map((r) => r.date));
        if (resolved) {
          insertErr = (await supabase.from('reservations').insert(rows)).error;
        }
      }

      if (insertErr) {
        if (oldRows && oldRows.length > 0) {
          const restoreRows = oldRows.map(({ id, ...rest }) => rest);
          const { error: restoreErr } = await supabase.from('reservations').insert(restoreRows);
          if (restoreErr) console.warn('Rollback başarısız, veri kaybı olabilir:', restoreErr.message);
        }
        return { ok: false, error: `Ekleme hatası: ${insertErr.message}` };
      }
    } catch (e: unknown) {
      if (oldRows && oldRows.length > 0) {
        const restoreRows = oldRows.map(({ id, ...rest }) => rest);
        try {
          const { error: restoreErr } = await supabase.from('reservations').insert(restoreRows);
          if (restoreErr) console.warn('Rollback başarısız, veri kaybı olabilir:', restoreErr.message);
        } catch {
          console.warn('Rollback başarısız, veri kaybı olabilir.');
        }
      }
      return { ok: false, error: `Beklenmeyen hata: ${e instanceof Error ? e.message : 'bilinmiyor'}` };
    }

    const now = new Date().toISOString();
    const newRows: DbReservation[] = rows.map((r) => ({
      id: 0,
      room_id: r.room_id,
      customer_id: r.customer_id,
      date: r.date,
      status: r.status,
      group_id: r.group_id,
      total_price: r.total_price ?? 0,
      amount_paid: r.amount_paid ?? 0,
      notes: r.notes ?? null,
      created_at: now,
      meal_plan: r.meal_plan ?? 'yemeksiz',
    }));

    setDbReservations((prev) => [
      ...prev.filter((r) => r.group_id !== group.groupId),
      ...newRows,
    ]);

    await refreshCustomersAndRooms();

    return { ok: true };
  }, [refreshCustomersAndRooms, reservations]);

  const restoreBackup = async (entry: BackupEntry): Promise<boolean> => {
    if (!supabase) return false;
    const r = entry.reservation;

    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('group_id', r.groupId)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error: delErr } = await supabase.from('reservations').delete().eq('group_id', r.groupId);
      if (delErr) return false;
    }

    const datesToUse = (r.dates && r.dates.length > 0)
      ? r.dates
      : (() => {
          const d = parseDate(r.startDate);
          const end = parseDate(r.endDate);
          const list: string[] = [];
          while (d < end) { list.push(formatDate(d)); d.setDate(d.getDate() + 1); }
          return list;
        })();

    const rows: Omit<DbReservation, 'id' | 'created_at'>[] = datesToUse.map((d) => ({
      room_id: r.roomId,
      customer_id: r.guestId,
      date: d,
      status: r.status,
      group_id: r.groupId,
      total_price: r.totalPrice,
      amount_paid: r.amountPaid,
      notes: r.notes ?? null,
      meal_plan: mapMealPlanToDb(r.mealPlan),
    }));

    const { error } = await supabase.from('reservations').insert(rows);
    if (error) return false;

    const now = new Date().toISOString();
    const newRows: DbReservation[] = rows.map((row) => ({
      id: 0,
      room_id: row.room_id,
      customer_id: row.customer_id,
      date: row.date,
      status: row.status,
      group_id: row.group_id,
      total_price: row.total_price ?? 0,
      amount_paid: row.amount_paid ?? 0,
      notes: row.notes ?? null,
      created_at: now,
      meal_plan: row.meal_plan ?? 'yemeksiz',
    }));

    setDbReservations((prev) => [
      ...prev.filter((x) => x.group_id !== r.groupId),
      ...newRows,
    ]);

    await refreshCustomersAndRooms();
    return true;
  };

  const deleteReservationGroup = async (groupId: string): Promise<boolean> => {
    if (!supabase) return false;
    const oldReservation = reservations.find((r) => r.groupId === groupId);
    if (oldReservation) {
      saveBackup({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation: 'delete',
        label: `SİLİNDİ - ${oldReservation.guestName} (${oldReservation.roomNumber})`,
        reservation: { ...oldReservation },
      });
    }
    const { error } = await supabase.from('reservations').delete().eq('group_id', groupId);
    if (error) return false;
    setDbReservations((prev) => prev.filter((r) => r.group_id !== groupId));
    return true;
  };

  return (
    <ReservationContext.Provider
      value={{
        rooms,
        guests,
        reservations,
        loading,
        selectedReservation,
        openReservation,
        closeReservation,
        openNewReservation,
        selectedGroupId,
        addReservationGroup,
        updateReservationGroup,
        restoreBackup,
        deleteReservationGroup,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
}
