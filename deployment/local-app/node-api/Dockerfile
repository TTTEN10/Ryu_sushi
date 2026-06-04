# Monorepo Node API — runtime image. Build `dist` on the host before deploy:
#   npm run build:api
# Context: repo root (package.json + apps/api/dist + schema).
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --workspace safepsy-api --omit=dev
# Workspace install can leave an uninitialized apps/api/node_modules/.prisma stub; use root client only.
RUN rm -rf apps/api/node_modules
COPY apps/api/schema.prisma ./apps/api/schema.prisma
COPY apps/api/deployments ./apps/api/deployments
COPY apps/api/dist ./apps/api/dist
RUN npx prisma generate --schema=apps/api/schema.prisma
WORKDIR /repo/apps/api
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
