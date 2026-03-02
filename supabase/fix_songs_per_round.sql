-- Fix: update songs_per_round from 5 to 3 for all existing groups
-- Run this once in the Supabase SQL Editor
update groups set songs_per_round = 3 where songs_per_round = 5;
