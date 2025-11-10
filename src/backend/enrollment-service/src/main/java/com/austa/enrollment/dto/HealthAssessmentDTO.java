package com.austa.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Data Transfer Object for health assessment questionnaire data.
 * Contains health-related questions and responses for enrollment processing.
 *
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthAssessmentDTO {

    /**
     * Enrollment ID associated with this health assessment
     */
    @NotNull(message = "Enrollment ID is required")
    @JsonProperty("enrollmentId")
    private UUID enrollmentId;

    /**
     * Map of question IDs to responses
     * Key: Question identifier
     * Value: Response data (can be String, Boolean, Number, or complex objects)
     */
    @NotNull(message = "Responses are required")
    @Size(min = 1, message = "At least one response is required")
    @JsonProperty("responses")
    private Map<String, Object> responses;

    /**
     * List of document types required based on health assessment responses
     */
    @JsonProperty("documentsRequired")
    private List<String> documentsRequired;

    /**
     * Indicates whether a guardian has verified the health information (for minors)
     */
    @JsonProperty("guardianVerified")
    private Boolean guardianVerified;

    /**
     * Additional notes or comments about the health assessment
     */
    @JsonProperty("notes")
    private String notes;

    /**
     * Indicates whether the beneficiary has pre-existing conditions
     */
    @JsonProperty("hasPreExistingConditions")
    private Boolean hasPreExistingConditions;

    /**
     * List of medications currently being taken
     */
    @JsonProperty("currentMedications")
    private List<MedicationDTO> currentMedications;

    /**
     * Recent hospitalizations or surgeries
     */
    @JsonProperty("recentHospitalizations")
    private List<HospitalizationDTO> recentHospitalizations;

    /**
     * Nested DTO for medication information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MedicationDTO {

        @NotNull(message = "Medication name is required")
        private String name;

        private String dosage;

        private String frequency;

        private String prescribingDoctor;

        private String startDate;
    }

    /**
     * Nested DTO for hospitalization information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HospitalizationDTO {

        @NotNull(message = "Hospitalization date is required")
        private String date;

        @NotNull(message = "Reason is required")
        private String reason;

        private String hospital;

        private Integer durationDays;

        private String outcome;
    }
}
