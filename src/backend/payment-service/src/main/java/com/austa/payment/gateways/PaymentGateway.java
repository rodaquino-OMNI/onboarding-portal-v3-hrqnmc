package com.austa.payment.gateways;

import com.austa.payment.dto.PaymentRequest;
import com.austa.payment.dto.PaymentResponse;
import com.austa.payment.dto.RefundResponse;
import com.austa.payment.enums.PaymentStatus;
import java.math.BigDecimal;

/**
 * Common interface for all payment gateway integrations.
 * Provides a unified contract for processing payments, checking status,
 * and handling refunds across different payment methods and providers.
 *
 * <p>All implementations must ensure:
 * <ul>
 *   <li>PCI-DSS compliance for sensitive payment data</li>
 *   <li>Proper error handling and logging</li>
 *   <li>Circuit breaker and retry mechanisms</li>
 *   <li>Idempotency for payment operations</li>
 * </ul>
 *
 * @author AUSTA SuperApp
 * @version 1.0
 * @since 2024-01
 */
public interface PaymentGateway {

    /**
     * Processes a payment through the gateway.
     *
     * <p>This method should be idempotent - calling it multiple times
     * with the same request should not create duplicate charges.
     *
     * @param request the payment request containing amount, method, and details
     * @return PaymentResponse containing transaction ID, status, and gateway-specific data
     * @throws PaymentGatewayException if the gateway communication fails
     * @throws InvalidPaymentRequestException if the request validation fails
     * @throws InsufficientFundsException if the payment method has insufficient funds
     */
    PaymentResponse processPayment(PaymentRequest request);

    /**
     * Checks the current status of a payment transaction.
     *
     * <p>This method queries the gateway for the current state of a transaction.
     * It can be used to verify payment completion or check for delayed confirmations.
     *
     * @param transactionId the unique identifier for the transaction
     * @return PaymentStatus the current status (PENDING, COMPLETED, FAILED, REFUNDED, etc.)
     * @throws PaymentGatewayException if the gateway communication fails
     * @throws TransactionNotFoundException if the transaction ID is not found
     */
    PaymentStatus checkStatus(String transactionId);

    /**
     * Initiates a refund for a completed payment transaction.
     *
     * <p>Partial refunds are supported. The amount must be less than or equal
     * to the original transaction amount. Some payment methods may not support
     * refunds immediately and may require manual processing.
     *
     * @param transactionId the unique identifier for the original transaction
     * @param amount the amount to refund (must be <= original amount)
     * @return RefundResponse containing refund ID, status, and estimated completion time
     * @throws PaymentGatewayException if the gateway communication fails
     * @throws TransactionNotFoundException if the transaction ID is not found
     * @throws RefundNotAllowedException if the transaction cannot be refunded
     * @throws InvalidRefundAmountException if the amount exceeds the original transaction
     */
    RefundResponse refund(String transactionId, BigDecimal amount);

    /**
     * Returns the name of the gateway implementation.
     * Used for logging, metrics, and debugging purposes.
     *
     * @return String the gateway name (e.g., "PIX", "CreditCard", "Boleto")
     */
    String getGatewayName();

    /**
     * Validates whether the gateway is properly configured and ready to process payments.
     * Checks for required API keys, credentials, and connectivity.
     *
     * @return boolean true if the gateway is configured and operational
     */
    boolean isConfigured();
}
