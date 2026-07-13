package handlers

import (
	"log"

	"buddha-village/backend/ws"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type WebSocketHandler struct {
	Hub *ws.Hub
}

func NewWebSocketHandler(h *ws.Hub) *WebSocketHandler {
	return &WebSocketHandler{Hub: h}
}

// UpgradeMiddleware checks if the request is a valid WebSocket upgrade.
// Must be registered before the WebSocket route.
func (h *WebSocketHandler) UpgradeMiddleware(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		c.Locals("allowed", true)
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}

// HandleConnection manages a single WebSocket connection lifecycle.
// Each connection gets a dedicated Client with a buffered Send channel
// and a WritePump goroutine for thread-safe writes.
func (h *WebSocketHandler) HandleConnection(c *websocket.Conn) {
	resortID := c.Params("resort_id")
	if resortID == "" {
		resortID = "buddha-village"
	}

	// Create client with buffered send channel (256 messages)
	client := &ws.Client{
		Conn:     c,
		ResortID: resortID,
		Send:     make(chan []byte, 256),
	}

	// Register with hub
	h.Hub.Register(client)

	// Start write pump in a separate goroutine
	// This is the ONLY goroutine that writes to this connection
	go client.WritePump()

	// Read pump runs on the current goroutine (blocks until disconnect)
	defer func() {
		h.Hub.Unregister(client)
		log.Printf("[WS] Connection closed for resort: %s", resortID)
	}()

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] Unexpected close error: %v", err)
			}
			break
		}

		// Incoming messages from clients can be broadcast back to all connections
		// This enables client-to-client communication within a resort
		log.Printf("[WS] Received message from resort %s: %s", resortID, string(msg))
		h.Hub.Broadcast(resortID, msg)
	}
}
