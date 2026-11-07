# The API on Fly.io (server/fly.toml). Built from the repo root, since the server runs the app's
# own prompt and economy code from ../src. Node strips the TypeScript itself; no build step.
FROM node:24.14-slim

WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev

COPY scripts/ts-test-hooks.mjs scripts/
COPY src src
COPY server/src server/src

WORKDIR /app/server
ENV NODE_ENV=production
CMD ["node", "--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--import", "../scripts/ts-test-hooks.mjs", "src/index.ts"]
