# Scaleway modules: object storage, GPU instance, AI service.
# Dependencies: variables.tf. No cross-module dependencies; DNS depends on gpu_ai_service (see dns-update.tf).

# Object storage (no dependency on other modules)
module "scaleway_object_storage" {
  source = "./modules/scaleway-object-storage"

  project_name      = var.project_name
  environment       = var.environment
  bucket_names      = var.object_storage_bucket_names
  region            = var.scaleway_region != null ? var.scaleway_region : "fr-par"
  enable_versioning = var.object_storage_enable_versioning
  enable_cors       = var.object_storage_enable_cors
  expiration_days   = var.object_storage_expiration_days
  prevent_destroy   = var.object_storage_prevent_destroy

  tags = var.tags
}

# GPU instance (landing/API stack; no dependency on other modules)
module "gpu_scaleway" {
  source = "./modules/gpu-scaleway"

  project_name = var.project_name
  environment  = var.environment
  zone         = var.gpu_zone

  instance_type  = var.gpu_instance_type
  instance_count = var.gpu_instance_count
  ssh_key_ids    = var.gpu_ssh_key_ids

  root_volume_size = var.gpu_root_volume_size
  data_volume_size = var.gpu_data_volume_size

  enable_public_ip = var.gpu_enable_public_ip

  tags = var.tags
}

# AI service instance (frontend/backend + Caddy; no dependency on other modules)
module "gpu_ai_service" {
  count  = var.ai_service_enabled ? 1 : 0
  source = "./modules/gpu_ai_service"

  project_name = var.project_name
  environment  = var.environment
  zone         = var.ai_service_zone

  instance_type  = var.ai_service_instance_type
  instance_count = var.ai_service_instance_count
  ssh_key_ids    = var.ai_service_ssh_key_ids

  root_volume_size = var.ai_service_root_volume_size
  root_volume_type = "sbs_volume"

  container_image     = var.ai_service_container_image
  container_image_tag = var.ai_service_container_image_tag
  container_name      = "${var.project_name}-${var.environment}-ai-service"
  container_port      = var.ai_service_container_port
  container_env       = var.ai_service_container_env

  enable_public_ip = var.ai_service_enable_public_ip
  enable_ssh       = var.ai_service_enable_ssh
  allowed_ips      = var.ai_service_allowed_ips

  tags = var.tags
}

# Chatbot instance (PRO2-XXS, CPU) — separate from app host
module "chatbot" {
  count  = var.chatbot_enabled ? 1 : 0
  source = "./modules/gpu_ai_service"

  project_name = var.project_name
  environment  = var.environment
  zone         = var.chatbot_zone

  instance_type  = var.chatbot_instance_type
  instance_count = 1
  ssh_key_ids    = var.chatbot_ssh_key_ids

  root_volume_size = var.chatbot_root_volume_size
  root_volume_type = "sbs_volume"

  container_image     = var.chatbot_container_image
  container_image_tag = var.chatbot_container_image_tag
  container_name      = "${var.project_name}-${var.environment}-chatbot"
  container_port      = 8000
  container_env       = var.chatbot_container_env

  enable_public_ip = true
  enable_ssh       = true
  allowed_ips      = var.chatbot_allowed_ips

  tags = var.tags
}
