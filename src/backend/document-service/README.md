# Document Service

## Overview
Go-based microservice for secure document storage with AES-256 encryption and MinIO integration.

## Technology Stack
- **Language**: Go 1.21+
- **Framework**: Gin Web Framework
- **Storage**: MinIO (S3-compatible)
- **Database**: PostgreSQL 15+ (metadata)
- **Encryption**: Go crypto library (AES-256)
- **Testing**: Go testing + testify

## Quick Start

### Prerequisites
```bash
- Go 1.21+
- PostgreSQL 15+
- MinIO
```

### Installation
```bash
cd src/backend/document-service

# Install dependencies
go mod download

# Run tests
go test ./...

# Build
go build -o bin/document-service ./cmd/server

# Run
./bin/document-service
```

### Environment Variables
```bash
# Server
PORT=8001
ENV=development

# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=documents
MINIO_USE_SSL=false

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=document_db
DB_USER=postgres
DB_PASSWORD=password
DB_SSLMODE=disable

# Encryption
ENCRYPTION_KEY_ID=default
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=root

# Limits
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,doc,docx
```

## API Endpoints

### Document Operations
- `POST /api/v1/documents` - Upload encrypted document
- `GET /api/v1/documents/{id}` - Download and decrypt document
- `DELETE /api/v1/documents/{id}` - Delete document
- `GET /api/v1/documents/{id}/metadata` - Get document metadata
- `GET /api/v1/documents/{id}/versions` - List document versions

### Health Checks
- `GET /health` - Health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

## Features

### Security
- **Encryption at Rest**: AES-256-GCM for all documents
- **Encryption in Transit**: TLS 1.3
- **Key Management**: HashiCorp Vault integration
- **Integrity**: SHA-256 checksums for all files
- **Access Control**: JWT-based authentication

### LGPD Compliance
- Encrypted storage
- Automatic retention policy enforcement
- Audit logging
- Secure deletion

### Performance
- Streaming uploads/downloads
- Concurrent processing
- Connection pooling
- Efficient memory usage

## Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run benchmarks
go test -bench=. ./...
```

## Docker

```bash
# Build
docker build -t austa/document-service:latest .

# Run
docker run -p 8001:8001 \
  -e MINIO_ENDPOINT=minio:9000 \
  -e DB_HOST=postgres \
  austa/document-service:latest
```

## Encryption Details

### Algorithm
- **Method**: AES-256-GCM
- **Key Size**: 256 bits
- **IV**: Randomly generated per file
- **Key Rotation**: Automatic via Vault

### Key Management
Keys are managed by HashiCorp Vault:
- Master encryption key stored in Vault
- Per-file data encryption keys (DEK)
- Automatic key rotation
- Key versioning support

## Performance Benchmarks
- Document Upload (1MB): ~200ms
- Document Download (1MB): ~150ms
- Encryption Overhead: ~50ms
- Throughput: ~50 MB/s

## Monitoring
- Metrics: Prometheus format
- Logs: JSON structured
- Tracing: Jaeger compatible

## Support
- Email: dev-team@austa.com.br
- OpenAPI Spec: ../../openapi/document-service.yaml
