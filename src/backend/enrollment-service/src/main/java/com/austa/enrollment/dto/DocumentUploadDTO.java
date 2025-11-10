package com.austa.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Max;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

/**
 * Data Transfer Object for document upload operations.
 * Includes validation for file size, type, and content.
 *
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadDTO {

    /**
     * Type of document being uploaded
     */
    @NotNull(message = "Document type is required")
    @Pattern(
        regexp = "^(CPF|RG|PROOF_OF_RESIDENCE|MEDICAL_REPORT|PRESCRIPTION|HEALTH_CARD|INCOME_PROOF|BIRTH_CERTIFICATE|MARRIAGE_CERTIFICATE|OTHER)$",
        message = "Invalid document type"
    )
    @JsonProperty("documentType")
    private String documentType;

    /**
     * Original filename of the document
     */
    @NotNull(message = "File name is required")
    @Size(min = 1, max = 255, message = "File name must be between 1 and 255 characters")
    @JsonProperty("fileName")
    private String fileName;

    /**
     * Size of the file in bytes
     * Maximum 10MB (10,485,760 bytes)
     */
    @NotNull(message = "File size is required")
    @Max(value = 10485760, message = "File size must not exceed 10MB")
    @JsonProperty("fileSize")
    private Long fileSize;

    /**
     * MIME type of the document
     */
    @NotNull(message = "MIME type is required")
    @Pattern(
        regexp = "^(application/pdf|image/jpeg|image/png|image/jpg|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document)$",
        message = "Invalid MIME type. Allowed types: PDF, JPEG, PNG, DOC, DOCX"
    )
    @JsonProperty("mimeType")
    private String mimeType;

    /**
     * Base64 encoded content of the document
     */
    @NotNull(message = "Document content is required")
    @Size(min = 1, message = "Document content cannot be empty")
    @JsonProperty("content")
    private byte[] content;

    /**
     * Description or notes about the document
     */
    @Size(max = 500, message = "Description must not exceed 500 characters")
    @JsonProperty("description")
    private String description;

    /**
     * Indicates if this document contains sensitive health information
     */
    @JsonProperty("containsHealthInfo")
    private Boolean containsHealthInfo;

    /**
     * Document issuer (e.g., hospital name, government agency)
     */
    @JsonProperty("issuer")
    private String issuer;

    /**
     * Issue date of the document (YYYY-MM-DD format)
     */
    @Pattern(
        regexp = "^\\d{4}-\\d{2}-\\d{2}$|^$",
        message = "Issue date must be in YYYY-MM-DD format"
    )
    @JsonProperty("issueDate")
    private String issueDate;

    /**
     * Expiry date of the document if applicable (YYYY-MM-DD format)
     */
    @Pattern(
        regexp = "^\\d{4}-\\d{2}-\\d{2}$|^$",
        message = "Expiry date must be in YYYY-MM-DD format"
    )
    @JsonProperty("expiryDate")
    private String expiryDate;
}
