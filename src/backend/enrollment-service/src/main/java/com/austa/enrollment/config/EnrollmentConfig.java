package com.austa.enrollment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;  // version: 3.0.0
import org.springframework.context.annotation.Configuration;  // version: 3.0.0
import org.springframework.context.annotation.Bean;  // version: 3.0.0
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;  // version: 4.0.0
import org.springframework.validation.annotation.Validated;  // version: 3.0.0
import java.time.Duration;  // version: 17
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;  // version: 3.0.0
import org.apache.http.ssl.SSLContextBuilder;  // version: 4.5.14
import org.modelmapper.ModelMapper;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.validation.annotation.Validated;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;

/**
 * Configuration class for the Enrollment Service that provides application settings,
 * service integrations, and runtime configurations.
 */
@Configuration
@EnableDiscoveryClient
@ConfigurationProperties(prefix = "enrollment")
@Validated
public class EnrollmentConfig {

    @Min(1)
    private Integer maxConcurrentEnrollments;

    @NotBlank
    private String healthServiceUrl;

    @NotBlank
    private String documentServiceUrl;

    @NotBlank
    private String policyServiceUrl;

    @NotNull
    private Duration enrollmentTimeout;

    @NotNull
    private Duration serviceCallTimeout;

    private Boolean enableAudit = true;

    private Boolean enableSSL = true;

    @NotBlank
    private String tlsVersion = "TLSv1.3";

    @Min(1)
    private Integer connectionPoolSize = 50;

    @Min(0)
    private Integer maxRetries = 3;

    @NotNull
    private Duration retryBackoff = Duration.ofSeconds(1);

    /**
     * Creates and configures a ModelMapper bean with custom mapping strategies.
     * @return Configured ModelMapper instance
     */
    @Bean
    public ModelMapper modelMapper() {
        ModelMapper mapper = new ModelMapper();
        mapper.getConfiguration()
            .setFieldMatchingEnabled(true)
            .setFieldAccessLevel(org.modelmapper.config.Configuration.AccessLevel.PRIVATE)
            .setSkipNullEnabled(true)
            .setMatchingStrategy(org.modelmapper.convention.MatchingStrategies.STRICT);
        return mapper;
    }

    /**
     * Creates a secure RestTemplate bean with SSL and timeout configurations.
     * @return Configured RestTemplate instance
     * @throws Exception if SSL context creation fails
     */
    @Bean
    public RestTemplate restTemplate() throws Exception {
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
        
        if (enableSSL) {
            factory.setHttpClient(
                org.apache.http.impl.client.HttpClients.custom()
                    .setSSLContext(new SSLContextBuilder()
                        .setProtocol(tlsVersion)
                        .build())
                    .setMaxConnTotal(connectionPoolSize)
                    .setMaxConnPerRoute(connectionPoolSize)
                    .build()
            );
        }

        factory.setConnectTimeout((int) serviceCallTimeout.toMillis());
        factory.setReadTimeout((int) serviceCallTimeout.toMillis());

        RestTemplate template = new RestTemplate(factory);

        // Add retry interceptor
        List<ClientHttpRequestInterceptor> interceptors = new ArrayList<>();
        interceptors.add((request, body, execution) -> {
            RetryTemplate retryTemplate = RetryTemplate.builder()
                .maxAttempts(maxRetries)
                .fixedBackoff(retryBackoff.toMillis())
                .build();
            return retryTemplate.execute(context -> execution.execute(request, body));
        });
        template.setInterceptors(interceptors);

        return template;
    }

    /**
     * Configures health check endpoints for the service.
     * @return Health check configuration
     */
    @Bean
    public HealthIndicator healthCheckConfig() {
        return () -> {
            org.springframework.boot.actuate.health.Health.Builder builder = 
                new org.springframework.boot.actuate.health.Health.Builder();
            
            try {
                // Add custom health checks
                builder.up()
                    .withDetail("maxConcurrentEnrollments", maxConcurrentEnrollments)
                    .withDetail("auditEnabled", enableAudit)
                    .withDetail("sslEnabled", enableSSL);
            } catch (Exception e) {
                builder.down(e);
            }
            
            return builder.build();
        };
    }

    // Getters and Setters
    public Integer getMaxConcurrentEnrollments() {
        return maxConcurrentEnrollments;
    }

    public void setMaxConcurrentEnrollments(Integer maxConcurrentEnrollments) {
        this.maxConcurrentEnrollments = maxConcurrentEnrollments;
    }

    public String getHealthServiceUrl() {
        return healthServiceUrl;
    }

    public void setHealthServiceUrl(String healthServiceUrl) {
        this.healthServiceUrl = healthServiceUrl;
    }

    public String getDocumentServiceUrl() {
        return documentServiceUrl;
    }

    public void setDocumentServiceUrl(String documentServiceUrl) {
        this.documentServiceUrl = documentServiceUrl;
    }

    public String getPolicyServiceUrl() {
        return policyServiceUrl;
    }

    public void setPolicyServiceUrl(String policyServiceUrl) {
        this.policyServiceUrl = policyServiceUrl;
    }

    public Duration getEnrollmentTimeout() {
        return enrollmentTimeout;
    }

    public void setEnrollmentTimeout(Duration enrollmentTimeout) {
        this.enrollmentTimeout = enrollmentTimeout;
    }

    public Duration getServiceCallTimeout() {
        return serviceCallTimeout;
    }

    public void setServiceCallTimeout(Duration serviceCallTimeout) {
        this.serviceCallTimeout = serviceCallTimeout;
    }

    public Boolean getEnableAudit() {
        return enableAudit;
    }

    public void setEnableAudit(Boolean enableAudit) {
        this.enableAudit = enableAudit;
    }

    public Boolean getEnableSSL() {
        return enableSSL;
    }

    public void setEnableSSL(Boolean enableSSL) {
        this.enableSSL = enableSSL;
    }

    public String getTlsVersion() {
        return tlsVersion;
    }

    public void setTlsVersion(String tlsVersion) {
        this.tlsVersion = tlsVersion;
    }

    public Integer getConnectionPoolSize() {
        return connectionPoolSize;
    }

    public void setConnectionPoolSize(Integer connectionPoolSize) {
        this.connectionPoolSize = connectionPoolSize;
    }

    public Integer getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(Integer maxRetries) {
        this.maxRetries = maxRetries;
    }

    public Duration getRetryBackoff() {
        return retryBackoff;
    }

    public void setRetryBackoff(Duration retryBackoff) {
        this.retryBackoff = retryBackoff;
    }
}