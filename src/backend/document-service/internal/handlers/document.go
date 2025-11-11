// Package handlers provides HTTP request handlers for document service endpoints
package handlers

import (
    "context"
    "errors"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "time"

    "github.com/gin-gonic/gin" // v1.9.1
    "github.com/sony/gobreaker" // v1.5.0
    "go.opentelemetry.io/otel" // v1.19.0
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    "github.com/prometheus/client_golang/prometheus" // v1.17.0
    "go.uber.org/zap" // v1.26.0

    "github.com/rodaquino-OMNI/onboarding-portal-v3-hrqnmc/src/backend/document-service/internal/config"
    "github.com/rodaquino-OMNI/onboarding-portal-v3-hrqnmc/src/backend/document-service/internal/models"
    "github.com/rodaquino-OMNI/onboarding-portal-v3-hrqnmc/src/backend/document-service/internal/services"
)

// Global constants for document handling
const (
    maxFileSize = 10 * 1024 * 1024 // 10MB
    uploadTimeout = 3 * time.Second
    ocrTimeout = 10 * time.Second
)

var (
    allowedMimeTypes = []string{
        "application/pdf",
        "image/jpeg",
        "image/png",
    }

    // Error definitions
    ErrFileTooLarge = errors.New("file size exceeds maximum allowed")
    ErrInvalidFileType = errors.New("invalid file type")
    ErrUploadTimeout = errors.New("upload operation timed out")
    ErrProcessingTimeout = errors.New("processing operation timed out")
)

// DocumentHandler handles HTTP requests for document operations
type DocumentHandler struct {
    config       *config.Config
    storage      *services.StorageService
    ocr          *services.OCRService
    metrics      *prometheus.CounterVec
    auditLogger  *zap.Logger
    ocrBreaker   *gobreaker.CircuitBreaker
    storageBreaker *gobreaker.CircuitBreaker
    tracer       trace.Tracer
}

// NewDocumentHandler creates a new document handler instance
func NewDocumentHandler(cfg *config.Config, storage *services.StorageService, ocr *services.OCRService, metricsClient *prometheus.Client, auditLogger *zap.Logger) (*DocumentHandler, error) {
    if cfg == nil || storage == nil || ocr == nil || metricsClient == nil || auditLogger == nil {
        return nil, errors.New("required dependencies cannot be nil")
    }

    // Initialize metrics
    metrics := prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "document_operations_total",
            Help: "Total number of document operations",
        },
        []string{"operation", "status"},
    )
    metricsClient.MustRegister(metrics)

    // Configure circuit breakers
    ocrBreaker := gobreaker.NewCircuitBreaker(gobreaker.Settings{
        Name:        "ocr-service",
        MaxRequests: 100,
        Interval:    time.Minute,
        Timeout:     2 * time.Minute,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 10 && failureRatio >= 0.6
        },
    })

    storageBreaker := gobreaker.NewCircuitBreaker(gobreaker.Settings{
        Name:        "storage-service",
        MaxRequests: 100,
        Interval:    time.Minute,
        Timeout:     time.Minute,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 10 && failureRatio >= 0.5
        },
    })

    return &DocumentHandler{
        config:         cfg,
        storage:        storage,
        ocr:           ocr,
        metrics:       metrics,
        auditLogger:   auditLogger,
        ocrBreaker:    ocrBreaker,
        storageBreaker: storageBreaker,
        tracer:        otel.Tracer("document-handler"),
    }, nil
}

// UploadDocument handles document upload requests
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
    ctx, span := h.tracer.Start(c.Request.Context(), "UploadDocument")
    defer span.End()

    // Start operation timing
    startTime := time.Now()
    defer func() {
        h.metrics.WithLabelValues("upload", "completed").Inc()
        span.SetAttributes(attribute.Float64("duration_ms", float64(time.Since(startTime).Milliseconds())))
    }()

    // Validate request
    file, header, err := c.Request.FormFile("file")
    if err != nil {
        h.handleError(c, http.StatusBadRequest, "Invalid file upload", err)
        return
    }
    defer file.Close()

    // Validate file size
    if header.Size > maxFileSize {
        h.handleError(c, http.StatusBadRequest, "File too large", ErrFileTooLarge)
        return
    }

    // Validate file type
    if !h.isAllowedFileType(header.Header.Get("Content-Type")) {
        h.handleError(c, http.StatusBadRequest, "Invalid file type", ErrInvalidFileType)
        return
    }

    // Create document model
    doc, err := models.NewDocument(
        c.GetString("enrollment_id"),
        c.GetString("document_type"),
        header.Filename,
        header.Header.Get("Content-Type"),
        header.Size,
    )
    if err != nil {
        h.handleError(c, http.StatusBadRequest, "Invalid document parameters", err)
        return
    }

    // Upload with timeout context
    uploadCtx, cancel := context.WithTimeout(ctx, uploadTimeout)
    defer cancel()

    // Store document with circuit breaker
    err = h.storageBreaker.Execute(func() error {
        return h.storage.StoreDocument(uploadCtx, doc, file)
    })
    if err != nil {
        h.handleError(c, http.StatusInternalServerError, "Storage operation failed", err)
        return
    }

    // Process OCR if needed
    if h.shouldProcessOCR(doc) {
        ocrCtx, cancel := context.WithTimeout(ctx, ocrTimeout)
        defer cancel()

        err = h.processOCR(ocrCtx, doc)
        if err != nil {
            h.auditLogger.Warn("OCR processing failed", 
                zap.String("document_id", doc.ID),
                zap.Error(err),
            )
            // Continue despite OCR failure
        }
    }

    // Audit log success
    h.auditLogger.Info("Document uploaded successfully",
        zap.String("document_id", doc.ID),
        zap.String("enrollment_id", doc.EnrollmentID),
        zap.String("type", doc.DocumentType),
        zap.Int64("size", doc.Size),
    )

    c.JSON(http.StatusOK, gin.H{
        "status": "success",
        "data": doc,
    })
}

// DownloadDocument handles document download requests
func (h *DocumentHandler) DownloadDocument(c *gin.Context) {
    ctx, span := h.tracer.Start(c.Request.Context(), "DownloadDocument")
    defer span.End()

    startTime := time.Now()
    defer func() {
        h.metrics.WithLabelValues("download", "completed").Inc()
        span.SetAttributes(attribute.Float64("duration_ms", float64(time.Since(startTime).Milliseconds())))
    }()

    // Get document ID from path
    docID := c.Param("id")
    if docID == "" {
        h.handleError(c, http.StatusBadRequest, "Missing document ID", nil)
        return
    }

    // Retrieve document with circuit breaker
    var content io.Reader
    err := h.storageBreaker.Execute(func() error {
        var err error
        content, err = h.storage.RetrieveDocument(ctx, &models.Document{ID: docID})
        return err
    })
    if err != nil {
        h.handleError(c, http.StatusInternalServerError, "Document retrieval failed", err)
        return
    }

    // Audit log access
    h.auditLogger.Info("Document downloaded",
        zap.String("document_id", docID),
        zap.String("user_id", c.GetString("user_id")),
    )

    // Stream document to client
    c.DataFromReader(http.StatusOK, -1, "application/octet-stream", content, nil)
}

// DeleteDocument handles document deletion requests
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
    ctx, span := h.tracer.Start(c.Request.Context(), "DeleteDocument")
    defer span.End()

    startTime := time.Now()
    defer func() {
        h.metrics.WithLabelValues("delete", "completed").Inc()
        span.SetAttributes(attribute.Float64("duration_ms", float64(time.Since(startTime).Milliseconds())))
    }()

    // Get document ID
    docID := c.Param("id")
    if docID == "" {
        h.handleError(c, http.StatusBadRequest, "Missing document ID", nil)
        return
    }

    // Delete document with circuit breaker
    err := h.storageBreaker.Execute(func() error {
        return h.storage.DeleteDocument(ctx, &models.Document{ID: docID})
    })
    if err != nil {
        h.handleError(c, http.StatusInternalServerError, "Document deletion failed", err)
        return
    }

    // Audit log deletion
    h.auditLogger.Info("Document deleted",
        zap.String("document_id", docID),
        zap.String("user_id", c.GetString("user_id")),
    )

    c.JSON(http.StatusOK, gin.H{
        "status": "success",
        "message": "Document deleted successfully",
    })
}

// Helper functions

func (h *DocumentHandler) handleError(c *gin.Context, status int, message string, err error) {
    h.metrics.WithLabelValues(c.Request.Method, "error").Inc()
    
    h.auditLogger.Error(message,
        zap.Error(err),
        zap.String("user_id", c.GetString("user_id")),
        zap.String("path", c.Request.URL.Path),
    )

    c.JSON(status, gin.H{
        "status": "error",
        "message": message,
        "error": err.Error(),
    })
}

func (h *DocumentHandler) isAllowedFileType(contentType string) bool {
    for _, allowed := range allowedMimeTypes {
        if contentType == allowed {
            return true
        }
    }
    return false
}

func (h *DocumentHandler) shouldProcessOCR(doc *models.Document) bool {
    return doc.DocumentType == "identity" || doc.DocumentType == "medical_record"
}

func (h *DocumentHandler) processOCR(ctx context.Context, doc *models.Document) error {
    return h.ocrBreaker.Execute(func() error {
        _, err := h.ocr.ProcessDocument(ctx, doc, nil)
        return err
    })
}