# Notion → Google Calendar sync. Long-running process: runs an immediate sync
# on boot, then every 30 minutes via node-cron.
FROM node:22-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the source.
COPY . .

ENV NODE_ENV=production
# Persistent files (tokens.json, sync-state.json) live here — mount a volume at
# /app/data in Dokploy so they survive redeploys.
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

CMD ["node", "index.js"]
