-- 1. Create a function that invokes the edge function
-- Replace PROJECT_REF with your Supabase Project Reference (e.g. 'abcdefg')
-- Replace FUNCTION_SECRET with your Supabase Anon Key (or create a dedicated one, but usually anon works if public)
-- Usually better to use net.http_post directly? Or the new `webhooks` feature in Dashboard.
-- This SQL approach uses the `pg_net` extension which is available on Supabase.

-- Enable the pg_net extension if not already enabled
create extension if not exists pg_net;

-- Create the trigger function
create or replace function public.handle_new_notification()
returns trigger as $$
declare
  project_url text := 'https://PROJECT_REF.supabase.co/functions/v1/push-notification'; -- Replace PROJECT_REF
  service_role_key text := 'YOUR_SERVICE_ROLE_KEY'; -- Replace with actual key (be careful with SQL files in repo!)
  json_payload jsonb;
begin
  json_payload = jsonb_build_object(
      'record', row_to_json(new),
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public'
  );

  perform
    net.http_post(
      url := project_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key -- Securely stored or retrieved ideally
      ),
      body := json_payload
    );

  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
create trigger on_notification_created
  after insert on public.notifications
  for each row execute procedure public.handle_new_notification();
