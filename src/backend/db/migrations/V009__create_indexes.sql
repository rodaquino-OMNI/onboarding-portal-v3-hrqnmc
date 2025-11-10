-- V009: Additional Performance Indexes
-- Purpose: Optimize common query patterns and improve application performance
-- Note: Primary indexes are already created in table definitions

-- Composite indexes for common query patterns

-- Users: Find active users by role with recent activity
CREATE INDEX idx_users_role_last_login ON users(role, last_login DESC NULLS LAST)
    WHERE lockout_until IS NULL OR lockout_until < CURRENT_TIMESTAMP;

-- Enrollments: Dashboard queries for status overview by date
CREATE INDEX idx_enrollments_status_created ON enrollments(status, created_at DESC);

-- Enrollments: Broker dashboard to see their enrollments
CREATE INDEX idx_enrollments_broker_status_created ON enrollments(broker_id, status, created_at DESC)
    WHERE broker_id IS NOT NULL;

-- Health Questionnaires: Find incomplete questionnaires
CREATE INDEX idx_health_questionnaires_incomplete ON health_questionnaires(enrollment_id, created_at)
    WHERE completed_at IS NULL;

-- Health Questionnaires: High risk assessments requiring review
CREATE INDEX idx_health_questionnaires_high_risk ON health_questionnaires(risk_score DESC, completed_at)
    WHERE risk_score >= 70;

-- Documents: Find missing required documents for enrollment
CREATE INDEX idx_documents_enrollment_type_uploaded ON documents(enrollment_id, type, uploaded_at DESC);

-- Policies: Active policies expiring soon (for renewal reminders)
CREATE INDEX idx_policies_expiring_soon ON policies(expiration_date, policy_number)
    WHERE status = 'ACTIVE' AND expiration_date > CURRENT_DATE;

-- Policies: Find policies by effective date range
CREATE INDEX idx_policies_effective_expiration ON policies(effective_date, expiration_date)
    WHERE status IN ('ACTIVE', 'PENDING_PAYMENT');

-- Payments: Failed payments requiring retry
CREATE INDEX idx_payments_failed ON payments(policy_id, created_at DESC)
    WHERE status = 'FAILED';

-- Payments: Recent completed payments for reconciliation
CREATE INDEX idx_payments_completed_processed ON payments(processed_at DESC)
    WHERE status = 'COMPLETED';

-- Payments: Payment history by method for analytics
CREATE INDEX idx_payments_method_processed ON payments(payment_method, processed_at DESC)
    WHERE status = 'COMPLETED';

-- Audit Logs: Security monitoring - failed login attempts
CREATE INDEX idx_audit_logs_failed_logins ON audit_logs(ip_address, created_at DESC)
    WHERE action = 'LOGIN_FAILED';

-- Audit Logs: Compliance queries - document access tracking
CREATE INDEX idx_audit_logs_document_access ON audit_logs(entity_id, user_id, created_at DESC)
    WHERE entity_type = 'DOCUMENT' AND action IN ('DOCUMENT_DOWNLOAD', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE');

-- Audit Logs: Administrative actions audit
CREATE INDEX idx_audit_logs_admin_actions ON audit_logs(user_id, action, created_at DESC)
    WHERE action IN ('POLICY_APPROVED', 'POLICY_REJECTED', 'PERMISSION_CHANGE', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED');

-- Sessions: User session management
CREATE INDEX idx_sessions_user_created ON sessions(user_id, created_at DESC);

-- Text search indexes (if full-text search is needed)
-- Note: These should be added based on actual search requirements

-- Users: Search by name
CREATE INDEX idx_users_name_search ON users
    USING GIN (to_tsvector('english', first_name || ' ' || last_name));

-- Policies: Search by policy number (trigram for partial matches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_policies_policy_number_trgm ON policies
    USING GIN (policy_number gin_trgm_ops);

-- Covering indexes for common read-heavy queries

-- Enrollments: Get enrollment summary without table lookup
CREATE INDEX idx_enrollments_summary ON enrollments(beneficiary_id, status, enrollment_type, created_at);

-- Policies: Policy list with basic info
CREATE INDEX idx_policies_list ON policies(enrollment_id, policy_number, status, effective_date, expiration_date);

-- Comments
COMMENT ON INDEX idx_users_role_last_login IS 'Optimizes admin dashboard queries for active users by role';
COMMENT ON INDEX idx_enrollments_status_created IS 'Speeds up enrollment status dashboard and reporting';
COMMENT ON INDEX idx_health_questionnaires_high_risk IS 'Identifies high-risk cases requiring manual review';
COMMENT ON INDEX idx_policies_expiring_soon IS 'Supports automated renewal reminder system';
COMMENT ON INDEX idx_payments_failed IS 'Facilitates payment retry and error handling workflows';
COMMENT ON INDEX idx_audit_logs_failed_logins IS 'Enables security monitoring for brute force attacks';
COMMENT ON INDEX idx_audit_logs_document_access IS 'HIPAA compliance: tracks all PHI document access';
