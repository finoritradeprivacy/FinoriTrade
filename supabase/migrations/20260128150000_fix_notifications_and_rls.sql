-- Fix RLS for user_notifications to ensure DELETE and UPDATE work correctly
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;

-- Create correct policies
CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.user_notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.user_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure authenticated users can see profiles/player_stats (Leaderboard visibility)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.player_stats;
CREATE POLICY "Enable read access for authenticated users" ON public.player_stats
  FOR SELECT TO authenticated USING (true);
