-- Enable INSERT for authenticated users on notifications table
-- This allows client-side code (Ordenes.tsx, ScheduleServiceScreen.tsx) to create notifications

CREATE POLICY "Users can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Optional: If you want to restrict users to only insert notifications for others (not spam themselves), 
-- you can try to enforce logic, but simplistic 'authenticated' is usually fine for this app stage.
