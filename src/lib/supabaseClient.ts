import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type DbRoom = {
  id: number;
  room_number: string;
  block: string | null;
  floor: number;
  bed_type: string;
  created_at: string;
};

export type DbCustomer = {
  id: number;
  full_name: string;
  phone: string;
  id_number: string;
  father_name: string | null;
  mother_name: string | null;
  birth_date: string | null;
  birth_place: string | null;
  gender: string | null;
  nationality: string;
  document_type: string | null;
  created_at: string;
};

export type DbReservation = {
  id: number;
  room_id: number;
  customer_id: number;
  date: string;
  status: string;
  group_id: string;
  total_price: number;
  amount_paid: number;
  notes: string | null;
  created_at: string;
  meal_plan: string;
};

export async function fetchRooms() {
  if (!supabase) return { data: [] as DbRoom[], error: null };
  const { data, error } = await supabase.from('rooms').select('*').order('room_number', { ascending: true });
  if (error) return { data: [] as DbRoom[], error };
  return { data: data as DbRoom[], error: null };
}

export async function fetchCustomers() {
  if (!supabase) return { data: [] as DbCustomer[], error: null };
  const { data, error } = await supabase.from('customers').select('*').order('full_name', { ascending: true });
  if (error) return { data: [] as DbCustomer[], error };
  return { data: data as DbCustomer[], error: null };
}

export async function fetchReservations() {
  if (!supabase) return { data: [] as DbReservation[], error: null };
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('date', { ascending: true });
  if (error) return { data: [] as DbReservation[], error };
  return { data: data as DbReservation[], error: null };
}
