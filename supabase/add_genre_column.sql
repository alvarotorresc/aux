-- Add optional genre field to songs table
-- Run this in the Supabase SQL Editor
ALTER TABLE songs ADD COLUMN genre text CHECK (genre IS NULL OR char_length(genre) <= 30);
