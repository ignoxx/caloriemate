FROM node:22 AS node-builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

RUN npm run build

# Build Go application
FROM golang:1.25 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

COPY --from=node-builder /app/build ./frontend/build

RUN go build -o main

RUN chmod +x main

EXPOSE 8080

ENTRYPOINT ["/app/main", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]

