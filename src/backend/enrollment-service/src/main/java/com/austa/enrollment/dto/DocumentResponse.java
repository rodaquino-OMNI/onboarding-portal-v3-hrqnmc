package com.austa.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object for document metadata response.
 * Returned after successful document upload or retrieval.
 *
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {

    /**
     * Unique identifier of the document
     */
    @JsonProperty("documentId")
    private UUID documentId;

    /**
     * Original filename of the document
     */
    @JsonProperty("fileName")
    private String fileName;

    /**
     * Type of document
     */
    @JsonProperty("documentType")
    private String documentType;

    /**
     * Timestamp when the document was uploaded
     */
    @JsonProperty("uploadDate")
    private LocalDateTime uploadDate;

    /**
     * Current status of the document (UPLOADED, VERIFIED, REJECTED)
     */
    @JsonProperty("status")
    private String status;

    /**
     * Secure download URL (time-limited, signed URL)
     */
    @JsonProperty("downloadUrl")
    private String downloadUrl;

    /**
     * Size of the document in bytes
     */
    @JsonProperty("fileSize")
    private Long fileSize;

    /**
     * MIME type of the document
     */
    @JsonProperty("mimeType")
    private String mimeType;

    /**
     * Checksum/hash of the document for integrity verification
     */
    @JsonProperty("checksum")
    private String checksum;

    /**
     * Enrollment ID associated with this document
     */
    @JsonProperty("enrollmentId")
    private UUID enrollmentId;

    /**
     * Indicates if the document is encrypted
     */
    @JsonProperty("encrypted")
    private Boolean encrypted;

    /**
     * Expiration time for the download URL (in minutes)
     */
    @JsonProperty("downloadUrlExpiresIn")
    private Integer downloadUrlExpiresIn;

    /**
     * Verification status message (if document was verified/rejected)
     */
    @JsonProperty("verificationMessage")
    private String verificationMessage;

    /**
     * User who uploaded the document
     */
    @JsonProperty("uploadedBy")
    private UUID uploadedBy;
}
