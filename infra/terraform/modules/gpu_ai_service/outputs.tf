output "ai_service_instance_ids" {
  description = "IDs of AI service GPU instances"
  value       = scaleway_instance_server.ai_service[*].id
}

output "ai_service_instance_id" {
  description = "ID of the first AI service GPU instance (singular for compatibility)"
  value       = length(scaleway_instance_server.ai_service) > 0 ? scaleway_instance_server.ai_service[0].id : null
}

output "ai_service_instance_names" {
  description = "Names of AI service GPU instances"
  value       = scaleway_instance_server.ai_service[*].name
}

output "ai_service_public_ips" {
  description = "Public IP addresses of AI service GPU instances"
  value       = var.enable_public_ip ? scaleway_instance_ip.ai_service[*].address : []
}

output "ai_service_public_url" {
  description = "Public URL of the AI service (http://ip:port)"
  value       = var.enable_public_ip && length(scaleway_instance_ip.ai_service) > 0 ? "http://${scaleway_instance_ip.ai_service[0].address}:${var.container_port}" : null
}

output "ai_service_health_url" {
  description = "Health check URL for the AI service (http://ip:port/healthz)"
  value       = var.enable_public_ip && length(scaleway_instance_ip.ai_service) > 0 ? "http://${scaleway_instance_ip.ai_service[0].address}:${var.container_port}/healthz" : null
}

output "ai_service_security_group_id" {
  description = "Security group ID for AI service instances"
  value       = var.security_group_id != "" ? var.security_group_id : (length(scaleway_instance_security_group.ai_service) > 0 ? scaleway_instance_security_group.ai_service[0].id : null)
}

output "ai_service_security_group_ids" {
  description = "Security group IDs (plural for consistency)"
  value       = var.security_group_id != "" ? [var.security_group_id] : (length(scaleway_instance_security_group.ai_service) > 0 ? [scaleway_instance_security_group.ai_service[0].id] : [])
}

