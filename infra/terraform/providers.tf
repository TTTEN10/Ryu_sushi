# Provider configuration.
# Dependencies: variables.tf (var.scaleway_*).

provider "scaleway" {
  zone   = var.scaleway_zone != null ? var.scaleway_zone : "fr-par-1"
  region = var.scaleway_region != null ? var.scaleway_region : "fr-par"

  access_key = var.scaleway_access_key != "" ? var.scaleway_access_key : null
  secret_key = var.scaleway_secret_key != "" ? var.scaleway_secret_key : null
  project_id = var.scaleway_project_id != "" ? var.scaleway_project_id : null
}
