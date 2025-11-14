import { UserRole } from '../../types/auth.types';
import {
  BRAZILIAN_STATES,
  BrazilianState,
  isUserRole,
  isBrazilianState,
  toUserRole,
  toBrazilianState,
  toUserRoleArray,
  toBrazilianStateArray,
  enumToArray,
  isUserRoleArray,
  isBrazilianStateArray
} from '../type-guards.utils';

describe('type-guards.utils', () => {
  describe('isUserRole', () => {
    it('should return true for valid UserRole values', () => {
      expect(isUserRole(UserRole.BENEFICIARY)).toBe(true);
      expect(isUserRole(UserRole.ADMIN)).toBe(true);
      expect(isUserRole(UserRole.BROKER)).toBe(true);
      expect(isUserRole(UserRole.HR)).toBe(true);
      expect(isUserRole(UserRole.UNDERWRITER)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isUserRole('INVALID_ROLE')).toBe(false);
      expect(isUserRole('admin')).toBe(false); // lowercase
      expect(isUserRole('')).toBe(false);
      expect(isUserRole(' ')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isUserRole('123')).toBe(false);
      expect(isUserRole('null')).toBe(false);
      expect(isUserRole('undefined')).toBe(false);
    });
  });

  describe('isBrazilianState', () => {
    it('should return true for all valid state codes', () => {
      BRAZILIAN_STATES.forEach(state => {
        expect(isBrazilianState(state)).toBe(true);
      });
    });

    it('should return false for invalid state codes', () => {
      expect(isBrazilianState('XX')).toBe(false);
      expect(isBrazilianState('sp')).toBe(false); // lowercase
      expect(isBrazilianState('SPX')).toBe(false); // too long
      expect(isBrazilianState('S')).toBe(false); // too short
      expect(isBrazilianState('')).toBe(false);
    });

    it('should validate specific valid states', () => {
      expect(isBrazilianState('SP')).toBe(true);
      expect(isBrazilianState('RJ')).toBe(true);
      expect(isBrazilianState('MG')).toBe(true);
      expect(isBrazilianState('BA')).toBe(true);
    });
  });

  describe('toUserRole', () => {
    it('should convert valid strings to UserRole', () => {
      expect(toUserRole(UserRole.BENEFICIARY)).toBe(UserRole.BENEFICIARY);
      expect(toUserRole(UserRole.ADMIN)).toBe(UserRole.ADMIN);
      expect(toUserRole(UserRole.BROKER)).toBe(UserRole.BROKER);
    });

    it('should return null for invalid strings', () => {
      expect(toUserRole('INVALID_ROLE')).toBeNull();
      expect(toUserRole('admin')).toBeNull();
      expect(toUserRole('')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(toUserRole('123')).toBeNull();
      expect(toUserRole('null')).toBeNull();
      expect(toUserRole('undefined')).toBeNull();
    });
  });

  describe('toBrazilianState', () => {
    it('should convert valid strings to BrazilianState', () => {
      expect(toBrazilianState('SP')).toBe('SP');
      expect(toBrazilianState('RJ')).toBe('RJ');
      expect(toBrazilianState('MG')).toBe('MG');
    });

    it('should return null for invalid strings', () => {
      expect(toBrazilianState('XX')).toBeNull();
      expect(toBrazilianState('sp')).toBeNull();
      expect(toBrazilianState('')).toBeNull();
    });

    it('should handle all valid states', () => {
      BRAZILIAN_STATES.forEach(state => {
        expect(toBrazilianState(state)).toBe(state);
      });
    });
  });

  describe('toUserRoleArray', () => {
    it('should convert array of valid strings to UserRole array', () => {
      const input = [UserRole.BENEFICIARY, UserRole.ADMIN, UserRole.BROKER];
      const result = toUserRoleArray(input);

      expect(result).toHaveLength(3);
      expect(result).toContain(UserRole.BENEFICIARY);
      expect(result).toContain(UserRole.ADMIN);
      expect(result).toContain(UserRole.BROKER);
    });

    it('should filter out invalid values', () => {
      const input = [UserRole.BENEFICIARY, 'INVALID', UserRole.ADMIN, ''];
      const result = toUserRoleArray(input);

      expect(result).toHaveLength(2);
      expect(result).toContain(UserRole.BENEFICIARY);
      expect(result).toContain(UserRole.ADMIN);
      expect(result).not.toContain('INVALID');
    });

    it('should return empty array for all invalid values', () => {
      const input = ['INVALID', 'WRONG', 'BAD'];
      const result = toUserRoleArray(input);

      expect(result).toHaveLength(0);
    });

    it('should handle empty array', () => {
      const result = toUserRoleArray([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('toBrazilianStateArray', () => {
    it('should convert array of valid strings to BrazilianState array', () => {
      const input = ['SP', 'RJ', 'MG'];
      const result = toBrazilianStateArray(input);

      expect(result).toHaveLength(3);
      expect(result).toContain('SP');
      expect(result).toContain('RJ');
      expect(result).toContain('MG');
    });

    it('should filter out invalid values', () => {
      const input = ['SP', 'XX', 'RJ', 'invalid'];
      const result = toBrazilianStateArray(input);

      expect(result).toHaveLength(2);
      expect(result).toContain('SP');
      expect(result).toContain('RJ');
      expect(result).not.toContain('XX');
    });

    it('should return empty array for all invalid values', () => {
      const input = ['XX', 'YY', 'ZZ'];
      const result = toBrazilianStateArray(input);

      expect(result).toHaveLength(0);
    });

    it('should handle all valid states', () => {
      const result = toBrazilianStateArray([...BRAZILIAN_STATES]);
      expect(result).toHaveLength(BRAZILIAN_STATES.length);
    });

    it('should handle empty array', () => {
      const result = toBrazilianStateArray([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('enumToArray', () => {
    it('should convert UserRole enum to array', () => {
      const result = enumToArray(UserRole);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain(UserRole.BENEFICIARY);
      expect(result).toContain(UserRole.ADMIN);
    });

    it('should work with custom enums', () => {
      enum TestEnum {
        VALUE1 = 'value1',
        VALUE2 = 'value2',
        VALUE3 = 'value3'
      }

      const result = enumToArray(TestEnum);

      expect(result).toHaveLength(3);
      expect(result).toContain('value1');
      expect(result).toContain('value2');
      expect(result).toContain('value3');
    });
  });

  describe('isUserRoleArray', () => {
    it('should return true for valid UserRole arrays', () => {
      const validArray = [UserRole.BENEFICIARY, UserRole.ADMIN];
      expect(isUserRoleArray(validArray)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isUserRoleArray([])).toBe(true);
    });

    it('should return false for arrays with invalid values', () => {
      const invalidArray = [UserRole.BENEFICIARY, 'INVALID'];
      expect(isUserRoleArray(invalidArray)).toBe(false);
    });

    it('should return false for arrays with mixed valid/invalid values', () => {
      const mixedArray = [UserRole.ADMIN, UserRole.BROKER, 'WRONG'];
      expect(isUserRoleArray(mixedArray)).toBe(false);
    });

    it('should return false for arrays with non-string values', () => {
      const numberArray = [1, 2, 3];
      expect(isUserRoleArray(numberArray)).toBe(false);
    });

    it('should return false for all invalid values', () => {
      const allInvalid = ['INVALID1', 'INVALID2'];
      expect(isUserRoleArray(allInvalid)).toBe(false);
    });
  });

  describe('isBrazilianStateArray', () => {
    it('should return true for valid BrazilianState arrays', () => {
      const validArray: BrazilianState[] = ['SP', 'RJ', 'MG'];
      expect(isBrazilianStateArray(validArray)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isBrazilianStateArray([])).toBe(true);
    });

    it('should return false for arrays with invalid values', () => {
      const invalidArray = ['SP', 'XX'];
      expect(isBrazilianStateArray(invalidArray)).toBe(false);
    });

    it('should return false for arrays with lowercase states', () => {
      const lowercaseArray = ['sp', 'rj'];
      expect(isBrazilianStateArray(lowercaseArray)).toBe(false);
    });

    it('should return false for arrays with non-string values', () => {
      const numberArray = [1, 2, 3];
      expect(isBrazilianStateArray(numberArray)).toBe(false);
    });

    it('should return true for all valid states', () => {
      expect(isBrazilianStateArray([...BRAZILIAN_STATES])).toBe(true);
    });
  });

  describe('BRAZILIAN_STATES constant', () => {
    it('should contain all 27 Brazilian states', () => {
      expect(BRAZILIAN_STATES).toHaveLength(27);
    });

    it('should include all expected states', () => {
      const expectedStates = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
      ];

      expectedStates.forEach(state => {
        expect(BRAZILIAN_STATES).toContain(state as any);
      });
    });

    it('should not contain duplicate values', () => {
      const uniqueStates = [...new Set(BRAZILIAN_STATES)];
      expect(uniqueStates).toHaveLength(BRAZILIAN_STATES.length);
    });
  });
});
