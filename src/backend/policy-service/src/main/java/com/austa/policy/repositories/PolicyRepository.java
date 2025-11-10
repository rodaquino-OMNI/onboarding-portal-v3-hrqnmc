package com.austa.policy.repositories;

import com.austa.policy.models.Policy;
import com.austa.policy.models.PolicyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Repository;

import javax.persistence.QueryHint;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Policy entity management with enhanced security, performance optimization,
 * and LGPD compliance features.
 *
 * @version 1.0.0
 */
@Repository
public interface PolicyRepository extends JpaRepository<Policy, UUID> {

    /**
     * Retrieves a policy by its unique policy number with caching enabled.
     * 
     * @param policyNumber The unique policy identifier
     * @return Optional containing the policy if found
     */
    @Cacheable(value = "policyCache", key = "#policyNumber")
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.encrypt", value = "true"),
        @QueryHint(name = "org.hibernate.comment", value = "Policy lookup by number")
    })
    @Query("SELECT p FROM Policy p WHERE p.id = :policyNumber")
    Optional<Policy> findByPolicyNumber(@Param("policyNumber") String policyNumber);

    /**
     * Retrieves a policy associated with an enrollment using encryption.
     * 
     * @param enrollmentId The enrollment UUID
     * @return Optional containing the policy if found
     */
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.encrypt", value = "true"),
        @QueryHint(name = "org.hibernate.timeout", value = "5000")
    })
    @Query("SELECT p FROM Policy p WHERE p.enrollmentId = :enrollmentId")
    Optional<Policy> findByEnrollmentId(@Param("enrollmentId") UUID enrollmentId);

    /**
     * Retrieves paginated pending policies ordered by creation date.
     * 
     * @param pageable Pagination information
     * @return Page of policies with PENDING status
     */
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.fetchSize", value = "50"),
        @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    @Query("SELECT p FROM Policy p WHERE p.status = com.austa.policy.models.Policy.PolicyStatus.PENDING_ACTIVATION ORDER BY p.createdAt DESC")
    Page<Policy> findPendingPolicies(Pageable pageable);

    /**
     * Retrieves active policies expiring before a given date with limit.
     * 
     * @param expirationDate The cutoff date for policy expiration
     * @param limit Maximum number of records to return
     * @return Limited list of active policies expiring before the given date
     */
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.timeout", value = "10000"),
        @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    @Query(value = "SELECT * FROM policies p WHERE p.status = 'ACTIVE' AND p.expiration_date < :expirationDate " +
           "ORDER BY p.expiration_date ASC LIMIT :limit", nativeQuery = true)
    List<Policy> findActivePoliciesByExpirationDateBefore(
        @Param("expirationDate") LocalDateTime expirationDate,
        @Param("limit") int limit
    );

    /**
     * Retrieves active policies eligible for renewal within date range.
     * 
     * @param startDate Start of the date range
     * @param endDate End of the date range
     * @param pageable Pagination information
     * @return Page of active policies eligible for renewal
     */
    @QueryHints(value = {
        @QueryHint(name = "org.hibernate.readOnly", value = "true"),
        @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    @Query("SELECT p FROM Policy p WHERE p.status = 'ACTIVE' AND " +
           "p.expirationDate BETWEEN :startDate AND :endDate")
    Page<Policy> findActiveRenewablePolicies(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );

    /**
     * Counts policies by status within a date range with caching.
     * 
     * @param status Policy status to count
     * @param startDate Start of the date range
     * @param endDate End of the date range
     * @return Number of policies matching criteria
     */
    @Cacheable(value = "policyStatsCache", key = "{#status, #startDate, #endDate}")
    @QueryHints(value = @QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Query("SELECT COUNT(p) FROM Policy p WHERE p.status = :status AND " +
           "p.createdAt BETWEEN :startDate AND :endDate")
    Long countPoliciesByStatusAndDate(
        @Param("status") PolicyStatus status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}