package models

import (
	"encoding/json"
	"time"
)

// --- Auth Models ---

type User struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"not null"` // Hashed, never sent in JSON
	Role      string    `json:"role" gorm:"not null"` // "ADMIN" or "staffworkers"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// --- Order Models ---

type MenuItem struct {
	ID          string  `json:"id" gorm:"primaryKey"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	IsVeg       bool    `json:"is_veg"`
	IsAvailable bool    `json:"is_available" gorm:"default:true"`
}

type OrderItem struct {
	ID         string  `json:"id" gorm:"primaryKey"`
	OrderID    string  `json:"order_id" gorm:"not null;index"`
	MenuItemID string  `json:"menu_item_id"`
	Name       string  `json:"name"`
	Quantity   int     `json:"quantity"`
	Price      float64 `json:"price"`
	Notes      string  `json:"notes,omitempty"`
}

type Order struct {
	ID        string      `json:"id" gorm:"primaryKey"`
	ResortID  string      `json:"resort_id" gorm:"index"`
	RoomID    string      `json:"room_id" gorm:"index"`
	GuestName string      `json:"guest_name"`
	Items     []OrderItem `json:"items" gorm:"foreignKey:OrderID"`
	Status    string      `json:"status"` // "new", "assigned", "in_progress", "completed"
	Total     float64     `json:"total"`
	CreatedAt time.Time   `json:"created_at"`
}

// --- Service Ticket Models ---

type ServiceTicket struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	ResortID  string    `json:"resort_id" gorm:"index"`
	RoomID    string    `json:"room_id" gorm:"index"`
	GuestName string    `json:"guest_name"`
	Type      string    `json:"type"` // "towels", "water", "cleaning", "buggy", "emergency"
	Status    string    `json:"status"` // "new", "assigned", "in_progress", "completed"
	Priority  string    `json:"priority"` // "normal", "high", "urgent"
	Assignee  string    `json:"assignee,omitempty"`
	Notes     string    `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// --- Amenity Booking Models ---

type AmenityBooking struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	ResortID    string    `json:"resort_id" gorm:"index"`
	RoomID      string    `json:"room_id" gorm:"index"`
	GuestName   string    `json:"guest_name"`
	AmenityType string    `json:"amenity_type"` // "kayaking", "boating", "fishing", "bonfire"
	TimeSlot    string    `json:"time_slot"`
	CreatedAt   time.Time `json:"created_at"`
}

// --- WebSocket Event Model ---

type WSEvent struct {
	Type      string          `json:"type"` // "new_order", "new_ticket", "status_update", "new_booking"
	Payload   json.RawMessage `json:"payload"`
	ResortID  string          `json:"resort_id"`
	Timestamp time.Time       `json:"timestamp"`
}

// --- Request/Response DTOs ---

type CreateOrderRequest struct {
	RoomID    string      `json:"room_id"`
	GuestName string      `json:"guest_name"`
	Items     []OrderItem `json:"items"`
}

type CreateTicketRequest struct {
	RoomID    string `json:"room_id"`
	GuestName string `json:"guest_name"`
	Type      string `json:"type"`
	Priority string `json:"priority,omitempty"`
	Notes    string `json:"notes,omitempty"`
}

type UpdateStatusRequest struct {
	Status   string `json:"status"`
	Assignee string `json:"assignee,omitempty"`
}

type CreateBookingRequest struct {
	RoomID      string `json:"room_id"`
	GuestName   string `json:"guest_name"`
	AmenityType string `json:"amenity_type"`
	TimeSlot    string `json:"time_slot"`
}

// --- Analytics Models ---

type AnalyticsResponse struct {
	TopMenuItems     []MenuItemStat    `json:"top_menu_items"`
	ResponseTimes    map[string]string `json:"response_times"`
	ActiveRooms      int               `json:"active_rooms"`
	OrdersByStatus   map[string]int    `json:"orders_by_status"`
	TicketsByStatus  map[string]int    `json:"tickets_by_status"`
}

type MenuItemStat struct {
	Name   string `json:"name"`
	Count  int    `json:"count"`
	Revenue float64 `json:"revenue"`
}
