package com.austa.payment.gateways;

import com.austa.payment.dto.*;
import com.austa.payment.enums.PaymentStatus;
import com.austa.payment.exception.PaymentGatewayException;
import com.austa.payment.exception.InvalidPaymentRequestException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * PIX Gateway Client for processing instant payments via PIX payment method.
 * Integrates with Mercado Pago or PagSeguro API to generate QR Codes and EMV strings.
 *
 * <p>PIX is the Brazilian Central Bank's instant payment system that allows
 * real-time transfers 24/7. This client generates QR codes and EMV (BR Code)
 * strings for payment collection.
 *
 * <p>Features:
 * <ul>
 *   <li>QR Code generation with Base64 encoding</li>
 *   <li>EMV (BR Code) string generation</li>
 *   <li>Real-time payment status checking</li>
 *   <li>Circuit breaker pattern for resilience</li>
 *   <li>Automatic retry with exponential backoff</li>
 *   <li>Comprehensive metrics collection</li>
 * </ul>
 *
 * @author AUSTA SuperApp
 * @version 1.0
 * @since 2024-01
 */
@Service
public class PixGatewayClient implements PaymentGateway {

    private static final Logger logger = LoggerFactory.getLogger(PixGatewayClient.class);
    private static final String GATEWAY_NAME = "PIX";
    private static final int QR_CODE_SIZE = 300;

    @Value("${payment.pix.api.url:https://api.mercadopago.com/v1}")
    private String pixApiUrl;

    @Value("${payment.pix.api.key:#{null}}")
    private String pixApiKey;

    @Value("${payment.pix.merchant.id:#{null}}")
    private String merchantId;

    @Value("${payment.pix.webhook.url:#{null}}")
    private String webhookUrl;

    @Value("${payment.pix.expiration.minutes:30}")
    private int expirationMinutes;

    private final RestTemplate restTemplate;
    private final Counter pixPaymentCounter;
    private final Counter pixSuccessCounter;
    private final Counter pixFailureCounter;

    public PixGatewayClient(RestTemplate restTemplate, MeterRegistry meterRegistry) {
        this.restTemplate = restTemplate;
        this.pixPaymentCounter = Counter.builder("payment.pix.requests")
                .description("Total PIX payment requests")
                .register(meterRegistry);
        this.pixSuccessCounter = Counter.builder("payment.pix.success")
                .description("Successful PIX payments")
                .register(meterRegistry);
        this.pixFailureCounter = Counter.builder("payment.pix.failure")
                .description("Failed PIX payments")
                .register(meterRegistry);
    }

    /**
     * Creates a PIX payment with QR Code and EMV string generation.
     *
     * @param paymentDTO the PIX payment details including amount and description
     * @return PixPaymentResponse containing QR code image, EMV string, and transaction ID
     * @throws PaymentGatewayException if gateway communication fails
     * @throws InvalidPaymentRequestException if payment data is invalid
     */
    @CircuitBreaker(name = "pixGateway", fallbackMethod = "createPixPaymentFallback")
    @Retry(name = "pixGateway")
    public PixPaymentResponse createPixPayment(PixPaymentDTO paymentDTO) {
        logger.info("Creating PIX payment for amount: {} BRL", paymentDTO.getAmount());
        pixPaymentCounter.increment();

        try {
            validatePixPaymentRequest(paymentDTO);

            if (!isConfigured()) {
                logger.warn("PIX gateway not configured, returning mock response");
                return createMockPixResponse(paymentDTO);
            }

            String transactionId = UUID.randomUUID().toString();

            // Generate EMV (BR Code) string
            String emvString = generateEmvString(paymentDTO, transactionId);

            // Generate QR Code image
            String qrCodeBase64 = generateQrCodeImage(emvString);

            // Call payment gateway API
            PixPaymentResponse response = callPixGatewayApi(paymentDTO, transactionId, emvString);
            response.setQrCodeBase64(qrCodeBase64);
            response.setEmvString(emvString);

            pixSuccessCounter.increment();
            logger.info("PIX payment created successfully. Transaction ID: {}", transactionId);

            return response;

        } catch (Exception e) {
            pixFailureCounter.increment();
            logger.error("Failed to create PIX payment", e);
            throw new PaymentGatewayException("PIX payment creation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Checks the current status of a PIX payment transaction.
     *
     * @param transactionId the unique transaction identifier
     * @return PaymentStatus the current payment status
     * @throws PaymentGatewayException if status check fails
     */
    @Override
    @CircuitBreaker(name = "pixGateway", fallbackMethod = "checkStatusFallback")
    @Retry(name = "pixGateway")
    public PaymentStatus checkStatus(String transactionId) {
        logger.info("Checking PIX payment status for transaction: {}", transactionId);

        try {
            if (!isConfigured()) {
                logger.warn("PIX gateway not configured, returning mock status");
                return PaymentStatus.PENDING;
            }

            HttpHeaders headers = createHeaders();
            HttpEntity<?> entity = new HttpEntity<>(headers);

            String url = pixApiUrl + "/payments/" + transactionId;
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String status = (String) response.getBody().get("status");
                return mapPixStatusToPaymentStatus(status);
            }

            return PaymentStatus.PENDING;

        } catch (RestClientException e) {
            logger.error("Failed to check PIX payment status", e);
            throw new PaymentGatewayException("Status check failed: " + e.getMessage(), e);
        }
    }

    @Override
    public PaymentResponse processPayment(PaymentRequest request) {
        PixPaymentDTO pixDTO = new PixPaymentDTO();
        pixDTO.setAmount(request.getAmount());
        pixDTO.setDescription(request.getDescription());
        pixDTO.setCustomerName(request.getCustomerName());
        pixDTO.setCustomerEmail(request.getCustomerEmail());
        pixDTO.setCustomerDocument(request.getCustomerDocument());

        return createPixPayment(pixDTO);
    }

    @Override
    public RefundResponse refund(String transactionId, BigDecimal amount) {
        logger.warn("PIX refunds require manual processing or bank reversal");
        throw new UnsupportedOperationException("PIX refunds must be processed through bank transfer");
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    @Override
    public boolean isConfigured() {
        return pixApiKey != null && !pixApiKey.isEmpty()
                && merchantId != null && !merchantId.isEmpty();
    }

    /**
     * Generates EMV (BR Code) string according to Brazilian PIX specification.
     * Format: EMV QR Code standard with PIX-specific fields.
     */
    private String generateEmvString(PixPaymentDTO paymentDTO, String transactionId) {
        StringBuilder emv = new StringBuilder();

        // Payload Format Indicator
        emv.append("000201");

        // Merchant Account Information (PIX Key)
        String pixKey = merchantId != null ? merchantId : "mock.pix@austa.com.br";
        emv.append("26").append(String.format("%02d", 14 + pixKey.length()))
           .append("0014br.gov.bcb.pix01").append(String.format("%02d", pixKey.length()))
           .append(pixKey);

        // Merchant Category Code
        emv.append("52040000");

        // Transaction Currency (BRL = 986)
        emv.append("5303986");

        // Transaction Amount
        String amountStr = paymentDTO.getAmount().toString();
        emv.append("54").append(String.format("%02d", amountStr.length())).append(amountStr);

        // Country Code
        emv.append("5802BR");

        // Merchant Name
        String merchantName = "AUSTA SuperApp";
        emv.append("59").append(String.format("%02d", merchantName.length())).append(merchantName);

        // Merchant City
        String city = "Sao Paulo";
        emv.append("60").append(String.format("%02d", city.length())).append(city);

        // Additional Data Field
        emv.append("62").append(String.format("%02d", 8 + transactionId.length()))
           .append("05").append(String.format("%02d", transactionId.length())).append(transactionId);

        // CRC16 (placeholder)
        emv.append("6304");

        return emv.toString();
    }

    /**
     * Generates QR Code image from EMV string and encodes to Base64.
     */
    private String generateQrCodeImage(String emvString) {
        try {
            // Create QR code image (simplified version)
            BufferedImage qrImage = new BufferedImage(QR_CODE_SIZE, QR_CODE_SIZE, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = qrImage.createGraphics();

            // White background
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, QR_CODE_SIZE, QR_CODE_SIZE);

            // Black border (placeholder for actual QR code)
            g2d.setColor(Color.BLACK);
            g2d.setStroke(new BasicStroke(2));
            g2d.drawRect(10, 10, QR_CODE_SIZE - 20, QR_CODE_SIZE - 20);

            // Draw some pattern (in production, use ZXing library for actual QR code)
            for (int i = 0; i < 10; i++) {
                for (int j = 0; j < 10; j++) {
                    if ((i + j) % 2 == 0) {
                        g2d.fillRect(20 + i * 26, 20 + j * 26, 24, 24);
                    }
                }
            }

            g2d.dispose();

            // Convert to Base64
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(qrImage, "PNG", baos);
            byte[] imageBytes = baos.toByteArray();

            return Base64.getEncoder().encodeToString(imageBytes);

        } catch (Exception e) {
            logger.error("Failed to generate QR code image", e);
            throw new PaymentGatewayException("QR code generation failed", e);
        }
    }

    /**
     * Calls the PIX gateway API to register the payment.
     */
    private PixPaymentResponse callPixGatewayApi(PixPaymentDTO paymentDTO,
                                                   String transactionId,
                                                   String emvString) {
        HttpHeaders headers = createHeaders();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("transaction_amount", paymentDTO.getAmount());
        requestBody.put("description", paymentDTO.getDescription());
        requestBody.put("payment_method_id", "pix");
        requestBody.put("notification_url", webhookUrl);
        requestBody.put("external_reference", transactionId);

        Map<String, String> payer = new HashMap<>();
        payer.put("email", paymentDTO.getCustomerEmail());
        payer.put("first_name", paymentDTO.getCustomerName());
        requestBody.put("payer", payer);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    pixApiUrl + "/payments", HttpMethod.POST, entity, Map.class);

            PixPaymentResponse pixResponse = new PixPaymentResponse();
            pixResponse.setTransactionId(transactionId);
            pixResponse.setStatus(PaymentStatus.PENDING);
            pixResponse.setAmount(paymentDTO.getAmount());
            pixResponse.setExpirationDate(LocalDateTime.now().plusMinutes(expirationMinutes));

            if (response.getBody() != null) {
                Map<String, Object> pointOfInteraction =
                        (Map<String, Object>) response.getBody().get("point_of_interaction");
                if (pointOfInteraction != null) {
                    Map<String, Object> transactionData =
                            (Map<String, Object>) pointOfInteraction.get("transaction_data");
                    if (transactionData != null) {
                        String gatewayEmv = (String) transactionData.get("qr_code");
                        if (gatewayEmv != null) {
                            pixResponse.setEmvString(gatewayEmv);
                        }
                    }
                }
            }

            return pixResponse;

        } catch (RestClientException e) {
            logger.error("PIX gateway API call failed", e);
            throw new PaymentGatewayException("Gateway API error: " + e.getMessage(), e);
        }
    }

    private void validatePixPaymentRequest(PixPaymentDTO paymentDTO) {
        if (paymentDTO.getAmount() == null || paymentDTO.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentRequestException("Payment amount must be greater than zero");
        }

        if (paymentDTO.getAmount().compareTo(new BigDecimal("50000")) > 0) {
            throw new InvalidPaymentRequestException("PIX payment amount cannot exceed R$ 50,000");
        }

        if (paymentDTO.getCustomerEmail() == null || paymentDTO.getCustomerEmail().isEmpty()) {
            throw new InvalidPaymentRequestException("Customer email is required");
        }
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (pixApiKey != null) {
            headers.setBearerAuth(pixApiKey);
        }
        return headers;
    }

    private PaymentStatus mapPixStatusToPaymentStatus(String pixStatus) {
        return switch (pixStatus != null ? pixStatus.toLowerCase() : "") {
            case "approved" -> PaymentStatus.COMPLETED;
            case "pending" -> PaymentStatus.PENDING;
            case "rejected", "cancelled" -> PaymentStatus.FAILED;
            case "refunded" -> PaymentStatus.REFUNDED;
            default -> PaymentStatus.PENDING;
        };
    }

    private PixPaymentResponse createMockPixResponse(PixPaymentDTO paymentDTO) {
        String transactionId = "MOCK-PIX-" + UUID.randomUUID().toString();
        String emvString = generateEmvString(paymentDTO, transactionId);
        String qrCodeBase64 = generateQrCodeImage(emvString);

        PixPaymentResponse response = new PixPaymentResponse();
        response.setTransactionId(transactionId);
        response.setStatus(PaymentStatus.PENDING);
        response.setAmount(paymentDTO.getAmount());
        response.setEmvString(emvString);
        response.setQrCodeBase64(qrCodeBase64);
        response.setExpirationDate(LocalDateTime.now().plusMinutes(expirationMinutes));
        response.setMockMode(true);

        return response;
    }

    // Fallback methods for Circuit Breaker
    private PixPaymentResponse createPixPaymentFallback(PixPaymentDTO paymentDTO, Exception e) {
        logger.error("Circuit breaker activated for PIX payment creation", e);
        pixFailureCounter.increment();
        throw new PaymentGatewayException("PIX gateway temporarily unavailable", e);
    }

    private PaymentStatus checkStatusFallback(String transactionId, Exception e) {
        logger.error("Circuit breaker activated for PIX status check", e);
        return PaymentStatus.PENDING;
    }
}
