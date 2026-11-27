-- Fixes the super_admin lockout bug: the founder edited their own user_roles
-- row's role value from 'admin' straight to 'super_admin' (a single UPDATE in
-- place, not the documented "insert both rows" bootstrap from
-- 20260828000001_super_admin_role.sql), which silently dropped their admin
-- access - is_admin() (and the dashboard's own gate, see the paired
-- Admin.tsx fix in this same change) checks specifically for the 'admin'
-- role row, not 'super_admin'. They reverted back to 'admin' themselves to
-- regain access, which is why the live data shows zero super_admin rows
-- today despite this having happened.
--
-- The system already intended "a super_admin always also holds admin" (see
-- that migration's bootstrap comment) but never enforced it, and there is no
-- app UI to grant super_admin at all - the only path is a manual SQL insert,
-- easy to get wrong exactly like this. This migration makes the invariant
-- structural instead of documentation-only, so it can't be violated again
-- regardless of how a super_admin row is created (SQL editor, table editor,
-- a future admin UI) or edited in place.

-- ============================================================================
-- 1. Any row that becomes 'super_admin' (via INSERT, or via UPDATE - the
--    exact mistake that caused this incident) automatically gets a paired
--    'admin' row for the same user. Idempotent via ON CONFLICT, and safe
--    against recursion: the INSERT below writes role='admin', which never
--    matches this trigger's own WHEN (NEW.role = 'super_admin') clause, so
--    it does not re-fire itself.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_super_admin_implies_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_super_admin_implies_admin ON public.user_roles;
CREATE TRIGGER trigger_super_admin_implies_admin
    AFTER INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    WHEN (NEW.role = 'super_admin')
    EXECUTE FUNCTION public.enforce_super_admin_implies_admin();

-- ============================================================================
-- 2. Block removing the 'admin' row from a user who still holds
--    'super_admin' - closes the reverse gap (downgrading admin away while
--    leaving a dangling super_admin) that item 1 alone doesn't cover. Revoke
--    super_admin first, then admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_dangling_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = OLD.user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Cannot remove the admin role from % while they still hold super_admin. Revoke super_admin first.', OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_dangling_super_admin ON public.user_roles;
CREATE TRIGGER trigger_prevent_dangling_super_admin
    BEFORE DELETE ON public.user_roles
    FOR EACH ROW
    WHEN (OLD.role = 'admin')
    EXECUTE FUNCTION public.prevent_dangling_super_admin();

-- ============================================================================
-- 3. Backfill: general safety net for any account that is (or ever becomes,
--    before this migration's triggers existed) super_admin without admin.
--    A no-op today (confirmed via the live data: zero super_admin rows
--    exist right now), but general rather than tied to one account, so any
--    future occurrence of this exact failure mode self-heals on deploy.
-- ============================================================================

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.user_roles
WHERE role = 'super_admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- 4. Grant the founder real super_admin - what they were originally trying
--    to do. Paired with their existing 'admin' row (confirmed via the live
--    data: they already hold 'admin', nothing else). Safe this time: item 1
--    above means this INSERT is redundant with their existing admin row
--    (ON CONFLICT DO NOTHING), and item 2 means it can no longer be
--    accidentally dropped by editing the row in place.
-- ============================================================================

INSERT INTO public.user_roles (user_id, role)
VALUES ('197cc55f-a224-4bcb-9f0c-f4abd3639626', 'super_admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
