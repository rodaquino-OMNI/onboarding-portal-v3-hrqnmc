-- V2__auth_tables.sql
-- Enhanced authentication tables with security features and LGPD compliance

-- Create custom enums for type safety
CREATE TYPE mfa_type AS ENUM ('sms', 'totp', 'email', 'hardware_token');
CREATE TYPE attempt_type AS ENUM ('login', 'mfa', 'password_reset', 'backup_code');
CREATE TYPE enrollment_status AS ENUM ('pending', 'active', 'suspended', 'revoked');

-- MFA Settings table with encryption and status tracking
CREATE TABLE mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mfa_type mfa_type NOT NULL,
    mfa_secret TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT true,
    enrollment_status enrollment_status NOT NULL DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT false,
    backup_codes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_backup_codes CHECK (jsonb_array_length(backup_codes) <= 10)
);

-- Indexes for MFA settings
CREATE INDEX idx_mfa_user_id ON mfa_settings(user_id);
CREATE INDEX idx_mfa_status ON mfa_settings(user_id, enrollment_status);

-- Authentication sessions with device tracking and security features
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) NOT NULL DEFAULT 'web',
    user_agent VARCHAR(255) NOT NULL,
    device_info JSONB NOT NULL,
    ip_address INET NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    risk_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0.0 AND risk_score <= 1.0)
);

-- Indexes for session management
CREATE INDEX idx_sessions_user_token ON auth_sessions(user_id, token_hash);
CREATE INDEX idx_sessions_expiry ON auth_sessions(expires_at);
CREATE INDEX idx_sessions_active ON auth_sessions(is_active, user_id);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions(retention_period INTERVAL)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH expired_sessions AS (
        DELETE FROM auth_sessions 
        WHERE expires_at < (CURRENT_TIMESTAMP - retention_period)
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM expired_sessions;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate all user sessions
CREATE OR REPLACE FUNCTION invalidate_user_sessions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    invalidated_count INTEGER;
BEGIN
    UPDATE auth_sessions 
    SET 
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        user_id = p_user_id 
        AND is_active = true;
    
    GET DIAGNOSTICS invalidated_count = ROW_COUNT;
    RETURN invalidated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for MFA settings audit
CREATE OR REPLACE FUNCTION audit_mfa_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            event_type,
            table_name,
            record_id,
            user_id,
            old_values,
            new_values
        ) VALUES (
            'DELETE',
            'mfa_settings',
            OLD.id,
            OLD.user_id,
            row_to_json(OLD),
            NULL
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            event_type,
            table_name,
            record_id,
            user_id,
            old_values,
            new_values
        ) VALUES (
            'UPDATE',
            'mfa_settings',
            NEW.id,
            NEW.user_id,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            event_type,
            table_name,
            record_id,
            user_id,
            old_values,
            new_values
        ) VALUES (
            'INSERT',
            'mfa_settings',
            NEW.id,
            NEW.user_id,
            NULL,
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for session security monitoring
CREATE OR REPLACE FUNCTION check_session_security()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for concurrent sessions from different locations
    IF EXISTS (
        SELECT 1 FROM auth_sessions
        WHERE user_id = NEW.user_id
        AND is_active = true
        AND ip_address != NEW.ip_address
        AND created_at > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
    ) THEN
        -- Log suspicious activity
        INSERT INTO security_alerts (
            alert_type,
            user_id,
            details,
            severity
        ) VALUES (
            'concurrent_login',
            NEW.user_id,
            jsonb_build_object(
                'session_id', NEW.id,
                'ip_address', NEW.ip_address,
                'device_info', NEW.device_info
            ),
            'high'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER mfa_settings_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON mfa_settings
FOR EACH ROW EXECUTE FUNCTION audit_mfa_changes();

CREATE TRIGGER session_security_trigger
AFTER INSERT ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION check_session_security();

-- Update function for mfa_settings
CREATE OR REPLACE FUNCTION update_mfa_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update function for auth_sessions
CREATE OR REPLACE FUNCTION update_auth_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timestamp triggers
CREATE TRIGGER update_mfa_settings_timestamp
BEFORE UPDATE ON mfa_settings
FOR EACH ROW EXECUTE FUNCTION update_mfa_settings_timestamp();

CREATE TRIGGER update_auth_sessions_timestamp
BEFORE UPDATE ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION update_auth_sessions_timestamp();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON mfa_settings TO auth_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_sessions TO auth_service;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO auth_service;
GRANT EXECUTE ON FUNCTION invalidate_user_sessions TO auth_service;