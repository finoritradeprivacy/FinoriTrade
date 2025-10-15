-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_profit_loss DECIMAL(20, 2) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create assets table (cryptocurrencies, stocks, etc.)
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'crypto',
  current_price DECIMAL(20, 8) NOT NULL,
  price_change_24h DECIMAL(10, 4) DEFAULT 0,
  volume_24h DECIMAL(20, 2) DEFAULT 0,
  market_cap DECIMAL(20, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assets (public read)
CREATE POLICY "Anyone can view active assets" ON public.assets
  FOR SELECT USING (is_active = true);

-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  average_buy_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_invested DECIMAL(20, 2) NOT NULL DEFAULT 0,
  unrealized_pnl DECIMAL(20, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, asset_id)
);

-- Enable RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolios
CREATE POLICY "Users can view their own portfolio" ON public.portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own portfolio" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio" ON public.portfolios
  FOR UPDATE USING (auth.uid() = user_id);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8),
  stop_price DECIMAL(20, 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'rejected')),
  filled_quantity DECIMAL(20, 8) DEFAULT 0,
  average_fill_price DECIMAL(20, 8) DEFAULT 0,
  time_in_force TEXT DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filled_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trades table
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  total_value DECIMAL(20, 2) NOT NULL,
  fee DECIMAL(20, 8) DEFAULT 0,
  realized_pnl DECIMAL(20, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trades
CREATE POLICY "Users can view their own trades" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

-- Create user balances table
CREATE TABLE public.user_balances (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  usdt_balance DECIMAL(20, 2) NOT NULL DEFAULT 100000.00,
  locked_balance DECIMAL(20, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balances
CREATE POLICY "Users can view their own balance" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" ON public.user_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON public.user_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to create user balance when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_balances (user_id, usdt_balance)
  VALUES (NEW.id, 100000.00);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert some initial assets
INSERT INTO public.assets (symbol, name, asset_type, current_price, price_change_24h, volume_24h, market_cap) VALUES
('BTC', 'Bitcoin', 'crypto', 43250.50, 2.45, 28500000000, 850000000000),
('ETH', 'Ethereum', 'crypto', 2280.75, 3.12, 15200000000, 275000000000),
('SOL', 'Solana', 'crypto', 98.45, -1.23, 2400000000, 42000000000),
('BNB', 'Binance Coin', 'crypto', 315.80, 1.87, 1200000000, 48000000000),
('XRP', 'Ripple', 'crypto', 0.5234, 5.67, 1800000000, 28000000000);