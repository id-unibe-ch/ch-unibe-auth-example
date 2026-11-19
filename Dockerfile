# --- Build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# --- Runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# For the migration job: node scripts/migrate.mjs
COPY db ./db
COPY scripts ./scripts
USER node
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
