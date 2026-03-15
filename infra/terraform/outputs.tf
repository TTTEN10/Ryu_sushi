# Root module outputs: object storage, GPU instances, AI service, DNS.
# Consumed by: CI/CD, runbooks, external config.

# AWS VPC Outputs - Commented out (AWS modules disabled)
# Uncomment if you enable AWS modules
# output "vpc_id" {
#   description = "VPC ID"
#   value       = module.vpc.vpc_id
# }
#
# output "vpc_cidr" {
#   description = "VPC CIDR block"
#   value       = module.vpc.vpc_cidr
# }
#
# output "public_subnet_ids" {
#   description = "Public subnet IDs"
#   value       = module.vpc.public_subnet_ids
# }
#
# output "private_subnet_ids" {
#   description = "Private subnet IDs"
#   value       = module.vpc.private_subnet_ids
# }
#
# # TimescaleDB Outputs
# output "database_endpoint" {
#   description = "TimescaleDB endpoint"
#   value       = module.timescale.db_instance_endpoint
#   sensitive   = true
# }
#
# output "database_address" {
#   description = "TimescaleDB address"
#   value       = module.timescale.db_instance_address
#   sensitive   = true
# }
#
# output "database_port" {
#   description = "TimescaleDB port"
#   value       = module.timescale.db_instance_port
# }
#
# output "database_name" {
#   description = "Database name"
#   value       = module.timescale.db_instance_name
# }
#
# output "database_connection_string" {
#   description = "Database connection string (without password)"
#   value       = module.timescale.db_connection_string
#   sensitive   = true
# }

# Scaleway Object Storage Outputs
output "object_storage_bucket_ids" {
  description = "Object storage bucket IDs"
  value       = module.scaleway_object_storage.bucket_ids
}

output "object_storage_bucket_names" {
  description = "Object storage bucket names"
  value       = module.scaleway_object_storage.bucket_names
}

output "object_storage_bucket_endpoints" {
  description = "Object storage bucket endpoints"
  value       = module.scaleway_object_storage.bucket_endpoints
}

# AWS S3 Outputs (kept for backwards compatibility, uncomment if using AWS S3)
# output "s3_bucket_ids" {
#   description = "S3 bucket IDs"
#   value       = module.s3.bucket_ids
# }
#
# output "s3_bucket_arns" {
#   description = "S3 bucket ARNs"
#   value       = module.s3.bucket_arns
# }

# AWS Redis Outputs - Commented out (AWS modules disabled)
# Uncomment if you enable AWS modules
# output "redis_endpoint" {
#   description = "Redis primary endpoint"
#   value       = module.redis.redis_primary_endpoint_address
#   sensitive   = true
# }
#
# output "redis_reader_endpoint" {
#   description = "Redis reader endpoint"
#   value       = module.redis.redis_reader_endpoint_address
#   sensitive   = true
# }
#
# output "redis_port" {
#   description = "Redis port"
#   value       = module.redis.redis_port
# }
#
# output "redis_connection_string" {
#   description = "Redis connection string"
#   value       = module.redis.redis_connection_string
#   sensitive   = true
# }
#
# # Kafka Outputs
# output "kafka_cluster_arn" {
#   description = "Kafka cluster ARN"
#   value       = module.kafka.kafka_cluster_arn
# }
#
# output "kafka_bootstrap_brokers" {
#   description = "Kafka bootstrap brokers (TLS)"
#   value       = module.kafka.kafka_bootstrap_brokers_tls
#   sensitive   = true
# }
#
# output "kafka_zookeeper_connect_string" {
#   description = "Kafka Zookeeper connection string"
#   value       = module.kafka.kafka_zookeeper_connect_string
#   sensitive   = true
# }

# GPU Outputs (Scaleway)
output "gpu_instance_ids" {
  description = "IDs of GPU instances"
  value       = module.gpu_scaleway.gpu_instance_ids
}

output "gpu_instance_public_ips" {
  description = "Public IP addresses of GPU instances"
  value       = module.gpu_scaleway.gpu_instance_public_ips
}

output "gpu_instance_names" {
  description = "Names of GPU instances"
  value       = module.gpu_scaleway.gpu_instance_names
}

output "gpu_data_volume_ids" {
  description = "IDs of data volumes"
  value       = module.gpu_scaleway.gpu_data_volume_ids
}

# AI Service Outputs
output "ai_service_public_url" {
  description = "Public URL of the AI service (http://ip:port)"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_public_url : null
}

output "ai_service_health_url" {
  description = "Health check URL for the AI service (http://ip:port/healthz)"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_health_url : null
}

# AI GPU Service Outputs (CI/CD compatible naming)
output "ai_gpu_base_url" {
  description = "AI GPU service base URL (http://ip:port)"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_public_url : null
}

output "ai_gpu_health_url" {
  description = "AI GPU service health check URL (http://ip:port/healthz)"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_health_url : null
}

output "ai_service_instance_id" {
  description = "ID of the first AI service GPU instance"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_instance_id : null
}

output "ai_service_instance_ids" {
  description = "IDs of all AI service GPU instances"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_instance_ids : []
}

output "ai_service_security_group_id" {
  description = "Security group ID for AI service instances"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_security_group_id : null
}

output "ai_service_security_group_ids" {
  description = "Security group IDs for AI service instances (plural for consistency)"
  value       = var.ai_service_enabled && length(module.gpu_ai_service) > 0 ? module.gpu_ai_service[0].ai_service_security_group_ids : []
}

# Chatbot instance outputs
output "chatbot_public_ip" {
  description = "Public IP of the chatbot instance"
  value       = var.chatbot_enabled && length(module.chatbot) > 0 ? (length(module.chatbot[0].ai_service_public_ips) > 0 ? module.chatbot[0].ai_service_public_ips[0] : null) : null
}

output "chatbot_health_url" {
  description = "Chatbot health check URL"
  value       = var.chatbot_enabled && length(module.chatbot) > 0 ? module.chatbot[0].ai_service_health_url : null
}

output "chatbot_ssh_command" {
  description = "SSH command to connect to chatbot instance"
  value       = var.chatbot_enabled && length(module.chatbot) > 0 && length(module.chatbot[0].ai_service_public_ips) > 0 ? "ssh root@${module.chatbot[0].ai_service_public_ips[0]}" : null
}
