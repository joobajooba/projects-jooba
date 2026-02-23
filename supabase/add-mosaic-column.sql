-- Add mosaic column to users for profile NFT mosaic (grid + cell image URLs)
-- Run in Supabase SQL Editor if not using migrations.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS mosaic jsonb DEFAULT NULL;

COMMENT ON COLUMN users.mosaic IS 'Profile mosaic: { gridSize: "2x2"|"4x4", cells: [ { imageUrl }, ... ] }';
