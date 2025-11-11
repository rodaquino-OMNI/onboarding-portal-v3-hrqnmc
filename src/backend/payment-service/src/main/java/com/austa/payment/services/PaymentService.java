package com.austa.payment.services;

import com.austa.payment.dto.*;
import com.austa.payment.exceptions.*;
import com.austa.payment.gateways.*;
import com.austa.payment.models.*;
import com.austa.payment.repositories.PaymentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Main payment orchestration service.
 * Handles payment creation, processing, refunds, and cancellations.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    // Payment gateway would be injected here
    // private final StripeGateway stripeGateway;
    // private final MercadoPagoGateway mercadoPagoGateway;
    // private final PagSeguroGateway pagSeguroGateway;

    // Metrics counters
    private Counter getPaymentCounter(String method, String status) {
        return Counter.builder("payment.operations")
            .tag("method", method)
            .tag("status", status)
            .register(meterRegistry);
    }

    /**
     * Create a new payment
     */
    @Transactional
    public PaymentResponse createPayment(PaymentRequest request) {
        log.info("Creating payment for policy: {}, amount: {}, method: {}",
            request.getPolicyNumber(), request.getAmount(), request.getPaymentMethod());

        Timer.Sample timer = Timer.start(meterRegistry);

        try {
            // Generate unique transaction ID
            String transactionId = generateTransactionId();

            // Build payment entity
            Payment payment = Payment.builder()
                .policyNumber(request.getPolicyNumber())
                .beneficiaryId(request.getBeneficiaryId())
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.PENDING)
                .transactionId(transactionId)
                .currency("BRL")
                .description(request.getDescription())
                .payerName(request.getPayerName())
                .payerEmail(request.getPayerEmail())
                .payerDocument(request.getPayerDocument())
                .ipAddress(request.getIpAddress())
                .userAgent(request.getUserAgent())
                .build();

            // Set payment-method specific fields
            switch (request.getPaymentMethod()) {
                case PIX:
                    payment.setPixKey(request.getPixKey());
                    payment.setPixExpiration(LocalDateTime.now().plusHours(24));
                    payment.setGateway("mercadopago"); // Default PIX gateway
                    break;
                case BOLETO:
                    if (request.getBoletoDueDate() != null) {
                        payment.setBoletoDueDate(request.getBoletoDueDate().atStartOfDay());
                    } else {
                        payment.setBoletoDueDate(LocalDateTime.now().plusDays(3));
                    }
                    payment.setGateway("pagseguro"); // Default Boleto gateway
                    break;
                case CREDIT_CARD:
                case DEBIT_CARD:
                    payment.setGateway("stripe"); // Default card gateway
                    break;
                default:
                    payment.setGateway("mercadopago");
            }

            // Store metadata if present
            if (request.getMetadata() != null && !request.getMetadata().isEmpty()) {
                try {
                    payment.setMetadata(objectMapper.writeValueAsString(request.getMetadata()));
                } catch (JsonProcessingException e) {
                    log.warn("Failed to serialize metadata", e);
                }
            }

            // Save payment
            payment = paymentRepository.save(payment);
            log.info("Payment created successfully: {}", payment.getId());

            // Record metrics
            getPaymentCounter("create", "success").increment();
            timer.stop(Timer.builder("payment.create.duration")
                .tag("method", request.getPaymentMethod().toString())
                .register(meterRegistry));

            return mapToResponse(payment);

        } catch (Exception e) {
            log.error("Failed to create payment", e);
            getPaymentCounter("create", "failure").increment();
            throw new PaymentProcessingException("Failed to create payment: " + e.getMessage(), e);
        }
    }

    /**
     * Get payment by ID
     */
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID id) {
        log.debug("Fetching payment by ID: {}", id);

        Payment payment = paymentRepository.findById(id)
            .orElseThrow(() -> new PaymentNotFoundException("Payment not found: " + id));

        return mapToResponse(payment);
    }

    /**
     * Get all payments for a policy
     */
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByPolicy(String policyNumber) {
        log.debug("Fetching payments for policy: {}", policyNumber);

        List<Payment> payments = paymentRepository.findByPolicyNumberOrderByCreatedAtDesc(policyNumber);

        return payments.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    /**
     * Process a pending payment
     */
    @Transactional
    public PaymentResponse processPayment(UUID paymentId) {
        log.info("Processing payment: {}", paymentId);

        Timer.Sample timer = Timer.start(meterRegistry);

        try {
            Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found: " + paymentId));

            if (payment.getStatus() != PaymentStatus.PENDING) {
                throw new InvalidPaymentStateException(
                    "Payment cannot be processed. Current status: " + payment.getStatus());
            }

            // Update status to processing
            payment.updateStatus(PaymentStatus.PROCESSING);
            payment = paymentRepository.save(payment);

            // Delegate to appropriate gateway
            PaymentGatewayResponse gatewayResponse = processWithGateway(payment);

            // Update payment with gateway response
            payment.setGatewayPaymentId(gatewayResponse.getGatewayPaymentId());

            if (gatewayResponse.isSuccess()) {
                payment.updateStatus(PaymentStatus.COMPLETED);

                // Set method-specific fields from gateway response
                if (payment.getPaymentMethod() == PaymentMethod.PIX) {
                    payment.setPixQrCode(gatewayResponse.getPixQrCode());
                    payment.setPixQrCodeBase64(gatewayResponse.getPixQrCodeBase64());
                } else if (payment.getPaymentMethod() == PaymentMethod.BOLETO) {
                    payment.setBoletoBarcode(gatewayResponse.getBoletoBarcode());
                    payment.setBoletoUrl(gatewayResponse.getBoletoUrl());
                } else if (payment.getPaymentMethod() == PaymentMethod.CREDIT_CARD ||
                           payment.getPaymentMethod() == PaymentMethod.DEBIT_CARD) {
                    payment.setCardLastFour(gatewayResponse.getCardLastFour());
                    payment.setCardBrand(gatewayResponse.getCardBrand());
                }

                log.info("Payment processed successfully: {}", paymentId);
                getPaymentCounter("process", "success").increment();
            } else {
                payment.updateStatus(PaymentStatus.FAILED);
                payment.setErrorCode(gatewayResponse.getErrorCode());
                payment.setErrorMessage(gatewayResponse.getErrorMessage());

                log.warn("Payment processing failed: {}, error: {}",
                    paymentId, gatewayResponse.getErrorMessage());
                getPaymentCounter("process", "failure").increment();
            }

            payment = paymentRepository.save(payment);

            timer.stop(Timer.builder("payment.process.duration")
                .tag("method", payment.getPaymentMethod().toString())
                .tag("status", payment.getStatus().toString())
                .register(meterRegistry));

            return mapToResponse(payment);

        } catch (PaymentNotFoundException | InvalidPaymentStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to process payment: {}", paymentId, e);
            getPaymentCounter("process", "error").increment();
            throw new PaymentProcessingException("Failed to process payment: " + e.getMessage(), e);
        }
    }

    /**
     * Refund a completed payment
     */
    @Transactional
    public PaymentResponse refundPayment(UUID paymentId, RefundRequest request) {
        log.info("Processing refund for payment: {}, amount: {}", paymentId, request.getAmount());

        try {
            Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found: " + paymentId));

            if (!payment.canRefund()) {
                throw new InvalidPaymentStateException(
                    "Payment cannot be refunded. Current status: " + payment.getStatus());
            }

            BigDecimal refundAmount = request.isFullRefund()
                ? payment.getAmount()
                : request.getAmount();

            if (refundAmount.compareTo(payment.getAmount()) > 0) {
                throw new InvalidPaymentAmountException(
                    "Refund amount cannot exceed original payment amount");
            }

            // Process refund with gateway
            boolean refundSuccess = processRefundWithGateway(payment, refundAmount);

            if (refundSuccess) {
                payment.updateStatus(PaymentStatus.REFUNDED);
                payment.setRefundAmount(refundAmount);
                payment.setRefundReason(request.getReason());

                payment = paymentRepository.save(payment);
                log.info("Payment refunded successfully: {}", paymentId);
                getPaymentCounter("refund", "success").increment();
            } else {
                log.error("Gateway refund failed for payment: {}", paymentId);
                getPaymentCounter("refund", "failure").increment();
                throw new PaymentProcessingException("Gateway refund failed");
            }

            return mapToResponse(payment);

        } catch (PaymentNotFoundException | InvalidPaymentStateException | InvalidPaymentAmountException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to refund payment: {}", paymentId, e);
            getPaymentCounter("refund", "error").increment();
            throw new PaymentProcessingException("Failed to refund payment: " + e.getMessage(), e);
        }
    }

    /**
     * Cancel a pending payment
     */
    @Transactional
    public PaymentResponse cancelPayment(UUID paymentId) {
        log.info("Cancelling payment: {}", paymentId);

        try {
            Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found: " + paymentId));

            if (!payment.canCancel()) {
                throw new InvalidPaymentStateException(
                    "Payment cannot be cancelled. Current status: " + payment.getStatus());
            }

            // Cancel with gateway if already sent
            if (payment.getGatewayPaymentId() != null) {
                cancelWithGateway(payment);
            }

            payment.updateStatus(PaymentStatus.CANCELLED);
            payment = paymentRepository.save(payment);

            log.info("Payment cancelled successfully: {}", paymentId);
            getPaymentCounter("cancel", "success").increment();

            return mapToResponse(payment);

        } catch (PaymentNotFoundException | InvalidPaymentStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to cancel payment: {}", paymentId, e);
            getPaymentCounter("cancel", "error").increment();
            throw new PaymentProcessingException("Failed to cancel payment: " + e.getMessage(), e);
        }
    }

    /**
     * Generate unique transaction ID
     */
    private String generateTransactionId() {
        return "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    /**
     * Process payment with appropriate gateway
     */
    private PaymentGatewayResponse processWithGateway(Payment payment) {
        // This would delegate to actual gateway implementations
        // For now, return mock success response
        log.info("Processing payment with gateway: {}", payment.getGateway());

        return PaymentGatewayResponse.builder()
            .success(true)
            .gatewayPaymentId("GATEWAY-" + UUID.randomUUID().toString())
            .build();
    }

    /**
     * Process refund with gateway
     */
    private boolean processRefundWithGateway(Payment payment, BigDecimal amount) {
        // This would delegate to actual gateway implementations
        log.info("Processing refund with gateway: {}, amount: {}", payment.getGateway(), amount);
        return true;
    }

    /**
     * Cancel payment with gateway
     */
    private void cancelWithGateway(Payment payment) {
        // This would delegate to actual gateway implementations
        log.info("Cancelling payment with gateway: {}", payment.getGateway());
    }

    /**
     * Map Payment entity to PaymentResponse DTO
     */
    private PaymentResponse mapToResponse(Payment payment) {
        PaymentResponse.PaymentResponseBuilder builder = PaymentResponse.builder()
            .id(payment.getId())
            .policyNumber(payment.getPolicyNumber())
            .beneficiaryId(payment.getBeneficiaryId())
            .amount(payment.getAmount())
            .paymentMethod(payment.getPaymentMethod())
            .status(payment.getStatus())
            .gateway(payment.getGateway())
            .transactionId(payment.getTransactionId())
            .currency(payment.getCurrency())
            .description(payment.getDescription())
            .payerName(payment.getPayerName())
            .payerEmail(payment.getPayerEmail())
            .payerDocumentMasked(PaymentResponse.maskDocument(payment.getPayerDocument()))
            .processedAt(payment.getProcessedAt())
            .confirmedAt(payment.getConfirmedAt())
            .failedAt(payment.getFailedAt())
            .refundedAt(payment.getRefundedAt())
            .cancelledAt(payment.getCancelledAt())
            .errorCode(payment.getErrorCode())
            .errorMessage(payment.getErrorMessage())
            .refundAmount(payment.getRefundAmount())
            .refundReason(payment.getRefundReason())
            .createdAt(payment.getCreatedAt())
            .updatedAt(payment.getUpdatedAt())
            .createdBy(payment.getCreatedBy())
            .updatedBy(payment.getUpdatedBy());

        // Add PIX specific fields
        if (payment.getPaymentMethod() == PaymentMethod.PIX) {
            builder.pixQrCode(payment.getPixQrCode())
                .pixQrCodeBase64(payment.getPixQrCodeBase64())
                .pixExpiration(payment.getPixExpiration());
        }

        // Add Boleto specific fields
        if (payment.getPaymentMethod() == PaymentMethod.BOLETO) {
            builder.boletoBarcode(payment.getBoletoBarcode())
                .boletoUrl(payment.getBoletoUrl())
                .boletoDueDate(payment.getBoletoDueDate());
        }

        // Add card specific fields
        if (payment.getPaymentMethod() == PaymentMethod.CREDIT_CARD ||
            payment.getPaymentMethod() == PaymentMethod.DEBIT_CARD) {
            builder.cardLastFour(payment.getCardLastFour())
                .cardBrand(payment.getCardBrand());
        }

        return builder.build();
    }

    /**
     * Helper class for gateway responses
     */
    @lombok.Data
    @lombok.Builder
    private static class PaymentGatewayResponse {
        private boolean success;
        private String gatewayPaymentId;
        private String errorCode;
        private String errorMessage;
        private String pixQrCode;
        private String pixQrCodeBase64;
        private String boletoBarcode;
        private String boletoUrl;
        private String cardLastFour;
        private String cardBrand;
    }
}
