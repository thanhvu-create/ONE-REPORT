# Single-stage build: keeps the image straightforward for MVP and ensures the
# Prisma client is generated against the same node_modules that runs at startup.
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY src ./src

RUN npx prisma generate \
 && npm run build

RUN mkdir -p /app/uploads/audio

ENV NODE_ENV=production
EXPOSE 4000

# On boot: apply migrations, seed (idempotent upserts), then start the API.
CMD npx prisma migrate deploy \
 && npx prisma db seed \
 && node dist/main.js
