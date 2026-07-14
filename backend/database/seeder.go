package database

import (
	"buddha-village/backend/models"
	"log"

	"github.com/google/uuid"
)

func SeedMenu() {
	var count int64
	DB.Model(&models.MenuItem{}).Count(&count)
	if count > 0 {
		return // already seeded
	}

	items := []models.MenuItem{
		// Breakfast
		{Name: "Maggi", Description: "Plain, Cheese & Masala", Price: 199.00, Category: "Breakfast", IsVeg: true},
		{Name: "Idli Chutney", Description: "", Price: 199.00, Category: "Breakfast", IsVeg: true},
		{Name: "Dosa Chutney", Description: "Plain & Masala", Price: 199.00, Category: "Breakfast", IsVeg: true},
		{Name: "Paratha", Description: "Aloo, Paneer & Egg", Price: 249.00, Category: "Breakfast", IsVeg: true},
		{Name: "Eggs With Bread", Description: "Sunny side-up/Masala/Scrambled/Boiled", Price: 249.00, Category: "Breakfast", IsVeg: false},
		{Name: "Upma/Poha", Description: "", Price: 249.00, Category: "Breakfast", IsVeg: true},
		{Name: "Puliogare/Lemon Rice", Description: "", Price: 199.00, Category: "Breakfast", IsVeg: true},
		{Name: "Pakhora", Description: "Onion/Aloo", Price: 249.00, Category: "Breakfast", IsVeg: true},
		{Name: "Aloo Puri", Description: "", Price: 299.00, Category: "Breakfast", IsVeg: true},
		{Name: "Ros Omellete", Description: "", Price: 299.00, Category: "Breakfast", IsVeg: false},
		{Name: "Rolls", Description: "Veg/Non-Veg", Price: 299.00, Category: "Breakfast", IsVeg: false},

		// Momos
		{Name: "Steam Momos", Description: "Veg & Non-Veg", Price: 299.00, Category: "Momos", IsVeg: false},
		{Name: "Tandoori Momos", Description: "Veg & Non-Veg", Price: 299.00, Category: "Momos", IsVeg: false},
		{Name: "Malai Momos", Description: "Veg & Non-Veg", Price: 299.00, Category: "Momos", IsVeg: false},
		{Name: "Peri-Peri Momos", Description: "Veg & Non-Veg", Price: 299.00, Category: "Momos", IsVeg: false},
		{Name: "Hot-Garlic Momos", Description: "Veg & Non-Veg", Price: 299.00, Category: "Momos", IsVeg: false},
		{Name: "Shahi Butter Momos", Description: "Veg & Non-Veg", Price: 299.00, Category: "Momos", IsVeg: false},
		{Name: "Momo Platter", Description: "Tandoor, Malai & Steam", Price: 699.00, Category: "Momos", IsVeg: false},

		// Soups
		{Name: "Veg Soup", Description: "", Price: 199.00, Category: "Soups", IsVeg: true},
		{Name: "Non-Veg Soup", Description: "", Price: 249.00, Category: "Soups", IsVeg: false},

		// Veg Starters
		{Name: "Peanut Masala", Description: "", Price: 249.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Crispy Corn", Description: "", Price: 249.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Masala Papad", Description: "", Price: 249.00, Category: "Veg Starters", IsVeg: true},
		{Name: "French Fries", Description: "Cheese/Peri Peri", Price: 249.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Spring Roll", Description: "", Price: 299.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Manchurian Dry", Description: "", Price: 299.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Paneer Nachos", Description: "", Price: 299.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Paneer Chilli", Description: "", Price: 249.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Cheese Balls", Description: "", Price: 299.00, Category: "Veg Starters", IsVeg: true},
		{Name: "Veg Platter", Description: "Paneer Chilli, Spring Rolls & French Fries", Price: 599.00, Category: "Veg Starters", IsVeg: true},

		// Non-Veg Starters
		{Name: "Egg Chilli/ Egg Burji", Description: "", Price: 249.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Pepper Chicken", Description: "", Price: 349.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Chilli Chicken", Description: "", Price: 349.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Chicken Kebab", Description: "", Price: 349.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Masala Chicken", Description: "", Price: 349.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Chicken Spring Roll", Description: "", Price: 349.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Chicken Nachos", Description: "", Price: 349.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Chicken Cheese Balls", Description: "", Price: 349.00, Category: "Non-Veg Starters", IsVeg: false},
		{Name: "Non-Veg Platter", Description: "Chilli Chicken, Kabab & Spring roll", Price: 599.00, Category: "Non-Veg Starters", IsVeg: false},

		// Drinks
		{Name: "Mineral Water", Description: "", Price: 49.00, Category: "Drinks", IsVeg: true},
		{Name: "Tea/ Coffee", Description: "", Price: 99.00, Category: "Drinks", IsVeg: true},
		{Name: "Black Coffee/Lemon Tea", Description: "", Price: 99.00, Category: "Drinks", IsVeg: true},
		{Name: "Fresh Lime Soda/Water", Description: "", Price: 149.00, Category: "Drinks", IsVeg: true},
		{Name: "Soft Drinks", Description: "", Price: 49.00, Category: "Drinks", IsVeg: true},
		{Name: "Fruit Beer", Description: "", Price: 199.00, Category: "Drinks", IsVeg: true},
		{Name: "Mocktails", Description: "Orange, Mango, Pineapple, Virgin Mojito, Cranberry, Blueberry, Watermelon, Jeera Masala", Price: 199.00, Category: "Drinks", IsVeg: true},

		// Dessert
		{Name: "Ice Cream With Chocolate Syrup", Description: "", Price: 249.00, Category: "Dessert", IsVeg: true},
		{Name: "Sooji/Semiya Halwa", Description: "", Price: 249.00, Category: "Dessert", IsVeg: true},

		// Veg Main Course
		{Name: "Mix Veg Sabzi", Description: "", Price: 249.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Aloo Jeera", Description: "", Price: 249.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Aloo Gobi", Description: "", Price: 249.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Matar Paneer", Description: "", Price: 299.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Shahi Paneer", Description: "", Price: 299.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Kadai Paneer", Description: "", Price: 299.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Yellow Dal", Description: "Plain/Fry", Price: 149.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Dal Tadka", Description: "", Price: 199.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Chole Masala", Description: "", Price: 199.00, Category: "Veg Main Course", IsVeg: true},
		{Name: "Veg Thali", Description: "2 Roti, Mix Veg, Paneer masala, Yellow dal, Plain rice, Papad, Pickle, Salad", Price: 399.00, Category: "Veg Main Course", IsVeg: true},

		// Non-Veg Main Course
		{Name: "Butter Chicken", Description: "", Price: 399.00, Category: "Non-Veg Main Course", IsVeg: false},
		{Name: "Kadai Chicken", Description: "", Price: 399.00, Category: "Non-Veg Main Course", IsVeg: false},
		{Name: "Egg Curry", Description: "", Price: 299.00, Category: "Non-Veg Main Course", IsVeg: false},
		{Name: "BV Special Chicken Curry", Description: "", Price: 499.00, Category: "Non-Veg Main Course", IsVeg: false},
		{Name: "Non-Veg Thali", Description: "2 Roti, Mix Veg, Chicken masala, Yellow dal, Plain rice, Papad, Pickle, Salad", Price: 499.00, Category: "Non-Veg Main Course", IsVeg: false},

		// Rice/Roti/Noodles
		{Name: "Veg Noodles", Description: "", Price: 349.00, Category: "Rice/Roti/Noodles", IsVeg: true},
		{Name: "Non-Veg Noodles", Description: "", Price: 399.00, Category: "Rice/Roti/Noodles", IsVeg: false},
		{Name: "Veg Fried Rice", Description: "", Price: 349.00, Category: "Rice/Roti/Noodles", IsVeg: true},
		{Name: "Non-Veg Fried Rice", Description: "", Price: 399.00, Category: "Rice/Roti/Noodles", IsVeg: false},
		{Name: "White Rice/Jeera Rice", Description: "", Price: 149.00, Category: "Rice/Roti/Noodles", IsVeg: true},
		{Name: "Tava Roti - Plain", Description: "", Price: 50.00, Category: "Rice/Roti/Noodles", IsVeg: true},
		{Name: "Tava Roti - Ghee", Description: "", Price: 70.00, Category: "Rice/Roti/Noodles", IsVeg: true},
	}

	for _, item := range items {
		item.ID = uuid.New().String()
		item.IsAvailable = true
		DB.Create(&item)
	}

	log.Println("Seeded menu items.")
}
