ALTER TABLE stickers DROP CONSTRAINT IF EXISTS stickers_data_check;
ALTER TABLE stickers ADD CONSTRAINT stickers_data_check CHECK (octet_length(data) <= 512000);