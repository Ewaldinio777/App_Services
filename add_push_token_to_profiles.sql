-- Run this SQL in your Supabase SQL Editor to add the push_token column to your profiles table
-- enable the column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token text;

-- (Optional) If you want to index it for faster lookups (though usually looked up by user_id)
-- CREATE INDEX idx_profiles_push_token ON public.profiles(push_token);

-- Make sure RLS (Row Level Security) allows users to update their own push_token
-- Existing policies should cover UPDATE on profiles for auth.uid() = id, but double check.
-- Example policy:
-- CREATE POLICY "Users can update their own profile" ON public.profiles
-- FOR UPDATE USING (auth.uid() = id);
