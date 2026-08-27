-- update_bank_details took user_email/user_password parameters but never
-- actually verified the password against anything - it was accepted,
-- ignored, and the real (only) check was already just auth.uid() =
-- <id looked up by user_email>. That means a plaintext password was
-- traveling over the wire and through logs for zero security benefit.
-- Dropping both parameters entirely and keying off auth.uid() directly,
-- same pattern as the item-1 fixes.
--
-- Also renaming the remaining parameters with a p_ prefix: the original
-- had `bank_name TEXT` as a parameter name colliding with the
-- profiles.bank_name column it assigns in `SET bank_name = bank_name`,
-- which is ambiguous under plpgsql's default variable_conflict=error and
-- would raise "column reference bank_name is ambiguous" at call time -
-- confirmed by testing the original body directly (see verification notes).

CREATE OR REPLACE FUNCTION update_bank_details(
  p_account_name TEXT,
  p_account_number TEXT,
  p_bank_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  UPDATE profiles
  SET
    bank_account_name = p_account_name,
    bank_account_number = p_account_number,
    bank_name = p_bank_name,
    updated_at = NOW()
  WHERE user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- Old (user_email TEXT, user_password TEXT, account_name TEXT, account_number
-- TEXT, bank_name TEXT) overload: drop it outright rather than leaving it
-- alongside the new one - a stale overload with a plaintext password
-- parameter sitting unused in the schema is exactly the kind of landmine
-- item 1 was about.
DROP FUNCTION IF EXISTS update_bank_details(TEXT, TEXT, TEXT, TEXT, TEXT);

GRANT EXECUTE ON FUNCTION update_bank_details(TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION update_bank_details IS 'Self-only. Updates the caller''s own profile bank fields via auth.uid() - no identity parameters accepted.';
