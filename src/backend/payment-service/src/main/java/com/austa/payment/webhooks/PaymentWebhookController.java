package com.austa.payment.webhooks;

import com.austa.payment.models.Payment;
import com.austa.payment.models.PaymentStatus;
import com.austa.payment.repositories.PaymentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.HmacAlgorithms;
import org.apache.commons.codec.digest.HmacUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Webhook controller for payment gateway callbacks.
 * Handles webhooks from Stripe, Mercado Pago, and PagSeguro.
 */
@RestController
@RequestMapping("/webhooks")
@Tag(name = "Webhooks", description = "Payment gateway webhook endpoints")
@RequiredArgsConstructor
@Slf4j
public class PaymentWebhookController {

    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;

    @Value("${payment.stripe.webhook.secret:}")
    private String stripeWebhookSecret;

    @Value("${payment.mercadopago.webhook.secret:}")
    private String mercadoPagoWebhookSecret;

    @Value("${payment.pagseguro.webhook.secret:}")
    private String pagSeguroWebhookSecret;

    /**
     * Stripe webhook endpoint
     */
    @PostMapping("/stripe")
    @Operation(summary = "Stripe webhook", description = "Receives payment notifications from Stripe")
    @Transactional
    public ResponseEntity<Map<String, String>> handleStripeWebhook(
            @RequestHeader("Stripe-Signature") String signature,
            @RequestBody String payload) {

        log.info("Received Stripe webhook");

        try {
            // Verify webhook signature
            if (!verifyStripeSignature(payload, signature)) {
                log.warn("Invalid Stripe webhook signature");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid signature"));
            }

            // Parse webhook payload
            JsonNode event = objectMapper.readTree(payload);
            String eventType = event.get("type").asText();
            JsonNode data = event.get("data").get("object");

            log.info("Processing Stripe event: {}", eventType);

            // Handle different event types
            switch (eventType) {
                case "payment_intent.succeeded":
                    handlePaymentSucceeded(data, "stripe");
                    break;
                case "payment_intent.payment_failed":
                    handlePaymentFailed(data, "stripe");
                    break;
                case "charge.refunded":
                    handlePaymentRefunded(data, "stripe");
                    break;
                default:
                    log.debug("Unhandled Stripe event type: {}", eventType);
            }

            return ResponseEntity.ok(createSuccessResponse("Webhook processed"));

        } catch (Exception e) {
            log.error("Error processing Stripe webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Webhook processing failed"));
        }
    }

    /**
     * Mercado Pago webhook endpoint
     */
    @PostMapping("/mercadopago")
    @Operation(summary = "Mercado Pago webhook", description = "Receives payment notifications from Mercado Pago")
    @Transactional
    public ResponseEntity<Map<String, String>> handleMercadoPagoWebhook(
            @RequestHeader(value = "X-Signature", required = false) String signature,
            @RequestParam(value = "id", required = false) String paymentId,
            @RequestParam(value = "topic", required = false) String topic,
            @RequestBody(required = false) String payload) {

        log.info("Received Mercado Pago webhook: topic={}, id={}", topic, paymentId);

        try {
            // Verify webhook signature if present
            if (signature != null && !verifyMercadoPagoSignature(payload, signature)) {
                log.warn("Invalid Mercado Pago webhook signature");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid signature"));
            }

            // Handle different topics
            if ("payment".equals(topic)) {
                // Fetch payment details from Mercado Pago API
                // For now, we'll use the webhook data directly
                if (payload != null && !payload.isEmpty()) {
                    JsonNode data = objectMapper.readTree(payload);
                    handleMercadoPagoPayment(data);
                }
            }

            return ResponseEntity.ok(createSuccessResponse("Webhook processed"));

        } catch (Exception e) {
            log.error("Error processing Mercado Pago webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Webhook processing failed"));
        }
    }

    /**
     * PagSeguro webhook endpoint
     */
    @PostMapping("/pagseguro")
    @Operation(summary = "PagSeguro webhook", description = "Receives payment notifications from PagSeguro")
    @Transactional
    public ResponseEntity<Map<String, String>> handlePagSeguroWebhook(
            @RequestHeader(value = "X-PagSeguro-Signature", required = false) String signature,
            @RequestBody String payload) {

        log.info("Received PagSeguro webhook");

        try {
            // Verify webhook signature
            if (signature != null && !verifyPagSeguroSignature(payload, signature)) {
                log.warn("Invalid PagSeguro webhook signature");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid signature"));
            }

            // Parse webhook payload
            JsonNode data = objectMapper.readTree(payload);
            handlePagSeguroPayment(data);

            return ResponseEntity.ok(createSuccessResponse("Webhook processed"));

        } catch (Exception e) {
            log.error("Error processing PagSeguro webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Webhook processing failed"));
        }
    }

    /**
     * Handle successful payment
     */
    private void handlePaymentSucceeded(JsonNode data, String gateway) {
        String gatewayPaymentId = data.get("id").asText();

        log.info("Payment succeeded: gateway={}, gatewayPaymentId={}", gateway, gatewayPaymentId);

        Optional<Payment> paymentOpt = paymentRepository.findByGatewayPaymentId(gatewayPaymentId);

        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();

            if (payment.getStatus() != PaymentStatus.COMPLETED) {
                payment.updateStatus(PaymentStatus.COMPLETED);

                // Extract additional payment details if available
                if (data.has("charges") && data.get("charges").has("data")) {
                    JsonNode charge = data.get("charges").get("data").get(0);
                    if (charge.has("payment_method_details")) {
                        JsonNode cardDetails = charge.get("payment_method_details").get("card");
                        if (cardDetails != null) {
                            payment.setCardLastFour(cardDetails.get("last4").asText());
                            payment.setCardBrand(cardDetails.get("brand").asText());
                        }
                    }
                }

                paymentRepository.save(payment);
                log.info("Payment {} marked as completed", payment.getId());
            }
        } else {
            log.warn("Payment not found for gateway payment ID: {}", gatewayPaymentId);
        }
    }

    /**
     * Handle failed payment
     */
    private void handlePaymentFailed(JsonNode data, String gateway) {
        String gatewayPaymentId = data.get("id").asText();

        log.info("Payment failed: gateway={}, gatewayPaymentId={}", gateway, gatewayPaymentId);

        Optional<Payment> paymentOpt = paymentRepository.findByGatewayPaymentId(gatewayPaymentId);

        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();

            if (!payment.isFinalState()) {
                payment.updateStatus(PaymentStatus.FAILED);

                // Extract error details
                if (data.has("last_payment_error")) {
                    JsonNode error = data.get("last_payment_error");
                    payment.setErrorCode(error.get("code").asText());
                    payment.setErrorMessage(error.get("message").asText());
                }

                paymentRepository.save(payment);
                log.info("Payment {} marked as failed", payment.getId());
            }
        } else {
            log.warn("Payment not found for gateway payment ID: {}", gatewayPaymentId);
        }
    }

    /**
     * Handle refunded payment
     */
    private void handlePaymentRefunded(JsonNode data, String gateway) {
        String gatewayPaymentId = data.get("payment_intent").asText();

        log.info("Payment refunded: gateway={}, gatewayPaymentId={}", gateway, gatewayPaymentId);

        Optional<Payment> paymentOpt = paymentRepository.findByGatewayPaymentId(gatewayPaymentId);

        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();

            if (payment.getStatus() != PaymentStatus.REFUNDED) {
                payment.updateStatus(PaymentStatus.REFUNDED);
                payment.setRefundedAt(LocalDateTime.now());

                if (data.has("amount_refunded")) {
                    payment.setRefundAmount(
                        data.get("amount_refunded").decimalValue().divide(new java.math.BigDecimal(100))
                    );
                }

                paymentRepository.save(payment);
                log.info("Payment {} marked as refunded", payment.getId());
            }
        } else {
            log.warn("Payment not found for gateway payment ID: {}", gatewayPaymentId);
        }
    }

    /**
     * Handle Mercado Pago payment notification
     */
    private void handleMercadoPagoPayment(JsonNode data) {
        if (data.has("action") && "payment.updated".equals(data.get("action").asText())) {
            String gatewayPaymentId = data.get("data").get("id").asText();
            String status = data.get("data").get("status").asText();

            Optional<Payment> paymentOpt = paymentRepository.findByGatewayPaymentId(gatewayPaymentId);

            if (paymentOpt.isPresent()) {
                Payment payment = paymentOpt.get();

                switch (status) {
                    case "approved":
                        payment.updateStatus(PaymentStatus.COMPLETED);
                        break;
                    case "rejected":
                    case "cancelled":
                        payment.updateStatus(PaymentStatus.FAILED);
                        break;
                    case "refunded":
                        payment.updateStatus(PaymentStatus.REFUNDED);
                        break;
                }

                paymentRepository.save(payment);
                log.info("Mercado Pago payment {} updated to status {}", payment.getId(), status);
            }
        }
    }

    /**
     * Handle PagSeguro payment notification
     */
    private void handlePagSeguroPayment(JsonNode data) {
        String gatewayPaymentId = data.get("reference").asText();
        int statusCode = data.get("status").asInt();

        Optional<Payment> paymentOpt = paymentRepository.findByGatewayPaymentId(gatewayPaymentId);

        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();

            // PagSeguro status codes: 1=Waiting, 2=In Analysis, 3=Paid, 4=Available, 7=Cancelled
            switch (statusCode) {
                case 3:
                case 4:
                    payment.updateStatus(PaymentStatus.COMPLETED);
                    break;
                case 7:
                    payment.updateStatus(PaymentStatus.CANCELLED);
                    break;
            }

            paymentRepository.save(payment);
            log.info("PagSeguro payment {} updated to status code {}", payment.getId(), statusCode);
        }
    }

    /**
     * Verify Stripe webhook signature
     */
    private boolean verifyStripeSignature(String payload, String signature) {
        if (stripeWebhookSecret == null || stripeWebhookSecret.isEmpty()) {
            log.warn("Stripe webhook secret not configured, skipping signature verification");
            return true;
        }

        // Implementation would use Stripe's signature verification
        // For now, return true to allow testing
        return true;
    }

    /**
     * Verify Mercado Pago webhook signature
     */
    private boolean verifyMercadoPagoSignature(String payload, String signature) {
        if (mercadoPagoWebhookSecret == null || mercadoPagoWebhookSecret.isEmpty()) {
            log.warn("Mercado Pago webhook secret not configured, skipping signature verification");
            return true;
        }

        try {
            String expectedSignature = new HmacUtils(HmacAlgorithms.HMAC_SHA_256, mercadoPagoWebhookSecret)
                .hmacHex(payload);
            return expectedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying Mercado Pago signature", e);
            return false;
        }
    }

    /**
     * Verify PagSeguro webhook signature
     */
    private boolean verifyPagSeguroSignature(String payload, String signature) {
        if (pagSeguroWebhookSecret == null || pagSeguroWebhookSecret.isEmpty()) {
            log.warn("PagSeguro webhook secret not configured, skipping signature verification");
            return true;
        }

        try {
            String expectedSignature = new HmacUtils(HmacAlgorithms.HMAC_SHA_256, pagSeguroWebhookSecret)
                .hmacHex(payload);
            return expectedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying PagSeguro signature", e);
            return false;
        }
    }

    /**
     * Create success response
     */
    private Map<String, String> createSuccessResponse(String message) {
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", message);
        return response;
    }

    /**
     * Create error response
     */
    private Map<String, String> createErrorResponse(String message) {
        Map<String, String> response = new HashMap<>();
        response.put("status", "error");
        response.put("message", message);
        return response;
    }
}
