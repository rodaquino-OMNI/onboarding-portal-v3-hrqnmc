// Package config provides configuration management for the document service
// with comprehensive security, encryption, and LGPD compliance features.
package config

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/spf13/viper" // v1.16.0
)

const (
	defaultConfigPath = "./config"
	defaultConfigName = "config"
	defaultConfigType = "yaml"
)

// Config represents the main configuration structure for the document service
type Config struct {
	MinioConfig    MinioConfig    `json:"minio" mapstructure:"minio"`
	AzureConfig    AzureConfig    `json:"azure" mapstructure:"azure"`
	ServiceConfig  ServiceConfig  `json:"service" mapstructure:"service"`
	SecurityConfig SecurityConfig `json:"security" mapstructure:"security"`
}

// MinioConfig contains MinIO storage configuration settings
type MinioConfig struct {
	Endpoint        string        `json:"endpoint" mapstructure:"endpoint"`
	AccessKey       string        `json:"accessKey" mapstructure:"access_key"`
	SecretKey       string        `json:"secretKey" mapstructure:"secret_key"`
	BucketName      string        `json:"bucketName" mapstructure:"bucket_name"`
	UseSSL          bool          `json:"useSSL" mapstructure:"use_ssl"`
	UploadTimeout   time.Duration `json:"uploadTimeout" mapstructure:"upload_timeout"`
	DownloadTimeout time.Duration `json:"downloadTimeout" mapstructure:"download_timeout"`
	MaxConnections  int           `json:"maxConnections" mapstructure:"max_connections"`
	EnableSharding  bool          `json:"enableSharding" mapstructure:"enable_sharding"`
	ShardingConfig  map[string]string `json:"shardingConfig" mapstructure:"sharding_config"`
}

// AzureConfig contains Azure Computer Vision configuration settings
type AzureConfig struct {
	Endpoint             string                 `json:"endpoint" mapstructure:"endpoint"`
	SubscriptionKey      string                 `json:"subscriptionKey" mapstructure:"subscription_key"`
	OCRTimeout          time.Duration          `json:"ocrTimeout" mapstructure:"ocr_timeout"`
	ClassificationTimeout time.Duration         `json:"classificationTimeout" mapstructure:"classification_timeout"`
	MaxRetries          int                    `json:"maxRetries" mapstructure:"max_retries"`
	RetryInterval       time.Duration          `json:"retryInterval" mapstructure:"retry_interval"`
	ConfidenceThreshold float64                `json:"confidenceThreshold" mapstructure:"confidence_threshold"`
	ModelConfig         map[string]interface{} `json:"modelConfig" mapstructure:"model_config"`
}

// ServiceConfig contains general service operational settings
type ServiceConfig struct {
	Environment           string        `json:"environment" mapstructure:"environment"`
	Port                 int           `json:"port" mapstructure:"port"`
	MaxFileSize          int64         `json:"maxFileSize" mapstructure:"max_file_size"`
	AllowedFileTypes     []string      `json:"allowedFileTypes" mapstructure:"allowed_file_types"`
	RequestTimeout       time.Duration `json:"requestTimeout" mapstructure:"request_timeout"`
	MaxConcurrentUploads int           `json:"maxConcurrentUploads" mapstructure:"max_concurrent_uploads"`
	MaxConcurrentProcessing int        `json:"maxConcurrentProcessing" mapstructure:"max_concurrent_processing"`
	EnableMetrics        bool          `json:"enableMetrics" mapstructure:"enable_metrics"`
}

// SecurityConfig contains security and encryption settings
type SecurityConfig struct {
	EncryptionKey        string            `json:"encryptionKey" mapstructure:"encryption_key"`
	EncryptionAlgorithm  string            `json:"encryptionAlgorithm" mapstructure:"encryption_algorithm"`
	EnableAuditLog       bool              `json:"enableAuditLog" mapstructure:"enable_audit_log"`
	TrustedOrigins       []string          `json:"trustedOrigins" mapstructure:"trusted_origins"`
	EnableDataMasking    bool              `json:"enableDataMasking" mapstructure:"enable_data_masking"`
	DataMaskingRules     map[string]string `json:"dataMaskingRules" mapstructure:"data_masking_rules"`
	KeyRotationInterval  time.Duration     `json:"keyRotationInterval" mapstructure:"key_rotation_interval"`
	EnforceStrictTransport bool            `json:"enforceStrictTransport" mapstructure:"enforce_strict_transport"`
}

// LoadConfig loads and validates service configuration from the specified path
func LoadConfig(path string) (*Config, error) {
	v := viper.New()

	// Set default configuration values
	setDefaults(v)

	// Set configuration path and type
	if path != "" {
		v.AddConfigPath(path)
	} else {
		v.AddConfigPath(defaultConfigPath)
	}
	v.SetConfigName(defaultConfigName)
	v.SetConfigType(defaultConfigType)

	// Enable environment variable override
	v.AutomaticEnv()
	v.SetEnvPrefix("DOC_SERVICE")

	// Read configuration
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("error reading config file: %w", err)
		}
	}

	config := &Config{}
	if err := v.Unmarshal(config); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return config, nil
}

// Validate performs comprehensive validation of all configuration settings
func (c *Config) Validate() error {
	// Validate MinIO configuration
	if c.MinioConfig.Endpoint == "" {
		return fmt.Errorf("minio endpoint is required")
	}
	if c.MinioConfig.BucketName == "" {
		return fmt.Errorf("minio bucket name is required")
	}
	if c.MinioConfig.UploadTimeout <= 0 {
		return fmt.Errorf("invalid upload timeout")
	}

	// Validate Azure configuration
	if c.AzureConfig.Endpoint == "" {
		return fmt.Errorf("azure endpoint is required")
	}
	if c.AzureConfig.SubscriptionKey == "" {
		return fmt.Errorf("azure subscription key is required")
	}
	if c.AzureConfig.ConfidenceThreshold <= 0 || c.AzureConfig.ConfidenceThreshold > 1 {
		return fmt.Errorf("confidence threshold must be between 0 and 1")
	}

	// Validate service configuration
	if c.ServiceConfig.Port <= 0 || c.ServiceConfig.Port > 65535 {
		return fmt.Errorf("invalid port number")
	}
	if c.ServiceConfig.MaxFileSize <= 0 {
		return fmt.Errorf("invalid max file size")
	}
	if len(c.ServiceConfig.AllowedFileTypes) == 0 {
		return fmt.Errorf("allowed file types must be specified")
	}

	// Validate security configuration
	if c.SecurityConfig.EncryptionKey == "" {
		return fmt.Errorf("encryption key is required")
	}
	if c.SecurityConfig.EncryptionAlgorithm != "AES-256" {
		return fmt.Errorf("unsupported encryption algorithm")
	}
	if len(c.SecurityConfig.TrustedOrigins) == 0 {
		return fmt.Errorf("trusted origins must be specified")
	}

	return nil
}

// setDefaults sets default values for configuration
func setDefaults(v *viper.Viper) {
	// MinIO defaults
	v.SetDefault("minio.use_ssl", true)
	v.SetDefault("minio.upload_timeout", time.Second*30)
	v.SetDefault("minio.download_timeout", time.Second*30)
	v.SetDefault("minio.max_connections", 100)

	// Azure defaults
	v.SetDefault("azure.ocr_timeout", time.Second*10)
	v.SetDefault("azure.classification_timeout", time.Second*10)
	v.SetDefault("azure.max_retries", 3)
	v.SetDefault("azure.retry_interval", time.Second*1)
	v.SetDefault("azure.confidence_threshold", 0.85)

	// Service defaults
	v.SetDefault("service.environment", "development")
	v.SetDefault("service.port", 8080)
	v.SetDefault("service.max_file_size", 10*1024*1024) // 10MB
	v.SetDefault("service.allowed_file_types", []string{"pdf", "jpg", "jpeg", "png"})
	v.SetDefault("service.request_timeout", time.Second*60)
	v.SetDefault("service.max_concurrent_uploads", 50)
	v.SetDefault("service.max_concurrent_processing", 20)
	v.SetDefault("service.enable_metrics", true)

	// Security defaults
	v.SetDefault("security.encryption_algorithm", "AES-256")
	v.SetDefault("security.enable_audit_log", true)
	v.SetDefault("security.enable_data_masking", true)
	v.SetDefault("security.key_rotation_interval", time.Hour*24)
	v.SetDefault("security.enforce_strict_transport", true)
}