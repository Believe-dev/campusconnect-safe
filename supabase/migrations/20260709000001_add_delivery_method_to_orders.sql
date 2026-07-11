-- Buyers choose pickup or delivery at checkout; sellers need to see which
-- one was chosen to know how to fulfill the order.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'delivery'
  CHECK (delivery_method IN ('pickup', 'delivery'));
