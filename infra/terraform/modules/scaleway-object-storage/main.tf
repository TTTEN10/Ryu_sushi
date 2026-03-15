# Scaleway Object Storage Buckets
# Scaleway Object Storage is S3-compatible and provides reliable object storage

terraform {
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
  }
}

resource "scaleway_object_bucket" "main" {
  for_each = toset(var.bucket_names)

  name   = "${var.project_name}-${var.environment}-${each.value}"
  region = var.region

  # Enable versioning if requested
  versioning {
    enabled = var.enable_versioning
  }

  # Tags - Scaleway Object Storage uses map format
  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-${each.value}"
      Environment = var.environment
      Project     = var.project_name
    }
  )

  # Note: prevent_destroy lifecycle is not supported with variables in this Terraform version
  # To prevent destruction, manually set prevent_destroy = true in the resource if needed
}

# Note: Scaleway Object Storage has limited support for advanced features
# - Encryption is enabled by default
# - CORS and lifecycle configurations are not available via Terraform provider
# - These features may need to be configured via Scaleway Console or API

