# Stage 1: Security scanning
FROM snyk/snyk:alpine AS security-scan
WORKDIR /app
COPY package*.json ./
RUN snyk test --severity-threshold=high || (echo 'High severity vulnerabilities found!' && exit 1)

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files with strict version locking
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies with security checks
RUN yarn install --frozen-lockfile \
    && yarn audit \
    && yarn cache clean

# Copy source code and configuration
COPY tsconfig*.json ./
COPY src/ ./src/

# Build with optimizations
RUN yarn build:prod \
    && yarn test \
    && yarn prune production

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install Kong and security dependencies
RUN apk add --no-cache \
    curl \
    openssl \
    ca-certificates \
    tzdata \
    && addgroup -g 1001 -S kong \
    && adduser -u 1001 -S kong -G kong

# Set security headers and permissions
ENV NODE_ENV=production \
    KONG_PROXY_LISTEN=0.0.0.0:3000 \
    KONG_ADMIN_LISTEN=0.0.0.0:8001 \
    KONG_DATABASE=off \
    TZ=UTC

# Copy built application
COPY --from=builder --chown=kong:kong /app/dist ./dist
COPY --from=builder --chown=kong:kong /app/node_modules ./node_modules
COPY --chown=kong:kong package.json ./

# Copy Kong configuration
COPY --chown=kong:kong src/config/kong.config.ts ./config/

# Create required directories with proper permissions
RUN mkdir -p \
    /usr/local/kong/declarative \
    /usr/local/kong/ssl \
    /tmp/kong \
    && chown -R kong:kong \
        /usr/local/kong \
        /tmp/kong

# Configure health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000 8001

# Set user
USER kong

# Set entry point
ENTRYPOINT ["node", "dist/index.js"]

# Configure volumes
VOLUME ["/usr/local/kong/declarative", "/usr/local/kong/ssl"]

# Add metadata labels
LABEL maintainer="AUSTA Health" \
    version="1.0.0" \
    description="API Gateway service for Pre-paid Health Plan Onboarding Portal" \
    org.opencontainers.image.source="https://github.com/austa/health-onboarding" \
    org.opencontainers.image.licenses="Private" \
    security.protocol="Strict" \
    monitoring.enabled="true"