 -- Update increment_xp to handle role-based multipliers
-- Roles are stored in player_stats.achievements->>'role'
-- Multipliers: FinoriGold (2x), FinoriUltra/FinoriFamily (3x)

CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_multiplier integer := 1;
  v_final_amount integer;
  v_achievements jsonb;
BEGIN
  -- Only allow service role to call this function
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: only backend services can modify XP';
  END IF;

  -- Get user role from achievements
  SELECT achievements INTO v_achievements
  FROM player_stats
  WHERE user_id = p_user_id;

  -- Extract role safely
  v_role := v_achievements->>'role';

  -- Determine multiplier
  IF v_role = 'FinoriGold' THEN
    v_multiplier := 2;
  ELSIF v_role = 'FinoriUltra' OR v_role = 'FinoriFamily' THEN
    v_multiplier := 3;
  END IF;

  v_final_amount := p_amount * v_multiplier;
  
  -- Update XP
  UPDATE player_stats
  SET total_xp = total_xp + v_final_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Add columns for Streak Save system
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS streak_save_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_save_history jsonb DEFAULT '[]'::jsonb;
