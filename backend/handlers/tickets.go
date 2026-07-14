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

type TicketHandler struct {
	Store *store.Store
	Hub   *ws.Hub
}

func NewTicketHandler(s *store.Store, h *ws.Hub) *TicketHandler {
	return &TicketHandler{Store: s, Hub: h}
}

// CreateTicket handles POST /api/v1/resorts/:id/tickets
func (h *TicketHandler) CreateTicket(c *fiber.Ctx) error {
	resortID := c.Params("id")

	var req models.CreateTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RoomID == "" || req.Type == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "room_id and type are required",
		})
	}

	// Set priority based on type
	priority := req.Priority
	if priority == "" {
		priority = "normal"
		if req.Type == "emergency" {
			priority = "urgent"
		}
	}

	ticket := models.ServiceTicket{
		ID:        uuid.New().String(),
		ResortID:  resortID,
		RoomID:    req.RoomID,
		GuestName: req.GuestName,
		Type:      req.Type,
		Status:    "new",
		Priority:  priority,
		Notes:     req.Notes,
		CreatedAt: time.Now(),
	}

	if err := h.Store.AddTicket(ticket); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create ticket: " + err.Error(),
		})
	}

	// Broadcast via WebSocket
	payload, _ := json.Marshal(ticket)
	event := models.WSEvent{
		Type:      "new_ticket",
		Payload:   payload,
		ResortID:  resortID,
		Timestamp: time.Now(),
	}
	eventJSON, _ := json.Marshal(event)
	h.Hub.Broadcast(resortID, eventJSON)

	return c.Status(fiber.StatusCreated).JSON(ticket)
}

// GetTickets handles GET /api/v1/resorts/:id/tickets
func (h *TicketHandler) GetTickets(c *fiber.Ctx) error {
	resortID := c.Params("id")
	roomID := c.Query("room_id")

	var tickets []models.ServiceTicket
	if roomID != "" {
		tickets = h.Store.GetTicketsByRoom(resortID, roomID)
	} else {
		tickets = h.Store.GetTickets(resortID)
	}

	// Optional status filter
	status := c.Query("status")
	if status != "" {
		var filtered []models.ServiceTicket
		for _, t := range tickets {
			if t.Status == status {
				filtered = append(filtered, t)
			}
		}
		if filtered == nil {
			filtered = []models.ServiceTicket{}
		}
		return c.JSON(filtered)
	}

	return c.JSON(tickets)
}

// UpdateTicketStatus handles PATCH /api/v1/resorts/:id/tickets/:ticket_id
func (h *TicketHandler) UpdateTicketStatus(c *fiber.Ctx) error {
	resortID := c.Params("id")
	ticketID := c.Params("ticket_id")

	var req models.UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "status is required",
		})
	}

	updated, err := h.Store.UpdateTicketStatus(resortID, ticketID, req.Status, req.Assignee)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Broadcast status update
	payload, _ := json.Marshal(updated)
	event := models.WSEvent{
		Type:      "ticket_status_update",
		Payload:   payload,
		ResortID:  resortID,
		Timestamp: time.Now(),
	}
	eventJSON, _ := json.Marshal(event)
	h.Hub.Broadcast(resortID, eventJSON)

	return c.JSON(updated)
}
