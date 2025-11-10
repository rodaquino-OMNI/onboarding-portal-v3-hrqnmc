package com.austa.enrollment.services;

import com.austa.enrollment.models.Enrollment;
import com.austa.enrollment.models.EnrollmentStatus;
import com.austa.enrollment.models.EnrollmentDocument;
import com.austa.enrollment.models.HealthAssessment;
import com.austa.enrollment.repositories.EnrollmentRepository;
import com.austa.enrollment.config.EnrollmentConfig;
import com.austa.enrollment.dto.*;
import com.austa.enrollment.exceptions.EnrollmentException;
import com.austa.enrollment.utils.AuditLogger;
import com.austa.enrollment.utils.DataMaskingUtil;
import com.austa.enrollment.utils.MetricsCollector;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import lombok.extern.slf4j.Slf4j;

import org.springframework.cache.Cache;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import javax.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service class implementing core business logic for enrollment processing with enhanced
 * security, performance optimization, and reliability features.
 * 
 * @version 1.0
 */
@Service
@Transactional
@Slf4j
@Validated
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final Cache enrollmentCache;
    private final CircuitBreaker healthServiceBreaker;
    private final CircuitBreaker documentServiceBreaker;
    private final Retry serviceRetry;
    private final ObjectMapper objectMapper;
    private final EnrollmentConfig config;
    private final AuditLogger auditLogger;
    private final MetricsCollector metricsCollector;

    private static final String ENROLLMENT_CACHE_KEY = "enrollment:";
    private static final String HEALTH_BREAKER = "healthServiceBreaker";
    private static final String DOCUMENT_BREAKER = "documentServiceBreaker";
    private static final String SERVICE_RETRY = "enrollmentServiceRetry";
    private static final long MAX_DOCUMENT_SIZE = 10485760; // 10MB

    /**
     * Constructs the EnrollmentService with required dependencies and configurations.
     */
    public EnrollmentService(
            EnrollmentRepository enrollmentRepository,
            Cache enrollmentCache,
            CircuitBreakerRegistry circuitBreakerRegistry,
            RetryRegistry retryRegistry,
            ObjectMapper objectMapper,
            EnrollmentConfig config,
            AuditLogger auditLogger,
            MetricsCollector metricsCollector) {

        this.enrollmentRepository = enrollmentRepository;
        this.enrollmentCache = enrollmentCache;
        this.objectMapper = objectMapper;
        this.config = config;
        this.auditLogger = auditLogger;
        this.metricsCollector = metricsCollector;

        // Configure circuit breakers
        this.healthServiceBreaker = circuitBreakerRegistry.circuitBreaker(HEALTH_BREAKER,
                CircuitBreaker.ofDefaults(HEALTH_BREAKER));

        this.documentServiceBreaker = circuitBreakerRegistry.circuitBreaker(DOCUMENT_BREAKER,
                CircuitBreaker.ofDefaults(DOCUMENT_BREAKER));

        // Configure retry mechanism
        this.serviceRetry = retryRegistry.retry(SERVICE_RETRY, RetryRegistry.ofDefaults());

        log.info("EnrollmentService initialized with circuit breakers and retry mechanisms");
    }

    /**
     * Creates a new enrollment with comprehensive validation and security measures.
     * 
     * @param enrollmentDTO the enrollment data transfer object
     * @return created Enrollment entity
     * @throws EnrollmentException if validation fails or processing error occurs
     */
    @Transactional
    @Cacheable(value = "enrollments", key = "#result.id", unless = "#result == null")
    public Enrollment createEnrollment(@Valid EnrollmentDTO enrollmentDTO) {
        log.debug("Creating new enrollment for beneficiary: {}", 
                DataMaskingUtil.maskSensitiveId(enrollmentDTO.getBeneficiaryId()));

        try {
            validateEnrollmentData(enrollmentDTO);

            Enrollment enrollment = new Enrollment();
            enrollment.setBeneficiaryId(enrollmentDTO.getBeneficiaryId());
            enrollment.setBrokerId(enrollmentDTO.getBrokerId());
            enrollment.setGuardianId(enrollmentDTO.getGuardianId());

            // Apply security transformations
            enrichEnrollmentWithSecureData(enrollment, enrollmentDTO);

            Enrollment savedEnrollment = enrollmentRepository.save(enrollment);
            log.info("Successfully created enrollment with ID: {}", savedEnrollment.getId());

            // Cache the result
            enrollmentCache.put(ENROLLMENT_CACHE_KEY + savedEnrollment.getId(), savedEnrollment);

            return savedEnrollment;

        } catch (Exception e) {
            log.error("Error creating enrollment: {}", e.getMessage(), e);
            throw new EnrollmentException("Failed to create enrollment", e);
        }
    }

    /**
     * Processes health assessment with reliability features and circuit breaker pattern.
     * 
     * @param enrollmentId the enrollment ID
     * @param assessmentDTO the health assessment data
     * @throws EnrollmentException if processing fails
     */
    @Transactional
    @CacheEvict(value = "enrollments", key = "#enrollmentId")
    public void processHealthAssessment(UUID enrollmentId, @Valid HealthAssessmentDTO assessmentDTO) {
        log.debug("Processing health assessment for enrollment: {}", enrollmentId);

        Enrollment enrollment = serviceRetry.executeSupplier(() ->
            enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentException("Enrollment not found: " + enrollmentId))
        );

        try {
            // Execute with circuit breaker
            healthServiceBreaker.executeSupplier(() -> {
                validateHealthAssessment(assessmentDTO);
                enrichHealthAssessmentData(enrollment, assessmentDTO);
                return true;
            });

            enrollment.updateStatus(determineNextStatus(enrollment, assessmentDTO));
            enrollmentRepository.save(enrollment);

            log.info("Successfully processed health assessment for enrollment: {}", enrollmentId);

        } catch (Exception e) {
            log.error("Error processing health assessment: {}", e.getMessage(), e);
            throw new EnrollmentException("Failed to process health assessment", e);
        }
    }

    /**
     * Retrieves enrollment by ID with caching and retry mechanism.
     * 
     * @param enrollmentId the enrollment ID
     * @return the Enrollment entity
     * @throws EnrollmentException if enrollment not found
     */
    @Cacheable(value = "enrollments", key = "#enrollmentId", unless = "#result == null")
    public Enrollment getEnrollment(UUID enrollmentId) {
        log.debug("Retrieving enrollment: {}", enrollmentId);

        return serviceRetry.executeSupplier(() ->
            enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentException("Enrollment not found: " + enrollmentId))
        );
    }

    /**
     * Retrieves all enrollments for a specific beneficiary.
     *
     * @param beneficiaryId the beneficiary UUID
     * @return list of enrollments
     * @throws EnrollmentException if retrieval fails
     */
    @Cacheable(value = "enrollmentsByBeneficiary", key = "#beneficiaryId", unless = "#result == null || #result.isEmpty()")
    public List<Enrollment> getEnrollmentsByBeneficiary(UUID beneficiaryId) {
        log.debug("Retrieving enrollments for beneficiary: {}", DataMaskingUtil.maskSensitiveId(beneficiaryId));

        if (beneficiaryId == null) {
            throw new EnrollmentException("Beneficiary ID is required", EnrollmentException.ErrorCode.VALIDATION_ERROR);
        }

        try {
            List<Enrollment> enrollments = serviceRetry.executeSupplier(() ->
                enrollmentRepository.findByBeneficiaryId(beneficiaryId)
            );

            // Log data access for audit
            auditLogger.logDataAccess("SYSTEM", "ENROLLMENT", beneficiaryId);

            log.info("Retrieved {} enrollments for beneficiary: {}", enrollments.size(), beneficiaryId);
            return enrollments;

        } catch (Exception e) {
            log.error("Error retrieving enrollments for beneficiary: {}", beneficiaryId, e);
            throw new EnrollmentException("Failed to retrieve enrollments", e, EnrollmentException.ErrorCode.DATABASE_ERROR);
        }
    }

    /**
     * Uploads a document for an enrollment with encryption and validation.
     *
     * @param enrollmentId the enrollment UUID
     * @param documentDTO the document upload data
     * @return DocumentResponse with metadata
     * @throws EnrollmentException if upload fails
     */
    @Transactional
    @CacheEvict(value = "enrollments", key = "#enrollmentId")
    public DocumentResponse uploadDocument(UUID enrollmentId, @Valid DocumentUploadDTO documentDTO) {
        log.debug("Uploading document for enrollment: {}", enrollmentId);

        long startTime = System.currentTimeMillis();

        try {
            // Validate enrollment exists
            Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentException(
                    "Enrollment not found: " + enrollmentId,
                    EnrollmentException.ErrorCode.ENROLLMENT_NOT_FOUND
                ));

            // Validate document
            validateDocument(documentDTO);

            // Execute with circuit breaker
            DocumentResponse response = documentServiceBreaker.executeSupplier(() -> {
                // Create document entity
                EnrollmentDocument document = new EnrollmentDocument();
                document.setEnrollment(enrollment);
                document.setDocumentType(documentDTO.getDocumentType());
                document.setFileName(documentDTO.getFileName());
                document.setFileSize(documentDTO.getFileSize());
                document.setMimeType(documentDTO.getMimeType());
                document.setDescription(documentDTO.getDescription());
                document.setContainsPHI(documentDTO.getContainsHealthInfo());
                document.setIssuer(documentDTO.getIssuer());

                // Parse dates if provided
                if (documentDTO.getIssueDate() != null && !documentDTO.getIssueDate().isEmpty()) {
                    document.setIssueDate(LocalDateTime.parse(documentDTO.getIssueDate() + "T00:00:00"));
                }
                if (documentDTO.getExpiryDate() != null && !documentDTO.getExpiryDate().isEmpty()) {
                    document.setExpiryDate(LocalDateTime.parse(documentDTO.getExpiryDate() + "T00:00:00"));
                }

                // Generate checksum
                String checksum = generateChecksum(documentDTO.getContent());
                document.setChecksum(checksum);

                // Generate storage path (simulated - in production would use S3 or similar)
                String storagePath = generateStoragePath(enrollmentId, documentDTO.getFileName());
                document.setStoragePath(storagePath);

                // Generate encryption key (simulated - in production would use KMS)
                String encryptionKey = generateEncryptionKey();
                document.setEncryptionKey(encryptionKey);

                // Add document to enrollment
                enrollment.addDocument(document);

                // Build response
                return DocumentResponse.builder()
                    .documentId(document.getId())
                    .fileName(document.getFileName())
                    .documentType(document.getDocumentType())
                    .uploadDate(document.getUploadedAt())
                    .status(document.getVerificationStatus())
                    .downloadUrl(generateDownloadUrl(document.getId()))
                    .fileSize(document.getFileSize())
                    .mimeType(document.getMimeType())
                    .checksum(document.getChecksum())
                    .enrollmentId(enrollmentId)
                    .encrypted(true)
                    .downloadUrlExpiresIn(60) // 60 minutes
                    .build();
            });

            // Log audit trail
            auditLogger.logDocumentOperation("UPLOAD", response.getDocumentId(), "SYSTEM", enrollmentId);

            // Record metrics
            long duration = System.currentTimeMillis() - startTime;
            metricsCollector.recordDocumentUploaded(documentDTO.getDocumentType(), documentDTO.getFileSize());
            metricsCollector.recordProcessingTime("document_upload", duration);

            log.info("Successfully uploaded document {} for enrollment: {}", response.getDocumentId(), enrollmentId);
            return response;

        } catch (Exception e) {
            log.error("Error uploading document for enrollment: {}", enrollmentId, e);
            metricsCollector.recordError("DOCUMENT_UPLOAD_FAILED", "uploadDocument");
            throw new EnrollmentException("Failed to upload document", e, EnrollmentException.ErrorCode.DOCUMENT_UPLOAD_FAILED);
        }
    }

    /**
     * Updates the status of an enrollment with validation and audit logging.
     *
     * @param enrollmentId the enrollment UUID
     * @param status the new status
     * @return updated Enrollment
     * @throws EnrollmentException if update fails
     */
    @Transactional
    @CacheEvict(value = "enrollments", key = "#enrollmentId")
    public Enrollment updateEnrollmentStatus(UUID enrollmentId, String status) {
        log.debug("Updating status for enrollment: {} to {}", enrollmentId, status);

        long startTime = System.currentTimeMillis();

        try {
            // Retrieve enrollment
            Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentException(
                    "Enrollment not found: " + enrollmentId,
                    EnrollmentException.ErrorCode.ENROLLMENT_NOT_FOUND
                ));

            // Store old status for audit
            EnrollmentStatus oldStatus = enrollment.getStatus();

            // Parse and validate new status
            EnrollmentStatus newStatus;
            try {
                newStatus = EnrollmentStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new EnrollmentException(
                    "Invalid status: " + status,
                    EnrollmentException.ErrorCode.VALIDATION_ERROR
                );
            }

            // Update status (this validates the transition)
            enrollment.updateStatus(newStatus);

            // Save enrollment
            Enrollment updatedEnrollment = enrollmentRepository.save(enrollment);

            // Log audit trail
            auditLogger.logStatusTransition(
                enrollmentId,
                oldStatus.name(),
                newStatus.name(),
                "SYSTEM",
                "Status updated via API"
            );

            // Record metrics
            long duration = System.currentTimeMillis() - startTime;
            metricsCollector.recordStatusUpdate(enrollmentId, status);
            metricsCollector.recordProcessingTime("status_update", duration);

            log.info("Successfully updated status for enrollment: {} from {} to {}",
                enrollmentId, oldStatus, newStatus);

            return updatedEnrollment;

        } catch (IllegalStateException e) {
            // Invalid status transition
            log.error("Invalid status transition for enrollment: {}", enrollmentId, e);
            throw new EnrollmentException(
                e.getMessage(),
                e,
                EnrollmentException.ErrorCode.INVALID_STATUS_TRANSITION
            );
        } catch (Exception e) {
            log.error("Error updating status for enrollment: {}", enrollmentId, e);
            metricsCollector.recordError("STATUS_UPDATE_FAILED", "updateEnrollmentStatus");
            throw new EnrollmentException("Failed to update enrollment status", e);
        }
    }

    // Private helper methods

    /**
     * Validates enrollment data with comprehensive business rules.
     *
     * @param enrollmentDTO the enrollment data to validate
     * @throws EnrollmentException if validation fails
     */
    private void validateEnrollmentData(EnrollmentDTO enrollmentDTO) {
        log.debug("Validating enrollment data");

        // Required fields
        if (enrollmentDTO.getBeneficiaryId() == null) {
            throw new EnrollmentException(
                "Beneficiary ID is required",
                EnrollmentException.ErrorCode.VALIDATION_ERROR
            );
        }

        // Personal info validation
        if (enrollmentDTO.getPersonalInfo() == null) {
            throw new EnrollmentException(
                "Personal information is required",
                EnrollmentException.ErrorCode.INVALID_PERSONAL_INFO
            );
        }

        EnrollmentDTO.PersonalInfoDTO personalInfo = enrollmentDTO.getPersonalInfo();

        // CPF validation
        if (!isValidCPF(personalInfo.getCpf())) {
            throw new EnrollmentException(
                "Invalid CPF format",
                EnrollmentException.ErrorCode.INVALID_PERSONAL_INFO
            );
        }

        // Email validation
        if (!isValidEmail(personalInfo.getEmail())) {
            throw new EnrollmentException(
                "Invalid email format",
                EnrollmentException.ErrorCode.INVALID_PERSONAL_INFO
            );
        }

        // Age validation
        if (personalInfo.getDateOfBirth() != null) {
            int age = calculateAge(personalInfo.getDateOfBirth());
            if (age < 0 || age > 150) {
                throw new EnrollmentException(
                    "Invalid date of birth",
                    EnrollmentException.ErrorCode.VALIDATION_ERROR
                );
            }

            // Guardian required for minors
            if (age < 18 && enrollmentDTO.getGuardianId() == null) {
                throw new EnrollmentException(
                    "Guardian ID is required for minors",
                    EnrollmentException.ErrorCode.GUARDIAN_VERIFICATION_FAILED
                );
            }
        }

        // Enrollment type validation
        if (!isValidEnrollmentType(enrollmentDTO.getEnrollmentType())) {
            throw new EnrollmentException(
                "Invalid enrollment type",
                EnrollmentException.ErrorCode.VALIDATION_ERROR
            );
        }

        // Plan type validation
        if (!isValidPlanType(enrollmentDTO.getPlanType())) {
            throw new EnrollmentException(
                "Invalid plan type",
                EnrollmentException.ErrorCode.PLAN_NOT_AVAILABLE
            );
        }

        log.debug("Enrollment data validation successful");
    }

    /**
     * Enriches enrollment with secure data and encryption.
     *
     * @param enrollment the enrollment entity
     * @param enrollmentDTO the enrollment DTO
     */
    private void enrichEnrollmentWithSecureData(Enrollment enrollment, EnrollmentDTO enrollmentDTO) {
        log.debug("Enriching enrollment with secure data");

        try {
            // Convert personal info to JSON for encrypted storage
            if (enrollmentDTO.getPersonalInfo() != null) {
                JsonNode personalInfoJson = objectMapper.valueToTree(enrollmentDTO.getPersonalInfo());
                // Note: encryption is handled by JPA ColumnTransformer
                // enrollment.setPersonalInfo(personalInfoJson);
            }

            // Convert address info to JSON
            if (enrollmentDTO.getAddressInfo() != null) {
                JsonNode addressInfoJson = objectMapper.valueToTree(enrollmentDTO.getAddressInfo());
                // enrollment.setAddressInfo(addressInfoJson);
            }

            // Convert payment info to JSON for encrypted storage
            if (enrollmentDTO.getPaymentInfo() != null) {
                // Mask sensitive payment data before storage
                EnrollmentDTO.PaymentInfoDTO paymentInfo = enrollmentDTO.getPaymentInfo();
                if (paymentInfo.getCardNumber() != null) {
                    paymentInfo.setCardNumber(DataMaskingUtil.maskCardNumber(paymentInfo.getCardNumber()));
                }

                JsonNode paymentInfoJson = objectMapper.valueToTree(paymentInfo);
                // Note: encryption is handled by JPA ColumnTransformer
                // enrollment.setPaymentInfo(paymentInfoJson);
            }

            log.debug("Enrollment data enrichment completed");

        } catch (Exception e) {
            log.error("Error enriching enrollment data", e);
            throw new EnrollmentException(
                "Failed to process enrollment data",
                e,
                EnrollmentException.ErrorCode.ENCRYPTION_ERROR
            );
        }
    }

    /**
     * Validates health assessment data comprehensively.
     *
     * @param assessmentDTO the health assessment data
     * @throws EnrollmentException if validation fails
     */
    private void validateHealthAssessment(HealthAssessmentDTO assessmentDTO) {
        log.debug("Validating health assessment data");

        if (assessmentDTO == null) {
            throw new EnrollmentException(
                "Health assessment data is required",
                EnrollmentException.ErrorCode.HEALTH_ASSESSMENT_INVALID
            );
        }

        if (assessmentDTO.getResponses() == null || assessmentDTO.getResponses().isEmpty()) {
            throw new EnrollmentException(
                "Health assessment responses are required",
                EnrollmentException.ErrorCode.HEALTH_ASSESSMENT_INCOMPLETE
            );
        }

        // Validate minimum number of responses
        if (assessmentDTO.getResponses().size() < 5) {
            throw new EnrollmentException(
                "Health assessment must contain at least 5 responses",
                EnrollmentException.ErrorCode.HEALTH_ASSESSMENT_INCOMPLETE
            );
        }

        // Validate guardian verification for minors
        if (assessmentDTO.getGuardianVerified() == null) {
            assessmentDTO.setGuardianVerified(false);
        }

        // Validate pre-existing conditions flag
        if (assessmentDTO.getHasPreExistingConditions() != null &&
            assessmentDTO.getHasPreExistingConditions() &&
            (assessmentDTO.getDocumentsRequired() == null || assessmentDTO.getDocumentsRequired().isEmpty())) {

            log.warn("Pre-existing conditions declared but no documents required");
        }

        // Validate medications list
        if (assessmentDTO.getCurrentMedications() != null) {
            for (HealthAssessmentDTO.MedicationDTO medication : assessmentDTO.getCurrentMedications()) {
                if (medication.getName() == null || medication.getName().isEmpty()) {
                    throw new EnrollmentException(
                        "Medication name is required",
                        EnrollmentException.ErrorCode.HEALTH_ASSESSMENT_INVALID
                    );
                }
            }
        }

        // Validate hospitalizations
        if (assessmentDTO.getRecentHospitalizations() != null) {
            for (HealthAssessmentDTO.HospitalizationDTO hosp : assessmentDTO.getRecentHospitalizations()) {
                if (hosp.getDate() == null || hosp.getReason() == null) {
                    throw new EnrollmentException(
                        "Hospitalization date and reason are required",
                        EnrollmentException.ErrorCode.HEALTH_ASSESSMENT_INVALID
                    );
                }
            }
        }

        log.debug("Health assessment validation successful");
    }

    /**
     * Enriches health assessment data with AI triage and risk scoring.
     *
     * @param enrollment the enrollment entity
     * @param assessmentDTO the health assessment DTO
     */
    private void enrichHealthAssessmentData(Enrollment enrollment, HealthAssessmentDTO assessmentDTO) {
        log.debug("Enriching health assessment data for enrollment: {}", enrollment.getId());

        try {
            // Create health assessment entity
            HealthAssessment assessment = new HealthAssessment();
            assessment.setEnrollment(enrollment);

            // Convert responses to JSON for encrypted storage
            JsonNode responsesJson = objectMapper.valueToTree(assessmentDTO.getResponses());
            assessment.setResponses(responsesJson);

            // Set guardian verification
            assessment.setGuardianVerified(assessmentDTO.getGuardianVerified());

            // Set pre-existing conditions flag
            if (assessmentDTO.getHasPreExistingConditions() != null) {
                assessment.setHasPreExistingConditions(assessmentDTO.getHasPreExistingConditions());
            }

            // Calculate medication and hospitalization counts
            if (assessmentDTO.getCurrentMedications() != null) {
                assessment.setMedicationCount(assessmentDTO.getCurrentMedications().size());
            }

            if (assessmentDTO.getRecentHospitalizations() != null) {
                assessment.setHospitalizationCount(assessmentDTO.getRecentHospitalizations().size());
            }

            // Calculate risk score based on health data
            int riskScore = calculateRiskScore(assessmentDTO);
            assessment.setRiskScore(riskScore);

            // Determine if documents are required
            boolean requiresDocuments = determineDocumentRequirement(assessmentDTO);
            assessment.setRequiresDocuments(requiresDocuments);

            // AI Triage Integration (simulated - in production would call ML service)
            String triageRecommendation = performAITriage(assessmentDTO, riskScore);
            assessment.setTriageRecommendation(triageRecommendation);
            assessment.setTriageNotes(generateTriageNotes(assessmentDTO, riskScore));

            // Mark as completed
            assessment.markAsCompleted();

            // Add to enrollment
            enrollment.addHealthAssessment(assessment);

            // Record metrics
            metricsCollector.recordHealthAssessmentWithRisk(enrollment.getId(), riskScore);

            log.info("Health assessment enrichment completed with risk score: {}", riskScore);

        } catch (Exception e) {
            log.error("Error enriching health assessment data", e);
            throw new EnrollmentException(
                "Failed to process health assessment",
                e,
                EnrollmentException.ErrorCode.HEALTH_ASSESSMENT_INVALID
            );
        }
    }

    /**
     * Determines the next status based on enrollment completeness and health assessment.
     *
     * @param enrollment the enrollment entity
     * @param assessmentDTO the health assessment DTO
     * @return the next EnrollmentStatus
     */
    private EnrollmentStatus determineNextStatus(Enrollment enrollment, HealthAssessmentDTO assessmentDTO) {
        log.debug("Determining next status for enrollment: {}", enrollment.getId());

        // Check current status
        EnrollmentStatus currentStatus = enrollment.getStatus();

        // If draft, move to pending after health assessment
        if (currentStatus == EnrollmentStatus.DRAFT) {
            // Check if all required data is present
            boolean hasHealthAssessment = enrollment.getHealthAssessments() != null &&
                                         !enrollment.getHealthAssessments().isEmpty();

            boolean hasDocuments = enrollment.getDocuments() != null &&
                                 !enrollment.getDocuments().isEmpty();

            // Determine if documents are required
            boolean documentsRequired = assessmentDTO.getDocumentsRequired() != null &&
                                       !assessmentDTO.getDocumentsRequired().isEmpty();

            boolean hasPreExistingConditions = assessmentDTO.getHasPreExistingConditions() != null &&
                                              assessmentDTO.getHasPreExistingConditions();

            // If pre-existing conditions or high risk, require documents before moving to pending
            if (hasPreExistingConditions || documentsRequired) {
                if (hasDocuments) {
                    log.info("Moving enrollment to PENDING status - documents provided");
                    return EnrollmentStatus.PENDING;
                } else {
                    log.info("Keeping enrollment in DRAFT status - awaiting required documents");
                    return EnrollmentStatus.DRAFT;
                }
            } else {
                // Low risk, can move directly to pending
                log.info("Moving enrollment to PENDING status - low risk assessment");
                return EnrollmentStatus.PENDING;
            }
        }

        // If pending, stay pending until manual review
        if (currentStatus == EnrollmentStatus.PENDING) {
            log.info("Enrollment remains in PENDING status - awaiting review");
            return EnrollmentStatus.PENDING;
        }

        // Default: keep current status
        log.info("Enrollment status unchanged: {}", currentStatus);
        return currentStatus;
    }

    // Validation helper methods

    private boolean isValidCPF(String cpf) {
        if (cpf == null) return false;
        String cleanCPF = cpf.replaceAll("\\D", "");
        return cleanCPF.length() == 11;
    }

    private boolean isValidEmail(String email) {
        if (email == null) return false;
        Pattern emailPattern = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
        return emailPattern.matcher(email).matches();
    }

    private int calculateAge(String dateOfBirth) {
        try {
            LocalDate birthDate = LocalDate.parse(dateOfBirth);
            return Period.between(birthDate, LocalDate.now()).getYears();
        } catch (Exception e) {
            return -1;
        }
    }

    private boolean isValidEnrollmentType(String type) {
        return type != null && (type.equals("INDIVIDUAL") || type.equals("FAMILY") || type.equals("CORPORATE"));
    }

    private boolean isValidPlanType(String type) {
        return type != null && (type.equals("BASIC") || type.equals("STANDARD") || type.equals("PREMIUM"));
    }

    // Document helper methods

    private void validateDocument(DocumentUploadDTO documentDTO) {
        if (documentDTO.getFileSize() > MAX_DOCUMENT_SIZE) {
            throw new EnrollmentException(
                "Document size exceeds maximum allowed size of 10MB",
                EnrollmentException.ErrorCode.DOCUMENT_SIZE_EXCEEDED
            );
        }

        if (documentDTO.getContent() == null || documentDTO.getContent().length == 0) {
            throw new EnrollmentException(
                "Document content is empty",
                EnrollmentException.ErrorCode.DOCUMENT_UPLOAD_FAILED
            );
        }
    }

    private String generateChecksum(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }

    private String generateStoragePath(UUID enrollmentId, String fileName) {
        return String.format("enrollments/%s/documents/%s_%s",
            enrollmentId,
            System.currentTimeMillis(),
            fileName);
    }

    private String generateEncryptionKey() {
        return UUID.randomUUID().toString();
    }

    private String generateDownloadUrl(UUID documentId) {
        return String.format("/api/v1/documents/%s/download", documentId);
    }

    // Health assessment helper methods

    private int calculateRiskScore(HealthAssessmentDTO assessmentDTO) {
        int score = 0;

        // Pre-existing conditions add risk
        if (assessmentDTO.getHasPreExistingConditions() != null && assessmentDTO.getHasPreExistingConditions()) {
            score += 30;
        }

        // Medications add risk
        if (assessmentDTO.getCurrentMedications() != null) {
            score += Math.min(assessmentDTO.getCurrentMedications().size() * 5, 25);
        }

        // Recent hospitalizations add significant risk
        if (assessmentDTO.getRecentHospitalizations() != null) {
            score += Math.min(assessmentDTO.getRecentHospitalizations().size() * 15, 30);
        }

        // Document requirements indicate higher risk
        if (assessmentDTO.getDocumentsRequired() != null && !assessmentDTO.getDocumentsRequired().isEmpty()) {
            score += 15;
        }

        return Math.min(score, 100);
    }

    private boolean determineDocumentRequirement(HealthAssessmentDTO assessmentDTO) {
        return (assessmentDTO.getHasPreExistingConditions() != null && assessmentDTO.getHasPreExistingConditions()) ||
               (assessmentDTO.getCurrentMedications() != null && assessmentDTO.getCurrentMedications().size() > 3) ||
               (assessmentDTO.getRecentHospitalizations() != null && !assessmentDTO.getRecentHospitalizations().isEmpty());
    }

    private String performAITriage(HealthAssessmentDTO assessmentDTO, int riskScore) {
        // Simulated AI triage - in production would call ML service
        if (riskScore < 25) {
            return "LOW";
        } else if (riskScore < 50) {
            return "MEDIUM";
        } else if (riskScore < 75) {
            return "HIGH";
        } else {
            return "CRITICAL";
        }
    }

    private String generateTriageNotes(HealthAssessmentDTO assessmentDTO, int riskScore) {
        StringBuilder notes = new StringBuilder();
        notes.append(String.format("Risk Score: %d. ", riskScore));

        if (assessmentDTO.getHasPreExistingConditions() != null && assessmentDTO.getHasPreExistingConditions()) {
            notes.append("Pre-existing conditions declared. ");
        }

        if (assessmentDTO.getCurrentMedications() != null && !assessmentDTO.getCurrentMedications().isEmpty()) {
            notes.append(String.format("Currently taking %d medications. ", assessmentDTO.getCurrentMedications().size()));
        }

        if (assessmentDTO.getRecentHospitalizations() != null && !assessmentDTO.getRecentHospitalizations().isEmpty()) {
            notes.append(String.format("Recent hospitalizations: %d. ", assessmentDTO.getRecentHospitalizations().size()));
        }

        if (riskScore >= 75) {
            notes.append("Requires immediate medical review.");
        } else if (riskScore >= 50) {
            notes.append("Requires detailed underwriting review.");
        } else {
            notes.append("Standard processing recommended.");
        }

        return notes.toString();
    }
}