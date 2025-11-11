package com.austa.payment.dto;

import com.austa.payment.models.PaymentMethod;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Data Transfer Object for creating a new payment transaction.
 *
 * @author AUSTA Development Team
 * @version 1.0.0
 * @since 2024-11-10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {

    @NotBlank(message = "Policy number is required")
    @Size(max = 50, message = "Policy number must not exceed 50 characters")
    @JsonProperty("policy_number")
    private String policyNumber;

    @NotBlank(message = "Beneficiary ID is required")
    @Size(max = 50, message = "Beneficiary ID must not exceed 50 characters")
    @JsonProperty("beneficiary_id")
    private String beneficiaryId;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
    @DecimalMax(value = "999999999.99", message = "Payment amount exceeds maximum allowed")
    @Digits(integer = 10, fraction = 2, message = "Invalid amount format")
    @JsonProperty("amount")
    private BigDecimal amount;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter ISO code")
    @JsonProperty("currency")
    @Builder.Default
    private String currency = "BRL";

    @NotNull(message = "Payment method is required")
    @JsonProperty("payment_method")
    private PaymentMethod paymentMethod;

    @Valid
    @JsonProperty("pix_payment")
    private PixPaymentDTO pixPayment;

    @Valid
    @JsonProperty("credit_card_payment")
    private CreditCardPaymentDTO creditCardPayment;

    @Valid
    @JsonProperty("boleto_payment")
    private BoletoPaymentDTO boletoPayment;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    @JsonProperty("description")
    private String description;

    @Pattern(regexp = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$",
             message = "Invalid IP address format")
    @JsonProperty("customer_ip")
    private String customerIp;

    @JsonProperty("metadata")
    private Map<String, String> metadata;

    @Min(value = 1, message = "Installments must be at least 1")
    @Max(value = 12, message = "Installments cannot exceed 12")
    @JsonProperty("installments")
    @Builder.Default
    private Integer installments = 1;

    @JsonProperty("send_email")
    @Builder.Default
    private Boolean sendEmail = true;

    @JsonProperty("send_sms")
    @Builder.Default
    private Boolean sendSms = false;

    @Pattern(regexp = "^https?://.*", message = "Callback URL must be a valid HTTP/HTTPS URL")
    @JsonProperty("callback_url")
    private String callbackUrl;

    @AssertTrue(message = "Payment method specific data is required")
    public boolean isPaymentMethodDataValid() {
        if (paymentMethod == null) {
            return false;
        }

        switch (paymentMethod) {
            case PIX:
                return pixPayment != null;
            case CREDIT_CARD:
            case DEBIT_CARD:
                return creditCardPayment != null;
            case BOLETO:
                return boletoPayment != null;
            case BANK_TRANSFER:
            case WIRE_TRANSFER:
            case ACH:
            case CHECK:
            case CASH:
            case OTHER:
                return true;
            default:
                return false;
        }
    }

    @AssertTrue(message = "Installments can only be specified for credit card payments")
    public boolean isInstallmentsValid() {
        if (installments == null || installments == 1) {
            return true;
        }
        return paymentMethod == PaymentMethod.CREDIT_CARD;
    }
}
