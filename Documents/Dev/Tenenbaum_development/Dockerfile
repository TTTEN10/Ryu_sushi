# Multi-stage Dockerfile for Tenenbaum Development
# Optimized for production with minimal image size

# =============================================================================
# Stage 1: Build the React frontend
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# =============================================================================
# Stage 2: Production runtime
# =============================================================================
FROM node:22-alpine AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --frozen-lockfile && npm cache clean --force

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start with dumb-init for proper signal handling
CMD ["dumb-init", "node", "server/index.js"]

# =============================================================================
# Stage 3: Development (optional - use with docker-compose)
# =============================================================================
FROM node:22-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies for development
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Expose ports for Vite dev server and Express
EXPOSE 5173 3001

# Enable polling for file watching in containers
ENV CHOKIDAR_USEPOLLING=true
ENV VITE_HOST=0.0.0.0

CMD ["npm", "run", "dev:all"]
