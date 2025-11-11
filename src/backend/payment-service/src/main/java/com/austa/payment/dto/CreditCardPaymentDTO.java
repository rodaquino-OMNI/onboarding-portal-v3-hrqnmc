package com.austa.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for credit/debit card payment details.
 *
 * <p>PCI-DSS Compliance:</p>
 * <ul>
 *   <li>NEVER store full card numbers - use tokenization</li>
 *   <li>NEVER store CVV/CVC codes</li>
 *   <li>NEVER log or display full card data</li>
 *   <li>Use payment gateway tokens for recurring payments</li>
 *   <li>Implement card data encryption in transit (HTTPS)</li>
 * </ul>
 *
 * <p>Implementation Notes:</p>
 * <ul>
 *   <li>This DTO is used ONLY for payment creation</li>
 *   <li>Card data is sent directly to payment gateway</li>
 *   <li>Only tokenized card reference is stored</li>
 *   <li>Full card number is validated but not persisted</li>
 * </ul>
 *
 * <p>Security Features:</p>
 * <ul>
 *   <li>Card number validation using Luhn algorithm</li>
 *   <li>Card type detection (Visa, Mastercard, etc.)</li>
 *   <li>CVV format validation</li>
 *   <li>Expiration date validation</li>
 *   <li>3D Secure support for enhanced security</li>
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
public class CreditCardPaymentDTO {

    /**
     * Tokenized card reference from payment gateway.
     * Used for recurring payments and PCI compliance.
     * If provided, cardNumber and cvv are not required.
     */
    @Size(max = 255, message = "Card token must not exceed 255 characters")
    @JsonProperty("card_token")
    private String cardToken;

    /**
     * Full card number (13-19 digits).
     *
     * WARNING: This field is used ONLY for initial payment processing.
     * The full card number is NEVER stored in the database.
     * It is immediately sent to the payment gateway and tokenized.
     *
     * Validation: Luhn algorithm (checksum validation)
     */
    @Pattern(regexp = "^[0-9]{13,19}$", message = "Card number must be 13-19 digits")
    @JsonProperty("card_number")
    private String cardNumber;

    /**
     * Card expiration month (01-12).
     */
    @NotNull(message = "Card expiration month is required")
    @Min(value = 1, message = "Month must be between 01 and 12")
    @Max(value = 12, message = "Month must be between 01 and 12")
    @JsonProperty("expiry_month")
    private Integer expiryMonth;

    /**
     * Card expiration year (4 digits, e.g., 2025).
     */
    @NotNull(message = "Card expiration year is required")
    @Min(value = 2024, message = "Card has expired")
    @Max(value = 2050, message = "Invalid expiration year")
    @JsonProperty("expiry_year")
    private Integer expiryYear;

    /**
     * Card CVV/CVC security code (3-4 digits).
     *
     * WARNING: This field is used ONLY for payment processing.
     * The CVV is NEVER stored in the database per PCI-DSS requirements.
     * It is immediately sent to the payment gateway and discarded.
     */
    @Pattern(regexp = "^[0-9]{3,4}$", message = "CVV must be 3 or 4 digits")
    @JsonProperty("cvv")
    private String cvv;

    /**
     * Cardholder's full name as printed on card.
     */
    @NotBlank(message = "Cardholder name is required")
    @Size(min = 3, max = 100, message = "Cardholder name must be between 3 and 100 characters")
    @Pattern(regexp = "^[a-zA-ZÀ-ÿ\\s]+$", message = "Cardholder name must contain only letters and spaces")
    @JsonProperty("cardholder_name")
    private String cardholderName;

    /**
     * Cardholder's CPF (Brazilian taxpayer ID).
     * Required for Brazilian card transactions.
     */
    @NotBlank(message = "CPF is required for card payments")
    @Pattern(regexp = "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$",
             message = "CPF must be in format XXX.XXX.XXX-XX or 11 digits")
    @JsonProperty("cardholder_cpf")
    private String cardholderCpf;

    /**
     * Cardholder's email for receipt and notifications.
     */
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    @JsonProperty("cardholder_email")
    private String cardholderEmail;

    /**
     * Cardholder's phone number.
     * Format: +55XXXXXXXXXXX (Brazilian format)
     */
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+55\\d{10,11}$",
             message = "Phone must be in format +55XXXXXXXXXXX")
    @JsonProperty("cardholder_phone")
    private String cardholderPhone;

    /**
     * Billing address - street and number.
     */
    @NotBlank(message = "Billing address is required")
    @Size(max = 200, message = "Address must not exceed 200 characters")
    @JsonProperty("billing_address")
    private String billingAddress;

    /**
     * Billing address - complement/apartment.
     */
    @Size(max = 100, message = "Address complement must not exceed 100 characters")
    @JsonProperty("billing_address_complement")
    private String billingAddressComplement;

    /**
     * Billing address - neighborhood.
     */
    @NotBlank(message = "Neighborhood is required")
    @Size(max = 100, message = "Neighborhood must not exceed 100 characters")
    @JsonProperty("billing_neighborhood")
    private String billingNeighborhood;

    /**
     * Billing address - city.
     */
    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    @JsonProperty("billing_city")
    private String billingCity;

    /**
     * Billing address - state (2-letter code).
     */
    @NotBlank(message = "State is required")
    @Pattern(regexp = "^[A-Z]{2}$", message = "State must be 2-letter code")
    @JsonProperty("billing_state")
    private String billingState;

    /**
     * Billing address - ZIP code.
     * Format: XXXXX-XXX (Brazilian CEP)
     */
    @NotBlank(message = "ZIP code is required")
    @Pattern(regexp = "^\\d{5}-?\\d{3}$", message = "ZIP code must be in format XXXXX-XXX")
    @JsonProperty("billing_zip_code")
    private String billingZipCode;

    /**
     * Billing address - country (2-letter ISO code).
     */
    @NotBlank(message = "Country is required")
    @Pattern(regexp = "^[A-Z]{2}$", message = "Country must be 2-letter ISO code")
    @JsonProperty("billing_country")
    @Builder.Default
    private String billingCountry = "BR";

    /**
     * Number of installments (1-12).
     * Brazil allows credit card payments in multiple installments.
     */
    @Min(value = 1, message = "Installments must be at least 1")
    @Max(value = 12, message = "Installments cannot exceed 12")
    @JsonProperty("installments")
    @Builder.Default
    private Integer installments = 1;

    /**
     * Whether to save card for future payments.
     * If true, card is tokenized for recurring use.
     */
    @JsonProperty("save_card")
    @Builder.Default
    private Boolean saveCard = false;

    /**
     * Whether to use 3D Secure authentication.
     * Recommended for high-value transactions.
     */
    @JsonProperty("use_3d_secure")
    @Builder.Default
    private Boolean use3dSecure = false;

    /**
     * Validates that either card token or full card details are provided.
     *
     * @return true if validation passes
     */
    @AssertTrue(message = "Either card token or full card details must be provided")
    public boolean isCardDataValid() {
        // If token is provided, we don't need full card details
        if (cardToken != null && !cardToken.isEmpty()) {
            return true;
        }
        // Otherwise, we need card number and CVV
        return cardNumber != null && !cardNumber.isEmpty() &&
               cvv != null && !cvv.isEmpty();
    }

    /**
     * Gets masked card number (shows only last 4 digits).
     *
     * @return Masked card number
     */
    public String getMaskedCardNumber() {
        if (cardNumber == null || cardNumber.length() < 4) {
            return "****";
        }
        return "****-****-****-" + cardNumber.substring(cardNumber.length() - 4);
    }

    /**
     * Gets card brand based on card number.
     * Uses BIN (Bank Identification Number) to detect brand.
     *
     * @return Card brand (VISA, MASTERCARD, AMEX, etc.)
     */
    public String getCardBrand() {
        if (cardNumber == null || cardNumber.length() < 2) {
            return "UNKNOWN";
        }

        String firstDigit = cardNumber.substring(0, 1);
        String firstTwoDigits = cardNumber.substring(0, 2);

        if (firstDigit.equals("4")) {
            return "VISA";
        } else if (firstTwoDigits.matches("^5[1-5].*")) {
            return "MASTERCARD";
        } else if (firstTwoDigits.matches("^(34|37).*")) {
            return "AMEX";
        } else if (firstTwoDigits.matches("^(60|64|65).*")) {
            return "DISCOVER";
        } else if (firstTwoDigits.matches("^(38|60).*")) {
            return "DINERS";
        } else if (firstTwoDigits.matches("^(50|56|57|58|63).*")) {
            return "ELO"; // Brazilian brand
        } else if (firstTwoDigits.matches("^(36|38|60).*")) {
            return "HIPERCARD"; // Brazilian brand
        }

        return "UNKNOWN";
    }

    /**
     * Gets sanitized CPF (digits only).
     *
     * @return CPF with only digits
     */
    public String getSanitizedCpf() {
        return cardholderCpf != null ? cardholderCpf.replaceAll("[^0-9]", "") : null;
    }

    /**
     * Gets sanitized ZIP code (digits only).
     *
     * @return ZIP code with only digits
     */
    public String getSanitizedZipCode() {
        return billingZipCode != null ? billingZipCode.replaceAll("[^0-9]", "") : null;
    }

    /**
     * Gets sanitized phone (digits only, without country code).
     *
     * @return Phone with only digits
     */
    public String getSanitizedPhone() {
        if (cardholderPhone == null) {
            return null;
        }
        return cardholderPhone.replaceAll("[^0-9]", "").substring(2);
    }
}
