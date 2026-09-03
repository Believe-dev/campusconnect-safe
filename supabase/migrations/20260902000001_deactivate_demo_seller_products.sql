-- Deactivates the seeded demo seller's listings ("Amina Bello (Demo Seller)"
-- / "Amina Tech & Books Hub (UNILAG)", user_id 73f1252b-d73d-40ff-b70b-
-- 3bf998a88228) so real customers can no longer see or order them from
-- Marketplace/Search (both filter on products.is_active = true). No orders
-- reference this seller, so this is a plain deactivation, not a cleanup of
-- live transactions - reversible via the same is_active toggle sellers
-- already use on their own listings, scoped to these 3 exact product ids
-- rather than a broad seller-wide query.
update public.products
set is_active = false
where id in (
  'ab9c2465-7be1-4637-90cb-8aad99a0db8e', -- Apple MacBook Pro M1 13-inch
  '986c627b-b8ed-4fde-9433-5ac97bb26b60', -- Sony WH-1000XM4 Headphones
  'a056dbf1-8f5b-4eff-8261-02bb458b481d'  -- Engineering & Calculus Textbook Set
)
and seller_id = '73f1252b-d73d-40ff-b70b-3bf998a88228';
