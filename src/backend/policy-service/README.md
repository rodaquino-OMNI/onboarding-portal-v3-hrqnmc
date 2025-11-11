# Policy Service

## Overview
Java Spring Boot microservice for health insurance policy management, underwriting workflows, and policy activation.

## Technology Stack
- **Language**: Java 17 LTS
- **Framework**: Spring Boot 3.x
- **ORM**: Spring Data JPA + Hibernate
- **Database**: PostgreSQL 15+
- **Messaging**: Spring Kafka
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
cd src/backend/policy-service

# Build
mvn clean install

# Run tests
mvn test

# Start application
mvn spring-boot:run

# Run with dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Configuration
```properties
# Application
spring.application.name=policy-service
server.port=8081

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/policy_db
spring.datasource.username=postgres
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=validate

# Kafka
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.consumer.group-id=policy-service

# External Services
austa.superapp.url=https://api.austa.com.br/superapp
austa.superapp.api-key=${SUPERAPP_API_KEY}
```

## API Endpoints

### Policy Management
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies/{id}` - Get policy details
- `PATCH /api/v1/policies/{id}/status` - Update policy status
- `GET /api/v1/policies/search` - Search policies

### Underwriting
- `POST /api/v1/policies/{id}/underwriting` - Process underwriting decision
- `GET /api/v1/policies/pending` - Get pending underwriting cases
- `GET /api/v1/policies/{id}/risk-assessment` - Get risk assessment

### Premium Calculation
- `POST /api/v1/policies/calculate-premium` - Calculate monthly premium
- `GET /api/v1/policies/{id}/premium-breakdown` - Get premium details

### Health Checks
- `GET /actuator/health` - Health status
- `GET /actuator/health/readiness` - Readiness probe
- `GET /actuator/health/liveness` - Liveness probe

## Features

### Underwriting Workflow
- Automated risk-based policy creation
- Manual underwriting for high-risk cases
- Coverage modification support
- Waiting period configuration
- Exclusion management

### Policy Lifecycle
- Draft → Pending Activation → Active
- Suspension and reactivation
- Cancellation with refund calculation
- Renewal workflow

### Integration
- **AUSTA SuperApp**: Policy activation and synchronization
- **Enrollment Service**: Enrollment data retrieval
- **Health Service**: Risk assessment integration
- **Payment Gateway**: Premium payment processing

## Database Schema

### Core Tables
- `policies` - Policy details and status
- `underwriting_decisions` - Underwriting history
- `premium_calculations` - Premium breakdown
- `policy_coverage` - Coverage details
- `policy_exclusions` - Medical exclusions

## Testing

```bash
# Unit tests
mvn test

# Integration tests
mvn verify -Pintegration-tests

# Coverage report
mvn jacoco:report
# View: target/site/jacoco/index.html

# Contract tests
mvn test -Pcontract-tests
```

## Business Rules

### Premium Calculation
- Base premium by age group
- Risk factor adjustments
- Coverage level multipliers
- Family discount (if applicable)

### Underwriting Criteria
- **Auto-approve**: Risk score < 30
- **Manual review**: Risk score 30-70
- **Auto-decline**: Risk score > 70
- **Additional documents**: Based on risk factors

## Docker

```bash
# Build
docker build -t austa/policy-service:latest .

# Run
docker run -p 8081:8081 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/policy_db \
  -e SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092 \
  austa/policy-service:latest
```

## Performance Targets
- Create Policy: < 300ms
- Calculate Premium: < 100ms
- Get Policy: < 50ms
- Underwriting Decision: < 500ms

## Monitoring
- Metrics: `/actuator/prometheus`
- Traces: Jaeger integration
- Logs: JSON structured logging
- Alerts: Policy creation failures, activation errors

## Support
- Email: dev-team@austa.com.br
- API Documentation: ../../openapi/policy-service.yaml
