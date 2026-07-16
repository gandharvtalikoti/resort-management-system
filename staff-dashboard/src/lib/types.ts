export interface Order {
  id: string;
  resort_id: string;
  room_id: string;
  guest_name?: string;
  items: OrderItem[];
  status: 'new' | 'assigned' | 'in_progress' | 'completed';
  total: number;
  created_at: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface ServiceTicket {
  id: string;
  resort_id: string;
  room_id: string;
  guest_name?: string;
  type: 'towels' | 'water' | 'cleaning' | 'buggy' | 'emergency';
  status: 'new' | 'assigned' | 'in_progress' | 'completed';
  priority: 'normal' | 'high' | 'urgent';
  assignee?: string;
  notes?: string;
  created_at: string;
}

export interface WebSocketEvent {
  type: string;
  payload: any;
  resort_id: string;
  timestamp: string;
}

export type StaffRole = 'all' | 'reception' | 'kitchen' | 'housekeeping' | 'maintenance' | 'rooms' | 'amenities';
export type TaskStatus = 'new' | 'assigned' | 'in_progress' | 'completed';

export interface TaskItem {
  id: string;
  type: 'order' | 'ticket';
  roomId: string;
  guestName?: string;
  status: TaskStatus;
  priority: string;
  assignee?: string;
  details: string;
  category: string;
  createdAt: string;
  raw: Order | ServiceTicket;
}
