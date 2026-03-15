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
  description = "Scaleway instance type (e.g., DEV1-S, GP1-LPS, GP1-L, GPU-LPS, GPU-L)"
  type        = string
  default     = "DEV1-S"
  # No validation to allow any valid Scaleway instance type
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
  description = "List of SSH key IDs to attach to instances"
  type        = list(string)
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

variable "data_volume_size" {
  description = "Additional data volume size in GB"
  type        = number
  default     = 500
}

variable "data_volume_type" {
  description = "Data volume type for standalone volumes (l_ssd or b_ssd - sbs_volume only for root volumes)"
  type        = string
  default     = "l_ssd"
}

variable "user_data" {
  description = "User data script for instance initialization"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "enable_ipv6" {
  description = "Enable IPv6 on instances"
  type        = bool
  default     = true
}

variable "enable_public_ip" {
  description = "Enable public IP on instances"
  type        = bool
  default     = true
}

variable "security_group_id" {
  description = "Security group ID (optional, will create one if not provided)"
  type        = string
  default     = ""
}

variable "allowed_ips" {
  description = "List of IP addresses allowed to access instances (CIDR format)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ssh_port" {
  description = "SSH port"
  type        = number
  default     = 22
}

variable "jupyter_port" {
  description = "Jupyter notebook port"
  type        = number
  default     = 8888
}

variable "api_port" {
  description = "API service port"
  type        = number
  default     = 8000
}

