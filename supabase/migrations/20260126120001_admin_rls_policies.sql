-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy for Admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR auth.uid() = id
);

-- Policy for Admins to view all player stats
DROP POLICY IF EXISTS "Admins can view all player stats" ON public.player_stats;
CREATE POLICY "Admins can view all player stats"
ON public.player_stats
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
);

-- Policy for Admins to update all player stats (needed for role changes)
DROP POLICY IF EXISTS "Admins can update all player stats" ON public.player_stats;
CREATE POLICY "Admins can update all player stats"
ON public.player_stats
FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
);

-- Policy for Admins to view all balances
DROP POLICY IF EXISTS "Admins can view all user balances" ON public.user_balances;
CREATE POLICY "Admins can view all user balances"
ON public.user_balances
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR auth.uid() = user_id
);

-- Policy for Admins to update balances
DROP POLICY IF EXISTS "Admins can update all user balances" ON public.user_balances;
CREATE POLICY "Admins can update all user balances"
ON public.user_balances
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
);

-- Policies for user_roles
-- Admins can insert roles (promote)
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- Admins can delete roles (demote)
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- Ensure admins can view all roles (if not covered by previous policy)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR user_id = auth.uid()
);
