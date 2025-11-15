/**
 * Form Utils Tests
 * Test coverage for form utility functions
 */

import { formatFormErrors, transformFormData, getFieldError } from '../form.utils';
import { z } from 'zod';

describe('Form Utils', () => {
  describe('formatFormErrors', () => {
    it('should format Zod validation errors', () => {
      const schema = z.object({
        email: z.string().email('Email inválido'),
        name: z.string().min(3, 'Nome muito curto')
      });

      try {
        schema.parse({ email: 'invalid', name: 'ab' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatFormErrors(error);

          expect(formatted).toHaveProperty('email');
          expect(formatted).toHaveProperty('name');
          expect(formatted.email).toContain('Erro:');
        }
      }
    });

    it('should format API errors', () => {
      const apiError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          email: 'Email already exists',
          phone: 'Invalid phone number'
        },
        timestamp: new Date().toISOString(),
        requestId: 'req-123',
        path: '/api/users'
      };

      const formatted = formatFormErrors(apiError);

      expect(formatted.email).toContain('Erro:');
      expect(formatted.email).toContain('Email already exists');
      expect(formatted.phone).toContain('Invalid phone number');
    });

    it('should handle nested field paths', () => {
      const schema = z.object({
        address: z.object({
          street: z.string().min(5, 'Rua inválida')
        })
      });

      try {
        schema.parse({ address: { street: 'abc' } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatFormErrors(error);

          expect(formatted['address.street']).toBeDefined();
        }
      }
    });
  });

  describe('transformFormData', () => {
    it('should transform numeric fields by removing formatting', () => {
      const formData = {
        cpf: '123.456.789-00',
        phone: '(11) 99999-9999',
        zipCode: '12345-678',
        age: 25
      };

      const transformed = transformFormData(formData);

      expect(transformed.cpf).toBe('12345678900');
      expect(transformed.phone).toBe('11999999999');
      expect(transformed.zipCode).toBe('12345678');
    });

    it('should convert dateOfBirth to ISO format', () => {
      const formData = {
        dateOfBirth: new Date('1990-01-01')
      };

      const transformed = transformFormData(formData);

      expect(transformed.dateOfBirth).toContain('1990-01-01');
      expect(transformed.dateOfBirth).toContain('T');
    });

    it('should trim string values', () => {
      const formData = {
        name: '  John Doe  ',
        email: '  test@example.com  '
      };

      const transformed = transformFormData(formData);

      expect(transformed.name).toBe('John Doe');
      expect(transformed.email).toBe('test@example.com');
    });

    it('should skip null and undefined values', () => {
      const formData = {
        name: 'John',
        middleName: null,
        nickname: undefined,
        age: 25
      };

      const transformed = transformFormData(formData);

      expect(transformed.name).toBe('John');
      expect(transformed).not.toHaveProperty('middleName');
      expect(transformed).not.toHaveProperty('nickname');
      expect(transformed.age).toBe('25');
    });

    it('should handle array values', () => {
      const formData = {
        tags: ['  tag1  ', '  tag2  '],
        numbers: [1, 2, 3]
      };

      const transformed = transformFormData(formData);

      expect(transformed.tags).toEqual(['tag1', 'tag2']);
      expect(transformed.numbers).toEqual([1, 2, 3]);
    });

    it('should preserve non-string, non-numeric values', () => {
      const formData = {
        active: true,
        count: 42,
        data: { nested: 'value' }
      };

      const transformed = transformFormData(formData);

      expect(transformed.active).toBe(true);
      expect(transformed.data).toEqual({ nested: 'value' });
    });
  });

  describe('getFieldError', () => {
    it('should return error message for existing field', () => {
      const errors = {
        email: 'Erro: Email inválido',
        password: 'Erro: Senha muito curta'
      };

      const emailError = getFieldError('email', errors);

      expect(emailError).toBeDefined();
    });

    it('should return undefined for non-existent field', () => {
      const errors = {
        email: 'Erro: Email inválido'
      };

      const nameError = getFieldError('name', errors);

      expect(nameError).toBeUndefined();
    });

    it('should return undefined for empty errors object', () => {
      const errors = {};

      const error = getFieldError('email', errors);

      expect(error).toBeUndefined();
    });
  });
});
