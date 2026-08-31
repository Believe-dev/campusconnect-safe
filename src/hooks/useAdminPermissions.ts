import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Deliberately separate from useAuth() rather than folded into it - useAuth
// is called independently in ~50 files across the app, and only Admin.tsx
// (and the future Staff Access tab) actually need per-tab grants, so this
// keeps that extra query out of every other call site.
export const useAdminPermissions = () => {
  const { user, isSuperAdmin } = useAuth();
  const [allowedTabs, setAllowedTabs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setAllowedTabs(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase.from("admin_permissions") as any)
      .select("tab_key")
      .eq("user_id", user.id);
    setAllowedTabs(new Set((data || []).map((row: { tab_key: string }) => row.tab_key)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // super_admin bypasses this entirely - never gated by an explicit grant row.
  const canAccessTab = (tabKey: string) => isSuperAdmin || allowedTabs.has(tabKey);

  return { allowedTabs, canAccessTab, loading, refetch: fetchPermissions };
};
