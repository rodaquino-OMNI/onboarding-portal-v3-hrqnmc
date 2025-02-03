package com.austa.policy.models;

import com.austa.common.audit.AuditLog;
import com.austa.common.security.EncryptedColumn;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hibernate.annotations.Type;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity class representing a health insurance policy in the Pre-paid Health Plan Onboarding Portal.
 * Implements comprehensive policy management with enhanced security and audit capabilities.
 * 
 * @version 1.0.0
 */
@Entity
@Table(name = "policies", indexes = {
    @Index(name = "idx_enrollment_id", columnList = "enrollment_id"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_effective_date", columnList = "effective_date")
})
@AuditLog(entity = "Policy")
public class Policy {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "enrollment_id", nullable = false)
    private UUID enrollmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PolicyStatus status;

    @Type(type = "jsonb")
    @Column(name = "coverage", columnDefinition = "jsonb")
    @EncryptedColumn
    private JsonNode coverage;

    @Type(type = "jsonb")
    @Column(name = "waiting_periods", columnDefinition = "jsonb")
    private JsonNode waitingPeriods;

    @Column(name = "premium", precision = 10, scale = 2, nullable = false)
    private BigDecimal premium;

    @Column(name = "effective_date", nullable = false)
    private LocalDateTime effectiveDate;

    @Column(name = "expiration_date")
    private LocalDateTime expirationDate;

    @Type(type = "jsonb")
    @Column(name = "risk_assessment", columnDefinition = "jsonb")
    @EncryptedColumn
    private JsonNode riskAssessment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private String version;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Default constructor initializing JSON fields and timestamps
     */
    public Policy() {
        this.coverage = objectMapper.createObjectNode();
        this.waitingPeriods = objectMapper.createObjectNode();
        this.riskAssessment = objectMapper.createObjectNode();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.version = "1.0";
        this.status = PolicyStatus.DRAFT;
    }

    /**
     * Updates policy status with validation and audit logging
     *
     * @param newStatus The new status to be set
     * @throws IllegalStateException if the status transition is invalid
     */
    @AuditLog(operation = "STATUS_UPDATE")
    public void updateStatus(PolicyStatus newStatus) {
        if (!PolicyStatusValidator.isValidTransition(this.status, newStatus)) {
            throw new IllegalStateException(
                String.format("Invalid status transition from %s to %s", this.status, newStatus)
            );
        }
        this.status = newStatus;
        this.version = incrementVersion(this.version);
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Updates policy coverage with schema validation
     *
     * @param coverageDetails The new coverage details in JSON format
     * @throws IllegalArgumentException if the coverage schema is invalid
     */
    @AuditLog(operation = "COVERAGE_UPDATE")
    public void updateCoverage(JsonNode coverageDetails) {
        if (!CoverageSchemaValidator.isValid(coverageDetails)) {
            throw new IllegalArgumentException("Invalid coverage schema");
        }
        this.coverage = coverageDetails;
        this.version = incrementVersion(this.version);
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(UUID enrollmentId) { this.enrollmentId = enrollmentId; }

    public PolicyStatus getStatus() { return status; }

    public JsonNode getCoverage() { return coverage; }

    public JsonNode getWaitingPeriods() { return waitingPeriods; }
    public void setWaitingPeriods(JsonNode waitingPeriods) { this.waitingPeriods = waitingPeriods; }

    public BigDecimal getPremium() { return premium; }
    public void setPremium(BigDecimal premium) { this.premium = premium; }

    public LocalDateTime getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDateTime effectiveDate) { this.effectiveDate = effectiveDate; }

    public LocalDateTime getExpirationDate() { return expirationDate; }
    public void setExpirationDate(LocalDateTime expirationDate) { this.expirationDate = expirationDate; }

    public JsonNode getRiskAssessment() { return riskAssessment; }
    public void setRiskAssessment(JsonNode riskAssessment) { this.riskAssessment = riskAssessment; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public String getVersion() { return version; }

    private String incrementVersion(String currentVersion) {
        String[] parts = currentVersion.split("\\.");
        int minor = Integer.parseInt(parts[1]) + 1;
        return parts[0] + "." + minor;
    }
}

/**
 * Enum representing possible policy statuses with transition rules
 */
public enum PolicyStatus {
    DRAFT,
    PENDING_ACTIVATION,
    ACTIVE,
    SUSPENDED,
    CANCELLED,
    EXPIRED,
    PENDING_RENEWAL;
}