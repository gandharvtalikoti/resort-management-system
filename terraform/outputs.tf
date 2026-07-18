output "backend_public_ip" {
  description = "The public IP address of the Backend API"
  value       = aws_instance.backend.public_ip
}

output "database_endpoint" {
  description = "The connection endpoint for the RDS database"
  value       = aws_db_instance.resort_db.endpoint
}

output "backend_https_url" {
  description = "The secure HTTPS URL for the Backend API"
  value       = "https://${aws_cloudfront_distribution.backend_proxy.domain_name}"
}
