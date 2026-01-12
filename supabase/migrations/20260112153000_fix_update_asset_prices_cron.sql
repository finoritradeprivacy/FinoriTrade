-- Fix pg_cron job for update-asset-prices: add signature header and update Authorization
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ensure cron secret exists in system_config (used by Edge Function signature check)
INSERT INTO public.system_config(key, value)
SELECT 'cron_secret', 'finori-cron-secret-1'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_config WHERE key = 'cron_secret'
);

-- Remove any existing scheduled job with the same name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-asset-prices') THEN
    DELETE FROM cron.job WHERE jobname = 'update-asset-prices';
  END IF;
END;
$$;

-- Schedule the job to invoke the Edge Function every minute with proper headers
SELECT cron.schedule(
  'update-asset-prices',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vcorpphtywkrrpaenywh.supabase.co/functions/v1/update-asset-prices',
    headers:= jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjb3JwcGh0eXdrcnJwYWVueXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzY0NjYsImV4cCI6MjA4MTY1MjQ2Nn0.XJlHSCk1GnTe53m6cLVr7yOrGPOtKC-rCpxwoyV1F7A',
      'X-Cron-Signature', public.get_config('cron_secret')
    ),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
