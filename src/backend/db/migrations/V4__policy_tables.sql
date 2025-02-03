-- Create policy status enum type
CREATE TYPE policy_status AS ENUM (
    'draft', 'pending_approval', 'active', 'suspended', 'cancelled',
    'expired', 'pending_activation', 'under_review', 'pending_cancellation'
);

-- Create policy action enum type for audit logging
CREATE TYPE policy_action AS ENUM (
    'created', 'updated', 'status_changed', 'coverage_modified',
    'premium_adjusted', 'cancelled', 'encryption_key_rotated',
    'waiting_period_modified', 'exclusion_added', 'exclusion_removed'
);

-- Create core policies table with encrypted sensitive data
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    underwriter_id UUID NOT NULL REFERENCES users(id),
    policy_number VARCHAR(50) NOT NULL UNIQUE 
        CHECK (policy_number ~ '^POL-[0-9]{6}$'),
    status policy_status NOT NULL DEFAULT 'draft',
    monthly_premium DECIMAL(10,2) NOT NULL 
        CHECK (monthly_premium > 0 AND monthly_premium <= 100000.00),
    coverage_details_encrypted BYTEA NOT NULL,
    waiting_periods_encrypted BYTEA NOT NULL,
    exclusions_encrypted BYTEA,
    effective_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT valid_policy_dates 
        CHECK (effective_date < expiry_date)
);

-- Create comprehensive audit logging table for policies
CREATE TABLE policy_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id),
    user_id UUID NOT NULL REFERENCES users(id),
    action policy_action NOT NULL,
    changes_encrypted BYTEA NOT NULL,
    ip_address INET NOT NULL,
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create optimized indexes for policies table
CREATE INDEX idx_policies_enrollment ON policies (enrollment_id);
CREATE INDEX idx_policies_underwriter ON policies (underwriter_id);
CREATE INDEX idx_policies_number ON policies (policy_number);
CREATE INDEX idx_policies_status ON policies (status);
CREATE INDEX idx_policies_dates ON policies (effective_date, expiry_date);

-- Create optimized indexes for audit log table
CREATE INDEX idx_audit_policy ON policy_audit_log (policy_id);
CREATE INDEX idx_audit_user ON policy_audit_log (user_id);
CREATE INDEX idx_audit_action ON policy_audit_log (action);
CREATE INDEX idx_audit_created ON policy_audit_log USING BRIN (created_at);

-- Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create enhanced audit logging function with encryption
CREATE OR REPLACE FUNCTION log_policy_change()
RETURNS TRIGGER AS $$
DECLARE
    change_data JSONB;
    encrypted_changes BYTEA;
    client_ip INET;
    client_agent VARCHAR(255);
BEGIN
    -- Capture change data
    IF TG_OP = 'INSERT' THEN
        change_data = jsonb_build_object('operation', 'INSERT', 'new_data', row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        change_data = jsonb_build_object(
            'operation', 'UPDATE',
            'old_data', row_to_json(OLD),
            'new_data', row_to_json(NEW),
            'changed_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(row_to_json(NEW)::jsonb)
                WHERE row_to_json(NEW)::jsonb->key IS DISTINCT FROM row_to_json(OLD)::jsonb->key
            )
        );
    ELSE
        change_data = jsonb_build_object('operation', 'DELETE', 'old_data', row_to_json(OLD));
    END IF;

    -- Get client context from application_name
    client_ip := CAST(current_setting('application_name', TRUE) AS INET);
    client_agent := split_part(current_setting('application_name', TRUE), '|', 2);

    -- Encrypt change data using application encryption function
    encrypted_changes := encrypt_sensitive_data(change_data::TEXT::BYTEA);

    -- Insert audit log
    INSERT INTO policy_audit_log (
        policy_id,
        user_id,
        action,
        changes_encrypted,
        ip_address,
        user_agent
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        CAST(current_setting('app.current_user_id') AS UUID),
        CASE
            WHEN TG_OP = 'INSERT' THEN 'created'::policy_action
            WHEN TG_OP = 'DELETE' THEN 'cancelled'::policy_action
            WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_changed'::policy_action
            WHEN NEW.monthly_premium IS DISTINCT FROM OLD.monthly_premium THEN 'premium_adjusted'::policy_action
            ELSE 'updated'::policy_action
        END,
        encrypted_changes,
        client_ip,
        client_agent
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create encryption key rotation function
CREATE OR REPLACE FUNCTION rotate_policy_encryption(
    policy_id UUID,
    new_key BYTEA
)
RETURNS VOID AS $$
DECLARE
    decrypted_coverage TEXT;
    decrypted_waiting TEXT;
    decrypted_exclusions TEXT;
BEGIN
    -- Decrypt existing data
    SELECT 
        decrypt_sensitive_data(coverage_details_encrypted),
        decrypt_sensitive_data(waiting_periods_encrypted),
        decrypt_sensitive_data(exclusions_encrypted)
    INTO 
        decrypted_coverage,
        decrypted_waiting,
        decrypted_exclusions
    FROM policies 
    WHERE id = policy_id;

    -- Re-encrypt with new key
    UPDATE policies SET
        coverage_details_encrypted = encrypt_with_key(decrypted_coverage::BYTEA, new_key),
        waiting_periods_encrypted = encrypt_with_key(decrypted_waiting::BYTEA, new_key),
        exclusions_encrypted = 
            CASE WHEN decrypted_exclusions IS NOT NULL 
            THEN encrypt_with_key(decrypted_exclusions::BYTEA, new_key)
            ELSE NULL END
    WHERE id = policy_id;

    -- Log key rotation
    INSERT INTO policy_audit_log (
        policy_id,
        user_id,
        action,
        changes_encrypted,
        ip_address,
        user_agent
    ) VALUES (
        policy_id,
        CAST(current_setting('app.current_user_id') AS UUID),
        'encryption_key_rotated',
        encrypt_sensitive_data('{"event": "key_rotation"}'::TEXT::BYTEA),
        CAST(current_setting('application_name', TRUE) AS INET),
        split_part(current_setting('application_name', TRUE), '|', 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER policies_timestamp_trigger
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_policy_timestamp();

CREATE TRIGGER policies_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION log_policy_change();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON policies TO app_user;
GRANT SELECT, INSERT ON policy_audit_log TO app_user;
GRANT USAGE ON TYPE policy_status TO app_user;
GRANT USAGE ON TYPE policy_action TO app_user;

-- Revoke sensitive permissions
REVOKE ALL ON FUNCTION rotate_policy_encryption FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rotate_policy_encryption TO security_admin;