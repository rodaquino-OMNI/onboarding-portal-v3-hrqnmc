package com.austa.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Data Transfer Object for error response wrapper.
 * Provides structured error information for API responses.
 *
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {

    /**
     * Timestamp when the error occurred
     */
    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    /**
     * HTTP status code
     */
    @JsonProperty("status")
    private Integer status;

    /**
     * Error type/category
     */
    @JsonProperty("error")
    private String error;

    /**
     * Detailed error message
     */
    @JsonProperty("message")
    private String message;

    /**
     * Request path where the error occurred
     */
    @JsonProperty("path")
    private String path;

    /**
     * Unique request identifier for tracking
     */
    @JsonProperty("requestId")
    private UUID requestId;

    /**
     * Application-specific error code
     */
    @JsonProperty("errorCode")
    private String errorCode;

    /**
     * List of validation errors (if applicable)
     */
    @JsonProperty("validationErrors")
    private List<ValidationError> validationErrors;

    /**
     * Additional error details
     */
    @JsonProperty("details")
    private String details;

    /**
     * Suggested action for the user
     */
    @JsonProperty("suggestedAction")
    private String suggestedAction;

    /**
     * Support reference for customer service
     */
    @JsonProperty("supportReference")
    private String supportReference;

    /**
     * Constructor with essential fields
     */
    public ErrorResponse(Integer status, String message, String errorCode) {
        this.timestamp = LocalDateTime.now();
        this.status = status;
        this.message = message;
        this.errorCode = errorCode;
        this.requestId = UUID.randomUUID();
        this.validationErrors = new ArrayList<>();
    }

    /**
     * Nested class for validation errors
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationError {

        /**
         * Name of the field that failed validation
         */
        @JsonProperty("field")
        private String field;

        /**
         * Value that was rejected
         */
        @JsonProperty("rejectedValue")
        private Object rejectedValue;

        /**
         * Validation error message
         */
        @JsonProperty("message")
        private String message;

        /**
         * Validation constraint that was violated
         */
        @JsonProperty("constraint")
        private String constraint;
    }

    /**
     * Static factory method for creating error response with default values
     */
    public static ErrorResponse of(Integer status, String error, String message, String path) {
        return ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status)
                .error(error)
                .message(message)
                .path(path)
                .requestId(UUID.randomUUID())
                .validationErrors(new ArrayList<>())
                .build();
    }

    /**
     * Adds a validation error to the list
     */
    public void addValidationError(String field, Object rejectedValue, String message, String constraint) {
        if (this.validationErrors == null) {
            this.validationErrors = new ArrayList<>();
        }
        this.validationErrors.add(
            ValidationError.builder()
                .field(field)
                .rejectedValue(rejectedValue)
                .message(message)
                .constraint(constraint)
                .build()
        );
    }
}
