# Environment-Specific Kubernetes Configurations

## Overview
This directory contains environment-specific Kubernetes configurations for the AUSTA Health Portal.

## Directory Structure
```
environments/
├── development/          # Local development environment
├── staging/              # Staging environment configurations
├── production/           # Production environment configurations
└── README.md            # This file
```

## Environments

### Development
- **Purpose**: Local development and testing
- **Replicas**: 1 per service
- **Resources**: Minimal allocation
- **Auto-scaling**: Disabled
- **Monitoring**: Basic logging
- **TLS**: Self-signed certificates

### Staging
- **Purpose**: Pre-production testing and UAT
- **Replicas**: 2 per service (minimum)
- **Resources**: 50% of production
- **Auto-scaling**: Enabled
- **Monitoring**: Full observability
- **TLS**: Let's Encrypt certificates

### Production
- **Purpose**: Live production environment
- **Replicas**: 3 per service (minimum)
- **Resources**: Full allocation
- **Auto-scaling**: Enabled with aggressive scaling
- **Monitoring**: Full observability with alerting
- **TLS**: Enterprise certificates

## Deployment

### Apply Environment Configuration
```bash
# Development
kubectl apply -f environments/development/ -n health-portal-dev

# Staging
kubectl apply -f environments/staging/ -n health-portal-staging

# Production
kubectl apply -f environments/production/ -n health-portal-production
```

### Switch Between Environments
```bash
# Set context to staging
kubectl config set-context --current --namespace=health-portal-staging

# Set context to production
kubectl config set-context --current --namespace=health-portal-production
```

## Configuration Differences

### Resource Limits
| Service    | Dev CPU/Mem    | Staging CPU/Mem | Prod CPU/Mem    |
|------------|----------------|-----------------|-----------------|
| Auth       | 0.5/1Gi        | 1/2Gi           | 2/4Gi           |
| Enrollment | 1/2Gi          | 2/4Gi           | 4/8Gi           |
| Health     | 1/2Gi          | 2/4Gi           | 4/8Gi           |
| Document   | 0.5/1Gi        | 1/2Gi           | 2/4Gi           |
| Policy     | 1/2Gi          | 2/4Gi           | 4/8Gi           |

### Replica Configuration
| Service    | Dev | Staging | Production |
|------------|-----|---------|------------|
| Auth       | 1   | 2       | 3-10       |
| Enrollment | 1   | 2       | 3-10       |
| Health     | 1   | 2       | 3-10       |
| Document   | 1   | 2       | 3-10       |
| Policy     | 1   | 2       | 3-10       |

## Security Considerations

### Development
- Relaxed network policies
- Basic authentication
- Local storage
- Debug logging enabled

### Staging
- Production-like network policies
- Full authentication and authorization
- Cloud storage with encryption
- Info-level logging

### Production
- Strict network policies
- Full security hardening
- Enterprise storage with encryption
- Warn-level logging
- Security scanning enabled
- Audit logging to SIEM

## Monitoring & Observability

### Development
- Basic health checks
- Optional Prometheus metrics
- Console logging

### Staging
- Full health checks
- Prometheus + Grafana
- Centralized logging (ELK)
- Distributed tracing (Jaeger)
- Alert notifications (Slack)

### Production
- Full health checks
- Prometheus + Grafana with custom dashboards
- Centralized logging (ELK) with retention
- Distributed tracing (Jaeger) with sampling
- Alert notifications (PagerDuty, Slack)
- SLA monitoring
- Capacity planning metrics

## Database Configuration

### Development
- Single PostgreSQL instance
- No replication
- Daily backups (local)
- 7-day retention

### Staging
- PostgreSQL with streaming replication
- 1 primary, 1 replica
- Hourly backups (cloud)
- 30-day retention

### Production
- PostgreSQL with streaming replication
- 1 primary, 2 replicas
- Continuous archiving (WAL)
- Point-in-time recovery
- 90-day retention
- Geo-replication for DR

## Secrets Management

### Development
- Kubernetes Secrets (base64)
- Stored in Git (encrypted with SOPS)

### Staging
- External Secrets Operator
- HashiCorp Vault integration
- Auto-rotation enabled

### Production
- External Secrets Operator
- HashiCorp Vault with HA
- Auto-rotation enabled
- Secrets scanning
- Access auditing

## Deployment Strategy

### Development
- Direct deployment
- No approval required
- Rollback manual

### Staging
- Blue-Green deployment
- Auto-deployment on merge to develop
- Automated rollback on health check failure

### Production
- Canary deployment (10% → 50% → 100%)
- Manual approval required
- Automated rollback on error rate threshold
- Maintenance windows enforced

## Support

For environment-specific issues:
- **Development**: dev-team@austa.com.br
- **Staging**: qa-team@austa.com.br
- **Production**: ops-team@austa.com.br (PagerDuty)
