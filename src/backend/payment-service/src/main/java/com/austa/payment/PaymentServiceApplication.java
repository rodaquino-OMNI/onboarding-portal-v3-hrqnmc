package com.austa.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Payment Service Application - Main Spring Boot application class
 *
 * This service handles all payment processing for the AUSTA Onboarding Portal:
 * - Credit card payments via Stripe
 * - PIX payments via Mercado Pago
 * - Boleto payments via PagSeguro
 * - Payment tracking and reconciliation
 * - Webhook processing from payment gateways
 * - Automatic payment retries and refunds
 *
 * @author AUSTA SuperApp
 * @version 1.0
 * @since 2024-01
 */
@SpringBootApplication
@EnableCaching
@EnableScheduling
@EnableAsync
@EnableTransactionManagement
public class PaymentServiceApplication {

    /**
     * Main entry point for the Payment Service application
     *
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
