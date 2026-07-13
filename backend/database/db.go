package database

import (
	"log"
	"os"

	"buddha-village/backend/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback for local development if not set in docker-compose
		dsn = "host=localhost user=postgres password=postgres dbname=resort_db port=5432 sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto Migrate the schemas
	err = db.AutoMigrate(
		&models.User{},
		&models.Order{},
		&models.OrderItem{},
		&models.ServiceTicket{},
		&models.AmenityBooking{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate database schemas: %v", err)
	}

	DB = db

	seedDefaultAdmin()
}

func seedDefaultAdmin() {
	var count int64
	DB.Model(&models.User{}).Where("username = ?", "staff_admin").Count(&count)

	if count == 0 {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("staff123"), bcrypt.DefaultCost)
		admin := models.User{
			ID:       uuid.New().String(),
			Username: "staff_admin",
			Password: string(hashedPassword),
			Role:     "ADMIN",
		}
		DB.Create(&admin)
		log.Println("Seeded default staff_admin user.")
	}
}
