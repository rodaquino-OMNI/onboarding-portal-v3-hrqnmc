package com.austa.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Data Transfer Object for Boleto Bancário payment details.
 * Boleto is a traditional Brazilian payment method used for bill payments.
 *
 * <p>Boleto Features:</p>
 * <ul>
 *   <li>Cash payment at banks, lottery outlets, or online banking</li>
 *   <li>47-digit barcode for payment processing</li>
 *   <li>Typically 3-day due date from generation</li>
 *   <li>Can include fines and interest for late payment</li>
 *   <li>Widely accepted across Brazil</li>
 * </ul>
 *
 * <p>Processing Timeline:</p>
 * <ul>
 *   <li>Generation: Instant</li>
 *   <li>Payment: Can be paid until due date</li>
 *   <li>Confirmation: 1-2 business days after payment</li>
 *   <li>Late Payment: May include additional fees</li>
 * </ul>
 *
 * <p>Regulations:</p>
 * <ul>
 *   <li>Governed by Brazilian Banking Federation (FEBRABAN)</li>
 *   <li>Must include payer identification (CPF/CNPJ)</li>
 *   <li>Standardized format for all Brazilian banks</li>
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
public class BoletoPaymentDTO {

    /**
     * Payer's full name.
     * Must match identification document.
     */
    @NotBlank(message = "Payer name is required")
    @Size(min = 3, max = 100, message = "Payer name must be between 3 and 100 characters")
    @Pattern(regexp = "^[a-zA-ZÀ-ÿ\\s]+$", message = "Payer name must contain only letters and spaces")
    @JsonProperty("payer_name")
    private String payerName;

    /**
     * Payer's CPF (Brazilian taxpayer ID for individuals).
     * Required for individual payers.
     * Format: XXX.XXX.XXX-XX or XXXXXXXXXXX
     */
    @Pattern(regexp = "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$",
             message = "CPF must be in format XXX.XXX.XXX-XX or 11 digits")
    @JsonProperty("payer_cpf")
    private String payerCpf;

    /**
     * Payer's CNPJ (Brazilian taxpayer ID for businesses).
     * Required for business payers.
     * Format: XX.XXX.XXX/XXXX-XX or XXXXXXXXXXXXXX
     */
    @Pattern(regexp = "^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$",
             message = "CNPJ must be in format XX.XXX.XXX/XXXX-XX or 14 digits")
    @JsonProperty("payer_cnpj")
    private String payerCnpj;

    /**
     * Payer's email for boleto delivery and notifications.
     */
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    @JsonProperty("payer_email")
    private String payerEmail;

    /**
     * Payer's phone number for notifications.
     * Format: +55XXXXXXXXXXX (Brazilian format)
     */
    @Pattern(regexp = "^\\+55\\d{10,11}$",
             message = "Phone must be in format +55XXXXXXXXXXX")
    @JsonProperty("payer_phone")
    private String payerPhone;

    /**
     * Payer's address - street and number.
     */
    @NotBlank(message = "Address is required")
    @Size(max = 200, message = "Address must not exceed 200 characters")
    @JsonProperty("address")
    private String address;

    /**
     * Payer's address - complement/apartment.
     */
    @Size(max = 100, message = "Address complement must not exceed 100 characters")
    @JsonProperty("address_complement")
    private String addressComplement;

    /**
     * Payer's address - neighborhood.
     */
    @NotBlank(message = "Neighborhood is required")
    @Size(max = 100, message = "Neighborhood must not exceed 100 characters")
    @JsonProperty("neighborhood")
    private String neighborhood;

    /**
     * Payer's address - city.
     */
    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    @JsonProperty("city")
    private String city;

    /**
     * Payer's address - state (2-letter code).
     * Examples: SP (São Paulo), RJ (Rio de Janeiro), MG (Minas Gerais)
     */
    @NotBlank(message = "State is required")
    @Pattern(regexp = "^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$",
             message = "Invalid Brazilian state code")
    @JsonProperty("state")
    private String state;

    /**
     * Payer's address - ZIP code (CEP).
     * Format: XXXXX-XXX or XXXXXXXX
     */
    @NotBlank(message = "ZIP code is required")
    @Pattern(regexp = "^\\d{5}-?\\d{3}$", message = "ZIP code must be in format XXXXX-XXX or 8 digits")
    @JsonProperty("zip_code")
    private String zipCode;

    /**
     * Boleto due date.
     * Typically 3 days from generation date.
     * Cannot be in the past.
     */
    @Future(message = "Due date must be in the future")
    @JsonProperty("due_date")
    private LocalDate dueDate;

    /**
     * Number of days until due date.
     * Used if dueDate is not specified.
     * Default: 3 days.
     */
    @Min(value = 1, message = "Days until due date must be at least 1")
    @Max(value = 90, message = "Days until due date cannot exceed 90")
    @JsonProperty("days_until_due")
    @Builder.Default
    private Integer daysUntilDue = 3;

    /**
     * Fine percentage for late payment.
     * Applied after due date.
     * Format: Percentage (e.g., 2.0 = 2%)
     */
    @DecimalMin(value = "0.0", message = "Fine percentage cannot be negative")
    @DecimalMax(value = "20.0", message = "Fine percentage cannot exceed 20%")
    @JsonProperty("fine_percentage")
    @Builder.Default
    private Double finePercentage = 2.0;

    /**
     * Daily interest rate for late payment.
     * Applied per day after due date.
     * Format: Percentage per day (e.g., 0.033 = 0.033% per day = 1% per month)
     */
    @DecimalMin(value = "0.0", message = "Interest rate cannot be negative")
    @DecimalMax(value = "1.0", message = "Interest rate cannot exceed 1% per day")
    @JsonProperty("interest_rate_per_day")
    @Builder.Default
    private Double interestRatePerDay = 0.033;

    /**
     * Payment instructions to display on boleto.
     * Maximum 200 characters per line, up to 4 lines.
     */
    @Size(max = 800, message = "Instructions must not exceed 800 characters")
    @JsonProperty("instructions")
    private String instructions;

    /**
     * Demonstrative information (itemized charges).
     * Appears on boleto for transparency.
     */
    @Size(max = 500, message = "Demonstrative must not exceed 500 characters")
    @JsonProperty("demonstrative")
    private String demonstrative;

    /**
     * Merchant/beneficiary identification shown on boleto.
     */
    @Size(max = 100, message = "Merchant name must not exceed 100 characters")
    @JsonProperty("merchant_name")
    private String merchantName;

    /**
     * Whether to send boleto via email immediately.
     */
    @JsonProperty("send_email")
    @Builder.Default
    private Boolean sendEmail = true;

    /**
     * Whether to generate boleto PDF.
     */
    @JsonProperty("generate_pdf")
    @Builder.Default
    private Boolean generatePdf = true;

    /**
     * Whether boleto can be paid after due date.
     */
    @JsonProperty("allow_late_payment")
    @Builder.Default
    private Boolean allowLatePayment = true;

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
     * Validates that either dueDate or daysUntilDue is provided.
     *
     * @return true if validation passes
     */
    @AssertTrue(message = "Either due date or days until due must be provided")
    public boolean isDueDateValid() {
        return dueDate != null || daysUntilDue != null;
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
     * Gets sanitized ZIP code (digits only).
     *
     * @return ZIP code with only digits
     */
    public String getSanitizedZipCode() {
        return zipCode != null ? zipCode.replaceAll("[^0-9]", "") : null;
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
        return payerPhone.replaceAll("[^0-9]", "").substring(2);
    }

    /**
     * Calculates effective due date.
     *
     * @return Due date (either specified or calculated from daysUntilDue)
     */
    public LocalDate getEffectiveDueDate() {
        if (dueDate != null) {
            return dueDate;
        }
        if (daysUntilDue != null) {
            return LocalDate.now().plusDays(daysUntilDue);
        }
        return LocalDate.now().plusDays(3); // Default 3 days
    }
}
