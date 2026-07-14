package main

import (
	"log"

	"buddha-village/backend/database"
	"buddha-village/backend/handlers"
	"buddha-village/backend/middleware"
	"buddha-village/backend/store"
	"buddha-village/backend/ws"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/websocket/v2"
)

func main() {
	// Initialize database connection and auto-migrate schemas
	database.ConnectDB()

	// Initialize core dependencies
	dataStore := store.NewStore()
	hub := ws.NewHub()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Buddha Village API",
	})

	// --- Global Middleware ---

	// Request logger
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))

	// CORS — allow both frontend applications
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, http://localhost:3001",
		AllowMethods:     "GET, POST, PUT, DELETE, PATCH, OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	// --- Initialize Handlers ---

	orderHandler := handlers.NewOrderHandler(dataStore, hub)
	ticketHandler := handlers.NewTicketHandler(dataStore, hub)
	bookingHandler := handlers.NewBookingHandler(dataStore, hub)
	analyticsHandler := handlers.NewAnalyticsHandler(dataStore)
	wsHandler := handlers.NewWebSocketHandler(hub)

	// --- API Routes ---

	api := app.Group("/api/v1")

	// Auth routes (Public)
	api.Post("/auth/login", handlers.Login)

	// Admin routes (Protected, Admin only)
	admin := api.Group("/admin", middleware.Protected(), middleware.RequireRole("ADMIN"))
	admin.Post("/staff", handlers.CreateStaff)
	admin.Get("/staff", handlers.GetStaff)
	admin.Delete("/staff/:id", handlers.DeleteStaff)

	admin.Post("/menu", handlers.AddMenuItem)
	admin.Put("/menu/:id", handlers.UpdateMenuItem)
	admin.Delete("/menu/:id", handlers.DeleteMenuItem)

	// Resort-scoped routes
	resort := api.Group("/resorts/:id")

	// Guest routes (Public)
	resort.Get("/menu", handlers.GetMenuItems)

	// Guest routes (Public)
	resort.Post("/orders", orderHandler.CreateOrder)
	resort.Post("/tickets", ticketHandler.CreateTicket)
	resort.Post("/bookings", bookingHandler.CreateBooking)
	
	// Data fetches - in a real app, GETs might be public for guests filtering by their room_id,
	// but for staff dashboard, they need to fetch all. For now we keep them public.
	resort.Get("/orders", orderHandler.GetOrders)
	resort.Get("/tickets", ticketHandler.GetTickets)
	resort.Get("/bookings", bookingHandler.GetBookings)
	resort.Get("/bookings/capacity", bookingHandler.GetCapacity)
	resort.Get("/analytics", analyticsHandler.GetAnalytics)

	// Protected routes (Staff only - any logged in staff can patch status)
	protectedResort := resort.Group("", middleware.Protected())
	protectedResort.Patch("/orders/:order_id", orderHandler.UpdateOrderStatus)
	protectedResort.Patch("/tickets/:ticket_id", ticketHandler.UpdateTicketStatus)

	// --- WebSocket Route ---

	// WebSocket upgrade middleware
	app.Use("/ws", wsHandler.UpgradeMiddleware)

	// WebSocket connection handler
	app.Get("/ws/:resort_id", websocket.New(wsHandler.HandleConnection))

	// --- Health Check ---

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "buddha-village-api",
			"ws_connections": fiber.Map{
				"buddha-village": hub.ConnectionCount("buddha-village"),
			},
		})
	})

	// --- Start Server ---

	log.Println("🏨 Buddha Village API starting on :8080")
	log.Println("   REST API:  http://localhost:8080/api/v1/resorts/buddha-village/")
	log.Println("   WebSocket: ws://localhost:8080/ws/buddha-village")
	log.Println("   Health:    http://localhost:8080/health")

	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
