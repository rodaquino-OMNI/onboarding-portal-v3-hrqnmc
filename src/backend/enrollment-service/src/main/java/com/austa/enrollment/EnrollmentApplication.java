package com.austa.enrollment;

import org.springframework.boot.SpringApplication; // version: 3.0.0
import org.springframework.boot.autoconfigure.SpringBootApplication; // version: 3.0.0
import org.springframework.scheduling.annotation.EnableAsync; // version: 3.0.0
import org.springframework.cache.annotation.EnableCaching; // version: 3.0.0
import org.springframework.scheduling.annotation.EnableScheduling; // version: 3.0.0
import org.apache.logging.log4j.LogManager; // version: 2.19.0
import org.apache.logging.log4j.Logger; // version: 2.19.0

/**
 * Main Spring Boot application class for the Enrollment Service.
 * Provides core functionality for enrollment processing with support for
 * async operations, caching, and scheduled tasks.
 */
@SpringBootApplication(scanBasePackages = "com.austa.enrollment")
@EnableAsync
@EnableCaching
@EnableScheduling
public class EnrollmentApplication {

    private static final Logger logger = LogManager.getLogger(EnrollmentApplication.class);
    private static final String APPLICATION_VERSION = "1.0.0";

    /**
     * Default constructor that initializes logging and basic configurations.
     */
    public EnrollmentApplication() {
        logger.info("Initializing Enrollment Service");
    }

    /**
     * Application entry point that bootstraps the Spring Boot application
     * with enhanced error handling and monitoring.
     *
     * @param args Command line arguments passed to the application
     */
    public static void main(String[] args) {
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            logger.error("Uncaught exception in thread {}: {}", thread.getName(), throwable.getMessage(), throwable);
        });

        logger.info("Starting Enrollment Service v{}", APPLICATION_VERSION);
        
        try {
            // Register shutdown hook for graceful termination
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                logger.info("Shutting down Enrollment Service...");
                // Additional cleanup if needed
            }));

            // Start Spring application
            SpringApplication app = new SpringApplication(EnrollmentApplication.class);
            
            // Add additional properties if needed
            app.setAddCommandLineProperties(true);
            
            // Start the application
            app.run(args);
            
            logger.info("Enrollment Service started successfully");
            
        } catch (Exception e) {
            logger.error("Failed to start Enrollment Service: {}", e.getMessage(), e);
            System.exit(1);
        }
    }
}