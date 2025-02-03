-- Initial database migration for Pre-paid Health Plan Onboarding Portal
-- Version: 1.0
-- Description: Establishes core schema with enhanced security and LGPD compliance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom ENUM types
CREATE TYPE user_status AS ENUM (
    'pending',
    'active',
    'suspended',
    'inactive',
    'locked'
);

-- Create trigger function for timestamp and audit updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = current_setting('app.current_user_id', true)::uuid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create roles table with enhanced security features
CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(50) NOT NULL UNIQUE,
    description text,
    is_system_role boolean NOT NULL DEFAULT false,
    parent_role_id uuid REFERENCES roles(id),
    permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT roles_name_length CHECK (length(trim(name)) > 0)
);

-- Create users table with comprehensive security features
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email varchar(255) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    password_salt varchar(32) NOT NULL,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    cpf varchar(14) NOT NULL UNIQUE,
    phone varchar(20) NOT NULL,
    mfa_enabled boolean NOT NULL DEFAULT false,
    mfa_type varchar(20),
    mfa_secret varchar(32),
    status user_status NOT NULL DEFAULT 'pending',
    login_attempts integer NOT NULL DEFAULT 0,
    last_login timestamp,
    last_password_change timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    password_reset_token varchar(64),
    token_expiry timestamp,
    encryption_key_id uuid NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_cpf_format CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT users_phone_format CHECK (phone ~ '^\+[0-9]{2}[0-9]{10,11}$'),
    CONSTRAINT users_password_change_future CHECK (last_password_change <= CURRENT_TIMESTAMP),
    CONSTRAINT users_token_expiry_future CHECK (token_expiry IS NULL OR token_expiry > CURRENT_TIMESTAMP),
    CONSTRAINT users_names_length CHECK (
        length(trim(first_name)) > 0 AND
        length(trim(last_name)) > 0
    )
);

-- Create user_roles mapping table with audit trail
CREATE TABLE user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL REFERENCES users(id),
    expires_at timestamp,
    assignment_reason text,
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id),
    CONSTRAINT user_roles_expiry_future CHECK (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
);

-- Add foreign key constraints for audit fields
ALTER TABLE roles
    ADD CONSTRAINT roles_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
    ADD CONSTRAINT roles_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE users
    ADD CONSTRAINT users_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
    ADD CONSTRAINT users_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id);

-- Create indexes for optimized queries
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_parent ON roles(parent_role_id);
CREATE INDEX idx_roles_system ON roles(is_system_role);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cpf ON users(cpf);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_active ON users(status) WHERE status = 'active';

CREATE INDEX idx_user_roles_expiry ON user_roles(expires_at);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER users_timestamp_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER roles_timestamp_trigger
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Create security policies for row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE roles IS 'Enhanced system role definitions with hierarchy and permissions';
COMMENT ON TABLE users IS 'Enhanced user management table with security features';
COMMENT ON TABLE user_roles IS 'Enhanced user to role mapping with audit trail';

COMMENT ON COLUMN users.encryption_key_id IS 'Reference to encryption key for sensitive data protection';
COMMENT ON COLUMN users.password_hash IS 'Argon2id hashed password';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted MFA secret key';
COMMENT ON COLUMN roles.permissions IS 'JSON structure defining granular permissions';
COMMENT ON COLUMN user_roles.assignment_reason IS 'Documentation for role assignment decision';