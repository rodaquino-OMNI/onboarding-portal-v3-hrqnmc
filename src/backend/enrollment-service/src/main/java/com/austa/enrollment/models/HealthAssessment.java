package com.austa.enrollment.models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.ColumnTransformer;

import javax.persistence.*;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA Entity representing a health assessment questionnaire.
 * Contains encrypted health-related responses and risk assessment data.
 *
 * @version 1.0
 */
@Entity
@Table(name = "health_assessments", indexes = {
    @Index(name = "idx_health_enrollment", columnList = "enrollment_id"),
    @Index(name = "idx_health_completed", columnList = "completed_at"),
    @Index(name = "idx_health_risk", columnList = "risk_score")
})
public class HealthAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * Reference to the parent enrollment
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    @JsonBackReference
    @NotNull
    private Enrollment enrollment;

    /**
     * JSONB column containing encrypted health assessment responses
     * Stored as key-value pairs: question_id -> response
     */
    @Type(type = "jsonb")
    @Column(name = "responses", columnDefinition = "jsonb", nullable = false)
    @ColumnTransformer(
        write = "pgp_sym_encrypt(?::text, current_setting('app.encryption_key'))",
        read = "pgp_sym_decrypt(responses::bytea, current_setting('app.encryption_key'))::jsonb"
    )
    @JsonIgnore
    @NotNull
    private JsonNode responses;

    /**
     * Calculated risk score based on health assessment responses (0-100)
     */
    @Column(name = "risk_score")
    @Min(0)
    @Max(100)
    private Integer riskScore;

    /**
     * Timestamp when the health assessment was completed
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Indicates whether a guardian has verified this assessment (for minors)
     */
    @Column(name = "guardian_verified", nullable = false)
    private Boolean guardianVerified;

    /**
     * Timestamp when the assessment was created
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp when the assessment was last updated
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Optimistic locking version field
     */
    @Version
    @Column(name = "version")
    private Long version;

    /**
     * Indicates if the assessment requires additional documents
     */
    @Column(name = "requires_documents")
    private Boolean requiresDocuments;

    /**
     * AI triage recommendation (LOW, MEDIUM, HIGH priority)
     */
    @Column(name = "triage_recommendation", length = 50)
    private String triageRecommendation;

    /**
     * Notes from AI triage analysis
     */
    @Column(name = "triage_notes", columnDefinition = "TEXT")
    private String triageNotes;

    /**
     * Indicates if pre-existing conditions were declared
     */
    @Column(name = "has_pre_existing_conditions")
    private Boolean hasPreExistingConditions;

    /**
     * Number of medications currently being taken
     */
    @Column(name = "medication_count")
    private Integer medicationCount;

    /**
     * Number of recent hospitalizations
     */
    @Column(name = "hospitalization_count")
    private Integer hospitalizationCount;

    /**
     * Default constructor
     */
    public HealthAssessment() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.guardianVerified = false;
        this.requiresDocuments = false;
        this.hasPreExistingConditions = false;
        this.medicationCount = 0;
        this.hospitalizationCount = 0;
        this.version = 0L;
    }

    /**
     * JPA lifecycle callback - before persist
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.guardianVerified == null) {
            this.guardianVerified = false;
        }
        if (this.requiresDocuments == null) {
            this.requiresDocuments = false;
        }
    }

    /**
     * JPA lifecycle callback - before update
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Marks the assessment as completed
     */
    public void markAsCompleted() {
        this.completedAt = LocalDateTime.now();
    }

    /**
     * Checks if the assessment is completed
     *
     * @return true if completed, false otherwise
     */
    public boolean isCompleted() {
        return this.completedAt != null;
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Enrollment getEnrollment() {
        return enrollment;
    }

    public void setEnrollment(Enrollment enrollment) {
        this.enrollment = enrollment;
    }

    public JsonNode getResponses() {
        return responses;
    }

    public void setResponses(JsonNode responses) {
        this.responses = responses;
    }

    public Integer getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(Integer riskScore) {
        this.riskScore = riskScore;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Boolean getGuardianVerified() {
        return guardianVerified;
    }

    public void setGuardianVerified(Boolean guardianVerified) {
        this.guardianVerified = guardianVerified;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public Boolean getRequiresDocuments() {
        return requiresDocuments;
    }

    public void setRequiresDocuments(Boolean requiresDocuments) {
        this.requiresDocuments = requiresDocuments;
    }

    public String getTriageRecommendation() {
        return triageRecommendation;
    }

    public void setTriageRecommendation(String triageRecommendation) {
        this.triageRecommendation = triageRecommendation;
    }

    public String getTriageNotes() {
        return triageNotes;
    }

    public void setTriageNotes(String triageNotes) {
        this.triageNotes = triageNotes;
    }

    public Boolean getHasPreExistingConditions() {
        return hasPreExistingConditions;
    }

    public void setHasPreExistingConditions(Boolean hasPreExistingConditions) {
        this.hasPreExistingConditions = hasPreExistingConditions;
    }

    public Integer getMedicationCount() {
        return medicationCount;
    }

    public void setMedicationCount(Integer medicationCount) {
        this.medicationCount = medicationCount;
    }

    public Integer getHospitalizationCount() {
        return hospitalizationCount;
    }

    public void setHospitalizationCount(Integer hospitalizationCount) {
        this.hospitalizationCount = hospitalizationCount;
    }
}
