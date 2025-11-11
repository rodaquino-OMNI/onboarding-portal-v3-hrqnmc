package com.austa.payment.security;

import com.austa.payment.config.PaymentConfig;
import com.austa.payment.exceptions.PaymentAuthenticationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Webhook Signature Verifier
 *
 * Verifies webhook signatures from payment gateways to prevent:
 * - Unauthorized webhook calls
 * - Man-in-the-middle attacks
 * - Replay attacks
 *
 * Supported payment gateways:
 * - Stripe (HMAC-SHA256 with timestamp)
 * - Mercado Pago (HMAC-SHA256)
 * - PagSeguro (MD5 hash)
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
@Component
public class WebhookSignatureVerifier {

    private static final Logger logger = LoggerFactory.getLogger(WebhookSignatureVerifier.class);

    // Timestamp tolerance for replay attack prevention (5 minutes)
    private static final long TIMESTAMP_TOLERANCE = 300; // seconds

    @Autowired
    private PaymentConfig paymentConfig;

    /**
     * Verify Stripe webhook signature
     *
     * Stripe uses HMAC-SHA256 with versioned signatures
     * Format: t=timestamp,v1=signature
     *
     * @param payload Webhook payload
     * @param signatureHeader Stripe-Signature header value
     * @return true if signature is valid
     * @throws PaymentAuthenticationException if verification fails
     */
    public boolean verifyStripeSignature(String payload, String signatureHeader) {
        if (payload == null || signatureHeader == null) {
            throw new PaymentAuthenticationException("Missing payload or signature");
        }

        try {
            // Parse signature header
            String[] elements = signatureHeader.split(",");
            long timestamp = 0;
            String signature = null;

            for (String element : elements) {
                String[] keyValue = element.split("=");
                if (keyValue.length == 2) {
                    if ("t".equals(keyValue[0])) {
                        timestamp = Long.parseLong(keyValue[1]);
                    } else if ("v1".equals(keyValue[0])) {
                        signature = keyValue[1];
                    }
                }
            }

            if (timestamp == 0 || signature == null) {
                throw new PaymentAuthenticationException("Invalid Stripe signature format");
            }

            // Verify timestamp to prevent replay attacks
            long currentTime = System.currentTimeMillis() / 1000;
            if (Math.abs(currentTime - timestamp) > TIMESTAMP_TOLERANCE) {
                logger.warn("Stripe webhook timestamp outside tolerance: {} vs {}", timestamp, currentTime);
                throw new PaymentAuthenticationException("Webhook timestamp too old");
            }

            // Construct signed payload
            String signedPayload = timestamp + "." + payload;

            // Calculate expected signature
            String expectedSignature = computeHmacSha256(
                    signedPayload,
                    paymentConfig.getStripeWebhookSecret()
            );

            // Compare signatures (constant-time comparison)
            boolean valid = constantTimeEquals(signature, expectedSignature);

            if (!valid) {
                logger.warn("Stripe webhook signature verification failed");
            }

            return valid;

        } catch (Exception e) {
            logger.error("Stripe signature verification error", e);
            throw new PaymentAuthenticationException("Stripe signature verification failed", e);
        }
    }

    /**
     * Verify Mercado Pago webhook signature
     *
     * Mercado Pago uses HMAC-SHA256
     * Signature sent in x-signature header
     *
     * @param payload Webhook payload
     * @param signature x-signature header value
     * @return true if signature is valid
     * @throws PaymentAuthenticationException if verification fails
     */
    public boolean verifyMercadoPagoSignature(String payload, String signature) {
        if (payload == null || signature == null) {
            throw new PaymentAuthenticationException("Missing payload or signature");
        }

        try {
            // Calculate expected signature
            String expectedSignature = computeHmacSha256(
                    payload,
                    paymentConfig.getMercadoPagoWebhookSecret()
            );

            // Compare signatures
            boolean valid = constantTimeEquals(signature, expectedSignature);

            if (!valid) {
                logger.warn("Mercado Pago webhook signature verification failed");
            }

            return valid;

        } catch (Exception e) {
            logger.error("Mercado Pago signature verification error", e);
            throw new PaymentAuthenticationException("Mercado Pago signature verification failed", e);
        }
    }

    /**
     * Verify PagSeguro webhook signature
     *
     * PagSeguro uses MD5 hash
     * Signature sent in notificationCode parameter
     *
     * @param notificationCode Notification code from webhook
     * @param token PagSeguro token
     * @return true if signature is valid
     * @throws PaymentAuthenticationException if verification fails
     */
    public boolean verifyPagSeguroSignature(String notificationCode, String token) {
        if (notificationCode == null || token == null) {
            throw new PaymentAuthenticationException("Missing notification code or token");
        }

        try {
            // PagSeguro uses MD5 hash of notificationCode + token
            String dataToHash = notificationCode + paymentConfig.getPagSeguroWebhookSecret();
            String expectedHash = computeMd5(dataToHash);

            // Compare hashes
            boolean valid = constantTimeEquals(token, expectedHash);

            if (!valid) {
                logger.warn("PagSeguro webhook signature verification failed");
            }

            return valid;

        } catch (Exception e) {
            logger.error("PagSeguro signature verification error", e);
            throw new PaymentAuthenticationException("PagSeguro signature verification failed", e);
        }
    }

    /**
     * Verify generic HMAC-SHA256 signature
     *
     * @param payload Payload to verify
     * @param signature Provided signature
     * @param secret Secret key
     * @return true if signature is valid
     */
    public boolean verifyHmacSha256(String payload, String signature, String secret) {
        if (payload == null || signature == null || secret == null) {
            return false;
        }

        try {
            String expectedSignature = computeHmacSha256(payload, secret);
            return constantTimeEquals(signature, expectedSignature);
        } catch (Exception e) {
            logger.error("HMAC-SHA256 verification error", e);
            return false;
        }
    }

    /**
     * Compute HMAC-SHA256 signature
     *
     * @param data Data to sign
     * @param secret Secret key
     * @return Hex-encoded signature
     * @throws NoSuchAlgorithmException if algorithm not available
     * @throws InvalidKeyException if key is invalid
     */
    private String computeHmacSha256(String data, String secret)
            throws NoSuchAlgorithmException, InvalidKeyException {

        Mac hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        );
        hmac.init(secretKeySpec);

        byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hash);
    }

    /**
     * Compute MD5 hash
     *
     * @param data Data to hash
     * @return Hex-encoded hash
     * @throws NoSuchAlgorithmException if algorithm not available
     */
    private String computeMd5(String data) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hash);
    }

    /**
     * Convert byte array to hex string
     *
     * @param bytes Byte array
     * @return Hex string
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }

    /**
     * Constant-time string comparison to prevent timing attacks
     *
     * @param a First string
     * @param b Second string
     * @return true if strings are equal
     */
    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }

        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);

        if (aBytes.length != bBytes.length) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < aBytes.length; i++) {
            result |= aBytes[i] ^ bBytes[i];
        }

        return result == 0;
    }

    /**
     * Generate webhook signature for testing
     *
     * @param payload Payload to sign
     * @param secret Secret key
     * @return HMAC-SHA256 signature
     */
    public String generateTestSignature(String payload, String secret) {
        try {
            return computeHmacSha256(payload, secret);
        } catch (Exception e) {
            throw new PaymentAuthenticationException("Failed to generate test signature", e);
        }
    }

    /**
     * Generate Stripe-format signature for testing
     *
     * @param payload Payload to sign
     * @param secret Secret key
     * @return Stripe-format signature header
     */
    public String generateStripeTestSignature(String payload, String secret) {
        try {
            long timestamp = System.currentTimeMillis() / 1000;
            String signedPayload = timestamp + "." + payload;
            String signature = computeHmacSha256(signedPayload, secret);
            return "t=" + timestamp + ",v1=" + signature;
        } catch (Exception e) {
            throw new PaymentAuthenticationException("Failed to generate Stripe test signature", e);
        }
    }
}
