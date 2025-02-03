import logging
from typing import Any, Dict, List, Optional
import openai  # version: ^1.0.0
from azure.ai.openai import AzureOpenAI  # version: ^1.0.0
from tenacity import retry, stop_after_attempt, wait_exponential  # version: ^8.0.0
from prometheus_client import Counter, Histogram  # version: ^0.17.0

from config.settings import Settings
from models.questionnaire import Question

# Constants for LLM service configuration
SYSTEM_PROMPT = """You are an AI health assessment assistant analyzing health questionnaire responses for insurance enrollment, 
ensuring LGPD compliance and data privacy."""
MAX_RETRIES = 5
RETRY_WAIT_SECONDS = 2
DEFAULT_TEMPERATURE = 0.2
RISK_SCORE_THRESHOLD = 0.7
PROVIDER_TIMEOUT_SECONDS = 30

# Metrics
llm_requests = Counter('llm_requests_total', 'Total LLM API requests', ['provider', 'operation'])
llm_latency = Histogram('llm_request_duration_seconds', 'LLM request latency', ['provider', 'operation'])
llm_errors = Counter('llm_errors_total', 'Total LLM API errors', ['provider', 'error_type'])

class LLMService:
    """Enhanced service for secure LLM interactions with health questionnaire and risk assessment."""

    def __init__(self, settings: Settings, logger: logging.Logger, metrics_collector: Any):
        """Initialize LLM service with multi-provider support and enhanced security."""
        self._settings = settings
        self._logger = logger
        self._metrics = metrics_collector
        
        # Initialize providers
        self._providers = {}
        self._provider_configs = settings.get_llm_config()
        self._current_provider = self._provider_configs['provider']
        self._system_prompt = SYSTEM_PROMPT
        
        # Configure OpenAI provider
        openai.api_key = self._provider_configs['api_key']
        self._providers['openai'] = openai
        
        # Configure Azure OpenAI provider if available
        if self._provider_configs.get('azure_endpoint'):
            self._providers['azure'] = AzureOpenAI(
                azure_endpoint=self._provider_configs['azure_endpoint'],
                api_key=self._provider_configs['azure_api_key'],
                api_version=self._provider_configs.get('azure_api_version', '2023-05-15')
            )

    @retry(stop=stop_after_attempt(MAX_RETRIES), 
           wait=wait_exponential(multiplier=RETRY_WAIT_SECONDS))
    async def generate_next_question(
        self, 
        previous_responses: Dict[str, Any], 
        available_questions: List[Question],
        language_preference: str
    ) -> Question:
        """Generates contextually appropriate next question with enhanced security."""
        try:
            # Sanitize and validate previous responses
            sanitized_responses = {
                str(qid): Question.sanitize_health_data(resp) 
                for qid, resp in previous_responses.items()
            }

            # Prepare context for LLM
            context = {
                "previous_responses": sanitized_responses,
                "available_questions": [
                    {"id": str(q.id), "text": q.text, "type": q.type}
                    for q in available_questions
                ],
                "language": language_preference
            }

            # Prepare prompt
            messages = [
                {"role": "system", "content": self._system_prompt},
                {"role": "user", "content": self._build_question_prompt(context)}
            ]

            # Make API call with metrics
            with llm_latency.labels(self._current_provider, 'generate_question').time():
                llm_requests.labels(self._current_provider, 'generate_question').inc()
                
                try:
                    response = await self._make_llm_call(
                        messages=messages,
                        temperature=DEFAULT_TEMPERATURE,
                        max_tokens=self._provider_configs['max_tokens']
                    )
                except Exception as e:
                    self._logger.error(f"Primary provider failed: {str(e)}")
                    llm_errors.labels(self._current_provider, 'api_error').inc()
                    response = await self._fallback_llm_call(messages)

            # Parse and validate response
            next_question = self._parse_llm_response(response)
            if not next_question:
                raise ValueError("Failed to generate valid next question")

            return next_question

        except Exception as e:
            self._logger.error(f"Error generating next question: {str(e)}")
            llm_errors.labels(self._current_provider, 'processing_error').inc()
            raise

    @retry(stop=stop_after_attempt(MAX_RETRIES), 
           wait=wait_exponential(multiplier=RETRY_WAIT_SECONDS))
    async def analyze_response(
        self, 
        question: Question, 
        response: Any, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhanced analysis of health responses with comprehensive risk factor detection."""
        try:
            # Validate response format
            is_valid, errors = question.validate_response(response)
            if not is_valid:
                raise ValueError(f"Invalid response: {errors}")

            # Prepare analysis prompt
            messages = [
                {"role": "system", "content": self._system_prompt},
                {"role": "user", "content": self._build_analysis_prompt(question, response, context)}
            ]

            # Make API call with metrics
            with llm_latency.labels(self._current_provider, 'analyze_response').time():
                llm_requests.labels(self._current_provider, 'analyze_response').inc()
                
                try:
                    response = await self._make_llm_call(
                        messages=messages,
                        temperature=DEFAULT_TEMPERATURE,
                        max_tokens=self._provider_configs['max_tokens']
                    )
                except Exception as e:
                    self._logger.error(f"Primary provider failed: {str(e)}")
                    llm_errors.labels(self._current_provider, 'api_error').inc()
                    response = await self._fallback_llm_call(messages)

            # Parse and validate analysis
            analysis_result = self._parse_analysis_response(response)
            if not analysis_result:
                raise ValueError("Failed to generate valid analysis")

            return analysis_result

        except Exception as e:
            self._logger.error(f"Error analyzing response: {str(e)}")
            llm_errors.labels(self._current_provider, 'processing_error').inc()
            raise

    async def _make_llm_call(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float, 
        max_tokens: int
    ) -> Dict[str, Any]:
        """Make secure LLM API call with current provider."""
        provider = self._providers[self._current_provider]
        
        if self._current_provider == 'openai':
            response = await provider.ChatCompletion.acreate(
                model=self._provider_configs['model'],
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=PROVIDER_TIMEOUT_SECONDS
            )
        else:  # Azure OpenAI
            response = await provider.chat.completions.create(
                deployment_name=self._provider_configs['azure_deployment'],
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=PROVIDER_TIMEOUT_SECONDS
            )
        
        return response

    async def _fallback_llm_call(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Execute fallback LLM call with secondary provider."""
        fallback_config = self._provider_configs['fallback']
        original_provider = self._current_provider
        
        try:
            self._current_provider = fallback_config['secondary_provider']
            response = await self._make_llm_call(
                messages=messages,
                temperature=DEFAULT_TEMPERATURE,
                max_tokens=self._provider_configs['max_tokens']
            )
            return response
        finally:
            self._current_provider = original_provider

    def _build_question_prompt(self, context: Dict[str, Any]) -> str:
        """Build secure prompt for question generation."""
        return f"""Based on the previous responses and available questions, 
        generate the most appropriate next question for health assessment.
        Previous responses: {context['previous_responses']}
        Available questions: {context['available_questions']}
        Language: {context['language']}
        
        Return the question in JSON format with id, text, and type fields."""

    def _build_analysis_prompt(
        self, 
        question: Question, 
        response: Any, 
        context: Dict[str, Any]
    ) -> str:
        """Build secure prompt for response analysis."""
        return f"""Analyze the health questionnaire response for risk factors and implications.
        Question: {question.text}
        Response: {response}
        Context: {context}
        
        Return the analysis in JSON format with risk_factors, risk_score, and recommendations fields."""

    def _parse_llm_response(self, response: Dict[str, Any]) -> Optional[Question]:
        """Parse and validate LLM response for question generation."""
        try:
            content = response.choices[0].message.content
            # Additional response validation and parsing logic
            return Question(**content)
        except Exception as e:
            self._logger.error(f"Error parsing LLM response: {str(e)}")
            return None

    def _parse_analysis_response(self, response: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse and validate LLM response for analysis."""
        try:
            content = response.choices[0].message.content
            # Additional response validation and parsing logic
            return content
        except Exception as e:
            self._logger.error(f"Error parsing analysis response: {str(e)}")
            return None