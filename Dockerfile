# syntax = docker/dockerfile:1
ARG NODE_VERSION=22-slim
FROM node:${NODE_VERSION} AS base

LABEL project="saeta-backend-v2"

WORKDIR /app
ENV NODE_ENV="production"

# Build stage
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild bcrypt

COPY . .
RUN pnpm build && pnpm prune --prod

# Final runtime stage
FROM base

WORKDIR /app

RUN mkdir -p /app/uploads

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
