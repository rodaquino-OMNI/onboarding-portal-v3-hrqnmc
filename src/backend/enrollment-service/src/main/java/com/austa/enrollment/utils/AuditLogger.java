package com.austa.enrollment.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Utility class for audit trail logging.
 * Provides comprehensive logging for enrollment operations and security events.
 *
 * @version 1.0
 */
@Component
public class AuditLogger {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogger.class);
    private static final Logger auditLogger = LoggerFactory.getLogger("AUDIT_TRAIL");
    private static final Logger securityLogger = LoggerFactory.getLogger("SECURITY_EVENTS");

    private static final DateTimeFormatter TIMESTAMP_FORMATTER =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    /**
     * Logs an enrollment-related action with detailed context.
     *
     * @param action the action being performed
     * @param enrollmentId the enrollment ID
     * @param userId the user performing the action
     * @param changes map of field changes (old value -> new value)
     */
    public void logEnrollmentAction(String action, UUID enrollmentId, String userId, Map<String, Object> changes) {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);

        StringBuilder auditEntry = new StringBuilder();
        auditEntry.append(String.format("[%s] ENROLLMENT_ACTION | ", timestamp));
        auditEntry.append(String.format("Action: %s | ", action));
        auditEntry.append(String.format("EnrollmentId: %s | ", enrollmentId));
        auditEntry.append(String.format("UserId: %s", userId));

        if (changes != null && !changes.isEmpty()) {
            String changesStr = changes.entrySet().stream()
                .map(entry -> String.format("%s: %s", entry.getKey(), maskSensitiveData(entry.getKey(), entry.getValue())))
                .collect(Collectors.joining(", "));
            auditEntry.append(String.format(" | Changes: {%s}", changesStr));
        }

        auditLogger.info(auditEntry.toString());
        logger.debug("Logged enrollment action: {} for enrollment: {}", action, enrollmentId);
    }

    /**
     * Logs an enrollment-related action with minimal context.
     *
     * @param action the action being performed
     * @param enrollmentId the enrollment ID
     */
    public void logAction(String action, UUID enrollmentId) {
        logEnrollmentAction(action, enrollmentId, "SYSTEM", null);
    }

    /**
     * Logs an enrollment-related action for a beneficiary.
     *
     * @param action the action being performed
     * @param beneficiaryId the beneficiary ID
     */
    public void logAction(String action, UUID beneficiaryId, String context) {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);

        String auditEntry = String.format("[%s] BENEFICIARY_ACTION | Action: %s | BeneficiaryId: %s | Context: %s",
            timestamp, action, beneficiaryId, context);

        auditLogger.info(auditEntry);
        logger.debug("Logged beneficiary action: {} for beneficiary: {}", action, beneficiaryId);
    }

    /**
     * Logs a security-related event with IP address and user context.
     *
     * @param event the security event description
     * @param userId the user ID associated with the event
     * @param ipAddress the IP address of the request
     */
    public void logSecurityEvent(String event, String userId, String ipAddress) {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);

        String securityEntry = String.format("[%s] SECURITY_EVENT | Event: %s | UserId: %s | IP: %s",
            timestamp, event, userId != null ? userId : "UNKNOWN", ipAddress != null ? ipAddress : "N/A");

        securityLogger.warn(securityEntry);
        logger.warn("Security event logged: {} for user: {}", event, userId);
    }

    /**
     * Logs a security event with additional context.
     *
     * @param event the security event description
     * @param userId the user ID
     * @param ipAddress the IP address
     * @param additionalInfo additional context information
     */
    public void logSecurityEvent(String event, String userId, String ipAddress, Map<String, String> additionalInfo) {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);

        StringBuilder securityEntry = new StringBuilder();
        securityEntry.append(String.format("[%s] SECURITY_EVENT | ", timestamp));
        securityEntry.append(String.format("Event: %s | ", event));
        securityEntry.append(String.format("UserId: %s | ", userId != null ? userId : "UNKNOWN"));
        securityEntry.append(String.format("IP: %s", ipAddress != null ? ipAddress : "N/A"));

        if (additionalInfo != null && !additionalInfo.isEmpty()) {
            String infoStr = additionalInfo.entrySet().stream()
                .map(entry -> String.format("%s: %s", entry.getKey(), entry.getValue()))
                .collect(Collectors.joining(", "));
            securityEntry.append(String.format(" | AdditionalInfo: {%s}", infoStr));
        }

        securityLogger.warn(securityEntry.toString());
        logger.warn("Security event logged: {} for user: {}", event, userId);
    }

    /**
     * Logs a failed authentication attempt.
     *
     * @param userId the user ID that failed authentication
     * @param ipAddress the IP address of the attempt
     * @param reason the reason for failure
     */
    public void logAuthenticationFailure(String userId, String ipAddress, String reason) {
        logSecurityEvent("AUTHENTICATION_FAILURE", userId, ipAddress,
            Map.of("reason", reason, "severity", "HIGH"));
    }

    /**
     * Logs unauthorized access attempt.
     *
     * @param userId the user ID attempting unauthorized access
     * @param resource the resource being accessed
     * @param ipAddress the IP address
     */
    public void logUnauthorizedAccess(String userId, String resource, String ipAddress) {
        logSecurityEvent("UNAUTHORIZED_ACCESS", userId, ipAddress,
            Map.of("resource", resource, "severity", "CRITICAL"));
    }

    /**
     * Logs data access for compliance and audit purposes.
     *
     * @param userId the user accessing data
     * @param dataType the type of data accessed
     * @param recordId the record ID accessed
     */
    public void logDataAccess(String userId, String dataType, UUID recordId) {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);

        String auditEntry = String.format("[%s] DATA_ACCESS | UserId: %s | DataType: %s | RecordId: %s",
            timestamp, userId, dataType, recordId);

        auditLogger.info(auditEntry);
        logger.debug("Data access logged: {} by user: {}", dataType, userId);
    }

    /**
     * Logs document operations (upload, download, delete).
     *
     * @param operation the document operation
     * @param documentId the document ID
     * @param userId the user performing the operation
     * @param enrollmentId the associated enrollment ID
     */
    public void logDocumentOperation(String operation, UUID documentId, String userId, UUID enrollmentId) {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);

        String auditEntry = String.format("[%s] DOCUMENT_OPERATION | Operation: %s | DocumentId: %s | UserId: %s | EnrollmentId: %s",
            timestamp, operation, documentId, userId, enrollmentId);

        auditLogger.info(auditEntry);
        logger.debug("Document operation logged: {} for document: {}", operation, documentId);
    }

    /**
     * Masks sensitive data in audit logs.
     *
     * @param fieldName the field name
     * @param value the value to potentially mask
     * @return masked or original value
     */
    private String maskSensitiveData(String fieldName, Object value) {
        if (value == null) {
            return "null";
        }

        String lowerFieldName = fieldName.toLowerCase();

        if (lowerFieldName.contains("password") || lowerFieldName.contains("secret")) {
            return "********";
        }

        if (lowerFieldName.contains("cpf")) {
            return DataMaskingUtil.maskCPF(value.toString());
        }

        if (lowerFieldName.contains("email")) {
            return DataMaskingUtil.maskEmail(value.toString());
        }

        if (lowerFieldName.contains("card") || lowerFieldName.contains("account")) {
            return "****" + value.toString().substring(Math.max(0, value.toString().length() - 4));
        }

        return value.toString();
    }

    /**
     * Logs status transition for enrollment.
     *
     * @param enrollmentId the enrollment ID
     * @param oldStatus the old status
     * @param newStatus the new status
     * @param userId the user making the change
     * @param reason the reason for transition
     */
    public void logStatusTransition(UUID enrollmentId, String oldStatus, String newStatus, String userId, String reason) {
        Map<String, Object> changes = Map.of(
            "oldStatus", oldStatus,
            "newStatus", newStatus,
            "reason", reason != null ? reason : "N/A"
        );

        logEnrollmentAction("STATUS_TRANSITION", enrollmentId, userId, changes);
    }
}
