package com.austa.payment.services;

import com.austa.payment.dto.ReconciliationReport;
import com.austa.payment.models.Payment;
import com.austa.payment.models.PaymentStatus;
import com.austa.payment.repositories.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Payment reconciliation service.
 * Handles daily reconciliation of payments with gateway transactions.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentReconciliationService {

    private final PaymentRepository paymentRepository;

    /**
     * Reconcile payments for a specific date
     */
    @Transactional
    public ReconciliationReport reconcilePayments(LocalDate date) {
        log.info("Starting payment reconciliation for date: {}", date);

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        // Fetch all payments for the date
        List<Payment> pendingPayments = paymentRepository.findByStatusAndDateRange(
            PaymentStatus.PENDING, startOfDay, endOfDay);

        List<Payment> processingPayments = paymentRepository.findByStatusAndDateRange(
            PaymentStatus.PROCESSING, startOfDay, endOfDay);

        List<Payment> completedPayments = paymentRepository.findByStatusAndDateRange(
            PaymentStatus.COMPLETED, startOfDay, endOfDay);

        List<Payment> allPayments = new ArrayList<>();
        allPayments.addAll(pendingPayments);
        allPayments.addAll(processingPayments);
        allPayments.addAll(completedPayments);

        ReconciliationReport.ReconciliationReportBuilder reportBuilder = ReconciliationReport.builder()
            .reconciliationDate(date)
            .totalPayments(allPayments.size())
            .status("IN_PROGRESS");

        List<ReconciliationReport.PaymentDiscrepancy> discrepancies = new ArrayList<>();
        List<UUID> unmatchedPaymentIds = new ArrayList<>();
        int matchedCount = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal matchedAmount = BigDecimal.ZERO;
        BigDecimal unmatchedAmount = BigDecimal.ZERO;

        // Reconcile each payment
        for (Payment payment : allPayments) {
            totalAmount = totalAmount.add(payment.getAmount());

            try {
                // Check if payment was confirmed with gateway
                boolean isMatched = matchPaymentWithGateway(payment);

                if (isMatched) {
                    matchedCount++;
                    matchedAmount = matchedAmount.add(payment.getAmount());
                } else {
                    unmatchedPaymentIds.add(payment.getId());
                    unmatchedAmount = unmatchedAmount.add(payment.getAmount());

                    // Create discrepancy record
                    ReconciliationReport.PaymentDiscrepancy discrepancy =
                        ReconciliationReport.PaymentDiscrepancy.builder()
                            .paymentId(payment.getId())
                            .transactionId(payment.getTransactionId())
                            .discrepancyType("UNMATCHED")
                            .description("Payment not found in gateway records")
                            .expectedAmount(payment.getAmount())
                            .actualAmount(BigDecimal.ZERO)
                            .resolution("PENDING_INVESTIGATION")
                            .build();

                    discrepancies.add(discrepancy);
                }
            } catch (Exception e) {
                log.error("Error reconciling payment: {}", payment.getId(), e);

                ReconciliationReport.PaymentDiscrepancy discrepancy =
                    ReconciliationReport.PaymentDiscrepancy.builder()
                        .paymentId(payment.getId())
                        .transactionId(payment.getTransactionId())
                        .discrepancyType("ERROR")
                        .description("Error during reconciliation: " + e.getMessage())
                        .expectedAmount(payment.getAmount())
                        .resolution("REQUIRES_MANUAL_REVIEW")
                        .build();

                discrepancies.add(discrepancy);
            }
        }

        // Handle stuck payments (processing for too long)
        List<Payment> stuckPayments = findStuckPayments();
        for (Payment payment : stuckPayments) {
            ReconciliationReport.PaymentDiscrepancy discrepancy =
                ReconciliationReport.PaymentDiscrepancy.builder()
                    .paymentId(payment.getId())
                    .transactionId(payment.getTransactionId())
                    .discrepancyType("STUCK_PAYMENT")
                    .description("Payment stuck in processing state for over 24 hours")
                    .expectedAmount(payment.getAmount())
                    .resolution("AUTO_FAILED")
                    .build();

            discrepancies.add(discrepancy);

            // Auto-fail stuck payments
            payment.updateStatus(PaymentStatus.FAILED);
            payment.setErrorCode("RECONCILIATION_TIMEOUT");
            payment.setErrorMessage("Payment stuck in processing state");
            paymentRepository.save(payment);
        }

        // Build final report
        ReconciliationReport report = reportBuilder
            .matchedPayments(matchedCount)
            .unmatchedPayments(allPayments.size() - matchedCount)
            .discrepancies(discrepancies.size())
            .totalAmount(totalAmount)
            .matchedAmount(matchedAmount)
            .unmatchedAmount(unmatchedAmount)
            .paymentDiscrepancies(discrepancies)
            .unmatchedPaymentIds(unmatchedPaymentIds)
            .status("COMPLETED")
            .notes(String.format("Reconciliation completed. %d matched, %d unmatched, %d discrepancies",
                matchedCount, allPayments.size() - matchedCount, discrepancies.size()))
            .build();

        log.info("Payment reconciliation completed for {}: {} payments, {} discrepancies",
            date, allPayments.size(), discrepancies.size());

        return report;
    }

    /**
     * Match payment with gateway transaction
     */
    @Transactional
    public void matchPaymentWithPolicy(String transactionId) {
        log.debug("Matching payment with transaction ID: {}", transactionId);

        Payment payment = paymentRepository.findByTransactionId(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + transactionId));

        // Verify with gateway
        boolean isConfirmed = verifyWithGateway(payment);

        if (isConfirmed && payment.getStatus() != PaymentStatus.COMPLETED) {
            payment.updateStatus(PaymentStatus.COMPLETED);
            paymentRepository.save(payment);
            log.info("Payment {} matched and confirmed", payment.getId());
        }
    }

    /**
     * Handle discrepancies from unmatched payments
     */
    @Transactional
    public void handleDiscrepancies(List<Payment> unmatchedPayments) {
        log.info("Handling {} unmatched payments", unmatchedPayments.size());

        for (Payment payment : unmatchedPayments) {
            try {
                // Check if payment has expired
                if (isPaymentExpired(payment)) {
                    payment.updateStatus(PaymentStatus.EXPIRED);
                    paymentRepository.save(payment);
                    log.info("Payment {} marked as expired", payment.getId());
                    continue;
                }

                // Check if payment should be auto-failed
                if (shouldAutoFail(payment)) {
                    payment.updateStatus(PaymentStatus.FAILED);
                    payment.setErrorCode("AUTO_FAILED");
                    payment.setErrorMessage("Payment auto-failed during reconciliation");
                    paymentRepository.save(payment);
                    log.info("Payment {} auto-failed", payment.getId());
                    continue;
                }

                // For others, just log for manual review
                log.warn("Payment {} requires manual review", payment.getId());

            } catch (Exception e) {
                log.error("Error handling discrepancy for payment {}", payment.getId(), e);
            }
        }
    }

    /**
     * Scheduled job to reconcile payments daily at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void scheduledReconciliation() {
        log.info("Starting scheduled payment reconciliation");

        try {
            LocalDate yesterday = LocalDate.now().minusDays(1);
            ReconciliationReport report = reconcilePayments(yesterday);

            log.info("Scheduled reconciliation completed: {}", report.getNotes());

            // Check for expired PIX and Boleto payments
            expireStalePayments();

        } catch (Exception e) {
            log.error("Error during scheduled reconciliation", e);
        }
    }

    /**
     * Expire stale PIX and Boleto payments
     */
    @Transactional
    public void expireStalePayments() {
        LocalDateTime now = LocalDateTime.now();

        // Expire PIX payments
        List<Payment> expiredPix = paymentRepository.findExpiredPixPayments(now);
        for (Payment payment : expiredPix) {
            payment.updateStatus(PaymentStatus.EXPIRED);
            paymentRepository.save(payment);
            log.info("PIX payment {} marked as expired", payment.getId());
        }

        // Expire Boleto payments
        List<Payment> expiredBoleto = paymentRepository.findExpiredBoletoPayments(now);
        for (Payment payment : expiredBoleto) {
            payment.updateStatus(PaymentStatus.EXPIRED);
            paymentRepository.save(payment);
            log.info("Boleto payment {} marked as expired", payment.getId());
        }

        log.info("Expired {} PIX and {} Boleto payments",
            expiredPix.size(), expiredBoleto.size());
    }

    /**
     * Check if payment matches with gateway records
     */
    private boolean matchPaymentWithGateway(Payment payment) {
        // This would call the actual gateway API to verify
        // For now, assume payments with gatewayPaymentId are matched
        return payment.getGatewayPaymentId() != null;
    }

    /**
     * Verify payment status with gateway
     */
    private boolean verifyWithGateway(Payment payment) {
        // This would call the actual gateway API
        log.debug("Verifying payment {} with gateway {}", payment.getId(), payment.getGateway());
        return true;
    }

    /**
     * Find payments stuck in processing state
     */
    private List<Payment> findStuckPayments() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        return paymentRepository.findPaymentsPendingReconciliation(threshold);
    }

    /**
     * Check if payment has expired
     */
    private boolean isPaymentExpired(Payment payment) {
        LocalDateTime now = LocalDateTime.now();

        if (payment.getPixExpiration() != null && payment.getPixExpiration().isBefore(now)) {
            return true;
        }

        if (payment.getBoletoDueDate() != null && payment.getBoletoDueDate().isBefore(now)) {
            return true;
        }

        return false;
    }

    /**
     * Check if payment should be auto-failed
     */
    private boolean shouldAutoFail(Payment payment) {
        // Auto-fail payments that have been processing for more than 48 hours
        if (payment.getStatus() == PaymentStatus.PROCESSING) {
            LocalDateTime threshold = LocalDateTime.now().minusHours(48);
            return payment.getProcessedAt() != null && payment.getProcessedAt().isBefore(threshold);
        }

        return false;
    }
}
