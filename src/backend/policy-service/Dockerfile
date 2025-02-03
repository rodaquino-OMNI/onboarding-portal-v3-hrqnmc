# Build stage
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

# Set working directory
WORKDIR /build

# Install security updates and build dependencies
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl tzdata && \
    rm -rf /var/cache/apk/*

# Copy POM file for dependency resolution
COPY pom.xml .

# Download and cache Maven dependencies
RUN mvn dependency:go-offline -B

# Copy source code and resources
COPY src ./src

# Run Maven build with production profile
RUN mvn clean package -DskipTests -Pproduction && \
    mv target/*.jar target/app.jar

# Production stage
FROM eclipse-temurin:17-jre-alpine

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache tzdata curl && \
    rm -rf /var/cache/apk/*

# Create non-root user/group
RUN addgroup -g 1000 policy-service && \
    adduser -u 1000 -G policy-service -s /sbin/nologin -D policy-service

# Set working directory
WORKDIR /app

# Copy JAR from builder stage
COPY --from=builder --chown=policy-service:policy-service /build/target/app.jar ./app.jar

# Set environment variables
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp -Xlog:gc*=info:file=/tmp/gc.log:time,uptime,level,tags:filecount=5,filesize=10M -Djava.security.egd=file:/dev/./urandom -Dfile.encoding=UTF-8" \
    PORT=8084 \
    SPRING_PROFILES_ACTIVE=prod \
    TZ=UTC

# Create required directories with proper permissions
RUN mkdir -p /tmp && \
    chown -R policy-service:policy-service /tmp && \
    chmod 750 /tmp && \
    chmod 440 app.jar

# Switch to non-root user
USER policy-service

# Expose service port
EXPOSE 8084

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8084/actuator/health || exit 1

# Set container labels
LABEL maintainer="AUSTA Health Tech Team" \
      application="policy-service" \
      version="${project.version}" \
      build-date="${build.date}" \
      vcs-ref="${git.commit.id.abbrev}" \
      vendor="AUSTA Healthcare"

# Define entry point
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]