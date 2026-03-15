output "gpu_instance_ids" {
  description = "IDs of GPU instances"
  value       = scaleway_instance_server.gpu[*].id
}

output "gpu_instance_names" {
  description = "Names of GPU instances"
  value       = scaleway_instance_server.gpu[*].name
}

output "gpu_instance_public_ips" {
  description = "Public IP addresses of GPU instances"
  value       = var.enable_public_ip ? scaleway_instance_ip.gpu[*].address : []
}

output "gpu_instance_private_ips" {
  description = "Private IP addresses of GPU instances (Scaleway doesn't expose private IPs directly)"
  value       = [] # Private IPs are managed internally by Scaleway and not exposed via Terraform
}

output "gpu_security_group_id" {
  description = "Security group ID for GPU instances"
  value       = var.security_group_id != "" ? var.security_group_id : scaleway_instance_security_group.gpu[0].id
}

output "gpu_data_volume_ids" {
  description = "IDs of data volumes"
  value       = scaleway_instance_volume.gpu_data[*].id
}

