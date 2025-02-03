// Package main provides the entry point for the document service with comprehensive
// security, monitoring, and performance optimizations.
package main

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin" // v1.9.1
    "github.com/prometheus/client_golang/prometheus" // v1.16.0
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "github.com/uber/jaeger-client-go" // v2.30.0
    jaegercfg "github.com/uber/jaeger-client-go/config"
    "go.uber.org/zap" // v1.24.0
    "golang.org/x/time/rate" // v0.3.0

    "github.com/yourdomain/document-service/internal/config"
    "github.com/yourdomain/document-service/internal/handlers"
    "github.com/yourdomain/document-service/internal/services"
)

const (
    defaultPort        = ":8080"
    defaultConfigPath  = "./config"
    shutdownTimeout    = 30 * time.Second
    maxUploadSize     = 50 * 1024 * 1024 // 50MB
)

// Prometheus metrics
var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "Duration of HTTP requests in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path", "status"},
    )

    documentOperations = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "document_operations_total",
            Help: "Total number of document operations",
        },
        []string{"operation", "status"},
    )
)

func main() {
    // Initialize structured logging
    logger, err := zap.NewProduction()
    if err != nil {
        fmt.Printf("Failed to initialize logger: %v\n", err)
        os.Exit(1)
    }
    defer logger.Sync()
    zap.ReplaceGlobals(logger)

    // Load configuration
    cfg, err := config.LoadConfig(defaultConfigPath)
    if err != nil {
        logger.Fatal("Failed to load configuration", zap.Error(err))
    }

    // Initialize metrics
    if err := setupMetrics(); err != nil {
        logger.Fatal("Failed to setup metrics", zap.Error(err))
    }

    // Initialize tracing
    if err := setupTracing(cfg); err != nil {
        logger.Fatal("Failed to setup tracing", zap.Error(err))
    }

    // Initialize storage service
    storageService, err := services.NewStorageService(cfg)
    if err != nil {
        logger.Fatal("Failed to initialize storage service", zap.Error(err))
    }

    // Initialize OCR service
    ocrService, err := services.NewOCRService(cfg)
    if err != nil {
        logger.Fatal("Failed to initialize OCR service", zap.Error(err))
    }

    // Initialize document handler
    documentHandler, err := handlers.NewDocumentHandler(cfg, storageService, ocrService, prometheus.DefaultRegisterer.(*prometheus.Registry), logger)
    if err != nil {
        logger.Fatal("Failed to initialize document handler", zap.Error(err))
    }

    // Initialize Gin router
    gin.SetMode(gin.ReleaseMode)
    router := gin.New()
    router = setupRouter(router, documentHandler)

    // Configure server
    srv := &http.Server{
        Addr:         cfg.ServiceConfig.Port,
        Handler:      router,
        ReadTimeout:  cfg.ServiceConfig.RequestTimeout,
        WriteTimeout: cfg.ServiceConfig.RequestTimeout,
        IdleTimeout:  cfg.ServiceConfig.RequestTimeout * 2,
    }

    // Start server in goroutine
    go func() {
        logger.Info("Starting server", zap.String("port", cfg.ServiceConfig.Port))
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Fatal("Failed to start server", zap.Error(err))
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    // Graceful shutdown
    logger.Info("Shutting down server...")
    ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
    defer cancel()

    if err := gracefulShutdown(srv, ctx); err != nil {
        logger.Error("Server forced to shutdown", zap.Error(err))
    }

    logger.Info("Server exited")
}

func setupRouter(router *gin.Engine, handler *handlers.DocumentHandler) *gin.Engine {
    // Recovery middleware
    router.Use(gin.Recovery())

    // Rate limiting middleware
    limiter := rate.NewLimiter(rate.Limit(100), 200)
    router.Use(func(c *gin.Context) {
        if !limiter.Allow() {
            c.AbortWithStatus(http.StatusTooManyRequests)
            return
        }
        c.Next()
    })

    // Request ID middleware
    router.Use(func(c *gin.Context) {
        c.Writer.Header().Set("X-Request-ID", c.GetString("request_id"))
        c.Next()
    })

    // Metrics middleware
    router.Use(func(c *gin.Context) {
        start := time.Now()
        c.Next()
        duration := time.Since(start).Seconds()
        requestDuration.WithLabelValues(
            c.Request.Method,
            c.Request.URL.Path,
            fmt.Sprintf("%d", c.Writer.Status()),
        ).Observe(duration)
    })

    // Security headers
    router.Use(func(c *gin.Context) {
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        c.Next()
    })

    // Configure routes
    api := router.Group("/api/v1")
    {
        // Document operations
        api.POST("/documents", handler.UploadDocument)
        api.GET("/documents/:id", handler.DownloadDocument)
        api.DELETE("/documents/:id", handler.DeleteDocument)
    }

    // Health check endpoint
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "healthy"})
    })

    // Metrics endpoint
    router.GET("/metrics", gin.WrapH(promhttp.Handler()))

    return router
}

func setupMetrics() error {
    // Register metrics
    if err := prometheus.Register(requestDuration); err != nil {
        return fmt.Errorf("failed to register request duration metric: %w", err)
    }
    if err := prometheus.Register(documentOperations); err != nil {
        return fmt.Errorf("failed to register document operations metric: %w", err)
    }
    return nil
}

func setupTracing(cfg *config.Config) error {
    jaegerCfg := jaegercfg.Configuration{
        ServiceName: "document-service",
        Sampler: &jaegercfg.SamplerConfig{
            Type:  jaeger.SamplerTypeConst,
            Param: 1,
        },
        Reporter: &jaegercfg.ReporterConfig{
            LogSpans:           true,
            CollectorEndpoint:  cfg.ServiceConfig.JaegerEndpoint,
            LocalAgentHostPort: "localhost:6831",
        },
    }

    _, err := jaegerCfg.InitGlobalTracer(
        "document-service",
        jaegercfg.Logger(jaeger.StdLogger),
    )
    if err != nil {
        return fmt.Errorf("failed to initialize tracer: %w", err)
    }
    return nil
}

func gracefulShutdown(srv *http.Server, ctx context.Context) error {
    // Stop accepting new requests
    if err := srv.Shutdown(ctx); err != nil {
        return fmt.Errorf("server shutdown failed: %w", err)
    }

    // Wait for context to be done (timeout or cancel)
    <-ctx.Done()
    if err := ctx.Err(); err != nil {
        return fmt.Errorf("shutdown context error: %w", err)
    }

    return nil
}