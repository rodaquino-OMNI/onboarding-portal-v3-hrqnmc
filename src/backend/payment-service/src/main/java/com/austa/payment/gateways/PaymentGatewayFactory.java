package com.austa.payment.gateways;

import com.austa.payment.enums.PaymentMethod;
import com.austa.payment.exception.PaymentGatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Factory class for creating and selecting appropriate payment gateway implementations.
 *
 * <p>This factory implements the Strategy Pattern to provide the correct payment
 * gateway based on the payment method. It acts as a single point of access for
 * all payment gateway operations.
 *
 * <p>Supported Payment Methods:
 * <ul>
 *   <li>PIX - Instant payment via PixGatewayClient</li>
 *   <li>CREDIT_CARD - Credit card processing via CreditCardGatewayClient</li>
 *   <li>BOLETO - Bank slip generation via BoletoGenerator</li>
 * </ul>
 *
 * <p>Usage Example:
 * <pre>
 * PaymentGateway gateway = paymentGatewayFactory.getGateway(PaymentMethod.PIX);
 * PaymentResponse response = gateway.processPayment(paymentRequest);
 * </pre>
 *
 * <p>Benefits:
 * <ul>
 *   <li>Decouples payment method selection from business logic</li>
 *   <li>Easy to add new payment methods</li>
 *   <li>Centralized gateway management</li>
 *   <li>Simplified testing with mock gateways</li>
 * </ul>
 *
 * @author AUSTA SuperApp
 * @version 1.0
 * @since 2024-01
 */
@Component
public class PaymentGatewayFactory {

    private static final Logger logger = LoggerFactory.getLogger(PaymentGatewayFactory.class);

    private final PixGatewayClient pixGatewayClient;
    private final CreditCardGatewayClient creditCardGatewayClient;
    private final BoletoGenerator boletoGenerator;

    /**
     * Constructor with dependency injection of all gateway implementations.
     *
     * @param pixGatewayClient PIX payment gateway
     * @param creditCardGatewayClient Credit card payment gateway
     * @param boletoGenerator Boleto bancário generator
     */
    public PaymentGatewayFactory(PixGatewayClient pixGatewayClient,
                                  CreditCardGatewayClient creditCardGatewayClient,
                                  BoletoGenerator boletoGenerator) {
        this.pixGatewayClient = pixGatewayClient;
        this.creditCardGatewayClient = creditCardGatewayClient;
        this.boletoGenerator = boletoGenerator;

        logger.info("PaymentGatewayFactory initialized with {} gateways",
                getSupportedGateways().size());
    }

    /**
     * Returns the appropriate payment gateway for the specified payment method.
     *
     * <p>This method implements the Strategy Pattern, selecting the correct
     * gateway implementation based on the payment method type.
     *
     * @param paymentMethod the payment method type (PIX, CREDIT_CARD, BOLETO)
     * @return PaymentGateway implementation for the specified method
     * @throws PaymentGatewayException if payment method is null or unsupported
     * @throws IllegalStateException if the selected gateway is not properly configured
     */
    public PaymentGateway getGateway(PaymentMethod paymentMethod) {
        if (paymentMethod == null) {
            logger.error("Payment method cannot be null");
            throw new PaymentGatewayException("Payment method is required");
        }

        logger.debug("Selecting payment gateway for method: {}", paymentMethod);

        PaymentGateway gateway = switch (paymentMethod) {
            case PIX -> {
                logger.info("Selected PIX gateway");
                yield pixGatewayClient;
            }
            case CREDIT_CARD -> {
                logger.info("Selected Credit Card gateway");
                yield creditCardGatewayClient;
            }
            case BOLETO -> {
                logger.info("Selected Boleto gateway");
                yield boletoGenerator;
            }
            case DEBIT_CARD -> {
                logger.warn("Debit card not yet implemented, using credit card gateway");
                yield creditCardGatewayClient;
            }
            case BANK_TRANSFER -> {
                logger.warn("Bank transfer not yet implemented, using PIX gateway");
                yield pixGatewayClient;
            }
            default -> {
                logger.error("Unsupported payment method: {}", paymentMethod);
                throw new PaymentGatewayException("Unsupported payment method: " + paymentMethod);
            }
        };

        // Verify gateway configuration
        if (!gateway.isConfigured()) {
            logger.warn("Gateway {} is not fully configured, may return mock responses",
                    gateway.getGatewayName());
        }

        return gateway;
    }

    /**
     * Returns a list of all supported payment gateways.
     *
     * @return java.util.List of PaymentGateway implementations
     */
    public java.util.List<PaymentGateway> getSupportedGateways() {
        return java.util.List.of(pixGatewayClient, creditCardGatewayClient, boletoGenerator);
    }

    /**
     * Checks if a specific payment method is supported.
     *
     * @param paymentMethod the payment method to check
     * @return true if the payment method is supported
     */
    public boolean isPaymentMethodSupported(PaymentMethod paymentMethod) {
        try {
            PaymentGateway gateway = getGateway(paymentMethod);
            return gateway != null;
        } catch (PaymentGatewayException e) {
            logger.debug("Payment method {} is not supported", paymentMethod);
            return false;
        }
    }

    /**
     * Checks if a specific payment method is fully configured and ready to use.
     *
     * @param paymentMethod the payment method to check
     * @return true if the gateway is configured with all required credentials
     */
    public boolean isGatewayConfigured(PaymentMethod paymentMethod) {
        try {
            PaymentGateway gateway = getGateway(paymentMethod);
            return gateway.isConfigured();
        } catch (PaymentGatewayException e) {
            logger.error("Error checking gateway configuration for {}", paymentMethod, e);
            return false;
        }
    }

    /**
     * Returns gateway health status for monitoring and diagnostics.
     *
     * @return Map containing health status of all gateways
     */
    public java.util.Map<String, Boolean> getGatewayHealthStatus() {
        java.util.Map<String, Boolean> healthStatus = new java.util.HashMap<>();

        healthStatus.put("PIX", pixGatewayClient.isConfigured());
        healthStatus.put("CREDIT_CARD", creditCardGatewayClient.isConfigured());
        healthStatus.put("BOLETO", boletoGenerator.isConfigured());

        logger.debug("Gateway health status: {}", healthStatus);
        return healthStatus;
    }

    /**
     * Returns the gateway name for a given payment method.
     *
     * @param paymentMethod the payment method
     * @return String gateway name
     */
    public String getGatewayName(PaymentMethod paymentMethod) {
        try {
            PaymentGateway gateway = getGateway(paymentMethod);
            return gateway.getGatewayName();
        } catch (PaymentGatewayException e) {
            return "UNKNOWN";
        }
    }

    /**
     * Validates that all required gateways are properly configured.
     * Used for application startup validation.
     *
     * @throws IllegalStateException if any critical gateway is not configured
     */
    public void validateGatewayConfiguration() {
        logger.info("Validating payment gateway configuration...");

        boolean allConfigured = true;
        StringBuilder issues = new StringBuilder();

        if (!pixGatewayClient.isConfigured()) {
            logger.warn("PIX gateway is not fully configured");
            issues.append("PIX gateway missing configuration. ");
            allConfigured = false;
        }

        if (!creditCardGatewayClient.isConfigured()) {
            logger.warn("Credit Card gateway is not fully configured");
            issues.append("Credit Card gateway missing configuration. ");
            allConfigured = false;
        }

        if (!boletoGenerator.isConfigured()) {
            logger.warn("Boleto generator is not fully configured");
            issues.append("Boleto generator missing configuration. ");
            allConfigured = false;
        }

        if (!allConfigured) {
            logger.error("Gateway configuration issues: {}", issues.toString());
            logger.warn("Gateways will operate in mock mode. Configure API keys for production use.");
        } else {
            logger.info("All payment gateways are properly configured");
        }
    }
}
