package com.austa.payment.exceptions;

/**
 * Exception thrown when a payment operation is invalid for the current state.
 */
public class InvalidPaymentStateException extends RuntimeException {

    public InvalidPaymentStateException(String message) {
        super(message);
    }

    public InvalidPaymentStateException(String message, Throwable cause) {
        super(message, cause);
    }
}
