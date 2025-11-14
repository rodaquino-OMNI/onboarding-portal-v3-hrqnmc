// @package typeorm ^0.3.17
// @package class-validator ^0.14.0
// @package class-transformer ^0.5.1

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  Index, 
  BeforeInsert, 
  BeforeUpdate 
} from 'typeorm';
import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsPhoneNumber,
  IsArray,
  IsDate,
  IsInt,
  Min
} from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { security } from '../config/auth.config';
import { hashPassword } from '../utils/encryption';

/**
 * Enum defining user roles with granular access levels
 */
export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  UNDERWRITER = 'UNDERWRITER',
  BROKER = 'BROKER',
  HR_PERSONNEL = 'HR_PERSONNEL',
  BENEFICIARY = 'BENEFICIARY',
  PARENT_GUARDIAN = 'PARENT_GUARDIAN'
}

/**
 * User entity with enhanced security features and LGPD compliance
 */
@Entity('users')
@Index(['email', 'cpf', 'role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email!: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  @MinLength(security.passwordMinLength)
  password!: string;

  @Column()
  @IsString()
  firstName!: string;

  @Column()
  @IsString()
  lastName!: string;

  @Column({ unique: true })
  @IsString()
  cpf!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ default: false })
  @IsBoolean()
  mfaEnabled!: boolean;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  mfaSecret?: string;

  @Column('simple-array', { nullable: true })
  @IsArray()
  @Exclude({ toPlainOnly: true })
  mfaBackupCodes?: string[];

  @Column({ nullable: true })
  @IsPhoneNumber('BR')
  phoneNumber?: string;

  @Column({ default: 0 })
  @IsInt()
  @Min(0)
  loginAttempts!: number;

  @Column({ nullable: true })
  @IsDate()
  lockoutUntil?: Date;

  @Column({ nullable: true })
  @IsDate()
  lastLogin?: Date;

  @Column('simple-array', { default: '' })
  @IsArray()
  @Exclude({ toPlainOnly: true })
  passwordHistory!: string[];

  @Column({ default: true })
  @IsBoolean()
  isActive!: boolean;

  @Column({ nullable: true })
  @IsString()
  lastIpAddress?: string;

  @Column({ default: 0 })
  @IsInt()
  @Min(0)
  tokenVersion!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('jsonb', { default: [] })
  @IsArray()
  @Exclude({ toPlainOnly: true })
  auditLog!: Array<{
    action: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
  }>;

  constructor(partial: Partial<User>) {
    if (partial) {
      Object.assign(this, partial);
      this.email = this.email?.toLowerCase();
      this.passwordHistory = [];
      this.auditLog = [];
      
      // Initialize MFA backup codes if MFA is enabled
      if (this.mfaEnabled && !this.mfaBackupCodes) {
        this.mfaBackupCodes = Array(10).fill(0).map(() => 
          Math.random().toString(36).substring(2, 12).toUpperCase()
        );
      }
    }
  }

  /**
   * Enhanced password validation with complexity requirements and history check
   */
  async validatePassword(password: string): Promise<boolean> {
    if (password.length < security.passwordMinLength) {
      return false;
    }

    // Check password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (security.passwordRequireUppercase && !hasUppercase) return false;
    if (security.passwordRequireLowercase && !hasLowercase) return false;
    if (security.passwordRequireNumbers && !hasNumbers) return false;
    if (security.passwordRequireSpecial && !hasSpecialChars) return false;

    // Check password history
    if (this.passwordHistory.length > 0) {
      for (const historicPassword of this.passwordHistory) {
        if (await hashPassword(password) === historicPassword) {
          return false;
        }
      }
    }

    // Calculate password entropy
    const entropy = this.calculatePasswordEntropy(password);
    return entropy >= 60; // Minimum 60 bits of entropy required
  }

  /**
   * Enhanced login attempt tracking with exponential backoff
   */
  async incrementLoginAttempts(ipAddress: string): Promise<void> {
    this.loginAttempts += 1;
    this.lastIpAddress = ipAddress;

    if (this.loginAttempts >= security.maxLoginAttempts) {
      // Calculate exponential backoff duration
      const lockoutMinutes = Math.min(
        Math.pow(2, this.loginAttempts - security.maxLoginAttempts) * 5,
        120 // Maximum 2 hour lockout
      );
      
      this.lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

      // Log security event
      this.auditLog.push({
        action: 'ACCOUNT_LOCKOUT',
        timestamp: new Date(),
        ipAddress,
        details: {
          attempts: this.loginAttempts,
          lockoutDuration: lockoutMinutes
        }
      });
    }
  }

  /**
   * Calculate password entropy for strength validation
   */
  private calculatePasswordEntropy(password: string): number {
    const charset = {
      numbers: /\d/.test(password),
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    let poolSize = 0;
    if (charset.numbers) poolSize += 10;
    if (charset.lowercase) poolSize += 26;
    if (charset.uppercase) poolSize += 26;
    if (charset.special) poolSize += 32;

    return Math.floor(password.length * Math.log2(poolSize));
  }

  /**
   * Lifecycle hooks for data processing
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPasswordIfModified(): Promise<void> {
    if (this.password) {
      // Store previous password in history
      if (this.passwordHistory.length >= security.passwordHistoryLimit) {
        this.passwordHistory = this.passwordHistory.slice(-security.passwordHistoryLimit + 1);
      }
      this.passwordHistory.push(await hashPassword(this.password));
      
      // Hash new password
      this.password = await hashPassword(this.password);
    }
  }
}