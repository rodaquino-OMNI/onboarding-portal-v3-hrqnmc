# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Set build arguments and environment variables
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV} \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_AUDIT=true

# Copy package files
COPY package*.json ./

# Install dependencies with security checks
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm ci --audit=true && \
    npm audit fix --audit-level=moderate && \
    apk del .build-deps

# Copy source code with appropriate permissions
COPY --chown=node:node . .

# Build TypeScript to JavaScript with optimizations
RUN npm run build && \
    npm prune --production && \
    rm -rf src tests

# Production runtime stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set runtime environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    SECURE_HEAP=true \
    NODE_OPTIONS="--max-old-space-size=2048"

# Install security updates and runtime dependencies
RUN apk update && \
    apk upgrade && \
    apk add --no-cache tini tzdata && \
    addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    mkdir -p /app/dist /app/node_modules && \
    chown -R appuser:appgroup /app

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Configure security settings
RUN echo "kernel.unprivileged_userns_clone=1" >> /etc/sysctl.d/99-security.conf && \
    echo "fs.file-max=65535" >> /etc/sysctl.d/99-security.conf

# Set up volume for temporary files
VOLUME ["/tmp"]

# Expose service port
EXPOSE 3001

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Set container labels
LABEL maintainer="AUSTA Health" \
      service="auth-service" \
      version="1.0.0" \
      security.austa.io/hardened="true" \
      compliance.austa.io/lgpd="compliant"

# Switch to non-root user
USER appuser

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Set the application startup command
CMD ["node", "dist/index.js"]

# Security configurations
SECURITY_OPT ["no-new-privileges=true"]
SECURITY_OPT ["seccomp=unconfined"]

# Read-only root filesystem
READONLY_ROOTFS true

# Drop all capabilities and only add necessary ones
DROP_CAPABILITIES ALL
ADD_CAPABILITIES ["NET_BIND_SERVICE"]