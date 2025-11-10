package com.austa.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import java.util.UUID;

/**
 * Data Transfer Object for enrollment creation and response.
 * Includes comprehensive validation annotations for data integrity.
 *
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentDTO {

    /**
     * Unique identifier of the beneficiary
     */
    @NotNull(message = "Beneficiary ID is required")
    @JsonProperty("beneficiaryId")
    private UUID beneficiaryId;

    /**
     * Unique identifier of the broker (optional)
     */
    @JsonProperty("brokerId")
    private UUID brokerId;

    /**
     * Unique identifier of the guardian (required for minors)
     */
    @JsonProperty("guardianId")
    private UUID guardianId;

    /**
     * Type of enrollment (INDIVIDUAL, FAMILY, CORPORATE)
     */
    @NotNull(message = "Enrollment type is required")
    @Pattern(regexp = "^(INDIVIDUAL|FAMILY|CORPORATE)$", message = "Invalid enrollment type")
    @JsonProperty("enrollmentType")
    private String enrollmentType;

    /**
     * Type of health plan
     */
    @NotNull(message = "Plan type is required")
    @Pattern(regexp = "^(BASIC|STANDARD|PREMIUM)$", message = "Invalid plan type")
    @JsonProperty("planType")
    private String planType;

    /**
     * Personal information (nested object with encryption)
     */
    @Valid
    @NotNull(message = "Personal information is required")
    @JsonProperty("personalInfo")
    private PersonalInfoDTO personalInfo;

    /**
     * Address information
     */
    @Valid
    @JsonProperty("addressInfo")
    private AddressInfoDTO addressInfo;

    /**
     * Payment information
     */
    @Valid
    @JsonProperty("paymentInfo")
    private PaymentInfoDTO paymentInfo;

    /**
     * Nested DTO for personal information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalInfoDTO {

        @NotNull(message = "Full name is required")
        @Pattern(regexp = "^[A-Za-zÀ-ÿ\\s]{2,100}$", message = "Invalid name format")
        private String fullName;

        @NotNull(message = "CPF is required")
        @Pattern(regexp = "^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$|^\\d{11}$", message = "Invalid CPF format")
        private String cpf;

        @NotNull(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotNull(message = "Phone is required")
        @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "Invalid phone format")
        private String phone;

        @NotNull(message = "Date of birth is required")
        @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Invalid date format (use YYYY-MM-DD)")
        private String dateOfBirth;

        @Pattern(regexp = "^(M|F|O)$", message = "Gender must be M, F, or O")
        private String gender;
    }

    /**
     * Nested DTO for address information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddressInfoDTO {

        @NotNull(message = "Street address is required")
        private String street;

        @NotNull(message = "Number is required")
        private String number;

        private String complement;

        @NotNull(message = "Neighborhood is required")
        private String neighborhood;

        @NotNull(message = "City is required")
        private String city;

        @NotNull(message = "State is required")
        @Pattern(regexp = "^[A-Z]{2}$", message = "State must be a 2-letter code")
        private String state;

        @NotNull(message = "ZIP code is required")
        @Pattern(regexp = "^\\d{5}-\\d{3}$|^\\d{8}$", message = "Invalid ZIP code format")
        private String zipCode;
    }

    /**
     * Nested DTO for payment information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentInfoDTO {

        @NotNull(message = "Payment method is required")
        @Pattern(regexp = "^(CREDIT_CARD|DEBIT|BANK_SLIP)$", message = "Invalid payment method")
        private String paymentMethod;

        private String cardNumber;

        private String cardHolderName;

        private String expiryDate;

        private String bankName;

        private String accountNumber;
    }
}
