import { format, parseISO, addDays, differenceInYears } from 'date-fns'; // v2.30.0
import { pt as ptBR } from 'date-fns/locale'; // v2.30.0
import { APP_CONFIG } from '../constants/app.constants';

// Default date format constants
const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';
const POLICY_DATE_FORMAT = 'dd "de" MMMM "de" yyyy';
const ADULT_AGE = 18;

// Error messages in Brazilian Portuguese
const ERROR_MESSAGES = {
  INVALID_DATE: 'Data inválida',
  INVALID_FORMAT: 'Formato de data inválido',
  FUTURE_BIRTHDATE: 'Data de nascimento não pode ser no futuro',
  INVALID_WAITING_PERIOD: 'Período de carência inválido',
  INVALID_AGE: 'Idade inválida',
} as const;

/**
 * Formats a date string or Date object to Brazilian format with validation
 * @param date - Date to format
 * @param formatStr - Optional format string (defaults to dd/MM/yyyy)
 * @returns Formatted date string in Brazilian format
 * @throws Error if date is invalid
 */
export const formatDate = (date: Date | string, formatStr: string = DEFAULT_DATE_FORMAT): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }
    return format(dateObj, formatStr, { locale: ptBR });
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.INVALID_FORMAT}: ${error.message}`);
  }
};

/**
 * Parses a date string from Brazilian format to Date object
 * @param dateStr - Date string in Brazilian format (dd/MM/yyyy)
 * @returns Parsed Date object
 * @throws Error if date string is invalid
 */
export const parseDate = (dateStr: string): Date => {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(dateRegex);
  
  if (!match) {
    throw new Error(ERROR_MESSAGES.INVALID_FORMAT);
  }

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getDate() !== Number(day) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getFullYear() !== Number(year) ||
    isNaN(date.getTime())
  ) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }

  return date;
};

/**
 * Calculates age in years from a birth date
 * @param birthDate - Birth date as Date object or string
 * @returns Age in years
 * @throws Error if birth date is invalid or in future
 */
export const calculateAge = (birthDate: Date | string): number => {
  const birthDateObj = typeof birthDate === 'string' ? parseDate(birthDate) : birthDate;
  
  if (!birthDateObj || isNaN(birthDateObj.getTime())) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }

  if (birthDateObj > new Date()) {
    throw new Error(ERROR_MESSAGES.FUTURE_BIRTHDATE);
  }

  const age = differenceInYears(new Date(), birthDateObj);
  
  if (age < 0 || age > 150) {
    throw new Error(ERROR_MESSAGES.INVALID_AGE);
  }

  return age;
};

/**
 * Calculates the end date of a waiting period
 * @param startDate - Start date of waiting period
 * @param waitingPeriodDays - Number of days in waiting period
 * @returns End date of waiting period
 * @throws Error if parameters are invalid
 */
export const calculateWaitingPeriod = (startDate: Date | string, waitingPeriodDays: number): Date => {
  if (!Number.isInteger(waitingPeriodDays) || waitingPeriodDays < 0) {
    throw new Error(ERROR_MESSAGES.INVALID_WAITING_PERIOD);
  }

  const startDateObj = typeof startDate === 'string' ? parseDate(startDate) : startDate;
  
  if (!startDateObj || isNaN(startDateObj.getTime())) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE);
  }

  return addDays(startDateObj, waitingPeriodDays);
};

/**
 * Checks if a person is an adult (18 years or older)
 * @param birthDate - Birth date to check
 * @returns Boolean indicating if person is adult
 * @throws Error if birth date is invalid
 */
export const isAdult = (birthDate: Date | string): boolean => {
  try {
    const age = calculateAge(birthDate);
    return age >= ADULT_AGE;
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.INVALID_DATE}: ${error.message}`);
  }
};

/**
 * Formats a date for policy display with full month name in Portuguese
 * @param date - Date to format
 * @returns Formatted policy date in Brazilian Portuguese
 * @throws Error if date is invalid
 */
export const formatPolicyDate = (date: Date | string): string => {
  try {
    return formatDate(date, POLICY_DATE_FORMAT);
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.INVALID_FORMAT}: ${error.message}`);
  }
};