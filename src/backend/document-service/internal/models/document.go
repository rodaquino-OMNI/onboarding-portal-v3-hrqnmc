package models

import (
    "encoding/json"
    "errors"
    "fmt"
    "time"
)

// Document status constants
const (
    DocumentStatusPending    = "pending"
    DocumentStatusProcessing = "processing"
    DocumentStatusValidating = "validating"
    DocumentStatusEncrypting = "encrypting"
    DocumentStatusCompleted  = "completed"
    DocumentStatusFailed     = "failed"
)

// Document size and type constraints
const (
    MaxDocumentSize = 100 * 1024 * 1024 // 100MB
)

var (
    AllowedMimeTypes = []string{
        "application/pdf",
        "image/jpeg",
        "image/png",
    }

    AllowedStatuses = []string{
        DocumentStatusPending,
        DocumentStatusProcessing,
        DocumentStatusValidating,
        DocumentStatusEncrypting,
        DocumentStatusCompleted,
        DocumentStatusFailed,
    }

    ErrInvalidStatus      = errors.New("invalid document status")
    ErrInvalidSize        = errors.New("document size exceeds maximum allowed")
    ErrInvalidContentType = errors.New("unsupported content type")
    ErrMissingField       = errors.New("required field is missing")
)

// Document represents a health plan enrollment document with comprehensive metadata
type Document struct {
    ID            string             `json:"id"`
    EnrollmentID  string             `json:"enrollment_id"`
    DocumentType  string             `json:"document_type"`
    Filename      string             `json:"filename"`
    ContentType   string             `json:"content_type"`
    Size          int64              `json:"size"`
    Status        string             `json:"status"`
    StoragePath   string             `json:"storage_path"`
    ContentHash   string             `json:"content_hash"`
    EncryptionInfo *EncryptionMetadata `json:"encryption_info,omitempty"`
    CreatedAt     time.Time          `json:"created_at"`
    UpdatedAt     time.Time          `json:"updated_at"`
    ProcessedAt   *time.Time         `json:"processed_at,omitempty"`
    RetentionDate time.Time          `json:"retention_date"`
    AuditTrail    []AuditLog         `json:"audit_trail"`
}

// EncryptionMetadata stores encryption-related metadata for encrypted documents
type EncryptionMetadata struct {
    KeyID         string    `json:"key_id"`
    Algorithm     string    `json:"algorithm"`
    IV            string    `json:"iv"`
    KeyVersion    string    `json:"key_version"`
    EncryptedAt   time.Time `json:"encrypted_at"`
    KeyRotationDue time.Time `json:"key_rotation_due"`
}

// AuditLog represents an audit log entry for document operations
type AuditLog struct {
    Timestamp   time.Time `json:"timestamp"`
    Action      string    `json:"action"`
    Status      string    `json:"status"`
    Reason      string    `json:"reason"`
    PerformedBy string    `json:"performed_by"`
}

// NewDocument creates a new document instance with default values and validation
func NewDocument(enrollmentID, documentType, filename, contentType string, size int64) (*Document, error) {
    if enrollmentID == "" || documentType == "" || filename == "" {
        return nil, ErrMissingField
    }

    validContentType := false
    for _, allowed := range AllowedMimeTypes {
        if contentType == allowed {
            validContentType = true
            break
        }
    }
    if !validContentType {
        return nil, ErrInvalidContentType
    }

    if size > MaxDocumentSize {
        return nil, ErrInvalidSize
    }

    now := time.Now()
    // Set retention date to 5 years from creation as per LGPD guidelines
    retentionDate := now.AddDate(5, 0, 0)

    doc := &Document{
        EnrollmentID:  enrollmentID,
        DocumentType:  documentType,
        Filename:      filename,
        ContentType:   contentType,
        Size:         size,
        Status:       DocumentStatusPending,
        CreatedAt:    now,
        UpdatedAt:    now,
        RetentionDate: retentionDate,
        AuditTrail:   make([]AuditLog, 0),
    }

    // Add initial audit log entry
    doc.addAuditLog("CREATE", DocumentStatusPending, "Document created", "SYSTEM")

    return doc, nil
}

// UpdateStatus updates document status with validation and audit logging
func (d *Document) UpdateStatus(status, reason string) error {
    validStatus := false
    for _, allowed := range AllowedStatuses {
        if status == allowed {
            validStatus = true
            break
        }
    }
    if !validStatus {
        return ErrInvalidStatus
    }

    d.Status = status
    d.UpdatedAt = time.Now()

    if status == DocumentStatusCompleted {
        now := time.Now()
        d.ProcessedAt = &now
    }

    d.addAuditLog("STATUS_UPDATE", status, reason, "SYSTEM")
    return nil
}

// SetEncryptionMetadata sets document encryption metadata with audit logging
func (d *Document) SetEncryptionMetadata(metadata *EncryptionMetadata) error {
    if err := metadata.Validate(); err != nil {
        return err
    }

    d.EncryptionInfo = metadata
    d.UpdatedAt = time.Now()
    d.addAuditLog("ENCRYPTION", d.Status, "Encryption metadata updated", "SYSTEM")
    return nil
}

// Validate validates encryption metadata completeness
func (e *EncryptionMetadata) Validate() error {
    if e.KeyID == "" || e.Algorithm == "" || e.IV == "" || e.KeyVersion == "" {
        return ErrMissingField
    }

    if e.Algorithm != "AES-256-GCM" {
        return errors.New("unsupported encryption algorithm")
    }

    if e.KeyRotationDue.Before(time.Now()) {
        return errors.New("key rotation date is in the past")
    }

    return nil
}

// addAuditLog adds a new audit log entry to the document
func (d *Document) addAuditLog(action, status, reason, performer string) {
    auditLog := AuditLog{
        Timestamp:   time.Now(),
        Action:      action,
        Status:      status,
        Reason:      reason,
        PerformedBy: performer,
    }
    d.AuditTrail = append(d.AuditTrail, auditLog)
}

// MarshalJSON implements custom JSON marshaling with sensitive data handling
func (d *Document) MarshalJSON() ([]byte, error) {
    type Alias Document
    return json.Marshal(&struct {
        *Alias
        ContentHash string `json:"content_hash,omitempty"`
    }{
        Alias:       (*Alias)(d),
        ContentHash: d.ContentHash,
    })
}