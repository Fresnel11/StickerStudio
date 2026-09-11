CREATE TABLE mobile_google_requests (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  link_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started BOOLEAN NOT NULL DEFAULT FALSE,
  result TEXT,
  expires_at BIGINT NOT NULL
);
ALTER TABLE oauth_requests ADD COLUMN mobile_id TEXT REFERENCES mobile_google_requests(id) ON DELETE CASCADE;
