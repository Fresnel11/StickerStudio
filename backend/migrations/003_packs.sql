CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(40) NOT NULL,
  created_at BIGINT NOT NULL,
  position BIGINT GENERATED ALWAYS AS IDENTITY,
  UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS packs_owner ON packs(user_id, position);

INSERT INTO packs(id, user_id, name, created_at)
SELECT gen_random_uuid(), id, COALESCE(NULLIF(pack_name, ''), 'Mon pack 1'), created_at
FROM users
WHERE NOT EXISTS (SELECT 1 FROM packs WHERE packs.user_id = users.id);

ALTER TABLE stickers ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES packs(id) ON DELETE CASCADE;
UPDATE stickers
SET pack_id = packs.id
FROM packs
WHERE stickers.user_id = packs.user_id AND stickers.pack_id IS NULL;
ALTER TABLE stickers ALTER COLUMN pack_id SET NOT NULL;
ALTER TABLE stickers DROP CONSTRAINT IF EXISTS stickers_user_id_digest_key;
ALTER TABLE stickers ADD CONSTRAINT stickers_pack_digest_key UNIQUE(pack_id, digest);
DROP INDEX IF EXISTS stickers_owner;
CREATE INDEX IF NOT EXISTS stickers_pack_owner ON stickers(pack_id, position);