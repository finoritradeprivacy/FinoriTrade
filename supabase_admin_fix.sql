-- SQL Script to bootstrap the first Admin user
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Replace 'YOUR_EMAIL_HERE' with your login email address
-- Example: 'john.doe@example.com'
DO $$
DECLARE
  target_email TEXT := 'YOUR_EMAIL_HERE'; -- <--- CHANGE THIS
  target_user_id UUID;
BEGIN
  -- Find the user ID by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found!', target_email;
  ELSE
    -- Insert into user_roles if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Success: User % (ID: %) is now an Admin.', target_email, target_user_id;
  END IF;
END $$;
