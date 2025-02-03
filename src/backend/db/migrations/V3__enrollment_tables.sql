-- Create custom ENUM types for status fields
CREATE TYPE enrollment_status AS ENUM (
    'draft', 'pending', 'in_review', 'approved', 'rejected', 'cancelled'
);

CREATE TYPE assessment_status AS ENUM (
    'not_started', 'in_progress', 'completed', 'requires_review'
);

CREATE TYPE document_type AS ENUM (
    'id_document', 'proof_of_address', 'medical_record', 'income_proof', 'guardian_authorization'
);

CREATE TYPE document_status AS ENUM (
    'pending', 'verified', 'rejected'
);

-- Create function for audit trail management
CREATE OR REPLACE FUNCTION update_audit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = current_user_id(); -- Assumes current_user_id() function exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create core enrollments table with encryption support
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id UUID NOT NULL REFERENCES users(id),
    broker_id UUID NOT NULL REFERENCES users(id),
    guardian_id UUID REFERENCES users(id),
    status enrollment_status NOT NULL DEFAULT 'draft',
    encrypted_personal_info BYTEA NOT NULL,
    encrypted_address_info BYTEA NOT NULL,
    encrypted_payment_info BYTEA NOT NULL,
    submitted_at TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_guardian_check CHECK (
        (guardian_id IS NOT NULL) = 
        (EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = beneficiary_id 
            AND extract(year from age(current_date, u.date_of_birth)) < 18
        ))
    )
);

-- Create health assessments table with encryption
CREATE TABLE health_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    encrypted_questionnaire_responses BYTEA NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    status assessment_status NOT NULL DEFAULT 'not_started',
    verified BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create enrollment documents table with security features
CREATE TABLE enrollment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    encrypted_file_path VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL CHECK (file_hash ~ '^[a-fA-F0-9]{64}$'),
    status document_status NOT NULL DEFAULT 'pending',
    verified BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX idx_enrollments_beneficiary ON enrollments(beneficiary_id);
CREATE INDEX idx_enrollments_broker ON enrollments(broker_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_created_at ON enrollments(created_at);
CREATE INDEX idx_enrollments_status_created_at ON enrollments(status, created_at);

CREATE INDEX idx_assessments_enrollment ON health_assessments(enrollment_id);
CREATE INDEX idx_assessments_status ON health_assessments(status);
CREATE INDEX idx_assessments_risk_score ON health_assessments(risk_score);
CREATE INDEX idx_assessments_verified_status ON health_assessments(verified, status);

CREATE INDEX idx_documents_enrollment ON enrollment_documents(enrollment_id);
CREATE INDEX idx_documents_type_status ON enrollment_documents(type, status);
CREATE INDEX idx_documents_verified ON enrollment_documents(verified);
CREATE INDEX idx_documents_hash ON enrollment_documents(file_hash);

-- Create audit triggers
CREATE TRIGGER enrollments_audit_trigger
    BEFORE UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_timestamp();

CREATE TRIGGER health_assessments_audit_trigger
    BEFORE UPDATE ON health_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_timestamp();

CREATE TRIGGER documents_audit_trigger
    BEFORE UPDATE ON enrollment_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_timestamp();

-- Create views for common queries with security checks
CREATE VIEW active_enrollments AS
SELECT e.*, 
       ha.risk_score,
       ha.status as assessment_status,
       COUNT(ed.id) as document_count
FROM enrollments e
LEFT JOIN health_assessments ha ON e.id = ha.enrollment_id
LEFT JOIN enrollment_documents ed ON e.id = ed.enrollment_id
WHERE e.status NOT IN ('cancelled', 'rejected')
GROUP BY e.id, ha.risk_score, ha.status;

-- Add row level security policies
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for data access
CREATE POLICY enrollments_access_policy ON enrollments
    USING (
        created_by = current_user_id() OR
        broker_id = current_user_id() OR
        beneficiary_id = current_user_id() OR
        guardian_id = current_user_id() OR
        has_role('admin') OR
        has_role('underwriter')
    );

CREATE POLICY health_assessments_access_policy ON health_assessments
    USING (
        created_by = current_user_id() OR
        EXISTS (
            SELECT 1 FROM enrollments e 
            WHERE e.id = enrollment_id 
            AND (e.broker_id = current_user_id() OR 
                 e.beneficiary_id = current_user_id() OR 
                 e.guardian_id = current_user_id())
        ) OR
        has_role('admin') OR
        has_role('underwriter')
    );

CREATE POLICY documents_access_policy ON enrollment_documents
    USING (
        created_by = current_user_id() OR
        EXISTS (
            SELECT 1 FROM enrollments e 
            WHERE e.id = enrollment_id 
            AND (e.broker_id = current_user_id() OR 
                 e.beneficiary_id = current_user_id() OR 
                 e.guardian_id = current_user_id())
        ) OR
        has_role('admin') OR
        has_role('underwriter')
    );

-- Add comments for documentation
COMMENT ON TABLE enrollments IS 'Core enrollment management table with encrypted sensitive data';
COMMENT ON TABLE health_assessments IS 'Health questionnaire responses and risk assessment data with encryption';
COMMENT ON TABLE enrollment_documents IS 'Document metadata and references with enhanced security';