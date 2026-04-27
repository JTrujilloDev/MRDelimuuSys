# ----------- STAGE 1: deps -----------
FROM node:22-alpine AS deps

WORKDIR /app

# Archivos del workspace (cache eficiente)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN npm install -g pnpm

# Instalar TODAS las dependencias del monorepo
RUN pnpm install --frozen-lockfile


# ----------- STAGE 2: builder -----------
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Traer dependencias ya instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/package.json ./package.json

# Copiar código fuente
COPY . .

# 👇 MUY IMPORTANTE: asegurar deps del backend
RUN pnpm --filter backend install

# 👇 Prisma usando entorno REAL del workspace
RUN pnpm --filter backend exec prisma generate

# Build backend
RUN pnpm --filter backend build


# ----------- STAGE 3: runner (ligero) -----------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm

# Copiar solo backend compilado
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json

# 👇 CLAVE: instalar SOLO deps reales del backend
RUN pnpm install --prod

EXPOSE 3000

CMD ["sh", "-c", "pnpm run db:deploy && dist/src/server.js"]