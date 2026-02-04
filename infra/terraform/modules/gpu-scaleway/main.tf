terraform {
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
}

# Use default Ubuntu image if image_id not specified
# Scaleway GPU instances typically use Ubuntu 22.04
# You can find image IDs in Scaleway console or use: scw instance image list
locals {
  default_image_id = "ubuntu_jammy" # Ubuntu 22.04 LTS image ID for Scaleway
  image_id_to_use  = var.image_id != "" ? var.image_id : local.default_image_id
}

# Security Group for GPU Instances
resource "scaleway_instance_security_group" "gpu" {
  count       = var.security_group_id == "" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-gpu-sg"
  description = "Security group for GPU instances"
  zone        = var.zone

  # SSH Access
  inbound_rule {
    action   = "accept"
    port     = var.ssh_port
    ip_range = "0.0.0.0/0"
    protocol = "TCP"
  }

  # Jupyter Notebook
  inbound_rule {
    action   = "accept"
    port     = var.jupyter_port
    ip_range = "0.0.0.0/0"
    protocol = "TCP"
  }

  # API Service
  inbound_rule {
    action   = "accept"
    port     = var.api_port
    ip_range = "0.0.0.0/0"
    protocol = "TCP"
  }

  # All outbound traffic
  outbound_rule {
    action   = "accept"
    ip_range = "0.0.0.0/0"
    protocol = "TCP"
  }

  outbound_rule {
    action   = "accept"
    ip_range = "0.0.0.0/0"
    protocol = "UDP"
  }

  # Convert tags map to list format required by Scaleway
  tags = [for k, v in var.tags : "${k}=${v}"]
}

# Additional Block Storage Volume for Data
resource "scaleway_instance_volume" "gpu_data" {
  count      = var.instance_count
  name       = "${var.project_name}-${var.environment}-gpu-data-${count.index + 1}"
  size_in_gb = var.data_volume_size
  type       = var.data_volume_type
  zone       = var.zone

  # Convert tags map to list format required by Scaleway
  tags = concat(
    [for k, v in var.tags : "${k}=${v}"],
    ["Name=${var.project_name}-${var.environment}-gpu-data-${count.index + 1}"]
  )
}

# Public IPs for GPU instances
resource "scaleway_instance_ip" "gpu" {
  count = var.enable_public_ip ? var.instance_count : 0
  zone  = var.zone
}

# GPU Instances
resource "scaleway_instance_server" "gpu" {
  count = var.instance_count
  name  = "${var.project_name}-${var.environment}-gpu-${count.index + 1}"
  type  = var.instance_type
  image = local.image_id_to_use
  zone  = var.zone
  ip_id = var.enable_public_ip ? scaleway_instance_ip.gpu[count.index].id : null

  root_volume {
    size_in_gb  = var.root_volume_size
    volume_type = var.root_volume_type
  }

  security_group_id = var.security_group_id != "" ? var.security_group_id : scaleway_instance_security_group.gpu[0].id

  # User data - Scaleway uses map format with cloud-init key
  user_data = {
    cloud-init = var.user_data != "" ? var.user_data : <<-EOF
      #!/bin/bash
      set -e
      
      # Update system
      apt-get update -y
      apt-get upgrade -y
      
      # Install essential tools
      apt-get install -y \
        htop \
        tmux \
        git \
        curl \
        wget \
        build-essential \
        docker.io \
        docker-compose-plugin
      
      # Configure Docker
      systemctl enable docker
      systemctl start docker
      
      # Create mount point for data volume
      mkdir -p /data
      
      # Create application directory
      mkdir -p /opt/safepsy
      mkdir -p /opt/safepsy-landing
      chmod 755 /opt/safepsy
      chmod 755 /opt/safepsy-landing
      
      # Install docker-compose (standalone) if plugin not available
      if ! command -v docker-compose &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
      fi
      
      # Auto-deploy SafePsy application
      cd /opt/safepsy-landing
      if [ ! -d ".git" ]; then
        git clone https://github.com/TTTEN10/SPappv1.1.git .
      else
        git pull origin main || true
      fi
      
      # Generate secure database password
      DB_PASS=\$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
      
      # Create production .env files
      cat > .env <<'ENVEOF'
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
ENVEOF
      
      cat > apps/api/.env <<ENVEOF
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
DATABASE_URL=postgresql://safepsy_user:$${DB_PASS}@postgres:5432/safepsy
ENVEOF
      
      cat > apps/web/.env <<'ENVEOF'
VITE_PLAUSIBLE_DOMAIN=safepsy.com
VITE_API_URL=https://safepsy.com/api
ENVEOF
      
      # Update docker-compose.prod.yml with database password
      sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$${DB_PASS}/" docker-compose.prod.yml || true
      sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://safepsy_user:$${DB_PASS}@postgres:5432/safepsy|" docker-compose.prod.yml || true
      
      # Wait for Docker to be fully ready
      sleep 10
      until docker info > /dev/null 2>&1; do
        echo "Waiting for Docker..."
        sleep 5
      done
      
      # Deploy application
      docker-compose -f docker-compose.prod.yml up --build -d || docker compose -f docker-compose.prod.yml up --build -d
      
      # Log initialization
      echo "Instance initialized at \$(date)" >> /var/log/instance-init.log
      echo "Docker version: \$(docker --version)" >> /var/log/instance-init.log
      echo "Docker Compose version: \$(docker compose version 2>/dev/null || docker-compose --version)" >> /var/log/instance-init.log
      echo "SafePsy deployment started at \$(date)" >> /var/log/instance-init.log
    EOF
  }

  # Convert tags map to list format required by Scaleway
  tags = concat(
    [for k, v in var.tags : "${k}=${v}"],
    ["Name=${var.project_name}-${var.environment}-gpu-${count.index + 1}"]
  )
}

# Attach data volumes to instances using null_resource
# Note: This requires the Scaleway CLI (scw) to be installed
# Alternative: Install scw CLI or attach manually via Scaleway Console
resource "null_resource" "attach_volumes" {
  count = var.instance_count

  triggers = {
    server_id = scaleway_instance_server.gpu[count.index].id
    volume_id = scaleway_instance_volume.gpu_data[count.index].id
  }

  provisioner "local-exec" {
    command = "scw instance server attach-volume ${scaleway_instance_server.gpu[count.index].id} volume=${scaleway_instance_volume.gpu_data[count.index].id} || echo 'Note: Install Scaleway CLI (scw) to auto-attach volumes, or attach manually via console'"
  }

  depends_on = [
    scaleway_instance_server.gpu,
    scaleway_instance_volume.gpu_data
  ]
}

