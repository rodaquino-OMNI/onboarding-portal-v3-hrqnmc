-- V005: Create Policies Table
-- Purpose: Store approved insurance policies with coverage details
-- Security: Coverage and risk assessment data contains PHI and is encrypted

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL,
    policy_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    coverage JSONB NOT NULL, -- ENCRYPTED: Coverage details, benefits, exclusions
    waiting_periods JSONB,
    premium DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    risk_assessment JSONB, -- ENCRYPTED: Underwriting risk factors and notes
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Unique Constraints
    CONSTRAINT policies_enrollment_id_unique UNIQUE (enrollment_id),
    CONSTRAINT policies_policy_number_unique UNIQUE (policy_number),

    -- Foreign Key Constraints
    CONSTRAINT fk_policies_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollments(id)
        ON DELETE RESTRICT,

    -- Check Constraints
    CONSTRAINT policies_status_valid CHECK (
        status IN (
            'ACTIVE',
            'PENDING_PAYMENT',
            'SUSPENDED',
            'CANCELLED',
            'EXPIRED',
            'TERMINATED'
        )
    ),

    CONSTRAINT policies_premium_positive CHECK (premium > 0),

    CONSTRAINT policies_dates_valid CHECK (effective_date < expiration_date),

    CONSTRAINT policies_version_positive CHECK (version > 0),

    CONSTRAINT policies_policy_number_format CHECK (
        policy_number ~* '^[A-Z0-9]{8,20}$'
    )
);

-- Indexes
CREATE INDEX idx_policies_enrollment_id ON policies(enrollment_id);
CREATE INDEX idx_policies_policy_number ON policies(policy_number);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_effective_date ON policies(effective_date);
CREATE INDEX idx_policies_expiration_date ON policies(expiration_date);
CREATE INDEX idx_policies_created_at ON policies(created_at DESC);
CREATE INDEX idx_policies_status_effective ON policies(status, effective_date) WHERE status = 'ACTIVE';

-- GIN indexes for JSONB queries
CREATE INDEX idx_policies_coverage ON policies USING GIN (coverage);
CREATE INDEX idx_policies_waiting_periods ON policies USING GIN (waiting_periods);

-- Comments
COMMENT ON TABLE policies IS 'Approved insurance policies with coverage and premium details';
COMMENT ON COLUMN policies.enrollment_id IS 'One-to-one relationship with enrollment application';
COMMENT ON COLUMN policies.policy_number IS 'Unique policy identifier for customer reference';
COMMENT ON COLUMN policies.coverage IS 'ENCRYPTED JSONB: Detailed coverage benefits, limits, and exclusions';
COMMENT ON COLUMN policies.waiting_periods IS 'JSONB: Waiting periods for specific services or conditions';
COMMENT ON COLUMN policies.premium IS 'Monthly premium amount in USD';
COMMENT ON COLUMN policies.risk_assessment IS 'ENCRYPTED JSONB: Underwriting notes and risk factors';
COMMENT ON COLUMN policies.version IS 'Policy version number for tracking amendments';
