FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY app/package*.json app/
RUN npm --prefix app ci
COPY . .
RUN npm run build && npm --prefix app run build && npm --prefix app prune --omit=dev
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/app ./app
COPY --from=build --chown=node:node /app/dist ./frontend
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "app/dist/server.js"]
