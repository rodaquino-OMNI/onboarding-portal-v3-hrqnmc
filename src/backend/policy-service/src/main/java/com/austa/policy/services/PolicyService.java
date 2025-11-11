package com.austa.policy.services;

import com.austa.policy.models.Policy;
import com.austa.policy.models.PolicyStatus;
import com.austa.policy.models.CoverageSchemaValidator;
import com.austa.policy.repositories.PolicyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Iterator;
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
     * Updates policy coverage details with validation.
     *
     * @param policyNumber Policy identifier
     * @param coverageDetails New coverage details
     * @return Updated policy entity
     */
    @Transactional
    @CacheEvict(value = POLICY_CACHE, key = "#policyNumber")
    @CircuitBreaker(name = "policyUpdate")
    public Policy updateCoverageDetails(String policyNumber, JsonNode coverageDetails) {
        logger.info("Updating coverage details for policy: {}", policyNumber);

        // Validate coverage schema
        if (!CoverageSchemaValidator.isValid(coverageDetails)) {
            throw new IllegalArgumentException("Invalid coverage schema");
        }

        Policy policy = policyRepository.findByPolicyNumber(policyNumber)
            .orElseThrow(() -> new PolicyNotFoundException(policyNumber));

        policy.updateCoverage(coverageDetails);
        Policy savedPolicy = policyRepository.save(policy);

        logger.info("Coverage details updated successfully for policy: {}", policyNumber);
        return savedPolicy;
    }

    /**
     * Retrieves pending policies with pagination.
     *
     * @param pageable Pagination parameters
     * @return Page of policies with PENDING_ACTIVATION status
     */
    @CircuitBreaker(name = "policyRetrieval")
    public Page<Policy> getPendingPolicies(Pageable pageable) {
        logger.info("Retrieving pending policies, page: {}", pageable.getPageNumber());

        // Call repository method
        Page<Policy> policies = policyRepository.findPendingPolicies(pageable);

        // Mask sensitive data for each policy
        policies.forEach(policy -> {
            // Mask risk assessment data - replace sensitive values
            JsonNode riskAssessment = policy.getRiskAssessment();
            if (riskAssessment != null && !riskAssessment.isEmpty()) {
                maskSensitiveData(riskAssessment);
            }

            // Coverage details are already encrypted via @EncryptedColumn
        });

        logger.info("Retrieved {} pending policies", policies.getTotalElements());
        return policies;
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

    /**
     * Calculates coverage details based on health assessment.
     * Considers age, pre-existing conditions, and risk score to determine coverage parameters.
     *
     * @param healthAssessment Health assessment data
     * @return Coverage details as JSON including amounts, aggravations, and exclusions
     */
    private JsonNode calculateCoverage(JsonNode healthAssessment) {
        logger.debug("Calculating coverage based on health assessment");

        ObjectNode coverage = objectMapper.createObjectNode();

        // Extract health assessment data
        int age = healthAssessment.has("age") ? healthAssessment.get("age").asInt() : 30;
        String riskLevel = healthAssessment.has("riskLevel") ? healthAssessment.get("riskLevel").asText() : "LOW";
        JsonNode preExistingConditions = healthAssessment.has("preExistingConditions") ?
            healthAssessment.get("preExistingConditions") : objectMapper.createArrayNode();

        // Determine plan type based on age and risk
        String planType = determinePlanType(age, riskLevel);
        coverage.put("planType", planType);

        // Calculate base coverage amount
        BigDecimal baseCoverage = calculateBaseCoverageAmount(age, riskLevel);
        coverage.put("coverageAmount", baseCoverage.toString());

        // Calculate deductible (typically 10-20% of coverage)
        BigDecimal deductible = baseCoverage.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP);
        coverage.put("deductible", deductible.toString());

        // Set co-insurance percentage
        int coInsurance = calculateCoInsurance(riskLevel);
        coverage.put("coInsurance", coInsurance);

        // Apply aggravations based on health data
        ArrayNode aggravations = objectMapper.createArrayNode();
        if (preExistingConditions.isArray() && preExistingConditions.size() > 0) {
            for (JsonNode condition : preExistingConditions) {
                ObjectNode aggravation = objectMapper.createObjectNode();
                String conditionName = condition.asText();
                aggravation.put("condition", conditionName);
                aggravation.put("multiplier", determineAggravationMultiplier(conditionName));
                aggravation.put("description", "Coverage aggravation for " + conditionName);
                aggravations.add(aggravation);
            }
        }
        coverage.set("aggravations", aggravations);

        // Apply exclusions based on pre-existing conditions
        ArrayNode exclusions = objectMapper.createArrayNode();
        if (preExistingConditions.isArray()) {
            for (JsonNode condition : preExistingConditions) {
                ObjectNode exclusion = objectMapper.createObjectNode();
                exclusion.put("type", condition.asText());
                exclusion.put("reason", "Pre-existing condition");
                exclusion.put("effectiveDate", LocalDateTime.now().toString());
                exclusions.add(exclusion);
            }
        }
        coverage.set("exclusions", exclusions);

        // Add coverage limits per procedure type
        ObjectNode procedureLimits = objectMapper.createObjectNode();
        procedureLimits.put("emergency", baseCoverage.toString());
        procedureLimits.put("outpatient", baseCoverage.multiply(new BigDecimal("0.8")).toString());
        procedureLimits.put("complex", baseCoverage.multiply(new BigDecimal("0.6")).toString());
        procedureLimits.put("elective", baseCoverage.multiply(new BigDecimal("0.5")).toString());
        coverage.set("procedureLimits", procedureLimits);

        logger.info("Coverage calculated: planType={}, amount={}", planType, baseCoverage);
        return coverage;
    }

    /**
     * Calculates waiting periods for different procedure types based on health assessment.
     *
     * @param healthAssessment Health assessment data
     * @return Waiting periods in days for each procedure category
     */
    private JsonNode calculateWaitingPeriods(JsonNode healthAssessment) {
        logger.debug("Calculating waiting periods based on health assessment");

        ObjectNode waitingPeriods = objectMapper.createObjectNode();

        // Extract risk level
        String riskLevel = healthAssessment.has("riskLevel") ? healthAssessment.get("riskLevel").asText() : "LOW";
        JsonNode preExistingConditions = healthAssessment.has("preExistingConditions") ?
            healthAssessment.get("preExistingConditions") : objectMapper.createArrayNode();

        // Standard periods (in days)
        int emergencyPeriod = 1; // 24 hours
        int outpatientPeriod = 30;
        int complexPeriod = 180;
        int preExistingPeriod = 300;

        // Extend periods based on risk assessment
        int riskMultiplier = getRiskMultiplier(riskLevel);

        // Apply extensions for outpatient and complex procedures for higher risk
        if (riskMultiplier > 1) {
            outpatientPeriod = outpatientPeriod * riskMultiplier;
            complexPeriod = complexPeriod + (riskMultiplier - 1) * 90;
        }

        // Set waiting periods
        waitingPeriods.put("emergency", emergencyPeriod);
        waitingPeriods.put("outpatient", outpatientPeriod);
        waitingPeriods.put("complex", complexPeriod);
        waitingPeriods.put("elective", complexPeriod);

        // Add extended periods for pre-existing conditions
        if (preExistingConditions.isArray() && preExistingConditions.size() > 0) {
            waitingPeriods.put("preExisting", preExistingPeriod);

            // Add specific waiting periods per condition
            ObjectNode conditionPeriods = objectMapper.createObjectNode();
            for (JsonNode condition : preExistingConditions) {
                conditionPeriods.put(condition.asText(), preExistingPeriod);
            }
            waitingPeriods.set("conditionSpecific", conditionPeriods);
        }

        logger.info("Waiting periods calculated for risk level: {}", riskLevel);
        return waitingPeriods;
    }

    /**
     * Calculates premium based on coverage and health assessment using age-bracket pricing.
     *
     * @param coverage Coverage details
     * @param healthAssessment Health assessment data
     * @return Monthly premium amount in BRL
     */
    private BigDecimal calculatePremium(JsonNode coverage, JsonNode healthAssessment) {
        logger.debug("Calculating premium based on coverage and health assessment");

        // Extract age
        int age = healthAssessment.has("age") ? healthAssessment.get("age").asInt() : 30;

        // Age bracket base premiums (in BRL)
        BigDecimal[] ageBracketPremiums = {
            new BigDecimal("150"),  // 0-18
            new BigDecimal("180"),  // 19-23
            new BigDecimal("220"),  // 24-28
            new BigDecimal("280"),  // 29-33
            new BigDecimal("350"),  // 34-38
            new BigDecimal("450"),  // 39-43
            new BigDecimal("580"),  // 44-48
            new BigDecimal("750"),  // 49-53
            new BigDecimal("950"),  // 54-58
            new BigDecimal("1200")  // 59+
        };

        // Determine age bracket
        int bracketIndex = getAgeBracket(age);
        BigDecimal basePremium = ageBracketPremiums[bracketIndex];

        // Extract risk level
        String riskLevel = healthAssessment.has("riskLevel") ? healthAssessment.get("riskLevel").asText() : "LOW";

        // Apply risk multiplier
        BigDecimal riskMultiplier = getRiskPremiumMultiplier(riskLevel);
        BigDecimal premiumWithRisk = basePremium.multiply(riskMultiplier);

        // Apply coverage aggravation adjustments
        BigDecimal aggravationAdjustment = BigDecimal.ONE;
        if (coverage.has("aggravations") && coverage.get("aggravations").isArray()) {
            ArrayNode aggravations = (ArrayNode) coverage.get("aggravations");
            for (JsonNode aggravation : aggravations) {
                if (aggravation.has("multiplier")) {
                    double multiplier = aggravation.get("multiplier").asDouble();
                    aggravationAdjustment = aggravationAdjustment.multiply(new BigDecimal(multiplier));
                }
            }
        }

        // Calculate final premium
        BigDecimal finalPremium = premiumWithRisk.multiply(aggravationAdjustment)
            .setScale(2, RoundingMode.HALF_UP);

        logger.info("Premium calculated: age={}, bracket={}, base={}, risk={}, final={}",
            age, bracketIndex, basePremium, riskLevel, finalPremium);

        return finalPremium;
    }

    // Helper methods

    private String determinePlanType(int age, String riskLevel) {
        if (age < 25 && "LOW".equals(riskLevel)) {
            return "BASIC";
        } else if (age < 40 && ("LOW".equals(riskLevel) || "MEDIUM".equals(riskLevel))) {
            return "STANDARD";
        } else if (age < 55) {
            return "PREMIUM";
        } else {
            return "EXECUTIVE";
        }
    }

    private BigDecimal calculateBaseCoverageAmount(int age, String riskLevel) {
        BigDecimal baseAmount = new BigDecimal("100000.00");

        // Increase coverage for older individuals
        if (age >= 40) {
            baseAmount = new BigDecimal("250000.00");
        }
        if (age >= 55) {
            baseAmount = new BigDecimal("500000.00");
        }

        // Adjust for risk level
        if ("HIGH".equals(riskLevel)) {
            baseAmount = baseAmount.multiply(new BigDecimal("0.8"));
        }

        return baseAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private int calculateCoInsurance(String riskLevel) {
        switch (riskLevel) {
            case "LOW":
                return 10;
            case "MEDIUM":
                return 20;
            case "HIGH":
                return 30;
            default:
                return 20;
        }
    }

    private double determineAggravationMultiplier(String condition) {
        // Simple condition-based multipliers
        switch (condition.toLowerCase()) {
            case "diabetes":
                return 1.5;
            case "hypertension":
                return 1.3;
            case "heart disease":
                return 2.0;
            case "cancer":
                return 2.5;
            default:
                return 1.2;
        }
    }

    private int getRiskMultiplier(String riskLevel) {
        switch (riskLevel) {
            case "LOW":
                return 1;
            case "MEDIUM":
                return 2;
            case "HIGH":
                return 3;
            default:
                return 1;
        }
    }

    private int getAgeBracket(int age) {
        if (age <= 18) return 0;
        if (age <= 23) return 1;
        if (age <= 28) return 2;
        if (age <= 33) return 3;
        if (age <= 38) return 4;
        if (age <= 43) return 5;
        if (age <= 48) return 6;
        if (age <= 53) return 7;
        if (age <= 58) return 8;
        return 9;
    }

    private BigDecimal getRiskPremiumMultiplier(String riskLevel) {
        switch (riskLevel) {
            case "LOW":
                return new BigDecimal("1.0");
            case "MEDIUM":
                return new BigDecimal("1.2");
            case "HIGH":
                return new BigDecimal("1.5");
            default:
                return new BigDecimal("1.0");
        }
    }

    private void maskSensitiveData(JsonNode data) {
        if (data.isObject()) {
            ObjectNode objectNode = (ObjectNode) data;
            Iterator<String> fieldNames = objectNode.fieldNames();
            while (fieldNames.hasNext()) {
                String fieldName = fieldNames.next();
                // Mask fields that contain sensitive information
                if (fieldName.toLowerCase().contains("ssn") ||
                    fieldName.toLowerCase().contains("cpf") ||
                    fieldName.toLowerCase().contains("passport")) {
                    objectNode.put(fieldName, "***MASKED***");
                }
            }
        }
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