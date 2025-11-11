package com.austa.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Data Transfer Object for payment refund request.
 *
 * @author AUSTA Development Team
 * @version 1.0.0
 * @since 2024-11-10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequest {

    @NotNull(message = "Payment ID is required")
    @JsonProperty("payment_id")
    private UUID paymentId;

    @DecimalMin(value = "0.01", message = "Refund amount must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Invalid refund amount format")
    @JsonProperty("refund_amount")
    private BigDecimal refundAmount;

    @NotBlank(message = "Refund reason is required")
    @Pattern(regexp = "^(CUSTOMER_REQUEST|DUPLICATE_PAYMENT|FRAUD|SERVICE_NOT_PROVIDED|POLICY_CANCELLED|OVERCHARGE|PROCESSING_ERROR|OTHER)$",
             message = "Invalid refund reason category")
    @JsonProperty("reason")
    private String reason;

    @Size(max = 1000, message = "Refund notes must not exceed 1000 characters")
    @JsonProperty("notes")
    private String notes;

    @NotBlank(message = "Requester ID is required")
    @Size(max = 100, message = "Requester ID must not exceed 100 characters")
    @JsonProperty("requested_by")
    private String requestedBy;

    @JsonProperty("notify_customer")
    @Builder.Default
    private Boolean notifyCustomer = true;

    @Size(max = 100, message = "Reference number must not exceed 100 characters")
    @JsonProperty("reference_number")
    private String referenceNumber;

    @JsonProperty("force_refund")
    @Builder.Default
    private Boolean forceRefund = false;

    @Pattern(regexp = "^https?://.*", message = "Callback URL must be a valid HTTP/HTTPS URL")
    @JsonProperty("callback_url")
    private String callbackUrl;

    @Size(max = 100, message = "Idempotency key must not exceed 100 characters")
    @JsonProperty("idempotency_key")
    private String idempotencyKey;

    @AssertTrue(message = "Detailed notes are required when refund reason is OTHER")
    public boolean isNotesRequiredForOther() {
        if ("OTHER".equals(reason)) {
            return notes != null && !notes.trim().isEmpty() && notes.length() >= 10;
        }
        return true;
    }

    public boolean isFullRefund() {
        return refundAmount == null;
    }

    public String getReasonDisplayText() {
        if (reason == null) {
            return "Unknown";
        }

        switch (reason) {
            case "CUSTOMER_REQUEST":
                return "Customer Request";
            case "DUPLICATE_PAYMENT":
                return "Duplicate Payment";
            case "FRAUD":
                return "Fraudulent Transaction";
            case "SERVICE_NOT_PROVIDED":
                return "Service Not Provided";
            case "POLICY_CANCELLED":
                return "Policy Cancelled";
            case "OVERCHARGE":
                return "Customer Overcharged";
            case "PROCESSING_ERROR":
                return "Processing Error";
            case "OTHER":
                return "Other Reason";
            default:
                return reason;
        }
    }

    public boolean isFraudRelated() {
        return "FRAUD".equals(reason);
    }

    public boolean isSystemError() {
        return "PROCESSING_ERROR".equals(reason) || "DUPLICATE_PAYMENT".equals(reason);
    }
}
