# ============================================
# Teranga Biz (Commercio) - Dockerfile for Coolify
# ============================================

# ---- Stage 1: Builder ----
FROM node:22-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    sqlite3 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun

WORKDIR /app

# Clone the repository
RUN git clone https://github.com/topmuch/Commercio-SaaS.git .

# Install ALL dependencies (dev + prod)
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/data/commercio.db"
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096

# Build Next.js standalone
RUN npx next build

# Copy output pieces into standalone
RUN cp -r .next/static .next/standalone/.next/ 2>/dev/null; \
    cp -r public .next/standalone/ 2>/dev/null; \
    true

# ---- Stage 2: Runner ----
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma for db push at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy init script + bcryptjs
COPY --from=builder /app/docker-init.js ./docker-init.js
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

RUN mkdir -p /app/data

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/commercio.db"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["sh", "-c", "mkdir -p /app/data && node docker-init.js && exec node server.js"]
