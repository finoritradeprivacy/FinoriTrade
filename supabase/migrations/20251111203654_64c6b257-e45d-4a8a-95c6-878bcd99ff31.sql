-- Add mean reversion tracking to news_events
ALTER TABLE public.news_events 
ADD COLUMN IF NOT EXISTS original_price NUMERIC,
ADD COLUMN IF NOT EXISTS reversion_complete_at TIMESTAMP WITH TIME ZONE;