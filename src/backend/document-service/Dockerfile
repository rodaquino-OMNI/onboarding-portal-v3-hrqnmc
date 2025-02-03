# Stage 1: Builder
FROM golang:1.21-alpine AS builder

# Set build arguments
ARG PORT=8080
ARG USER=docservice
ARG UID=10001

# Set build environment variables
ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    GO111MODULE=on

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    ca-certificates \
    tzdata \
    git \
    && update-ca-certificates

# Create non-root user
RUN adduser -D -u ${UID} ${USER}

# Set working directory
WORKDIR /build

# Copy go mod files first for better layer caching
COPY go.mod go.sum ./

# Download and verify dependencies
RUN go mod download && \
    go mod verify

# Copy source code with proper permissions
COPY . .
RUN chown -R ${USER}:${USER} .

# Build binary with security flags and optimizations
RUN go build -trimpath -ldflags="-w -s \
    -X main.version=$(git describe --tags --always) \
    -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -o /build/document-service ./cmd/server

# Stage 2: Final runtime
FROM alpine:3.18

# Set runtime arguments
ARG PORT=8080
ARG USER=docservice
ARG UID=10001

# Set environment variables
ENV PORT=${PORT}

# Install runtime dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    ca-certificates \
    tzdata \
    && update-ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user and required directories
RUN adduser -D -u ${UID} ${USER} && \
    mkdir -p /data /tmp && \
    chown -R ${USER}:${USER} /data /tmp

# Copy binary and set permissions
COPY --from=builder --chown=${USER}:${USER} /build/document-service /app/document-service
RUN chmod 500 /app/document-service

# Set working directory
WORKDIR /app

# Switch to non-root user
USER ${USER}:${USER}

# Expose service port
EXPOSE ${PORT}

# Configure volumes for document processing
VOLUME ["/data", "/tmp"]

# Set resource limits
LABEL resource.limits.cpu="1000m" \
      resource.limits.memory="2Gi" \
      resource.limits.pids="100"

# Configure security options
LABEL security.no_new_privileges="true" \
      security.read_only_root="true" \
      security.drop_capabilities="ALL"

# Configure healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Set entrypoint
ENTRYPOINT ["/app/document-service"]