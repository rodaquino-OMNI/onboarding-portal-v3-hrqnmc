package com.austa.payment.exceptions;

/**
 * Exception thrown when payment amount is invalid.
 */
public class InvalidPaymentAmountException extends RuntimeException {

    public InvalidPaymentAmountException(String message) {
        super(message);
    }

    public InvalidPaymentAmountException(String message, Throwable cause) {
        super(message, cause);
    }
}
