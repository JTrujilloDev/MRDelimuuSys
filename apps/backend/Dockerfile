# ----------- STAGE 1: deps -----------
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Archivos del workspace (cache eficiente)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN npm install -g pnpm@10.33.2

# Instalar TODAS las dependencias del monorepo
RUN pnpm install --frozen-lockfile


# ----------- STAGE 2: builder -----------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10.33.2

# Evitar prompts en builder (pnpm)
ENV CI=true

# Traer dependencias ya instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/package.json ./package.json

# Copiar código fuente
COPY . .

# 👇 MUY IMPORTANTE: asegurar deps del backend
# Usar "shamefully-hoist" para crear un layout de node_modules clásico
# que deje los paquetes accesibles vía require('express') desde /app/node_modules.
RUN pnpm --filter backend install --shamefully-hoist

# 👇 Prisma usando entorno REAL del workspace
RUN pnpm --filter backend exec prisma generate

# Build backend
RUN pnpm --filter backend build


# ----------- STAGE 3: runner (ligero) -----------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Evitar prompts interactivos de instaladores (pnpm, apt, etc.) en contenedores
ENV CI=true

RUN npm install -g pnpm@10.33.2

# Copiar solo backend compilado
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/prisma.config.ts ./prisma.config.ts

# Copiar lockfile
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Instalar librerías del sistema necesarias para ejecutar Chromium (Puppeteer)
# en la imagen final.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		ca-certificates \
		fonts-liberation \
		wget \
		gnupg \
		libnss3 \
		libxss1 \
		libatk1.0-0 \
		libatk-bridge2.0-0 \
		libcups2 \
		libx11-xcb1 \
		libxcomposite1 \
		libxdamage1 \
		libxrandr2 \
		libgbm1 \
		libasound2 \
		libpangocairo-1.0-0 \
		libx11-6 \
		libxrender1 \
		libxcb1 \
	&& rm -rf /var/lib/apt/lists/*

EXPOSE 3000

# Copiar node_modules hoisted desde el builder (layout clásico creado arriba)
COPY --from=builder /app/node_modules ./node_modules

# El servicio `migrate` de Docker Compose aplica las migraciones antes del arranque.
CMD ["node", "dist/src/server.js"]
