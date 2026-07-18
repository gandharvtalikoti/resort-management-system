import { Order, ServiceTicket, TaskStatus } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const RESORT_ID = 'buddha-village';

function getAuthHeader(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function apiFetch<T>(path: string, options?: RequestInit, isGlobal: boolean = false): Promise<T> {
  const url = isGlobal ? `${BASE_URL}${path}` : `${BASE_URL}/resorts/${RESORT_ID}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.reload();
    }
    const errorBody = await res.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

// --- Auth & Admin ---

export async function login(username: string, password: string):Promise<any> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }, true);
}

export async function getStaff(): Promise<any[]> {
  return apiFetch('/admin/staff', {}, true);
}

export async function createStaff(username: string, password: string, role: string): Promise<any> {
  return apiFetch('/admin/staff', {
    method: 'POST',
    body: JSON.stringify({ username, password, role })
  }, true);
}

export async function deleteStaff(id: string): Promise<any> {
  return apiFetch(`/admin/staff/${id}`, {
    method: 'DELETE',
  }, true);
}


// --- Menu Management ---

export async function getMenuItems(): Promise<any[]> {
  return apiFetch('/menu');
}

export async function createMenuItem(item: any): Promise<any> {
  return apiFetch('/admin/menu', {
    method: 'POST',
    body: JSON.stringify(item)
  }, true);
}

export async function updateMenuItem(id: string, item: any): Promise<any> {
  return apiFetch(`/admin/menu/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  }, true);
}

export async function deleteMenuItem(id: string): Promise<any> {
  const url = `${BASE_URL}/admin/menu/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}`);
  }
}

// --- Resort Data ---

export async function getOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/orders');
}

export async function getTickets(): Promise<ServiceTicket[]> {
  return apiFetch<ServiceTicket[]>('/tickets');
}

export async function getBill(roomId: string): Promise<any> {
  const [orders, tickets] = await Promise.all([
    apiFetch<Order[]>(`/orders?room_id=${encodeURIComponent(roomId)}`),
    apiFetch<ServiceTicket[]>(`/tickets?room_id=${encodeURIComponent(roomId)}`)
  ]);
  return { orders, tickets };
}

export async function updateOrderStatus(
  orderId: string,
  status: TaskStatus,
  assignee?: string
): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(assignee && { assignee }) }),
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: TaskStatus,
  assignee?: string
): Promise<ServiceTicket> {
  return apiFetch<ServiceTicket>(`/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(assignee && { assignee }) }),
  });
}

export async function getAnalytics(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/analytics');
}

// --- Consents & Sessions ---

export async function getConsents(): Promise<any[]> {
  return apiFetch<any[]>('/consents');
}

export async function getActiveSessions(): Promise<any[]> {
  return apiFetch<any[]>('/sessions');
}

export async function getBookings(): Promise<any[]> {
  return apiFetch<any[]>('/bookings');
}

export async function checkoutRoom(roomId: string): Promise<any> {
  return apiFetch<any>(`/sessions/${roomId}/checkout`, {
    method: 'POST'
  });
}

