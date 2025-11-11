package com.austa.payment.validators;

import com.austa.payment.exceptions.*;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.regex.Pattern;

/**
 * Payment Business Rule Validators
 *
 * Validates:
 * - Payment amounts (min/max limits)
 * - Payment methods for policy types
 * - Refund eligibility
 * - Boleto due dates
 * - CPF/CNPJ for Brazilian payments
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
@Component
public class PaymentValidator {

    // Payment amount limits (in BRL)
    private static final Double MIN_PAYMENT_AMOUNT = 50.0;
    private static final Double MAX_PAYMENT_AMOUNT = 50000.0;
    private static final Double MAX_PIX_AMOUNT = 10000.0;
    private static final Double MIN_BOLETO_AMOUNT = 100.0;

    // Refund time limits (in days)
    private static final int MAX_REFUND_DAYS = 90;
    private static final int MIN_BOLETO_DUE_DAYS = 3;
    private static final int MAX_BOLETO_DUE_DAYS = 30;

    // CPF/CNPJ regex patterns
    private static final Pattern CPF_PATTERN = Pattern.compile("^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$");
    private static final Pattern CNPJ_PATTERN = Pattern.compile("^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$");

    /**
     * Validate payment amount based on payment method
     *
     * @param amount Payment amount
     * @param paymentMethod Payment method (CREDIT_CARD, PIX, BOLETO)
     * @throws InvalidPaymentAmountException if amount is invalid
     */
    public void validatePaymentAmount(Double amount, String paymentMethod) {
        if (amount == null || amount <= 0) {
            throw new InvalidPaymentAmountException(amount, MIN_PAYMENT_AMOUNT, MAX_PAYMENT_AMOUNT);
        }

        if (amount < MIN_PAYMENT_AMOUNT) {
            throw new InvalidPaymentAmountException(amount, MIN_PAYMENT_AMOUNT, MAX_PAYMENT_AMOUNT);
        }

        if (amount > MAX_PAYMENT_AMOUNT) {
            throw new InvalidPaymentAmountException(amount, MIN_PAYMENT_AMOUNT, MAX_PAYMENT_AMOUNT);
        }

        // Method-specific validation
        switch (paymentMethod.toUpperCase()) {
            case "PIX":
                if (amount > MAX_PIX_AMOUNT) {
                    throw new InvalidPaymentAmountException(
                            amount,
                            MIN_PAYMENT_AMOUNT,
                            MAX_PIX_AMOUNT
                    );
                }
                break;
            case "BOLETO":
                if (amount < MIN_BOLETO_AMOUNT) {
                    throw new InvalidPaymentAmountException(
                            amount,
                            MIN_BOLETO_AMOUNT,
                            MAX_PAYMENT_AMOUNT
                    );
                }
                break;
        }
    }

    /**
     * Validate payment method for policy type
     *
     * @param paymentMethod Payment method
     * @param policyType Policy type (HEALTH, DENTAL, LIFE, PET)
     * @throws UnsupportedPaymentMethodException if combination is not supported
     */
    public void validatePaymentMethodForPolicyType(String paymentMethod, String policyType) {
        // All policy types support credit card and PIX
        if ("CREDIT_CARD".equalsIgnoreCase(paymentMethod) || "PIX".equalsIgnoreCase(paymentMethod)) {
            return;
        }

        // Boleto restrictions
        if ("BOLETO".equalsIgnoreCase(paymentMethod)) {
            // Boleto not allowed for PET insurance (typically lower amounts)
            if ("PET".equalsIgnoreCase(policyType)) {
                throw new UnsupportedPaymentMethodException(paymentMethod, policyType);
            }
            return;
        }

        // Unknown payment method
        throw new UnsupportedPaymentMethodException(paymentMethod, policyType);
    }

    /**
     * Validate refund eligibility
     *
     * @param paymentId Payment ID
     * @param paymentStatus Current payment status
     * @param paymentDate Payment date
     * @param paymentMethod Payment method
     * @throws RefundNotAllowedException if refund is not allowed
     */
    public void validateRefundEligibility(
            String paymentId,
            String paymentStatus,
            LocalDate paymentDate,
            String paymentMethod) {

        // Only completed/succeeded payments can be refunded
        if (!"COMPLETED".equalsIgnoreCase(paymentStatus) && !"SUCCEEDED".equalsIgnoreCase(paymentStatus)) {
            throw new RefundNotAllowedException(
                    paymentId,
                    "Payment status must be COMPLETED or SUCCEEDED"
            );
        }

        // Check refund time window
        LocalDate now = LocalDate.now();
        long daysSincePayment = java.time.temporal.ChronoUnit.DAYS.between(paymentDate, now);

        if (daysSincePayment > MAX_REFUND_DAYS) {
            throw new RefundNotAllowedException(
                    paymentId,
                    String.format("Refund period expired. Maximum %d days allowed.", MAX_REFUND_DAYS)
            );
        }

        // Boleto refunds require special handling
        if ("BOLETO".equalsIgnoreCase(paymentMethod) && daysSincePayment < 3) {
            throw new RefundNotAllowedException(
                    paymentId,
                    "Boleto refunds must wait 3 business days for payment confirmation"
            );
        }
    }

    /**
     * Validate boleto due date
     *
     * @param dueDate Boleto due date
     * @throws InvalidPaymentAmountException if due date is invalid
     */
    public void validateBoletoDueDate(LocalDate dueDate) {
        LocalDate now = LocalDate.now();

        if (dueDate.isBefore(now)) {
            throw new PaymentException(
                    "Boleto due date cannot be in the past",
                    "INVALID_BOLETO_DUE_DATE"
            );
        }

        long daysUntilDue = java.time.temporal.ChronoUnit.DAYS.between(now, dueDate);

        if (daysUntilDue < MIN_BOLETO_DUE_DAYS) {
            throw new PaymentException(
                    String.format("Boleto due date must be at least %d days in the future", MIN_BOLETO_DUE_DAYS),
                    "INVALID_BOLETO_DUE_DATE"
            );
        }

        if (daysUntilDue > MAX_BOLETO_DUE_DAYS) {
            throw new PaymentException(
                    String.format("Boleto due date cannot exceed %d days", MAX_BOLETO_DUE_DAYS),
                    "INVALID_BOLETO_DUE_DATE"
            );
        }
    }

    /**
     * Validate CPF (Cadastro de Pessoas Físicas)
     * Brazilian individual taxpayer ID
     *
     * @param cpf CPF string
     * @return true if valid
     */
    public boolean validateCPF(String cpf) {
        if (cpf == null || cpf.trim().isEmpty()) {
            return false;
        }

        // Remove formatting
        String cleanCPF = cpf.replaceAll("[^0-9]", "");

        // Check length
        if (cleanCPF.length() != 11) {
            return false;
        }

        // Check for known invalid CPFs (all same digits)
        if (cleanCPF.matches("(\\d)\\1{10}")) {
            return false;
        }

        // Validate check digits
        return validateCPFCheckDigits(cleanCPF);
    }

    /**
     * Validate CNPJ (Cadastro Nacional da Pessoa Jurídica)
     * Brazilian company taxpayer ID
     *
     * @param cnpj CNPJ string
     * @return true if valid
     */
    public boolean validateCNPJ(String cnpj) {
        if (cnpj == null || cnpj.trim().isEmpty()) {
            return false;
        }

        // Remove formatting
        String cleanCNPJ = cnpj.replaceAll("[^0-9]", "");

        // Check length
        if (cleanCNPJ.length() != 14) {
            return false;
        }

        // Check for known invalid CNPJs (all same digits)
        if (cleanCNPJ.matches("(\\d)\\1{13}")) {
            return false;
        }

        // Validate check digits
        return validateCNPJCheckDigits(cleanCNPJ);
    }

    /**
     * Validate CPF check digits using Brazilian algorithm
     */
    private boolean validateCPFCheckDigits(String cpf) {
        int[] digits = cpf.chars().map(c -> c - '0').toArray();

        // First check digit
        int sum1 = 0;
        for (int i = 0; i < 9; i++) {
            sum1 += digits[i] * (10 - i);
        }
        int checkDigit1 = 11 - (sum1 % 11);
        if (checkDigit1 >= 10) checkDigit1 = 0;

        if (digits[9] != checkDigit1) {
            return false;
        }

        // Second check digit
        int sum2 = 0;
        for (int i = 0; i < 10; i++) {
            sum2 += digits[i] * (11 - i);
        }
        int checkDigit2 = 11 - (sum2 % 11);
        if (checkDigit2 >= 10) checkDigit2 = 0;

        return digits[10] == checkDigit2;
    }

    /**
     * Validate CNPJ check digits using Brazilian algorithm
     */
    private boolean validateCNPJCheckDigits(String cnpj) {
        int[] digits = cnpj.chars().map(c -> c - '0').toArray();

        // First check digit
        int[] weights1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum1 = 0;
        for (int i = 0; i < 12; i++) {
            sum1 += digits[i] * weights1[i];
        }
        int checkDigit1 = 11 - (sum1 % 11);
        if (checkDigit1 >= 10) checkDigit1 = 0;

        if (digits[12] != checkDigit1) {
            return false;
        }

        // Second check digit
        int[] weights2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum2 = 0;
        for (int i = 0; i < 13; i++) {
            sum2 += digits[i] * weights2[i];
        }
        int checkDigit2 = 11 - (sum2 % 11);
        if (checkDigit2 >= 10) checkDigit2 = 0;

        return digits[13] == checkDigit2;
    }
}
