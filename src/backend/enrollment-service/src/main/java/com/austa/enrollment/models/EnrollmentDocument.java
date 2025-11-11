package com.austa.enrollment.models;

import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA Entity representing a document uploaded for an enrollment.
 * Contains metadata and encryption information for secure document storage.
 *
 * @version 1.0
 */
@Entity
@Table(name = "enrollment_documents", indexes = {
    @Index(name = "idx_doc_enrollment", columnList = "enrollment_id"),
    @Index(name = "idx_doc_type", columnList = "document_type"),
    @Index(name = "idx_doc_status", columnList = "verification_status"),
    @Index(name = "idx_doc_uploaded", columnList = "uploaded_at")
})
public class EnrollmentDocument {

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
     * Type of document (CPF, RG, MEDICAL_REPORT, etc.)
     */
    @Column(name = "document_type", nullable = false, length = 50)
    @NotNull
    @Size(max = 50)
    private String documentType;

    /**
     * Original filename
     */
    @Column(name = "file_name", nullable = false, length = 255)
    @NotNull
    @Size(max = 255)
    private String fileName;

    /**
     * Path where the document is stored in the storage system
     */
    @Column(name = "storage_path", nullable = false, length = 500)
    @NotNull
    @Size(max = 500)
    private String storagePath;

    /**
     * Encryption key identifier for the document (encrypted separately)
     */
    @Column(name = "encryption_key", length = 255)
    @Size(max = 255)
    private String encryptionKey;

    /**
     * File size in bytes
     */
    @Column(name = "file_size")
    private Long fileSize;

    /**
     * MIME type of the document
     */
    @Column(name = "mime_type", length = 100)
    @Size(max = 100)
    private String mimeType;

    /**
     * Checksum/hash of the document for integrity verification
     */
    @Column(name = "checksum", length = 64)
    @Size(max = 64)
    private String checksum;

    /**
     * Timestamp when the document was uploaded
     */
    @Column(name = "uploaded_at", nullable = false)
    @NotNull
    private LocalDateTime uploadedAt;

    /**
     * User ID who uploaded the document
     */
    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    /**
     * Verification status (UPLOADED, VERIFIED, REJECTED)
     */
    @Column(name = "verification_status", length = 50)
    @Size(max = 50)
    private String verificationStatus;

    /**
     * Indicates if the document has been verified
     */
    @Column(name = "verified")
    private Boolean verified;

    /**
     * Timestamp when the document was verified
     */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    /**
     * User ID who verified the document
     */
    @Column(name = "verified_by")
    private UUID verifiedBy;

    /**
     * Verification notes or rejection reason
     */
    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    /**
     * Document description or notes
     */
    @Column(name = "description", length = 500)
    @Size(max = 500)
    private String description;

    /**
     * Indicates if this document contains health information (PHI)
     */
    @Column(name = "contains_phi")
    private Boolean containsPHI;

    /**
     * Issuer of the document (e.g., hospital name, government agency)
     */
    @Column(name = "issuer", length = 255)
    @Size(max = 255)
    private String issuer;

    /**
     * Issue date of the document
     */
    @Column(name = "issue_date")
    private LocalDateTime issueDate;

    /**
     * Expiry date of the document (if applicable)
     */
    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    /**
     * Timestamp when the document was created in the system
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp when the document was last updated
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
     * Indicates if the document has been soft-deleted
     */
    @Column(name = "deleted")
    private Boolean deleted;

    /**
     * Timestamp when the document was deleted
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Default constructor
     */
    public EnrollmentDocument() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.uploadedAt = LocalDateTime.now();
        this.verified = false;
        this.verificationStatus = "UPLOADED";
        this.containsPHI = false;
        this.deleted = false;
        this.version = 0L;
    }

    /**
     * JPA lifecycle callback - before persist
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.uploadedAt == null) {
            this.uploadedAt = LocalDateTime.now();
        }
        if (this.verified == null) {
            this.verified = false;
        }
        if (this.verificationStatus == null) {
            this.verificationStatus = "UPLOADED";
        }
        if (this.containsPHI == null) {
            this.containsPHI = false;
        }
        if (this.deleted == null) {
            this.deleted = false;
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
     * Marks the document as verified
     *
     * @param verifiedBy the user who verified the document
     * @param notes verification notes
     */
    public void markAsVerified(UUID verifiedBy, String notes) {
        this.verified = true;
        this.verificationStatus = "VERIFIED";
        this.verifiedAt = LocalDateTime.now();
        this.verifiedBy = verifiedBy;
        this.verificationNotes = notes;
    }

    /**
     * Marks the document as rejected
     *
     * @param rejectedBy the user who rejected the document
     * @param reason rejection reason
     */
    public void markAsRejected(UUID rejectedBy, String reason) {
        this.verified = false;
        this.verificationStatus = "REJECTED";
        this.verifiedAt = LocalDateTime.now();
        this.verifiedBy = rejectedBy;
        this.verificationNotes = reason;
    }

    /**
     * Soft deletes the document
     */
    public void softDelete() {
        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
    }

    /**
     * Checks if the document is expired
     *
     * @return true if expired, false otherwise
     */
    public boolean isExpired() {
        return this.expiryDate != null && LocalDateTime.now().isAfter(this.expiryDate);
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

    public String getDocumentType() {
        return documentType;
    }

    public void setDocumentType(String documentType) {
        this.documentType = documentType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public String getEncryptionKey() {
        return encryptionKey;
    }

    public void setEncryptionKey(String encryptionKey) {
        this.encryptionKey = encryptionKey;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(UUID uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(String verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public Boolean getVerified() {
        return verified;
    }

    public void setVerified(Boolean verified) {
        this.verified = verified;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public UUID getVerifiedBy() {
        return verifiedBy;
    }

    public void setVerifiedBy(UUID verifiedBy) {
        this.verifiedBy = verifiedBy;
    }

    public String getVerificationNotes() {
        return verificationNotes;
    }

    public void setVerificationNotes(String verificationNotes) {
        this.verificationNotes = verificationNotes;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getContainsPHI() {
        return containsPHI;
    }

    public void setContainsPHI(Boolean containsPHI) {
        this.containsPHI = containsPHI;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public LocalDateTime getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(LocalDateTime issueDate) {
        this.issueDate = issueDate;
    }

    public LocalDateTime getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDateTime expiryDate) {
        this.expiryDate = expiryDate;
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

    public Boolean getDeleted() {
        return deleted;
    }

    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }
}
