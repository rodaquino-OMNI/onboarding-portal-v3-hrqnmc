package com.austa.enrollment.controllers;

import com.austa.enrollment.services.EnrollmentService;
import com.austa.enrollment.models.Enrollment;
import com.austa.enrollment.dto.*;
import com.austa.enrollment.utils.AuditLogger;
import com.austa.enrollment.utils.MetricsCollector;

import org.springframework.web.bind.annotation.*;  // version: 3.0.0
import org.springframework.security.access.prepost.PreAuthorize;  // version: 3.0.0
import org.springframework.validation.annotation.Validated;  // version: 3.0.0
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import io.micrometer.core.annotation.Timed;  // version: 1.11.0
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;  // version: 2.1.0
import lombok.extern.slf4j.Slf4j;

import javax.validation.Valid;
import java.util.UUID;
import java.util.List;
import java.net.URI;

/**
 * REST controller implementing enrollment management endpoints with comprehensive security,
 * monitoring, and performance features for the Pre-paid Health Plan Onboarding Portal.
 */
@RestController
@RequestMapping("/api/v1/enrollments")
@Validated
@Slf4j
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final AuditLogger auditLogger;
    private final MetricsCollector metricsCollector;

    public EnrollmentController(
            EnrollmentService enrollmentService,
            AuditLogger auditLogger,
            MetricsCollector metricsCollector) {
        this.enrollmentService = enrollmentService;
        this.auditLogger = auditLogger;
        this.metricsCollector = metricsCollector;
    }

    /**
     * Creates a new enrollment application with comprehensive validation and monitoring.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('BROKER', 'HR_ADMIN')")
    @Timed(value = "enrollment.create", percentiles = {0.5, 0.9, 0.95})
    @RateLimiter(name = "enrollmentCreation")
    public ResponseEntity<EnrollmentResponse> createEnrollment(
            @Valid @RequestBody EnrollmentDTO enrollmentDTO,
            @RequestHeader("X-Idempotency-Key") String idempotencyKey) {
        
        log.debug("Creating enrollment with idempotency key: {}", idempotencyKey);
        
        auditLogger.logAction("CREATE_ENROLLMENT_ATTEMPT", enrollmentDTO.getBeneficiaryId());
        
        Enrollment enrollment = enrollmentService.createEnrollment(enrollmentDTO);
        
        metricsCollector.recordEnrollmentCreation(enrollment.getId());
        
        EnrollmentResponse response = EnrollmentResponse.fromEnrollment(enrollment);
        
        return ResponseEntity
                .created(URI.create("/api/v1/enrollments/" + enrollment.getId()))
                .body(response);
    }

    /**
     * Submits health assessment data for an enrollment.
     */
    @PostMapping("/{enrollmentId}/health-assessment")
    @PreAuthorize("hasAnyRole('BENEFICIARY', 'GUARDIAN')")
    @Timed(value = "enrollment.health.assessment", percentiles = {0.5, 0.9, 0.95})
    @RateLimiter(name = "healthAssessment")
    public ResponseEntity<Void> submitHealthAssessment(
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody HealthAssessmentDTO assessmentDTO) {
        
        log.debug("Submitting health assessment for enrollment: {}", enrollmentId);
        
        auditLogger.logAction("SUBMIT_HEALTH_ASSESSMENT", enrollmentId);
        
        enrollmentService.processHealthAssessment(enrollmentId, assessmentDTO);
        
        metricsCollector.recordHealthAssessmentSubmission(enrollmentId);
        
        return ResponseEntity.ok().build();
    }

    /**
     * Uploads documents for an enrollment.
     */
    @PostMapping("/{enrollmentId}/documents")
    @PreAuthorize("hasAnyRole('BENEFICIARY', 'GUARDIAN', 'BROKER')")
    @Timed(value = "enrollment.document.upload", percentiles = {0.5, 0.9, 0.95})
    @RateLimiter(name = "documentUpload")
    public ResponseEntity<DocumentResponse> uploadDocument(
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody DocumentUploadDTO documentDTO) {
        
        log.debug("Uploading document for enrollment: {}", enrollmentId);
        
        auditLogger.logAction("UPLOAD_DOCUMENT", enrollmentId);
        
        DocumentResponse response = enrollmentService.uploadDocument(enrollmentId, documentDTO);
        
        metricsCollector.recordDocumentUpload(enrollmentId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves enrollments for a beneficiary.
     */
    @GetMapping("/beneficiary/{beneficiaryId}")
    @PreAuthorize("hasAnyRole('BENEFICIARY', 'GUARDIAN', 'BROKER')")
    @Timed(value = "enrollment.retrieve", percentiles = {0.5, 0.9, 0.95})
    public ResponseEntity<List<EnrollmentResponse>> getEnrollmentsByBeneficiary(
            @PathVariable UUID beneficiaryId) {
        
        log.debug("Retrieving enrollments for beneficiary: {}", beneficiaryId);
        
        auditLogger.logAction("RETRIEVE_ENROLLMENTS", beneficiaryId);
        
        List<EnrollmentResponse> enrollments = enrollmentService
                .getEnrollmentsByBeneficiary(beneficiaryId)
                .stream()
                .map(EnrollmentResponse::fromEnrollment)
                .toList();
        
        return ResponseEntity.ok(enrollments);
    }

    /**
     * Updates enrollment status with validation.
     */
    @PatchMapping("/{enrollmentId}/status")
    @PreAuthorize("hasRole('UNDERWRITER')")
    @Timed(value = "enrollment.status.update", percentiles = {0.5, 0.9, 0.95})
    public ResponseEntity<EnrollmentResponse> updateEnrollmentStatus(
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody StatusUpdateDTO statusDTO) {
        
        log.debug("Updating status for enrollment: {}", enrollmentId);
        
        auditLogger.logAction("UPDATE_ENROLLMENT_STATUS", enrollmentId);
        
        Enrollment enrollment = enrollmentService.updateEnrollmentStatus(enrollmentId, statusDTO.getStatus());
        
        metricsCollector.recordStatusUpdate(enrollmentId, statusDTO.getStatus());
        
        return ResponseEntity.ok(EnrollmentResponse.fromEnrollment(enrollment));
    }

    /**
     * Exception handler for enrollment-related exceptions.
     */
    @ExceptionHandler(EnrollmentException.class)
    public ResponseEntity<ErrorResponse> handleEnrollmentException(EnrollmentException ex) {
        log.error("Enrollment error: {}", ex.getMessage(), ex);
        
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                ex.getErrorCode()
        );
        
        return ResponseEntity.badRequest().body(error);
    }
}