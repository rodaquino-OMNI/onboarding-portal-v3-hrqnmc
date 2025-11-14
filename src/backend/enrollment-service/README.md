# Enrollment Service

## Overview
Java Spring Boot microservice for managing health plan enrollment applications, beneficiary data, and enrollment workflows.

## Technology Stack
- **Language**: Java 17 LTS
- **Framework**: Spring Boot 3.x
- **ORM**: Spring Data JPA + Hibernate
- **Database**: PostgreSQL 15+
- **Messaging**: Kafka
- **Testing**: JUnit 5 + Mockito
- **Build**: Maven 3.9+

## Quick Start

### Prerequisites
```bash
- Java 17 JDK
- Maven 3.9+
- PostgreSQL 15+
- Apache Kafka
```

### Local Development
```bash
cd src/backend/enrollment-service

# Build project
mvn clean install

# Run tests
mvn test

# Run application
mvn spring-boot:run

# Run with profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Environment Configuration
```properties
# Application
spring.application.name=enrollment-service
server.port=8080

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/enrollment_db
spring.datasource.username=postgres
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false

# Kafka
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.consumer.group-id=enrollment-service

# Redis Cache
spring.redis.host=localhost
spring.redis.port=6379
```

## API Endpoints

### Enrollment Operations
- `POST /api/v1/enrollments` - Create enrollment
- `GET /api/v1/enrollments/{id}` - Get enrollment details
- `PUT /api/v1/enrollments/{id}` - Update enrollment
- `DELETE /api/v1/enrollments/{id}` - Delete enrollment
- `POST /api/v1/enrollments/{id}/submit` - Submit for review
- `GET /api/v1/enrollments/search` - Search enrollments

### Document Operations
- `POST /api/v1/enrollments/{id}/documents` - Upload document
- `GET /api/v1/enrollments/{id}/documents` - List documents
- `DELETE /api/v1/enrollments/{id}/documents/{docId}` - Remove document

### Health Checks
- `GET /actuator/health` - Health status
- `GET /actuator/health/readiness` - Readiness probe
- `GET /actuator/health/liveness` - Liveness probe

## Database Schema

### Core Tables
- `enrollments` - Enrollment applications
- `beneficiaries` - Beneficiary information
- `enrollment_documents` - Document associations
- `enrollment_history` - Status change audit trail

## Testing

```bash
# Unit tests
mvn test

# Integration tests
mvn verify -Pintegration-tests

# Coverage report
mvn jacoco:report
# View: target/site/jacoco/index.html
```

## Docker

```bash
# Build
docker build -t austa/enrollment-service:latest .

# Run
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/enrollment_db \
  austa/enrollment-service:latest
```

## Performance Targets
- Create Enrollment: < 200ms (p95)
- Get Enrollment: < 50ms (p95)
- Search: < 100ms (p95)
- Document Upload: < 3s (10MB file)

## Monitoring
- Metrics: `/actuator/prometheus`
- Traces: Jaeger integration enabled
- Logs: JSON structured logging

## Support
- Email: dev-team@austa.com.br
- Documentation: ../../openapi/enrollment-service.yaml
