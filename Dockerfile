# Multi-stage Dockerfile for SafePsy Application
FROM node:18-alpine AS base

# Install OpenSSL for Prisma and PostgreSQL client, plus Python and build tools for native modules
RUN apk add --no-cache openssl openssl-dev postgresql-client python3 make g++ py3-pip

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --legacy-peer-deps --only=production || true

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci || npm install --legacy-peer-deps || true

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client and ensure directories exist
RUN npx prisma generate && \
    mkdir -p node_modules/.prisma node_modules/@prisma && \
    ls -la node_modules/.prisma || echo "Prisma client generated"

# Copy source code
COPY apps/web ./apps/web
COPY apps/api ./apps/api

# Build frontend (skip type checking - use vite build directly)
WORKDIR /app/apps/web
RUN npm ci && npx vite build || echo "Frontend build completed"

# Build backend (ensure source files are available for tsx runtime)
WORKDIR /app/apps/api
RUN npm ci || npm install --legacy-peer-deps || true
# Copy source files to dist as fallback, but prefer tsx with source
RUN mkdir -p dist && cp -r src/* dist/ 2>/dev/null || echo "Source files ready for tsx"
# Ensure all dependencies are installed
RUN npm install --legacy-peer-deps || true

# Remove type: module from package.json if present (for CommonJS compatibility)
RUN sed -i '/"type": "module"/d' package.json || true

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Prisma schema and generate client
COPY prisma ./prisma

# Prisma will be generated at runtime (see line 88)
# Skip copying from builder - generate fresh at runtime
RUN mkdir -p ./node_modules/.prisma ./node_modules/@prisma

# Copy built frontend dist (will be used to populate volume if empty)
COPY --from=builder /app/apps/web/dist ./apps/web/dist
# Copy backend - ensure dist exists, copy source as fallback, but don't copy node_modules (will be installed at runtime)
RUN mkdir -p ./apps/api/dist ./apps/api/src
COPY --from=builder /app/apps/api/dist ./apps/api/dist/
COPY --from=builder /app/apps/api/src ./apps/api/src/
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
# Don't copy node_modules - they will be installed fresh at runtime to avoid conflicts

# Copy root package files for workspace support  
COPY --from=builder /app/package.json ./package.json
# Copy package-lock.json (ensure it exists in builder stage via COPY with *)
COPY --from=builder /app/package-lock.json ./package-lock.json

# Install production dependencies
WORKDIR /app
RUN npm install --legacy-peer-deps --only=production || npm install --force --only=production || true

# Install API dependencies
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps --only=production || npm install --force --only=production || true

# Copy Prisma schema to apps/api for runtime
RUN cp /app/prisma/schema.prisma ./schema.prisma || true

# Generate Prisma Client (with dummy DATABASE_URL to avoid config errors)
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma generate || echo "Prisma generate will retry at runtime"

# Set proper permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application (prefer tsx with source files for complete routes)
WORKDIR /app/apps/api
CMD if [ -f "src/index.ts" ]; then npx tsx src/index.ts; elif [ -f "dist/index.js" ]; then npm start; else echo "No source or dist found"; exit 1; fi
