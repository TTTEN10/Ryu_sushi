# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json frontend/package.json ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN cd frontend && npm ci --only=production

# Copy frontend source
COPY frontend/ ./frontend/

# Build the frontend
RUN cd frontend && npm run build

# Production stage with Caddy
FROM caddy:2.8-alpine

# Copy built assets from builder
COPY --from=builder /app/frontend/dist /srv/safepsy

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]