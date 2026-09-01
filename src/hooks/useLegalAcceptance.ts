import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/lib/legalVersions";

// (version ?? 0) < CURRENT_VERSION deliberately has no separate "is this
// NULL" branch - NULL (never accepted) and a real stale version number are
// treated identically, on purpose. That's what makes this the actual safety
// net for the retry-exhausted edge case in SignupPage.tsx's
// recordLegalAcceptance: a user who genuinely checked the box at signup but
// whose write never landed looks exactly like a user who never consented,
// and gets the same prompt either way.
export const useLegalAcceptance = () => {
  const { user } = useAuth();
  const [needsReconsent, setNeedsReconsent] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user) {
      setNeedsReconsent(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase.from("profiles") as any)
      .select("terms_accepted_version, privacy_accepted_version")
      .eq("user_id", user.id)
      .maybeSingle();

    const termsStale =
      ((data?.terms_accepted_version as number | null) ?? 0) < CURRENT_TERMS_VERSION;
    const privacyStale =
      ((data?.privacy_accepted_version as number | null) ?? 0) < CURRENT_PRIVACY_VERSION;

    setNeedsReconsent(termsStale || privacyStale);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    check();
  }, [check]);

  const acceptCurrentVersions = async () => {
    if (!user) return false;
    const { error } = await supabase
      .from("profiles")
      .update({
        terms_accepted_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_version: CURRENT_PRIVACY_VERSION,
        privacy_accepted_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) return false;
    setNeedsReconsent(false);
    return true;
  };

  return { needsReconsent, loading, acceptCurrentVersions };
};
