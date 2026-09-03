# Single-stage build for Tenenbaum Development static site
# =============================================================================
# Serves pre-built static files from dist/ directory

FROM caddy:2.8-alpine AS production

WORKDIR /site

# Copy built static files from dist folder
COPY dist ./dist

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]