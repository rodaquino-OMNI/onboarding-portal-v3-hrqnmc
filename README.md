# Pre-paid Health Plan Onboarding Portal

[![CI Status](https://github.com/austa/health-onboarding/actions/workflows/main.yml/badge.svg)](https://github.com/austa/health-onboarding/actions/workflows/main.yml)
[![Code Coverage](https://sonarqube.austa.com/dashboard/badge/coverage)](https://sonarqube.austa.com/dashboard)
[![Security Scan](https://snyk.io/test/github/austa/health-onboarding/badge.svg)](https://snyk.io/test/github/austa/health-onboarding)
[![Documentation](https://docs.austa.com/health-onboarding/badge.svg)](https://docs.austa.com/health-onboarding)

## Overview

The Pre-paid Health Plan Onboarding Portal is a comprehensive web-based system designed to automate and streamline the enrollment process for new health plan beneficiaries. Built with enterprise-grade security and scalability, the system provides a secure, automated platform that integrates seamlessly with AUSTA's healthcare ecosystem.

### Key Features

- Role-based web portal for all stakeholders
- AI-powered dynamic health questionnaire
- Secure document management and storage
- Automated policy issuance
- Real-time integration with AUSTA systems
- LGPD-compliant data handling

## Technical Requirements

### Development Environment

```bash
# Required Runtime Versions
Node.js: 20.x LTS
Java: 17 LTS
Python: 3.11+
Go: 1.21+
Docker: 24.0+
Kubernetes: 1.27+
Terraform: 1.5+
Helm: 3.12+
```

### Infrastructure Requirements

- Cloud Platform: Azure
- Container Registry: Azure Container Registry Premium
- Orchestration: AKS 1.27+
- Database: Azure Database for PostgreSQL Hyperscale
- Cache: Azure Cache for Redis Premium
- Storage: Azure Storage Premium
- Monitoring: Azure Monitor Enterprise
- Security: Azure Security Center Standard

## Getting Started

### Prerequisites

1. Install required development tools:
   - VS Code or JetBrains IDE Suite
   - Docker Desktop
   - Azure CLI
   - kubectl
   - helm

2. Configure development environment:
   ```bash
   # Clone repository
   git clone https://github.com/austa/health-onboarding.git
   cd health-onboarding

   # Install dependencies
   ./scripts/setup-dev-environment.sh
   ```

3. Set up local services:
   ```bash
   # Start local development environment
   docker-compose up -d

   # Initialize development databases
   ./scripts/init-local-db.sh
   ```

## Architecture

The system implements a containerized microservices architecture with the following key components:

- Web Application (React SPA)
- API Gateway (Kong)
- Auth Service (Node.js)
- Enrollment Service (Java/Spring)
- Health Service (Python/FastAPI)
- Document Service (Go)
- Policy Service (Java/Spring)

For detailed architecture documentation, see [/docs/architecture](/docs/architecture).

## Development

### Development Workflow

1. Create feature branch from `develop`
2. Implement changes following code standards
3. Write tests (unit, integration, e2e)
4. Submit PR for review
5. Address review comments
6. Merge after approval

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Testing Requirements

- Unit test coverage: >80%
- Integration tests: Required for all APIs
- E2E tests: Required for critical flows
- Performance tests: Required for data-intensive operations

## Deployment

### Environment Configuration

```bash
# Configure environment variables
cp .env.example .env
# Edit .env with appropriate values

# Deploy to Kubernetes
helm upgrade --install health-onboarding ./helm \
  --namespace health-onboarding \
  --values ./helm/values-{env}.yaml
```

### Monitoring Setup

- Application metrics: Azure Monitor
- Distributed tracing: Application Insights
- Log aggregation: Azure Log Analytics
- Alerts: Azure Monitor Alerts

## Security

### Compliance Requirements

- LGPD compliance for data protection
- Healthcare data security standards
- Multi-factor authentication
- Encryption at rest and in transit

For detailed security policies, see [SECURITY.md](SECURITY.md).

## Operations

### Monitoring Guidelines

- System health checks: Every 1 minute
- Performance metrics: Real-time monitoring
- Security scans: Daily automated scans
- Backup verification: Weekly tests

### Incident Response

1. Automatic detection through monitoring
2. Alert to on-call team
3. Incident classification
4. Response based on severity
5. Post-incident analysis

## Quick Links

- [Technical Documentation](/docs/technical)
- [API Documentation](/docs/api)
- [Architecture Documentation](/docs/architecture)
- [Infrastructure Documentation](/infrastructure)
- [Security Documentation](/docs/security)
- [Operations Documentation](/docs/operations)

## License

This project is licensed under the terms specified in [LICENSE](LICENSE).

## Maintenance

- Review Cycle: Monthly
- Reviewers: Technical Architect, Security Lead, Development Lead, Operations Lead
- Update Process: Pull Request with approval from 2 maintainers
- Versioning: Semantic Versioning 2.0.0

## Support

For technical support or security concerns, please see our [support documentation](/docs/support) or contact the development team at dev-support@austa.com.