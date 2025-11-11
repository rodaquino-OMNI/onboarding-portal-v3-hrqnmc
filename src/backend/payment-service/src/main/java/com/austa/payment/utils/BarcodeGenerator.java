package com.austa.payment.utils;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

/**
 * Barcode Generator for Boleto Bancário (Brazilian Bank Slip)
 *
 * Generates:
 * - 44-digit barcode for processing
 * - 48-digit typeable line for manual entry
 * - Calculates check digits according to FEBRABAN standards
 *
 * Brazilian Banking Standards (FEBRABAN):
 * https://portal.febraban.org.br/pagina/3053/33/pt-br/barcode
 *
 * @author AUSTA SuperApp
 * @version 1.0
 */
@Component
public class BarcodeGenerator {

    // Bank code for AUSTA (simulated - would be real bank code in production)
    private static final String BANK_CODE = "237"; // Bradesco for example

    // Currency code (9 = BRL)
    private static final String CURRENCY_CODE = "9";

    // Base date for boleto calculation (October 7, 1997)
    private static final LocalDate BASE_DATE = LocalDate.of(1997, 10, 7);

    /**
     * Generate complete boleto barcode (44 digits)
     *
     * Format: AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
     *
     * Where:
     * AAA = Bank code (3 digits)
     * B = Currency code (1 digit, always 9 for BRL)
     * C.CCCC = Free field part 1 (5 digits)
     * X = Check digit for field 1
     * DDDDD.DDDDD = Free field part 2 (10 digits)
     * Y = Check digit for field 2
     * EEEEE.EEEEE = Free field part 3 (10 digits)
     * Z = Check digit for field 3
     * K = General check digit (module 11)
     * UUUU = Due date factor (days since 10/07/1997)
     * VVVVVVVVVV = Amount in centavos (10 digits)
     *
     * @param amount Payment amount in BRL
     * @param dueDate Due date
     * @param documentNumber Customer document number
     * @return 44-digit barcode
     */
    public String generateBarcode(Double amount, LocalDate dueDate, String documentNumber) {
        StringBuilder barcode = new StringBuilder();

        // Position 1-3: Bank code
        barcode.append(BANK_CODE);

        // Position 4: Currency code
        barcode.append(CURRENCY_CODE);

        // Position 5: General check digit (calculated later)
        barcode.append("0"); // Placeholder

        // Position 6-9: Due date factor
        String dueDateFactor = calculateDueDateFactor(dueDate);
        barcode.append(dueDateFactor);

        // Position 10-19: Amount (10 digits, in centavos)
        String amountStr = formatAmount(amount);
        barcode.append(amountStr);

        // Position 20-44: Free field (25 digits)
        String freeField = generateFreeField(documentNumber);
        barcode.append(freeField);

        // Calculate and insert general check digit at position 5
        char checkDigit = calculateModulo11(barcode.toString().replace("0", ""), 4);
        barcode.setCharAt(4, checkDigit);

        return barcode.toString();
    }

    /**
     * Generate typeable line (linha digitável) from barcode
     *
     * Format: AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
     *
     * @param barcode 44-digit barcode
     * @return 48-digit typeable line with formatting
     */
    public String generateTypeableLine(String barcode) {
        StringBuilder line = new StringBuilder();

        // Field 1: Bank code + currency + first 5 digits of free field
        String field1 = barcode.substring(0, 4) + barcode.substring(19, 24);
        char checkDigit1 = calculateModulo10(field1);
        line.append(formatField(field1.substring(0, 5) + checkDigit1, 5, 1));
        line.append(" ");

        // Field 2: Next 10 digits of free field
        String field2 = barcode.substring(24, 34);
        char checkDigit2 = calculateModulo10(field2);
        line.append(formatField(field2 + checkDigit2, 5, 6));
        line.append(" ");

        // Field 3: Last 10 digits of free field
        String field3 = barcode.substring(34, 44);
        char checkDigit3 = calculateModulo10(field3);
        line.append(formatField(field3 + checkDigit3, 5, 6));
        line.append(" ");

        // Field 4: General check digit
        line.append(barcode.charAt(4));
        line.append(" ");

        // Field 5: Due date factor + amount
        line.append(barcode.substring(5, 9)); // Due date factor
        line.append(barcode.substring(9, 19)); // Amount

        return line.toString();
    }

    /**
     * Calculate due date factor
     * Number of days between base date (10/07/1997) and due date
     *
     * @param dueDate Due date
     * @return 4-digit due date factor
     */
    private String calculateDueDateFactor(LocalDate dueDate) {
        long daysBetween = ChronoUnit.DAYS.between(BASE_DATE, dueDate);
        return String.format("%04d", daysBetween);
    }

    /**
     * Format amount to 10 digits (in centavos)
     *
     * @param amount Amount in BRL
     * @return 10-digit amount string
     */
    private String formatAmount(Double amount) {
        long centavos = Math.round(amount * 100);
        return String.format("%010d", centavos);
    }

    /**
     * Generate free field (25 digits)
     * Contains bank-specific information
     *
     * @param documentNumber Customer document number
     * @return 25-digit free field
     */
    private String generateFreeField(String documentNumber) {
        StringBuilder freeField = new StringBuilder();

        // Agency code (4 digits)
        freeField.append("0001");

        // Account number (8 digits)
        freeField.append("00012345");

        // Wallet code (2 digits) - 09 = simple collection
        freeField.append("09");

        // Document number (11 digits) - sequential number
        String docNumber = documentNumber.replaceAll("[^0-9]", "");
        if (docNumber.length() > 11) {
            docNumber = docNumber.substring(0, 11);
        }
        freeField.append(String.format("%011d", Long.parseLong(docNumber)));

        // Ensure 25 digits
        while (freeField.length() < 25) {
            freeField.append("0");
        }

        return freeField.substring(0, 25);
    }

    /**
     * Calculate check digit using Modulo 10
     * Used for typeable line fields
     *
     * @param field Field to calculate
     * @return Check digit character
     */
    private char calculateModulo10(String field) {
        int sum = 0;
        int multiplier = 2;

        // Process from right to left
        for (int i = field.length() - 1; i >= 0; i--) {
            int digit = Character.getNumericValue(field.charAt(i));
            int product = digit * multiplier;

            // If product > 9, sum the digits
            sum += (product > 9) ? (product / 10 + product % 10) : product;

            // Alternate multiplier between 2 and 1
            multiplier = (multiplier == 2) ? 1 : 2;
        }

        int remainder = sum % 10;
        int checkDigit = (remainder == 0) ? 0 : (10 - remainder);

        return Character.forDigit(checkDigit, 10);
    }

    /**
     * Calculate check digit using Modulo 11
     * Used for general barcode check digit
     *
     * @param field Field to calculate
     * @param position Starting position for calculation
     * @return Check digit character
     */
    private char calculateModulo11(String field, int position) {
        int sum = 0;
        int multiplier = 2;

        // Process from right to left
        for (int i = field.length() - 1; i >= 0; i--) {
            int digit = Character.getNumericValue(field.charAt(i));
            sum += digit * multiplier;

            multiplier++;
            if (multiplier > 9) {
                multiplier = 2;
            }
        }

        int remainder = sum % 11;
        int checkDigit = 11 - remainder;

        // Special cases for modulo 11
        if (checkDigit == 0 || checkDigit == 10 || checkDigit == 11) {
            checkDigit = 1;
        }

        return Character.forDigit(checkDigit, 10);
    }

    /**
     * Format field with periods for display
     *
     * @param field Field to format
     * @param groupSize Size of each group
     * @param startIndex Starting index
     * @return Formatted field
     */
    private String formatField(String field, int groupSize, int startIndex) {
        StringBuilder formatted = new StringBuilder();

        for (int i = 0; i < field.length(); i++) {
            if (i == groupSize) {
                formatted.append(".");
            }
            formatted.append(field.charAt(i));
        }

        return formatted.toString();
    }

    /**
     * Validate barcode check digit
     *
     * @param barcode 44-digit barcode
     * @return true if valid
     */
    public boolean validateBarcode(String barcode) {
        if (barcode == null || barcode.length() != 44) {
            return false;
        }

        char providedCheckDigit = barcode.charAt(4);
        String barcodeWithoutCheck = barcode.substring(0, 4) + "0" + barcode.substring(5);
        char calculatedCheckDigit = calculateModulo11(barcodeWithoutCheck.replace("0", ""), 4);

        return providedCheckDigit == calculatedCheckDigit;
    }
}
