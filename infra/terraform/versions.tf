# Terraform and provider requirements.
# Root config layout: versions.tf (this file), providers.tf, modules-scaleway.tf,
# dns-update.tf (DNS; depends on gpu_ai_service), variables.tf, outputs.tf.

terraform {
  required_version = ">= 1.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }

  # Uncomment for remote state (e.g. Scaleway Object Storage or AWS S3)
  # backend "s3" { ... }
}
