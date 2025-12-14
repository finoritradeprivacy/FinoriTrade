-- Add unique constraint on price_history for asset_id + time to support upsert
ALTER TABLE public.price_history 
ADD CONSTRAINT price_history_asset_id_time_unique 
UNIQUE (asset_id, time);