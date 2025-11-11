// @package class-validator ^0.14.0
// @package class-transformer ^0.5.1

import { 
  IsEmail, 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  IsBoolean, 
  IsPhoneNumber, 
  IsEnum, 
  IsObject, 
  IsNumber, 
  ValidateIf, 
  Matches,
  IsIP,
  IsUUID,
  MaxLength
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { User, UserRole } from '../models/user.model';
import { authConfig } from '../config/auth.config';

/**
 * Enhanced login request validation DTO
 */
export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(authConfig.security.passwordMinLength)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character'
  })
  @IsNotEmpty()
  password!: string;

  @IsIP(4, { message: 'Invalid IP address format' })
  @IsNotEmpty()
  ipAddress!: string;

  @IsUUID(4, { message: 'Invalid device ID format' })
  @IsNotEmpty()
  deviceId!: string;

  @IsBoolean()
  rememberMe!: boolean;
}

/**
 * Enhanced registration validation DTO
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(authConfig.security.passwordMinLength)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character'
  })
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[A-Za-zÀ-ÿ\s]+$/, { message: 'First name can only contain letters' })
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[A-Za-zÀ-ÿ\s]+$/, { message: 'Last name can only contain letters' })
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, { message: 'Invalid CPF format' })
  @IsNotEmpty()
  cpf!: string;

  @IsPhoneNumber('BR', { message: 'Invalid Brazilian phone number' })
  @IsNotEmpty()
  phoneNumber!: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;

  @IsUUID(4, { message: 'Invalid device ID format' })
  @IsNotEmpty()
  deviceId!: string;

  @IsObject()
  @ValidateIf(o => o.role === UserRole.BENEFICIARY || o.role === UserRole.PARENT_GUARDIAN)
  securityQuestions!: {
    [key: string]: string;
  };
}

/**
 * Enhanced MFA verification validation DTO
 */
export class MfaVerificationDto {
  @IsString()
  @MinLength(authConfig.mfa.tokenLength)
  @MaxLength(authConfig.mfa.tokenLength)
  @Matches(/^\d+$/, { message: 'Token must contain only numbers' })
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsEnum(['sms', 'totp'], { message: 'Invalid MFA method' })
  @IsNotEmpty()
  method!: string;

  @IsUUID(4, { message: 'Invalid session ID format' })
  @IsNotEmpty()
  sessionId!: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  timestamp!: number;

  @IsUUID(4, { message: 'Invalid device ID format' })
  @IsNotEmpty()
  deviceId!: string;
}

/**
 * Enhanced password reset validation DTO
 */
export class PasswordResetDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value.toLowerCase())
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(32)
  @MaxLength(64)
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(authConfig.security.passwordMinLength)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character'
  })
  @IsNotEmpty()
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;

  @IsUUID(4, { message: 'Invalid device ID format' })
  @IsNotEmpty()
  deviceId!: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  timestamp!: number;
}

/**
 * Enhanced login request validation with rate limiting and security checks
 */
export async function validateLoginRequest(data: LoginDto): Promise<boolean> {
  try {
    // Validate email format and domain
    if (!data.email.includes('@') || !data.email.includes('.')) {
      return false;
    }

    // Validate password format and entropy
    if (!await User.prototype.validatePassword(data.password)) {
      return false;
    }

    // Validate device ID format
    if (!data.deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return false;
    }

    // Validate IP address format
    if (!data.ipAddress.match(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Enhanced registration validation with comprehensive checks
 */
export async function validateRegistrationRequest(data: RegisterDto): Promise<boolean> {
  try {
    // Validate password match
    if (data.password !== data.confirmPassword) {
      return false;
    }

    // Validate CPF using mod11 algorithm
    const cpf = data.cpf.replace(/[^\d]/g, '');
    if (!validateCPF(cpf)) {
      return false;
    }

    // Validate phone number format
    if (!data.phoneNumber.match(/^\+55\d{2}9?\d{8}$/)) {
      return false;
    }

    // Validate security questions if required
    if ((data.role === UserRole.BENEFICIARY || data.role === UserRole.PARENT_GUARDIAN) && 
        (!data.securityQuestions || Object.keys(data.securityQuestions).length < 3)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Enhanced MFA validation with comprehensive security
 */
export async function validateMfaRequest(data: MfaVerificationDto): Promise<boolean> {
  try {
    // Validate token freshness
    const tokenAge = Date.now() - data.timestamp;
    if (tokenAge > authConfig.mfa.tokenExpiry * 1000) {
      return false;
    }

    // Validate token format based on method
    if (data.method === 'totp' && !data.token.match(/^\d{6}$/)) {
      return false;
    }

    // Validate session ID format
    if (!data.sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Enhanced password reset validation with security measures
 */
export async function validatePasswordResetRequest(data: PasswordResetDto): Promise<boolean> {
  try {
    // Validate password match
    if (data.newPassword !== data.confirmPassword) {
      return false;
    }

    // Validate token freshness
    const tokenAge = Date.now() - data.timestamp;
    if (tokenAge > authConfig.security.lockoutDuration * 1000) {
      return false;
    }

    // Validate token format
    if (!data.token.match(/^[A-Fa-f0-9]{32,64}$/)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Helper function to validate CPF using mod11 algorithm
 */
function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false;

  // Check for known invalid CPFs
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Calculate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;

  // Calculate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;

  return true;
}