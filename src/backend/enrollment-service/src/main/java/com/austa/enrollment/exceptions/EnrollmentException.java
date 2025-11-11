package com.austa.enrollment.exceptions;

/**
 * Custom exception class for enrollment-related errors.
 * Extends RuntimeException to support unchecked exception handling.
 *
 * @version 1.0
 */
public class EnrollmentException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /**
     * Error code for categorizing the exception
     */
    private ErrorCode errorCode;

    /**
     * Additional context or details about the error
     */
    private String details;

    /**
     * Default constructor
     */
    public EnrollmentException() {
        super();
        this.errorCode = ErrorCode.GENERAL_ERROR;
    }

    /**
     * Constructor with message
     *
     * @param message the error message
     */
    public EnrollmentException(String message) {
        super(message);
        this.errorCode = ErrorCode.GENERAL_ERROR;
    }

    /**
     * Constructor with message and cause
     *
     * @param message the error message
     * @param cause the underlying cause
     */
    public EnrollmentException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = ErrorCode.GENERAL_ERROR;
    }

    /**
     * Constructor with cause
     *
     * @param cause the underlying cause
     */
    public EnrollmentException(Throwable cause) {
        super(cause);
        this.errorCode = ErrorCode.GENERAL_ERROR;
    }

    /**
     * Constructor with message and error code
     *
     * @param message the error message
     * @param errorCode the error code
     */
    public EnrollmentException(String message, ErrorCode errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * Constructor with message, cause, and error code
     *
     * @param message the error message
     * @param cause the underlying cause
     * @param errorCode the error code
     */
    public EnrollmentException(String message, Throwable cause, ErrorCode errorCode) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    /**
     * Constructor with message, error code, and details
     *
     * @param message the error message
     * @param errorCode the error code
     * @param details additional details
     */
    public EnrollmentException(String message, ErrorCode errorCode, String details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }

    /**
     * Get the error code
     *
     * @return the error code
     */
    public ErrorCode getErrorCode() {
        return errorCode;
    }

    /**
     * Get the error code as string
     *
     * @return the error code string
     */
    public String getErrorCodeString() {
        return errorCode != null ? errorCode.getCode() : ErrorCode.GENERAL_ERROR.getCode();
    }

    /**
     * Get additional details
     *
     * @return the details
     */
    public String getDetails() {
        return details;
    }

    /**
     * Set additional details
     *
     * @param details the details to set
     */
    public void setDetails(String details) {
        this.details = details;
    }

    /**
     * Enum defining error codes for enrollment exceptions
     */
    public enum ErrorCode {
        GENERAL_ERROR("ENR-001", "General enrollment error"),
        VALIDATION_ERROR("ENR-002", "Validation error"),
        ENROLLMENT_NOT_FOUND("ENR-003", "Enrollment not found"),
        INVALID_STATUS_TRANSITION("ENR-004", "Invalid status transition"),
        DUPLICATE_ENROLLMENT("ENR-005", "Duplicate enrollment"),
        BENEFICIARY_NOT_FOUND("ENR-006", "Beneficiary not found"),
        BROKER_NOT_FOUND("ENR-007", "Broker not found"),
        DOCUMENT_UPLOAD_FAILED("ENR-008", "Document upload failed"),
        DOCUMENT_NOT_FOUND("ENR-009", "Document not found"),
        INVALID_DOCUMENT_TYPE("ENR-010", "Invalid document type"),
        DOCUMENT_SIZE_EXCEEDED("ENR-011", "Document size exceeded"),
        HEALTH_ASSESSMENT_INVALID("ENR-012", "Health assessment invalid"),
        HEALTH_ASSESSMENT_INCOMPLETE("ENR-013", "Health assessment incomplete"),
        UNAUTHORIZED_ACCESS("ENR-014", "Unauthorized access"),
        ENCRYPTION_ERROR("ENR-015", "Encryption error"),
        DECRYPTION_ERROR("ENR-016", "Decryption error"),
        DATABASE_ERROR("ENR-017", "Database error"),
        EXTERNAL_SERVICE_ERROR("ENR-018", "External service error"),
        CIRCUIT_BREAKER_OPEN("ENR-019", "Circuit breaker is open"),
        RATE_LIMIT_EXCEEDED("ENR-020", "Rate limit exceeded"),
        INVALID_PERSONAL_INFO("ENR-021", "Invalid personal information"),
        INVALID_ADDRESS_INFO("ENR-022", "Invalid address information"),
        INVALID_PAYMENT_INFO("ENR-023", "Invalid payment information"),
        GUARDIAN_VERIFICATION_FAILED("ENR-024", "Guardian verification failed"),
        AGE_RESTRICTION_ERROR("ENR-025", "Age restriction error"),
        PLAN_NOT_AVAILABLE("ENR-026", "Plan not available"),
        NETWORK_ERROR("ENR-027", "Network error"),
        TIMEOUT_ERROR("ENR-028", "Timeout error"),
        CONFIGURATION_ERROR("ENR-029", "Configuration error"),
        BUSINESS_RULE_VIOLATION("ENR-030", "Business rule violation");

        private final String code;
        private final String description;

        ErrorCode(String code, String description) {
            this.code = code;
            this.description = description;
        }

        /**
         * Get the error code
         *
         * @return the code
         */
        public String getCode() {
            return code;
        }

        /**
         * Get the error description
         *
         * @return the description
         */
        public String getDescription() {
            return description;
        }

        /**
         * Get error code by code string
         *
         * @param code the code string
         * @return the ErrorCode enum value
         */
        public static ErrorCode fromCode(String code) {
            for (ErrorCode errorCode : values()) {
                if (errorCode.code.equals(code)) {
                    return errorCode;
                }
            }
            return GENERAL_ERROR;
        }
    }

    @Override
    public String toString() {
        return String.format("EnrollmentException{code=%s, message=%s, details=%s}",
                errorCode != null ? errorCode.getCode() : "null",
                getMessage(),
                details);
    }
}
