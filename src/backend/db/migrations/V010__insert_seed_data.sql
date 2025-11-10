-- V010: Seed Data
-- Purpose: Insert initial data required for application bootstrap
-- Security: Default admin password must be changed on first login

-- Insert default admin user
-- Password: Admin@123456 (MUST BE CHANGED ON FIRST LOGIN)
-- bcrypt hash with cost factor 12
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    mfa_enabled,
    created_at,
    updated_at
) VALUES (
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'admin@healthplan.example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYfXqKwZEBG',
    'System',
    'Administrator',
    'SUPER_ADMIN',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Insert demo broker user (for development/testing)
-- Password: Broker@123456
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    mfa_enabled,
    created_at,
    updated_at
) VALUES (
    'b0000000-0000-0000-0000-000000000001'::UUID,
    'broker@healthplan.example.com',
    '$2b$12$8ixPHFEJp5BZxKwF.qqjdeF7p8gVvE2K3zXOQwJNlLxHJqYqY8K9q',
    'Demo',
    'Broker',
    'BROKER',
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Insert demo beneficiary user (for development/testing)
-- Password: Beneficiary@123456
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    mfa_enabled,
    created_at,
    updated_at
) VALUES (
    'c0000000-0000-0000-0000-000000000001'::UUID,
    'beneficiary@healthplan.example.com',
    '$2b$12$zKvP.hY9YJ4p2KqF5p8qZeE8v9HsF6M4oZqRwKdQkNvYdFgHhKjQm',
    'Demo',
    'Beneficiary',
    'BENEFICIARY',
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Create audit log entry for initial setup
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    changes,
    ip_address,
    created_at
) VALUES (
    NULL, -- system action
    'CREATE',
    'SYSTEM',
    NULL,
    jsonb_build_object(
        'event', 'database_initialization',
        'version', '1.0.0',
        'description', 'Initial database schema and seed data created'
    ),
    NULL,
    CURRENT_TIMESTAMP
);

-- Insert reference data comments
COMMENT ON TABLE users IS 'NOTE: Default passwords are for development only and must be changed in production';

-- Create a view for easy role verification
CREATE OR REPLACE VIEW v_user_roles AS
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.mfa_enabled,
    u.created_at,
    CASE
        WHEN u.lockout_until IS NOT NULL AND u.lockout_until > CURRENT_TIMESTAMP
        THEN TRUE
        ELSE FALSE
    END AS is_locked
FROM users u;

COMMENT ON VIEW v_user_roles IS 'Convenient view for user role and status verification';

-- Create a view for enrollment status dashboard
CREATE OR REPLACE VIEW v_enrollment_dashboard AS
SELECT
    e.id AS enrollment_id,
    e.status,
    e.enrollment_type,
    e.created_at,
    e.updated_at,
    b.id AS beneficiary_id,
    b.first_name AS beneficiary_first_name,
    b.last_name AS beneficiary_last_name,
    b.email AS beneficiary_email,
    br.id AS broker_id,
    br.first_name AS broker_first_name,
    br.last_name AS broker_last_name,
    hq.id AS questionnaire_id,
    hq.completed_at AS questionnaire_completed_at,
    hq.risk_score,
    COUNT(DISTINCT d.id) AS document_count,
    p.id AS policy_id,
    p.policy_number,
    p.status AS policy_status
FROM enrollments e
INNER JOIN users b ON e.beneficiary_id = b.id
LEFT JOIN users br ON e.broker_id = br.id
LEFT JOIN health_questionnaires hq ON e.id = hq.enrollment_id
LEFT JOIN documents d ON e.id = d.enrollment_id
LEFT JOIN policies p ON e.id = p.enrollment_id
GROUP BY
    e.id, e.status, e.enrollment_type, e.created_at, e.updated_at,
    b.id, b.first_name, b.last_name, b.email,
    br.id, br.first_name, br.last_name,
    hq.id, hq.completed_at, hq.risk_score,
    p.id, p.policy_number, p.status;

COMMENT ON VIEW v_enrollment_dashboard IS 'Dashboard view with enrollment summary and related entities';

-- Create a view for policy management
CREATE OR REPLACE VIEW v_policy_summary AS
SELECT
    p.id AS policy_id,
    p.policy_number,
    p.status,
    p.effective_date,
    p.expiration_date,
    p.premium,
    p.version,
    u.id AS beneficiary_id,
    u.first_name || ' ' || u.last_name AS beneficiary_name,
    u.email AS beneficiary_email,
    e.id AS enrollment_id,
    e.enrollment_type,
    COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'COMPLETED') AS completed_payments,
    SUM(pay.amount) FILTER (WHERE pay.status = 'COMPLETED') AS total_paid,
    MAX(pay.processed_at) FILTER (WHERE pay.status = 'COMPLETED') AS last_payment_date,
    CASE
        WHEN p.expiration_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN p.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
        ELSE 'ACTIVE'
    END AS renewal_status
FROM policies p
INNER JOIN enrollments e ON p.enrollment_id = e.id
INNER JOIN users u ON e.beneficiary_id = u.id
LEFT JOIN payments pay ON p.id = pay.policy_id
GROUP BY
    p.id, p.policy_number, p.status, p.effective_date, p.expiration_date,
    p.premium, p.version,
    u.id, u.first_name, u.last_name, u.email,
    e.id, e.enrollment_type;

COMMENT ON VIEW v_policy_summary IS 'Policy management view with payment history and renewal status';

-- Output seed data summary
DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
    broker_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN');
    SELECT COUNT(*) INTO broker_count FROM users WHERE role = 'BROKER';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Initialization Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Users: %', user_count;
    RAISE NOTICE 'Admin Users: %', admin_count;
    RAISE NOTICE 'Broker Users: %', broker_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Default Credentials (CHANGE IMMEDIATELY):';
    RAISE NOTICE 'Admin: admin@healthplan.example.com / Admin@123456';
    RAISE NOTICE 'Broker: broker@healthplan.example.com / Broker@123456';
    RAISE NOTICE 'Beneficiary: beneficiary@healthplan.example.com / Beneficiary@123456';
    RAISE NOTICE '========================================';
END $$;
