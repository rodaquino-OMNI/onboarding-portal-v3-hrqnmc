package com.austa.payment.dto;

import com.austa.payment.models.PaymentMethod;
import com.austa.payment.models.PaymentStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Data Transfer Object for payment webhook notifications.
 * Used to notify external systems about payment status changes.
 *
 * <p>Webhook Events:</p>
 * <ul>
 *   <li>payment.created - Payment initiated</li>
 *   <li>payment.processing - Payment being processed</li>
 *   <li>payment.completed - Payment successfully completed</li>
 *   <li>payment.failed - Payment failed</li>
 *   <li>payment.refunded - Payment refunded</li>
 *   <li>payment.cancelled - Payment cancelled</li>
 * </ul>
 *
 * <p>Security:</p>
 * <ul>
 *   <li>Webhooks should be signed using HMAC-SHA256</li>
 *   <li>Receiving endpoint should verify signature</li>
 *   <li>Sensitive data is masked or excluded</li>
 *   <li>Webhook delivery should be idempotent</li>
 * </ul>
 *
 * <p>Delivery:</p>
 * <ul>
 *   <li>Sent via HTTPS POST to registered callback URL</li>
 *   <li>Retried up to 5 times with exponential backoff</li>
 *   <li>Requires 2xx response code for success</li>
 *   <li>Timeout: 30 seconds</li>
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PaymentWebhookDTO {

    /**
     * Webhook event unique identifier.
     * Used for deduplication and tracking.
     */
    @JsonProperty("event_id")
    private UUID eventId;

    /**
     * Webhook event type.
     * Examples: payment.created, payment.completed, payment.failed
     */
    @JsonProperty("event_type")
    private String eventType;

    /**
     * Timestamp when event occurred.
     */
    @JsonProperty("event_timestamp")
    private LocalDateTime eventTimestamp;

    /**
     * Webhook API version.
     * Allows for version-specific handling.
     */
    @JsonProperty("api_version")
    @Builder.Default
    private String apiVersion = "1.0";

    /**
     * Environment (production, sandbox).
     */
    @JsonProperty("environment")
    private String environment;

    /**
     * Payment data embedded in webhook.
     */
    @JsonProperty("payment")
    private PaymentWebhookData payment;

    /**
     * Previous payment status (for state change events).
     */
    @JsonProperty("previous_status")
    private PaymentStatus previousStatus;

    /**
     * Signature for webhook verification.
     * Computed using HMAC-SHA256 with shared secret.
     */
    @JsonProperty("signature")
    private String signature;

    /**
     * Webhook delivery attempt number.
     */
    @JsonProperty("attempt")
    @Builder.Default
    private Integer attempt = 1;

    /**
     * Additional metadata for the event.
     */
    @JsonProperty("metadata")
    private Map<String, String> metadata;

    /**
     * Nested class for payment data in webhook.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PaymentWebhookData {

        /**
         * Payment unique identifier.
         */
        @JsonProperty("id")
        private UUID id;

        /**
         * Masked policy number.
         */
        @JsonProperty("policy_number")
        private String policyNumber;

        /**
         * Masked beneficiary ID.
         */
        @JsonProperty("beneficiary_id")
        private String beneficiaryId;

        /**
         * Payment method.
         */
        @JsonProperty("payment_method")
        private PaymentMethod paymentMethod;

        /**
         * Current payment status.
         */
        @JsonProperty("status")
        private PaymentStatus status;

        /**
         * Payment amount.
         */
        @JsonProperty("amount")
        private BigDecimal amount;

        /**
         * Currency code.
         */
        @JsonProperty("currency")
        private String currency;

        /**
         * Masked transaction ID from gateway.
         */
        @JsonProperty("transaction_id")
        private String transactionId;

        /**
         * Payment creation timestamp.
         */
        @JsonProperty("created_at")
        private LocalDateTime createdAt;

        /**
         * Payment completion timestamp.
         */
        @JsonProperty("paid_at")
        private LocalDateTime paidAt;

        /**
         * Last update timestamp.
         */
        @JsonProperty("updated_at")
        private LocalDateTime updatedAt;

        /**
         * Failure reason (if status is FAILED).
         */
        @JsonProperty("failure_reason")
        private String failureReason;

        /**
         * Failure code from payment gateway.
         */
        @JsonProperty("failure_code")
        private String failureCode;

        /**
         * Refund information (if status is REFUNDED).
         */
        @JsonProperty("refund_data")
        private RefundData refundData;

        /**
         * Payment gateway name.
         */
        @JsonProperty("payment_gateway")
        private String paymentGateway;

        /**
         * Last 4 digits of card (for card payments).
         */
        @JsonProperty("card_last_4")
        private String cardLast4;

        /**
         * Card brand (for card payments).
         */
        @JsonProperty("card_brand")
        private String cardBrand;

        /**
         * Number of installments (for credit card payments).
         */
        @JsonProperty("installments")
        private Integer installments;

        /**
         * Payment description.
         */
        @JsonProperty("description")
        private String description;
    }

    /**
     * Nested class for refund data in webhook.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class RefundData {

        /**
         * Refund unique identifier.
         */
        @JsonProperty("refund_id")
        private UUID refundId;

        /**
         * Refunded amount.
         */
        @JsonProperty("refund_amount")
        private BigDecimal refundAmount;

        /**
         * Refund reason.
         */
        @JsonProperty("refund_reason")
        private String refundReason;

        /**
         * Refund timestamp.
         */
        @JsonProperty("refunded_at")
        private LocalDateTime refundedAt;

        /**
         * Refund transaction ID from gateway.
         */
        @JsonProperty("refund_transaction_id")
        private String refundTransactionId;

        /**
         * Whether refund is partial or full.
         */
        @JsonProperty("is_partial")
        private Boolean isPartial;
    }

    /**
     * Creates webhook DTO from payment entity.
     *
     * @param payment Payment entity
     * @param eventType Event type
     * @param previousStatus Previous payment status
     * @return PaymentWebhookDTO
     */
    public static PaymentWebhookDTO fromPayment(
            com.austa.payment.models.Payment payment,
            String eventType,
            PaymentStatus previousStatus) {

        PaymentWebhookData paymentData = PaymentWebhookData.builder()
                .id(payment.getId())
                .policyNumber(payment.getMaskedPolicyNumber())
                .beneficiaryId(maskBeneficiaryId(payment.getBeneficiaryId()))
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .transactionId(payment.getMaskedTransactionId())
                .createdAt(payment.getCreatedAt())
                .paidAt(payment.getPaidAt())
                .updatedAt(payment.getUpdatedAt())
                .build();

        return PaymentWebhookDTO.builder()
                .eventId(UUID.randomUUID())
                .eventType(eventType)
                .eventTimestamp(LocalDateTime.now())
                .apiVersion("1.0")
                .payment(paymentData)
                .previousStatus(previousStatus)
                .build();
    }

    /**
     * Masks beneficiary ID for security.
     *
     * @param beneficiaryId Original beneficiary ID
     * @return Masked beneficiary ID
     */
    private static String maskBeneficiaryId(String beneficiaryId) {
        if (beneficiaryId == null || beneficiaryId.length() <= 4) {
            return "****";
        }
        return "****" + beneficiaryId.substring(beneficiaryId.length() - 4);
    }

    /**
     * Generates event type from payment status.
     *
     * @param status Payment status
     * @return Event type string
     */
    public static String eventTypeFromStatus(PaymentStatus status) {
        if (status == null) {
            return "payment.unknown";
        }

        switch (status) {
            case PENDING:
                return "payment.created";
            case PROCESSING:
                return "payment.processing";
            case COMPLETED:
                return "payment.completed";
            case FAILED:
                return "payment.failed";
            case REFUNDED:
                return "payment.refunded";
            case CANCELLED:
                return "payment.cancelled";
            default:
                return "payment.unknown";
        }
    }
}
