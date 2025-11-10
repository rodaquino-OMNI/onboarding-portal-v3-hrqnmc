// Package services provides document storage functionality with enhanced security and monitoring
package services

import (
    "context"
    "fmt"
    "io"
    "path"
    "time"

    "github.com/minio/minio-go/v7" // v7.0.63
    "github.com/minio/minio-go/v7/pkg/credentials" // v7.0.63

    "github.com/rodaquino-OMNI/onboarding-portal-v3-hrqnmc/src/backend/document-service/internal/config"
    "github.com/rodaquino-OMNI/onboarding-portal-v3-hrqnmc/src/backend/document-service/internal/models"
    "github.com/rodaquino-OMNI/onboarding-portal-v3-hrqnmc/src/backend/document-service/internal/utils"
)

const (
    defaultStoragePrefix = "documents/"
    defaultContentType  = "application/octet-stream"
    maxRetries         = 3
    retryBackoff       = 500 * time.Millisecond
)

// StorageService manages document storage operations using MinIO
type StorageService struct {
    client           *minio.Client
    bucketName       string
    config           *config.Config
    metricsCollector *metrics.Collector
    cb               *circuitbreaker.CircuitBreaker
}

// NewStorageService creates a new instance of StorageService
func NewStorageService(cfg *config.Config) (*StorageService, error) {
    if cfg == nil {
        return nil, fmt.Errorf("config cannot be nil")
    }

    // Initialize MinIO client
    client, err := minio.New(cfg.MinioConfig.Endpoint, &minio.Options{
        Creds:  credentials.NewStaticV4(cfg.MinioConfig.AccessKey, cfg.MinioConfig.SecretKey, ""),
        Secure: cfg.MinioConfig.UseSSL,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to initialize MinIO client: %w", err)
    }

    // Verify bucket exists or create it
    ctx := context.Background()
    exists, err := client.BucketExists(ctx, cfg.MinioConfig.BucketName)
    if err != nil {
        return nil, fmt.Errorf("failed to check bucket existence: %w", err)
    }

    if !exists {
        err = client.MakeBucket(ctx, cfg.MinioConfig.BucketName, minio.MakeBucketOptions{})
        if err != nil {
            return nil, fmt.Errorf("failed to create bucket: %w", err)
        }
    }

    // Initialize circuit breaker
    cb := circuitbreaker.NewCircuitBreaker(circuitbreaker.Settings{
        Name:        "storage-service",
        MaxFailures: 5,
        Timeout:     10 * time.Second,
        Interval:    30 * time.Second,
    })

    return &StorageService{
        client:           client,
        bucketName:       cfg.MinioConfig.BucketName,
        config:           cfg,
        metricsCollector: metrics.NewCollector("storage_service"),
        cb:               cb,
    }, nil
}

// StoreDocument stores an encrypted document in MinIO
func (s *StorageService) StoreDocument(ctx context.Context, doc *models.Document, content io.Reader) error {
    startTime := time.Now()
    defer s.metricsCollector.ObserveOperation("store_document", startTime)

    if err := doc.UpdateStatus(models.DocumentStatusProcessing, "Starting document storage"); err != nil {
        return fmt.Errorf("failed to update document status: %w", err)
    }

    // Encrypt document content
    encryptedContent, err := utils.EncryptDocument(doc, content, s.config)
    if err != nil {
        doc.UpdateStatus(models.DocumentStatusFailed, fmt.Sprintf("Encryption failed: %v", err))
        return fmt.Errorf("document encryption failed: %w", err)
    }

    // Generate storage path with sharding if enabled
    storagePath := s.generateStoragePath(doc)
    
    // Upload with retry logic
    var uploadErr error
    for attempt := 0; attempt < maxRetries; attempt++ {
        if attempt > 0 {
            time.Sleep(retryBackoff << uint(attempt))
        }

        // Execute upload with circuit breaker
        uploadErr = s.cb.Execute(func() error {
            _, err := s.client.PutObject(ctx, s.bucketName, storagePath, encryptedContent, -1,
                minio.PutObjectOptions{
                    ContentType: doc.ContentType,
                    UserMetadata: map[string]string{
                        "document-id":    doc.ID,
                        "enrollment-id":  doc.EnrollmentID,
                        "document-type": doc.DocumentType,
                    },
                })
            return err
        })

        if uploadErr == nil {
            break
        }
    }

    if uploadErr != nil {
        doc.UpdateStatus(models.DocumentStatusFailed, fmt.Sprintf("Upload failed: %v", uploadErr))
        return fmt.Errorf("failed to upload document after %d attempts: %w", maxRetries, uploadErr)
    }

    // Update document storage path and status
    doc.StoragePath = storagePath
    if err := doc.UpdateStatus(models.DocumentStatusCompleted, "Document stored successfully"); err != nil {
        return fmt.Errorf("failed to update document status: %w", err)
    }

    return nil
}

// RetrieveDocument retrieves and decrypts a document from storage
func (s *StorageService) RetrieveDocument(ctx context.Context, doc *models.Document) (io.Reader, error) {
    startTime := time.Now()
    defer s.metricsCollector.ObserveOperation("retrieve_document", startTime)

    if doc.StoragePath == "" {
        return nil, fmt.Errorf("document storage path is empty")
    }

    // Retrieve encrypted content with retry logic
    var (
        encryptedContent io.Reader
        retrieveErr      error
    )

    for attempt := 0; attempt < maxRetries; attempt++ {
        if attempt > 0 {
            time.Sleep(retryBackoff << uint(attempt))
        }

        // Execute retrieval with circuit breaker
        var obj *minio.Object
        retrieveErr = s.cb.Execute(func() error {
            var err error
            obj, err = s.client.GetObject(ctx, s.bucketName, doc.StoragePath, minio.GetObjectOptions{})
            if err != nil {
                return err
            }
            encryptedContent = obj
            return nil
        })

        if retrieveErr == nil {
            break
        }
    }

    if retrieveErr != nil {
        return nil, fmt.Errorf("failed to retrieve document after %d attempts: %w", maxRetries, retrieveErr)
    }

    // Decrypt document content
    decryptedContent, err := utils.DecryptDocument(doc, encryptedContent, s.config)
    if err != nil {
        return nil, fmt.Errorf("document decryption failed: %w", err)
    }

    doc.AuditLog("RETRIEVE", models.DocumentStatusCompleted, "Document retrieved successfully", "SYSTEM")
    return decryptedContent, nil
}

// generateStoragePath generates a storage path for the document with optional sharding
func (s *StorageService) generateStoragePath(doc *models.Document) string {
    if s.config.MinioConfig.EnableSharding {
        shardKey := doc.EnrollmentID[:2] // Use first 2 chars of enrollment ID for sharding
        return path.Join(defaultStoragePrefix, shardKey, doc.ID)
    }
    return path.Join(defaultStoragePrefix, doc.ID)
}