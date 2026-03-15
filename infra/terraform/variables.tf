# Input variables for all Terraform root modules and providers.
# Used by: providers.tf, modules-scaleway.tf, dns-update.tf.
# Infrastructure is Scaleway-only (object storage, GPU, AI service, chatbot, DNS).

# Scaleway Provider Variables
variable "scaleway_region" {
  description = "Scaleway region (fr-par, nl-ams, pl-waw)"
  type        = string
  default     = "fr-par"
}

variable "scaleway_zone" {
  description = "Scaleway zone (e.g., fr-par-1, nl-ams-1, pl-waw-1)"
  type        = string
  default     = null
}

variable "scaleway_access_key" {
  description = "Scaleway access key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "scaleway_secret_key" {
  description = "Scaleway secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "scaleway_project_id" {
  description = "Scaleway project ID"
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "safepsy"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Scaleway Object Storage Variables
variable "object_storage_bucket_names" {
  description = "List of object storage bucket names to create (Scaleway Object Storage)"
  type        = list(string)
  default     = ["chat-summaries", "logs", "backups"]
}

variable "object_storage_enable_versioning" {
  description = "Enable versioning for object storage buckets"
  type        = bool
  default     = true
}

variable "object_storage_enable_cors" {
  description = "Enable CORS for object storage buckets"
  type        = bool
  default     = false
}

variable "object_storage_expiration_days" {
  description = "Number of days before objects expire (0 = no expiration)"
  type        = number
  default     = 0
}

variable "object_storage_prevent_destroy" {
  description = "Prevent bucket destruction"
  type        = bool
  default     = false
}

# GPU Configuration Variables (Scaleway)
variable "gpu_instance_type" {
  description = "Scaleway GPU instance type (GPU-LPS or GPU-L)"
  type        = string
  default     = "GPU-LPS"
}

variable "gpu_instance_count" {
  description = "Number of GPU instances to create"
  type        = number
  default     = 1
}

variable "gpu_ssh_key_ids" {
  description = "List of SSH key IDs from Scaleway"
  type        = list(string)
  default     = []
}

variable "gpu_zone" {
  description = "Scaleway zone for GPU instances"
  type        = string
  default     = "fr-par-1"
}

variable "gpu_root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 100
}

variable "gpu_data_volume_size" {
  description = "Data volume size in GB"
  type        = number
  default     = 500
}

variable "gpu_enable_public_ip" {
  description = "Enable public IP on GPU instances"
  type        = bool
  default     = true
}

# AI Service Configuration Variables
variable "ai_service_enabled" {
  description = "Enable AI service GPU instances"
  type        = bool
  default     = false
}

variable "ai_service_instance_type" {
  description = "Scaleway GPU instance type for AI service (e.g., GPU-LPS, GPU-L)"
  type        = string
  default     = "GPU-LPS"
}

variable "ai_service_instance_count" {
  description = "Number of AI service GPU instances to create"
  type        = number
  default     = 1
}

variable "ai_service_zone" {
  description = "Scaleway zone for AI service GPU instances"
  type        = string
  default     = "fr-par-1"
}

variable "ai_service_root_volume_size" {
  description = "Root volume size in GB for AI service instances"
  type        = number
  default     = 100
}

variable "ai_service_container_image" {
  description = "Docker container image for AI service (e.g., registry.scaleway.com/my-org/ai-service)"
  type        = string
  default     = "registry.scaleway.com/my-org/ai-service"
}

variable "ai_service_container_image_tag" {
  description = "Docker container image tag/version for AI service"
  type        = string
  default     = "latest"
}

variable "ai_service_container_port" {
  description = "Port the AI service container listens on"
  type        = number
  default     = 8000
}

variable "ai_service_enable_public_ip" {
  description = "Enable public IP on AI service instances"
  type        = bool
  default     = true
}

variable "ai_service_container_env" {
  description = "Environment variables to pass to the AI service container (key-value map)"
  type        = map(string)
  default     = {}
  sensitive   = false # Individual values may be sensitive, but structure is not
}

variable "ai_service_ssh_key_ids" {
  description = "List of SSH key IDs for AI service instances (optional, can use cloud-init instead)"
  type        = list(string)
  default     = []
}

variable "ai_service_enable_ssh" {
  description = "Enable SSH access to AI service instances"
  type        = bool
  default     = true
}

variable "ai_service_allowed_ips" {
  description = "List of IP addresses allowed to access AI service instances via SSH (CIDR format). Empty list means all IPs."
  type        = list(string)
  default     = []
}

# Chatbot instance (PRO2-XXS, separate from GPU AI service)
variable "chatbot_enabled" {
  description = "Enable dedicated chatbot instance (PRO2-XXS)"
  type        = bool
  default     = true
}

variable "chatbot_instance_type" {
  description = "Scaleway instance type for chatbot (CPU, e.g. PRO2-XXS)"
  type        = string
  default     = "PRO2-XXS"
}

variable "chatbot_zone" {
  description = "Scaleway zone for chatbot instance"
  type        = string
  default     = "fr-par-1"
}

variable "chatbot_root_volume_size" {
  description = "Root volume size in GB for chatbot instance"
  type        = number
  default     = 20
}

variable "chatbot_container_image" {
  description = "Docker image for chatbot (e.g. safepsy-chatbot or registry.scaleway.com/.../safepsy-chatbot). Build from repo: docker build -t safepsy-chatbot:2.0.0 -f deploy/chatbot/Dockerfile . then push or load on server."
  type        = string
  default     = "safepsy-chatbot"
}

variable "chatbot_container_image_tag" {
  description = "Docker image tag for chatbot"
  type        = string
  default     = "2.0.0"
}

variable "chatbot_container_env" {
  description = "Environment variables for chatbot container (e.g. AI_INTERNAL_API_KEY, USE_GPU=false)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "chatbot_ssh_key_ids" {
  description = "SSH key IDs for chatbot instance"
  type        = list(string)
  default     = []
}

variable "chatbot_allowed_ips" {
  description = "IPs allowed to SSH to chatbot (CIDR). Empty = all."
  type        = list(string)
  default     = []
}

# Tags
variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

