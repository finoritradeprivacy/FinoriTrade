
-- Add login_history to player_stats to track daily logins for streak calculation
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS login_history jsonb DEFAULT '[]'::jsonb;
