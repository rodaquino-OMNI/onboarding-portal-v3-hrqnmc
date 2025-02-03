// Package services provides core document processing functionality including OCR operations
package services

import (
    "context"
    "errors"
    "fmt"
    "time"
    
    "github.com/Azure/azure-sdk-for-go/services/cognitiveservices/v3.0/computervision" // v68.0.0
    "github.com/sony/gobreaker" // v0.5.0
    "go.opentelemetry.io/otel/metric" // v1.16.0
    
    "github.com/yourdomain/document-service/internal/config"
    "github.com/yourdomain/document-service/internal/models"
)

const (
    maxRetryAttempts      = 3
    retryBackoffDuration  = time.Second * 2
    ocrTimeout           = time.Second * 8
    maxDocumentSize      = 4 * 1024 * 1024 // 4MB for OCR processing
)

var (
    ErrOCRTimeout             = errors.New("OCR operation timed out")
    ErrInvalidDocument        = errors.New("invalid document for OCR")
    ErrAzureServiceUnavailable = errors.New("azure service unavailable")
)

// OCRService manages OCR operations using Azure Computer Vision
type OCRService struct {
    client    *computervision.Client
    timeout    time.Duration
    maxRetries int
    metrics    metric.Meter
    breaker    *gobreaker.CircuitBreaker
}

// NewOCRService creates a new OCR service instance with Azure client configuration
func NewOCRService(cfg *config.Config) (*OCRService, error) {
    if err := cfg.AzureConfig.Validate(); err != nil {
        return nil, fmt.Errorf("invalid azure configuration: %w", err)
    }

    client := computervision.New(cfg.AzureConfig.SubscriptionKey)
    client.Authorizer = computervision.NewCognitiveServicesAuthorizer(cfg.AzureConfig.SubscriptionKey)
    client.Endpoint = cfg.AzureConfig.Endpoint

    // Configure circuit breaker
    breakerSettings := gobreaker.Settings{
        Name:        "ocr-service",
        MaxRequests: 100,
        Interval:    time.Minute * 1,
        Timeout:     time.Minute * 2,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 10 && failureRatio >= 0.6
        },
    }

    // Initialize metrics
    meter := metric.NewMeterProvider().Meter("ocr-service")

    return &OCRService{
        client:     client,
        timeout:    cfg.AzureConfig.OCRTimeout,
        maxRetries: cfg.AzureConfig.MaxRetries,
        metrics:    meter,
        breaker:    gobreaker.NewCircuitBreaker(breakerSettings),
    }, nil
}

// ProcessDocument processes a document through OCR with validation and monitoring
func (s *OCRService) ProcessDocument(ctx context.Context, doc *models.Document, content []byte) (string, error) {
    startTime := time.Now()
    defer func() {
        s.recordMetrics("ocr_processing_duration", time.Since(startTime).Seconds())
    }()

    // Validate document
    if err := s.validateDocument(doc, content); err != nil {
        return "", fmt.Errorf("document validation failed: %w", err)
    }

    // Update document status
    if err := doc.UpdateStatus(models.DocumentStatusProcessing, "Starting OCR processing"); err != nil {
        return "", fmt.Errorf("status update failed: %w", err)
    }

    // Process with timeout
    ctx, cancel := context.WithTimeout(ctx, s.timeout)
    defer cancel()

    var extractedText string
    var processingErr error

    // Execute OCR with circuit breaker
    result, err := s.breaker.Execute(func() (interface{}, error) {
        return s.executeOCRWithRetry(ctx, content)
    })

    if err != nil {
        processingErr = fmt.Errorf("OCR processing failed: %w", err)
        s.recordMetrics("ocr_failures", 1)
    } else {
        extractedText = result.(string)
        s.recordMetrics("ocr_successes", 1)
    }

    // Update final status
    finalStatus := models.DocumentStatusCompleted
    if processingErr != nil {
        finalStatus = models.DocumentStatusFailed
    }
    
    if err := doc.UpdateStatus(finalStatus, fmt.Sprintf("OCR processing %s", finalStatus)); err != nil {
        return extractedText, fmt.Errorf("final status update failed: %w", err)
    }

    return extractedText, processingErr
}

// executeOCRWithRetry performs OCR operation with retry logic
func (s *OCRService) executeOCRWithRetry(ctx context.Context, content []byte) (string, error) {
    var lastErr error

    for attempt := 0; attempt < s.maxRetries; attempt++ {
        if attempt > 0 {
            time.Sleep(retryBackoffDuration * time.Duration(attempt))
        }

        // Submit OCR request
        operation, err := s.submitOCR(ctx, content)
        if err != nil {
            lastErr = err
            continue
        }

        // Poll for results
        result, err := s.getOCRResult(ctx, operation)
        if err != nil {
            if errors.Is(err, context.DeadlineExceeded) {
                return "", ErrOCRTimeout
            }
            lastErr = err
            continue
        }

        return result, nil
    }

    return "", fmt.Errorf("all retry attempts failed: %w", lastErr)
}

// submitOCR submits content to Azure OCR service
func (s *OCRService) submitOCR(ctx context.Context, content []byte) (string, error) {
    result, err := s.client.RecognizePrintedTextInStream(ctx, true, content)
    if err != nil {
        return "", fmt.Errorf("OCR submission failed: %w", err)
    }

    if result.OperationLocation == nil {
        return "", errors.New("no operation location received")
    }

    return *result.OperationLocation, nil
}

// getOCRResult retrieves and processes OCR operation result
func (s *OCRService) getOCRResult(ctx context.Context, operationURL string) (string, error) {
    for {
        select {
        case <-ctx.Done():
            return "", ctx.Err()
        default:
            result, err := s.client.GetTextOperationResult(ctx, operationURL)
            if err != nil {
                return "", fmt.Errorf("failed to get OCR result: %w", err)
            }

            switch result.Status {
            case computervision.Failed:
                return "", fmt.Errorf("OCR operation failed: %v", result.Message)
            case computervision.Succeeded:
                return s.extractText(result), nil
            case computervision.Running, computervision.NotStarted:
                time.Sleep(time.Millisecond * 500)
            }
        }
    }
}

// validateDocument performs document validation checks
func (s *OCRService) validateDocument(doc *models.Document, content []byte) error {
    if doc == nil {
        return ErrInvalidDocument
    }

    if len(content) > maxDocumentSize {
        return fmt.Errorf("document size exceeds maximum allowed size for OCR")
    }

    return nil
}

// extractText processes OCR result and extracts text content
func (s *OCRService) extractText(result computervision.TextOperationResult) string {
    if result.RecognitionResult == nil {
        return ""
    }

    var text string
    for _, line := range *result.RecognitionResult.Lines {
        if line.Text != nil {
            text += *line.Text + "\n"
        }
    }
    return text
}

// recordMetrics records OCR processing metrics
func (s *OCRService) recordMetrics(name string, value float64) {
    counter, _ := s.metrics.Float64Counter(name)
    counter.Add(context.Background(), value)
}