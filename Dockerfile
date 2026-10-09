FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm install
COPY tsconfig.base.json ./
COPY packages/engine packages/engine
COPY packages/server packages/server
COPY packages/client packages/client
RUN npm run build -w engine && npm run build -w client

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm install --omit=dev
COPY --from=builder /app/packages/engine/dist packages/engine/dist
COPY packages/server/src packages/server/src
COPY --from=builder /app/packages/client/dist packages/client/dist

EXPOSE 3000
CMD ["node", "packages/server/src/index.ts"]
