-- Add discord_id to users table for DM integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id text;
