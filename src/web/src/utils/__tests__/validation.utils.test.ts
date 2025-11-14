import {
  validateCPF,
  validatePhone,
  validateEmail,
  sanitizeInput,
  validateAddress,
  validateHealthData
} from '../validation.utils';

describe('validation.utils', () => {
  describe('validateCPF', () => {
    it('should validate a valid CPF', () => {
      const result = validateCPF('123.456.789-09');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid CPF with wrong checksum', () => {
      const result = validateCPF('123.456.789-00');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject CPF with all same digits', () => {
      const result = validateCPF('111.111.111-11');
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('VAL002');
    });

    it('should reject CPF with wrong length', () => {
      const result = validateCPF('123.456');
      expect(result.isValid).toBe(false);
    });

    it('should handle CPF without formatting', () => {
      const result = validateCPF('12345678909');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty CPF', () => {
      const result = validateCPF('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate a valid Brazilian phone number', () => {
      const result = validatePhone('+55 (11) 98765-4321');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject phone number with invalid format', () => {
      const result = validatePhone('11987654321');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty phone number', () => {
      const result = validatePhone('');
      expect(result.isValid).toBe(false);
    });

    it('should reject phone with invalid area code', () => {
      const result = validatePhone('+55 (99) 98765-4321');
      expect(result.isValid).toBe(false);
    });

    it('should accept different valid area codes', () => {
      const result1 = validatePhone('+55 (11) 98765-4321');
      const result2 = validatePhone('+55 (21) 98765-4321');
      const result3 = validatePhone('+55 (85) 98765-4321');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate a valid email', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.isValid).toBe(false);
    });

    it('should reject email without @', () => {
      const result = validateEmail('userexample.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags from input', () => {
      const input = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should allow safe HTML tags', () => {
      const input = '<p>Hello World</p>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBeDefined();
    });

    it('should remove dangerous attributes', () => {
      const input = '<a onclick="alert()">Link</a>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('onclick');
    });

    it('should handle empty string', () => {
      const sanitized = sanitizeInput('');
      expect(sanitized).toBe('');
    });

    it('should handle plain text without changes', () => {
      const input = 'Hello World';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe(input);
    });

    it('should handle special characters', () => {
      const input = 'José & María < > " \'';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBeDefined();
      expect(sanitized.length).toBeGreaterThan(0);
    });
  });

  describe('validateAddress', () => {
    it('should validate a complete valid address', () => {
      const address = {
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Apto 101',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP' as const,
        zipCode: '01310-100'
      };
      const result = validateAddress(address);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate address without complement', () => {
      const address = {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ' as const,
        zipCode: '20000-000'
      };
      const result = validateAddress(address);
      expect(result.isValid).toBe(true);
    });

    it('should reject address with invalid state', () => {
      const address = {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'XX' as any,
        zipCode: '20000-000'
      };
      const result = validateAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('VAL008');
    });

    it('should reject address with invalid zipcode format', () => {
      const address = {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ' as const,
        zipCode: '12345'
      };
      const result = validateAddress(address);
      expect(result.isValid).toBe(false);
    });

    it('should reject address with missing required fields', () => {
      const address = {
        street: '',
        number: '123',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ' as const,
        zipCode: '20000-000'
      };
      const result = validateAddress(address);
      expect(result.isValid).toBe(false);
    });

    it('should accept all valid Brazilian states', () => {
      const states = ['SP', 'RJ', 'MG', 'BA', 'PR', 'RS', 'PE', 'CE', 'PA', 'SC'];

      states.forEach(state => {
        const address = {
          street: 'Rua Teste',
          number: '123',
          neighborhood: 'Centro',
          city: 'Cidade',
          state: state as any,
          zipCode: '00000-000'
        };
        const result = validateAddress(address);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateHealthData', () => {
    it('should validate health data', () => {
      const healthData = {
        hasPreexistingConditions: false,
        medications: [],
        allergies: []
      };
      const result = validateHealthData(healthData);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle health data with conditions', () => {
      const healthData = {
        hasPreexistingConditions: true,
        conditions: ['Diabetes'],
        medications: ['Metformin'],
        allergies: []
      };
      const result = validateHealthData(healthData);
      expect(result.isValid).toBe(true);
    });

    it('should handle empty health data object', () => {
      const result = validateHealthData({});
      expect(result.isValid).toBe(true);
    });

    it('should sanitize health data strings', () => {
      const healthData = {
        conditions: ['Diabetes <script>alert("xss")</script>'],
        medications: [],
        allergies: []
      };
      const result = validateHealthData(healthData);
      expect(result.isValid).toBe(true);
    });
  });
});
