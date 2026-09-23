# Multi-stage Dockerfile for Digital Heroes Platform
FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install all dependencies across workspaces
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN (npm ci || npm install) && mkdir -p /app/apps/api/node_modules /app/apps/web/node_modules

# Build the React/Vite web application
FROM deps AS build-web
COPY apps/web ./apps/web
RUN npm --prefix apps/web run build

# Build the Express/TypeScript API
FROM deps AS build-api
COPY apps/api ./apps/api
RUN npm --prefix apps/api run build

# Production runner image
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_PATH=/app/data/digital-heroes.db

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Copy dependencies from deps stage (includes compiled native modules like better-sqlite3)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy built frontend and backend artifacts
COPY --from=build-web /app/apps/web/dist ./apps/web/dist
COPY --from=build-api /app/apps/api/dist ./apps/api/dist

RUN mkdir -p /app/data /app/apps/api/uploads
VOLUME ["/app/data"]

EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]
