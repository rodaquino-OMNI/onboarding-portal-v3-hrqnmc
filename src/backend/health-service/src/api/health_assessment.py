from typing import Dict, List, Optional, Any
from uuid import UUID
import logging
from fastapi import APIRouter, Depends, HTTPException, Security, status
from pydantic import BaseModel, dataclasses
from prometheus_client import Counter, Histogram, Gauge

from config.settings import Settings
from models.questionnaire import Question, Questionnaire
from services.llm_service import LLMService
from services.risk_assessment import RiskAssessmentService
from utils.validators import sanitize_text

# Initialize router with prefix and tags
router = APIRouter(prefix='/api/v1/health-assessment', tags=['Health Assessment'])

# Required scopes for authorization
REQUIRED_SCOPES = ['health:read', 'health:write']

# Prometheus metrics
METRICS = {
    'requests': Counter('health_assessment_requests_total', 'Total health assessment requests', ['endpoint', 'status']),
    'processing_time': Histogram('health_assessment_processing_seconds', 'Request processing time', ['endpoint']),
    'active_assessments': Gauge('health_assessment_active_total', 'Number of active health assessments')
}

@dataclasses.dataclass
class QuestionResponse:
    """Enhanced Pydantic model for question response payload with encryption."""
    question_id: UUID
    response: Any
    metadata: Optional[Dict] = None
    encryption_context: Optional[Dict] = None

@dataclasses.dataclass
class RiskAssessmentResponse:
    """Enhanced Pydantic model for risk assessment response with detailed factors."""
    risk_score: float
    risk_level: str
    risk_factors: List[Dict]
    analysis_metadata: Dict
    required_documents: Optional[List] = None

async def get_settings() -> Settings:
    """Dependency for settings injection with enhanced security."""
    return Settings()

async def get_llm_service(settings: Settings = Depends(get_settings)) -> LLMService:
    """Dependency for LLM service injection with monitoring."""
    logger = logging.getLogger("health_service.llm")
    return LLMService(settings, logger, METRICS)

async def get_risk_service(
    llm_service: LLMService = Depends(get_llm_service)
) -> RiskAssessmentService:
    """Dependency for risk assessment service injection."""
    return RiskAssessmentService(llm_service)

@router.post('/', response_model=Dict[str, Any])
async def create_questionnaire(
    enrollment_id: UUID,
    context: Optional[Dict] = None,
    settings: Settings = Depends(get_settings),
    llm_service: LLMService = Depends(get_llm_service)
) -> Dict[str, Any]:
    """Creates a new health questionnaire with enhanced security and monitoring."""
    try:
        METRICS['requests'].labels(endpoint='create_questionnaire', status='started').inc()
        with METRICS['processing_time'].labels(endpoint='create_questionnaire').time():
            # Validate enrollment ID and context
            if not enrollment_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enrollment ID is required"
                )

            # Initialize encryption context
            encryption_config = settings.security.key_vault_config
            encryption_context = {
                "key_id": encryption_config["secret_name"],
                "algorithm": settings.security.encryption_algorithm,
                "created_at": str(datetime.utcnow())
            }

            # Create LGPD-compliant consent data
            lgpd_consent = {
                "purpose": "health_assessment",
                "data_usage": "risk_evaluation",
                "retention_period": settings.security.data_retention["health_data_days"],
                "sharing_policy": "internal_only"
            }

            # Create new questionnaire
            questionnaire = Questionnaire(
                enrollment_id=enrollment_id,
                lgpd_consent=lgpd_consent
            )

            # Generate initial question using LLM
            initial_question = await llm_service.generate_next_question(
                previous_responses={},
                available_questions=[],
                language_preference=context.get('language', 'pt-BR')
            )

            # Add initial question with security measures
            questionnaire.add_question(initial_question)

            METRICS['active_assessments'].inc()
            METRICS['requests'].labels(endpoint='create_questionnaire', status='success').inc()

            return {
                "questionnaire_id": str(questionnaire.id),
                "enrollment_id": str(enrollment_id),
                "initial_question": {
                    "id": str(initial_question.id),
                    "text": initial_question.text,
                    "type": initial_question.type,
                    "options": initial_question.options if initial_question.type in ['choice', 'multiple_choice'] else None
                },
                "metadata": {
                    "created_at": str(questionnaire.created_at),
                    "status": questionnaire.status,
                    "encryption_context": encryption_context
                }
            }

    except Exception as e:
        METRICS['requests'].labels(endpoint='create_questionnaire', status='error').inc()
        logging.error(f"Error creating questionnaire: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create health questionnaire"
        )

@router.post('/{questionnaire_id}/responses')
async def submit_response(
    questionnaire_id: UUID,
    response_data: QuestionResponse,
    risk_service: RiskAssessmentService = Depends(get_risk_service)
) -> Dict[str, Any]:
    """Submits and analyzes a question response with enhanced security."""
    try:
        METRICS['requests'].labels(endpoint='submit_response', status='started').inc()
        with METRICS['processing_time'].labels(endpoint='submit_response').time():
            # Validate and sanitize response
            sanitized_response = sanitize_text(str(response_data.response))
            
            # Get question and validate response
            question = Question.get_by_id(response_data.question_id)
            if not question:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Question not found"
                )

            # Analyze response with risk assessment
            analysis_result = await risk_service.analyze_response(
                question=question,
                response=sanitized_response
            )

            METRICS['requests'].labels(endpoint='submit_response', status='success').inc()

            return {
                "question_id": str(response_data.question_id),
                "analysis_result": analysis_result,
                "metadata": {
                    "processed_at": str(datetime.utcnow()),
                    "risk_level": analysis_result.get('risk_level'),
                    "confidence_score": analysis_result.get('confidence', 0.0)
                }
            }

    except Exception as e:
        METRICS['requests'].labels(endpoint='submit_response', status='error').inc()
        logging.error(f"Error submitting response: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process response"
        )

@router.get('/{questionnaire_id}/risk-assessment')
async def get_risk_assessment(
    questionnaire_id: UUID,
    risk_service: RiskAssessmentService = Depends(get_risk_service)
) -> RiskAssessmentResponse:
    """Retrieves the complete risk assessment with LGPD compliance."""
    try:
        METRICS['requests'].labels(endpoint='get_risk_assessment', status='started').inc()
        with METRICS['processing_time'].labels(endpoint='get_risk_assessment').time():
            # Get questionnaire
            questionnaire = Questionnaire.get_by_id(questionnaire_id)
            if not questionnaire:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Questionnaire not found"
                )

            # Calculate overall risk
            risk_score, risk_level, risk_factors = await risk_service.calculate_overall_risk(
                questionnaire=questionnaire
            )

            METRICS['requests'].labels(endpoint='get_risk_assessment', status='success').inc()

            return RiskAssessmentResponse(
                risk_score=risk_score,
                risk_level=risk_level,
                risk_factors=risk_factors,
                analysis_metadata={
                    "completed_at": str(datetime.utcnow()),
                    "questionnaire_id": str(questionnaire_id),
                    "total_questions": len(questionnaire.questions),
                    "confidence_score": questionnaire.risk_score / 100
                },
                required_documents=[
                    factor.get('required_documents', [])
                    for factor in risk_factors
                    if factor.get('severity', 0) >= 0.7
                ]
            )

    except Exception as e:
        METRICS['requests'].labels(endpoint='get_risk_assessment', status='error').inc()
        logging.error(f"Error getting risk assessment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve risk assessment"
        )