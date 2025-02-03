import pytest
from unittest.mock import MagicMock, patch
from typing import Dict, List

from services.risk_assessment import RiskAssessmentService
from services.llm_service import LLMService
from models.questionnaire import Question, Questionnaire
from utils.validators import sanitize_text

# Test constants with security and LGPD compliance metadata
MOCK_QUESTION_DATA = {
    'text': 'Do you have any pre-existing conditions?',
    'type': 'text',
    'options': [],
    'validation_rules': {
        'required': True,
        'data_classification': 'sensitive_health',
        'encryption_required': True,
        'lgpd_category': 'health_data'
    },
    'risk_weight': 0.3,
    'security_level': 'high'
}

MOCK_RESPONSES = {
    'medical_history': 'Type 2 Diabetes diagnosed 5 years ago',
    'current_medication': 'Metformin 1000mg daily',
    'lifestyle': 'Sedentary with occasional exercise',
    'security_metadata': {
        'encryption_status': 'encrypted',
        'data_classification': 'sensitive_health',
        'access_control': 'restricted'
    }
}

@pytest.mark.asyncio
class TestRiskAssessment:
    """Comprehensive test suite for RiskAssessmentService with security and compliance validation."""

    async def setup_method(self, method):
        """Initialize test environment with security configurations."""
        # Setup mock LLM service
        self._llm_service = MagicMock(spec=LLMService)
        
        # Configure security settings
        self._security_config = {
            'encryption_key': 'test-key-123',
            'encryption_algorithm': 'AES-256-GCM',
            'data_classification': 'sensitive_health',
            'lgpd_compliance': True
        }
        
        # Initialize service with security context
        self._service = RiskAssessmentService(self._llm_service)
        
        # Setup mock responses with security metadata
        self._llm_service.analyze_response.return_value = {
            'risk_factors': [
                {
                    'type': 'chronic_condition',
                    'description': 'Type 2 Diabetes',
                    'severity': 0.7,
                    'confidence': 0.9,
                    'security_level': 'high'
                }
            ],
            'risk_score': 0.65,
            'recommendations': ['Regular monitoring required'],
            'metadata': {
                'analysis_timestamp': '2023-10-20T10:00:00Z',
                'encryption_status': 'encrypted',
                'lgpd_compliant': True
            }
        }

    async def test_analyze_response(self):
        """Test single response analysis with security validation."""
        # Create test question with security metadata
        question = Question(**MOCK_QUESTION_DATA)
        response = MOCK_RESPONSES['medical_history']

        # Test response analysis
        result = await self._service.analyze_response(
            question=question,
            response=response
        )

        # Verify risk analysis
        assert result['risk_factors'] is not None
        assert len(result['risk_factors']) > 0
        assert 0 <= result['risk_weight'] <= 1

        # Verify security measures
        assert result['metadata']['encryption_status'] == 'encrypted'
        assert result['metadata']['lgpd_compliant'] is True

        # Verify LLM service calls
        self._llm_service.analyze_response.assert_called_once()

    async def test_calculate_overall_risk(self):
        """Test overall risk calculation with security measures."""
        # Create test questionnaire with secure responses
        questionnaire = Questionnaire(
            enrollment_id='test-enrollment',
            lgpd_consent={'purpose': 'health_assessment', 'data_usage': 'risk_calculation'}
        )
        
        # Add questions with security metadata
        question1 = Question(**MOCK_QUESTION_DATA)
        questionnaire.add_question(question1)
        
        # Add encrypted responses
        await questionnaire.add_response(
            question1.id,
            MOCK_RESPONSES['medical_history']
        )

        # Calculate overall risk
        risk_score, risk_level, risk_factors = await self._service.calculate_overall_risk(
            questionnaire=questionnaire
        )

        # Verify risk calculation
        assert 0 <= risk_score <= 1
        assert risk_level in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        assert len(risk_factors) > 0

        # Verify security compliance
        assert questionnaire.encryption_metadata['algorithm'] == 'AES-256-GCM'
        assert questionnaire.lgpd_consent['purpose'] == 'health_assessment'

    async def test_invalid_response_handling(self):
        """Test handling of invalid responses and security violations."""
        # Create test question
        question = Question(**MOCK_QUESTION_DATA)
        
        # Test invalid response
        with pytest.raises(ValueError) as exc_info:
            await self._service.analyze_response(
                question=question,
                response=None
            )
        assert "Invalid response" in str(exc_info.value)

        # Test security violation
        malicious_response = "<script>alert('xss')</script>"
        sanitized_response = sanitize_text(malicious_response)
        assert "<script>" not in sanitized_response

        # Test LGPD compliance violation
        non_compliant_question = Question(**{
            **MOCK_QUESTION_DATA,
            'validation_rules': {'required': True}  # Missing LGPD metadata
        })
        
        with pytest.raises(ValueError) as exc_info:
            await self._service.analyze_response(
                question=non_compliant_question,
                response=MOCK_RESPONSES['medical_history']
            )
        assert "LGPD compliance" in str(exc_info.value)

    async def test_risk_level_thresholds(self):
        """Test risk level threshold categorization with security validation."""
        # Test various risk scores
        test_cases = [
            (0.2, 'LOW'),
            (0.5, 'MEDIUM'),
            (0.7, 'HIGH'),
            (0.9, 'CRITICAL')
        ]

        for risk_score, expected_level in test_cases:
            # Mock LLM response with security metadata
            self._llm_service.analyze_response.return_value = {
                'risk_factors': [{
                    'type': 'test_factor',
                    'severity': risk_score,
                    'confidence': 0.9,
                    'security_level': 'high'
                }],
                'risk_score': risk_score,
                'metadata': {
                    'encryption_status': 'encrypted',
                    'lgpd_compliant': True
                }
            }

            # Create test questionnaire
            questionnaire = Questionnaire(
                enrollment_id='test-enrollment',
                lgpd_consent={'purpose': 'health_assessment'}
            )
            question = Question(**MOCK_QUESTION_DATA)
            questionnaire.add_question(question)
            await questionnaire.add_response(question.id, 'Test response')

            # Calculate risk
            _, risk_level, _ = await self._service.calculate_overall_risk(questionnaire)
            assert risk_level == expected_level

            # Verify security measures
            assert questionnaire.encryption_metadata is not None
            assert questionnaire.lgpd_consent is not None