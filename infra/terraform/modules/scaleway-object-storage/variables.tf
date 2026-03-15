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

variable "bucket_names" {
  description = "List of object storage bucket names to create"
  type        = list(string)
  default     = ["chat-summaries", "logs", "backups"]
}

variable "region" {
  description = "Scaleway region (fr-par, nl-ams, pl-waw)"
  type        = string
  default     = "fr-par"
}

variable "enable_versioning" {
  description = "Enable versioning for object storage buckets"
  type        = bool
  default     = true
}

variable "enable_cors" {
  description = "Enable CORS for object storage buckets"
  type        = bool
  default     = false
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allowed_methods" {
  description = "CORS allowed methods"
  type        = list(string)
  default     = ["GET", "PUT", "POST", "DELETE", "HEAD"]
}

variable "cors_allowed_headers" {
  description = "CORS allowed headers"
  type        = list(string)
  default     = ["*"]
}

variable "cors_expose_headers" {
  description = "CORS expose headers"
  type        = list(string)
  default     = ["ETag"]
}

variable "cors_max_age_seconds" {
  description = "CORS max age in seconds"
  type        = number
  default     = 3600
}

variable "expiration_days" {
  description = "Number of days before objects expire (0 = no expiration)"
  type        = number
  default     = 0
}

variable "prevent_destroy" {
  description = "Prevent bucket destruction"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to buckets"
  type        = map(string)
  default     = {}
}




