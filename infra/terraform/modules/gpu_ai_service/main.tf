terraform {
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
  }
}

# Use default Ubuntu image if image_id not specified
# Scaleway GPU instances typically use Ubuntu 22.04
locals {
  default_image_id = "ubuntu_jammy" # Ubuntu 22.04 LTS image ID for Scaleway
  image_id_to_use  = var.image_id != "" ? var.image_id : local.default_image_id
  service_port     = var.container_port
  health_path      = "/healthz"
  chat_path        = "/v1/chat/completions"
}

# Security Group for AI Service GPU Instances
resource "scaleway_instance_security_group" "ai_service" {
  count       = var.security_group_id == "" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-ai-service-sg"
  description = "Security group for AI service GPU instances - allows /healthz and /v1/chat/completions"
  zone        = var.zone

  # SSH Access (optional, restricted by allowed_ips)
  dynamic "inbound_rule" {
    for_each = var.enable_ssh ? [1] : []
    content {
      action   = "accept"
      port     = var.ssh_port
      ip_range = length(var.allowed_ips) > 0 ? join(",", var.allowed_ips) : "0.0.0.0/0"
      protocol = "TCP"
    }
  }

  # Health check endpoint - /healthz
  inbound_rule {
    action   = "accept"
    port     = local.service_port
    ip_range = "0.0.0.0/0"
    protocol = "TCP"
  }

  # Caddy / Landing (HTTP/HTTPS) when full stack is deployed on this instance
  inbound_rule {
    action   = "accept"
    port     = 80
    ip_range = "0.0.0.0/0"
    protocol = "TCP"
  }
  inbound_rule {
    action   = "accept"
    port     = 443
    ip_range = "0.0.0.0/0"
    protocol = "TCP"
  }

  # Chat completions endpoint - /v1/chat/completions (same port as health, handled by application)
  # Note: Path-based routing is handled by the application, firewall only needs port access
  # SSE streaming uses the same port and path

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

# Public IPs for GPU instances
resource "scaleway_instance_ip" "ai_service" {
  count = var.enable_public_ip ? var.instance_count : 0
  zone  = var.zone
}

# Generate cloud-init script for Docker and container deployment
locals {
  # Build environment variables string for Docker run
  env_vars_string = join(" ", [
    for key, value in var.container_env : "-e ${key}=\"${value}\""
  ])

  # Container name for use in scripts
  container_name = var.container_name

  # Cloud-init script to install Docker and run container
  cloud_init_script = <<-EOF
#!/bin/bash
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install essential tools
apt-get install -y \
  curl \
  wget \
  ca-certificates \
  gnupg \
  lsb-release

# Install Docker (official method)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configure Docker
systemctl enable docker
systemctl start docker

# Wait for Docker to be ready
sleep 5
until docker info > /dev/null 2>&1; do
  echo "Waiting for Docker to start..."
  sleep 2
done

# Create application directory
mkdir -p /opt/ai-service
cd /opt/ai-service

# Pull the container image
echo "Pulling container image: ${var.container_image}:${var.container_image_tag}"
docker pull ${var.container_image}:${var.container_image_tag}

# Stop and remove any existing container with the same name
docker stop ${var.container_name} 2>/dev/null || true
docker rm ${var.container_name} 2>/dev/null || true

# Run the container with restart policy
echo "Starting container: ${var.container_name}"
docker run -d \
  --name ${var.container_name} \
  --restart unless-stopped \
  -p ${local.service_port}:${var.container_port} \
  ${local.env_vars_string} \
  ${var.container_image}:${var.container_image_tag}

# Wait for container to start
sleep 5

# Log initialization
echo "AI service initialized at $(date)" >> /var/log/ai-service-init.log
echo "Container: ${var.container_name}" >> /var/log/ai-service-init.log
echo "Image: ${var.container_image}:${var.container_image_tag}" >> /var/log/ai-service-init.log
echo "Port: ${local.service_port}" >> /var/log/ai-service-init.log

# Health check script (runs periodically) - using different delimiter for nested heredoc
cat > /usr/local/bin/health-check.sh <<HEALTHEOF
#!/bin/bash
CONTAINER_NAME="${var.container_name}"
CONTAINER_IMAGE="${var.container_image}:${var.container_image_tag}"
CONTAINER_PORT="${var.container_port}"
SERVICE_PORT="${local.service_port}"
ENV_VARS_STR="${local.env_vars_string}"

while true; do
  if ! docker ps | grep -q "\\\$CONTAINER_NAME"; then
    echo "\\\$(date): Container \\\$CONTAINER_NAME is not running, restarting..." >> /var/log/ai-service-health.log
    docker start "\\\$CONTAINER_NAME" 2>/dev/null || docker run -d \\
      --name "\\\$CONTAINER_NAME" \\
      --restart unless-stopped \\
      -p "\\\$SERVICE_PORT:\\\$CONTAINER_PORT" \\
      \\\$ENV_VARS_STR \\
      "\\\$CONTAINER_IMAGE"
  fi
  sleep 60
done
HEALTHEOF

chmod +x /usr/local/bin/health-check.sh

# Note: Health check script is created but not started automatically
# To enable: uncomment the line below or create a systemd service
# nohup /usr/local/bin/health-check.sh > /dev/null 2>&1 &

# Log completion
echo "AI service setup completed at $(date)" >> /var/log/ai-service-init.log
  EOF
}

# GPU Instances for AI Service
resource "scaleway_instance_server" "ai_service" {
  count = var.instance_count
  name  = "${var.project_name}-${var.environment}-ai-service-${count.index + 1}"
  type  = var.instance_type
  image = local.image_id_to_use
  zone  = var.zone
  ip_id = var.enable_public_ip ? scaleway_instance_ip.ai_service[count.index].id : null

  root_volume {
    size_in_gb  = var.root_volume_size
    volume_type = var.root_volume_type
  }

  security_group_id = var.security_group_id != "" ? var.security_group_id : scaleway_instance_security_group.ai_service[0].id

  # User data - Scaleway uses map format with cloud-init key
  user_data = {
    cloud-init = local.cloud_init_script
  }

  # Convert tags map to list format required by Scaleway
  tags = concat(
    [for k, v in var.tags : "${k}=${v}"],
    ["Name=${var.project_name}-${var.environment}-ai-service-${count.index + 1}"]
  )
}

