ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN google_subject VARCHAR(255) UNIQUE;
CREATE TABLE oauth_requests (
  state_hash CHAR(64) PRIMARY KEY,
  browser_hash CHAR(64) NOT NULL,
  nonce VARCHAR(128) NOT NULL,
  verifier VARCHAR(128) NOT NULL,
  link_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);
CREATE INDEX oauth_requests_expiry ON oauth_requests(expires_at);
