package com.austa.enrollment.repositories;

import com.austa.enrollment.models.Enrollment;
import com.austa.enrollment.models.EnrollmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.QueryHint;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for managing Enrollment entity persistence operations.
 * Implements optimized queries with proper indexing and security controls.
 * Version: Spring Data JPA 3.0.0
 */
@Repository
@Cacheable("enrollments")
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    /**
     * Find enrollment by ID with security filtering
     */
    @Query("SELECT e FROM Enrollment e WHERE e.id = :id AND (e.brokerId = :currentUserId OR e.beneficiaryId = :currentUserId)")
    @QueryHints(@QueryHint(name = "org.hibernate.comment", value = "Using primary key lookup with security filter"))
    Optional<Enrollment> findByIdAndAuthorized(@Param("id") UUID id, @Param("currentUserId") UUID currentUserId);

    /**
     * Find all enrollments for a beneficiary with optimized query
     */
    @Query("SELECT e FROM Enrollment e WHERE e.beneficiaryId = :beneficiaryId")
    @QueryHints(@QueryHint(name = "org.hibernate.comment", value = "Index scan on beneficiary_id"))
    List<Enrollment> findByBeneficiaryId(@Param("beneficiaryId") UUID beneficiaryId);

    /**
     * Find all enrollments with a specific status using pagination
     */
    @Query(value = "SELECT e FROM Enrollment e WHERE e.status = :status",
           countQuery = "SELECT COUNT(e) FROM Enrollment e WHERE e.status = :status")
    @QueryHints(@QueryHint(name = "org.hibernate.comment", value = "Index scan on status with pagination"))
    Page<Enrollment> findByStatus(@Param("status") EnrollmentStatus status, Pageable pageable);

    /**
     * Find all enrollments for a broker with specific status using pagination
     */
    @Query(value = "SELECT e FROM Enrollment e WHERE e.brokerId = :brokerId AND e.status = :status",
           countQuery = "SELECT COUNT(e) FROM Enrollment e WHERE e.brokerId = :brokerId AND e.status = :status")
    @QueryHints(@QueryHint(name = "org.hibernate.comment", value = "Composite index scan on broker_id and status"))
    Page<Enrollment> findByBrokerIdAndStatus(
        @Param("brokerId") UUID brokerId,
        @Param("status") EnrollmentStatus status,
        Pageable pageable
    );

    /**
     * Update enrollment status with audit trail
     */
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE Enrollment e 
        SET e.status = :status,
            e.updatedAt = CURRENT_TIMESTAMP 
        WHERE e.id = :enrollmentId 
        AND (e.status != :status)
        """)
    int updateStatus(
        @Param("enrollmentId") UUID enrollmentId,
        @Param("status") EnrollmentStatus status
    );

    /**
     * Count enrollments by status within a date range with caching
     */
    @Cacheable(value = "enrollmentStats", key = "#status + #startDate + #endDate")
    @Query(value = """
        SELECT COUNT(e) 
        FROM Enrollment e 
        WHERE e.status = :status 
        AND e.submittedAt BETWEEN :startDate AND :endDate
        """)
    @QueryHints(@QueryHint(name = "org.hibernate.comment", value = "Using composite index on status and submitted_at"))
    Long countByStatusAndSubmittedAtBetween(
        @Param("status") EnrollmentStatus status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find pending enrollments that need review
     */
    @Query(value = """
        SELECT e FROM Enrollment e 
        WHERE e.status = 'PENDING' 
        AND e.submittedAt < :cutoffDate
        ORDER BY e.submittedAt ASC
        """)
    @QueryHints(@QueryHint(name = "org.hibernate.comment", value = "Index scan on status and submitted_at"))
    List<Enrollment> findPendingEnrollmentsForReview(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Find enrollments requiring document verification
     */
    @Query(value = """
        SELECT e FROM Enrollment e 
        WHERE e.status = 'IN_REVIEW' 
        AND EXISTS (
            SELECT 1 FROM e.documents d 
            WHERE d.verified = false
        )
        """)
    @QueryHints(@QueryHint(name = "org.hibernate.comment", value = "Using status index with document subquery"))
    List<Enrollment> findEnrollmentsRequiringDocumentVerification();
}