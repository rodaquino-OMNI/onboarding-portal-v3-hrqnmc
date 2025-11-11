package com.austa.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;
import java.util.UUID;

/**
 * Data Transfer Object for enrollment status update requests.
 * Used by underwriters and administrators to update enrollment status.
 *
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatusUpdateDTO {

    /**
     * Enrollment ID to update
     */
    @NotNull(message = "Enrollment ID is required")
    @JsonProperty("enrollmentId")
    private UUID enrollmentId;

    /**
     * New status to set
     */
    @NotNull(message = "Status is required")
    @Pattern(
        regexp = "^(DRAFT|PENDING|IN_REVIEW|APPROVED|REJECTED|CANCELLED)$",
        message = "Invalid status. Must be one of: DRAFT, PENDING, IN_REVIEW, APPROVED, REJECTED, CANCELLED"
    )
    @JsonProperty("status")
    private String status;

    /**
     * Reason for the status update
     */
    @Size(max = 1000, message = "Reason must not exceed 1000 characters")
    @JsonProperty("reason")
    private String reason;

    /**
     * User ID of the person making the update
     */
    @NotNull(message = "Updated by is required")
    @JsonProperty("updatedBy")
    private UUID updatedBy;

    /**
     * Additional notes or comments
     */
    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    @JsonProperty("notes")
    private String notes;

    /**
     * Indicates if notification should be sent to the beneficiary
     */
    @JsonProperty("sendNotification")
    private Boolean sendNotification;

    /**
     * Priority level for the status update (LOW, MEDIUM, HIGH, URGENT)
     */
    @Pattern(
        regexp = "^(LOW|MEDIUM|HIGH|URGENT)$|^$",
        message = "Priority must be one of: LOW, MEDIUM, HIGH, URGENT"
    )
    @JsonProperty("priority")
    private String priority;

    /**
     * Reference to external system or ticket (if applicable)
     */
    @JsonProperty("externalReference")
    private String externalReference;
}
