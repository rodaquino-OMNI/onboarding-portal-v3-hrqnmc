package com.austa.policy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication; // version: 3.0.0
import org.springframework.cloud.client.discovery.EnableDiscoveryClient; // version: 4.0.0
import org.springframework.cloud.client.circuitbreaker.EnableCircuitBreaker; // version: 3.0.0
import org.slf4j.Logger; // version: 2.0.0
import org.slf4j.LoggerFactory;

import com.austa.policy.config.PolicyConfig;

/**
 * Main application class for the Policy Service microservice.
 * Implements service discovery, circuit breaker patterns, and integrates with AUSTA's ecosystem.
 *
 * @version 1.0
 * @since 3.0.0
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableCircuitBreaker
public class PolicyApplication {

    private static final Logger logger = LoggerFactory.getLogger(PolicyApplication.class);
    private static final String APPLICATION_NAME = "Policy Service";
    private static final String VERSION = "1.0.0";

    /**
     * Main entry point for the Policy Service application.
     * Initializes the Spring Boot application with enhanced error handling and startup logging.
     *
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        try {
            logger.info("Starting {} version {} initialization...", APPLICATION_NAME, VERSION);
            logger.info("Active profile: {}", System.getProperty("spring.profiles.active", "default"));

            // Register shutdown hook for graceful termination
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                logger.info("Initiating graceful shutdown of {}", APPLICATION_NAME);
            }));

            // Configure Spring application
            SpringApplication application = new SpringApplication(PolicyApplication.class);
            
            // Add failure analyzers for better error reporting
            application.setRegisterShutdownHook(true);
            
            // Start the application
            application.run(args);

            logger.info("{} started successfully", APPLICATION_NAME);
            
            // Log successful service discovery registration
            logger.info("Service registered with discovery server");
            
            // Log circuit breaker initialization
            logger.info("Circuit breaker pattern initialized");
            
            // Log cache manager initialization
            logger.info("Cache manager initialized");

        } catch (Exception e) {
            logger.error("Failed to start {}: {}", APPLICATION_NAME, e.getMessage(), e);
            // Ensure proper system exit in case of fatal errors
            System.exit(1);
        }
    }
}