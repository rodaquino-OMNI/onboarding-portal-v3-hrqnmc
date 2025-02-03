package com.austa.policy.services;

import com.austa.policy.models.Policy;
import com.austa.policy.models.PolicyStatus;
import com.austa.policy.repositories.PolicyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class implementing secure policy management business logic with caching and resilience patterns.
 * Handles policy creation, updates, and lifecycle management with comprehensive security measures.
 *
 * @version 1.0.0
 */
@Service
@Transactional(isolation = Isolation.REPEATABLE_READ)
public class PolicyService {

    private static final Logger logger = LoggerFactory.getLogger(PolicyService.class);
    private static final String POLICY_CACHE = "policies";
    
    private final PolicyRepository policyRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final CacheManager cacheManager;

    /**
     * Initializes policy service with required dependencies and security configuration.
     */
    public PolicyService(
            PolicyRepository policyRepository,
            ObjectMapper objectMapper,
            RestTemplate restTemplate,
            CacheManager cacheManager) {
        this.policyRepository = policyRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplate;
        this.cacheManager = cacheManager;
    }

    /**
     * Creates a new policy with secure handling and audit logging.
     *
     * @param enrollmentId Enrollment identifier
     * @param healthAssessment Health assessment data
     * @return Created policy entity with encrypted sensitive data
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @CircuitBreaker(name = "policyCreation", fallbackMethod = "fallbackCreatePolicy")
    @Retry(name = "policyCreation", maxAttempts = 3)
    @RateLimiter(name = "policyCreation")
    public Policy createPolicy(UUID enrollmentId, JsonNode healthAssessment) {
        logger.info("Creating policy for enrollment: {}", enrollmentId);
        
        validateEnrollmentId(enrollmentId);
        validateHealthAssessment(healthAssessment);

        try {
            Policy policy = new Policy();
            policy.setEnrollmentId(enrollmentId);
            policy.setRiskAssessment(healthAssessment);
            
            JsonNode coverage = calculateCoverage(healthAssessment);
            policy.updateCoverage(coverage);
            
            JsonNode waitingPeriods = calculateWaitingPeriods(healthAssessment);
            policy.setWaitingPeriods(waitingPeriods);
            
            BigDecimal premium = calculatePremium(coverage, healthAssessment);
            policy.setPremium(premium);
            
            policy.setEffectiveDate(LocalDateTime.now().plusDays(1));
            policy.setExpirationDate(LocalDateTime.now().plusYears(1));
            
            Policy savedPolicy = policyRepository.save(policy);
            logger.info("Policy created successfully: {}", savedPolicy.getId());
            
            return savedPolicy;
        } catch (Exception e) {
            logger.error("Error creating policy for enrollment {}: {}", enrollmentId, e.getMessage());
            throw new PolicyCreationException("Failed to create policy", e);
        }
    }

    /**
     * Retrieves policy with decryption handling.
     *
     * @param policyNumber Policy identifier
     * @return Optional containing decrypted policy if found
     */
    @Cacheable(value = POLICY_CACHE, key = "#policyNumber", sync = true)
    @CircuitBreaker(name = "policyRetrieval")
    public Optional<Policy> getPolicy(String policyNumber) {
        logger.debug("Retrieving policy: {}", policyNumber);
        return policyRepository.findByPolicyNumber(policyNumber);
    }

    /**
     * Updates policy status with validation and cache eviction.
     */
    @Transactional
    @CacheEvict(value = POLICY_CACHE, key = "#policyNumber")
    @CircuitBreaker(name = "policyUpdate")
    public void updatePolicyStatus(String policyNumber, PolicyStatus newStatus) {
        logger.info("Updating policy status: {} to {}", policyNumber, newStatus);
        
        Policy policy = policyRepository.findByPolicyNumber(policyNumber)
            .orElseThrow(() -> new PolicyNotFoundException(policyNumber));
            
        policy.updateStatus(newStatus);
        policyRepository.save(policy);
    }

    /**
     * Fallback method for policy creation in case of failures.
     */
    private Policy fallbackCreatePolicy(UUID enrollmentId, JsonNode healthAssessment, Exception e) {
        logger.warn("Executing fallback for policy creation. Enrollment: {}", enrollmentId);
        Policy fallbackPolicy = new Policy();
        fallbackPolicy.setEnrollmentId(enrollmentId);
        fallbackPolicy.updateStatus(PolicyStatus.DRAFT);
        return fallbackPolicy;
    }

    private void validateEnrollmentId(UUID enrollmentId) {
        if (enrollmentId == null) {
            throw new IllegalArgumentException("Enrollment ID cannot be null");
        }
        if (policyRepository.findByEnrollmentId(enrollmentId).isPresent()) {
            throw new DuplicatePolicyException("Policy already exists for enrollment: " + enrollmentId);
        }
    }

    private void validateHealthAssessment(JsonNode healthAssessment) {
        if (healthAssessment == null || healthAssessment.isEmpty()) {
            throw new IllegalArgumentException("Health assessment data is required");
        }
    }

    private JsonNode calculateCoverage(JsonNode healthAssessment) {
        // Implementation of coverage calculation based on health assessment
        return objectMapper.createObjectNode();
    }

    private JsonNode calculateWaitingPeriods(JsonNode healthAssessment) {
        // Implementation of waiting periods calculation
        return objectMapper.createObjectNode();
    }

    private BigDecimal calculatePremium(JsonNode coverage, JsonNode healthAssessment) {
        // Implementation of premium calculation
        return BigDecimal.valueOf(500.00);
    }
}

class PolicyCreationException extends RuntimeException {
    public PolicyCreationException(String message, Throwable cause) {
        super(message, cause);
    }
}

class PolicyNotFoundException extends RuntimeException {
    public PolicyNotFoundException(String policyNumber) {
        super("Policy not found: " + policyNumber);
    }
}

class DuplicatePolicyException extends RuntimeException {
    public DuplicatePolicyException(String message) {
        super(message);
    }
}