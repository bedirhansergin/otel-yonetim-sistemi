import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchRooms,
  fetchCustomers,
  fetchReservations,
  supabase,
  type DbReservation,
  type DbRoom,
  type DbCustomer,
} from '../lib/supabaseClient';

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
  addReservationGroup: (group: Omit<ReservationGroup, 'groupId' | 'dates'>) => Promise<void>;
  updateReservationGroup: (group: ReservationGroup) => Promise<boolean>;
}

export const ReservationContext = createContext<ReservationContextValue | null>(null);

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
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const first = rows[0];
    const last = rows[rows.length - 1];
    const room = roomsMap.get(first.room_id);
    const guest = guestsMap.get(first.customer_id);

    groups.push({
      groupId,
      roomId: first.room_id,
      roomNumber: room?.roomNumber ?? `#${first.room_id}`,
      guestId: first.customer_id,
      guestName: guest?.fullName ?? `#${first.customer_id}`,
      startDate: first.date,
      endDate: last.date,
      status: first.status,
      mealPlan: first.meal_plan ?? '',
      totalPrice: first.total_price,
      amountPaid: first.amount_paid,
      notes: first.notes,
      dates: rows.map((r) => r.date),
    });
  }
  groups.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return groups;
}

export function normalizeTurkish(value: string) {
  return value
    .toLowerCase()
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

  const addReservationGroup = async (group: Omit<ReservationGroup, 'groupId' | 'dates'>) => {
    if (!supabase) return;
    const groupId = crypto.randomUUID();
    const date = new Date(group.startDate);
    const endDate = new Date(group.endDate);
    const rows: DbReservation[] = [];

    while (date <= endDate) {
      rows.push({
        id: 0,
        room_id: group.roomId,
        customer_id: group.guestId,
        date: date.toISOString().slice(0, 10),
        status: group.status,
        group_id: groupId,
        total_price: group.totalPrice,
        amount_paid: group.amountPaid,
        notes: group.notes,
        created_at: new Date().toISOString(),
        meal_plan: group.mealPlan,
      } as DbReservation);
      date.setDate(date.getDate() + 1);
    }

    const { error } = await supabase.from('reservations').insert(rows);
    if (!error) await loadData();
  };

  const updateReservationGroup = async (group: ReservationGroup): Promise<boolean> => {
    if (!supabase) return false;
    const { error: deleteErr } = await supabase
      .from('reservations')
      .delete()
      .eq('group_id', group.groupId);
    if (deleteErr) return false;

    const date = new Date(group.startDate);
    const endDate = new Date(group.endDate);
    const rows: DbReservation[] = [];

    while (date <= endDate) {
      rows.push({
        id: 0,
        room_id: group.roomId,
        customer_id: group.guestId,
        date: date.toISOString().slice(0, 10),
        status: group.status,
        group_id: group.groupId,
        total_price: group.totalPrice,
        amount_paid: group.amountPaid,
        notes: group.notes,
        created_at: new Date().toISOString(),
        meal_plan: group.mealPlan,
      } as DbReservation);
      date.setDate(date.getDate() + 1);
    }

    const { error: insertErr } = await supabase.from('reservations').insert(rows);
    if (insertErr) return false;
    await loadData();
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
        addReservationGroup,
        updateReservationGroup,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
}
