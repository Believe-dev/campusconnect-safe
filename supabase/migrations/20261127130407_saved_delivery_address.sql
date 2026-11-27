-- A delivery address is private information. Keep it out of public.profiles,
-- which is intentionally visible to marketplace users, and grant access only
-- to the signed-in owner of this one-row-per-user address book.
CREATE TABLE public.user_delivery_addresses (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address text NOT NULL CHECK (char_length(trim(address)) BETWEEN 5 AND 500),
  city text NOT NULL CHECK (char_length(trim(city)) BETWEEN 2 AND 120),
  state text NOT NULL CHECK (char_length(trim(state)) BETWEEN 2 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_delivery_addresses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_delivery_addresses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_delivery_addresses TO authenticated;

CREATE POLICY "Users can view their saved delivery address"
  ON public.user_delivery_addresses
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can save their delivery address"
  ON public.user_delivery_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their delivery address"
  ON public.user_delivery_addresses
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

COMMENT ON TABLE public.user_delivery_addresses IS
  'Private default delivery address for checkout. Only the owning authenticated user can read or change it.';
