package com.austa.payment.models;

/**
 * Payment methods supported by AUSTA payment processing system.
 * Includes Brazilian-specific payment methods (PIX, Boleto) alongside international methods.
 *
 * <p>Compliance Notes:</p>
 * <ul>
 *   <li>PIX: Instant payment system regulated by Brazilian Central Bank (BCB)</li>
 *   <li>Boleto: Traditional Brazilian payment slip method</li>
 *   <li>Credit/Debit Cards: Must comply with PCI-DSS standards</li>
 *   <li>Bank Transfer: Subject to banking regulations and fraud prevention</li>
 * </ul>
 *
 * @author AUSTA Development Team
 * @version 1.0.0
 * @since 2024-11-10
 */
public enum PaymentMethod {
    /**
     * PIX - Brazilian instant payment system.
     * Features: Real-time processing, QR code generation, 24/7 availability.
     * Regulated by: Central Bank of Brazil (BCB).
     */
    PIX("PIX - Instant Payment", "pix", true, 0),

    /**
     * Credit Card payment.
     * Features: Installment options, international acceptance, fraud protection.
     * Compliance: PCI-DSS Level 1 required.
     */
    CREDIT_CARD("Credit Card", "credit_card", true, 3),

    /**
     * Debit Card payment.
     * Features: Direct account debit, lower fees than credit.
     * Compliance: PCI-DSS Level 1 required.
     */
    DEBIT_CARD("Debit Card", "debit_card", true, 2),

    /**
     * Boleto Bancário - Brazilian payment slip.
     * Features: Barcode/QR code, 3-day processing, widely accepted.
     * Popular for: Customers without credit cards, bank payments.
     */
    BOLETO("Boleto Bancário", "boleto", false, 1),

    /**
     * Bank Transfer (TED/DOC).
     * Features: Direct bank-to-bank transfer, higher security.
     * Processing: 1-2 business days.
     */
    BANK_TRANSFER("Bank Transfer", "bank_transfer", false, 1),

    /**
     * Wire Transfer (International).
     * Features: International payments, SWIFT network.
     * Processing: 3-5 business days.
     */
    WIRE_TRANSFER("Wire Transfer", "wire_transfer", false, 5),

    /**
     * ACH (Automated Clearing House) - US only.
     * Features: Low-cost, batch processing.
     * Processing: 1-3 business days.
     */
    ACH("ACH Transfer", "ach", false, 3),

    /**
     * Check payment.
     * Features: Traditional paper check processing.
     * Processing: 5-7 business days.
     */
    CHECK("Check", "check", false, 7),

    /**
     * Cash payment.
     * Features: In-person payment at authorized locations.
     * Availability: Limited to physical offices.
     */
    CASH("Cash", "cash", false, 0),

    /**
     * Other payment methods.
     * Features: Fallback for custom or future payment methods.
     */
    OTHER("Other", "other", false, 0);

    private final String displayName;
    private final String code;
    private final boolean supportsInstantProcessing;
    private final int averageProcessingDays;

    /**
     * Constructor for PaymentMethod enum.
     *
     * @param displayName Human-readable name for UI display
     * @param code Technical code for API/database storage
     * @param supportsInstantProcessing Whether payment processes in real-time
     * @param averageProcessingDays Average days to complete payment processing
     */
    PaymentMethod(String displayName, String code, boolean supportsInstantProcessing, int averageProcessingDays) {
        this.displayName = displayName;
        this.code = code;
        this.supportsInstantProcessing = supportsInstantProcessing;
        this.averageProcessingDays = averageProcessingDays;
    }

    /**
     * Gets the human-readable display name.
     *
     * @return Display name for UI
     */
    public String getDisplayName() {
        return displayName;
    }

    /**
     * Gets the technical code for API/database.
     *
     * @return Technical code
     */
    public String getCode() {
        return code;
    }

    /**
     * Checks if payment method supports instant processing.
     *
     * @return true if instant processing is supported
     */
    public boolean supportsInstantProcessing() {
        return supportsInstantProcessing;
    }

    /**
     * Gets average processing time in days.
     *
     * @return Number of days for processing
     */
    public int getAverageProcessingDays() {
        return averageProcessingDays;
    }

    /**
     * Checks if payment method is Brazilian-specific.
     *
     * @return true if method is specific to Brazil
     */
    public boolean isBrazilianMethod() {
        return this == PIX || this == BOLETO;
    }

    /**
     * Checks if payment method requires PCI-DSS compliance.
     *
     * @return true if PCI-DSS compliance is required
     */
    public boolean requiresPciCompliance() {
        return this == CREDIT_CARD || this == DEBIT_CARD;
    }

    /**
     * Finds PaymentMethod by code.
     *
     * @param code Technical code
     * @return Matching PaymentMethod or null if not found
     */
    public static PaymentMethod fromCode(String code) {
        if (code == null) {
            return null;
        }
        for (PaymentMethod method : values()) {
            if (method.code.equalsIgnoreCase(code)) {
                return method;
            }
        }
        return null;
    }
}
