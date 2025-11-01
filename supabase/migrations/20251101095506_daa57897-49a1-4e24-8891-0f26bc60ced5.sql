-- Add constraint to prevent negative balance
ALTER TABLE user_balances 
ADD CONSTRAINT positive_balance 
CHECK (usdt_balance >= 0);

-- Create atomic order processing function
CREATE OR REPLACE FUNCTION process_market_order(
  p_user_id UUID,
  p_asset_id UUID,
  p_side TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total_cost NUMERIC;
  v_balance_change NUMERIC;
  v_existing_quantity NUMERIC;
  v_existing_invested NUMERIC;
BEGIN
  v_total_cost := p_quantity * p_price;
  v_balance_change := CASE WHEN p_side = 'buy' THEN -v_total_cost ELSE v_total_cost END;
  
  -- Update balance atomically (will fail if insufficient due to constraint)
  UPDATE user_balances
  SET usdt_balance = usdt_balance + v_balance_change,
      updated_at = now()
  WHERE user_id = p_user_id
  AND (p_side = 'sell' OR usdt_balance >= v_total_cost);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Insert order
  INSERT INTO orders (user_id, asset_id, side, quantity, price, status, filled_quantity, average_fill_price, filled_at, order_type)
  VALUES (p_user_id, p_asset_id, p_side, p_quantity, p_price, 'filled', p_quantity, p_price, now(), 'market')
  RETURNING id INTO v_order_id;
  
  -- Get existing portfolio if exists
  SELECT quantity, total_invested INTO v_existing_quantity, v_existing_invested
  FROM portfolios
  WHERE user_id = p_user_id AND asset_id = p_asset_id;
  
  -- Update or insert portfolio
  IF FOUND THEN
    UPDATE portfolios
    SET quantity = v_existing_quantity + CASE WHEN p_side = 'buy' THEN p_quantity ELSE -p_quantity END,
        average_buy_price = p_price,
        total_invested = v_existing_invested + CASE WHEN p_side = 'buy' THEN v_total_cost ELSE -v_total_cost END,
        updated_at = now()
    WHERE user_id = p_user_id AND asset_id = p_asset_id;
  ELSE
    IF p_side = 'buy' THEN
      INSERT INTO portfolios (user_id, asset_id, quantity, average_buy_price, total_invested)
      VALUES (p_user_id, p_asset_id, p_quantity, p_price, v_total_cost);
    END IF;
  END IF;
  
  RETURN v_order_id;
END;
$$;