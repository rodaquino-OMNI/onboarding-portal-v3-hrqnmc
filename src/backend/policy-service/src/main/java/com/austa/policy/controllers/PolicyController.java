package com.austa.policy.controllers;

import com.austa.policy.models.Policy;
import com.austa.policy.models.PolicyStatus;
import com.austa.policy.services.PolicyService;
import com.fasterxml.jackson.databind.JsonNode;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.UUID;

/**
 * REST controller implementing secure policy management endpoints with role-based access control,
 * request validation, and comprehensive audit logging.
 *
 * @version 1.0.0
 */
@RestController
@RequestMapping("/api/v1/policies")
@RateLimiter(name = "policyApi")
@Tag(name = "Policy Management", description = "Endpoints for policy lifecycle management")
@Validated
public class PolicyController {

    private static final Logger logger = LoggerFactory.getLogger(PolicyController.class);
    private final PolicyService policyService;

    public PolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    /**
     * Creates a new policy based on enrollment and health assessment data.
     *
     * @param enrollmentId UUID of the enrollment
     * @param healthAssessment Health assessment data in JSON format
     * @return ResponseEntity containing the created policy
     */
    @PostMapping
    @PreAuthorize("hasRole('UNDERWRITER')")
    @Operation(summary = "Create new policy", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Policy> createPolicy(
            @RequestParam @NotNull UUID enrollmentId,
            @RequestBody @Valid JsonNode healthAssessment) {
        
        logger.info("Creating policy for enrollment: {}", enrollmentId);
        try {
            Policy policy = policyService.createPolicy(enrollmentId, healthAssessment);
            logger.info("Policy created successfully: {}", policy.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(policy);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid request for policy creation: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Retrieves policy by policy number with role-based access control.
     *
     * @param policyNumber Unique policy identifier
     * @return ResponseEntity containing the policy if found
     */
    @GetMapping("/{policyNumber}")
    @PreAuthorize("hasAnyRole('UNDERWRITER', 'BROKER')")
    @Operation(summary = "Get policy by number", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Policy> getPolicy(@PathVariable String policyNumber) {
        logger.debug("Retrieving policy: {}", policyNumber);
        return policyService.getPolicy(policyNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Updates policy status with validation and audit logging.
     *
     * @param policyNumber Policy identifier
     * @param status New policy status
     * @return ResponseEntity with updated policy
     */
    @PatchMapping("/{policyNumber}/status")
    @PreAuthorize("hasRole('UNDERWRITER')")
    @Operation(summary = "Update policy status", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Void> updatePolicyStatus(
            @PathVariable String policyNumber,
            @RequestBody @Valid PolicyStatus status) {
        
        logger.info("Updating status for policy: {} to {}", policyNumber, status);
        policyService.updatePolicyStatus(policyNumber, status);
        return ResponseEntity.noContent().build();
    }

    /**
     * Updates policy coverage details with validation.
     *
     * @param policyNumber Policy identifier
     * @param coverageDetails New coverage details
     * @return ResponseEntity with operation result
     */
    @PatchMapping("/{policyNumber}/coverage")
    @PreAuthorize("hasRole('UNDERWRITER')")
    @Operation(summary = "Update policy coverage", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Policy> updateCoverageDetails(
            @PathVariable String policyNumber,
            @RequestBody @Valid JsonNode coverageDetails) {

        logger.info("Updating coverage for policy: {}", policyNumber);
        Policy updatedPolicy = policyService.updateCoverageDetails(policyNumber, coverageDetails);
        return ResponseEntity.ok(updatedPolicy);
    }

    /**
     * Retrieves pending policies with pagination.
     *
     * @param pageable Pagination parameters
     * @return ResponseEntity containing page of pending policies
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('UNDERWRITER')")
    @Operation(summary = "Get pending policies", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Page<Policy>> getPendingPolicies(Pageable pageable) {
        logger.debug("Retrieving pending policies, page: {}", pageable.getPageNumber());
        return ResponseEntity.ok(policyService.getPendingPolicies(pageable));
    }

    /**
     * Exception handler for policy-related errors.
     *
     * @param ex The caught exception
     * @return ResponseEntity with error details
     */
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<String> handlePolicyExceptions(Exception ex) {
        logger.error("Policy operation failed: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ex.getMessage());
    }
}