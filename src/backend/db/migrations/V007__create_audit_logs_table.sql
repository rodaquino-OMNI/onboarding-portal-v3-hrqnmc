-- V007: Create Audit Logs Table
-- Purpose: Comprehensive audit trail for compliance and security monitoring
-- Compliance: Required for HIPAA, SOC 2, and regulatory compliance

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    changes JSONB, -- stores before/after values for updates
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints (soft reference, allows null for system actions)
    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    -- Check Constraints
    CONSTRAINT audit_logs_action_valid CHECK (
        action IN (
            'CREATE',
            'READ',
            'UPDATE',
            'DELETE',
            'LOGIN',
            'LOGOUT',
            'LOGIN_FAILED',
            'PASSWORD_CHANGE',
            'MFA_ENABLED',
            'MFA_DISABLED',
            'DOCUMENT_UPLOAD',
            'DOCUMENT_DOWNLOAD',
            'DOCUMENT_DELETE',
            'POLICY_APPROVED',
            'POLICY_REJECTED',
            'PAYMENT_PROCESSED',
            'EXPORT_DATA',
            'PERMISSION_CHANGE',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED'
        )
    ),

    CONSTRAINT audit_logs_entity_type_valid CHECK (
        entity_type IN (
            'USER',
            'ENROLLMENT',
            'HEALTH_QUESTIONNAIRE',
            'DOCUMENT',
            'POLICY',
            'PAYMENT',
            'SESSION',
            'SYSTEM'
        )
    )
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity_created ON audit_logs(entity_type, entity_id, created_at DESC);

-- GIN index for JSONB changes
CREATE INDEX idx_audit_logs_changes ON audit_logs USING GIN (changes);

-- Partitioning preparation (for future time-based partitioning)
-- CREATE INDEX idx_audit_logs_created_at_brin ON audit_logs USING BRIN (created_at);

-- Comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions and data changes';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected by the action';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the specific entity affected';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB containing before/after values for updates';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address from which the action originated';
