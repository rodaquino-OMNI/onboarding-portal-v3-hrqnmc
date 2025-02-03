# Stage 1: Builder
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    # Set timezone
    tzdata \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with exact versions
RUN npm ci --production=false

# Copy source code and config files
COPY . .

# Type check
RUN npm run typecheck

# Build production bundle
RUN NODE_ENV=production npm run build

# Run security audit
RUN npm audit

# Remove dev dependencies
RUN npm prune --production

# Compress static assets
RUN find dist -type f -regex '.*\.\(js\|css\|html\|svg\)$' -exec gzip -k {} \;

# Stage 2: Production
FROM nginx:1.25-alpine

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    tzdata \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone

# Create nginx user/group with restricted permissions
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

# Configure security headers and gzip compression
RUN echo 'include /etc/nginx/security-headers.conf;' > /etc/nginx/conf.d/default.conf && \
    echo 'gzip on;' >> /etc/nginx/conf.d/default.conf && \
    echo 'gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;' >> /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Configure health check endpoint
RUN echo "location /health { return 200 'healthy'; }" >> /etc/nginx/conf.d/default.conf

# Set resource limits
RUN echo "worker_rlimit_nofile 8192;" >> /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80

# Set user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]