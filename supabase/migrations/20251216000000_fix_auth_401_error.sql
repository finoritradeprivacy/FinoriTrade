-- =============================================
-- FIX AUTH 401 ERROR - Ensure database is properly configured for authentication
-- =============================================

-- Ensure the handle_new_user trigger exists and works correctly
-- This trigger is critical for user creation but should not interfere with login
DO $$
BEGIN
  -- Check if trigger exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    -- Create trigger on auth.users if it doesn't exist
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Ensure all auth.users have corresponding profiles
-- Missing profiles should not block login, but let's ensure they exist
INSERT INTO public.profiles (id, email, nickname)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'nickname',
    'Player_' || substring(au.id::text from 1 for 8)
  )
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure all users have balances
INSERT INTO public.user_balances (user_id, usdt_balance)
SELECT 
  au.id,
  100000.00
FROM auth.users au
LEFT JOIN public.user_balances ub ON au.id = ub.user_id
WHERE ub.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Ensure all users have player stats
INSERT INTO public.player_stats (user_id, total_xp, level)
SELECT 
  au.id,
  0,
  1
FROM auth.users au
LEFT JOIN public.player_stats ps ON au.id = ps.user_id
WHERE ps.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Ensure the is_admin() function works correctly and doesn't cause issues
-- This function is called during login check, so it must work properly
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Ensure the has_role function works correctly
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Ensure RLS policies on user_roles don't block authentication checks
-- The is_admin() function uses SECURITY DEFINER, so it should bypass RLS
-- But let's make sure the policies are correct
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin() OR user_id = auth.uid());

-- Ensure profiles table policies allow proper access
-- Users should be able to view their own profile (needed for login checks)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Ensure admins can also view all profiles (for admin checks)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin() OR auth.uid() = id);

-- Ensure user_balances policies allow proper access
DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balances;
CREATE POLICY "Users can view their own balance"
ON public.user_balances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ensure player_stats policies allow proper access
DROP POLICY IF EXISTS "Users can view their own stats" ON public.player_stats;
CREATE POLICY "Users can view their own stats"
ON public.player_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Note: The 401 error from Supabase auth endpoint is typically caused by:
-- 1. Invalid credentials (wrong email/password)
-- 2. Email not verified (if email confirmation is required)
-- 3. Account disabled/banned
-- 4. Incorrect Supabase URL or API key in environment variables
-- 
-- This migration ensures the database is properly configured, but if the error
-- persists, check:
-- - Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
-- - Supabase project settings (email confirmation requirements)
-- - User account status in Supabase dashboard

