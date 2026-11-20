FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY app/package*.json app/
RUN --mount=type=secret,id=npm_ca \
    if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS backend-dependencies
WORKDIR /app/app
COPY app/package*.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci --omit=dev --workspaces=false && npm cache clean --force

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=backend-dependencies --chown=node:node /app/app ./app
COPY --from=build --chown=node:node /app/app/dist ./app/dist
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node --input-type=module -e "try { const r = await fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health', {signal: AbortSignal.timeout(4000)}); const b = await r.json(); process.exit(r.ok && b.status === 'ok' && b.database === 'connected' ? 0 : 1); } catch { process.exit(1); }"
CMD ["node", "app/dist/server.js"]
