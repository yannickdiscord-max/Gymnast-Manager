# Turnteam API for Northflank / Docker
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
COPY patches ./patches
RUN npm ci

# App source (needed for server bundle + shared schema)
COPY . .

# Bundle Express API (esbuild → server_dist/)
RUN npm run server:build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Listen host is 0.0.0.0 in server/index.ts (required in containers)
CMD ["node", "server_dist/index.js"]
