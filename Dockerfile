# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY frontend/ ./
RUN npm run build

FROM golang:1.26-bookworm AS backend-builder

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      gcc \
      libc6-dev \
      libsqlite3-dev \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
COPY --from=frontend-builder /app/frontend/build ./frontend/build

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o /out/main .

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      sqlite3 \
      libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /out/main /app/main

EXPOSE 8080

ENTRYPOINT ["/app/main", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]
