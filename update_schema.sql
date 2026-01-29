-- Add is_read column to messages table
ALTER TABLE public.messages ADD COLUMN is_read boolean DEFAULT false;

-- Policy to allow users to update is_read (mark as read)
-- Ensure your RLS policies allow updating messages where you are a participant in the chat
-- Typically: UPDATE policy for messages using ((auth.uid() IN (SELECT participant_1_id FROM chats WHERE id = chat_id)) OR (auth.uid() IN (SELECT participant_2_id FROM chats WHERE id = chat_id)))
