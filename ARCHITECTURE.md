# AUSTA Pre-paid Health Plan Onboarding Portal - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Service Architecture](#service-architecture)
6. [Data Architecture](#data-architecture)
7. [Security Architecture](#security-architecture)
8. [Integration Architecture](#integration-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Performance & Scalability](#performance--scalability)
11. [Disaster Recovery](#disaster-recovery)
12. [Architecture Decision Records](#architecture-decision-records)

---

## System Overview

### Purpose
The AUSTA Pre-paid Health Plan Onboarding Portal is an enterprise-grade system designed to automate and streamline the enrollment process for new health plan beneficiaries. The platform provides secure, scalable, and LGPD-compliant onboarding capabilities.

### Key Capabilities
- **Multi-role Portal**: Supports Brokers, Beneficiaries, Underwriters, HR Personnel, and Administrators
- **AI-Powered Health Assessment**: Dynamic questionnaire generation with ML-driven risk assessment
- **Secure Document Management**: Encrypted storage and retrieval of sensitive documents
- **Automated Policy Issuance**: Streamlined underwriting and policy generation
- **Real-time Integration**: Seamless connectivity with AUSTA healthcare ecosystem
- **Compliance Management**: Built-in LGPD compliance and audit trail capabilities

### Business Context
```
┌─────────────────────────────────────────────────────────────┐
│                     Business Context                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Brokers ──────┐                                             │
│                 ├──► Onboarding Portal ◄──► AUSTA Systems   │
│  Beneficiaries ─┤                                            │
│                 │                                             │
│  Underwriters ──┤                                            │
│                 │                                             │
│  HR Personnel ──┘                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### Design Principles
1. **Security First**: All design decisions prioritize data security and privacy
2. **LGPD Compliance**: Built-in compliance with Brazilian data protection law
3. **Scalability**: Horizontal scaling capabilities for all services
4. **Resilience**: Fault-tolerant design with circuit breakers and retries
5. **Observability**: Comprehensive monitoring, logging, and tracing
6. **Automation**: Infrastructure as Code and CI/CD automation
7. **Microservices**: Domain-driven service decomposition
8. **Cloud Native**: Container-based deployment on Kubernetes

### Technology Choices Rationale

#### Frontend: React with TypeScript
- **Why**: Type safety, component reusability, large ecosystem
- **Trade-offs**: Higher learning curve vs Vue.js, but better TypeScript integration

#### Backend Services: Polyglot Microservices
- **Node.js (Auth Service)**: Fast I/O, excellent for authentication flows
- **Java Spring (Enrollment & Policy Services)**: Enterprise features, robust transaction management
- **Python FastAPI (Health Service)**: ML integration, async capabilities for AI processing
- **Go (Document Service)**: High performance, excellent for binary file handling

#### Database: PostgreSQL
- **Why**: ACID compliance, JSON support, mature replication
- **Trade-offs**: More complex scaling vs NoSQL, but critical for healthcare data integrity

#### Cache: Redis
- **Why**: High performance, persistence options, pub/sub capabilities
- **Trade-offs**: Memory-based storage limits, but acceptable for session/cache use cases

#### Storage: MinIO (S3-compatible)
- **Why**: Open-source, S3-compatible API, encryption support
- **Trade-offs**: Self-managed vs cloud storage, but better cost control

---

## Technology Stack

### Frontend Layer
```
┌────────────────────────────────────────────────────┐
│ Web Application                                     │
├────────────────────────────────────────────────────┤
│ Framework:       React 18.x                         │
│ Language:        TypeScript 5.x                     │
│ State Mgmt:      Redux Toolkit                      │
│ UI Library:      Material-UI (MUI) 5.x             │
│ Forms:           React Hook Form + Yup              │
│ HTTP Client:     Axios                              │
│ Routing:         React Router 6.x                   │
│ Testing:         Jest + React Testing Library       │
│ Build:           Vite 5.x                           │
└────────────────────────────────────────────────────┘
```

### Backend Services

#### Authentication Service (Node.js)
```
Technology:       Node.js 20 LTS
Framework:        Express.js 4.x
Language:         TypeScript 5.x
Authentication:   JWT + Passport.js
MFA:              TOTP + SMS (Twilio)
Session:          Redis-backed sessions
Testing:          Jest + Supertest
Port:             3001
```

#### Enrollment Service (Java)
```
Technology:       Java 17 LTS
Framework:        Spring Boot 3.x
ORM:              Spring Data JPA + Hibernate
API:              Spring Web MVC
Security:         Spring Security
Validation:       Hibernate Validator
Testing:          JUnit 5 + Mockito
Port:             8080
```

#### Health Assessment Service (Python)
```
Technology:       Python 3.11
Framework:        FastAPI 0.109+
ORM:              SQLAlchemy 2.x
AI/ML:            TensorFlow, scikit-learn
Async:            asyncio + httpx
Testing:          pytest + pytest-asyncio
Port:             8000
```

#### Document Service (Go)
```
Technology:       Go 1.21
Framework:        Gin Web Framework
Storage:          MinIO SDK
Encryption:       Go crypto library
Testing:          Go testing + testify
Port:             8001
```

#### Policy Service (Java)
```
Technology:       Java 17 LTS
Framework:        Spring Boot 3.x
ORM:              Spring Data JPA
Messaging:        Spring Kafka
Testing:          JUnit 5 + Mockito
Port:             8081
```

### Data Layer
```
┌────────────────────────────────────────────────────┐
│ Primary Database                                    │
│ - PostgreSQL 15.x                                   │
│ - TimescaleDB extension for audit logs             │
│ - pgcrypto for encryption                           │
│ - High Availability: Streaming Replication          │
├────────────────────────────────────────────────────┤
│ Cache Layer                                         │
│ - Redis 7.x                                         │
│ - Session storage                                   │
│ - Application cache                                 │
│ - Rate limiting                                     │
├────────────────────────────────────────────────────┤
│ Object Storage                                      │
│ - MinIO (S3-compatible)                             │
│ - Encrypted document storage                        │
│ - Versioning enabled                                │
│ - Retention policies                                │
└────────────────────────────────────────────────────┘
```

### Infrastructure Layer
```
┌────────────────────────────────────────────────────┐
│ Cloud Platform:      Azure Cloud                   │
│ Container Runtime:   Docker 24.x                    │
│ Orchestration:       Kubernetes 1.27+               │
│ Service Mesh:        Istio 1.19+                    │
│ API Gateway:         Kong Gateway 3.x               │
│ Load Balancer:       Azure Load Balancer            │
│ CDN:                 Azure CDN                      │
│ Monitoring:          Prometheus + Grafana           │
│ Logging:             ELK Stack (Elasticsearch)      │
│ Tracing:             Jaeger                         │
│ CI/CD:               GitHub Actions                 │
│ IaC:                 Terraform 1.5+                 │
└────────────────────────────────────────────────────┘
```

---

## System Architecture

### High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────▼────────────┐
                │   Azure CDN + WAF       │
                │   (Static Assets)       │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │  Azure Load Balancer    │
                └────────────┬────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌──────▼──────┐
│ React SPA     │   │  API Gateway    │   │  Admin UI   │
│ (Nginx)       │   │  (Kong)         │   │  (React)    │
└───────────────┘   └────────┬────────┘   └─────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌──────▼──────┐     ┌─────▼─────┐
    │  Auth    │      │ Enrollment  │     │  Health   │
    │ Service  │◄─────┤  Service    │────►│  Service  │
    │ (Node)   │      │  (Java)     │     │ (Python)  │
    └────┬─────┘      └──────┬──────┘     └─────┬─────┘
         │                   │                   │
         │              ┌────▼──────┐      ┌─────▼─────┐
         │              │  Policy   │      │ Document  │
         │              │  Service  │      │  Service  │
         │              │  (Java)   │      │  (Go)     │
         │              └────┬──────┘      └─────┬─────┘
         │                   │                   │
    ┌────▼─────┬─────────────▼──────┬────────────▼─────┐
    │          │                    │                   │
┌───▼────┐ ┌───▼────┐         ┌────▼────┐        ┌─────▼─────┐
│ Redis  │ │ PostgreSQL       │ MinIO   │        │  Kafka    │
│ Cache  │ │ Database  │      │ Storage │        │ Message   │
└────────┘ └───────────┘      └─────────┘        └───────────┘
```

### Component Interaction Flow

#### User Registration & Authentication Flow
```
┌─────────┐     ┌─────────┐     ┌──────┐     ┌──────────┐     ┌────────┐
│ Browser │────►│   CDN   │────►│ Kong │────►│   Auth   │────►│ Redis  │
│         │     │         │     │      │     │ Service  │     │ Cache  │
└─────────┘     └─────────┘     └──────┘     └────┬─────┘     └────────┘
                                                   │
                                                   ▼
                                           ┌──────────────┐
                                           │  PostgreSQL  │
                                           │  (Users DB)  │
                                           └──────────────┘
```

#### Enrollment Process Flow
```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Broker  │────►│  Enrollment  │────►│   Health    │────►│ AI/ML    │
│  Portal  │     │   Service    │     │   Service   │     │ Service  │
└──────────┘     └──────┬───────┘     └──────┬──────┘     └──────────┘
                        │                    │
                        ▼                    ▼
                 ┌──────────────┐     ┌──────────────┐
                 │  PostgreSQL  │     │   Document   │
                 │ (Enroll DB)  │     │   Service    │
                 └──────────────┘     └──────┬───────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │    MinIO     │
                                      │   Storage    │
                                      └──────────────┘
```

#### Policy Issuance Flow
```
┌─────────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────────┐
│ Underwriter │────►│   Policy    │────►│  Kafka   │────►│   AUSTA     │
│   Portal    │     │  Service    │     │ Message  │     │   Systems   │
└─────────────┘     └──────┬──────┘     └──────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │ (Policy DB)  │
                    └──────────────┘
```

---

## Service Architecture

### Microservices Decomposition

#### 1. Authentication Service
```
┌─────────────────────────────────────────────────────┐
│ Authentication Service (Node.js + TypeScript)        │
├─────────────────────────────────────────────────────┤
│ Responsibilities:                                    │
│ • User registration and login                        │
│ • JWT token generation and validation                │
│ • Multi-factor authentication (MFA)                  │
│ • Session management                                 │
│ • Password reset and account recovery                │
│ • Rate limiting and brute-force protection           │
├─────────────────────────────────────────────────────┤
│ API Endpoints:                                       │
│ POST   /api/v1/auth/register                         │
│ POST   /api/v1/auth/login                            │
│ POST   /api/v1/auth/logout                           │
│ POST   /api/v1/auth/refresh                          │
│ POST   /api/v1/auth/mfa/verify                       │
│ POST   /api/v1/auth/password/reset                   │
│ GET    /api/v1/auth/session                          │
├─────────────────────────────────────────────────────┤
│ Dependencies:                                        │
│ • Redis (session storage)                            │
│ • PostgreSQL (user data)                             │
│ • Twilio (SMS for MFA)                               │
└─────────────────────────────────────────────────────┘
```

#### 2. Enrollment Service
```
┌─────────────────────────────────────────────────────┐
│ Enrollment Service (Java + Spring Boot)              │
├─────────────────────────────────────────────────────┤
│ Responsibilities:                                    │
│ • Enrollment application creation                    │
│ • Beneficiary data management                        │
│ • Enrollment status tracking                         │
│ • Document association                               │
│ • Enrollment submission workflow                     │
│ • LGPD consent management                            │
├─────────────────────────────────────────────────────┤
│ API Endpoints:                                       │
│ POST   /api/v1/enrollments                           │
│ GET    /api/v1/enrollments/{id}                      │
│ PUT    /api/v1/enrollments/{id}                      │
│ POST   /api/v1/enrollments/{id}/submit               │
│ POST   /api/v1/enrollments/{id}/documents            │
│ GET    /api/v1/enrollments/search                    │
├─────────────────────────────────────────────────────┤
│ Dependencies:                                        │
│ • PostgreSQL (enrollment data)                       │
│ • Health Service (questionnaire)                     │
│ • Document Service (file storage)                    │
│ • Kafka (event publishing)                           │
└─────────────────────────────────────────────────────┘
```

#### 3. Health Assessment Service
```
┌─────────────────────────────────────────────────────┐
│ Health Service (Python + FastAPI)                    │
├─────────────────────────────────────────────────────┤
│ Responsibilities:                                    │
│ • Dynamic questionnaire generation                   │
│ • AI-powered question selection                      │
│ • Response validation and storage                    │
│ • Risk assessment calculation                        │
│ • ML model integration                               │
│ • Health data encryption                             │
├─────────────────────────────────────────────────────┤
│ API Endpoints:                                       │
│ POST   /api/v1/health-assessment                     │
│ GET    /api/v1/health-assessment/{id}/next           │
│ POST   /api/v1/health-assessment/{id}/response       │
│ GET    /api/v1/health-assessment/{id}/risk           │
│ GET    /api/v1/health-assessment/{id}/summary        │
├─────────────────────────────────────────────────────┤
│ Dependencies:                                        │
│ • PostgreSQL (questionnaire data)                    │
│ • AI/ML Services (TensorFlow)                        │
│ • Redis (caching)                                    │
└─────────────────────────────────────────────────────┘
```

#### 4. Document Service
```
┌─────────────────────────────────────────────────────┐
│ Document Service (Go)                                │
├─────────────────────────────────────────────────────┤
│ Responsibilities:                                    │
│ • Secure document upload                             │
│ • AES-256 encryption/decryption                      │
│ • Document metadata management                       │
│ • Document retrieval and download                    │
│ • Document versioning                                │
│ • Retention policy enforcement                       │
├─────────────────────────────────────────────────────┤
│ API Endpoints:                                       │
│ POST   /api/v1/documents                             │
│ GET    /api/v1/documents/{id}                        │
│ DELETE /api/v1/documents/{id}                        │
│ GET    /api/v1/documents/{id}/versions               │
├─────────────────────────────────────────────────────┤
│ Dependencies:                                        │
│ • MinIO (object storage)                             │
│ • PostgreSQL (metadata)                              │
│ • Vault (encryption keys)                            │
└─────────────────────────────────────────────────────┘
```

#### 5. Policy Service
```
┌─────────────────────────────────────────────────────┐
│ Policy Service (Java + Spring Boot)                  │
├─────────────────────────────────────────────────────┤
│ Responsibilities:                                    │
│ • Policy creation and management                     │
│ • Underwriting workflow                              │
│ • Premium calculation                                │
│ • Policy status management                           │
│ • Coverage details management                        │
│ • Integration with AUSTA SuperApp                    │
├─────────────────────────────────────────────────────┤
│ API Endpoints:                                       │
│ POST   /api/v1/policies                              │
│ GET    /api/v1/policies/{id}                         │
│ PATCH  /api/v1/policies/{id}/status                  │
│ POST   /api/v1/policies/{id}/underwriting            │
│ GET    /api/v1/policies/pending                      │
├─────────────────────────────────────────────────────┤
│ Dependencies:                                        │
│ • PostgreSQL (policy data)                           │
│ • Kafka (event publishing)                           │
│ • AUSTA SuperApp (policy activation)                 │
└─────────────────────────────────────────────────────┘
```

---

## Data Architecture

### Database Schema Overview

#### User & Authentication Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    account_locked BOOLEAN DEFAULT false,
    failed_login_attempts INT DEFAULT 0,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Enrollment Schema
```sql
-- Enrollments table
CREATE TABLE enrollments (
    id UUID PRIMARY KEY,
    beneficiary_id UUID REFERENCES users(id),
    broker_id UUID REFERENCES users(id),
    guardian_id UUID,
    status VARCHAR(50) NOT NULL,
    personal_info JSONB NOT NULL,
    address_info JSONB NOT NULL,
    health_assessment_id UUID,
    lgpd_consent BOOLEAN NOT NULL,
    consent_timestamp TIMESTAMP,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    enrollment_id UUID REFERENCES enrollments(id),
    document_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    encryption_key_id VARCHAR(255),
    checksum VARCHAR(64),
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

#### Health Assessment Schema
```sql
-- Health questionnaires table
CREATE TABLE health_questionnaires (
    id UUID PRIMARY KEY,
    enrollment_id UUID REFERENCES enrollments(id),
    status VARCHAR(50) NOT NULL,
    risk_score DECIMAL(5,2),
    risk_level VARCHAR(20),
    ai_model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Question responses table
CREATE TABLE question_responses (
    id UUID PRIMARY KEY,
    questionnaire_id UUID REFERENCES health_questionnaires(id),
    question_id UUID NOT NULL,
    response_data JSONB NOT NULL,  -- Encrypted
    answered_at TIMESTAMP DEFAULT NOW()
);
```

#### Policy Schema
```sql
-- Policies table
CREATE TABLE policies (
    id UUID PRIMARY KEY,
    enrollment_id UUID REFERENCES enrollments(id),
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    monthly_premium DECIMAL(10,2) NOT NULL,
    coverage_details JSONB,
    waiting_periods JSONB,
    exclusions JSONB,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    underwriting_decision JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Audit Trail Schema
```sql
-- Audit logs table (TimescaleDB hypertable)
CREATE TABLE audit_logs (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    user_id UUID,
    service_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_data JSONB,
    response_status INT,
    lgpd_category VARCHAR(50),
    PRIMARY KEY (id, timestamp)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('audit_logs', 'timestamp');
```

### Data Encryption Strategy

#### At Rest Encryption
- **PostgreSQL**: pgcrypto extension for column-level encryption
- **MinIO**: Server-side encryption (SSE) with AES-256
- **Redis**: Not storing sensitive data; sessions use encrypted JWT

#### In Transit Encryption
- **All services**: TLS 1.3 for inter-service communication
- **API Gateway**: SSL/TLS termination with mutual TLS for service mesh

#### Encryption Key Management
```
┌────────────────────────────────────────────────────┐
│         HashiCorp Vault (Key Management)            │
├────────────────────────────────────────────────────┤
│ • Master encryption keys                            │
│ • Database encryption keys                          │
│ • Document encryption keys                          │
│ • JWT signing keys                                  │
│ • API keys and secrets                              │
│ • Key rotation automation                           │
└────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication & Authorization

#### JWT Token Structure
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "user@example.com",
    "role": "BROKER",
    "permissions": ["enrollment:create", "enrollment:read"],
    "iat": 1699999999,
    "exp": 1700003599,
    "jti": "token-uuid"
  }
}
```

#### Role-Based Access Control (RBAC)
```
┌─────────────────┬──────────────────────────────────────────┐
│ Role            │ Permissions                               │
├─────────────────┼──────────────────────────────────────────┤
│ ADMINISTRATOR   │ All operations across all services        │
├─────────────────┼──────────────────────────────────────────┤
│ UNDERWRITER     │ - Review enrollments                      │
│                 │ - Create/update policies                  │
│                 │ - View health assessments                 │
│                 │ - Access documents                        │
├─────────────────┼──────────────────────────────────────────┤
│ BROKER          │ - Create enrollments                      │
│                 │ - View own enrollments                    │
│                 │ - Upload documents                        │
│                 │ - Submit for review                       │
├─────────────────┼──────────────────────────────────────────┤
│ HR_PERSONNEL    │ - Bulk enrollment creation                │
│                 │ - View organization enrollments           │
│                 │ - Generate reports                        │
├─────────────────┼──────────────────────────────────────────┤
│ BENEFICIARY     │ - Complete health questionnaire           │
│                 │ - View own enrollment                     │
│                 │ - Upload required documents               │
│                 │ - View own policy                         │
├─────────────────┼──────────────────────────────────────────┤
│ PARENT_GUARDIAN │ - Manage minor beneficiary enrollments    │
│                 │ - Complete questionnaires on behalf       │
│                 │ - Upload documents for minors             │
└─────────────────┴──────────────────────────────────────────┘
```

### Network Security

#### Service Mesh Architecture (Istio)
```
┌────────────────────────────────────────────────────┐
│                  Istio Service Mesh                 │
├────────────────────────────────────────────────────┤
│ • Mutual TLS (mTLS) between all services           │
│ • Fine-grained traffic policies                    │
│ • Service-to-service authentication                │
│ • Request tracing and observability                │
│ • Circuit breaking and fault injection             │
└────────────────────────────────────────────────────┘
```

#### Network Policies
```yaml
# Example: Auth Service Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auth-service-policy
spec:
  podSelector:
    matchLabels:
      app: auth-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 3001
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: redis
        - podSelector:
            matchLabels:
              app: postgresql
```

### LGPD Compliance Features

#### Data Subject Rights Implementation
```
┌────────────────────────────────────────────────────┐
│ Right to Access       │ GET /api/v1/data/export     │
│ Right to Rectification│ PUT /api/v1/data/update     │
│ Right to Erasure      │ DELETE /api/v1/data/delete  │
│ Right to Portability  │ GET /api/v1/data/download   │
│ Right to Object       │ POST /api/v1/consent/revoke │
└────────────────────────────────────────────────────┘
```

#### Consent Management
- Granular consent tracking per data category
- Consent version management
- Withdrawal mechanism
- Audit trail of all consent changes

#### Data Retention Policies
```
┌─────────────────┬──────────────┬───────────────────┐
│ Data Type       │ Retention    │ Deletion Method   │
├─────────────────┼──────────────┼───────────────────┤
│ Personal Data   │ 5 years      │ Secure erasure    │
│ Health Data     │ 20 years     │ Secure erasure    │
│ Audit Logs      │ 10 years     │ Secure archival   │
│ Documents       │ 5 years      │ Secure deletion   │
│ Sessions        │ 8 hours      │ Automatic expiry  │
└─────────────────┴──────────────┴───────────────────┘
```

---

## Integration Architecture

### External System Integrations

#### AUSTA Datalake Integration
```
Purpose: Analytics and reporting
Protocol: Kafka event streaming
Frequency: Real-time
Data Format: Avro schema
```

#### AUSTA EMR Integration
```
Purpose: Medical records synchronization
Protocol: REST API + OAuth 2.0
Frequency: On-demand
Data Format: HL7 FHIR
```

#### AUSTA SuperApp Integration
```
Purpose: Policy activation
Protocol: REST API + JWT
Frequency: On policy approval
Data Format: JSON
```

#### Payment Gateway Integration
```
Purpose: Premium payment processing
Protocol: REST API + Webhook
Provider: Multiple (PagSeguro, Cielo)
Data Format: JSON
```

### Integration Patterns

#### Event-Driven Architecture
```
┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│  Enrollment     │────►│   Kafka     │────►│   Policy    │
│   Service       │     │   Topic     │     │   Service   │
└─────────────────┘     └─────────────┘     └─────────────┘
     │                                             │
     │ EnrollmentCreated                           │
     │ EnrollmentSubmitted                         │
     │ DocumentsUploaded                           │ PolicyCreated
     │                                             │ PolicyActivated
     ▼                                             ▼
┌─────────────────┐                          ┌─────────────┐
│   AUSTA         │                          │   AUSTA     │
│   Datalake      │                          │   SuperApp  │
└─────────────────┘                          └─────────────┘
```

---

## Deployment Architecture

### Kubernetes Cluster Architecture
```
┌──────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │          Namespace: ingress-system               │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │  Istio Ingress Gateway (LoadBalancer)   │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │       Namespace: health-portal-production        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │
│  │  │   Auth   │ │ Enroll   │ │  Health  │        │    │
│  │  │  Service │ │ Service  │ │ Service  │        │    │
│  │  └──────────┘ └──────────┘ └──────────┘        │    │
│  │  ┌──────────┐ ┌──────────┐                     │    │
│  │  │   Doc    │ │  Policy  │                     │    │
│  │  │  Service │ │ Service  │                     │    │
│  │  └──────────┘ └──────────┘                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │        Namespace: data-layer                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │
│  │  │PostgreSQL│ │  Redis   │ │  MinIO   │        │    │
│  │  │StatefulSet│ │Deployment│ │StatefulSet       │    │
│  │  └──────────┘ └──────────┘ └──────────┘        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │      Namespace: monitoring                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │
│  │  │Prometheus│ │ Grafana  │ │  Jaeger  │        │    │
│  │  └──────────┘ └──────────┘ └──────────┘        │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Resource Allocation
```
┌──────────────┬─────────┬─────────┬──────────┬─────────┐
│ Service      │ Min CPU │ Max CPU │ Min Mem  │ Max Mem │
├──────────────┼─────────┼─────────┼──────────┼─────────┤
│ Auth         │ 1 core  │ 2 cores │ 2 GiB    │ 4 GiB   │
│ Enrollment   │ 2 cores │ 4 cores │ 4 GiB    │ 8 GiB   │
│ Health       │ 2 cores │ 4 cores │ 4 GiB    │ 8 GiB   │
│ Document     │ 1 core  │ 2 cores │ 2 GiB    │ 4 GiB   │
│ Policy       │ 2 cores │ 4 cores │ 4 GiB    │ 8 GiB   │
│ PostgreSQL   │ 4 cores │ 8 cores │ 16 GiB   │ 32 GiB  │
│ Redis        │ 1 core  │ 2 cores │ 4 GiB    │ 8 GiB   │
│ MinIO        │ 2 cores │ 4 cores │ 8 GiB    │ 16 GiB  │
└──────────────┴─────────┴─────────┴──────────┴─────────┘
```

### Auto-Scaling Configuration
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## Performance & Scalability

### Performance Targets
```
┌────────────────────────┬──────────────┬──────────────┐
│ Metric                 │ Target       │ Max          │
├────────────────────────┼──────────────┼──────────────┤
│ API Response Time      │ < 200ms      │ < 500ms      │
│ Page Load Time         │ < 2s         │ < 3s         │
│ Document Upload        │ < 3s         │ < 5s         │
│ Concurrent Users       │ 10,000       │ 50,000       │
│ Transactions/Second    │ 1,000        │ 5,000        │
│ Database Queries       │ < 50ms       │ < 100ms      │
│ Cache Hit Rate         │ > 90%        │ > 80%        │
│ System Availability    │ 99.9%        │ 99.5%        │
└────────────────────────┴──────────────┴──────────────┘
```

### Caching Strategy
```
┌──────────────────────┬─────────────┬─────────────────┐
│ Cache Layer          │ Technology  │ TTL             │
├──────────────────────┼─────────────┼─────────────────┤
│ CDN Cache            │ Azure CDN   │ 24 hours        │
│ API Gateway Cache    │ Kong        │ 5 minutes       │
│ Application Cache    │ Redis       │ 1-60 minutes    │
│ Database Query Cache │ PostgreSQL  │ Session         │
│ Session Store        │ Redis       │ 8 hours         │
└──────────────────────┴─────────────┴─────────────────┘
```

### Load Balancing Strategy
- **Global**: Azure Traffic Manager (DNS-based)
- **Regional**: Azure Load Balancer (Layer 4)
- **Service**: Istio Virtual Services (Layer 7)

---

## Disaster Recovery

### Backup Strategy
```
┌─────────────────┬──────────────┬────────────┬───────────┐
│ Component       │ Frequency    │ Retention  │ Location  │
├─────────────────┼──────────────┼────────────┼───────────┤
│ PostgreSQL      │ Hourly       │ 30 days    │ Azure Blob│
│ Redis           │ Daily        │ 7 days     │ Azure Blob│
│ MinIO           │ Continuous   │ 90 days    │ Azure Blob│
│ Kubernetes      │ Daily        │ 30 days    │ Git + Blob│
│ Vault Secrets   │ Daily        │ 30 days    │ Encrypted │
└─────────────────┴──────────────┴────────────┴───────────┘
```

### Recovery Objectives
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **MTTR (Mean Time To Recovery)**: 2 hours

### High Availability Configuration
- **PostgreSQL**: Streaming replication with automated failover
- **Redis**: Redis Sentinel for automatic failover
- **Kubernetes**: Multi-zone cluster deployment
- **Services**: Minimum 3 replicas per service

---

## Architecture Decision Records

### ADR-001: Microservices Architecture
**Status**: Accepted
**Context**: Need for independent scaling and technology diversity
**Decision**: Adopt microservices architecture with polyglot persistence
**Consequences**: Increased operational complexity, better scalability

### ADR-002: PostgreSQL for Primary Database
**Status**: Accepted
**Context**: Need for ACID compliance and complex queries
**Decision**: Use PostgreSQL with TimescaleDB extension
**Consequences**: Strong consistency, complex replication setup

### ADR-003: JWT for Authentication
**Status**: Accepted
**Context**: Stateless authentication for distributed services
**Decision**: Use JWT with Redis-backed session management
**Consequences**: Scalable authentication, token revocation complexity

### ADR-004: Kubernetes for Orchestration
**Status**: Accepted
**Context**: Need for container orchestration and auto-scaling
**Decision**: Deploy on managed Kubernetes (AKS)
**Consequences**: Cloud vendor lock-in, simplified operations

### ADR-005: Istio Service Mesh
**Status**: Accepted
**Context**: Need for service-to-service security and observability
**Decision**: Implement Istio service mesh
**Consequences**: Added complexity, enhanced security and monitoring

---

## Appendix

### Glossary
- **LGPD**: Lei Geral de Proteção de Dados (Brazilian Data Protection Law)
- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token
- **mTLS**: Mutual TLS
- **SLO**: Service Level Objective
- **RTO**: Recovery Time Objective
- **RPO**: Recovery Point Objective

### References
- [LGPD Compliance Guidelines](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [Spring Boot Best Practices](https://spring.io/guides)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)
- [Istio Documentation](https://istio.io/latest/docs/)

### Document Control
- **Version**: 1.0.0
- **Last Updated**: 2025-11-11
- **Owner**: Technical Architecture Team
- **Review Cycle**: Quarterly
- **Next Review**: 2026-02-11
