import pytest
import uuid
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from cryptography.fernet import Fernet

from api.health_assessment import router, create_questionnaire, get_next_question, submit_response, get_risk_assessment
from models.questionnaire import Question, Questionnaire
from services.risk_assessment import RiskAssessmentService
from config.settings import Settings

# Test constants
TEST_ENROLLMENT_ID = uuid.uuid4()
MOCK_QUESTION_RESPONSE = {
    'question_id': str(uuid.uuid4()),
    'response': 'test_response',
    'metadata': {
        'language': 'pt-BR',
        'timestamp': datetime.utcnow().isoformat(),
        'encryption_version': '1.0'
    }
}
TEST_ENCRYPTION_KEY = "test_encryption_key_for_unit_tests"

class TestHealthAssessment:
    """Comprehensive test class for health assessment functionality including security and compliance."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Initialize test environment with security context."""
        # Initialize test client with security middleware
        self.client = TestClient(router)
        
        # Set up encryption for secure testing
        self.fernet = Fernet(Fernet.generate_key())
        
        # Mock settings for testing
        self.settings = Settings()
        self.settings.security.encryption_key = TEST_ENCRYPTION_KEY
        
        # Initialize services with mocks
        self.llm_service = Mock()
        self.risk_service = RiskAssessmentService(self.llm_service)
        
        # Set up test headers
        self.headers = {
            'Authorization': 'Bearer test_token',
            'X-Request-ID': str(uuid.uuid4()),
            'Accept-Language': 'pt-BR'
        }

    @pytest.mark.asyncio
    async def test_create_questionnaire(self):
        """Tests the creation of a new health questionnaire with security validation."""
        # Prepare test data
        enrollment_data = {
            'enrollment_id': str(TEST_ENROLLMENT_ID),
            'context': {
                'language': 'pt-BR',
                'source': 'broker_portal'
            }
        }

        # Mock LLM service response
        self.llm_service.generate_next_question.return_value = Question(
            text="Você possui alguma condição médica pré-existente?",
            type="choice",
            options=["Sim", "Não"],
            validation_rules={'required': True},
            lgpd_metadata={
                'data_category': 'health_data',
                'retention_period': 365,
                'purpose': 'risk_assessment'
            }
        )

        # Execute request with security headers
        response = await self.client.post(
            '/api/v1/health-assessment/',
            json=enrollment_data,
            headers=self.headers
        )

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert 'questionnaire_id' in data
        assert 'initial_question' in data
        assert data['enrollment_id'] == str(TEST_ENROLLMENT_ID)
        
        # Verify encryption and LGPD compliance
        assert 'encryption_context' in data['metadata']
        assert data['metadata']['encryption_context']['algorithm'] == 'AES-256-GCM'

    @pytest.mark.asyncio
    async def test_submit_response(self):
        """Tests secure response submission and validation."""
        # Create test questionnaire
        questionnaire = Questionnaire(
            enrollment_id=TEST_ENROLLMENT_ID,
            lgpd_consent={
                'purpose': 'health_assessment',
                'data_usage': 'risk_evaluation',
                'retention_period': 365,
                'sharing_policy': 'internal_only'
            }
        )

        # Prepare encrypted response
        encrypted_response = self.fernet.encrypt(
            MOCK_QUESTION_RESPONSE['response'].encode()
        ).decode()

        response_data = {
            **MOCK_QUESTION_RESPONSE,
            'response': encrypted_response
        }

        # Mock risk service analysis
        self.risk_service.analyze_response.return_value = {
            'risk_factors': [
                {
                    'type': 'medical_condition',
                    'severity': 0.7,
                    'description': 'Pre-existing condition identified'
                }
            ],
            'risk_weight': 0.6,
            'confidence': 0.9
        }

        # Submit response with security headers
        response = await self.client.post(
            f'/api/v1/health-assessment/{questionnaire.id}/responses',
            json=response_data,
            headers=self.headers
        )

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert 'analysis_result' in data
        assert data['metadata']['risk_level'] is not None

        # Verify audit trail
        assert len(questionnaire.audit_trail) > 0
        assert questionnaire.audit_trail[-1]['action'] == 'add_response'

    @pytest.mark.asyncio
    async def test_get_risk_assessment(self):
        """Tests risk assessment retrieval with security measures."""
        # Create test questionnaire with responses
        questionnaire = Questionnaire(
            enrollment_id=TEST_ENROLLMENT_ID,
            lgpd_consent={
                'purpose': 'health_assessment',
                'data_usage': 'risk_evaluation',
                'retention_period': 365,
                'sharing_policy': 'internal_only'
            }
        )

        # Add test responses
        test_responses = {
            str(uuid.uuid4()): {
                'value': self.fernet.encrypt(b'test_response').decode(),
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        questionnaire.responses = test_responses

        # Mock risk calculation
        self.risk_service.calculate_overall_risk.return_value = (
            0.75,  # risk_score
            'HIGH',  # risk_level
            [  # risk_factors
                {
                    'type': 'medical_condition',
                    'severity': 0.8,
                    'description': 'Multiple pre-existing conditions'
                }
            ]
        )

        # Request risk assessment
        response = await self.client.get(
            f'/api/v1/health-assessment/{questionnaire.id}/risk-assessment',
            headers=self.headers
        )

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data['risk_level'] == 'HIGH'
        assert 0 <= data['risk_score'] <= 1
        assert len(data['risk_factors']) > 0

        # Verify LGPD compliance
        assert 'analysis_metadata' in data
        assert data['analysis_metadata']['questionnaire_id'] == str(questionnaire.id)

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Tests error handling and security responses."""
        # Test invalid enrollment ID
        response = await self.client.post(
            '/api/v1/health-assessment/',
            json={'enrollment_id': 'invalid-uuid'},
            headers=self.headers
        )
        assert response.status_code == 400

        # Test missing authorization
        response = await self.client.get(
            f'/api/v1/health-assessment/{uuid.uuid4()}/risk-assessment',
            headers={'Accept-Language': 'pt-BR'}
        )
        assert response.status_code == 401

        # Test invalid question response
        response = await self.client.post(
            f'/api/v1/health-assessment/{uuid.uuid4()}/responses',
            json={'invalid': 'data'},
            headers=self.headers
        )
        assert response.status_code == 400

    def teardown_method(self):
        """Cleanup after each test."""
        # Clear sensitive test data
        self.fernet = None
        self.settings.security.encryption_key = None
        
        # Reset mocks
        self.llm_service.reset_mock()
        
        # Close test client
        self.client.close()