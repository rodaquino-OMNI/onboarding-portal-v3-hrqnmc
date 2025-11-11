-- V008: Create Sessions Table
-- Purpose: Manage user authentication sessions and JWT token tracking
-- Security: Enables token revocation and session management

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Unique Constraints
    CONSTRAINT sessions_token_unique UNIQUE (session_token),

    -- Foreign Key Constraints
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- Check Constraints
    CONSTRAINT sessions_expires_after_created CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, expires_at) WHERE expires_at > CURRENT_TIMESTAMP;

-- Partial index for active sessions only
CREATE INDEX idx_sessions_active ON sessions(expires_at)
    WHERE expires_at > CURRENT_TIMESTAMP;

-- Comments
COMMENT ON TABLE sessions IS 'Active user sessions for authentication and authorization';
COMMENT ON COLUMN sessions.user_id IS 'User account associated with this session';
COMMENT ON COLUMN sessions.session_token IS 'JWT token or session identifier (hashed)';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp (UTC)';
COMMENT ON INDEX idx_sessions_active IS 'Optimizes queries for active (non-expired) sessions';

-- Function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Removes expired sessions from the database';
