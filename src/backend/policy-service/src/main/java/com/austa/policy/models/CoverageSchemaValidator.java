package com.austa.policy.models;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Validator class for policy coverage schema validation.
 * Ensures coverage details conform to the required structure and business rules.
 *
 * @version 1.0.0
 */
public class CoverageSchemaValidator {

    private static final Logger logger = LoggerFactory.getLogger(CoverageSchemaValidator.class);

    // Required fields in coverage schema
    private static final Set<String> REQUIRED_FIELDS = new HashSet<>(Arrays.asList(
        "planType", "coverageAmount", "deductible", "coInsurance", "exclusions", "aggravations"
    ));

    // Valid plan types
    private static final Set<String> VALID_PLAN_TYPES = new HashSet<>(Arrays.asList(
        "BASIC", "STANDARD", "PREMIUM", "EXECUTIVE"
    ));

    // Coverage amount limits (in BRL)
    private static final BigDecimal MIN_COVERAGE_AMOUNT = new BigDecimal("50000.00");
    private static final BigDecimal MAX_COVERAGE_AMOUNT = new BigDecimal("5000000.00");

    // Deductible limits (in BRL)
    private static final BigDecimal MIN_DEDUCTIBLE = new BigDecimal("0.00");
    private static final BigDecimal MAX_DEDUCTIBLE = new BigDecimal("50000.00");

    // Co-insurance percentage limits
    private static final int MIN_COINSURANCE = 0;
    private static final int MAX_COINSURANCE = 50;

    /**
     * Validates if the coverage details conform to the required schema.
     *
     * @param coverageDetails JSON node containing coverage information
     * @return true if the coverage is valid, false otherwise
     */
    public static boolean isValid(JsonNode coverageDetails) {
        if (coverageDetails == null || coverageDetails.isNull() || coverageDetails.isEmpty()) {
            logger.error("Coverage details are null or empty");
            return false;
        }

        try {
            // Validate structure
            if (!validateCoverageStructure(coverageDetails)) {
                logger.error("Coverage structure validation failed");
                return false;
            }

            // Validate coverage limits
            if (!validateCoverageLimits(coverageDetails)) {
                logger.error("Coverage limits validation failed");
                return false;
            }

            // Validate aggravations
            if (!validateAggravations(coverageDetails)) {
                logger.error("Aggravations validation failed");
                return false;
            }

            logger.debug("Coverage details validation successful");
            return true;

        } catch (Exception e) {
            logger.error("Error validating coverage details: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Validates the structure of coverage details ensuring all required fields are present.
     *
     * @param coverage JSON node containing coverage information
     * @return true if structure is valid, false otherwise
     */
    private static boolean validateCoverageStructure(JsonNode coverage) {
        // Check all required fields are present
        for (String field : REQUIRED_FIELDS) {
            if (!coverage.has(field) || coverage.get(field).isNull()) {
                logger.warn("Required field missing or null: {}", field);
                return false;
            }
        }

        // Validate plan type
        String planType = coverage.get("planType").asText();
        if (!VALID_PLAN_TYPES.contains(planType)) {
            logger.warn("Invalid plan type: {}. Valid types: {}", planType, VALID_PLAN_TYPES);
            return false;
        }

        // Validate exclusions is an array
        if (!coverage.get("exclusions").isArray()) {
            logger.warn("Exclusions must be an array");
            return false;
        }

        // Validate aggravations is an array
        if (!coverage.get("aggravations").isArray()) {
            logger.warn("Aggravations must be an array");
            return false;
        }

        return true;
    }

    /**
     * Validates coverage limits are within acceptable business ranges.
     *
     * @param coverage JSON node containing coverage information
     * @return true if limits are valid, false otherwise
     */
    private static boolean validateCoverageLimits(JsonNode coverage) {
        try {
            // Validate coverage amount
            BigDecimal coverageAmount = new BigDecimal(coverage.get("coverageAmount").asText());
            if (coverageAmount.compareTo(MIN_COVERAGE_AMOUNT) < 0 ||
                coverageAmount.compareTo(MAX_COVERAGE_AMOUNT) > 0) {
                logger.warn("Coverage amount {} is outside valid range [{}, {}]",
                    coverageAmount, MIN_COVERAGE_AMOUNT, MAX_COVERAGE_AMOUNT);
                return false;
            }

            // Validate deductible
            BigDecimal deductible = new BigDecimal(coverage.get("deductible").asText());
            if (deductible.compareTo(MIN_DEDUCTIBLE) < 0 ||
                deductible.compareTo(MAX_DEDUCTIBLE) > 0) {
                logger.warn("Deductible {} is outside valid range [{}, {}]",
                    deductible, MIN_DEDUCTIBLE, MAX_DEDUCTIBLE);
                return false;
            }

            // Validate co-insurance percentage
            int coInsurance = coverage.get("coInsurance").asInt();
            if (coInsurance < MIN_COINSURANCE || coInsurance > MAX_COINSURANCE) {
                logger.warn("Co-insurance {} is outside valid range [{}, {}]",
                    coInsurance, MIN_COINSURANCE, MAX_COINSURANCE);
                return false;
            }

            // Deductible should not exceed coverage amount
            if (deductible.compareTo(coverageAmount) > 0) {
                logger.warn("Deductible {} cannot exceed coverage amount {}",
                    deductible, coverageAmount);
                return false;
            }

            return true;

        } catch (NumberFormatException e) {
            logger.error("Invalid number format in coverage limits: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Validates aggravations structure and content.
     *
     * @param coverage JSON node containing coverage information
     * @return true if aggravations are valid, false otherwise
     */
    private static boolean validateAggravations(JsonNode coverage) {
        JsonNode aggravations = coverage.get("aggravations");

        // Each aggravation should have: condition, multiplier, description
        for (JsonNode aggravation : aggravations) {
            if (!aggravation.has("condition") || aggravation.get("condition").asText().isEmpty()) {
                logger.warn("Aggravation missing 'condition' field");
                return false;
            }

            if (!aggravation.has("multiplier")) {
                logger.warn("Aggravation missing 'multiplier' field");
                return false;
            }

            // Multiplier should be between 1.0 and 3.0
            double multiplier = aggravation.get("multiplier").asDouble();
            if (multiplier < 1.0 || multiplier > 3.0) {
                logger.warn("Aggravation multiplier {} is outside valid range [1.0, 3.0]", multiplier);
                return false;
            }

            if (!aggravation.has("description") || aggravation.get("description").asText().isEmpty()) {
                logger.warn("Aggravation missing 'description' field");
                return false;
            }
        }

        return true;
    }

    /**
     * Validates exclusions structure and content.
     *
     * @param coverage JSON node containing coverage information
     * @return true if exclusions are valid, false otherwise
     */
    public static boolean validateExclusions(JsonNode coverage) {
        if (!coverage.has("exclusions")) {
            return false;
        }

        JsonNode exclusions = coverage.get("exclusions");
        if (!exclusions.isArray()) {
            return false;
        }

        // Each exclusion should have: type, reason, effectiveDate
        for (JsonNode exclusion : exclusions) {
            if (!exclusion.has("type") || exclusion.get("type").asText().isEmpty()) {
                logger.warn("Exclusion missing 'type' field");
                return false;
            }

            if (!exclusion.has("reason") || exclusion.get("reason").asText().isEmpty()) {
                logger.warn("Exclusion missing 'reason' field");
                return false;
            }
        }

        return true;
    }
}
