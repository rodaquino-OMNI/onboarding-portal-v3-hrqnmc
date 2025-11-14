import {
  formatDate,
  parseDate,
  calculateAge,
  isAdult,
  formatPolicyDate,
  calculateWaitingPeriod
} from '../date.utils';

describe('date.utils', () => {
  describe('formatDate', () => {
    it('should format a Date object to Brazilian format', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const formatted = formatDate(date);
      expect(formatted).toBe('15/01/2024');
    });

    it('should format an ISO string to Brazilian format', () => {
      const isoDate = '2024-01-15T00:00:00.000Z';
      const formatted = formatDate(isoDate);
      expect(formatted).toMatch(/15\/01\/2024/);
    });

    it('should use custom format string', () => {
      const date = new Date(2024, 0, 15);
      const formatted = formatDate(date, 'yyyy-MM-dd');
      expect(formatted).toBe('2024-01-15');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDate('invalid-date')).toThrow();
    });

    it('should handle different months', () => {
      const dates = [
        new Date(2024, 0, 15),  // January
        new Date(2024, 5, 15),  // June
        new Date(2024, 11, 15)  // December
      ];

      dates.forEach(date => {
        const formatted = formatDate(date);
        expect(formatted).toMatch(/\d{2}\/\d{2}\/2024/);
      });
    });
  });

  describe('parseDate', () => {
    it('should parse valid Brazilian date format', () => {
      const parsed = parseDate('15/01/2024');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getMonth()).toBe(0); // January is 0
      expect(parsed.getFullYear()).toBe(2024);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseDate('2024-01-15')).toThrow();
      expect(() => parseDate('15-01-2024')).toThrow();
      expect(() => parseDate('invalid')).toThrow();
    });

    it('should throw error for invalid date values', () => {
      expect(() => parseDate('32/01/2024')).toThrow(); // Invalid day
      expect(() => parseDate('15/13/2024')).toThrow(); // Invalid month
      expect(() => parseDate('29/02/2023')).toThrow(); // Invalid leap year
    });

    it('should handle leap years correctly', () => {
      const leapDate = parseDate('29/02/2024');
      expect(leapDate).toBeInstanceOf(Date);
      expect(leapDate.getDate()).toBe(29);
      expect(leapDate.getMonth()).toBe(1); // February
    });

    it('should throw error for empty string', () => {
      expect(() => parseDate('')).toThrow();
    });
  });

  describe('calculateAge', () => {
    it('should calculate age from Date object', () => {
      const birthDate = new Date(2000, 0, 1); // January 1, 2000
      const age = calculateAge(birthDate);
      expect(age).toBeGreaterThanOrEqual(23); // Will be 24 or 25 depending on current date
      expect(age).toBeLessThan(30);
    });

    it('should calculate age from Brazilian date string', () => {
      const age = calculateAge('01/01/2000');
      expect(age).toBeGreaterThanOrEqual(23);
      expect(age).toBeLessThan(30);
    });

    it('should throw error for future birth date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(() => calculateAge(futureDate)).toThrow();
    });

    it('should return 0 for birth date this year', () => {
      const thisYear = new Date();
      thisYear.setMonth(thisYear.getMonth() - 6); // 6 months ago
      const age = calculateAge(thisYear);
      expect(age).toBe(0);
    });

    it('should calculate correct age for different birth dates', () => {
      const birthDates = [
        { date: '01/01/1990', minAge: 33, maxAge: 35 },
        { date: '15/06/1985', minAge: 38, maxAge: 40 },
        { date: '31/12/2010', minAge: 13, maxAge: 15 }
      ];

      birthDates.forEach(({ date, minAge, maxAge }) => {
        const age = calculateAge(date);
        expect(age).toBeGreaterThanOrEqual(minAge);
        expect(age).toBeLessThan(maxAge);
      });
    });
  });

  describe('isAdult', () => {
    it('should return true for adults (18+)', () => {
      const adultDate = new Date();
      adultDate.setFullYear(adultDate.getFullYear() - 20);
      expect(isAdult(adultDate)).toBe(true);
    });

    it('should return false for minors', () => {
      const minorDate = new Date();
      minorDate.setFullYear(minorDate.getFullYear() - 15);
      expect(isAdult(minorDate)).toBe(false);
    });

    it('should return true for exactly 18 years old', () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 18);
      date.setDate(date.getDate() - 1); // Ensure they're past their birthday
      expect(isAdult(date)).toBe(true);
    });

    it('should accept Brazilian date string format', () => {
      expect(isAdult('01/01/1990')).toBe(true);
      expect(isAdult('01/01/2010')).toBe(false);
    });
  });

  describe('formatPolicyDate', () => {
    it('should format date with full month name in Portuguese', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const formatted = formatPolicyDate(date);
      expect(formatted).toContain('janeiro');
      expect(formatted).toContain('2024');
    });

    it('should format different months correctly', () => {
      const months = [
        { date: new Date(2024, 0, 15), month: 'janeiro' },
        { date: new Date(2024, 5, 15), month: 'junho' },
        { date: new Date(2024, 11, 15), month: 'dezembro' }
      ];

      months.forEach(({ date, month }) => {
        const formatted = formatPolicyDate(date);
        expect(formatted.toLowerCase()).toContain(month);
      });
    });

    it('should accept ISO date string', () => {
      const formatted = formatPolicyDate('2024-01-15T00:00:00.000Z');
      expect(formatted).toContain('janeiro');
      expect(formatted).toContain('2024');
    });
  });

  describe('calculateWaitingPeriodEnd', () => {
    it('should calculate end date for waiting period in days', () => {
      const startDate = new Date(2024, 0, 1); // January 1, 2024
      const endDate = calculateWaitingPeriodEnd(startDate, 30);

      expect(endDate).toBeInstanceOf(Date);
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it('should add correct number of days', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = calculateWaitingPeriodEnd(startDate, 30);

      const daysDifference = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDifference).toBe(30);
    });

    it('should handle zero days waiting period', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = calculateWaitingPeriodEnd(startDate, 0);

      expect(endDate.getTime()).toBe(startDate.getTime());
    });

    it('should accept Brazilian date string', () => {
      const endDate = calculateWaitingPeriodEnd('01/01/2024', 30);
      expect(endDate).toBeInstanceOf(Date);
    });

    it('should throw error for negative waiting period', () => {
      const startDate = new Date(2024, 0, 1);
      expect(() => calculateWaitingPeriodEnd(startDate, -10)).toThrow();
    });

    it('should handle different waiting periods', () => {
      const startDate = new Date(2024, 0, 1);

      const periods = [0, 1, 7, 30, 90, 180, 365];
      periods.forEach(days => {
        const endDate = calculateWaitingPeriodEnd(startDate, days);
        const diff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        expect(diff).toBe(days);
      });
    });
  });
});
