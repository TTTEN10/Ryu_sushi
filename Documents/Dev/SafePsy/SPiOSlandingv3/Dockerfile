# Production stage with Caddy
FROM caddy:2.8-alpine

# Copy static files
COPY index.html /srv/safepsy/index.html

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]