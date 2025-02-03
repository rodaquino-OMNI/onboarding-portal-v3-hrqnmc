package com.austa.enrollment.models;

import javax.persistence.*;  // version: 2.2
import com.fasterxml.jackson.annotation.*;  // version: 2.15.0
import org.hibernate.annotations.*;  // version: 5.6.0
import javax.validation.constraints.*;  // version: 2.0.1

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Entity class representing an enrollment application in the Pre-paid Health Plan Onboarding Portal.
 * Implements secure data handling and LGPD compliance for sensitive information.
 */
@Entity
@Table(name = "enrollments", indexes = {
    @Index(name = "idx_beneficiary", columnList = "beneficiary_id"),
    @Index(name = "idx_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @Column(name = "beneficiary_id", nullable = false)
    private UUID beneficiaryId;

    @Column(name = "broker_id")
    private UUID brokerId;

    @Column(name = "guardian_id")
    private UUID guardianId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private EnrollmentStatus status;

    @Type(type = "jsonb")
    @Column(name = "personal_info", columnDefinition = "jsonb")
    @ColumnTransformer(
        write = "pgp_sym_encrypt(?, current_setting('app.encryption_key'))",
        read = "pgp_sym_decrypt(personal_info::bytea, current_setting('app.encryption_key'))"
    )
    @JsonIgnore
    private JsonNode personalInfo;

    @Type(type = "jsonb")
    @Column(name = "address_info", columnDefinition = "jsonb")
    private JsonNode addressInfo;

    @Type(type = "jsonb")
    @Column(name = "payment_info", columnDefinition = "jsonb")
    @ColumnTransformer(
        write = "pgp_sym_encrypt(?, current_setting('app.encryption_key'))",
        read = "pgp_sym_decrypt(payment_info::bytea, current_setting('app.encryption_key'))"
    )
    @JsonIgnore
    private JsonNode paymentInfo;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @OneToMany(mappedBy = "enrollment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Valid
    private Set<HealthAssessment> healthAssessments = new HashSet<>();

    @OneToMany(mappedBy = "enrollment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Valid
    private Set<EnrollmentDocument> documents = new HashSet<>();

    /**
     * Default constructor initializing collections and audit fields
     */
    public Enrollment() {
        this.healthAssessments = new HashSet<>();
        this.documents = new HashSet<>();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.status = EnrollmentStatus.DRAFT;
        this.version = 0L;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Get the enrollment's unique identifier
     * @return UUID of the enrollment
     */
    public UUID getId() {
        return id;
    }

    /**
     * Update enrollment status with validation
     * @param newStatus the new status to set
     * @throws IllegalStateException if status transition is invalid
     */
    public void updateStatus(EnrollmentStatus newStatus) {
        if (newStatus == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        
        // Validate status transition
        if (!isValidStatusTransition(this.status, newStatus)) {
            throw new IllegalStateException(
                String.format("Invalid status transition from %s to %s", this.status, newStatus)
            );
        }

        this.status = newStatus;
        if (newStatus == EnrollmentStatus.PENDING) {
            this.submittedAt = LocalDateTime.now();
        }
    }

    // Getters and Setters with appropriate access controls

    public UUID getBeneficiaryId() {
        return beneficiaryId;
    }

    public void setBeneficiaryId(UUID beneficiaryId) {
        this.beneficiaryId = beneficiaryId;
    }

    public UUID getBrokerId() {
        return brokerId;
    }

    public void setBrokerId(UUID brokerId) {
        this.brokerId = brokerId;
    }

    public UUID getGuardianId() {
        return guardianId;
    }

    public void setGuardianId(UUID guardianId) {
        this.guardianId = guardianId;
    }

    public EnrollmentStatus getStatus() {
        return status;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public Set<HealthAssessment> getHealthAssessments() {
        return healthAssessments;
    }

    public Set<EnrollmentDocument> getDocuments() {
        return documents;
    }

    /**
     * Add a health assessment to the enrollment
     * @param assessment the health assessment to add
     */
    public void addHealthAssessment(HealthAssessment assessment) {
        healthAssessments.add(assessment);
        assessment.setEnrollment(this);
    }

    /**
     * Add a document to the enrollment
     * @param document the document to add
     */
    public void addDocument(EnrollmentDocument document) {
        documents.add(document);
        document.setEnrollment(this);
    }

    private boolean isValidStatusTransition(EnrollmentStatus currentStatus, EnrollmentStatus newStatus) {
        switch (currentStatus) {
            case DRAFT:
                return newStatus == EnrollmentStatus.PENDING || newStatus == EnrollmentStatus.CANCELLED;
            case PENDING:
                return newStatus == EnrollmentStatus.IN_REVIEW || newStatus == EnrollmentStatus.CANCELLED;
            case IN_REVIEW:
                return newStatus == EnrollmentStatus.APPROVED || newStatus == EnrollmentStatus.REJECTED;
            case APPROVED:
            case REJECTED:
            case CANCELLED:
                return false;
            default:
                return false;
        }
    }
}

/**
 * Enum representing possible enrollment statuses
 */
enum EnrollmentStatus {
    DRAFT,
    PENDING,
    IN_REVIEW,
    APPROVED,
    REJECTED,
    CANCELLED
}