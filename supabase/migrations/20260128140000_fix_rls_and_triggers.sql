-- Fix RLS for Leaderboard (allow reading other users' profiles/stats)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.player_stats;
CREATE POLICY "Enable read access for authenticated users" ON public.player_stats
FOR SELECT TO authenticated USING (true);

-- Create Trigger to update User Role when Promo Code is redeemed
CREATE OR REPLACE FUNCTION public.handle_promo_code_redemption()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_rewards JSONB;
BEGIN
  -- Get role/rewards from promo_codes table
  SELECT metadata->>'role', metadata 
  INTO v_role, v_rewards
  FROM promo_codes
  WHERE id = NEW.promo_code_id;

  -- If the promo code grants a role, update player_stats
  IF v_role IS NOT NULL THEN
    UPDATE player_stats
    SET achievements = jsonb_set(
      COALESCE(achievements, '{}'::jsonb),
      '{role}',
      to_jsonb(v_role)
    )
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_promo_code_redemption ON public.promo_code_redemptions;
CREATE TRIGGER trigger_promo_code_redemption
AFTER INSERT ON public.promo_code_redemptions
FOR EACH ROW
EXECUTE FUNCTION handle_promo_code_redemption();

-- Ensure user_notifications policies are robust
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications" ON public.user_notifications
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);
