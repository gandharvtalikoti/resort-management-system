variable "aws_region" {
  description = "The AWS region to deploy in"
  default     = "ap-south-1" # Mumbai region, change if preferred
}

variable "db_username" {
  description = "PostgreSQL Admin Username"
  type        = string
  default     = "resortadmin"
}

variable "db_password" {
  description = "PostgreSQL Admin Password"
  type        = string
  sensitive   = true
  default     = "BuddhaVillage2026!"
}
