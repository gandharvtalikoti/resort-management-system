package ws

import (
	"log"
	"sync"

	"github.com/gofiber/websocket/v2"
)

// Client wraps a WebSocket connection with a buffered send channel
// to protect against concurrent write panics.
type Client struct {
	Conn     *websocket.Conn
	ResortID string
	Send     chan []byte
}

// WritePump drains the Send channel and writes messages to the WebSocket connection.
// This ensures all writes happen on a single goroutine per connection,
// preventing concurrent write panics.
func (c *Client) WritePump() {
	defer c.Conn.Close()
	for msg := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("[WS] Write error for resort %s: %v", c.ResortID, err)
			return
		}
	}
}

// Hub manages all WebSocket connections grouped by resort_id.
// It uses a mutex for safe map access and channels for safe per-connection writes.
type Hub struct {
	mu      sync.RWMutex
	resorts map[string]map[*Client]bool
}

// NewHub creates a new WebSocket hub.
func NewHub() *Hub {
	return &Hub{
		resorts: make(map[string]map[*Client]bool),
	}
}

// Register adds a client to the hub for its resort.
func (h *Hub) Register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.resorts[client.ResortID] == nil {
		h.resorts[client.ResortID] = make(map[*Client]bool)
	}
	h.resorts[client.ResortID][client] = true
	log.Printf("[WS] Client registered for resort: %s (total: %d)", client.ResortID, len(h.resorts[client.ResortID]))
}

// Unregister removes a client from the hub and closes its send channel.
func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.resorts[client.ResortID]; ok {
		if _, exists := clients[client]; exists {
			delete(clients, client)
			close(client.Send)
			log.Printf("[WS] Client unregistered from resort: %s (remaining: %d)", client.ResortID, len(clients))
			if len(clients) == 0 {
				delete(h.resorts, client.ResortID)
			}
		}
	}
}

// Broadcast sends a message to all connected clients for a given resort_id.
// Messages are pushed to each client's Send channel (non-blocking).
// If a client's channel is full, it is considered slow and gets evicted.
func (h *Hub) Broadcast(resortID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.resorts[resortID]
	if !ok {
		return
	}

	var slowClients []*Client
	for client := range clients {
		select {
		case client.Send <- message:
			// Message enqueued successfully
		default:
			// Client's send buffer is full — mark for eviction
			slowClients = append(slowClients, client)
		}
	}

	// Evict slow clients (requires upgrading to write lock)
	if len(slowClients) > 0 {
		h.mu.RUnlock()
		h.mu.Lock()
		for _, client := range slowClients {
			if _, exists := h.resorts[resortID][client]; exists {
				delete(h.resorts[resortID], client)
				close(client.Send)
				log.Printf("[WS] Evicted slow client from resort: %s", resortID)
			}
		}
		if len(h.resorts[resortID]) == 0 {
			delete(h.resorts, resortID)
		}
		h.mu.Unlock()
		h.mu.RLock()
	}
}

// ConnectionCount returns the number of active connections for a resort.
func (h *Hub) ConnectionCount(resortID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.resorts[resortID])
}
