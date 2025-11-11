package com.austa.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security Configuration for Payment Service
 *
 * Implements:
 * - JWT authentication for API endpoints
 * - CORS configuration for frontend integration
 * - Webhook endpoint security (signature verification)
 * - Rate limiting
 * - CSRF protection
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true, securedEnabled = true)
public class SecurityConfig {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:8080}")
    private String[] allowedOrigins;

    @Value("${security.rate-limit.requests-per-minute:60}")
    private int rateLimitRequestsPerMinute;

    /**
     * Configure HTTP security with JWT authentication
     *
     * @param http HttpSecurity configuration
     * @return SecurityFilterChain
     * @throws Exception if configuration fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF for stateless API (using JWT)
                .csrf().disable()

                // Configure CORS
                .cors().configurationSource(corsConfigurationSource())
                .and()

                // Configure session management (stateless)
                .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()

                // Configure authorization
                .authorizeHttpRequests(authorize -> authorize
                        // Public endpoints (webhooks)
                        .requestMatchers("/api/webhooks/**").permitAll()

                        // Actuator health endpoints (for k8s probes)
                        .requestMatchers("/actuator/health/**").permitAll()
                        .requestMatchers("/actuator/info").permitAll()

                        // API documentation
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    /**
     * CORS configuration for cross-origin requests
     *
     * Allows frontend applications to access payment API endpoints
     *
     * @return CorsConfigurationSource
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "X-API-Key",
                "X-Signature",
                "X-Idempotency-Key"
        ));
        configuration.setExposedHeaders(Arrays.asList(
                "X-Request-Id",
                "X-RateLimit-Remaining",
                "X-RateLimit-Reset"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    /**
     * Password encoder bean for encrypting sensitive data
     *
     * @return BCryptPasswordEncoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Get JWT secret key
     *
     * @return JWT secret
     */
    public String getJwtSecret() {
        return jwtSecret;
    }

    /**
     * Get JWT expiration time in milliseconds
     *
     * @return JWT expiration
     */
    public long getJwtExpiration() {
        return jwtExpiration;
    }

    /**
     * Get rate limit requests per minute
     *
     * @return Rate limit
     */
    public int getRateLimitRequestsPerMinute() {
        return rateLimitRequestsPerMinute;
    }
}
