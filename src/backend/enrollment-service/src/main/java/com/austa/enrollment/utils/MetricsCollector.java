package com.austa.enrollment.utils;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Utility class for collecting performance and business metrics.
 * Uses Micrometer for metrics collection and monitoring.
 *
 * @version 1.0
 */
@Component
public class MetricsCollector {

    private static final Logger logger = LoggerFactory.getLogger(MetricsCollector.class);

    private final MeterRegistry meterRegistry;

    // Metric name constants
    private static final String ENROLLMENT_CREATED = "enrollment.created";
    private static final String ENROLLMENT_SUBMITTED = "enrollment.submitted";
    private static final String ENROLLMENT_APPROVED = "enrollment.approved";
    private static final String ENROLLMENT_REJECTED = "enrollment.rejected";
    private static final String DOCUMENT_UPLOADED = "document.uploaded";
    private static final String DOCUMENT_VERIFIED = "document.verified";
    private static final String HEALTH_ASSESSMENT_SUBMITTED = "health.assessment.submitted";
    private static final String STATUS_UPDATED = "enrollment.status.updated";
    private static final String PROCESSING_TIME = "enrollment.processing.time";
    private static final String DOCUMENT_SIZE = "document.size.bytes";
    private static final String ERROR_COUNT = "enrollment.errors";

    public MetricsCollector(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        logger.info("MetricsCollector initialized with MeterRegistry");
    }

    /**
     * Records enrollment creation metric.
     *
     * @param enrollmentType the type of enrollment (INDIVIDUAL, FAMILY, CORPORATE)
     * @param durationMs the duration in milliseconds
     */
    public void recordEnrollmentCreated(String enrollmentType, long durationMs) {
        Counter.builder(ENROLLMENT_CREATED)
            .tag("enrollment_type", enrollmentType != null ? enrollmentType : "UNKNOWN")
            .description("Total number of enrollments created")
            .register(meterRegistry)
            .increment();

        Timer.builder(PROCESSING_TIME)
            .tag("operation", "create")
            .tag("enrollment_type", enrollmentType != null ? enrollmentType : "UNKNOWN")
            .description("Time taken to create enrollment")
            .register(meterRegistry)
            .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("Recorded enrollment creation: type={}, duration={}ms", enrollmentType, durationMs);
    }

    /**
     * Records enrollment creation metric with enrollment ID.
     *
     * @param enrollmentId the enrollment ID
     */
    public void recordEnrollmentCreation(UUID enrollmentId) {
        Counter.builder(ENROLLMENT_CREATED)
            .tag("enrollment_type", "GENERAL")
            .description("Total number of enrollments created")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded enrollment creation: id={}", enrollmentId);
    }

    /**
     * Records enrollment submission metric.
     *
     * @param enrollmentId the enrollment ID
     * @param enrollmentType the enrollment type
     */
    public void recordEnrollmentSubmitted(UUID enrollmentId, String enrollmentType) {
        Counter.builder(ENROLLMENT_SUBMITTED)
            .tag("enrollment_type", enrollmentType != null ? enrollmentType : "UNKNOWN")
            .description("Total number of enrollments submitted")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded enrollment submission: id={}, type={}", enrollmentId, enrollmentType);
    }

    /**
     * Records enrollment approval metric.
     *
     * @param enrollmentId the enrollment ID
     * @param processingTimeMs processing time in milliseconds
     */
    public void recordEnrollmentApproved(UUID enrollmentId, long processingTimeMs) {
        Counter.builder(ENROLLMENT_APPROVED)
            .description("Total number of enrollments approved")
            .register(meterRegistry)
            .increment();

        Timer.builder(PROCESSING_TIME)
            .tag("operation", "approve")
            .description("Time taken to approve enrollment")
            .register(meterRegistry)
            .record(processingTimeMs, TimeUnit.MILLISECONDS);

        logger.debug("Recorded enrollment approval: id={}, processingTime={}ms", enrollmentId, processingTimeMs);
    }

    /**
     * Records enrollment rejection metric.
     *
     * @param enrollmentId the enrollment ID
     * @param rejectionReason the reason for rejection
     */
    public void recordEnrollmentRejected(UUID enrollmentId, String rejectionReason) {
        Counter.builder(ENROLLMENT_REJECTED)
            .tag("reason", rejectionReason != null ? rejectionReason : "UNKNOWN")
            .description("Total number of enrollments rejected")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded enrollment rejection: id={}, reason={}", enrollmentId, rejectionReason);
    }

    /**
     * Records document upload metric.
     *
     * @param docType the document type
     * @param fileSizeBytes the file size in bytes
     */
    public void recordDocumentUploaded(String docType, long fileSizeBytes) {
        Counter.builder(DOCUMENT_UPLOADED)
            .tag("document_type", docType != null ? docType : "UNKNOWN")
            .description("Total number of documents uploaded")
            .register(meterRegistry)
            .increment();

        meterRegistry.summary(DOCUMENT_SIZE,
            Arrays.asList(Tag.of("document_type", docType != null ? docType : "UNKNOWN")))
            .record(fileSizeBytes);

        logger.debug("Recorded document upload: type={}, size={} bytes", docType, fileSizeBytes);
    }

    /**
     * Records document upload metric with enrollment ID.
     *
     * @param enrollmentId the enrollment ID
     */
    public void recordDocumentUpload(UUID enrollmentId) {
        Counter.builder(DOCUMENT_UPLOADED)
            .tag("document_type", "GENERAL")
            .description("Total number of documents uploaded")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded document upload for enrollment: {}", enrollmentId);
    }

    /**
     * Records document verification metric.
     *
     * @param documentId the document ID
     * @param verified whether the document was verified or rejected
     */
    public void recordDocumentVerified(UUID documentId, boolean verified) {
        Counter.builder(DOCUMENT_VERIFIED)
            .tag("verification_status", verified ? "VERIFIED" : "REJECTED")
            .description("Total number of documents verified")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded document verification: id={}, verified={}", documentId, verified);
    }

    /**
     * Records health assessment submission metric.
     *
     * @param enrollmentId the enrollment ID
     */
    public void recordHealthAssessmentSubmission(UUID enrollmentId) {
        Counter.builder(HEALTH_ASSESSMENT_SUBMITTED)
            .description("Total number of health assessments submitted")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded health assessment submission for enrollment: {}", enrollmentId);
    }

    /**
     * Records health assessment submission with risk score.
     *
     * @param enrollmentId the enrollment ID
     * @param riskScore the calculated risk score
     */
    public void recordHealthAssessmentWithRisk(UUID enrollmentId, int riskScore) {
        Counter.builder(HEALTH_ASSESSMENT_SUBMITTED)
            .tag("risk_level", categorizeRiskScore(riskScore))
            .description("Total number of health assessments submitted")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded health assessment with risk: enrollmentId={}, riskScore={}", enrollmentId, riskScore);
    }

    /**
     * Records enrollment status update metric.
     *
     * @param enrollmentId the enrollment ID
     * @param status the new status
     */
    public void recordStatusUpdate(UUID enrollmentId, String status) {
        Counter.builder(STATUS_UPDATED)
            .tag("new_status", status != null ? status : "UNKNOWN")
            .description("Total number of status updates")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded status update: enrollmentId={}, status={}", enrollmentId, status);
    }

    /**
     * Records an error occurrence.
     *
     * @param errorType the type of error
     * @param operation the operation where error occurred
     */
    public void recordError(String errorType, String operation) {
        Counter.builder(ERROR_COUNT)
            .tag("error_type", errorType != null ? errorType : "UNKNOWN")
            .tag("operation", operation != null ? operation : "UNKNOWN")
            .description("Total number of errors")
            .register(meterRegistry)
            .increment();

        logger.debug("Recorded error: type={}, operation={}", errorType, operation);
    }

    /**
     * Records processing time for an operation.
     *
     * @param operation the operation name
     * @param durationMs the duration in milliseconds
     */
    public void recordProcessingTime(String operation, long durationMs) {
        Timer.builder(PROCESSING_TIME)
            .tag("operation", operation != null ? operation : "UNKNOWN")
            .description("Processing time for operations")
            .register(meterRegistry)
            .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("Recorded processing time: operation={}, duration={}ms", operation, durationMs);
    }

    /**
     * Records API response time.
     *
     * @param endpoint the API endpoint
     * @param statusCode the HTTP status code
     * @param durationMs the duration in milliseconds
     */
    public void recordApiResponseTime(String endpoint, int statusCode, long durationMs) {
        Timer.builder("api.response.time")
            .tag("endpoint", endpoint != null ? endpoint : "UNKNOWN")
            .tag("status_code", String.valueOf(statusCode))
            .description("API response time")
            .register(meterRegistry)
            .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("Recorded API response time: endpoint={}, status={}, duration={}ms",
            endpoint, statusCode, durationMs);
    }

    /**
     * Categorizes risk score into levels.
     *
     * @param riskScore the risk score (0-100)
     * @return risk level category
     */
    private String categorizeRiskScore(int riskScore) {
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
}
