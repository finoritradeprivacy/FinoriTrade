-- Fix search_path for functions to prevent search path hijacking attacks
-- Add SET search_path = public to all functions missing it

CREATE OR REPLACE FUNCTION public.calculate_xp_for_level(target_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Level 1: 1000 XP, Level 2: 1500 XP more (total 2500), Level 3: 2000 XP more (total 4500)
  -- Formula: 500 + (level * 500)
  RETURN (target_level * 500) + 500;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_total_xp_for_level(target_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total INTEGER := 0;
  i INTEGER;
BEGIN
  FOR i IN 1..target_level LOOP
    total := total + calculate_xp_for_level(i);
  END LOOP;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_player_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_level INTEGER := 1;
  xp_required INTEGER;
BEGIN
  -- Calculate what level the player should be at
  LOOP
    xp_required := calculate_total_xp_for_level(new_level + 1);
    EXIT WHEN NEW.total_xp < xp_required;
    new_level := new_level + 1;
  END LOOP;
  
  NEW.level := new_level;
  RETURN NEW;
END;
$$;