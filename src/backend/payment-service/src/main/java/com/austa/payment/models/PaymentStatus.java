package com.austa.payment.models;

/**
 * Payment transaction status enumeration.
 * Represents the lifecycle of a payment from creation to completion or failure.
 *
 * <p>Status Flow:</p>
 * <pre>
 * PENDING → PROCESSING → COMPLETED
 *                      → FAILED
 *
 * COMPLETED → REFUNDED
 *
 * PENDING/PROCESSING → CANCELLED
 * </pre>
 *
 * <p>Compliance Notes:</p>
 * <ul>
 *   <li>All status transitions must be logged for audit trail</li>
 *   <li>Failed payments must include reason codes</li>
 *   <li>Refunds must reference original transaction</li>
 *   <li>Cancelled payments must include cancellation reason</li>
 * </ul>
 *
 * @author AUSTA Development Team
 * @version 1.0.0
 * @since 2024-11-10
 */
public enum PaymentStatus {
    /**
     * Payment has been created but not yet submitted to payment gateway.
     * Initial state for all payment transactions.
     *
     * <p>Characteristics:</p>
     * <ul>
     *   <li>User has initiated payment but not confirmed</li>
     *   <li>Payment details are being collected</li>
     *   <li>Can be cancelled without charges</li>
     * </ul>
     */
    PENDING("Pending", "pending", false, true),

    /**
     * Payment is being processed by payment gateway.
     * Intermediate state during payment authorization and capture.
     *
     * <p>Characteristics:</p>
     * <ul>
     *   <li>Payment submitted to gateway/bank</li>
     *   <li>Awaiting confirmation from payment processor</li>
     *   <li>Should not remain in this state for more than 30 minutes</li>
     * </ul>
     */
    PROCESSING("Processing", "processing", false, true),

    /**
     * Payment has been successfully completed.
     * Terminal state indicating successful payment capture.
     *
     * <p>Characteristics:</p>
     * <ul>
     *   <li>Funds have been captured/transferred</li>
     *   <li>Transaction ID assigned by gateway</li>
     *   <li>Can be refunded if needed</li>
     *   <li>Triggers policy activation</li>
     * </ul>
     */
    COMPLETED("Completed", "completed", true, false),

    /**
     * Payment processing has failed.
     * Terminal state indicating payment could not be completed.
     *
     * <p>Characteristics:</p>
     * <ul>
     *   <li>Payment gateway rejected the transaction</li>
     *   <li>Includes failure reason and code</li>
     *   <li>User can retry with different payment method</li>
     *   <li>No funds were captured</li>
     * </ul>
     *
     * <p>Common Failure Reasons:</p>
     * <ul>
     *   <li>Insufficient funds</li>
     *   <li>Card declined</li>
     *   <li>Invalid payment details</li>
     *   <li>Fraud detection triggered</li>
     * </ul>
     */
    FAILED("Failed", "failed", true, false),

    /**
     * Payment has been refunded to customer.
     * Terminal state indicating funds returned to customer.
     *
     * <p>Characteristics:</p>
     * <ul>
     *   <li>Full or partial refund processed</li>
     *   <li>References original completed payment</li>
     *   <li>Triggers policy cancellation if full refund</li>
     *   <li>Refund transaction ID from gateway</li>
     * </ul>
     *
     * <p>Refund Processing Time:</p>
     * <ul>
     *   <li>Credit Card: 5-10 business days</li>
     *   <li>PIX: Instant to 1 business day</li>
     *   <li>Boleto: Not refundable (prevent future payment instead)</li>
     * </ul>
     */
    REFUNDED("Refunded", "refunded", true, false),

    /**
     * Payment has been cancelled by user or system.
     * Terminal state indicating payment was abandoned.
     *
     * <p>Characteristics:</p>
     * <ul>
     *   <li>User cancelled before completion</li>
     *   <li>System cancelled due to timeout or fraud</li>
     *   <li>No funds were captured</li>
     *   <li>Can create new payment to retry</li>
     * </ul>
     */
    CANCELLED("Cancelled", "cancelled", true, false);

    private final String displayName;
    private final String code;
    private final boolean isTerminal;
    private final boolean canCancel;

    /**
     * Constructor for PaymentStatus enum.
     *
     * @param displayName Human-readable name for UI display
     * @param code Technical code for API/database storage
     * @param isTerminal Whether this is a terminal state (no further transitions)
     * @param canCancel Whether payment can be cancelled from this state
     */
    PaymentStatus(String displayName, String code, boolean isTerminal, boolean canCancel) {
        this.displayName = displayName;
        this.code = code;
        this.isTerminal = isTerminal;
        this.canCancel = canCancel;
    }

    /**
     * Gets the human-readable display name.
     *
     * @return Display name for UI
     */
    public String getDisplayName() {
        return displayName;
    }

    /**
     * Gets the technical code for API/database.
     *
     * @return Technical code
     */
    public String getCode() {
        return code;
    }

    /**
     * Checks if this is a terminal state.
     *
     * @return true if no further status transitions are allowed
     */
    public boolean isTerminal() {
        return isTerminal;
    }

    /**
     * Checks if payment can be cancelled from this state.
     *
     * @return true if cancellation is allowed
     */
    public boolean canCancel() {
        return canCancel;
    }

    /**
     * Checks if payment was successful.
     *
     * @return true if status is COMPLETED
     */
    public boolean isSuccessful() {
        return this == COMPLETED;
    }

    /**
     * Checks if payment can be refunded.
     *
     * @return true if status is COMPLETED (only completed payments can be refunded)
     */
    public boolean canRefund() {
        return this == COMPLETED;
    }

    /**
     * Checks if payment is in a pending state.
     *
     * @return true if status is PENDING or PROCESSING
     */
    public boolean isPending() {
        return this == PENDING || this == PROCESSING;
    }

    /**
     * Finds PaymentStatus by code.
     *
     * @param code Technical code
     * @return Matching PaymentStatus or null if not found
     */
    public static PaymentStatus fromCode(String code) {
        if (code == null) {
            return null;
        }
        for (PaymentStatus status : values()) {
            if (status.code.equalsIgnoreCase(code)) {
                return status;
            }
        }
        return null;
    }

    /**
     * Validates if transition from current status to new status is allowed.
     *
     * @param currentStatus Current payment status
     * @param newStatus New payment status to transition to
     * @return true if transition is valid
     */
    public static boolean isValidTransition(PaymentStatus currentStatus, PaymentStatus newStatus) {
        if (currentStatus == null || newStatus == null) {
            return false;
        }

        // Terminal states cannot transition
        if (currentStatus.isTerminal) {
            return false;
        }

        // Define valid transitions
        switch (currentStatus) {
            case PENDING:
                return newStatus == PROCESSING || newStatus == CANCELLED || newStatus == FAILED;
            case PROCESSING:
                return newStatus == COMPLETED || newStatus == FAILED || newStatus == CANCELLED;
            case COMPLETED:
                return newStatus == REFUNDED;
            default:
                return false;
        }
    }
}
