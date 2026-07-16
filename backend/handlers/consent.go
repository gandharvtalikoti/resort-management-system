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

type ConsentHandler struct {
	Store *store.Store
	Hub   *ws.Hub
}

func NewConsentHandler(s *store.Store, h *ws.Hub) *ConsentHandler {
	return &ConsentHandler{Store: s, Hub: h}
}

// CreateConsent handles POST /api/v1/resorts/:id/consents
// Public — called by guests when they sign the T&C
func (h *ConsentHandler) CreateConsent(c *fiber.Ctx) error {
	resortID := c.Params("id")

	var req models.CreateConsentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RoomID == "" || req.GuestName == "" || req.SignatureData == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "room_id, guest_name, and signature_data are required",
		})
	}

	if req.MobileNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "mobile_number is required",
		})
	}

	now := time.Now()
	consentID := uuid.New().String()

	// Capture IP and User-Agent from request
	ipAddress := c.Get("X-Forwarded-For")
	if ipAddress == "" {
		ipAddress = c.IP()
	}
	userAgent := c.Get("User-Agent")

	consent := models.GuestConsent{
		ID:                     consentID,
		ResortID:               resortID,
		RoomID:                 req.RoomID,
		GuestName:              req.GuestName,
		MobileNumber:           req.MobileNumber,
		EmergencyContactName:   req.EmergencyContactName,
		EmergencyContactNumber: req.EmergencyContactNumber,
		AadhaarNumber:          req.AadhaarNumber,
		AadhaarImage:           req.AadhaarImage,
		SignatureData:          req.SignatureData,
		IPAddress:              ipAddress,
		UserAgent:              userAgent,
		TCVersion:              req.TCVersion,
		AgreedAt:               now,
		CreatedAt:              now,
	}

	if err := h.Store.AddConsent(consent); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save consent: " + err.Error(),
		})
	}

	// Deactivate any existing active session for this room first
	_ = h.Store.CheckoutSession(resortID, req.RoomID)

	// Create a new session for this room
	sessionID := uuid.New().String()
	session := models.RoomSession{
		ID:          sessionID,
		ResortID:    resortID,
		RoomID:      req.RoomID,
		GuestName:   req.GuestName,
		ConsentID:   consentID,
		IsActive:    true,
		CheckedInAt: now,
	}

	if err := h.Store.AddSession(session); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create session: " + err.Error(),
		})
	}

	// Broadcast via WebSocket
	payload, _ := json.Marshal(session)
	event := models.WSEvent{
		Type:      "new_session",
		Payload:   payload,
		ResortID:  resortID,
		Timestamp: time.Now(),
	}
	eventJSON, _ := json.Marshal(event)
	h.Hub.Broadcast(resortID, eventJSON)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"consent":       consent,
		"session_token": sessionID,
	})
}

// GetConsents handles GET /api/v1/resorts/:id/consents
// Protected — staff only
func (h *ConsentHandler) GetConsents(c *fiber.Ctx) error {
	resortID := c.Params("id")
	roomID := c.Query("room_id")

	var consents []models.GuestConsent
	if roomID != "" {
		consents = h.Store.GetConsentsByRoom(resortID, roomID)
	} else {
		consents = h.Store.GetConsents(resortID)
	}

	// Mask Aadhaar numbers in response (show only last 4 digits)
	for i := range consents {
		if len(consents[i].AadhaarNumber) >= 4 {
			consents[i].AadhaarNumber = "XXXX-XXXX-" + consents[i].AadhaarNumber[len(consents[i].AadhaarNumber)-4:]
		}
	}

	if consents == nil {
		consents = []models.GuestConsent{}
	}

	return c.JSON(consents)
}

// GetActiveSession handles GET /api/v1/resorts/:id/sessions/:room_id
// Public — guest portal checks if there's an active session
func (h *ConsentHandler) GetActiveSession(c *fiber.Ctx) error {
	resortID := c.Params("id")
	roomID := c.Params("room_id")

	session, err := h.Store.GetActiveSession(resortID, roomID)
	if err != nil {
		return c.JSON(fiber.Map{
			"active":  false,
			"session": nil,
		})
	}

	return c.JSON(fiber.Map{
		"active":  true,
		"session": session,
	})
}

// GetActiveSessions handles GET /api/v1/resorts/:id/sessions
// Protected — staff only, returns all active sessions for the resort
func (h *ConsentHandler) GetActiveSessions(c *fiber.Ctx) error {
	resortID := c.Params("id")
	sessions := h.Store.GetActiveSessions(resortID)
	return c.JSON(sessions)
}

// Checkout handles POST /api/v1/resorts/:id/sessions/:room_id/checkout
// Protected — staff only
func (h *ConsentHandler) Checkout(c *fiber.Ctx) error {
	resortID := c.Params("id")
	roomID := c.Params("room_id")

	if err := h.Store.CheckoutSession(resortID, roomID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to checkout: " + err.Error(),
		})
	}

	// Broadcast via WebSocket
	event := models.WSEvent{
		Type:      "checkout_session",
		Payload:   []byte(`{"room_id":"` + roomID + `"}`),
		ResortID:  resortID,
		Timestamp: time.Now(),
	}
	eventJSON, _ := json.Marshal(event)
	h.Hub.Broadcast(resortID, eventJSON)

	return c.JSON(fiber.Map{
		"message": "Guest checked out from room " + roomID,
	})
}

// JoinSession handles POST /api/v1/resorts/:id/sessions/:room_id/join
// Public — called by second devices trying to join an existing session
func (h *ConsentHandler) JoinSession(c *fiber.Ctx) error {
	resortID := c.Params("id")
	roomID := c.Params("room_id")

	var req struct {
		GuestName string `json:"guest_name"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	token, err := h.Store.JoinSession(resortID, roomID, req.GuestName)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"session_token": token,
	})
}
