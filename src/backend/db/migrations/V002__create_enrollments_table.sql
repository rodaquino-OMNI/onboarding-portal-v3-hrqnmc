-- V002: Create Enrollments Table
-- Purpose: Track enrollment applications from submission to completion
-- Relationships: Links beneficiaries to brokers who assist with enrollment

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID NOT NULL,
    broker_id UUID,
    status VARCHAR(50) NOT NULL,
    enrollment_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    CONSTRAINT fk_enrollments_beneficiary
        FOREIGN KEY (beneficiary_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_enrollments_broker
        FOREIGN KEY (broker_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    -- Check Constraints
    CONSTRAINT enrollments_status_valid CHECK (
        status IN (
            'DRAFT',
            'PENDING_DOCUMENTS',
            'PENDING_QUESTIONNAIRE',
            'UNDER_REVIEW',
            'PENDING_APPROVAL',
            'APPROVED',
            'REJECTED',
            'WITHDRAWN',
            'EXPIRED'
        )
    ),

    CONSTRAINT enrollments_type_valid CHECK (
        enrollment_type IN (
            'NEW_ENROLLMENT',
            'RENEWAL',
            'DEPENDENT_ADDITION',
            'PLAN_CHANGE'
        )
    )
);

-- Indexes
CREATE INDEX idx_enrollments_beneficiary_id ON enrollments(beneficiary_id);
CREATE INDEX idx_enrollments_broker_id ON enrollments(broker_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_enrollment_type ON enrollments(enrollment_type);
CREATE INDEX idx_enrollments_created_at ON enrollments(created_at DESC);
CREATE INDEX idx_enrollments_beneficiary_status ON enrollments(beneficiary_id, status);

-- Comments
COMMENT ON TABLE enrollments IS 'Tracks enrollment applications through various workflow stages';
COMMENT ON COLUMN enrollments.beneficiary_id IS 'The user applying for health coverage';
COMMENT ON COLUMN enrollments.broker_id IS 'Optional broker assisting with the enrollment process';
COMMENT ON COLUMN enrollments.status IS 'Current workflow status of the enrollment application';
COMMENT ON COLUMN enrollments.enrollment_type IS 'Type of enrollment (new, renewal, etc.)';
