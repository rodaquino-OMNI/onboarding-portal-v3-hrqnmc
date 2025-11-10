-- V001: Create Users Table
-- Purpose: Store user accounts for beneficiaries, brokers, and administrators
-- Security: Passwords are stored as bcrypt hashes, MFA secrets are encrypted

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255), -- encrypted TOTP secret
    login_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    last_ip_address INET,
    token_version INTEGER NOT NULL DEFAULT 0, -- for token invalidation
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_role_valid CHECK (role IN ('BENEFICIARY', 'BROKER', 'ADMIN', 'SUPER_ADMIN')),
    CONSTRAINT users_login_attempts_positive CHECK (login_attempts >= 0),
    CONSTRAINT users_mfa_secret_required CHECK (
        (mfa_enabled = FALSE) OR
        (mfa_enabled = TRUE AND mfa_secret IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_lockout_until ON users(lockout_until) WHERE lockout_until IS NOT NULL;

-- Comments
COMMENT ON TABLE users IS 'Stores all user accounts with authentication and authorization data';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash of user password (cost factor 12+)';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret for multi-factor authentication';
COMMENT ON COLUMN users.token_version IS 'Incremented to invalidate all existing JWT tokens';
COMMENT ON COLUMN users.login_attempts IS 'Failed login attempt counter, reset on successful login';
COMMENT ON COLUMN users.lockout_until IS 'Account locked until this timestamp if too many failed attempts';
