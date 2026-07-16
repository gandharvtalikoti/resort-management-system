terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ---------------------------------------------------------
# ECR (Elastic Container Registry) for the Go Backend
# ---------------------------------------------------------
resource "aws_ecr_repository" "backend_repo" {
  name                 = "buddha-village-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ---------------------------------------------------------
# IAM Roles for App Runner
# ---------------------------------------------------------
resource "aws_iam_role" "apprunner_access_role" {
  name = "AppRunnerECRAccessRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_policy" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# ---------------------------------------------------------
# RDS (PostgreSQL Database)
# ---------------------------------------------------------
resource "aws_db_instance" "resort_db" {
  identifier           = "buddha-village-db"
  allocated_storage    = 20
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "16.14"
  instance_class       = "db.t3.micro" # Free tier eligible
  username             = var.db_username
  password             = var.db_password
  parameter_group_name = "default.postgres16"
  skip_final_snapshot  = true
  publicly_accessible  = false # Best practice: restrict to VPC, AppRunner will connect via VPC Connector
}

# ---------------------------------------------------------
# App Runner (Go Backend)
# ---------------------------------------------------------
# Note: Initially, we will deploy a placeholder or just set it up.
# App Runner requires an image to exist in ECR first before it can be created successfully.
# We will create the service after pushing the Docker image.
