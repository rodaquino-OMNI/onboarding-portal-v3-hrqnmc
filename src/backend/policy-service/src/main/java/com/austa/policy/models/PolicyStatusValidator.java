package com.austa.policy.models;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Set;

import static com.austa.policy.models.Policy.PolicyStatus.*;

/**
 * Validator class for policy status transitions.
 * Enforces business rules for valid state transitions in the policy lifecycle.
 *
 * @version 1.0.0
 */
public class PolicyStatusValidator {

    private static final Logger logger = LoggerFactory.getLogger(PolicyStatusValidator.class);

    /**
     * Valid transitions map defining allowed state changes.
     * Each policy status maps to a set of valid target statuses.
     */
    private static final Map<Policy.PolicyStatus, Set<Policy.PolicyStatus>> VALID_TRANSITIONS = Map.of(
        DRAFT, Set.of(PENDING_ACTIVATION, CANCELLED),
        PENDING_ACTIVATION, Set.of(ACTIVE, CANCELLED),
        ACTIVE, Set.of(SUSPENDED, CANCELLED, PENDING_RENEWAL),
        SUSPENDED, Set.of(ACTIVE, CANCELLED),
        PENDING_RENEWAL, Set.of(ACTIVE, EXPIRED),
        CANCELLED, Set.of(), // Terminal state - no transitions allowed
        EXPIRED, Set.of() // Terminal state - no transitions allowed
    );

    /**
     * Validates if a status transition is allowed.
     *
     * @param from Current policy status
     * @param to Target policy status
     * @return true if the transition is valid, false otherwise
     */
    public static boolean isValidTransition(Policy.PolicyStatus from, Policy.PolicyStatus to) {
        if (from == null || to == null) {
            logger.warn("Null status provided for transition validation");
            return false;
        }

        if (from == to) {
            logger.debug("Transition to same status: {}", from);
            return true; // Allow same-state transitions
        }

        Set<Policy.PolicyStatus> allowedTransitions = VALID_TRANSITIONS.get(from);
        if (allowedTransitions == null) {
            logger.error("No transition rules defined for status: {}", from);
            return false;
        }

        boolean isValid = allowedTransitions.contains(to);
        if (!isValid) {
            logger.warn("Invalid transition attempt from {} to {}", from, to);
        } else {
            logger.debug("Valid transition from {} to {}", from, to);
        }

        return isValid;
    }

    /**
     * Generates a descriptive error message for an invalid transition.
     *
     * @param from Current policy status
     * @param to Target policy status
     * @return Error message describing why the transition is invalid
     */
    public static String getTransitionErrorMessage(Policy.PolicyStatus from, Policy.PolicyStatus to) {
        if (from == null || to == null) {
            return "Cannot transition with null status values";
        }

        if (from == to) {
            return "Policy is already in " + from + " status";
        }

        Set<Policy.PolicyStatus> allowedTransitions = VALID_TRANSITIONS.get(from);
        if (allowedTransitions == null || allowedTransitions.isEmpty()) {
            return String.format("Status %s is a terminal state. No further transitions are allowed.", from);
        }

        if (!allowedTransitions.contains(to)) {
            return String.format(
                "Invalid status transition from %s to %s. Allowed transitions: %s",
                from,
                to,
                allowedTransitions
            );
        }

        return "Transition is valid";
    }

    /**
     * Returns the set of valid target statuses for a given current status.
     *
     * @param currentStatus Current policy status
     * @return Set of valid target statuses, or empty set if none allowed
     */
    public static Set<Policy.PolicyStatus> getValidTransitions(Policy.PolicyStatus currentStatus) {
        if (currentStatus == null) {
            logger.warn("Null status provided for getting valid transitions");
            return Set.of();
        }

        return VALID_TRANSITIONS.getOrDefault(currentStatus, Set.of());
    }
}
