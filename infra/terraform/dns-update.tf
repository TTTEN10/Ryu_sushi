# DNS records for safepsy.com.
# Depends on: module.gpu_ai_service (A record uses AI service public IP when enabled).
# When ai_service is disabled, falls back to hardcoded IP for safepsy.com.

resource "scaleway_domain_record" "safepsy_com" {
  dns_zone = "safepsy.com"
  name     = "@"
  type     = "A"
  data = var.ai_service_enabled && length(module.gpu_ai_service) > 0 && length(module.gpu_ai_service[0].ai_service_public_ips) > 0 ? module.gpu_ai_service[0].ai_service_public_ips[0] : "51.159.176.62"
  ttl = 3600

  depends_on = [module.gpu_ai_service]
}

resource "scaleway_domain_record" "safepsy_com_www" {
  dns_zone = "safepsy.com"
  name     = "www"
  type     = "A"
  data = var.ai_service_enabled && length(module.gpu_ai_service) > 0 && length(module.gpu_ai_service[0].ai_service_public_ips) > 0 ? module.gpu_ai_service[0].ai_service_public_ips[0] : "51.159.176.62"
  ttl = 3600

  depends_on = [module.gpu_ai_service]
}
