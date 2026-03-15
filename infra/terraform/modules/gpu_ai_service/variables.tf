variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "zone" {
  description = "Scaleway zone (e.g., fr-par-1, nl-ams-1)"
  type        = string
  default     = "fr-par-1"
}

variable "instance_type" {
  description = "Scaleway GPU instance type (e.g., GPU-LPS, GPU-L, GP1-LPS, GP1-L)"
  type        = string
  default     = "GPU-LPS"
}

variable "instance_count" {
  description = "Number of GPU instances to create"
  type        = number
  default     = 1
}

variable "image_id" {
  description = "Scaleway image ID. If empty, uses latest Ubuntu 22.04"
  type        = string
  default     = ""
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs to attach to instances (optional, can use cloud-init instead)"
  type        = list(string)
  default     = []
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 100
}

variable "root_volume_type" {
  description = "Root volume type (sbs_volume is the new standard, replacing b_ssd)"
  type        = string
  default     = "sbs_volume"
  validation {
    condition     = contains(["sbs_volume", "l_ssd", "b_ssd", "unified", "scratch"], var.root_volume_type)
    error_message = "Volume type must be one of: sbs_volume (recommended), l_ssd, b_ssd, unified, or scratch"
  }
}

variable "container_image" {
  description = "Docker container image name (e.g., registry.scaleway.com/my-org/ai-service)"
  type        = string
}

variable "container_image_tag" {
  description = "Docker container image tag/version"
  type        = string
  default     = "latest"
}

variable "container_name" {
  description = "Name for the Docker container"
  type        = string
  default     = "ai-service"
}

variable "container_port" {
  description = "Port the container listens on (mapped to host port)"
  type        = number
  default     = 8000
}

variable "container_env" {
  description = "Environment variables to pass to the container (key-value map)"
  type        = map(string)
  default     = {}
}

variable "security_group_id" {
  description = "Security group ID (optional, will create one if not provided)"
  type        = string
  default     = ""
}

variable "enable_public_ip" {
  description = "Enable public IP on instances"
  type        = bool
  default     = true
}

variable "enable_ssh" {
  description = "Enable SSH access (restricted by allowed_ips if specified)"
  type        = bool
  default     = true
}

variable "ssh_port" {
  description = "SSH port"
  type        = number
  default     = 22
}

variable "allowed_ips" {
  description = "List of IP addresses allowed to access instances via SSH (CIDR format). Empty list means all IPs."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

