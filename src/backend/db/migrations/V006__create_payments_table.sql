-- V006: Create Payments Table
-- Purpose: Track premium payments and transaction history
-- Compliance: Maintains audit trail for financial transactions

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255), -- external payment processor transaction ID
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    CONSTRAINT fk_payments_policy
        FOREIGN KEY (policy_id)
        REFERENCES policies(id)
        ON DELETE RESTRICT,

    -- Check Constraints
    CONSTRAINT payments_status_valid CHECK (
        status IN (
            'PENDING',
            'PROCESSING',
            'COMPLETED',
            'FAILED',
            'REFUNDED',
            'CANCELLED'
        )
    ),

    CONSTRAINT payments_method_valid CHECK (
        payment_method IN (
            'CREDIT_CARD',
            'DEBIT_CARD',
            'ACH',
            'WIRE_TRANSFER',
            'CHECK',
            'CASH',
            'OTHER'
        )
    ),

    CONSTRAINT payments_amount_positive CHECK (amount > 0),

    CONSTRAINT payments_transaction_id_when_processed CHECK (
        (status IN ('COMPLETED', 'REFUNDED') AND transaction_id IS NOT NULL) OR
        (status NOT IN ('COMPLETED', 'REFUNDED'))
    ),

    CONSTRAINT payments_processed_at_when_completed CHECK (
        (status IN ('COMPLETED', 'REFUNDED', 'FAILED') AND processed_at IS NOT NULL) OR
        (status NOT IN ('COMPLETED', 'REFUNDED', 'FAILED'))
    )
);

-- Indexes
CREATE INDEX idx_payments_policy_id ON payments(policy_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_payments_processed_at ON payments(processed_at DESC);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_policy_status ON payments(policy_id, status);

-- Comments
COMMENT ON TABLE payments IS 'Premium payment transactions and processing history';
COMMENT ON COLUMN payments.policy_id IS 'Policy for which payment is made';
COMMENT ON COLUMN payments.amount IS 'Payment amount in USD';
COMMENT ON COLUMN payments.status IS 'Current status of the payment transaction';
COMMENT ON COLUMN payments.payment_method IS 'Method used for payment processing';
COMMENT ON COLUMN payments.transaction_id IS 'External payment processor transaction identifier';
COMMENT ON COLUMN payments.processed_at IS 'Timestamp when payment was successfully processed or failed';
