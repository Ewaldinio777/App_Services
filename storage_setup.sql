-- Enable the storage extension if not already enabled (usually enabled by default in Supabase projects)
-- create extension if not exists "uuid-ossp";

-- Create a storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Set up security policies for the 'avatars' bucket

-- 1. Allow public access to view avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- 2. Allow authenticated users to upload an avatar
create policy "Anyone can upload an avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 3. Allow users to update their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  using ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 4. Allow users to delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using ( bucket_id = 'avatars' AND auth.uid() = owner );
