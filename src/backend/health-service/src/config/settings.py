import os
from typing import Dict, List, Optional
from pydantic import dataclasses
from pydantic_settings import BaseSettings

# Default configuration values
DEFAULT_LLM_PROVIDER = "openai"
DEFAULT_LLM_MODEL = "gpt-4"
DEFAULT_API_TIMEOUT = 30

@dataclasses.dataclass
class DatabaseSettings:
    host: str
    port: int
    database: str
    username: str
    password: str
    schema: str
    ssl_enabled: bool
    ssl_ca_cert_path: str
    ssl_verify_server: bool
    pool_size: int
    max_overflow: int
    pool_timeout: int
    pool_recycle: int
    connection_extras: Dict

    def __init__(self):
        """Initialize database settings with enhanced security and performance configurations."""
        # Load database configuration from environment
        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = int(os.getenv('DB_PORT', '5432'))
        self.database = os.getenv('DB_NAME', 'health_service')
        self.username = os.getenv('DB_USER', 'health_user')
        self.password = os.getenv('DB_PASSWORD', 'dev_password_CHANGE_IN_PROD')
        self.schema = os.getenv('DB_SCHEMA', 'public')
        
        # SSL Configuration
        self.ssl_enabled = True
        self.ssl_ca_cert_path = "/etc/ssl/certs/ca-certificates.crt"
        self.ssl_verify_server = True
        
        # Connection Pooling
        self.pool_size = 20
        self.max_overflow = 10
        self.pool_timeout = 30
        self.pool_recycle = 1800
        
        # Additional connection parameters
        self.connection_extras = {
            "application_name": "health_service",
            "connect_timeout": 10,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5
        }

@dataclasses.dataclass
class LLMSettings:
    provider: str
    api_key: str
    model_name: str
    azure_endpoint: Optional[str]
    azure_deployment: Optional[str]
    max_tokens: int
    temperature: float
    timeout_seconds: int
    max_retries: int
    retry_strategy: Dict
    fallback_config: Dict
    rate_limits: Dict
    cost_tracking: Dict
    model_configs: List[Dict]

    def __init__(self):
        """Initialize LLM settings with failover and monitoring capabilities."""
        self.provider = DEFAULT_LLM_PROVIDER
        self.api_key = os.getenv('LLM_API_KEY', '')
        self.model_name = DEFAULT_LLM_MODEL
        self.azure_endpoint = None
        self.azure_deployment = None
        self.max_tokens = 2048
        self.temperature = 0.7
        self.timeout_seconds = DEFAULT_API_TIMEOUT
        self.max_retries = 3
        
        # Retry configuration
        self.retry_strategy = {
            "initial_delay": 1,
            "max_delay": 10,
            "exponential_base": 2,
            "jitter": True
        }
        
        # Fallback configuration
        self.fallback_config = {
            "secondary_provider": "azure",
            "fallback_model": "gpt-35-turbo",
            "max_fallback_attempts": 2
        }
        
        # Rate limiting
        self.rate_limits = {
            "requests_per_minute": 60,
            "tokens_per_minute": 40000,
            "concurrent_requests": 10
        }
        
        # Cost tracking
        self.cost_tracking = {
            "enabled": True,
            "budget_limit": 1000.0,
            "alert_threshold": 0.8
        }
        
        # Model-specific configurations
        self.model_configs = [
            {
                "model": "gpt-4",
                "max_tokens": 2048,
                "timeout": 30
            },
            {
                "model": "gpt-35-turbo",
                "max_tokens": 4096,
                "timeout": 20
            }
        ]

@dataclasses.dataclass
class SecuritySettings:
    encryption_key: str
    encryption_algorithm: str
    key_rotation_days: int
    allowed_origins: List[str]
    cors_settings: Dict
    key_vault_config: Dict
    audit_config: Dict
    compliance_settings: Dict
    data_retention: Dict
    access_controls: Dict

    def __init__(self):
        """Initialize security settings with enhanced compliance and monitoring."""
        self.encryption_key = os.getenv('ENCRYPTION_KEY', '')
        self.encryption_algorithm = "AES-256-GCM"
        self.key_rotation_days = 30
        
        # CORS configuration
        self.allowed_origins = ["https://*.austa.com.br"]
        self.cors_settings = {
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["*"],
            "max_age": 3600
        }
        
        # Azure Key Vault configuration
        self.key_vault_config = {
            "vault_url": "",
            "secret_name": "health-service-key",
            "key_version": "latest"
        }
        
        # Audit logging configuration
        self.audit_config = {
            "enabled": True,
            "log_level": "INFO",
            "retention_days": 90,
            "sensitive_fields": ["cpf", "health_data"]
        }
        
        # LGPD compliance settings
        self.compliance_settings = {
            "data_classification": "sensitive",
            "retention_period": 365,
            "consent_required": True,
            "anonymization_enabled": True
        }
        
        # Data retention policies
        self.data_retention = {
            "health_data_days": 365,
            "audit_logs_days": 90,
            "temp_data_hours": 24
        }
        
        # Access control settings
        self.access_controls = {
            "mfa_required": True,
            "session_timeout": 3600,
            "max_failed_attempts": 5,
            "lockout_duration": 900
        }

class Settings(BaseSettings):
    environment: str
    service_name: str
    version: str
    db: DatabaseSettings
    llm: LLMSettings
    security: SecuritySettings
    api_port: int
    log_level: str
    redis_url: str
    feature_flags: Dict
    monitoring_config: Dict
    metrics_config: Dict
    alert_config: Dict
    health_check_config: Dict

    def __init__(self):
        """Initialize all service settings with enhanced validation and monitoring."""
        super().__init__()
        self.environment = os.getenv('ENVIRONMENT', 'development')
        self.service_name = "health-service"
        self.version = "1.0.0"
        self.api_port = int(os.getenv('API_PORT', '8000'))
        self.log_level = os.getenv('LOG_LEVEL', 'INFO')
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost')

        # Initialize sub-settings
        self.db = DatabaseSettings()
        self.llm = LLMSettings()
        self.security = SecuritySettings()

        # Production security validation
        if self.environment == 'production' and self.db.password == 'dev_password_CHANGE_IN_PROD':
            raise ValueError("Production must use DB_PASSWORD environment variable")
        
        # Feature flags
        self.feature_flags = {
            "use_azure_openai": False,
            "enhanced_monitoring": True,
            "strict_validation": True
        }
        
        # Monitoring configuration
        self.monitoring_config = {
            "enabled": True,
            "sampling_rate": 0.1,
            "trace_enabled": True,
            "metrics_enabled": True
        }
        
        # Metrics configuration
        self.metrics_config = {
            "prometheus_enabled": True,
            "statsd_enabled": True,
            "export_interval": 15
        }
        
        # Alert configuration
        self.alert_config = {
            "enabled": True,
            "channels": ["email", "slack"],
            "thresholds": {
                "error_rate": 0.01,
                "latency_ms": 1000,
                "health_score": 0.95
            }
        }
        
        # Health check configuration
        self.health_check_config = {
            "enabled": True,
            "interval": 30,
            "timeout": 5,
            "services": ["database", "llm", "cache"]
        }

    def get_llm_config(self) -> Dict:
        """Returns LLM configuration with failover and monitoring."""
        config = {
            "provider": self.llm.provider,
            "model": self.llm.model_name,
            "api_key": self.llm.api_key,
            "max_tokens": self.llm.max_tokens,
            "temperature": self.llm.temperature,
            "timeout": self.llm.timeout_seconds,
            "retry": self.llm.retry_strategy,
            "fallback": self.llm.fallback_config,
            "rate_limits": self.llm.rate_limits,
            "monitoring": {
                "cost_tracking": self.llm.cost_tracking,
                "performance_tracking": True,
                "error_tracking": True
            }
        }
        return config

    def get_database_url(self) -> str:
        """Constructs secure database connection URL with monitoring."""
        url = f"postgresql://{self.db.username}:{self.db.password}@{self.db.host}:{self.db.port}/{self.db.database}"
        if self.db.ssl_enabled:
            url += f"?sslmode=verify-full&sslcert={self.db.ssl_ca_cert_path}"
        return url