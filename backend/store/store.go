package store

import (
	"fmt"

	"buddha-village/backend/database"
	"buddha-village/backend/models"
)

// Store provides a wrapper around the database to keep the handler code mostly unchanged.
type Store struct{}

func NewStore() *Store {
	return &Store{}
}

// --- Order Operations ---

func (s *Store) AddOrder(order models.Order) error {
	return database.DB.Create(&order).Error
}

func (s *Store) GetOrders(resortID string) []models.Order {
	var orders []models.Order
	database.DB.Preload("Items").Where("resort_id = ?", resortID).Find(&orders)
	return orders
}

func (s *Store) GetOrdersByRoom(resortID, roomID string) []models.Order {
	var orders []models.Order
	database.DB.Preload("Items").Where("resort_id = ? AND room_id = ?", resortID, roomID).Find(&orders)
	return orders
}

func (s *Store) UpdateOrderStatus(resortID, orderID, status, assignee string) (*models.Order, error) {
	var order models.Order
	if err := database.DB.Where("resort_id = ? AND id = ?", resortID, orderID).First(&order).Error; err != nil {
		return nil, fmt.Errorf("order %s not found", orderID)
	}

	order.Status = status
	database.DB.Save(&order)

	// Fetch with preloaded items to return
	database.DB.Preload("Items").First(&order, "id = ?", order.ID)
	return &order, nil
}

// --- Ticket Operations ---

func (s *Store) AddTicket(ticket models.ServiceTicket) error {
	return database.DB.Create(&ticket).Error
}

func (s *Store) GetTickets(resortID string) []models.ServiceTicket {
	var tickets []models.ServiceTicket
	database.DB.Where("resort_id = ?", resortID).Find(&tickets)
	return tickets
}

func (s *Store) GetTicketsByRoom(resortID, roomID string) []models.ServiceTicket {
	var tickets []models.ServiceTicket
	database.DB.Where("resort_id = ? AND room_id = ?", resortID, roomID).Find(&tickets)
	return tickets
}

func (s *Store) UpdateTicketStatus(resortID, ticketID, status, assignee string) (*models.ServiceTicket, error) {
	var ticket models.ServiceTicket
	if err := database.DB.Where("resort_id = ? AND id = ?", resortID, ticketID).First(&ticket).Error; err != nil {
		return nil, fmt.Errorf("ticket %s not found", ticketID)
	}

	ticket.Status = status
	if assignee != "" {
		ticket.Assignee = assignee
	}
	database.DB.Save(&ticket)
	return &ticket, nil
}

// --- Booking Operations ---

func (s *Store) AddBooking(booking models.AmenityBooking) error {
	return database.DB.Create(&booking).Error
}

func (s *Store) GetBookings(resortID string) []models.AmenityBooking {
	var bookings []models.AmenityBooking
	database.DB.Where("resort_id = ?", resortID).Find(&bookings)
	return bookings
}

func (s *Store) GetBookingsBySlot(resortID, amenityType, timeSlot string) int {
	var count int64
	database.DB.Model(&models.AmenityBooking{}).
		Where("resort_id = ? AND amenity_type = ? AND time_slot = ?", resortID, amenityType, timeSlot).
		Count(&count)
	return int(count)
}

// GetActiveRooms returns the count of unique rooms with active orders or tickets.
func (s *Store) GetActiveRooms(resortID string) int {
	var activeOrders []string
	database.DB.Model(&models.Order{}).
		Where("resort_id = ? AND status NOT IN ('completed', 'cancelled')", resortID).
		Pluck("room_id", &activeOrders)

	var activeTickets []string
	database.DB.Model(&models.ServiceTicket{}).
		Where("resort_id = ? AND status NOT IN ('completed', 'cancelled')", resortID).
		Pluck("room_id", &activeTickets)

	rooms := make(map[string]bool)
	for _, roomID := range activeOrders {
		rooms[roomID] = true
	}
	for _, roomID := range activeTickets {
		rooms[roomID] = true
	}

	return len(rooms)
}
