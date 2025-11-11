package com.austa.payment.repositories;

import com.austa.payment.models.Payment;
import com.austa.payment.models.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA Repository for Payment entity with custom queries for analytics and reporting.
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    /**
     * Find payment by transaction ID
     */
    Optional<Payment> findByTransactionId(String transactionId);

    /**
     * Find payment by gateway payment ID
     */
    Optional<Payment> findByGatewayPaymentId(String gatewayPaymentId);

    /**
     * Find all payments for a specific policy
     */
    List<Payment> findByPolicyNumberOrderByCreatedAtDesc(String policyNumber);

    /**
     * Find all payments for a specific beneficiary
     */
    List<Payment> findByBeneficiaryIdOrderByCreatedAtDesc(UUID beneficiaryId);

    /**
     * Find payments by status
     */
    List<Payment> findByStatus(PaymentStatus status);

    /**
     * Find payments by status created within date range
     */
    @Query("SELECT p FROM Payment p WHERE p.status = :status " +
           "AND p.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY p.createdAt DESC")
    List<Payment> findByStatusAndDateRange(
        @Param("status") PaymentStatus status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find expired PIX payments
     */
    @Query("SELECT p FROM Payment p WHERE p.status = 'PENDING' " +
           "AND p.paymentMethod = 'PIX' " +
           "AND p.pixExpiration < :now")
    List<Payment> findExpiredPixPayments(@Param("now") LocalDateTime now);

    /**
     * Find expired Boleto payments
     */
    @Query("SELECT p FROM Payment p WHERE p.status = 'PENDING' " +
           "AND p.paymentMethod = 'BOLETO' " +
           "AND p.boletoDueDate < :now")
    List<Payment> findExpiredBoletoPayments(@Param("now") LocalDateTime now);

    /**
     * Calculate total payment amount by policy
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
           "WHERE p.policyNumber = :policyNumber " +
           "AND p.status = 'COMPLETED'")
    BigDecimal calculateTotalPaidByPolicy(@Param("policyNumber") String policyNumber);

    /**
     * Calculate total payment amount by beneficiary
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
           "WHERE p.beneficiaryId = :beneficiaryId " +
           "AND p.status = 'COMPLETED'")
    BigDecimal calculateTotalPaidByBeneficiary(@Param("beneficiaryId") UUID beneficiaryId);

    /**
     * Get payment statistics for a date range
     */
    @Query("SELECT p.status, COUNT(p), SUM(p.amount) FROM Payment p " +
           "WHERE p.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY p.status")
    List<Object[]> getPaymentStatistics(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Get payment method distribution
     */
    @Query("SELECT p.paymentMethod, COUNT(p), SUM(p.amount) FROM Payment p " +
           "WHERE p.createdAt BETWEEN :startDate AND :endDate " +
           "AND p.status = 'COMPLETED' " +
           "GROUP BY p.paymentMethod")
    List<Object[]> getPaymentMethodDistribution(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find payments pending reconciliation
     */
    @Query("SELECT p FROM Payment p WHERE p.status IN ('PROCESSING', 'PENDING') " +
           "AND p.createdAt < :thresholdDate " +
           "ORDER BY p.createdAt ASC")
    List<Payment> findPaymentsPendingReconciliation(@Param("thresholdDate") LocalDateTime thresholdDate);

    /**
     * Find failed payments that can be retried
     */
    @Query("SELECT p FROM Payment p WHERE p.status = 'FAILED' " +
           "AND p.failedAt > :sinceDate " +
           "ORDER BY p.failedAt DESC")
    List<Payment> findRetryableFailedPayments(@Param("sinceDate") LocalDateTime sinceDate);

    /**
     * Count payments by gateway
     */
    @Query("SELECT p.gateway, COUNT(p) FROM Payment p " +
           "WHERE p.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY p.gateway")
    List<Object[]> countPaymentsByGateway(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find refundable payments
     */
    @Query("SELECT p FROM Payment p WHERE p.status = 'COMPLETED' " +
           "AND p.refundedAt IS NULL " +
           "AND p.confirmedAt > :sinceDate " +
           "ORDER BY p.confirmedAt DESC")
    List<Payment> findRefundablePayments(@Param("sinceDate") LocalDateTime sinceDate);

    /**
     * Check if payment exists by transaction ID
     */
    boolean existsByTransactionId(String transactionId);

    /**
     * Check if payment exists by gateway payment ID
     */
    boolean existsByGatewayPaymentId(String gatewayPaymentId);
}
