package com.austa.payment.controllers;

import com.austa.payment.dto.*;
import com.austa.payment.exceptions.*;
import com.austa.payment.services.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST API controller for payment operations.
 * Provides endpoints for creating, retrieving, processing, refunding, and cancelling payments.
 */
@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments", description = "Payment management endpoints")
@SecurityRequirement(name = "bearer-jwt")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Create a new payment
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'BROKER')")
    @Operation(summary = "Create a new payment", description = "Creates a new payment transaction")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Payment created successfully",
            content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<PaymentResponse> createPayment(
            @Valid @RequestBody PaymentRequest request) {

        log.info("Received request to create payment for policy: {}", request.getPolicyNumber());

        try {
            PaymentResponse response = paymentService.createPayment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            log.error("Error creating payment", e);
            throw new PaymentProcessingException("Failed to create payment: " + e.getMessage(), e);
        }
    }

    /**
     * Get payment by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'BROKER')")
    @Operation(summary = "Get payment by ID", description = "Retrieves payment details by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment found",
            content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "404", description = "Payment not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<PaymentResponse> getPaymentById(@PathVariable UUID id) {
        log.debug("Fetching payment by ID: {}", id);

        PaymentResponse response = paymentService.getPaymentById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get payments by policy number
     */
    @GetMapping("/policy/{policyNumber}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'BROKER')")
    @Operation(summary = "Get payments by policy", description = "Retrieves all payments for a policy")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payments retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<List<PaymentResponse>> getPaymentsByPolicy(
            @PathVariable String policyNumber) {

        log.debug("Fetching payments for policy: {}", policyNumber);

        List<PaymentResponse> payments = paymentService.getPaymentsByPolicy(policyNumber);
        return ResponseEntity.ok(payments);
    }

    /**
     * Process a pending payment
     */
    @PostMapping("/{id}/process")
    @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")
    @Operation(summary = "Process payment", description = "Processes a pending payment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment processed successfully",
            content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid payment state"),
        @ApiResponse(responseCode = "404", description = "Payment not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<PaymentResponse> processPayment(@PathVariable UUID id) {
        log.info("Processing payment: {}", id);

        PaymentResponse response = paymentService.processPayment(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Refund a completed payment
     */
    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    @Operation(summary = "Refund payment", description = "Refunds a completed payment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment refunded successfully",
            content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid refund request"),
        @ApiResponse(responseCode = "404", description = "Payment not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<PaymentResponse> refundPayment(
            @PathVariable UUID id,
            @Valid @RequestBody RefundRequest request) {

        log.info("Refunding payment: {}", id);

        PaymentResponse response = paymentService.refundPayment(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Cancel a pending payment
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'BROKER')")
    @Operation(summary = "Cancel payment", description = "Cancels a pending payment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment cancelled successfully",
            content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid payment state"),
        @ApiResponse(responseCode = "404", description = "Payment not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<PaymentResponse> cancelPayment(@PathVariable UUID id) {
        log.info("Cancelling payment: {}", id);

        PaymentResponse response = paymentService.cancelPayment(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get PIX QR code for a payment
     */
    @GetMapping("/pix/{id}/qrcode")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'BROKER')")
    @Operation(summary = "Get PIX QR code", description = "Retrieves PIX QR code for payment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "QR code retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Payment not found or not PIX payment"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<Map<String, String>> getPixQrCode(@PathVariable UUID id) {
        log.debug("Fetching PIX QR code for payment: {}", id);

        PaymentResponse payment = paymentService.getPaymentById(id);

        if (payment.getPixQrCode() == null) {
            throw new InvalidPaymentStateException("Payment is not a PIX payment or QR code not available");
        }

        Map<String, String> response = new HashMap<>();
        response.put("qrCode", payment.getPixQrCode());
        response.put("qrCodeBase64", payment.getPixQrCodeBase64());
        response.put("expiration", payment.getPixExpiration() != null
            ? payment.getPixExpiration().toString() : null);

        return ResponseEntity.ok(response);
    }

    /**
     * Get Boleto PDF URL
     */
    @GetMapping("/boleto/{id}/pdf")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'BROKER')")
    @Operation(summary = "Get Boleto PDF", description = "Retrieves Boleto PDF URL for payment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Boleto PDF URL retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Payment not found or not Boleto payment"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<Map<String, String>> getBoletoPdf(@PathVariable UUID id) {
        log.debug("Fetching Boleto PDF for payment: {}", id);

        PaymentResponse payment = paymentService.getPaymentById(id);

        if (payment.getBoletoUrl() == null) {
            throw new InvalidPaymentStateException("Payment is not a Boleto payment or PDF not available");
        }

        Map<String, String> response = new HashMap<>();
        response.put("boletoUrl", payment.getBoletoUrl());
        response.put("barcode", payment.getBoletoBarcode());
        response.put("dueDate", payment.getBoletoDueDate() != null
            ? payment.getBoletoDueDate().toString() : null);

        return ResponseEntity.ok(response);
    }

    /**
     * Global exception handler for payment-related exceptions
     */
    @ExceptionHandler(PaymentNotFoundException.class)
    public ResponseEntity<Map<String, String>> handlePaymentNotFound(PaymentNotFoundException e) {
        log.warn("Payment not found: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Payment not found");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(InvalidPaymentStateException.class)
    public ResponseEntity<Map<String, String>> handleInvalidPaymentState(InvalidPaymentStateException e) {
        log.warn("Invalid payment state: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Invalid payment state");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(InvalidPaymentAmountException.class)
    public ResponseEntity<Map<String, String>> handleInvalidPaymentAmount(InvalidPaymentAmountException e) {
        log.warn("Invalid payment amount: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Invalid payment amount");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(PaymentProcessingException.class)
    public ResponseEntity<Map<String, String>> handlePaymentProcessingError(PaymentProcessingException e) {
        log.error("Payment processing error: {}", e.getMessage(), e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "Payment processing failed");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralError(Exception e) {
        log.error("Unexpected error", e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "Internal server error");
        error.put("message", "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
