package com.austa.enrollment.dto;

import com.austa.enrollment.models.Enrollment;
import com.austa.enrollment.models.EnrollmentStatus;
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
 * Data Transfer Object for enrollment API success responses.
 * Contains enrollment details and next steps information.
 *
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {

    /**
     * Unique identifier of the enrollment
     */
    @JsonProperty("enrollmentId")
    private UUID enrollmentId;

    /**
     * Current status of the enrollment
     */
    @JsonProperty("status")
    private String status;

    /**
     * Success or informational message
     */
    @JsonProperty("message")
    private String message;

    /**
     * Secure link to complete the health questionnaire
     */
    @JsonProperty("secureQuestionnaireLink")
    private String secureQuestionnaireLink;

    /**
     * List of next steps for the user to complete
     */
    @JsonProperty("nextSteps")
    private List<String> nextSteps;

    /**
     * Beneficiary ID associated with the enrollment
     */
    @JsonProperty("beneficiaryId")
    private UUID beneficiaryId;

    /**
     * Broker ID associated with the enrollment (if applicable)
     */
    @JsonProperty("brokerId")
    private UUID brokerId;

    /**
     * Timestamp when the enrollment was created
     */
    @JsonProperty("createdAt")
    private LocalDateTime createdAt;

    /**
     * Timestamp when the enrollment was last updated
     */
    @JsonProperty("updatedAt")
    private LocalDateTime updatedAt;

    /**
     * Timestamp when the enrollment was submitted (if applicable)
     */
    @JsonProperty("submittedAt")
    private LocalDateTime submittedAt;

    /**
     * Percentage of completion (0-100)
     */
    @JsonProperty("completionPercentage")
    private Integer completionPercentage;

    /**
     * List of required documents that are missing
     */
    @JsonProperty("missingDocuments")
    private List<String> missingDocuments;

    /**
     * Indicates if health assessment is completed
     */
    @JsonProperty("healthAssessmentCompleted")
    private Boolean healthAssessmentCompleted;

    /**
     * Static factory method to create response from Enrollment entity
     *
     * @param enrollment the enrollment entity
     * @return EnrollmentResponse object
     */
    public static EnrollmentResponse fromEnrollment(Enrollment enrollment) {
        if (enrollment == null) {
            return null;
        }

        List<String> nextSteps = determineNextSteps(enrollment);
        String message = generateMessage(enrollment);
        Integer completionPercentage = calculateCompletionPercentage(enrollment);

        return EnrollmentResponse.builder()
                .enrollmentId(enrollment.getId())
                .status(enrollment.getStatus().name())
                .message(message)
                .secureQuestionnaireLink(generateQuestionnaireLink(enrollment.getId()))
                .nextSteps(nextSteps)
                .beneficiaryId(enrollment.getBeneficiaryId())
                .brokerId(enrollment.getBrokerId())
                .createdAt(enrollment.getCreatedAt())
                .updatedAt(enrollment.getUpdatedAt())
                .submittedAt(enrollment.getSubmittedAt())
                .completionPercentage(completionPercentage)
                .missingDocuments(new ArrayList<>())
                .healthAssessmentCompleted(hasHealthAssessment(enrollment))
                .build();
    }

    /**
     * Determines the next steps based on enrollment status
     */
    private static List<String> determineNextSteps(Enrollment enrollment) {
        List<String> steps = new ArrayList<>();

        switch (enrollment.getStatus()) {
            case DRAFT:
                steps.add("Complete personal information");
                steps.add("Submit health assessment questionnaire");
                steps.add("Upload required documents");
                steps.add("Review and submit enrollment");
                break;
            case PENDING:
                steps.add("Wait for document verification");
                steps.add("Check enrollment status regularly");
                break;
            case IN_REVIEW:
                steps.add("Your enrollment is being reviewed by our team");
                steps.add("You may be contacted for additional information");
                break;
            case APPROVED:
                steps.add("Download your health plan card");
                steps.add("Review your coverage details");
                steps.add("Schedule your first medical appointment");
                break;
            case REJECTED:
                steps.add("Review rejection reasons");
                steps.add("Contact support for clarification");
                steps.add("Submit a new enrollment if eligible");
                break;
            case CANCELLED:
                steps.add("Enrollment has been cancelled");
                steps.add("Contact support if this was an error");
                break;
        }

        return steps;
    }

    /**
     * Generates a user-friendly message based on enrollment status
     */
    private static String generateMessage(Enrollment enrollment) {
        switch (enrollment.getStatus()) {
            case DRAFT:
                return "Enrollment created successfully. Please complete all required steps.";
            case PENDING:
                return "Enrollment submitted successfully. We are reviewing your application.";
            case IN_REVIEW:
                return "Your enrollment is currently under review.";
            case APPROVED:
                return "Congratulations! Your enrollment has been approved.";
            case REJECTED:
                return "Unfortunately, your enrollment has been rejected. Please contact support.";
            case CANCELLED:
                return "Your enrollment has been cancelled.";
            default:
                return "Enrollment status: " + enrollment.getStatus();
        }
    }

    /**
     * Generates secure questionnaire link
     */
    private static String generateQuestionnaireLink(UUID enrollmentId) {
        return "/api/v1/enrollments/" + enrollmentId + "/health-assessment";
    }

    /**
     * Calculates completion percentage
     */
    private static Integer calculateCompletionPercentage(Enrollment enrollment) {
        int total = 100;
        int completed = 0;

        // Basic info (40%)
        if (enrollment.getBeneficiaryId() != null) {
            completed += 40;
        }

        // Health assessment (30%)
        if (hasHealthAssessment(enrollment)) {
            completed += 30;
        }

        // Documents (30%)
        if (enrollment.getDocuments() != null && !enrollment.getDocuments().isEmpty()) {
            completed += 30;
        }

        return Math.min(completed, total);
    }

    /**
     * Checks if enrollment has health assessment
     */
    private static Boolean hasHealthAssessment(Enrollment enrollment) {
        return enrollment.getHealthAssessments() != null &&
               !enrollment.getHealthAssessments().isEmpty();
    }
}
