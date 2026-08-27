-- The original INSERT policy on product_reviews (see
-- 20250101000010_add_reviews_and_suggestions.sql) referenced NEW.product_id
-- in its WITH CHECK clause. NEW/OLD are trigger-only pseudo-records — they
-- aren't valid in a row-level security expression — so this policy has
-- never actually been creatable, meaning every INSERT into product_reviews
-- has been running under RLS default-deny (no working INSERT policy at
-- all) regardless of purchase history. Replacing it with a corrected
-- version (unqualified product_id, which Postgres resolves against the row
-- being inserted) fixes that, and adds an admin bypass so admins can leave
-- a review on any product without needing a confirmed order on record.
DROP POLICY IF EXISTS "Users can create product reviews for purchased items" ON product_reviews;

CREATE POLICY "Users can create product reviews for purchased items" ON product_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND (
      EXISTS (
        SELECT 1 FROM orders
        WHERE orders.product_id = product_reviews.product_id
        AND orders.buyer_id = auth.uid()
        AND orders.status = 'confirmed'
      )
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
    )
  );
