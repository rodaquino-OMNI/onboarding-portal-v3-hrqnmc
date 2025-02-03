import logging
from typing import Any, Dict, List, Tuple
from pydantic import BaseModel  # version: ^2.0.0

from models.questionnaire import Question, Questionnaire
from services.llm_service import LLMService
from utils.validators import sanitize_text

# Risk assessment configuration constants
RISK_WEIGHT_FACTORS = {
    'age': 0.2,
    'medical_history': 0.3,
    'lifestyle': 0.15,
    'family_history': 0.2,
    'current_conditions': 0.15
}

RISK_THRESHOLDS = {
    'LOW': 0.3,
    'MEDIUM': 0.6,
    'HIGH': 0.8,
    'CRITICAL': 1.0
}

class RiskAssessmentService:
    """Enhanced service for analyzing health questionnaire responses and calculating risk assessments with LGPD compliance and security measures."""

    def __init__(self, llm_service: LLMService):
        """Initializes the risk assessment service with enhanced security configurations."""
        self._llm_service = llm_service
        self._logger = logging.getLogger(__name__)
        self._logger.setLevel(logging.INFO)

    async def analyze_response(self, question: Question, response: Any) -> Dict:
        """Analyzes a single questionnaire response for risk factors with enhanced security."""
        try:
            # Validate and sanitize response
            is_valid, errors = question.validate_response(response)
            if not is_valid:
                self._logger.error(f"Response validation failed: {errors}")
                raise ValueError(f"Invalid response: {errors}")

            sanitized_response = sanitize_text(str(response))

            # Prepare context for LLM analysis
            context = {
                "question_type": question.type,
                "risk_weight": question.risk_weight,
                "lgpd_metadata": question.lgpd_metadata
            }

            # Get LLM analysis with security measures
            analysis_result = await self._llm_service.analyze_response(
                question=question,
                response=sanitized_response,
                context=context
            )

            # Validate and process analysis results
            validated_result = self._validate_risk_factors(analysis_result.get('risk_factors', []))
            
            result = {
                'risk_factors': validated_result,
                'risk_weight': analysis_result.get('risk_score', 0.0),
                'recommendations': analysis_result.get('recommendations', []),
                'metadata': {
                    'analysis_timestamp': analysis_result.get('timestamp'),
                    'confidence_score': analysis_result.get('confidence', 0.0),
                    'lgpd_compliant': True
                }
            }

            self._logger.info(
                "Response analysis completed",
                extra={
                    'question_id': str(question.id),
                    'risk_weight': result['risk_weight'],
                    'risk_factors_count': len(result['risk_factors'])
                }
            )

            return result

        except Exception as e:
            self._logger.error(f"Error in response analysis: {str(e)}")
            raise

    async def calculate_overall_risk(self, questionnaire: Questionnaire) -> Tuple[float, str, List[Dict]]:
        """Calculates overall risk assessment with enhanced security measures."""
        try:
            # Validate questionnaire completeness
            if not questionnaire.responses:
                raise ValueError("No responses found in questionnaire")

            accumulated_risk = 0.0
            all_risk_factors = []
            weighted_factors = {}

            # Process each response with security measures
            for question_id, response_data in questionnaire.responses.items():
                question = next((q for q in questionnaire.questions if str(q.id) == question_id), None)
                if not question:
                    continue

                # Analyze individual response
                analysis = await self.analyze_response(question, response_data['value'])
                
                # Calculate weighted risk contribution
                factor_type = question.lgpd_metadata.get('factor_type', 'medical_history')
                weight = RISK_WEIGHT_FACTORS.get(factor_type, 0.1)
                
                risk_contribution = analysis['risk_weight'] * weight
                accumulated_risk += risk_contribution
                
                # Aggregate risk factors
                weighted_factors[factor_type] = weighted_factors.get(factor_type, 0) + risk_contribution
                all_risk_factors.extend(analysis['risk_factors'])

            # Normalize final risk score
            final_risk_score = min(accumulated_risk, 1.0)
            
            # Determine risk level
            risk_level = self.get_risk_level(final_risk_score)
            
            # Validate and normalize risk factors
            validated_factors = self._validate_risk_factors(all_risk_factors)

            # Update questionnaire with results
            questionnaire.update_risk_assessment(
                risk_score=final_risk_score * 100,  # Convert to percentage
                risk_level=risk_level,
                risk_factors=validated_factors
            )

            self._logger.info(
                "Overall risk assessment completed",
                extra={
                    'questionnaire_id': str(questionnaire.id),
                    'risk_score': final_risk_score,
                    'risk_level': risk_level,
                    'risk_factors_count': len(validated_factors)
                }
            )

            return final_risk_score, risk_level, validated_factors

        except Exception as e:
            self._logger.error(f"Error in overall risk calculation: {str(e)}")
            raise

    def get_risk_level(self, risk_score: float) -> str:
        """Determines risk level with enhanced validation."""
        try:
            if not 0 <= risk_score <= 1:
                raise ValueError("Risk score must be between 0 and 1")

            for level, threshold in sorted(RISK_THRESHOLDS.items(), key=lambda x: x[1]):
                if risk_score <= threshold:
                    return level

            return "CRITICAL"

        except Exception as e:
            self._logger.error(f"Error determining risk level: {str(e)}")
            raise

    def _validate_risk_factors(self, risk_factors: List[Dict]) -> List[Dict]:
        """Enhanced validation and normalization of risk factors with security measures."""
        try:
            validated_factors = []
            
            for factor in risk_factors:
                # Validate factor structure
                if not isinstance(factor, dict):
                    continue
                
                required_fields = {'type', 'description', 'severity', 'confidence'}
                if not all(field in factor for field in required_fields):
                    continue

                # Sanitize text fields
                sanitized_factor = {
                    'type': sanitize_text(factor['type']),
                    'description': sanitize_text(factor['description']),
                    'severity': float(factor.get('severity', 0.0)),
                    'confidence': float(factor.get('confidence', 0.0)),
                    'recommendations': [
                        sanitize_text(rec) for rec in factor.get('recommendations', [])
                    ],
                    'metadata': {
                        'source': factor.get('source', 'analysis'),
                        'validation_timestamp': factor.get('timestamp'),
                        'lgpd_compliant': True
                    }
                }

                # Validate numeric fields
                if not (0 <= sanitized_factor['severity'] <= 1):
                    continue
                if not (0 <= sanitized_factor['confidence'] <= 1):
                    continue

                validated_factors.append(sanitized_factor)

            return validated_factors

        except Exception as e:
            self._logger.error(f"Error validating risk factors: {str(e)}")
            raise