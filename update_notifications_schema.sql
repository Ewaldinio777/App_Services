-- SQL to update notifications table for better UI support
-- Adds a JSONB column to store extra data like avatar_url, thumbnail_url, route_params, etc.

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Example usage:
-- INSERT INTO notifications (user_id, title, body, type, metadata)
-- VALUES (
--   'user_uuid', 
--   'Nueva Orden', 
--   'Tu orden ha sido aceptada', 
--   'order_update', 
--   '{"avatar_url": "https://...", "thumbnail_url": "https://...", "route": "OrderDetail", "params": {"orderId": "123"}}'
-- );
