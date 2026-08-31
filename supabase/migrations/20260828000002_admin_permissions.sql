-- Per-tab admin permission grants, plus the two helper functions that read
-- them. is_admin() (defined in 20250829151240_...sql) is left completely
-- unchanged - it stays the broad "is admin staff at all" boundary used by
-- dozens of existing RLS policies. These are additive, narrower checks used
-- for: (1) which tabs render in the admin UI, and (2) specific high-stakes
-- write actions (role changes, bans, seller/verification approvals, payout
-- approvals) going forward - not a wholesale rewrite of every existing
-- is_admin()-gated policy, which would be a much larger, separate effort.

CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab_key)
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin');
$$;

-- TRUE for super_admin unconditionally, or for admin with an explicit grant
-- for this specific tab_key. Deliberately does NOT fall back to is_admin()
-- alone - an 'admin' with no admin_permissions rows sees nothing, which is
-- the whole point (scoped access instead of all-or-nothing).
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id UUID, _tab_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.admin_permissions
      WHERE user_id = _user_id AND tab_key = _tab_key
    );
$$;

-- Only super_admin can grant/revoke - this is the control surface itself,
-- so a scoped admin (even one with every tab granted) can never expand
-- their own or anyone else's access through it.
CREATE POLICY "Super admins can manage all permission grants"
  ON public.admin_permissions FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Any admin/staff member can see their own grants (to know what they have
-- access to), but not anyone else's.
CREATE POLICY "Admins can view their own permission grants"
  ON public.admin_permissions FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.admin_permissions IS
  'Per-user, per-admin-tab access grants. tab_key matches the TabsTrigger values in src/pages/Admin.tsx. Only meaningful for users holding the admin role - super_admin bypasses this entirely via has_admin_permission().';

-- Grandfather every current admin with full access to every existing tab,
-- so nobody loses access they already have the moment this ships. Dial
-- individual people back afterward via the new Staff Access tab if needed.
INSERT INTO public.admin_permissions (user_id, tab_key)
SELECT ur.user_id, tab.tab_key
FROM public.user_roles ur
CROSS JOIN (VALUES
  ('users'), ('sellers'), ('verification'), ('appeals'), ('reports'),
  ('escrow'), ('products'), ('messages'), ('emails'), ('templates'),
  ('suggestions'), ('subscriptions'), ('wallet'), ('analytics'),
  ('orders'), ('settings')
) AS tab(tab_key)
WHERE ur.role = 'admin'
ON CONFLICT (user_id, tab_key) DO NOTHING;
