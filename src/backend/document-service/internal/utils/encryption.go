// Package utils provides encryption utilities for secure document handling
package utils

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/kms" // v1.26.0
	"github.com/aws/aws-sdk-go-v2/service/kms/types"

	"github.com/yourdomain/document-service/internal/config"
	"github.com/yourdomain/document-service/internal/models"
)

const (
	aesKeySize                = 32 // 256 bits
	ivSize                    = 12 // GCM recommended IV size
	defaultEncryptionAlgorithm = "AES-256-GCM"
	maxRetries                = 3
	retryBackoffBase         = 100 * time.Millisecond
)

var (
	// Error definitions
	ErrInvalidInput        = errors.New("invalid input parameters")
	ErrEncryptionFailed    = errors.New("document encryption failed")
	ErrDecryptionFailed    = errors.New("document decryption failed")
	ErrKeyManagement       = errors.New("key management operation failed")
	ErrInvalidMetadata     = errors.New("invalid encryption metadata")

	// Key cache
	keyCache     sync.Map
	keyCacheTTL  = 1 * time.Hour
)

// EncryptDocument encrypts document content using AES-256-GCM with KMS-managed keys
func EncryptDocument(doc *models.Document, content io.Reader, cfg *config.Config) (io.Reader, error) {
	if doc == nil || content == nil || cfg == nil {
		return nil, ErrInvalidInput
	}

	// Generate random IV
	iv, err := generateIV()
	if err != nil {
		return nil, fmt.Errorf("failed to generate IV: %w", err)
	}

	// Get encryption key from KMS
	key, keyID, err := getEncryptionKey(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to get encryption key: %w", err)
	}
	defer func() {
		// Zero out key material after use
		for i := range key {
			key[i] = 0
		}
	}()

	// Create cipher block
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher block: %w", ErrEncryptionFailed)
	}

	// Create GCM cipher
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM cipher: %w", ErrEncryptionFailed)
	}

	// Read content into buffer for encryption
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, content); err != nil {
		return nil, fmt.Errorf("failed to read content: %w", err)
	}

	// Encrypt content
	ciphertext := gcm.Seal(nil, iv, buf.Bytes(), nil)

	// Update document encryption metadata
	metadata := &models.EncryptionMetadata{
		KeyID:         keyID,
		Algorithm:     defaultEncryptionAlgorithm,
		IV:            base64.StdEncoding.EncodeToString(iv),
		KeyVersion:    "1", // Set initial version
		EncryptedAt:   time.Now(),
		KeyRotationDue: time.Now().Add(cfg.SecurityConfig.KeyRotationInterval),
	}

	if err := doc.SetEncryptionMetadata(metadata); err != nil {
		return nil, fmt.Errorf("failed to set encryption metadata: %w", err)
	}

	return bytes.NewReader(ciphertext), nil
}

// DecryptDocument decrypts document content using stored encryption metadata
func DecryptDocument(doc *models.Document, encryptedContent io.Reader, cfg *config.Config) (io.Reader, error) {
	if doc == nil || encryptedContent == nil || cfg == nil || doc.EncryptionInfo == nil {
		return nil, ErrInvalidInput
	}

	// Verify encryption metadata
	if err := doc.EncryptionInfo.Validate(); err != nil {
		return nil, fmt.Errorf("invalid encryption metadata: %w", err)
	}

	// Get decryption key from KMS
	key, _, err := getEncryptionKey(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to get decryption key: %w", err)
	}
	defer func() {
		// Zero out key material after use
		for i := range key {
			key[i] = 0
		}
	}()

	// Decode IV from metadata
	iv, err := base64.StdEncoding.DecodeString(doc.EncryptionInfo.IV)
	if err != nil {
		return nil, fmt.Errorf("failed to decode IV: %w", ErrInvalidMetadata)
	}

	// Create cipher block
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher block: %w", ErrDecryptionFailed)
	}

	// Create GCM cipher
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM cipher: %w", ErrDecryptionFailed)
	}

	// Read encrypted content
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, encryptedContent); err != nil {
		return nil, fmt.Errorf("failed to read encrypted content: %w", err)
	}

	// Decrypt content
	plaintext, err := gcm.Open(nil, iv, buf.Bytes(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt content: %w", ErrDecryptionFailed)
	}

	return bytes.NewReader(plaintext), nil
}

// generateIV generates a cryptographically secure random initialization vector
func generateIV() ([]byte, error) {
	iv := make([]byte, ivSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, fmt.Errorf("failed to generate IV: %w", err)
	}
	return iv, nil
}

// getEncryptionKey retrieves encryption key from AWS KMS with retries and caching
func getEncryptionKey(cfg *config.Config) ([]byte, string, error) {
	// Check key cache
	if cachedKey, ok := keyCache.Load(cfg.SecurityConfig.EncryptionKey); ok {
		keyData := cachedKey.(struct {
			key     []byte
			keyID   string
			expires time.Time
		})
		if time.Now().Before(keyData.expires) {
			return keyData.key, keyData.keyID, nil
		}
	}

	var (
		key    []byte
		keyID  string
		err    error
		client = kms.New(kms.Options{
			Region: "us-east-1", // Configure based on your requirements
		})
	)

	// Retry logic for KMS operations
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(retryBackoffBase << uint(attempt))
		}

		// Generate data key
		result, err := client.GenerateDataKey(cfg.SecurityConfig.EncryptionKey, &kms.GenerateDataKeyInput{
			KeyId:   &cfg.SecurityConfig.EncryptionKey,
			KeySpec: types.DataKeySpecAes256,
		})
		if err != nil {
			continue
		}

		key = result.Plaintext
		keyID = *result.KeyId
		break
	}

	if err != nil {
		return nil, "", fmt.Errorf("failed to generate data key after %d attempts: %w", maxRetries, err)
	}

	// Cache the key
	keyCache.Store(cfg.SecurityConfig.EncryptionKey, struct {
		key     []byte
		keyID   string
		expires time.Time
	}{
		key:     key,
		keyID:   keyID,
		expires: time.Now().Add(keyCacheTTL),
	})

	return key, keyID, nil
}