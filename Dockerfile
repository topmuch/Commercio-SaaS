FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git sqlite3 python3 make g++ \
    && npm install -g bun \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone https://github.com/topmuch/Commercio-SaaS.git .

RUN bun install

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/commercio.db
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN bun run build

RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma db push --skip-generate 2>/dev/null; node docker-init.js; exec node .next/standalone/server.js"]
