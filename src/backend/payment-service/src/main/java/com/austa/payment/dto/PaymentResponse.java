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
 * Data Transfer Object for payment response.
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
public class PaymentResponse {

    @JsonProperty("id")
    private UUID id;

    @JsonProperty("policy_number")
    private String policyNumber;

    @JsonProperty("beneficiary_id")
    private String beneficiaryId;

    @JsonProperty("payment_method")
    private PaymentMethod paymentMethod;

    @JsonProperty("status")
    private PaymentStatus status;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("transaction_id")
    private String transactionId;

    @JsonProperty("pix_qr_code")
    private String pixQrCode;

    @JsonProperty("pix_copy_paste")
    private String pixCopyPaste;

    @JsonProperty("boleto_barcode")
    private String boletoBarcode;

    @JsonProperty("boleto_pdf_url")
    private String boletoPdfUrl;

    @JsonProperty("due_date")
    private LocalDateTime dueDate;

    @JsonProperty("paid_at")
    private LocalDateTime paidAt;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    @JsonProperty("card_last_4")
    private String cardLast4;

    @JsonProperty("card_brand")
    private String cardBrand;

    @JsonProperty("installments")
    private Integer installments;

    @JsonProperty("installment_amount")
    private BigDecimal installmentAmount;

    @JsonProperty("failure_reason")
    private String failureReason;

    @JsonProperty("failure_code")
    private String failureCode;

    @JsonProperty("refundable")
    private Boolean refundable;

    @JsonProperty("amount_refunded")
    private BigDecimal amountRefunded;

    @JsonProperty("metadata")
    private Map<String, String> metadata;

    @JsonProperty("payment_gateway")
    private String paymentGateway;

    @JsonProperty("description")
    private String description;

    @JsonProperty("receipt_url")
    private String receiptUrl;

    @JsonProperty("status_message")
    private String statusMessage;

    @JsonProperty("next_action")
    private String nextAction;

    @JsonProperty("expires_at")
    private LocalDateTime expiresAt;

    @JsonProperty("is_expired")
    private Boolean isExpired;

    @JsonProperty("estimated_processing_days")
    private Integer estimatedProcessingDays;

    public static PaymentResponse fromEntity(com.austa.payment.models.Payment payment) {
        if (payment == null) {
            return null;
        }

        return PaymentResponse.builder()
                .id(payment.getId())
                .policyNumber(payment.getMaskedPolicyNumber())
                .beneficiaryId(maskBeneficiaryId(payment.getBeneficiaryId()))
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .transactionId(payment.getMaskedTransactionId())
                .dueDate(payment.getDueDate())
                .paidAt(payment.getPaidAt())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .refundable(payment.canRefund())
                .isExpired(payment.isExpired())
                .estimatedProcessingDays(payment.getPaymentMethod() != null ?
                        payment.getPaymentMethod().getAverageProcessingDays() : null)
                .build();
    }

    private static String maskBeneficiaryId(String beneficiaryId) {
        if (beneficiaryId == null || beneficiaryId.length() <= 4) {
            return "****";
        }
        return "****" + beneficiaryId.substring(beneficiaryId.length() - 4);
    }
}
