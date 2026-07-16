export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  is_veg?: boolean;
  is_available?: boolean;
  emoji?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export interface Order {
  id: string;
  resort_id: string;
  room_id: string;
  items: OrderItem[];
  status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
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
  type: 'towels' | 'water' | 'cleaning' | 'buggy' | 'emergency' | 'bill_request' | 'ebill_request';
  status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'high' | 'urgent';
  assignee?: string;
  notes?: string;
  created_at: string;
}

export interface AmenitySlot {
  amenity_type: 'spa' | 'jacuzzi' | 'yoga';
  time_slot: string;
  capacity: number;
  booked: number;
  remaining: number;
}

export interface WebSocketEvent {
  type: string;
  payload: Record<string, unknown>;
  resort_id: string;
  timestamp: string;
}
