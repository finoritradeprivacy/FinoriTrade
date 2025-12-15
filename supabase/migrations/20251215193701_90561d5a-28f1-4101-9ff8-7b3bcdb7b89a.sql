-- Fix PUBLIC_DATA_EXPOSURE: Restrict profile reads to owner + admin only
-- Drop the overly permissive policy that allows any user to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- The existing policies "Users can view their own profile" and "Admins can view all profiles" 
-- already provide proper access control, so no new policies needed