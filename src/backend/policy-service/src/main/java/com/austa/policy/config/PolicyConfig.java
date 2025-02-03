package com.austa.policy.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.retry.RetryConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Duration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;

/**
 * Configuration class for Policy Service providing comprehensive settings for policy management,
 * caching, resilience patterns, and service integration.
 * 
 * @version 1.0
 * @since 3.0.0
 */
@Configuration
@EnableCaching
public class PolicyConfig {

    /**
     * Configures Redis cache manager with optimized TTL settings and transaction support.
     * 
     * @param connectionFactory Redis connection factory for cluster support
     * @return Configured Redis cache manager instance
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Default cache configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(15))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.string())
            )
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.json())
            )
            .prefixCacheNameWith("policy:")
            .computePrefixWith(cacheName -> "austa:policy:" + cacheName + ":")
            .enableStatistics();

        // Specific cache configurations
        RedisCacheConfiguration pendingPolicyConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))
            .prefixCacheNameWith("policy:pending:");

        // Create cache manager with configurations
        RedisCacheManager.RedisCacheManagerBuilder builder = RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withCacheConfiguration("pendingPolicies", pendingPolicyConfig)
            .enableStatistics()
            .transactionAware();

        return builder.build();
    }

    /**
     * Configures circuit breaker with optimized thresholds and monitoring.
     * 
     * @return Circuit breaker configuration with monitoring
     */
    @Bean
    public CircuitBreakerConfig circuitBreakerConfig() {
        return CircuitBreakerConfig.custom()
            .failureRateThreshold(50.0f)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
            .slidingWindowSize(10)
            .minimumNumberOfCalls(5)
            .permittedNumberOfCallsInHalfOpenState(3)
            .automaticTransitionFromOpenToHalfOpenEnabled(true)
            .recordExceptions(Exception.class)
            .ignoreExceptions(IllegalArgumentException.class)
            .build();
    }

    /**
     * Configures retry pattern with exponential backoff and monitoring.
     * 
     * @return Retry configuration with exponential backoff
     */
    @Bean
    public RetryConfig retryConfig() {
        return RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofSeconds(1))
            .exponentialBackoff(2, Duration.ofSeconds(8))
            .retryExceptions(Exception.class)
            .ignoreExceptions(IllegalArgumentException.class)
            .failAfterMaxAttempts(true)
            .build();
    }

    /**
     * Configures REST template with security and performance optimizations.
     * 
     * @return Secured REST template instance
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        factory.setBufferRequestBody(false);

        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.setErrorHandler(new CustomResponseErrorHandler());
        
        // Add security headers interceptor
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().set("X-Application-Name", "policy-service");
            request.getHeaders().set("X-Request-ID", java.util.UUID.randomUUID().toString());
            return execution.execute(request, body);
        });

        return restTemplate;
    }

    /**
     * Configures JSON object mapper with JSONB and security features.
     * 
     * @return Configured object mapper instance
     */
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        
        // Security configurations
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        mapper.enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY);
        mapper.disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);
        
        // Add Java 8 date/time support
        mapper.registerModule(new JavaTimeModule());
        
        // Configure property inclusion
        mapper.setSerializationInclusion(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL);
        
        return mapper;
    }
}