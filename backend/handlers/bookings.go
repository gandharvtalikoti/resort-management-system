package handlers

import (
	"encoding/json"
	"time"

	"buddha-village/backend/models"
	"buddha-village/backend/store"
	"buddha-village/backend/ws"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type BookingHandler struct {
	Store *store.Store
	Hub   *ws.Hub
}

func NewBookingHandler(s *store.Store, h *ws.Hub) *BookingHandler {
	return &BookingHandler{Store: s, Hub: h}
}

var MaxCapacity = map[string]int{
	"kayaking":                 10,
	"boating":                  10,
	"fishing":                  10,
	"bonfire":                  20,
	"pool_table":               1,
	"foosball":                 1,
	"swimming_pool":            1,
	"celebration_lake":         1,
	"celebration_lounge":       1,
	"celebration_amphitheater": 1,
}

var timeSlots = []string{
	"09:00", "10:00", "11:00", "12:00", "13:00",
	"14:00", "15:00", "16:00", "17:00", "18:00",
	"19:00", "20:00",
}

// CreateBooking handles POST /api/v1/resorts/:id/bookings
func (h *BookingHandler) CreateBooking(c *fiber.Ctx) error {
	resortID := c.Params("id")

	var req models.CreateBookingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RoomID == "" || req.AmenityType == "" || req.TimeSlot == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "room_id, amenity_type, and time_slot are required",
		})
	}

	authHeader := c.Get("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid Authorization header",
		})
	}
	token := authHeader[7:]

	if !h.Store.ValidateSessionToken(resortID, req.RoomID, token) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired session token",
		})
	}

	// Check capacity
	maxCap, ok := MaxCapacity[req.AmenityType]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid amenity type.",
		})
	}

	// Handle Duration
	duration := req.Duration
	if duration <= 0 {
		duration = 1
	}

	// Find starting index in timeSlots
	startIndex := -1
	for i, slot := range timeSlots {
		if slot == req.TimeSlot {
			startIndex = i
			break
		}
	}

	if startIndex == -1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid time slot",
		})
	}

	if startIndex+duration > len(timeSlots) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Duration exceeds available operating hours",
		})
	}

	requestedSlots := timeSlots[startIndex : startIndex+duration]

	// Pre-check capacity for ALL requested slots
	for _, slot := range requestedSlots {
		currentCount := h.Store.GetBookingsBySlot(resortID, req.AmenityType, slot)
		if currentCount >= maxCap {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":     "So sorry, this amenity is already booked by another guest during this time. Please contact the manager for further assistance.",
				"capacity":  maxCap,
				"booked":    currentCount,
				"remaining": maxCap - currentCount,
			})
		}
	}

	// If all are free, create the bookings
	var bookings []models.AmenityBooking
	for _, slot := range requestedSlots {
		booking := models.AmenityBooking{
			ID:          uuid.New().String(),
			ResortID:    resortID,
			RoomID:      req.RoomID,
			GuestName:   req.GuestName,
			AmenityType: req.AmenityType,
			TimeSlot:    slot,
			CreatedAt:   time.Now(),
		}

		if err := h.Store.AddBooking(booking); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create booking: " + err.Error(),
			})
		}
		bookings = append(bookings, booking)

		// Broadcast via WebSocket
		payload, _ := json.Marshal(booking)
		event := models.WSEvent{
			Type:      "new_booking",
			Payload:   payload,
			ResortID:  resortID,
			Timestamp: time.Now(),
		}
		eventJSON, _ := json.Marshal(event)
		h.Hub.Broadcast(resortID, eventJSON)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"bookings": bookings,
		"capacity": maxCap,
	})
}

// GetBookings handles GET /api/v1/resorts/:id/bookings
func (h *BookingHandler) GetBookings(c *fiber.Ctx) error {
	resortID := c.Params("id")
	roomID := c.Query("room_id")

	var bookings []models.AmenityBooking
	if roomID != "" {
		bookings = h.Store.GetBookingsByRoom(resortID, roomID)
	} else {
		bookings = h.Store.GetBookings(resortID)
	}

	return c.JSON(bookings)
}

// GetCapacity handles GET /api/v1/resorts/:id/bookings/capacity
func (h *BookingHandler) GetCapacity(c *fiber.Ctx) error {
	resortID := c.Params("id")

	type SlotCapacity struct {
		AmenityType string `json:"amenity_type"`
		TimeSlot    string `json:"time_slot"`
		Capacity    int    `json:"capacity"`
		Booked      int    `json:"booked"`
		Remaining   int    `json:"remaining"`
	}

	var result []SlotCapacity
	for amenity, maxCap := range MaxCapacity {
		for _, slot := range timeSlots {
			booked := h.Store.GetBookingsBySlot(resortID, amenity, slot)
			result = append(result, SlotCapacity{
				AmenityType: amenity,
				TimeSlot:    slot,
				Capacity:    maxCap,
				Booked:      booked,
				Remaining:   maxCap - booked,
			})
		}
	}

	return c.JSON(result)
}
