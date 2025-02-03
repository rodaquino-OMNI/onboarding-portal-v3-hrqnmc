package com.austa.policy;

import com.austa.policy.models.Policy;
import com.austa.policy.models.PolicyStatus;
import com.austa.policy.repositories.PolicyRepository;
import com.austa.policy.services.PolicyService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@ExtendWith(SpringExtension.class)
@TestPropertySource(locations = "classpath:test.properties")
public class PolicyServiceTest {

    @Autowired
    private PolicyService policyService;

    @MockBean
    private PolicyRepository policyRepository;

    @MockBean
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    private UUID testEnrollmentId;
    private JsonNode testHealthAssessment;
    private Policy testPolicy;

    @BeforeEach
    void setUp() {
        // Initialize test data
        testEnrollmentId = UUID.randomUUID();
        testPolicy = new Policy();
        testPolicy.setId(UUID.randomUUID());
        testPolicy.setEnrollmentId(testEnrollmentId);
        testPolicy.setStatus(PolicyStatus.DRAFT);
        testPolicy.setPremium(BigDecimal.valueOf(500.00));
        testPolicy.setEffectiveDate(LocalDateTime.now().plusDays(1));
        testPolicy.setExpirationDate(LocalDateTime.now().plusYears(1));

        // Create test health assessment data
        ObjectNode healthData = objectMapper.createObjectNode();
        healthData.put("age", 35);
        healthData.put("hasPreExistingConditions", false);
        healthData.putArray("medications").add("none");
        testHealthAssessment = healthData;

        // Reset mocks
        reset(policyRepository, restTemplate);

        // Clear caches
        cacheManager.getCacheNames()
            .forEach(cacheName -> cacheManager.getCache(cacheName).clear());

        // Reset circuit breakers
        circuitBreakerRegistry.getAllCircuitBreakers()
            .forEach(CircuitBreaker::reset);
    }

    @Test
    void testCreatePolicy_ShouldCreatePolicyWithinSLA() {
        // Arrange
        when(policyRepository.findByEnrollmentId(testEnrollmentId))
            .thenReturn(Optional.empty());
        when(policyRepository.save(any(Policy.class)))
            .thenReturn(testPolicy);

        // Act
        long startTime = System.currentTimeMillis();
        Policy createdPolicy = policyService.createPolicy(testEnrollmentId, testHealthAssessment);
        long duration = System.currentTimeMillis() - startTime;

        // Assert
        assertNotNull(createdPolicy);
        assertEquals(testEnrollmentId, createdPolicy.getEnrollmentId());
        assertTrue(duration < 5000, "Policy creation exceeded 5 second SLA");
        verify(policyRepository).save(any(Policy.class));
    }

    @Test
    void testGetPolicy_ShouldUseCacheAndMaskSensitiveData() {
        // Arrange
        String policyNumber = testPolicy.getId().toString();
        when(policyRepository.findByPolicyNumber(policyNumber))
            .thenReturn(Optional.of(testPolicy));

        // Act - First call should hit repository
        Optional<Policy> firstCall = policyService.getPolicy(policyNumber);
        
        // Clear repository mock to verify cache hit
        reset(policyRepository);
        
        // Act - Second call should hit cache
        Optional<Policy> secondCall = policyService.getPolicy(policyNumber);

        // Assert
        assertTrue(firstCall.isPresent());
        assertTrue(secondCall.isPresent());
        verify(policyRepository, times(1)).findByPolicyNumber(policyNumber);
        
        // Verify sensitive data masking
        JsonNode riskAssessment = secondCall.get().getRiskAssessment();
        assertFalse(riskAssessment.toString().contains("medications"));
    }

    @Test
    void testCreatePolicy_ShouldHandleRetryAndCircuitBreaker() {
        // Arrange
        when(policyRepository.findByEnrollmentId(testEnrollmentId))
            .thenReturn(Optional.empty());
        when(policyRepository.save(any(Policy.class)))
            .thenThrow(new RuntimeException("Transient error"))
            .thenReturn(testPolicy);

        // Act
        Policy createdPolicy = policyService.createPolicy(testEnrollmentId, testHealthAssessment);

        // Assert
        assertNotNull(createdPolicy);
        verify(policyRepository, times(2)).save(any(Policy.class));
    }

    @Test
    void testUpdatePolicyStatus_ShouldValidateTransitionAndEvictCache() {
        // Arrange
        String policyNumber = testPolicy.getId().toString();
        when(policyRepository.findByPolicyNumber(policyNumber))
            .thenReturn(Optional.of(testPolicy));

        // Act
        policyService.updatePolicyStatus(policyNumber, PolicyStatus.PENDING_ACTIVATION);

        // Assert
        verify(policyRepository).save(any(Policy.class));
        assertNull(cacheManager.getCache("policies").get(policyNumber));
    }

    @Test
    void testSecureDataHandling_ShouldEncryptSensitiveData() {
        // Arrange
        ObjectNode sensitiveHealthData = objectMapper.createObjectNode();
        sensitiveHealthData.put("hasCriticalCondition", true);
        sensitiveHealthData.putArray("medications")
            .add("Medication A")
            .add("Medication B");

        when(policyRepository.findByEnrollmentId(testEnrollmentId))
            .thenReturn(Optional.empty());
        when(policyRepository.save(any(Policy.class)))
            .thenReturn(testPolicy);

        // Act
        Policy createdPolicy = policyService.createPolicy(testEnrollmentId, sensitiveHealthData);

        // Assert
        assertNotNull(createdPolicy);
        JsonNode storedAssessment = createdPolicy.getRiskAssessment();
        assertFalse(storedAssessment.toString().contains("Medication"));
        assertTrue(storedAssessment.toString().contains("encrypted"));
    }

    @Test
    void testCreatePolicy_ShouldFailForDuplicateEnrollment() {
        // Arrange
        when(policyRepository.findByEnrollmentId(testEnrollmentId))
            .thenReturn(Optional.of(testPolicy));

        // Act & Assert
        assertThrows(DuplicatePolicyException.class, () -> 
            policyService.createPolicy(testEnrollmentId, testHealthAssessment));
    }

    @Test
    void testGetPolicy_ShouldHandleCircuitBreakerFailure() {
        // Arrange
        String policyNumber = testPolicy.getId().toString();
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker("policyRetrieval");
        circuitBreaker.transitionToOpenState();

        // Act & Assert
        assertThrows(RuntimeException.class, () -> 
            policyService.getPolicy(policyNumber));
    }
}