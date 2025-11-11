package com.austa.payment.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * DTO for payment reconciliation reports.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationReport {

    private LocalDate reconciliationDate;
    private int totalPayments;
    private int matchedPayments;
    private int unmatchedPayments;
    private int discrepancies;

    private BigDecimal totalAmount;
    private BigDecimal matchedAmount;
    private BigDecimal unmatchedAmount;

    @Builder.Default
    private List<PaymentDiscrepancy> paymentDiscrepancies = new ArrayList<>();

    @Builder.Default
    private List<UUID> unmatchedPaymentIds = new ArrayList<>();

    private String status; // COMPLETED, IN_PROGRESS, FAILED
    private String notes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentDiscrepancy {
        private UUID paymentId;
        private String transactionId;
        private String discrepancyType;
        private String description;
        private BigDecimal expectedAmount;
        private BigDecimal actualAmount;
        private String resolution;
    }
}
