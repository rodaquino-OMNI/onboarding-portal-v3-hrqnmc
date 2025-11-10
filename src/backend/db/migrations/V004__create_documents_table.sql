-- V004: Create Documents Table
-- Purpose: Track uploaded documents (ID cards, proof of income, medical records)
-- Security: Documents are stored encrypted in object storage, metadata stored here

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    encryption_key VARCHAR(500) NOT NULL, -- encrypted data encryption key (DEK)
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    CONSTRAINT fk_documents_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollments(id)
        ON DELETE CASCADE,

    -- Check Constraints
    CONSTRAINT documents_type_valid CHECK (
        type IN (
            'GOVERNMENT_ID',
            'PROOF_OF_INCOME',
            'PROOF_OF_ADDRESS',
            'BIRTH_CERTIFICATE',
            'MEDICAL_RECORDS',
            'INSURANCE_CARD',
            'GUARDIAN_AUTHORIZATION',
            'OTHER'
        )
    ),

    CONSTRAINT documents_file_size_positive CHECK (file_size > 0),

    CONSTRAINT documents_mime_type_valid CHECK (
        mime_type IN (
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/tiff',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    )
);

-- Indexes
CREATE INDEX idx_documents_enrollment_id ON documents(enrollment_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX idx_documents_enrollment_type ON documents(enrollment_id, type);

-- Comments
COMMENT ON TABLE documents IS 'Metadata for encrypted documents stored in object storage';
COMMENT ON COLUMN documents.storage_path IS 'Path to encrypted document in object storage (S3, Azure Blob, etc.)';
COMMENT ON COLUMN documents.encryption_key IS 'Encrypted DEK (Data Encryption Key) for document decryption';
COMMENT ON COLUMN documents.file_size IS 'Original file size in bytes before encryption';
COMMENT ON COLUMN documents.mime_type IS 'Original MIME type of the uploaded document';
