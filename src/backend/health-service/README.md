# Health Assessment Service

## Overview
Python FastAPI microservice for AI-powered dynamic health questionnaires and risk assessment.

## Technology Stack
- **Language**: Python 3.11+
- **Framework**: FastAPI 0.109+
- **ORM**: SQLAlchemy 2.x
- **AI/ML**: TensorFlow, scikit-learn
- **Database**: PostgreSQL 15+
- **Testing**: pytest + pytest-asyncio

## Quick Start

### Prerequisites
```bash
- Python 3.11+
- PostgreSQL 15+
- Redis 7.0+
- pip or poetry
```

### Installation
```bash
cd src/backend/health-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

### Environment Variables
```bash
# Application
APP_ENV=development
PORT=8000
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/health_db
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379/0

# AI/ML
AI_MODEL_PATH=./models/risk_assessment_v1.h5
AI_CONFIDENCE_THRESHOLD=0.85

# LGPD
ENCRYPTION_KEY=your-32-byte-encryption-key
DATA_RETENTION_DAYS=1825  # 5 years
```

## API Endpoints

### Questionnaire
- `POST /api/v1/health-assessment` - Create questionnaire
- `GET /api/v1/health-assessment/{id}` - Get questionnaire status
- `GET /api/v1/health-assessment/{id}/next` - Get next question (AI-powered)
- `POST /api/v1/health-assessment/{id}/response` - Submit response
- `GET /api/v1/health-assessment/{id}/risk` - Get risk assessment
- `GET /api/v1/health-assessment/{id}/summary` - Get completion summary

### Health
- `GET /health` - Health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Features

### AI-Powered Questionnaire
- Dynamic question selection based on previous answers
- ML-driven risk assessment
- Adaptive questioning to minimize questionnaire length
- Real-time risk score calculation

### Security & Compliance
- End-to-end encryption for health data
- LGPD-compliant data handling
- Audit trail for all operations
- Secure data retention and deletion

## Testing

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Integration tests only
pytest tests/integration/

# View coverage report
open htmlcov/index.html
```

## Docker

```bash
# Build
docker build -t austa/health-service:latest .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://db:5432/health_db \
  -e REDIS_URL=redis://redis:6379/0 \
  austa/health-service:latest
```

## Machine Learning

### Models
- **Risk Assessment Model**: TensorFlow neural network
- **Question Selection**: Decision tree classifier
- **Anomaly Detection**: Isolation Forest

### Model Training
```bash
# Train risk assessment model
python scripts/train_risk_model.py --data ./data/training.csv

# Evaluate model
python scripts/evaluate_model.py --model ./models/risk_assessment_v1.h5

# Deploy model
cp models/risk_assessment_v1.h5 /app/models/
```

## Performance
- Questionnaire Creation: < 100ms
- Question Selection: < 200ms (with AI)
- Risk Assessment: < 500ms
- Response Processing: < 150ms

## Monitoring
- Metrics: Prometheus format at `/metrics`
- Logging: Structured JSON logs
- Tracing: OpenTelemetry integration

## Support
- Email: dev-team@austa.com.br
- API Docs: http://localhost:8000/docs
- OpenAPI: ../../openapi/health-service.yaml
