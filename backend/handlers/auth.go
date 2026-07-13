package handlers

import (
	"os"
	"time"

	"buddha-village/backend/database"
	"buddha-village/backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type CreateStaffRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// Login issues a JWT token for valid staff credentials.
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid username or password"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid username or password"})
	}

	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(time.Hour * 24).Unix(), // 24 hours
	})

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "fallback_secret_key_for_dev"
	}

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"token": tokenString,
		"user": fiber.Map{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	})
}

// CreateStaff allows an ADMIN to create a new staff worker.
func CreateStaff(c *fiber.Ctx) error {
	var req CreateStaffRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Username == "" || req.Password == "" || req.Role == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Missing required fields"})
	}

	if req.Role != "ADMIN" && req.Role != "staffworkers" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role. Must be ADMIN or staffworkers"})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	user := models.User{
		ID:       uuid.New().String(),
		Username: req.Username,
		Password: string(hashedPassword),
		Role:     req.Role,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Username already exists"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Staff created successfully",
		"user": fiber.Map{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	})
}

// GetStaff allows an ADMIN to list all staff workers.
func GetStaff(c *fiber.Ctx) error {
	var users []models.User
	database.DB.Select("id", "username", "role", "created_at").Find(&users)
	return c.JSON(users)
}

// DeleteStaff allows an ADMIN to delete a staff worker.
func DeleteStaff(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := database.DB.Where("id = ?", id).Delete(&models.User{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete staff"})
	}
	return c.JSON(fiber.Map{"message": "Staff deleted successfully"})
}
