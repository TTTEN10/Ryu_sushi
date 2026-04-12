terraform {
  required_version = ">= 1.5.0"
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.40"
    }
  }
}

provider "scaleway" {
  zone       = var.zone
  region     = var.region
  access_key = var.scaleway_access_key
  secret_key = var.scaleway_secret_key
  project_id = var.scaleway_project_id
}

module "chatbot_instance" {
  source    = "../../modules/chatbot-instance"
  server_id = var.chatbot_instance_id
}

module "app_instance" {
  source    = "../../modules/api-instance"
  server_id = var.app_instance_id
}

# Firewall: on a single VM (scw-new-psy), chatbot :8000 is loopback / docker network only.
# If you split app vs chatbot again, restrict chatbot :8000 to the app private IP in Scaleway
# (avoid managing full SG rule sets in Terraform — replacing rules can lock SSH).
