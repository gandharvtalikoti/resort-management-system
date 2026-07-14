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

// MaxCapacity defines the maximum slots per amenity per time slot.
var MaxCapacity = map[string]int{
	"kayaking": 10,
	"boating":  10,
	"fishing":  10,
	"bonfire":  20,
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

	// Check capacity
	maxCap, ok := MaxCapacity[req.AmenityType]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid amenity type. Use: kayaking, boating, fishing, or bonfire",
		})
	}

	currentCount := h.Store.GetBookingsBySlot(resortID, req.AmenityType, req.TimeSlot)
	if currentCount >= maxCap {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "No slots available for this time",
			"capacity":  maxCap,
			"booked":    currentCount,
			"remaining": 0,
		})
	}

	booking := models.AmenityBooking{
		ID:          uuid.New().String(),
		ResortID:    resortID,
		RoomID:      req.RoomID,
		GuestName:   req.GuestName,
		AmenityType: req.AmenityType,
		TimeSlot:    req.TimeSlot,
		CreatedAt:   time.Now(),
	}

	if err := h.Store.AddBooking(booking); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create booking: " + err.Error(),
		})
	}

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

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"booking":   booking,
		"capacity":  maxCap,
		"booked":    currentCount + 1,
		"remaining": maxCap - currentCount - 1,
	})
}

// GetBookings handles GET /api/v1/resorts/:id/bookings
func (h *BookingHandler) GetBookings(c *fiber.Ctx) error {
	resortID := c.Params("id")
	bookings := h.Store.GetBookings(resortID)
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

	timeSlots := []string{
		"09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00",
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
