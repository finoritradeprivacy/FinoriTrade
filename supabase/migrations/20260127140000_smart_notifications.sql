
-- Create user_notifications table for persistent smart notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'system', 'trade', 'behavior', 'market', 'progress', 'insight', 'portfolio', 'opportunity'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for user_notifications
CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.user_notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.user_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix Admin Notifications RLS (allow admins to delete/update)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_notifications' AND policyname = 'Admins can delete notifications'
    ) THEN
        CREATE POLICY "Admins can delete notifications" ON public.admin_notifications
        FOR DELETE USING (is_admin());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_notifications' AND policyname = 'Admins can update notifications'
    ) THEN
        CREATE POLICY "Admins can update notifications" ON public.admin_notifications
        FOR UPDATE USING (is_admin());
    END IF;
END $$;
