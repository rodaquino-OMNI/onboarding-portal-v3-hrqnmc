from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID, uuid4
import pydantic
from pydantic import dataclasses
from cryptography.fernet import Fernet
from config.settings import Settings  # version: internal

# Constants
QUESTION_TYPES = ["text", "numeric", "boolean", "choice", "multiple_choice"]
RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
MAX_QUESTIONS = 50
ENCRYPTION_ALGORITHM = "AES-256-GCM"
VALIDATION_TIMEOUT = 5.0

@dataclasses.dataclass
class Question:
    """Model representing a single question in the health questionnaire with enhanced security and validation."""
    id: UUID
    text: str
    type: str
    options: List[str]
    validation_rules: Dict
    required: bool
    dependencies: List[str]
    risk_weight: float
    lgpd_metadata: Dict
    created_at: datetime
    updated_at: datetime
    encryption_key_id: str

    def __init__(self, text: str, type: str, options: List[str], validation_rules: Dict, 
                 required: bool = True, lgpd_metadata: Dict = None) -> None:
        """Initialize a new question with security measures."""
        self.id = uuid4()
        if type not in QUESTION_TYPES:
            raise ValueError(f"Invalid question type. Must be one of {QUESTION_TYPES}")
        
        # Initialize encryption
        settings = Settings()
        encryption_key = settings.security.encryption_key
        fernet = Fernet(encryption_key.encode())
        
        # Encrypt sensitive data
        self.text = fernet.encrypt(text.encode()).decode()
        self.type = type
        self.options = options
        self.validation_rules = validation_rules
        self.required = required
        self.dependencies = []
        self.risk_weight = 1.0
        
        # LGPD compliance metadata
        self.lgpd_metadata = lgpd_metadata or {
            "data_category": "health_data",
            "retention_period": 365,
            "consent_required": True,
            "processing_purpose": "health_assessment"
        }
        
        self.created_at = datetime.utcnow()
        self.updated_at = self.created_at
        self.encryption_key_id = settings.security.key_vault_config["secret_name"]

    def validate_response(self, response: Any) -> Tuple[bool, List[str]]:
        """Validates a response against question rules with enhanced security."""
        errors = []
        
        try:
            # Decrypt question data for validation
            settings = Settings()
            encryption_key = settings.security.encryption_key
            fernet = Fernet(encryption_key.encode())
            decrypted_text = fernet.decrypt(self.text.encode()).decode()
            
            # Type validation
            if self.type == "numeric":
                try:
                    float(response)
                except ValueError:
                    errors.append("Response must be a number")
            
            elif self.type == "boolean":
                if not isinstance(response, bool):
                    errors.append("Response must be true or false")
            
            elif self.type == "choice":
                if response not in self.options:
                    errors.append(f"Response must be one of: {', '.join(self.options)}")
            
            elif self.type == "multiple_choice":
                if not isinstance(response, list) or not all(opt in self.options for opt in response):
                    errors.append(f"Response must be a list of valid options: {', '.join(self.options)}")
            
            # Apply custom validation rules
            for rule, value in self.validation_rules.items():
                if rule == "min_length" and len(str(response)) < value:
                    errors.append(f"Response must be at least {value} characters long")
                elif rule == "max_length" and len(str(response)) > value:
                    errors.append(f"Response must be at most {value} characters long")
                elif rule == "min_value" and float(response) < value:
                    errors.append(f"Response must be at least {value}")
                elif rule == "max_value" and float(response) < value:
                    errors.append(f"Response must be at most {value}")
            
            return len(errors) == 0, errors
            
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")
            return False, errors

@dataclasses.dataclass
class Questionnaire:
    """Model representing a complete health questionnaire with responses and risk assessment."""
    id: UUID
    enrollment_id: UUID
    questions: List[Question]
    responses: Dict
    risk_score: float
    risk_level: str
    risk_factors: List[Dict]
    created_at: datetime
    updated_at: datetime
    status: str
    audit_trail: List[Dict]
    lgpd_consent: Dict
    encryption_metadata: Dict

    def __init__(self, enrollment_id: UUID, lgpd_consent: Dict) -> None:
        """Initialize a new questionnaire with security measures."""
        self.id = uuid4()
        self.enrollment_id = enrollment_id
        self.questions = []
        self.responses = {}
        self.risk_score = 0.0
        self.risk_level = "LOW"
        self.risk_factors = []
        self.created_at = datetime.utcnow()
        self.updated_at = self.created_at
        self.status = "in_progress"
        self.audit_trail = []
        
        # Validate LGPD consent
        required_consent_fields = ["purpose", "data_usage", "retention_period", "sharing_policy"]
        if not all(field in lgpd_consent for field in required_consent_fields):
            raise ValueError("Invalid LGPD consent data")
        self.lgpd_consent = lgpd_consent
        
        # Initialize encryption metadata
        settings = Settings()
        self.encryption_metadata = {
            "algorithm": ENCRYPTION_ALGORITHM,
            "key_id": settings.security.key_vault_config["secret_name"],
            "rotation_date": datetime.utcnow()
        }

    def add_question(self, question: Question) -> bool:
        """Adds a new question to the questionnaire with validation."""
        if len(self.questions) >= MAX_QUESTIONS:
            raise ValueError(f"Maximum number of questions ({MAX_QUESTIONS}) exceeded")
        
        if any(q.id == question.id for q in self.questions):
            raise ValueError("Question with this ID already exists")
        
        self.questions.append(question)
        self.updated_at = datetime.utcnow()
        
        # Add to audit trail
        self.audit_trail.append({
            "action": "add_question",
            "question_id": str(question.id),
            "timestamp": datetime.utcnow(),
            "metadata": {"type": question.type, "required": question.required}
        })
        
        return True

    def add_response(self, question_id: UUID, response: Any) -> Tuple[bool, List[str]]:
        """Records a response to a question with encryption."""
        question = next((q for q in self.questions if q.id == question_id), None)
        if not question:
            return False, ["Question not found"]
        
        # Validate response
        is_valid, errors = question.validate_response(response)
        if not is_valid:
            return False, errors
        
        # Encrypt response
        settings = Settings()
        encryption_key = settings.security.encryption_key
        fernet = Fernet(encryption_key.encode())
        encrypted_response = fernet.encrypt(str(response).encode()).decode()
        
        self.responses[str(question_id)] = {
            "value": encrypted_response,
            "timestamp": datetime.utcnow().isoformat(),
            "encryption_key_id": settings.security.key_vault_config["secret_name"]
        }
        
        self.updated_at = datetime.utcnow()
        
        # Add to audit trail
        self.audit_trail.append({
            "action": "add_response",
            "question_id": str(question_id),
            "timestamp": datetime.utcnow(),
            "metadata": {"validation_passed": True}
        })
        
        return True, []

    def update_risk_assessment(self, risk_score: float, risk_level: str, risk_factors: List[Dict]) -> bool:
        """Updates the risk assessment results with audit trail."""
        if not 0 <= risk_score <= 100:
            raise ValueError("Risk score must be between 0 and 100")
        
        if risk_level not in RISK_LEVELS:
            raise ValueError(f"Risk level must be one of {RISK_LEVELS}")
        
        old_risk_level = self.risk_level
        self.risk_score = risk_score
        self.risk_level = risk_level
        self.risk_factors = risk_factors
        self.updated_at = datetime.utcnow()
        
        # Add to audit trail
        self.audit_trail.append({
            "action": "update_risk_assessment",
            "timestamp": datetime.utcnow(),
            "metadata": {
                "old_risk_level": old_risk_level,
                "new_risk_level": risk_level,
                "risk_score": risk_score,
                "risk_factors_count": len(risk_factors)
            }
        })
        
        return True