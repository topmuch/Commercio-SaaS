# ============================================
# Teranga Biz (Commercio) - Dockerfile for Coolify
# Multi-stage build for optimal image size
# ============================================

# ---- Stage 1: Builder ----
FROM node:20 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    sqlite3 \
    python3 \
    make \
    g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun

WORKDIR /app

# Clone the repository
RUN git clone https://github.com/topmuch/Commercio-SaaS.git .

# Install ALL dependencies (dev + prod) — NODE_ENV must NOT be set yet
RUN bun install --frozen-lockfile || bun install

# Generate Prisma Client
RUN npx prisma generate

# Set env for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/data/commercio.db"
ENV NODE_ENV=production

# Build Next.js (standalone output)
RUN npx next build

# Copy standalone output pieces
RUN cp -r .next/static .next/standalone/.next/ 2>/dev/null || true \
    && cp -r public .next/standalone/ 2>/dev/null || true

# ---- Stage 2: Runner ----
FROM node:20-slim AS runner

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy standalone build from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma for db push at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create data directory
RUN mkdir -p /app/data

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/commercio.db"

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

# Startup: push DB schema then start server
CMD ["sh", "-c", "mkdir -p /app/data && npx prisma db push --skip-generate 2>/dev/null || true && exec node server.js"]
