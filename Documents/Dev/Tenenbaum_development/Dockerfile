# Tenenbaum Development - Production Docker Image
# Multi-stage build for static site with Caddy
# =============================================================================

FROM caddy:2.8-alpine AS production

WORKDIR /site

# Copy built static files from dist folder
COPY dist ./dist

# Copy Caddyfile (will be overridden by volume mount in production)
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]