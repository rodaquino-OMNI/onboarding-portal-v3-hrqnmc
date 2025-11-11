package com.austa.payment.utils;

import com.austa.payment.exceptions.PaymentEncryptionException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * PCI-DSS Compliant Encryption Utility
 *
 * Implements AES-256-GCM encryption for sensitive payment data:
 * - Card tokens
 * - Payment metadata
 * - Customer sensitive information
 *
 * Features:
 * - AES-256 encryption
 * - GCM mode for authenticated encryption
 * - Secure random IV generation
 * - Key rotation support
 *
 * PCI-DSS Requirements:
 * - Requirement 3: Protect stored cardholder data
 * - Requirement 4: Encrypt transmission of cardholder data
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
@Component
public class EncryptionUtil {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits
    private static final int GCM_TAG_LENGTH = 128; // 128 bits

    @Value("${encryption.key}")
    private String encryptionKey;

    @Value("${encryption.key-rotation-enabled:false}")
    private boolean keyRotationEnabled;

    private final SecureRandom secureRandom;

    public EncryptionUtil() {
        this.secureRandom = new SecureRandom();
    }

    /**
     * Encrypt sensitive data using AES-256-GCM
     *
     * @param plainText Data to encrypt
     * @return Base64 encoded encrypted data (IV + ciphertext + tag)
     * @throws PaymentEncryptionException if encryption fails
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) {
            throw new PaymentEncryptionException("Cannot encrypt null or empty data");
        }

        try {
            // Generate random IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            // Get secret key
            SecretKey secretKey = getSecretKey();

            // Initialize cipher
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            // Encrypt data
            byte[] plainTextBytes = plainText.getBytes(StandardCharsets.UTF_8);
            byte[] cipherText = cipher.doFinal(plainTextBytes);

            // Combine IV + ciphertext
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherText);

            // Encode to Base64
            return Base64.getEncoder().encodeToString(byteBuffer.array());

        } catch (Exception e) {
            throw new PaymentEncryptionException("Encryption failed", e);
        }
    }

    /**
     * Decrypt encrypted data using AES-256-GCM
     *
     * @param encryptedText Base64 encoded encrypted data
     * @return Decrypted plain text
     * @throws PaymentEncryptionException if decryption fails
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) {
            throw new PaymentEncryptionException("Cannot decrypt null or empty data");
        }

        try {
            // Decode from Base64
            byte[] decodedBytes = Base64.getDecoder().decode(encryptedText);

            // Extract IV and ciphertext
            ByteBuffer byteBuffer = ByteBuffer.wrap(decodedBytes);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);
            byte[] cipherText = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherText);

            // Get secret key
            SecretKey secretKey = getSecretKey();

            // Initialize cipher
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            // Decrypt data
            byte[] plainTextBytes = cipher.doFinal(cipherText);

            return new String(plainTextBytes, StandardCharsets.UTF_8);

        } catch (Exception e) {
            throw new PaymentEncryptionException("Decryption failed", e);
        }
    }

    /**
     * Encrypt card token for PCI-DSS compliance
     *
     * Card tokens should be encrypted at rest
     *
     * @param cardToken Card token from payment gateway
     * @return Encrypted card token
     */
    public String encryptCardToken(String cardToken) {
        if (cardToken == null || cardToken.isEmpty()) {
            throw new PaymentEncryptionException("Card token cannot be null or empty");
        }

        // Add prefix to identify encrypted card tokens
        String encrypted = encrypt(cardToken);
        return "enc_card_" + encrypted;
    }

    /**
     * Decrypt card token
     *
     * @param encryptedCardToken Encrypted card token
     * @return Decrypted card token
     */
    public String decryptCardToken(String encryptedCardToken) {
        if (encryptedCardToken == null || !encryptedCardToken.startsWith("enc_card_")) {
            throw new PaymentEncryptionException("Invalid encrypted card token format");
        }

        // Remove prefix
        String encryptedData = encryptedCardToken.substring("enc_card_".length());
        return decrypt(encryptedData);
    }

    /**
     * Encrypt payment metadata (customer info, addresses, etc.)
     *
     * @param metadata Sensitive metadata as JSON or string
     * @return Encrypted metadata
     */
    public String encryptMetadata(String metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }

        String encrypted = encrypt(metadata);
        return "enc_meta_" + encrypted;
    }

    /**
     * Decrypt payment metadata
     *
     * @param encryptedMetadata Encrypted metadata
     * @return Decrypted metadata
     */
    public String decryptMetadata(String encryptedMetadata) {
        if (encryptedMetadata == null || !encryptedMetadata.startsWith("enc_meta_")) {
            throw new PaymentEncryptionException("Invalid encrypted metadata format");
        }

        String encryptedData = encryptedMetadata.substring("enc_meta_".length());
        return decrypt(encryptedData);
    }

    /**
     * Generate new encryption key for key rotation
     *
     * @return Base64 encoded new key
     * @throws PaymentEncryptionException if key generation fails
     */
    public String generateNewKey() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(ALGORITHM);
            keyGenerator.init(256, secureRandom);
            SecretKey secretKey = keyGenerator.generateKey();
            return Base64.getEncoder().encodeToString(secretKey.getEncoded());
        } catch (Exception e) {
            throw new PaymentEncryptionException("Key generation failed", e);
        }
    }

    /**
     * Re-encrypt data with new key (for key rotation)
     *
     * @param encryptedData Data encrypted with old key
     * @param oldKey Old encryption key
     * @param newKey New encryption key
     * @return Data encrypted with new key
     */
    public String reEncryptWithNewKey(String encryptedData, String oldKey, String newKey) {
        if (!keyRotationEnabled) {
            throw new PaymentEncryptionException("Key rotation is not enabled");
        }

        try {
            // Temporarily use old key to decrypt
            String originalKey = this.encryptionKey;
            this.encryptionKey = oldKey;
            String plainText = decrypt(encryptedData);

            // Use new key to encrypt
            this.encryptionKey = newKey;
            String reEncrypted = encrypt(plainText);

            // Restore original key
            this.encryptionKey = originalKey;

            return reEncrypted;

        } catch (Exception e) {
            throw new PaymentEncryptionException("Re-encryption failed during key rotation", e);
        }
    }

    /**
     * Get secret key from configuration
     *
     * @return SecretKey instance
     */
    private SecretKey getSecretKey() {
        byte[] decodedKey = Base64.getDecoder().decode(encryptionKey);
        return new SecretKeySpec(decodedKey, 0, decodedKey.length, ALGORITHM);
    }

    /**
     * Validate encryption key format and strength
     *
     * @param key Key to validate
     * @return true if valid
     */
    public boolean validateKey(String key) {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(key);
            // AES-256 requires 32 bytes (256 bits)
            return decodedKey.length == 32;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Hash sensitive data for comparison (one-way)
     * Used for idempotency keys
     *
     * @param data Data to hash
     * @return Base64 encoded hash
     */
    public String hashForComparison(String data) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new PaymentEncryptionException("Hashing failed", e);
        }
    }
}
