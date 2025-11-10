package com.austa.policy.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResponseErrorHandler;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

/**
 * Custom error handler for RestTemplate HTTP responses.
 * Provides comprehensive error handling for 4xx and 5xx status codes with detailed logging.
 *
 * @version 1.0.0
 */
@Component
public class CustomResponseErrorHandler implements ResponseErrorHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomResponseErrorHandler.class);

    /**
     * Determines if the HTTP response indicates an error condition.
     *
     * @param response The HTTP response to check
     * @return true if the response has an error status (4xx or 5xx), false otherwise
     * @throws IOException if an error occurs reading the response
     */
    @Override
    public boolean hasError(ClientHttpResponse response) throws IOException {
        HttpStatus.Series series = response.getStatusCode().series();
        return series == HttpStatus.Series.CLIENT_ERROR || series == HttpStatus.Series.SERVER_ERROR;
    }

    /**
     * Handles error responses with appropriate logging and exception throwing.
     *
     * @param response The HTTP response containing the error
     * @throws IOException if an error occurs reading the response
     */
    @Override
    public void handleError(ClientHttpResponse response) throws IOException {
        HttpStatus statusCode = response.getStatusCode();
        String statusText = response.getStatusText();
        String responseBody = getResponseBody(response);

        logger.error("HTTP Error Response - Status: {} {}, Body: {}",
            statusCode.value(), statusText, responseBody);

        if (statusCode.series() == HttpStatus.Series.CLIENT_ERROR) {
            handleClientError(statusCode, statusText, responseBody);
        } else if (statusCode.series() == HttpStatus.Series.SERVER_ERROR) {
            handleServerError(statusCode, statusText, responseBody);
        }
    }

    /**
     * Handles 4xx client errors with specific exception types.
     *
     * @param statusCode HTTP status code
     * @param statusText HTTP status text
     * @param responseBody Response body content
     */
    private void handleClientError(HttpStatus statusCode, String statusText, String responseBody) {
        String errorMessage = String.format("Client error: %s %s - %s",
            statusCode.value(), statusText, responseBody);

        logger.warn("Client error occurred: {}", errorMessage);

        switch (statusCode) {
            case BAD_REQUEST:
                throw new BadRequestException(errorMessage);
            case UNAUTHORIZED:
                throw new UnauthorizedException(errorMessage);
            case FORBIDDEN:
                throw new ForbiddenException(errorMessage);
            case NOT_FOUND:
                throw new ResourceNotFoundException(errorMessage);
            case CONFLICT:
                throw new ConflictException(errorMessage);
            case UNPROCESSABLE_ENTITY:
                throw new UnprocessableEntityException(errorMessage);
            case TOO_MANY_REQUESTS:
                throw new RateLimitException(errorMessage);
            default:
                throw new ClientException(errorMessage);
        }
    }

    /**
     * Handles 5xx server errors with appropriate exceptions.
     *
     * @param statusCode HTTP status code
     * @param statusText HTTP status text
     * @param responseBody Response body content
     */
    private void handleServerError(HttpStatus statusCode, String statusText, String responseBody) {
        String errorMessage = String.format("Server error: %s %s - %s",
            statusCode.value(), statusText, responseBody);

        logger.error("Server error occurred: {}", errorMessage);

        switch (statusCode) {
            case INTERNAL_SERVER_ERROR:
                throw new InternalServerException(errorMessage);
            case BAD_GATEWAY:
                throw new BadGatewayException(errorMessage);
            case SERVICE_UNAVAILABLE:
                throw new ServiceUnavailableException(errorMessage);
            case GATEWAY_TIMEOUT:
                throw new GatewayTimeoutException(errorMessage);
            default:
                throw new ServerException(errorMessage);
        }
    }

    /**
     * Extracts the response body as a string.
     *
     * @param response The HTTP response
     * @return Response body as string, or empty string if unable to read
     */
    private String getResponseBody(ClientHttpResponse response) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (IOException e) {
            logger.warn("Unable to read response body: {}", e.getMessage());
            return "";
        }
    }

    // Custom Exception Classes

    /**
     * Base exception for client errors (4xx).
     */
    public static class ClientException extends RuntimeException {
        public ClientException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 400 Bad Request errors.
     */
    public static class BadRequestException extends ClientException {
        public BadRequestException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 401 Unauthorized errors.
     */
    public static class UnauthorizedException extends ClientException {
        public UnauthorizedException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 403 Forbidden errors.
     */
    public static class ForbiddenException extends ClientException {
        public ForbiddenException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 404 Not Found errors.
     */
    public static class ResourceNotFoundException extends ClientException {
        public ResourceNotFoundException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 409 Conflict errors.
     */
    public static class ConflictException extends ClientException {
        public ConflictException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 422 Unprocessable Entity errors.
     */
    public static class UnprocessableEntityException extends ClientException {
        public UnprocessableEntityException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 429 Too Many Requests errors.
     */
    public static class RateLimitException extends ClientException {
        public RateLimitException(String message) {
            super(message);
        }
    }

    /**
     * Base exception for server errors (5xx).
     */
    public static class ServerException extends RuntimeException {
        public ServerException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 500 Internal Server Error.
     */
    public static class InternalServerException extends ServerException {
        public InternalServerException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 502 Bad Gateway errors.
     */
    public static class BadGatewayException extends ServerException {
        public BadGatewayException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 503 Service Unavailable errors.
     */
    public static class ServiceUnavailableException extends ServerException {
        public ServiceUnavailableException(String message) {
            super(message);
        }
    }

    /**
     * Exception for 504 Gateway Timeout errors.
     */
    public static class GatewayTimeoutException extends ServerException {
        public GatewayTimeoutException(String message) {
            super(message);
        }
    }
}
