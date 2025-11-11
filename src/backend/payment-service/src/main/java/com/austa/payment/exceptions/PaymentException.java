package com.austa.payment.exceptions;

/**
 * Base exception class for all payment-related exceptions
 *
 * Provides error codes for standardized error handling
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
public class PaymentException extends RuntimeException {

    private final String errorCode;
    private final Object[] args;

    public PaymentException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.args = null;
    }

    public PaymentException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.args = null;
    }

    public PaymentException(String message, String errorCode, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.args = args;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Object[] getArgs() {
        return args;
    }
}

/**
 * Exception thrown when a payment is not found
 */
class PaymentNotFoundException extends PaymentException {
    public PaymentNotFoundException(String paymentId) {
        super("Payment not found: " + paymentId, "PAYMENT_NOT_FOUND", paymentId);
    }
}

/**
 * Exception thrown when a payment gateway operation fails
 */
class PaymentGatewayException extends PaymentException {
    public PaymentGatewayException(String message, String gateway) {
        super(message, "PAYMENT_GATEWAY_ERROR", gateway);
    }

    public PaymentGatewayException(String message, String gateway, Throwable cause) {
        super(message, "PAYMENT_GATEWAY_ERROR", cause);
    }
}

/**
 * Exception thrown when a payment status transition is invalid
 */
class InvalidPaymentStatusException extends PaymentException {
    public InvalidPaymentStatusException(String currentStatus, String targetStatus) {
        super(
                String.format("Invalid payment status transition from %s to %s", currentStatus, targetStatus),
                "INVALID_PAYMENT_STATUS",
                currentStatus,
                targetStatus
        );
    }
}

/**
 * Exception thrown when there are insufficient funds
 */
class InsufficientFundsException extends PaymentException {
    public InsufficientFundsException(String accountId, Double amount) {
        super(
                String.format("Insufficient funds in account %s for amount %.2f", accountId, amount),
                "INSUFFICIENT_FUNDS",
                accountId,
                amount
        );
    }
}

/**
 * Exception thrown when a refund is not allowed
 */
class RefundNotAllowedException extends PaymentException {
    public RefundNotAllowedException(String paymentId, String reason) {
        super(
                String.format("Refund not allowed for payment %s: %s", paymentId, reason),
                "REFUND_NOT_ALLOWED",
                paymentId,
                reason
        );
    }
}

/**
 * Exception thrown when a duplicate payment is detected
 */
class DuplicatePaymentException extends PaymentException {
    public DuplicatePaymentException(String idempotencyKey) {
        super(
                "Duplicate payment detected with idempotency key: " + idempotencyKey,
                "DUPLICATE_PAYMENT",
                idempotencyKey
        );
    }
}

/**
 * Exception thrown when payment amount validation fails
 */
class InvalidPaymentAmountException extends PaymentException {
    public InvalidPaymentAmountException(Double amount, Double minAmount, Double maxAmount) {
        super(
                String.format("Invalid payment amount %.2f. Must be between %.2f and %.2f", amount, minAmount, maxAmount),
                "INVALID_PAYMENT_AMOUNT",
                amount,
                minAmount,
                maxAmount
        );
    }
}

/**
 * Exception thrown when payment method is not supported
 */
class UnsupportedPaymentMethodException extends PaymentException {
    public UnsupportedPaymentMethodException(String paymentMethod, String policyType) {
        super(
                String.format("Payment method %s not supported for policy type %s", paymentMethod, policyType),
                "UNSUPPORTED_PAYMENT_METHOD",
                paymentMethod,
                policyType
        );
    }
}

/**
 * Exception thrown when payment authentication fails
 */
class PaymentAuthenticationException extends PaymentException {
    public PaymentAuthenticationException(String message) {
        super(message, "PAYMENT_AUTHENTICATION_FAILED");
    }

    public PaymentAuthenticationException(String message, Throwable cause) {
        super(message, "PAYMENT_AUTHENTICATION_FAILED", cause);
    }
}

/**
 * Exception thrown when payment encryption/decryption fails
 */
class PaymentEncryptionException extends PaymentException {
    public PaymentEncryptionException(String message) {
        super(message, "PAYMENT_ENCRYPTION_ERROR");
    }

    public PaymentEncryptionException(String message, Throwable cause) {
        super(message, "PAYMENT_ENCRYPTION_ERROR", cause);
    }
}
