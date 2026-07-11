# ---- Build stage ----
# Multi-stage build. Works on the Raspberry Pi 5 (arm64) as the node image is multi-arch.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install dependencies (leverages layer caching)
COPY package*.json ./
RUN npm ci

# Compile TypeScript -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies in the final image
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output
COPY --from=build /app/dist ./dist

# The host-provided database is mounted at runtime (see docker-compose):
#   volumes:
#     - ./data:/app/data:ro
ENV DATA_DIR=/app/data
ENV PORT=3001
EXPOSE 3001

# Run as the non-root `node` user provided by the base image
USER node

CMD ["node", "dist/index.js"]

# ---- Test stage ----
# Runs the unit test suite (vitest). Selected via docker-compose (`target: test`).
# Reuses the build stage, which already has all (incl. dev) dependencies and the
# TypeScript sources; only the tests are added. The suite is self-contained
# (pure functions) and needs no mounted data volume.
FROM build AS test
ENV NODE_ENV=test
COPY tests ./tests
CMD ["npm", "test"]
