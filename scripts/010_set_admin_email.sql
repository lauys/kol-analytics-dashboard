-- Update user role to admin for testforys@gmail.com
-- This script will set the specified email as an admin user

DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Find the user ID for the email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'testforys@gmail.com';

  -- If user exists, update their profile
  IF user_uuid IS NOT NULL THEN
    -- Insert or update the profile with admin role
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      user_uuid,
      'testforys@gmail.com',
      'admin',
      NOW(),
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      role = 'admin',
      updated_at = NOW();

    RAISE NOTICE 'Successfully set testforys@gmail.com as admin';
  ELSE
    RAISE NOTICE 'User with email testforys@gmail.com not found. Please sign up first.';
  END IF;
END $$;
