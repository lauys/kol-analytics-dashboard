-- This script helps you promote a user to admin role
-- First, you need to sign up through the UI with your email
-- Then, run this query with your email address to become admin

-- IMPORTANT: Replace 'your-admin-email@example.com' with your actual email
UPDATE public.profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-admin-email@example.com';

-- Check if the update was successful
SELECT id, email, role, created_at 
FROM public.profiles 
WHERE role = 'admin';
