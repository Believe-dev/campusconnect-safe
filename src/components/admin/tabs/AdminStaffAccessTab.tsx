import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

// Keys match Admin.tsx's TabsTrigger values exactly - these are what
// admin_permissions.tab_key rows are checked against.
const TAB_OPTIONS = [
  { key: "users", label: "Users" },
  { key: "sellers", label: "Sellers" },
  { key: "verification", label: "Verify" },
  { key: "appeals", label: "Appeals" },
  { key: "reports", label: "Reports" },
  { key: "escrow", label: "Escrow" },
  { key: "products", label: "Products" },
  { key: "messages", label: "Messages" },
  { key: "emails", label: "Emails" },
  { key: "templates", label: "Templates" },
  { key: "analytics", label: "Analytics" },
  { key: "suggestions", label: "Suggestions" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "wallet", label: "Admin Wallet" },
  { key: "orders", label: "Orders" },
  { key: "settings", label: "Settings" },
];

interface StaffMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
  permissions: Set<string>;
}

// Mounted only for super_admin (gated in Admin.tsx itself) - this is the
// control surface for admin_permissions, and RLS on that table also only
// allows super_admin to write to it regardless, so this is defense in
// depth, not the only guard.
export const AdminStaffAccessTab = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "super_admin"]);
      if (roleError) throw roleError;

      const userIds = [...new Set((roleRows || []).map((r) => r.user_id))];
      if (userIds.length === 0) {
        setStaff([]);
        return;
      }

      const [{ data: profiles }, { data: permissionRows }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
        (supabase.from("admin_permissions") as any).select("user_id, tab_key").in("user_id", userIds),
      ]);

      const rolesByUser = new Map<string, string[]>();
      (roleRows || []).forEach((r) => {
        rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) || []), r.role]);
      });

      const permissionsByUser = new Map<string, Set<string>>();
      (permissionRows || []).forEach((p: { user_id: string; tab_key: string }) => {
        if (!permissionsByUser.has(p.user_id)) permissionsByUser.set(p.user_id, new Set());
        permissionsByUser.get(p.user_id)!.add(p.tab_key);
      });

      setStaff(
        userIds.map((id) => {
          const profile = (profiles || []).find((p: any) => p.user_id === id);
          return {
            user_id: id,
            full_name: profile?.full_name || null,
            email: profile?.email || null,
            roles: rolesByUser.get(id) || [],
            permissions: permissionsByUser.get(id) || new Set(),
          };
        })
      );
    } catch (error) {
      console.error("Error loading staff:", error);
      toast({
        title: "Couldn't load staff list",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const toggleTab = async (userId: string, tabKey: string, currentlyGranted: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const key = `${userId}:${tabKey}`;
    setSaving(key);
    try {
      if (currentlyGranted) {
        const { error } = await supabase
          .from("admin_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("tab_key", tabKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_permissions")
          .insert({ user_id: userId, tab_key: tabKey, granted_by: user?.id });
        if (error) throw error;
      }
      setStaff((prev) =>
        prev.map((s) => {
          if (s.user_id !== userId) return s;
          const next = new Set(s.permissions);
          if (currentlyGranted) next.delete(tabKey);
          else next.add(tabKey);
          return { ...s, permissions: next };
        })
      );
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Couldn't update access",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No admin or super_admin users found.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4" />
          Staff Access
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which admin tabs each staff member can see. Super Admins always have full
          access regardless of what's checked here.
        </p>
      </div>

      <div className="space-y-4">
        {staff.map((member) => {
          const isSuper = member.roles.includes("super_admin");
          return (
            <div key={member.user_id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{member.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                {isSuper && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    Super Admin — full access
                  </span>
                )}
              </div>
              {!isSuper && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {TAB_OPTIONS.map((tab) => {
                    const granted = member.permissions.has(tab.key);
                    const key = `${member.user_id}:${tab.key}`;
                    return (
                      <label
                        key={tab.key}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={granted}
                          disabled={saving === key}
                          onChange={() => toggleTab(member.user_id, tab.key, granted)}
                        />
                        {tab.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminStaffAccessTab;
