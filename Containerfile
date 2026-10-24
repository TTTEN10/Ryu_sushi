# Multi-stage build: frontend Vite puis runtime Node/Express
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Runtime: Express sert l'API + le frontend construit (dist/)
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 3001
USER node
CMD ["node", "server/index.js"]
