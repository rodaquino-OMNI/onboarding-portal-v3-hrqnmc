package com.austa.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for PIX payment details.
 * PIX is Brazil's instant payment system regulated by the Central Bank of Brazil (BCB).
 *
 * <p>PIX Features:</p>
 * <ul>
 *   <li>Instant payment processing (< 10 seconds)</li>
 *   <li>Available 24/7, including weekends and holidays</li>
 *   <li>Lower transaction fees compared to traditional methods</li>
 *   <li>QR code or key-based payment initiation</li>
 * </ul>
 *
 * <p>PIX Key Types:</p>
 * <ul>
 *   <li>CPF: Individual taxpayer ID (11 digits)</li>
 *   <li>CNPJ: Business taxpayer ID (14 digits)</li>
 *   <li>Email: Valid email address</li>
 *   <li>Phone: Brazilian phone number (+55)</li>
 *   <li>Random: UUID-based random key</li>
 * </ul>
 *
 * <p>Security:</p>
 * <ul>
 *   <li>PIX keys are validated against BCB registry</li>
 *   <li>QR codes are time-limited (typically 30 minutes)</li>
 *   <li>Transaction requires 2FA from customer's bank</li>
 * </ul>
 *
 * @author AUSTA Development Team
 * @version 1.0.0
 * @since 2024-11-10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PixPaymentDTO {

    /**
     * PIX key of the recipient (AUSTA's account).
     * This is typically configured in the payment gateway settings.
     * Key types: CPF, CNPJ, Email, Phone, or Random.
     */
    @NotBlank(message = "PIX key is required")
    @Size(max = 255, message = "PIX key must not exceed 255 characters")
    @JsonProperty("pix_key")
    private String pixKey;

    /**
     * Type of PIX key.
     * Valid values: CPF, CNPJ, EMAIL, PHONE, RANDOM
     */
    @NotBlank(message = "PIX key type is required")
    @Pattern(regexp = "^(CPF|CNPJ|EMAIL|PHONE|RANDOM)$",
             message = "PIX key type must be CPF, CNPJ, EMAIL, PHONE, or RANDOM")
    @JsonProperty("pix_key_type")
    private String pixKeyType;

    /**
     * Customer's full name (payer).
     * Required for PIX transaction identification.
     */
    @NotBlank(message = "Payer name is required")
    @Size(min = 3, max = 100, message = "Payer name must be between 3 and 100 characters")
    @Pattern(regexp = "^[a-zA-ZÀ-ÿ\\s]+$", message = "Payer name must contain only letters and spaces")
    @JsonProperty("payer_name")
    private String payerName;

    /**
     * Customer's CPF (Brazilian taxpayer ID).
     * Required for individual payers.
     * Format: XXX.XXX.XXX-XX or XXXXXXXXXXX (11 digits)
     */
    @Pattern(regexp = "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$",
             message = "CPF must be in format XXX.XXX.XXX-XX or 11 digits")
    @JsonProperty("payer_cpf")
    private String payerCpf;

    /**
     * Customer's CNPJ (Brazilian business taxpayer ID).
     * Required for business payers.
     * Format: XX.XXX.XXX/XXXX-XX or XXXXXXXXXXXXXX (14 digits)
     */
    @Pattern(regexp = "^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$",
             message = "CNPJ must be in format XX.XXX.XXX/XXXX-XX or 14 digits")
    @JsonProperty("payer_cnpj")
    private String payerCnpj;

    /**
     * Customer's email for receipt.
     */
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    @JsonProperty("payer_email")
    private String payerEmail;

    /**
     * Customer's phone number for notifications.
     * Format: +55XXXXXXXXXXX (Brazilian format with country code)
     */
    @Pattern(regexp = "^\\+55\\d{10,11}$",
             message = "Phone must be in format +55XXXXXXXXXXX")
    @JsonProperty("payer_phone")
    private String payerPhone;

    /**
     * Payment description/message.
     * Appears in customer's bank statement.
     */
    @Size(max = 140, message = "Description must not exceed 140 characters")
    @JsonProperty("description")
    private String description;

    /**
     * QR code expiration time in minutes.
     * Typical values: 15, 30, 60 minutes.
     * Default: 30 minutes.
     */
    @Min(value = 5, message = "Expiration must be at least 5 minutes")
    @Max(value = 1440, message = "Expiration cannot exceed 1440 minutes (24 hours)")
    @JsonProperty("expiration_minutes")
    @Builder.Default
    private Integer expirationMinutes = 30;

    /**
     * Whether to generate QR code image.
     * If true, base64 encoded QR code image is returned.
     */
    @JsonProperty("generate_qr_image")
    @Builder.Default
    private Boolean generateQrImage = true;

    /**
     * Whether to generate PIX copy-paste code.
     * If true, text code for manual copy-paste is returned.
     */
    @JsonProperty("generate_copy_paste")
    @Builder.Default
    private Boolean generateCopyPaste = true;

    /**
     * Additional information field (up to 50 characters).
     * Optional field for additional payment details.
     */
    @Size(max = 50, message = "Additional info must not exceed 50 characters")
    @JsonProperty("additional_info")
    private String additionalInfo;

    /**
     * Merchant category code (for categorization).
     */
    @Pattern(regexp = "^\\d{4}$", message = "Merchant category code must be 4 digits")
    @JsonProperty("merchant_category_code")
    private String merchantCategoryCode;

    /**
     * Merchant city location.
     */
    @Size(max = 50, message = "Merchant city must not exceed 50 characters")
    @JsonProperty("merchant_city")
    private String merchantCity;

    /**
     * Validates that either CPF or CNPJ is provided.
     *
     * @return true if validation passes
     */
    @AssertTrue(message = "Either payer CPF or CNPJ must be provided")
    public boolean isTaxIdValid() {
        return (payerCpf != null && !payerCpf.isEmpty()) ||
               (payerCnpj != null && !payerCnpj.isEmpty());
    }

    /**
     * Gets sanitized CPF (digits only).
     *
     * @return CPF with only digits
     */
    public String getSanitizedCpf() {
        return payerCpf != null ? payerCpf.replaceAll("[^0-9]", "") : null;
    }

    /**
     * Gets sanitized CNPJ (digits only).
     *
     * @return CNPJ with only digits
     */
    public String getSanitizedCnpj() {
        return payerCnpj != null ? payerCnpj.replaceAll("[^0-9]", "") : null;
    }

    /**
     * Gets sanitized phone (digits only, without country code).
     *
     * @return Phone with only digits
     */
    public String getSanitizedPhone() {
        if (payerPhone == null) {
            return null;
        }
        // Remove +55 and keep only digits
        return payerPhone.replaceAll("[^0-9]", "").substring(2);
    }
}
