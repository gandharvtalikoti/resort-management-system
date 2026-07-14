package handlers

import (
	"buddha-village/backend/database"
	"buddha-village/backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetMenuItems returns all menu items
func GetMenuItems(c *fiber.Ctx) error {
	var items []models.MenuItem
	database.DB.Find(&items)
	return c.JSON(items)
}

// AddMenuItem adds a new menu item
func AddMenuItem(c *fiber.Ctx) error {
	var item models.MenuItem
	if err := c.BodyParser(&item); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if item.ID == "" {
		item.ID = uuid.New().String()
	}

	if err := database.DB.Create(&item).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(item)
}

// UpdateMenuItem updates an existing menu item
func UpdateMenuItem(c *fiber.Ctx) error {
	id := c.Params("id")

	var item models.MenuItem
	if err := database.DB.First(&item, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Menu item not found"})
	}

	if err := c.BodyParser(&item); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	item.ID = id // ensure ID doesn't change
	if err := database.DB.Save(&item).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(item)
}

// DeleteMenuItem deletes a menu item
func DeleteMenuItem(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := database.DB.Delete(&models.MenuItem{}, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
