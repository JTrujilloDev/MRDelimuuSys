# ----------- STAGE 1: deps -----------
FROM node:22-alpine AS deps

WORKDIR /app

# Archivos del workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN npm install -g pnpm@10.33.2

# Instalar dependencias
RUN pnpm install --frozen-lockfile


# ----------- STAGE 2: build -----------
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.33.2

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/package.json ./package.json

COPY . .

# 🔥 FIX CLAVE
RUN pnpm --filter frontend install

# Build del frontend
RUN pnpm --filter frontend build

# ----------- STAGE 3: runner (nginx) -----------
FROM nginx:alpine AS runner

# Limpiar default
RUN rm -rf /usr/share/nginx/html/*

# Copiar build
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
