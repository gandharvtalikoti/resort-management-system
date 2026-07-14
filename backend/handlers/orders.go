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

type OrderHandler struct {
	Store *store.Store
	Hub   *ws.Hub
}

func NewOrderHandler(s *store.Store, h *ws.Hub) *OrderHandler {
	return &OrderHandler{Store: s, Hub: h}
}

// CreateOrder handles POST /api/v1/resorts/:id/orders
func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
	resortID := c.Params("id")

	var req models.CreateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RoomID == "" || len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "room_id and items are required",
		})
	}

	var total float64
	for i := range req.Items {
		if req.Items[i].ID == "" {
			req.Items[i].ID = uuid.New().String()
		}
		total += req.Items[i].Price * float64(req.Items[i].Quantity)
	}

	order := models.Order{
		ID:        uuid.New().String(),
		ResortID:  resortID,
		RoomID:    req.RoomID,
		GuestName: req.GuestName,
		Items:     req.Items,
		Status:    "new",
		Total:     total,
		CreatedAt: time.Now(),
	}

	if err := h.Store.AddOrder(order); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create order: " + err.Error(),
		})
	}

	// Broadcast via WebSocket
	payload, _ := json.Marshal(order)
	event := models.WSEvent{
		Type:      "new_order",
		Payload:   payload,
		ResortID:  resortID,
		Timestamp: time.Now(),
	}
	eventJSON, _ := json.Marshal(event)
	h.Hub.Broadcast(resortID, eventJSON)

	return c.Status(fiber.StatusCreated).JSON(order)
}

// GetOrders handles GET /api/v1/resorts/:id/orders
func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
	resortID := c.Params("id")
	roomID := c.Query("room_id")

	var orders []models.Order
	if roomID != "" {
		orders = h.Store.GetOrdersByRoom(resortID, roomID)
	} else {
		orders = h.Store.GetOrders(resortID)
	}

	return c.JSON(orders)
}

// UpdateOrderStatus handles PATCH /api/v1/resorts/:id/orders/:order_id
func (h *OrderHandler) UpdateOrderStatus(c *fiber.Ctx) error {
	resortID := c.Params("id")
	orderID := c.Params("order_id")

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

	updated, err := h.Store.UpdateOrderStatus(resortID, orderID, req.Status, req.Assignee)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Broadcast status update
	payload, _ := json.Marshal(updated)
	event := models.WSEvent{
		Type:      "order_status_update",
		Payload:   payload,
		ResortID:  resortID,
		Timestamp: time.Now(),
	}
	eventJSON, _ := json.Marshal(event)
	h.Hub.Broadcast(resortID, eventJSON)

	return c.JSON(updated)
}
