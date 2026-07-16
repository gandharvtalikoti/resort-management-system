import { Order, OrderItem, ServiceTicket, AmenitySlot, MenuItem } from './types';

const BASE_URL = 'http://localhost:8080/api/v1';
const RESORT_ID = 'buddha-village';

function resortUrl(path: string): string {
  return `${BASE_URL}/resorts/${RESORT_ID}/${path}`;
}

function getGuestName(roomId: string): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`guestName_${roomId}`) || 'Guest';
  }
  return 'Guest';
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}

/* ── Menu ────────────────────────────────────────────────────────────── */

export async function getMenuItems(): Promise<MenuItem[]> {
  return request<MenuItem[]>(resortUrl('menu'));
}

/* ── Orders ──────────────────────────────────────────────────────────── */

export async function postOrder(
  roomId: string,
  items: Pick<OrderItem, 'menu_item_id' | 'name' | 'quantity' | 'price' | 'notes'>[],
): Promise<Order> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(`session_${roomId}`) : '';
  return request<Order>(resortUrl('orders'), {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    body: JSON.stringify({
      room_id: roomId,
      guest_name: getGuestName(roomId),
      items,
    }),
  });
}

export async function getOrders(roomId?: string): Promise<Order[]> {
  const query = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
  return request<Order[]>(resortUrl(`orders${query}`));
}

export async function cancelOrder(orderId: string): Promise<Order> {
  return request<Order>(resortUrl(`orders/${orderId}`), {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled' }),
  });
}

/* ── Tickets ─────────────────────────────────────────────────────────── */

export async function postTicket(
  roomId: string,
  type: ServiceTicket['type'],
  priority: ServiceTicket['priority'] = 'normal',
  notes?: string,
): Promise<ServiceTicket> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(`session_${roomId}`) : '';
  return request<ServiceTicket>(resortUrl('tickets'), {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    body: JSON.stringify({
      room_id: roomId,
      guest_name: getGuestName(roomId),
      type,
      priority,
      notes: notes ?? '',
    }),
  });
}

export async function getTickets(roomId?: string): Promise<ServiceTicket[]> {
  const query = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
  return request<ServiceTicket[]>(resortUrl(`tickets${query}`));
}

/* ── Amenities ───────────────────────────────────────────────────────── */

export async function getBookingCapacity(): Promise<AmenitySlot[]> {
  return request<AmenitySlot[]>(resortUrl('bookings/capacity'));
}

export interface BookingResponse {
  id: string;
  amenity_type: string;
  time_slot: string;
  room_id: string;
  status: string;
}

export async function createBooking(
  roomId: string,
  amenityType: string,
  timeSlot: string,
  duration: number = 1
): Promise<BookingResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(`session_${roomId}`) : '';
  return request<BookingResponse>(resortUrl('bookings'), {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    body: JSON.stringify({
      room_id: roomId,
      guest_name: getGuestName(roomId),
      amenity_type: amenityType,
      time_slot: timeSlot,
      duration,
    }),
  });
}

export async function getBookings(roomId?: string): Promise<BookingResponse[]> {
  const query = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
  return request<BookingResponse[]>(resortUrl(`bookings${query}`));
}

/* ── Billing ─────────────────────────────────────────────────────────── */

export interface BillResponse {
  orders: Order[];
  tickets: ServiceTicket[];
  bookings: BookingResponse[];
}

export async function getBill(roomId: string): Promise<BillResponse> {
  const [orders, tickets, bookings] = await Promise.all([
    getOrders(roomId),
    getTickets(roomId),
    getBookings(roomId)
  ]);
  return { orders, tickets, bookings };
}

/* ── Session & Consent ───────────────────────────────────────────────── */

export interface RoomSession {
  id: string;
  room_id: string;
  guest_name: string;
  is_active: boolean;
}

export async function checkSession(roomId: string): Promise<{ active: boolean; session: RoomSession | null }> {
  return request<{ active: boolean; session: RoomSession | null }>(resortUrl(`sessions/${roomId}`));
}

export interface ConsentPayload {
  room_id: string;
  guest_name: string;
  mobile_number: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  aadhaar_number: string;
  aadhaar_image?: string;
  signature_data: string;
  tc_version: string;
}

export async function submitConsent(payload: ConsentPayload): Promise<{ consent: any; session_token: string }> {
  return request<{ consent: any; session_token: string }>(resortUrl('consents'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function joinSession(roomId: string, guestName: string): Promise<{ session_token: string }> {
  return request<{ session_token: string }>(resortUrl(`sessions/${roomId}/join`), {
    method: 'POST',
    body: JSON.stringify({ guest_name: guestName }),
  });
}
