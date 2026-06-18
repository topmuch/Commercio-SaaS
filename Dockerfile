# Teranga Biz (Commercio) - Dockerfile for Coolify
FROM node:20-alpine

# Install required packages
RUN apk add --no-cache git libc6-compat sqlite
RUN npm install -g bun

WORKDIR /app

# Clone the repository
RUN git clone https://github.com/topmuch/Commercio-SaaS.git .

# Install dependencies
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Build the application with more robust error handling
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/commercio.db

# Check if next.config.ts exists
RUN ls -la

# Build with explicit command
RUN bun run build || (echo "Build failed, checking errors..." && cat .next/trace || true && exit 1)

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/commercio.db

# Start command - push schema and start server
CMD ["sh", "-c", "mkdir -p /app/data && export DATABASE_URL=file:/app/data/commercio.db && npx prisma db push --skip-generate 2>/dev/null || true && exec node .next/standalone/server.js"]