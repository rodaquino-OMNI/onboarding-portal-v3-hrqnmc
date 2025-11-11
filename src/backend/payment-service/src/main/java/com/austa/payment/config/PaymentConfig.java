package com.austa.payment.config;

import com.stripe.Stripe;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.retry.RetryConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.time.Duration;

/**
 * Payment Gateway Configuration
 *
 * Configures connections to all payment gateways:
 * - Stripe (Credit/Debit Cards)
 * - Mercado Pago (PIX)
 * - PagSeguro (Boleto)
 *
 * Includes retry policies and circuit breakers for resilience
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
@Configuration
public class PaymentConfig {

    // Stripe Configuration
    @Value("${payment.stripe.api-key}")
    private String stripeApiKey;

    @Value("${payment.stripe.webhook-secret}")
    private String stripeWebhookSecret;

    @Value("${payment.stripe.api-version:2023-10-16}")
    private String stripeApiVersion;

    // Mercado Pago Configuration
    @Value("${payment.mercadopago.access-token}")
    private String mercadoPagoAccessToken;

    @Value("${payment.mercadopago.webhook-secret}")
    private String mercadoPagoWebhookSecret;

    @Value("${payment.mercadopago.api-url:https://api.mercadopago.com}")
    private String mercadoPagoApiUrl;

    // PagSeguro Configuration
    @Value("${payment.pagseguro.email}")
    private String pagSeguroEmail;

    @Value("${payment.pagseguro.token}")
    private String pagSeguroToken;

    @Value("${payment.pagseguro.webhook-secret}")
    private String pagSeguroWebhookSecret;

    @Value("${payment.pagseguro.api-url:https://ws.pagseguro.uol.com.br}")
    private String pagSeguroApiUrl;

    @Value("${payment.pagseguro.sandbox:false}")
    private boolean pagSeguroSandbox;

    // Retry Configuration
    @Value("${payment.retry.max-attempts:3}")
    private int retryMaxAttempts;

    @Value("${payment.retry.wait-duration:2000}")
    private long retryWaitDuration;

    // Circuit Breaker Configuration
    @Value("${payment.circuit-breaker.failure-rate-threshold:50}")
    private float circuitBreakerFailureRateThreshold;

    @Value("${payment.circuit-breaker.wait-duration-in-open-state:60000}")
    private long circuitBreakerWaitDuration;

    @Value("${payment.circuit-breaker.sliding-window-size:10}")
    private int circuitBreakerSlidingWindowSize;

    /**
     * Initialize Stripe API with API key
     */
    @PostConstruct
    public void initStripe() {
        Stripe.apiKey = stripeApiKey;
    }

    /**
     * RestTemplate bean for making HTTP requests to payment gateways
     *
     * @return Configured RestTemplate instance
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    /**
     * Retry configuration for payment gateway calls
     *
     * Retries failed payment operations with exponential backoff
     *
     * @return RetryConfig instance
     */
    @Bean
    public RetryConfig paymentRetryConfig() {
        return RetryConfig.custom()
                .maxAttempts(retryMaxAttempts)
                .waitDuration(Duration.ofMillis(retryWaitDuration))
                .retryExceptions(
                        java.io.IOException.class,
                        java.net.SocketTimeoutException.class,
                        org.springframework.web.client.ResourceAccessException.class
                )
                .build();
    }

    /**
     * Circuit breaker configuration for payment gateways
     *
     * Prevents cascading failures by opening circuit when error rate is high
     *
     * @return CircuitBreakerConfig instance
     */
    @Bean
    public CircuitBreakerConfig paymentCircuitBreakerConfig() {
        return CircuitBreakerConfig.custom()
                .failureRateThreshold(circuitBreakerFailureRateThreshold)
                .waitDurationInOpenState(Duration.ofMillis(circuitBreakerWaitDuration))
                .slidingWindowSize(circuitBreakerSlidingWindowSize)
                .permittedNumberOfCallsInHalfOpenState(5)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .build();
    }

    // Getters for configuration values

    public String getStripeApiKey() {
        return stripeApiKey;
    }

    public String getStripeWebhookSecret() {
        return stripeWebhookSecret;
    }

    public String getStripeApiVersion() {
        return stripeApiVersion;
    }

    public String getMercadoPagoAccessToken() {
        return mercadoPagoAccessToken;
    }

    public String getMercadoPagoWebhookSecret() {
        return mercadoPagoWebhookSecret;
    }

    public String getMercadoPagoApiUrl() {
        return mercadoPagoApiUrl;
    }

    public String getPagSeguroEmail() {
        return pagSeguroEmail;
    }

    public String getPagSeguroToken() {
        return pagSeguroToken;
    }

    public String getPagSeguroWebhookSecret() {
        return pagSeguroWebhookSecret;
    }

    public String getPagSeguroApiUrl() {
        return pagSeguroSandbox ? "https://ws.sandbox.pagseguro.uol.com.br" : pagSeguroApiUrl;
    }

    public boolean isPagSeguroSandbox() {
        return pagSeguroSandbox;
    }
}
