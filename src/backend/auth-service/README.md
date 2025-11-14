# Authentication Service

## Overview
The Authentication Service is a Node.js-based microservice responsible for user authentication, authorization, session management, and multi-factor authentication (MFA) for the AUSTA Health Portal.

## Technology Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Authentication**: Passport.js + JWT
- **MFA**: TOTP (Time-based One-Time Password) + SMS
- **Session Storage**: Redis
- **Database**: PostgreSQL 15+
- **Testing**: Jest + Supertest

## Architecture

### Responsibilities
- User registration and login
- JWT token generation and validation
- Multi-factor authentication (MFA)
- Session management
- Password reset and account recovery
- Rate limiting and brute-force protection
- Account lockout management

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/session` - Get current session info

#### MFA
- `POST /api/v1/auth/mfa/verify` - Verify MFA token
- `POST /api/v1/auth/mfa/enable` - Enable MFA for user
- `POST /api/v1/auth/mfa/disable` - Disable MFA

#### Password Management
- `POST /api/v1/auth/password/reset` - Request password reset
- `POST /api/v1/auth/password/confirm` - Confirm password reset
- `PUT /api/v1/auth/password/change` - Change password

#### Health Checks
- `GET /health` - Health check endpoint
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Local Development Setup

### Prerequisites
- Node.js 20 LTS
- PostgreSQL 15+
- Redis 7.0+
- npm or yarn

### Installation
```bash
# Navigate to service directory
cd src/backend/auth-service

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your local configuration
```

### Environment Variables
```env
# Server Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=health_portal_auth
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Session Configuration
SESSION_SECRET=your-super-secret-session-key
SESSION_DURATION=28800  # 8 hours in seconds

# MFA Configuration
MFA_ISSUER=AUSTA Health Portal
MFA_WINDOW=2  # Time window for TOTP validation

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+5511999999999

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT=5  # Max login attempts per 15 min

# Security
BCRYPT_ROUNDS=12
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=1800  # 30 minutes in seconds
```

### Running the Service

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

#### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

#### Linting & Formatting
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_role CHECK (role IN ('ADMINISTRATOR', 'UNDERWRITER', 'BROKER', 'HR_PERSONNEL', 'BENEFICIARY', 'PARENT_GUARDIAN'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cpf ON users(cpf);
CREATE INDEX idx_users_role ON users(role);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
```

### Audit Logs Table
```sql
CREATE TABLE auth_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata JSONB
);

CREATE INDEX idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_timestamp ON auth_audit_logs(timestamp);
CREATE INDEX idx_auth_audit_logs_action ON auth_audit_logs(action);
```

## Security Features

### Password Security
- **Hashing**: bcrypt with configurable rounds (default: 12)
- **Validation**: Minimum 8 characters, complexity requirements
- **Reset**: Secure token-based password reset with expiration

### Account Protection
- **Rate Limiting**: Configurable limits on authentication endpoints
- **Brute Force Protection**: Account lockout after failed attempts
- **Session Management**: Secure session handling with Redis
- **Token Rotation**: Refresh token rotation on use

### MFA Implementation
- **TOTP**: Time-based one-time passwords compatible with Google Authenticator
- **SMS**: Twilio-based SMS verification
- **Backup Codes**: One-time backup codes for account recovery

### LGPD Compliance
- Password hashing (no plain text storage)
- Audit logging of all authentication events
- Session expiration and cleanup
- Secure token handling
- Data encryption in transit (TLS)

## Testing

### Unit Tests
```bash
# Run unit tests
npm run test:unit

# Coverage report location
coverage/lcov-report/index.html
```

### Integration Tests
```bash
# Start test dependencies (Docker Compose)
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

### Test Coverage Requirements
- **Minimum Coverage**: 80%
- **Critical Paths**: 100% (login, register, MFA)
- **Error Scenarios**: All error paths tested

## Docker

### Build Image
```bash
docker build -t austa/auth-service:latest .
```

### Run Container
```bash
docker run -p 3001:3001 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  -e JWT_SECRET=your-secret \
  austa/auth-service:latest
```

### Docker Compose
```bash
# Start all dependencies
docker-compose up -d

# View logs
docker-compose logs -f auth-service

# Stop services
docker-compose down
```

## Kubernetes Deployment

### Deploy to Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f ../../k8s/auth-service.yaml

# Check deployment status
kubectl get pods -l app=auth-service

# View logs
kubectl logs -l app=auth-service -f

# Port forward for local testing
kubectl port-forward svc/auth-service 3001:3001
```

### Health Checks
```bash
# Liveness probe
curl http://localhost:3001/health/live

# Readiness probe
curl http://localhost:3001/health/ready

# Health status
curl http://localhost:3001/health
```

## Performance

### Benchmarks
- **Login**: < 100ms (p95)
- **Registration**: < 200ms (p95)
- **Token Validation**: < 10ms (p95)
- **MFA Verification**: < 150ms (p95)

### Optimization
- Redis caching for session data
- Connection pooling for PostgreSQL
- JWT signature caching
- Rate limiting with Redis

## Monitoring

### Metrics Exposed
- `auth_login_total` - Total login attempts
- `auth_login_success_total` - Successful logins
- `auth_login_failure_total` - Failed logins
- `auth_mfa_verification_total` - MFA verifications
- `auth_session_duration_seconds` - Session durations
- `auth_rate_limit_exceeded_total` - Rate limit hits

### Prometheus Endpoint
```
GET /metrics
```

### Grafana Dashboard
- Dashboard ID: `auth-service-dashboard`
- Metrics: Login rates, error rates, session counts, latencies

## Troubleshooting

### Common Issues

#### Cannot connect to PostgreSQL
```bash
# Check PostgreSQL connection
psql -h localhost -U postgres -d health_portal_auth

# Verify environment variables
echo $DB_HOST $DB_PORT $DB_NAME
```

#### Cannot connect to Redis
```bash
# Check Redis connection
redis-cli -h localhost -p 6379 ping

# Verify Redis is running
docker ps | grep redis
```

#### JWT validation errors
- Ensure JWT_SECRET matches between services
- Check token expiration settings
- Verify clock synchronization

#### MFA not working
- Verify TOTP window settings
- Check time synchronization on server
- Validate Twilio credentials for SMS

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# View detailed request logs
DEBUG=express:* npm run dev
```

## API Documentation

### OpenAPI Specification
- Location: `../../openapi/auth-service.yaml`
- Swagger UI: http://localhost:3001/api-docs

### Generate API Client
```bash
# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i ../../openapi/auth-service.yaml \
  -g typescript-axios \
  -o ./generated-client
```

## Contributing

### Code Style
- Follow TypeScript best practices
- Use ESLint configuration provided
- Format code with Prettier
- Write meaningful commit messages

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation
5. Submit PR for review

## License
Proprietary - AUSTA Healthcare Solutions

## Support
For issues or questions:
- Email: dev-team@austa.com.br
- Internal Slack: #auth-service
- On-call: See PagerDuty schedule
