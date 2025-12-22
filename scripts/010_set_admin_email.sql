-- Update user role to admin for testforadmin@titannet.io
-- This script will:
-- 1. Set the email as verified (no email confirmation needed)
-- 2. Set the user as admin in profiles table

DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Find the user ID for the email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'testforadmin@titannet.io';

  -- If user exists, update their email confirmation and profile
  IF user_uuid IS NOT NULL THEN
    -- Step 1: Set email as confirmed (no email verification needed)
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = user_uuid;

    -- Step 2: Insert or update the profile with admin role
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      user_uuid,
      'testforadmin@titannet.io',
      'admin',
      NOW(),
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      role = 'admin',
      email = 'testforadmin@titannet.io',
      updated_at = NOW();

    RAISE NOTICE 'Successfully set testforadmin@titannet.io as admin and verified email';
  ELSE
    RAISE NOTICE 'User with email testforadmin@titannet.io not found. Please sign up first.';
  END IF;
END $$;
