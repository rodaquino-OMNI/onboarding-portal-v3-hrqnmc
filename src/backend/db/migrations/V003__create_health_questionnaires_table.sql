-- V003: Create Health Questionnaires Table
-- Purpose: Store health assessment data for risk evaluation and underwriting
-- Security: Responses contain PHI/PII and must be encrypted at rest

CREATE TABLE health_questionnaires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL,
    responses JSONB NOT NULL, -- ENCRYPTED: Contains sensitive health information
    risk_score DECIMAL(5,2),
    completed_at TIMESTAMP WITH TIME ZONE,
    guardian_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    CONSTRAINT fk_health_questionnaires_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollments(id)
        ON DELETE CASCADE,

    -- Check Constraints
    CONSTRAINT health_questionnaires_risk_score_range CHECK (
        risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)
    ),

    CONSTRAINT health_questionnaires_completed_consistency CHECK (
        (completed_at IS NULL AND risk_score IS NULL) OR
        (completed_at IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_health_questionnaires_enrollment_id ON health_questionnaires(enrollment_id);
CREATE INDEX idx_health_questionnaires_completed_at ON health_questionnaires(completed_at);
CREATE INDEX idx_health_questionnaires_risk_score ON health_questionnaires(risk_score) WHERE risk_score IS NOT NULL;
CREATE INDEX idx_health_questionnaires_guardian_verified ON health_questionnaires(guardian_verified);

-- GIN index for JSONB queries (after decryption in application layer)
CREATE INDEX idx_health_questionnaires_responses ON health_questionnaires USING GIN (responses);

-- Comments
COMMENT ON TABLE health_questionnaires IS 'Stores encrypted health assessment data for underwriting';
COMMENT ON COLUMN health_questionnaires.responses IS 'ENCRYPTED JSONB: Contains all questionnaire responses including medical history';
COMMENT ON COLUMN health_questionnaires.risk_score IS 'Calculated risk score (0-100) based on health assessment';
COMMENT ON COLUMN health_questionnaires.completed_at IS 'Timestamp when questionnaire was fully completed';
COMMENT ON COLUMN health_questionnaires.guardian_verified IS 'Whether guardian verified responses for minor beneficiaries';
