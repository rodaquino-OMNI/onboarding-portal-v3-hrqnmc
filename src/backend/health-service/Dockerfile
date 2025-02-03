# Stage 1: Builder
FROM python:3.11-slim AS builder

# Set build arguments and environment variables
ARG APP_USER=appuser
ARG APP_UID=10001
ARG APP_GID=10001
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and set permissions
WORKDIR /build

# Copy requirements file
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt \
    && pip check \
    && find /usr/local -depth \
        \( \
            \( -type d -a \( -name test -o -name tests -o -name idle_test \) \) \
            -o \( -type f -a \( -name '*.pyc' -o -name '*.pyo' -o -name '*.a' \) \) \
        \) -exec rm -rf '{}' +

# Stage 2: Final
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_USER=appuser \
    APP_HOME=/app \
    APP_UID=10001 \
    APP_GID=10001 \
    PORT=8000 \
    METRICS_PORT=9090 \
    MAX_WORKERS=4

# Create non-root user
RUN groupadd -g ${APP_GID} ${APP_USER} && \
    useradd -u ${APP_UID} -g ${APP_USER} -s /bin/bash -m ${APP_USER} && \
    mkdir -p ${APP_HOME}/logs && \
    chown -R ${APP_USER}:${APP_USER} ${APP_HOME}

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Set working directory
WORKDIR ${APP_HOME}

# Copy application code
COPY --chown=${APP_USER}:${APP_USER} src/ ${APP_HOME}/src/

# Create necessary directories with proper permissions
RUN mkdir -p ${APP_HOME}/logs /tmp/health_service && \
    chown -R ${APP_USER}:${APP_USER} ${APP_HOME}/logs /tmp/health_service && \
    chmod -R 755 ${APP_HOME}/src

# Switch to non-root user
USER ${APP_USER}

# Expose ports
EXPOSE ${PORT} ${METRICS_PORT}

# Set up volumes
VOLUME ["/app/logs", "/tmp/health_service"]

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Set resource limits
ENV GOMAXPROCS=2
ENV MALLOC_ARENA_MAX=2

# Set security options
LABEL org.opencontainers.image.source="https://github.com/austa/health-service" \
      org.opencontainers.image.description="Health Assessment Service" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="AUSTA" \
      org.opencontainers.image.licenses="Proprietary"

# Use tini as init process
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the application with proper settings
CMD ["python", "-m", "src.main"]