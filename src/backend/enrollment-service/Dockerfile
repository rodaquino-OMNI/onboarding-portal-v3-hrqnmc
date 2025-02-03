# Stage 1: Build environment
FROM maven:3.9.3-eclipse-temurin-17 AS builder

# Create non-root user for build
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Copy pom.xml for dependency resolution
COPY pom.xml .

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build application with production profile
RUN mvn clean package -DskipTests -Pproduction && \
    mkdir -p target/extracted && \
    java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

# Stage 2: Production environment
FROM eclipse-temurin:17-jre

# Create non-root user and group
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m -s /bin/bash appuser && \
    mkdir -p /app /var/log/app /tmp/heap-dumps && \
    chown -R appuser:appgroup /app /var/log/app /tmp/heap-dumps

WORKDIR /app

# Copy application layers from builder
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/target/extracted/application/ ./

# Configure JVM options for containerized environment
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 \
    -XX:InitialRAMPercentage=50.0 \
    -XX:+UseG1GC \
    -XX:+HeapDumpOnOutOfMemoryError \
    -XX:HeapDumpPath=/tmp/heap-dumps \
    -XX:+ExitOnOutOfMemoryError \
    -Djava.security.egd=file:/dev/./urandom \
    -Duser.timezone=UTC \
    -XX:MaxMetaspaceSize=256m \
    -XX:MaxDirectMemorySize=256m \
    -Xss1m"

# Set production profile
ENV SPRING_PROFILES_ACTIVE=production
ENV SERVER_PORT=8080

# Configure health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${SERVER_PORT}/actuator/health || exit 1

# Security configurations
USER appuser
EXPOSE ${SERVER_PORT}

# Set read-only filesystem with exceptions
VOLUME ["/tmp", "/var/log/app", "/tmp/heap-dumps"]
RUN chmod -R 555 /app

# Drop all capabilities and prevent privilege escalation
LABEL security.capabilities.drop="ALL"
LABEL security.no-new-privileges="true"

# Set entry point with proper user
ENTRYPOINT [ "sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.JarLauncher" ]