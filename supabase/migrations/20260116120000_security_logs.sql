-- Create a table for security logs
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert logs (for client-side logging)
CREATE POLICY "Authenticated users can insert security logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Service role can do anything
CREATE POLICY "Service role can manage security logs"
ON public.security_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Policy: Users can view their own logs (optional, maybe for "login history" feature later)
CREATE POLICY "Users can view their own security logs"
ON public.security_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Index for faster querying by type and time
CREATE INDEX IF NOT EXISTS idx_security_logs_type_time ON public.security_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);
