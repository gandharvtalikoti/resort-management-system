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

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# ---------------------------------------------------------
# Security Groups
# ---------------------------------------------------------

# Security group for EC2 (Backend)
resource "aws_security_group" "ec2_sg" {
  name        = "buddha-village-backend-sg"
  description = "Allow HTTP and SSH"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security group for RDS (Database)
resource "aws_security_group" "rds_sg" {
  name        = "buddha-village-db-sg"
  description = "Allow postgres traffic from EC2"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL from Backend EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id]
  }
  
  # Allow traffic from default VPC for local connection/debugging
  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------------------------------------------------------
# RDS (PostgreSQL Database)
# ---------------------------------------------------------
resource "aws_db_instance" "resort_db" {
  identifier             = "buddha-village-db"
  allocated_storage      = 20
  storage_type           = "gp2"
  engine                 = "postgres"
  engine_version         = "16.14"
  instance_class         = "db.t3.micro" # Free tier eligible
  username               = var.db_username
  password               = var.db_password
  parameter_group_name   = "default.postgres16"
  skip_final_snapshot    = true
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
}

# ---------------------------------------------------------
# EC2 Instance (Go Backend)
# ---------------------------------------------------------

# Find the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

resource "aws_instance" "backend" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.kp.key_name
  
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  
  # Inject startup script
  user_data = <<-EOF
              #!/bin/bash
              # 1. Update and install dependencies
              yum update -y
              yum install -y git golang

              # 2. Clone the repository
              cd /opt
              git clone https://github.com/gandharvtalikoti/resort-management-system.git
              cd resort-management-system/backend

              # 3. Build the Go API
              go build -o server .

              # 4. Create systemd service for the API
              cat << 'SERVICE' > /etc/systemd/system/buddhavillage.service
              [Unit]
              Description=Buddha Village Go API
              After=network.target

              [Service]
              Type=simple
              User=root
              WorkingDirectory=/opt/resort-management-system/backend
              ExecStart=/opt/resort-management-system/backend/server
              Restart=always
              Environment="PORT=80"
              Environment="DATABASE_URL=host=${aws_db_instance.resort_db.address} user=${var.db_username} password=${var.db_password} dbname=postgres port=5432 sslmode=require"
              
              [Install]
              WantedBy=multi-user.target
              SERVICE

              # 5. Enable and start the service
              systemctl daemon-reload
              systemctl enable buddhavillage
              systemctl start buddhavillage
              EOF

  tags = {
    Name = "BuddhaVillageBackend"
  }
}
