-- Add played_time tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS played_time_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to calculate XP needed for a level
CREATE OR REPLACE FUNCTION calculate_xp_for_level(target_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Level 1: 1000 XP, Level 2: 1500 XP more (total 2500), Level 3: 2000 XP more (total 4500)
  -- Formula: 500 + (level * 500)
  RETURN (target_level * 500) + 500;
END;
$$;

-- Create function to calculate total XP needed to reach a level
CREATE OR REPLACE FUNCTION calculate_total_xp_for_level(target_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
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

-- Create function to update level based on XP
CREATE OR REPLACE FUNCTION update_player_level()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Create trigger to auto-update level when XP changes
DROP TRIGGER IF EXISTS trigger_update_player_level ON player_stats;
CREATE TRIGGER trigger_update_player_level
  BEFORE UPDATE OF total_xp ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_player_level();

-- Create function to award XP for trades
CREATE OR REPLACE FUNCTION award_trade_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_award INTEGER;
  v_profit_loss NUMERIC;
  v_average_buy_price NUMERIC;
BEGIN
  -- Only process sell orders that are filled
  IF NEW.side = 'sell' AND NEW.status = 'filled' THEN
    -- Get the average buy price from portfolio
    SELECT average_buy_price INTO v_average_buy_price
    FROM portfolios
    WHERE user_id = NEW.user_id AND asset_id = NEW.asset_id;
    
    -- Calculate profit/loss
    v_profit_loss := (NEW.average_fill_price - COALESCE(v_average_buy_price, NEW.average_fill_price)) * NEW.filled_quantity;
    
    -- Award XP: +10 for profit, +25 for loss
    IF v_profit_loss >= 0 THEN
      v_xp_award := 10;
    ELSE
      v_xp_award := 25;
    END IF;
    
    -- Update player stats
    INSERT INTO player_stats (user_id, total_xp, level)
    VALUES (NEW.user_id, v_xp_award, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_xp = player_stats.total_xp + v_xp_award,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for XP awards
DROP TRIGGER IF EXISTS trigger_award_trade_xp ON orders;
CREATE TRIGGER trigger_award_trade_xp
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_trade_xp();

-- Add unique constraint to player_stats if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_stats_user_id_key'
  ) THEN
    ALTER TABLE player_stats ADD CONSTRAINT player_stats_user_id_key UNIQUE (user_id);
  END IF;
END $$;