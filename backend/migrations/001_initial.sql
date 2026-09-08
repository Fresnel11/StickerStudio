CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  pack_name VARCHAR(40) NOT NULL DEFAULT 'Mon premier pack',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK (octet_length(data) <= 136560),
  digest CHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  position BIGINT GENERATED ALWAYS AS IDENTITY,
  UNIQUE(user_id, digest)
);
CREATE INDEX IF NOT EXISTS stickers_owner ON stickers(user_id, position);
