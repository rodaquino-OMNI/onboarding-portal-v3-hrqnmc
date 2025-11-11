package com.austa.enrollment.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Utility class for masking PII (Personally Identifiable Information) and PHI (Protected Health Information).
 * Ensures compliance with LGPD and data protection regulations.
 *
 * @version 1.0
 */
public class DataMaskingUtil {

    private static final Logger logger = LoggerFactory.getLogger(DataMaskingUtil.class);

    private static final String MASK_CHAR = "*";
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^(.+)@(.+)$");
    private static final Pattern CPF_PATTERN = Pattern.compile("^(\\d{3}\\.?\\d{3}\\.?\\d{3}-?)(\\d{2})$");

    // Sensitive field names to mask in JSON
    private static final Set<String> SENSITIVE_FIELDS = new HashSet<>(Arrays.asList(
        "password", "secret", "token", "cardNumber", "cvv", "securityCode",
        "accountNumber", "routingNumber", "ssn", "taxId", "medicalHistory",
        "diagnosis", "prescription", "healthCondition", "symptoms",
        "geneticData", "biometricData", "mentalHealth"
    ));

    /**
     * Private constructor to prevent instantiation.
     */
    private DataMaskingUtil() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }

    /**
     * Masks an email address, showing only the first character and domain.
     * Example: john.doe@example.com -> j********@example.com
     *
     * @param email the email address to mask
     * @return masked email address
     */
    public static String maskEmail(String email) {
        if (email == null || email.isEmpty()) {
            return email;
        }

        try {
            var matcher = EMAIL_PATTERN.matcher(email);
            if (matcher.matches()) {
                String localPart = matcher.group(1);
                String domain = matcher.group(2);

                if (localPart.length() <= 1) {
                    return MASK_CHAR.repeat(3) + "@" + domain;
                }

                String maskedLocal = localPart.charAt(0) +
                    MASK_CHAR.repeat(Math.min(localPart.length() - 1, 8));

                return maskedLocal + "@" + domain;
            }

            // If pattern doesn't match, mask everything except @ and domain
            int atIndex = email.indexOf('@');
            if (atIndex > 0) {
                return email.charAt(0) + MASK_CHAR.repeat(atIndex - 1) + email.substring(atIndex);
            }

            return MASK_CHAR.repeat(email.length());

        } catch (Exception e) {
            logger.warn("Error masking email, returning fully masked value", e);
            return MASK_CHAR.repeat(10);
        }
    }

    /**
     * Masks a CPF (Brazilian tax ID), showing only the last 4 digits.
     * Example: 123.456.789-00 -> ***.***.**9-00
     *
     * @param cpf the CPF to mask
     * @return masked CPF
     */
    public static String maskCPF(String cpf) {
        if (cpf == null || cpf.isEmpty()) {
            return cpf;
        }

        try {
            // Remove non-digit characters for processing
            String digitsOnly = cpf.replaceAll("\\D", "");

            if (digitsOnly.length() != 11) {
                logger.warn("Invalid CPF length: {}", digitsOnly.length());
                return MASK_CHAR.repeat(cpf.length());
            }

            // Show only last 4 digits
            String lastFour = digitsOnly.substring(7);

            // Check if original had formatting
            if (cpf.contains(".") || cpf.contains("-")) {
                return "***.***.***-" + lastFour.substring(0, 2);
            } else {
                return "*******" + lastFour;
            }

        } catch (Exception e) {
            logger.warn("Error masking CPF, returning fully masked value", e);
            return MASK_CHAR.repeat(cpf.length());
        }
    }

    /**
     * Masks health data in a JSON node, removing or masking sensitive health fields.
     * Removes fields like medical history, diagnoses, prescriptions, etc.
     *
     * @param healthData the health data JSON node
     * @return masked health data JSON node
     */
    public static JsonNode maskHealthData(JsonNode healthData) {
        if (healthData == null || healthData.isNull()) {
            return healthData;
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode maskedData = healthData.deepCopy();

            if (maskedData.isObject()) {
                maskSensitiveFields((ObjectNode) maskedData, mapper);
            }

            return maskedData;

        } catch (Exception e) {
            logger.warn("Error masking health data, returning null", e);
            return null;
        }
    }

    /**
     * Recursively masks sensitive fields in a JSON object.
     *
     * @param node the JSON object node
     * @param mapper the ObjectMapper instance
     */
    private static void maskSensitiveFields(ObjectNode node, ObjectMapper mapper) {
        Iterator<String> fieldNames = node.fieldNames();

        while (fieldNames.hasNext()) {
            String fieldName = fieldNames.next();
            JsonNode fieldValue = node.get(fieldName);

            // Check if this field should be masked
            if (isSensitiveField(fieldName)) {
                if (fieldValue.isTextual()) {
                    node.put(fieldName, MASK_CHAR.repeat(8));
                } else if (fieldValue.isNumber()) {
                    node.put(fieldName, "***");
                } else if (fieldValue.isArray() || fieldValue.isObject()) {
                    node.put(fieldName, "[REDACTED]");
                }
            } else if (fieldValue.isObject()) {
                // Recursively mask nested objects
                maskSensitiveFields((ObjectNode) fieldValue, mapper);
            } else if (fieldValue.isArray()) {
                // Process array elements
                for (int i = 0; i < fieldValue.size(); i++) {
                    if (fieldValue.get(i).isObject()) {
                        maskSensitiveFields((ObjectNode) fieldValue.get(i), mapper);
                    }
                }
            }
        }
    }

    /**
     * Checks if a field name is considered sensitive.
     *
     * @param fieldName the field name
     * @return true if sensitive, false otherwise
     */
    private static boolean isSensitiveField(String fieldName) {
        String lowerFieldName = fieldName.toLowerCase();

        // Check exact matches
        if (SENSITIVE_FIELDS.contains(lowerFieldName)) {
            return true;
        }

        // Check partial matches for health-related fields
        return lowerFieldName.contains("medical") ||
               lowerFieldName.contains("health") ||
               lowerFieldName.contains("diagnosis") ||
               lowerFieldName.contains("prescription") ||
               lowerFieldName.contains("condition") ||
               lowerFieldName.contains("symptom") ||
               lowerFieldName.contains("treatment") ||
               lowerFieldName.contains("medication") ||
               lowerFieldName.contains("allergy") ||
               lowerFieldName.contains("disease");
    }

    /**
     * Masks a phone number, showing only the last 4 digits.
     * Example: +55 11 98765-4321 -> +55 ** ****5-4321
     *
     * @param phoneNumber the phone number to mask
     * @return masked phone number
     */
    public static String maskPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return phoneNumber;
        }

        try {
            String digitsOnly = phoneNumber.replaceAll("\\D", "");

            if (digitsOnly.length() < 4) {
                return MASK_CHAR.repeat(phoneNumber.length());
            }

            String lastFour = digitsOnly.substring(digitsOnly.length() - 4);
            return MASK_CHAR.repeat(phoneNumber.length() - 4) + lastFour;

        } catch (Exception e) {
            logger.warn("Error masking phone number, returning fully masked value", e);
            return MASK_CHAR.repeat(phoneNumber.length());
        }
    }

    /**
     * Masks a credit card number, showing only the last 4 digits.
     * Example: 1234 5678 9012 3456 -> **** **** **** 3456
     *
     * @param cardNumber the card number to mask
     * @return masked card number
     */
    public static String maskCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.isEmpty()) {
            return cardNumber;
        }

        try {
            String digitsOnly = cardNumber.replaceAll("\\D", "");

            if (digitsOnly.length() < 4) {
                return MASK_CHAR.repeat(cardNumber.length());
            }

            String lastFour = digitsOnly.substring(digitsOnly.length() - 4);

            // Check if original had formatting
            if (cardNumber.contains(" ")) {
                return "**** **** **** " + lastFour;
            } else if (cardNumber.contains("-")) {
                return "****-****-****-" + lastFour;
            } else {
                return MASK_CHAR.repeat(digitsOnly.length() - 4) + lastFour;
            }

        } catch (Exception e) {
            logger.warn("Error masking card number, returning fully masked value", e);
            return MASK_CHAR.repeat(cardNumber.length());
        }
    }

    /**
     * Masks a UUID by showing only a portion of it.
     *
     * @param uuid the UUID to mask
     * @return masked UUID string
     */
    public static String maskSensitiveId(UUID uuid) {
        if (uuid == null) {
            return null;
        }

        String uuidStr = uuid.toString();
        // Show only first 8 characters
        return uuidStr.substring(0, 8) + "-****-****-****-************";
    }

    /**
     * Masks a general string value based on its length.
     *
     * @param value the value to mask
     * @return masked value
     */
    public static String maskValue(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }

        int length = value.length();

        if (length <= 2) {
            return MASK_CHAR.repeat(length);
        } else if (length <= 4) {
            return value.charAt(0) + MASK_CHAR.repeat(length - 1);
        } else {
            // Show first and last character
            return value.charAt(0) +
                   MASK_CHAR.repeat(length - 2) +
                   value.charAt(length - 1);
        }
    }

    /**
     * Masks personal information in a complete JSON object.
     *
     * @param personalInfo the personal information JSON node
     * @return masked personal information
     */
    public static JsonNode maskPersonalInfo(JsonNode personalInfo) {
        if (personalInfo == null || personalInfo.isNull()) {
            return personalInfo;
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode masked = (ObjectNode) personalInfo.deepCopy();

            // Mask specific fields
            if (masked.has("cpf")) {
                String cpf = masked.get("cpf").asText();
                masked.put("cpf", maskCPF(cpf));
            }

            if (masked.has("email")) {
                String email = masked.get("email").asText();
                masked.put("email", maskEmail(email));
            }

            if (masked.has("phone")) {
                String phone = masked.get("phone").asText();
                masked.put("phone", maskPhoneNumber(phone));
            }

            // Mask all sensitive fields
            maskSensitiveFields(masked, mapper);

            return masked;

        } catch (Exception e) {
            logger.warn("Error masking personal info, returning original", e);
            return personalInfo;
        }
    }
}
