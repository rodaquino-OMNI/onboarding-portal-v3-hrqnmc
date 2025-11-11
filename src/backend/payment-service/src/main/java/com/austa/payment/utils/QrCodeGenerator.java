package com.austa.payment.utils;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.CRC32;

/**
 * QR Code Generator for PIX Payments
 *
 * Generates PIX QR codes according to Brazilian Central Bank standards:
 * - EMV QR Code format (BR Code)
 * - Base64 encoded image
 * - Payment data encoding
 *
 * PIX Standard: https://www.bcb.gov.br/estabilidadefinanceira/pix
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
@Component
public class QrCodeGenerator {

    // EMV QR Code constants
    private static final String PAYLOAD_FORMAT_INDICATOR = "01"; // Fixed: "01"
    private static final String MERCHANT_ACCOUNT_INFORMATION = "26";
    private static final String MERCHANT_CATEGORY_CODE = "52"; // 0000 for general
    private static final String TRANSACTION_CURRENCY = "53"; // 986 = BRL
    private static final String TRANSACTION_AMOUNT = "54";
    private static final String COUNTRY_CODE = "58"; // BR
    private static final String MERCHANT_NAME = "59";
    private static final String MERCHANT_CITY = "60";
    private static final String ADDITIONAL_DATA = "62";
    private static final String CRC = "63";

    // PIX-specific constants
    private static final String PIX_GUI = "br.gov.bcb.pix";
    private static final int QR_CODE_SIZE = 300;

    /**
     * Generate PIX QR code image as Base64 string
     *
     * @param pixKey PIX key (CPF, CNPJ, email, phone, or random key)
     * @param amount Transaction amount
     * @param merchantName Merchant name
     * @param merchantCity Merchant city
     * @param transactionId Transaction identifier
     * @return Base64 encoded PNG image
     * @throws IOException if image generation fails
     * @throws WriterException if QR code generation fails
     */
    public String generateQrCodeImage(
            String pixKey,
            Double amount,
            String merchantName,
            String merchantCity,
            String transactionId) throws IOException, WriterException {

        // Generate EMV string (BR Code)
        String emvString = generateEmvString(pixKey, amount, merchantName, merchantCity, transactionId);

        // Generate QR code
        BufferedImage qrCodeImage = generateQrCodeFromString(emvString);

        // Convert to Base64
        return encodeImageToBase64(qrCodeImage);
    }

    /**
     * Generate EMV string (BR Code) for PIX payment
     *
     * Format follows EMV QR Code Specification for Payment Systems
     *
     * @param pixKey PIX key
     * @param amount Transaction amount
     * @param merchantName Merchant name
     * @param merchantCity Merchant city
     * @param transactionId Transaction identifier
     * @return EMV formatted string
     */
    public String generateEmvString(
            String pixKey,
            Double amount,
            String merchantName,
            String merchantCity,
            String transactionId) {

        StringBuilder emv = new StringBuilder();

        // 01: Payload Format Indicator
        emv.append(buildTLV(PAYLOAD_FORMAT_INDICATOR, "01"));

        // 26: Merchant Account Information (PIX)
        String pixData = buildPixAccountInformation(pixKey);
        emv.append(buildTLV(MERCHANT_ACCOUNT_INFORMATION, pixData));

        // 52: Merchant Category Code (0000 = generic)
        emv.append(buildTLV(MERCHANT_CATEGORY_CODE, "0000"));

        // 53: Transaction Currency (986 = BRL)
        emv.append(buildTLV(TRANSACTION_CURRENCY, "986"));

        // 54: Transaction Amount
        if (amount != null && amount > 0) {
            emv.append(buildTLV(TRANSACTION_AMOUNT, formatAmount(amount)));
        }

        // 58: Country Code
        emv.append(buildTLV(COUNTRY_CODE, "BR"));

        // 59: Merchant Name (max 25 characters)
        String truncatedName = truncateString(merchantName, 25);
        emv.append(buildTLV(MERCHANT_NAME, truncatedName));

        // 60: Merchant City (max 15 characters)
        String truncatedCity = truncateString(merchantCity, 15);
        emv.append(buildTLV(MERCHANT_CITY, truncatedCity));

        // 62: Additional Data Field
        if (transactionId != null && !transactionId.isEmpty()) {
            String additionalData = buildAdditionalData(transactionId);
            emv.append(buildTLV(ADDITIONAL_DATA, additionalData));
        }

        // 63: CRC (must be last field)
        String crcPlaceholder = buildTLV(CRC, "0000");
        emv.append(crcPlaceholder);

        // Calculate and replace CRC
        String crcValue = calculateCRC16(emv.toString());
        String finalEmv = emv.toString().replace("63040000", "6304" + crcValue);

        return finalEmv;
    }

    /**
     * Build PIX account information field
     *
     * @param pixKey PIX key
     * @return Formatted PIX account data
     */
    private String buildPixAccountInformation(String pixKey) {
        StringBuilder pix = new StringBuilder();

        // 00: GUI (Global Unique Identifier)
        pix.append(buildTLV("00", PIX_GUI));

        // 01: PIX Key
        pix.append(buildTLV("01", pixKey));

        return pix.toString();
    }

    /**
     * Build additional data field
     *
     * @param transactionId Transaction identifier
     * @return Formatted additional data
     */
    private String buildAdditionalData(String transactionId) {
        StringBuilder additional = new StringBuilder();

        // 05: Reference Label (Transaction ID)
        String truncatedId = truncateString(transactionId, 25);
        additional.append(buildTLV("05", truncatedId));

        return additional.toString();
    }

    /**
     * Build TLV (Tag-Length-Value) format
     *
     * @param tag Field tag
     * @param value Field value
     * @return TLV formatted string
     */
    private String buildTLV(String tag, String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }

        int length = value.length();
        String lengthStr = String.format("%02d", length);

        return tag + lengthStr + value;
    }

    /**
     * Format amount to EMV standard (no decimal separator)
     *
     * @param amount Amount in BRL
     * @return Formatted amount string
     */
    private String formatAmount(Double amount) {
        return String.format("%.2f", amount);
    }

    /**
     * Truncate string to maximum length
     *
     * @param str String to truncate
     * @param maxLength Maximum length
     * @return Truncated string
     */
    private String truncateString(String str, int maxLength) {
        if (str == null) {
            return "";
        }
        return str.length() > maxLength ? str.substring(0, maxLength) : str;
    }

    /**
     * Calculate CRC-16/CCITT-FALSE checksum
     *
     * @param data Data to calculate CRC for
     * @return 4-character hex CRC value
     */
    private String calculateCRC16(String data) {
        // Replace CRC placeholder with actual CRC calculation location
        String dataForCrc = data.substring(0, data.length() - 4);

        int crc = 0xFFFF;
        byte[] bytes = dataForCrc.getBytes(StandardCharsets.UTF_8);

        for (byte b : bytes) {
            crc ^= (b & 0xFF) << 8;

            for (int i = 0; i < 8; i++) {
                if ((crc & 0x8000) != 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc = crc << 1;
                }
            }
        }

        crc &= 0xFFFF;
        return String.format("%04X", crc);
    }

    /**
     * Generate QR code image from string
     *
     * @param content Content to encode
     * @return BufferedImage of QR code
     * @throws WriterException if QR code generation fails
     */
    private BufferedImage generateQrCodeFromString(String content) throws WriterException {
        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
        hints.put(EncodeHintType.MARGIN, 1);

        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(
                content,
                BarcodeFormat.QR_CODE,
                QR_CODE_SIZE,
                QR_CODE_SIZE,
                hints
        );

        return MatrixToImageWriter.toBufferedImage(bitMatrix);
    }

    /**
     * Encode BufferedImage to Base64 string
     *
     * @param image Image to encode
     * @return Base64 encoded PNG image
     * @throws IOException if encoding fails
     */
    private String encodeImageToBase64(BufferedImage image) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos);
        byte[] imageBytes = baos.toByteArray();
        return Base64.getEncoder().encodeToString(imageBytes);
    }

    /**
     * Validate EMV string checksum
     *
     * @param emvString EMV string to validate
     * @return true if valid
     */
    public boolean validateEmvString(String emvString) {
        if (emvString == null || emvString.length() < 4) {
            return false;
        }

        // Extract provided CRC (last 4 characters)
        String providedCrc = emvString.substring(emvString.length() - 4);

        // Calculate expected CRC
        String dataWithoutCrc = emvString.substring(0, emvString.length() - 4);
        String calculatedCrc = calculateCRC16(dataWithoutCrc + "0000");

        return providedCrc.equalsIgnoreCase(calculatedCrc);
    }
}
