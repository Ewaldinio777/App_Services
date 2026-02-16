-- Fix for provider rating trigger
-- The reviews table links to orders, and orders link to providers.
-- The reviews table structure is:
-- id, order_id, reviewer_id, rating, comment, complaint, created_at

-- The previous trigger function likely failed because it tried to access NEW.provider_id which doesn't exist in reviews.
-- We must fetch the provider_id from the related order.

CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_provider_id uuid;
BEGIN
  -- Get the provider_id from the order related to this review
  SELECT provider_id INTO target_provider_id
  FROM orders
  WHERE id = NEW.order_id;

  -- If no provider found (shouldn't happen for valid orders), exit
  IF target_provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update the provider's rating and review count
  -- We need to join with orders table to count all reviews for this provider
  UPDATE providers
  SET 
    rating = (
      SELECT COALESCE(AVG(r.rating), 0)::DECIMAL(3,2)
      FROM reviews r
      JOIN orders o ON r.order_id = o.id
      WHERE o.provider_id = target_provider_id
      AND r.rating IS NOT NULL
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews r
      JOIN orders o ON r.order_id = o.id
      WHERE o.provider_id = target_provider_id
      AND r.rating IS NOT NULL
    )
  WHERE id = target_provider_id;

  RETURN NEW;
END;
$$ language 'plpgsql';
