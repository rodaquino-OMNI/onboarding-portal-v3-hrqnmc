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
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Boleto Bancário Generator for Brazilian bank slip payments.
 *
 * <p>Boleto is a popular payment method in Brazil that generates a bank slip
 * with a barcode that can be paid at banks, ATMs, lottery shops, or online banking.
 *
 * <p>This generator creates:
 * <ul>
 *   <li>44-digit barcode (código de barras)</li>
 *   <li>48-digit typeable line (linha digitável)</li>
 *   <li>PDF document with payment instructions</li>
 *   <li>Bank fee calculations</li>
 *   <li>Due date management (default 3 business days)</li>
 * </ul>
 *
 * <p>Supported Banks:
 * <ul>
 *   <li>Banco do Brasil (001)</li>
 *   <li>Bradesco (237)</li>
 *   <li>Itaú (341)</li>
 *   <li>Santander (033)</li>
 *   <li>Caixa Econômica Federal (104)</li>
 * </ul>
 *
 * <p>Barcode Format (44 digits):
 * <pre>
 * BBBMVVVVEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEED
 * BBB: Bank code (3 digits)
 * M: Currency code (9 = Real)
 * VVVV: Verification digit + due date factor
 * E...: Free field (bank-specific)
 * D: General verification digit
 * </pre>
 *
 * @author AUSTA SuperApp
 * @version 1.0
 * @since 2024-01
 */
@Service
public class BoletoGenerator implements PaymentGateway {

    private static final Logger logger = LoggerFactory.getLogger(BoletoGenerator.class);
    private static final String GATEWAY_NAME = "Boleto";

    // Bank codes
    private static final String BANK_CODE_ITAU = "341";
    private static final String BANK_CODE_BRADESCO = "237";
    private static final String BANK_CODE_BB = "001";
    private static final String BANK_CODE_SANTANDER = "033";
    private static final String BANK_CODE_CAIXA = "104";

    private static final String CURRENCY_CODE = "9"; // BRL = 9
    private static final LocalDate BASE_DATE = LocalDate.of(1997, 10, 7); // FEBRABAN base date
    private static final int[] BARCODE_SEQUENCE = {4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

    @Value("${payment.boleto.default.bank:341}")
    private String defaultBankCode;

    @Value("${payment.boleto.agency:0001}")
    private String agencyCode;

    @Value("${payment.boleto.account:12345678}")
    private String accountNumber;

    @Value("${payment.boleto.due.days:3}")
    private int defaultDueDays;

    @Value("${payment.boleto.fee.percentage:0.0}")
    private BigDecimal feePercentage;

    @Value("${payment.boleto.fine.percentage:2.0}")
    private BigDecimal finePercentage;

    @Value("${payment.boleto.interest.daily:0.033}")
    private BigDecimal dailyInterest;

    @Value("${payment.boleto.merchant.name:AUSTA SuperApp}")
    private String merchantName;

    @Value("${payment.boleto.merchant.document:12.345.678/0001-90}")
    private String merchantDocument;

    private final Counter boletoGenerationCounter;
    private final Counter boletoSuccessCounter;
    private final Counter boletoFailureCounter;
    private final Map<String, BoletoData> boletoRegistry = new HashMap<>();

    public BoletoGenerator(MeterRegistry meterRegistry) {
        this.boletoGenerationCounter = Counter.builder("payment.boleto.requests")
                .description("Total boleto generation requests")
                .register(meterRegistry);
        this.boletoSuccessCounter = Counter.builder("payment.boleto.success")
                .description("Successful boleto generations")
                .register(meterRegistry);
        this.boletoFailureCounter = Counter.builder("payment.boleto.failure")
                .description("Failed boleto generations")
                .register(meterRegistry);
    }

    /**
     * Generates a boleto bancário with barcode, typeable line, and PDF.
     *
     * @param paymentDTO boleto payment details including amount and customer info
     * @return BoletoResponse containing barcode, typeable line, PDF, and payment details
     * @throws PaymentGatewayException if boleto generation fails
     * @throws InvalidPaymentRequestException if payment data is invalid
     */
    @CircuitBreaker(name = "boletoGenerator", fallbackMethod = "generateBoletoFallback")
    @Retry(name = "boletoGenerator")
    public BoletoResponse generateBoleto(BoletoPaymentDTO paymentDTO) {
        logger.info("Generating boleto for amount: {} BRL", paymentDTO.getAmount());
        boletoGenerationCounter.increment();

        try {
            validateBoletoRequest(paymentDTO);

            String boletoId = generateBoletoId();
            LocalDate dueDate = calculateDueDate(paymentDTO.getDueDays());
            BigDecimal totalAmount = calculateTotalWithFees(paymentDTO.getAmount());

            // Generate barcode (44 digits)
            String barcode = generateBarcode(boletoId, totalAmount, dueDate);

            // Generate typeable line (48 digits)
            String typeableLine = generateTypeableLine(barcode);

            // Generate PDF (Base64)
            String pdfBase64 = generateBoletoPdf(paymentDTO, boletoId, barcode, typeableLine, dueDate, totalAmount);

            // Store boleto data for status checking
            BoletoData boletoData = new BoletoData();
            boletoData.setBoletoId(boletoId);
            boletoData.setAmount(totalAmount);
            boletoData.setBarcode(barcode);
            boletoData.setDueDate(dueDate);
            boletoData.setStatus(PaymentStatus.PENDING);
            boletoData.setCreatedAt(LocalDateTime.now());
            boletoRegistry.put(boletoId, boletoData);

            BoletoResponse response = new BoletoResponse();
            response.setBoletoId(boletoId);
            response.setTransactionId(boletoId);
            response.setBarcode(barcode);
            response.setTypeableLine(typeableLine);
            response.setPdfBase64(pdfBase64);
            response.setAmount(paymentDTO.getAmount());
            response.setTotalAmount(totalAmount);
            response.setFeeAmount(totalAmount.subtract(paymentDTO.getAmount()));
            response.setDueDate(dueDate);
            response.setStatus(PaymentStatus.PENDING);
            response.setBankCode(defaultBankCode);
            response.setCreatedAt(LocalDateTime.now());

            boletoSuccessCounter.increment();
            logger.info("Boleto generated successfully. ID: {}, Barcode: {}", boletoId, barcode);

            return response;

        } catch (Exception e) {
            boletoFailureCounter.increment();
            logger.error("Failed to generate boleto", e);
            throw new PaymentGatewayException("Boleto generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves the current payment status of a boleto.
     *
     * @param boletoId the unique boleto identifier
     * @return PaymentStatus the current status
     * @throws PaymentGatewayException if status check fails
     */
    @Override
    @CircuitBreaker(name = "boletoGenerator", fallbackMethod = "getBoletoStatusFallback")
    @Retry(name = "boletoGenerator")
    public PaymentStatus checkStatus(String boletoId) {
        logger.info("Checking boleto status for ID: {}", boletoId);

        BoletoData boletoData = boletoRegistry.get(boletoId);
        if (boletoData == null) {
            logger.warn("Boleto not found: {}", boletoId);
            throw new PaymentGatewayException("Boleto not found: " + boletoId);
        }

        // Check if overdue
        if (LocalDate.now().isAfter(boletoData.getDueDate()) &&
                boletoData.getStatus() == PaymentStatus.PENDING) {
            boletoData.setStatus(PaymentStatus.OVERDUE);
        }

        return boletoData.getStatus();
    }

    @Override
    public PaymentResponse processPayment(PaymentRequest request) {
        BoletoPaymentDTO boletoDTO = new BoletoPaymentDTO();
        boletoDTO.setAmount(request.getAmount());
        boletoDTO.setDescription(request.getDescription());
        boletoDTO.setCustomerName(request.getCustomerName());
        boletoDTO.setCustomerDocument(request.getCustomerDocument());
        boletoDTO.setDueDays(defaultDueDays);

        return generateBoleto(boletoDTO);
    }

    @Override
    public RefundResponse refund(String transactionId, BigDecimal amount) {
        logger.warn("Boleto refunds require manual bank processing");
        throw new UnsupportedOperationException("Boleto refunds must be processed manually through bank transfer");
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    @Override
    public boolean isConfigured() {
        return defaultBankCode != null && !defaultBankCode.isEmpty()
                && agencyCode != null && !agencyCode.isEmpty()
                && accountNumber != null && !accountNumber.isEmpty();
    }

    /**
     * Generates a 44-digit barcode according to FEBRABAN specifications.
     * Format: BBBMVVVVEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEED
     */
    private String generateBarcode(String boletoId, BigDecimal amount, LocalDate dueDate) {
        StringBuilder barcode = new StringBuilder();

        // Bank code (3 digits)
        barcode.append(defaultBankCode);

        // Currency code (1 digit)
        barcode.append(CURRENCY_CODE);

        // Due date factor (4 digits)
        String dueDateFactor = calculateDueDateFactor(dueDate);
        barcode.append(dueDateFactor);

        // Amount (10 digits, no decimal point)
        String amountStr = amount.multiply(new BigDecimal("100"))
                .setScale(0, RoundingMode.DOWN)
                .toString();
        barcode.append(String.format("%010d", Long.parseLong(amountStr)));

        // Free field (25 digits) - Bank specific
        String freeField = generateFreeField(boletoId);
        barcode.append(freeField);

        // Calculate and insert verification digit at position 4
        String withoutCheckDigit = barcode.toString();
        String checkDigit = calculateBarcodeCheckDigit(withoutCheckDigit);

        // Insert check digit at position 4 (after bank code and currency)
        String finalBarcode = withoutCheckDigit.substring(0, 4) + checkDigit +
                withoutCheckDigit.substring(4);

        return finalBarcode;
    }

    /**
     * Generates a 48-digit typeable line from the barcode.
     * Format: BBBBBCCCCCCDCCCCCCCCCCCDDCCCCCCCCCCCCCDDEEEEEEEEEEEEE
     */
    private String generateTypeableLine(String barcode) {
        // Field 1: Bank code + currency + first 5 digits of free field + check digit
        String field1Base = barcode.substring(0, 4) + barcode.substring(19, 24);
        String field1 = field1Base + calculateFieldCheckDigit(field1Base);

        // Field 2: Next 10 digits of free field + check digit
        String field2Base = barcode.substring(24, 34);
        String field2 = field2Base + calculateFieldCheckDigit(field2Base);

        // Field 3: Last 10 digits of free field + check digit
        String field3Base = barcode.substring(34, 44);
        String field3 = field3Base + calculateFieldCheckDigit(field3Base);

        // Field 4: General check digit (from barcode position 4)
        String field4 = String.valueOf(barcode.charAt(4));

        // Field 5: Due date factor + amount
        String field5 = barcode.substring(5, 19);

        // Format with spaces: AAAAA.AAAAA BBBBB.BBBBBB CCCCC.CCCCCC D EEEEEEEEEEEEEEE
        return field1.substring(0, 5) + "." + field1.substring(5) + " " +
                field2.substring(0, 5) + "." + field2.substring(5) + " " +
                field3.substring(0, 5) + "." + field3.substring(5) + " " +
                field4 + " " +
                field5;
    }

    /**
     * Generates PDF document with boleto payment slip.
     * In production, use iText7 library for professional PDF generation.
     */
    private String generateBoletoPdf(BoletoPaymentDTO paymentDTO,
                                      String boletoId,
                                      String barcode,
                                      String typeableLine,
                                      LocalDate dueDate,
                                      BigDecimal totalAmount) {
        // Mock PDF generation - in production use iText7
        StringBuilder pdfContent = new StringBuilder();
        pdfContent.append("BOLETO BANCÁRIO\n\n");
        pdfContent.append("Beneficiário: ").append(merchantName).append("\n");
        pdfContent.append("CNPJ: ").append(merchantDocument).append("\n\n");
        pdfContent.append("Pagador: ").append(paymentDTO.getCustomerName()).append("\n");
        pdfContent.append("CPF/CNPJ: ").append(paymentDTO.getCustomerDocument()).append("\n\n");
        pdfContent.append("Vencimento: ").append(dueDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");
        pdfContent.append("Valor: R$ ").append(totalAmount.setScale(2, RoundingMode.HALF_UP)).append("\n\n");
        pdfContent.append("Linha Digitável:\n").append(typeableLine).append("\n\n");
        pdfContent.append("Código de Barras:\n").append(barcode).append("\n\n");
        pdfContent.append("Instruções:\n");
        pdfContent.append("- Após o vencimento, cobrar multa de ").append(finePercentage).append("%\n");
        pdfContent.append("- Juros de mora de ").append(dailyInterest).append("% ao dia\n");
        pdfContent.append("- Não receber após 30 dias do vencimento\n\n");
        pdfContent.append("Nosso Número: ").append(boletoId).append("\n");
        pdfContent.append("Agência/Código Beneficiário: ").append(agencyCode).append("/").append(accountNumber).append("\n");

        // Encode to Base64
        return Base64.getEncoder().encodeToString(pdfContent.toString().getBytes());
    }

    /**
     * Calculates due date factor (days since base date 07/10/1997).
     */
    private String calculateDueDateFactor(LocalDate dueDate) {
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(BASE_DATE, dueDate);
        return String.format("%04d", daysBetween);
    }

    /**
     * Generates bank-specific free field (25 digits).
     */
    private String generateFreeField(String boletoId) {
        // Simplified version - in production, follow bank specifications
        StringBuilder freeField = new StringBuilder();

        // Agency (4 digits)
        freeField.append(String.format("%04d", Integer.parseInt(agencyCode)));

        // Account (10 digits)
        freeField.append(String.format("%010d", Long.parseLong(accountNumber)));

        // Sequential number from boletoId (10 digits)
        String sequential = boletoId.replaceAll("[^0-9]", "").substring(0, Math.min(10, boletoId.replaceAll("[^0-9]", "").length()));
        freeField.append(String.format("%010d", Long.parseLong(sequential.isEmpty() ? "1" : sequential)));

        // Padding if needed
        while (freeField.length() < 25) {
            freeField.append("0");
        }

        return freeField.substring(0, 25);
    }

    /**
     * Calculates barcode check digit using modulo 11.
     */
    private String calculateBarcodeCheckDigit(String barcode) {
        // Remove position 4 if it exists (where check digit goes)
        String barcodeForCalc = barcode.substring(0, 4) + barcode.substring(5);

        int sum = 0;
        int multiplier = 2;

        for (int i = barcodeForCalc.length() - 1; i >= 0; i--) {
            sum += Character.getNumericValue(barcodeForCalc.charAt(i)) * multiplier;
            multiplier = (multiplier == 9) ? 2 : multiplier + 1;
        }

        int remainder = sum % 11;
        int checkDigit = 11 - remainder;

        if (checkDigit == 0 || checkDigit == 10 || checkDigit == 11) {
            return "1";
        }

        return String.valueOf(checkDigit);
    }

    /**
     * Calculates field check digit using modulo 10.
     */
    private String calculateFieldCheckDigit(String field) {
        int sum = 0;
        int multiplier = 2;

        for (int i = field.length() - 1; i >= 0; i--) {
            int digit = Character.getNumericValue(field.charAt(i)) * multiplier;
            sum += (digit > 9) ? digit - 9 : digit;
            multiplier = (multiplier == 2) ? 1 : 2;
        }

        int remainder = sum % 10;
        return String.valueOf(remainder == 0 ? 0 : 10 - remainder);
    }

    private String generateBoletoId() {
        return String.format("%020d", System.currentTimeMillis() / 1000);
    }

    private LocalDate calculateDueDate(Integer customDueDays) {
        int days = (customDueDays != null && customDueDays > 0) ? customDueDays : defaultDueDays;
        return LocalDate.now().plusDays(days);
    }

    private BigDecimal calculateTotalWithFees(BigDecimal amount) {
        BigDecimal fee = amount.multiply(feePercentage.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        return amount.add(fee).setScale(2, RoundingMode.HALF_UP);
    }

    private void validateBoletoRequest(BoletoPaymentDTO paymentDTO) {
        if (paymentDTO.getAmount() == null || paymentDTO.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentRequestException("Payment amount must be greater than zero");
        }

        if (paymentDTO.getAmount().compareTo(new BigDecimal("99999999.99")) > 0) {
            throw new InvalidPaymentRequestException("Amount exceeds boleto maximum limit");
        }

        if (paymentDTO.getCustomerName() == null || paymentDTO.getCustomerName().isEmpty()) {
            throw new InvalidPaymentRequestException("Customer name is required");
        }

        if (paymentDTO.getCustomerDocument() == null || paymentDTO.getCustomerDocument().isEmpty()) {
            throw new InvalidPaymentRequestException("Customer document (CPF/CNPJ) is required");
        }
    }

    // Fallback methods
    private BoletoResponse generateBoletoFallback(BoletoPaymentDTO paymentDTO, Exception e) {
        logger.error("Circuit breaker activated for boleto generation", e);
        boletoFailureCounter.increment();
        throw new PaymentGatewayException("Boleto generation service temporarily unavailable", e);
    }

    private PaymentStatus getBoletoStatusFallback(String boletoId, Exception e) {
        logger.error("Circuit breaker activated for boleto status check", e);
        return PaymentStatus.PENDING;
    }

    /**
     * Internal class to store boleto data.
     */
    private static class BoletoData {
        private String boletoId;
        private BigDecimal amount;
        private String barcode;
        private LocalDate dueDate;
        private PaymentStatus status;
        private LocalDateTime createdAt;

        public String getBoletoId() { return boletoId; }
        public void setBoletoId(String boletoId) { this.boletoId = boletoId; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getBarcode() { return barcode; }
        public void setBarcode(String barcode) { this.barcode = barcode; }
        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
        public PaymentStatus getStatus() { return status; }
        public void setStatus(PaymentStatus status) { this.status = status; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }
}
