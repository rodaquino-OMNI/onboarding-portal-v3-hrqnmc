import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  LoginDto,
  RegisterDto,
  MfaVerificationDto,
  PasswordResetDto,
  validateLoginRequest,
  validateRegistrationRequest,
  validateMfaRequest,
  validatePasswordResetRequest
} from '../../validators/auth.validator';
import { UserRole } from '../../models/user.model';

describe('Auth Validators', () => {
  describe('validateLoginRequest', () => {
    let validLoginData: LoginDto;

    beforeEach(() => {
      validLoginData = {
        email: 'test@example.com',
        password: 'Password123!@#',
        ipAddress: '192.168.1.1',
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        rememberMe: false
      };
    });

    it('should validate correct login data', async () => {
      const result = await validateLoginRequest(validLoginData);

      expect(typeof result).toBe('boolean');
    });

    it('should reject invalid email format', async () => {
      validLoginData.email = 'invalid-email';

      const result = await validateLoginRequest(validLoginData);

      expect(result).toBe(false);
    });

    it('should reject email without @ symbol', async () => {
      validLoginData.email = 'testexample.com';

      const result = await validateLoginRequest(validLoginData);

      expect(result).toBe(false);
    });

    it('should reject email without domain', async () => {
      validLoginData.email = 'test@';

      const result = await validateLoginRequest(validLoginData);

      expect(result).toBe(false);
    });

    it('should reject invalid device ID format', async () => {
      validLoginData.deviceId = 'invalid-device-id';

      const result = await validateLoginRequest(validLoginData);

      expect(result).toBe(false);
    });

    it('should reject invalid IP address format', async () => {
      validLoginData.ipAddress = '999.999.999.999';

      const result = await validateLoginRequest(validLoginData);

      expect(result).toBe(false);
    });

    it('should accept valid IPv4 addresses', async () => {
      const validIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '127.0.0.1'];

      for (const ip of validIPs) {
        validLoginData.ipAddress = ip;
        const result = await validateLoginRequest(validLoginData);
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('validateRegistrationRequest', () => {
    let validRegisterData: RegisterDto;

    beforeEach(() => {
      validRegisterData = {
        email: 'test@example.com',
        password: 'Password123!@#',
        confirmPassword: 'Password123!@#',
        firstName: 'John',
        lastName: 'Doe',
        cpf: '123.456.789-09',
        phoneNumber: '+5511999999999',
        role: UserRole.BENEFICIARY,
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        securityQuestions: {
          question1: 'answer1',
          question2: 'answer2',
          question3: 'answer3'
        }
      };
    });

    it('should validate correct registration data', async () => {
      const result = await validateRegistrationRequest(validRegisterData);

      expect(typeof result).toBe('boolean');
    });

    it('should reject password mismatch', async () => {
      validRegisterData.confirmPassword = 'DifferentPassword123!';

      const result = await validateRegistrationRequest(validRegisterData);

      expect(result).toBe(false);
    });

    it('should reject invalid CPF format', async () => {
      validRegisterData.cpf = '000.000.000-00';

      const result = await validateRegistrationRequest(validRegisterData);

      expect(result).toBe(false);
    });

    it('should reject CPF with all same digits', async () => {
      validRegisterData.cpf = '111.111.111-11';

      const result = await validateRegistrationRequest(validRegisterData);

      expect(result).toBe(false);
    });

    it('should reject invalid phone number format', async () => {
      validRegisterData.phoneNumber = '1234567890';

      const result = await validateRegistrationRequest(validRegisterData);

      expect(result).toBe(false);
    });

    it('should reject beneficiary without security questions', async () => {
      validRegisterData.role = UserRole.BENEFICIARY;
      validRegisterData.securityQuestions = {};

      const result = await validateRegistrationRequest(validRegisterData);

      expect(result).toBe(false);
    });

    it('should reject beneficiary with insufficient security questions', async () => {
      validRegisterData.role = UserRole.BENEFICIARY;
      validRegisterData.securityQuestions = {
        question1: 'answer1'
      };

      const result = await validateRegistrationRequest(validRegisterData);

      expect(result).toBe(false);
    });

    it('should accept parent guardian with security questions', async () => {
      validRegisterData.role = UserRole.PARENT_GUARDIAN;
      validRegisterData.securityQuestions = {
        question1: 'answer1',
        question2: 'answer2',
        question3: 'answer3'
      };

      const result = await validateRegistrationRequest(validRegisterData);

      expect(typeof result).toBe('boolean');
    });

    it('should accept other roles without security questions', async () => {
      validRegisterData.role = UserRole.BROKER;
      delete validRegisterData.securityQuestions;

      const result = await validateRegistrationRequest(validRegisterData);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('validateMfaRequest', () => {
    let validMfaData: MfaVerificationDto;

    beforeEach(() => {
      validMfaData = {
        token: '123456',
        method: 'totp',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        deviceId: '550e8400-e29b-41d4-a716-446655440000'
      };
    });

    it('should validate correct MFA data', async () => {
      const result = await validateMfaRequest(validMfaData);

      expect(typeof result).toBe('boolean');
    });

    it('should reject expired MFA token', async () => {
      validMfaData.timestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago

      const result = await validateMfaRequest(validMfaData);

      expect(result).toBe(false);
    });

    it('should reject invalid TOTP token format', async () => {
      validMfaData.method = 'totp';
      validMfaData.token = 'abc123'; // Not all digits

      const result = await validateMfaRequest(validMfaData);

      expect(result).toBe(false);
    });

    it('should reject invalid session ID format', async () => {
      validMfaData.sessionId = 'invalid-session-id';

      const result = await validateMfaRequest(validMfaData);

      expect(result).toBe(false);
    });

    it('should validate SMS method', async () => {
      validMfaData.method = 'sms';
      validMfaData.token = '123456';

      const result = await validateMfaRequest(validMfaData);

      expect(typeof result).toBe('boolean');
    });

    it('should handle fresh tokens correctly', async () => {
      validMfaData.timestamp = Date.now() - 1000; // 1 second ago

      const result = await validateMfaRequest(validMfaData);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('validatePasswordResetRequest', () => {
    let validResetData: PasswordResetDto;

    beforeEach(() => {
      validResetData = {
        email: 'test@example.com',
        token: 'a'.repeat(32), // 32 hex characters
        newPassword: 'NewPassword123!@#',
        confirmPassword: 'NewPassword123!@#',
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now()
      };
    });

    it('should validate correct password reset data', async () => {
      const result = await validatePasswordResetRequest(validResetData);

      expect(typeof result).toBe('boolean');
    });

    it('should reject password mismatch', async () => {
      validResetData.confirmPassword = 'DifferentPassword123!';

      const result = await validatePasswordResetRequest(validResetData);

      expect(result).toBe(false);
    });

    it('should reject expired reset token', async () => {
      validResetData.timestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago

      const result = await validatePasswordResetRequest(validResetData);

      expect(result).toBe(false);
    });

    it('should reject invalid token format', async () => {
      validResetData.token = 'invalid-token';

      const result = await validatePasswordResetRequest(validResetData);

      expect(result).toBe(false);
    });

    it('should accept valid hex token', async () => {
      validResetData.token = 'A1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF12345';

      const result = await validatePasswordResetRequest(validResetData);

      expect(typeof result).toBe('boolean');
    });

    it('should handle fresh reset requests', async () => {
      validResetData.timestamp = Date.now() - 1000; // 1 second ago

      const result = await validatePasswordResetRequest(validResetData);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('DTO Classes', () => {
    it('should create LoginDto instance', () => {
      const dto = new LoginDto();
      dto.email = 'test@example.com';
      dto.password = 'Password123!';
      dto.ipAddress = '192.168.1.1';
      dto.deviceId = '550e8400-e29b-41d4-a716-446655440000';
      dto.rememberMe = false;

      expect(dto.email).toBe('test@example.com');
      expect(dto.password).toBe('Password123!');
    });

    it('should create RegisterDto instance', () => {
      const dto = new RegisterDto();
      dto.email = 'test@example.com';
      dto.firstName = 'John';
      dto.lastName = 'Doe';
      dto.role = UserRole.BENEFICIARY;

      expect(dto.email).toBe('test@example.com');
      expect(dto.role).toBe(UserRole.BENEFICIARY);
    });

    it('should create MfaVerificationDto instance', () => {
      const dto = new MfaVerificationDto();
      dto.token = '123456';
      dto.method = 'totp';
      dto.sessionId = '550e8400-e29b-41d4-a716-446655440000';

      expect(dto.token).toBe('123456');
      expect(dto.method).toBe('totp');
    });

    it('should create PasswordResetDto instance', () => {
      const dto = new PasswordResetDto();
      dto.email = 'test@example.com';
      dto.newPassword = 'NewPassword123!';
      dto.confirmPassword = 'NewPassword123!';

      expect(dto.email).toBe('test@example.com');
      expect(dto.newPassword).toBe('NewPassword123!');
    });
  });
});
