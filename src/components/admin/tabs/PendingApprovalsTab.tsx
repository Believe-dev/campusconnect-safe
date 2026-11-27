import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerProfileUpdate } from "@/utils/realTimeEvents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Eye,
  CheckSquare,
  UserX,
  UserCheck,
  Shield,
  RefreshCw,
  Search,
} from "lucide-react";

// Sellers ("become a seller") and verification badges ("get a trusted-user
// checkmark") are genuinely different actions on different tables - kept as
// two separate sections with their own fetch/approve/reject logic below,
// not merged into one generic queue. What's actually shared is the
// surrounding table/dialog UI, which used to be two copy-pasted
// implementations (confirmed via the original investigation - the since-
// deleted SellerApprovalsTab.tsx and this file's Verification tab had
// near-identical, hand-duplicated "profile viewer" dialogs).
//
// Both sections keep their own admin_permissions tab_key ('sellers' /
// 'verification') rather than collapsing into one - a Super Admin may want
// to delegate seller-application review to one staff member without also
// handing them verification-badge review. The merge is UI-only.

interface PendingPerson {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  account_type: string;
  university_name: string | null;
  student_id?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  face_photo_url: string | null;
  avatar_url?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
  is_verified?: boolean | null;
  created_at: string;
  verification_request_id?: string;
}

interface PendingApprovalsTabProps {
  canAccessSellers: boolean;
  canAccessVerification: boolean;
  // Lets the parent's own Users tab data stay in sync without this
  // component needing to know about (or duplicate) that fetch logic.
  onUserDataChanged?: () => void;
  onCountsChange?: (sellersCount: number, verificationCount: number) => void;
}

const getImageUrl = (filePath: string | null | undefined) => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  const { data } = supabase.storage
    .from("verification-photos")
    .getPublicUrl(filePath);
  return data.publicUrl;
};

const getInitials = (name: string | null | undefined) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

// Shared by both sections - previously only the Verification tab had a rich
// detail view (Sellers only had a bare "Face Photo" quick-look), and the two
// tabs' versions of this were hand-duplicated JSX. One component now, used
// by both, upgrading Sellers to the same detail rather than the other way
// around.
const ProfileViewerDialog = ({ person }: { person: PendingPerson }) => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
      >
        <Eye className="h-4 w-4" />
        View Profile
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-flora-ink">
          {person.full_name || "User"}
        </DialogTitle>
        <DialogDescription className="text-flora-muted">
          View full applicant details and verification photo
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={person.avatar_url || undefined} />
              <AvatarFallback className="bg-flora-ink text-white">
                {getInitials(person.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg text-flora-ink">
                {person.full_name}
              </h3>
              <p className="text-flora-muted">{person.email}</p>
              <div className="flex gap-2 mt-1">
                <span className="rounded-full bg-flora-chip px-2.5 py-0.5 text-xs font-medium text-flora-ink">
                  {person.account_type}
                </span>
                {person.is_verified && (
                  <span className="rounded-full bg-flora-leaf/15 px-2.5 py-0.5 text-xs font-medium text-flora-leaf">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="font-medium text-flora-ink">University</Label>
              <p className="text-flora-muted">
                {person.university_name || "Not set"}
              </p>
            </div>
            <div>
              <Label className="font-medium text-flora-ink">Student ID</Label>
              <p className="text-flora-muted">
                {person.student_id || "Not set"}
              </p>
            </div>
            <div>
              <Label className="font-medium text-flora-ink">Phone</Label>
              <p className="text-flora-muted">
                {person.phone_number || "Not set"}
              </p>
            </div>
            <div>
              <Label className="font-medium text-flora-ink">Rating</Label>
              <p className="text-flora-muted">
                {person.rating?.toFixed(1) || "0.0"} (
                {person.total_reviews || 0} reviews)
              </p>
            </div>
          </div>

          {person.bio && (
            <div>
              <Label className="font-medium text-flora-ink">Bio</Label>
              <p className="text-sm text-flora-muted">{person.bio}</p>
            </div>
          )}
        </div>

        <div>
          <Label className="font-medium mb-2 block text-flora-ink">
            Face Verification Photo
          </Label>
          {person.face_photo_url ? (
            <img
              src={getImageUrl(person.face_photo_url) || undefined}
              alt="Face verification"
              className="w-full max-w-xs h-auto rounded-2xl border border-flora-ink/10"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <p className="text-flora-muted text-sm">No face photo uploaded</p>
          )}
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export const PendingApprovalsTab = ({
  canAccessSellers,
  canAccessVerification,
  onUserDataChanged,
  onCountsChange,
}: PendingApprovalsTabProps) => {
  const [activeView, setActiveView] = useState<"sellers" | "verification">(
    canAccessSellers ? "sellers" : "verification"
  );
  const [pendingSellers, setPendingSellers] = useState<PendingPerson[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<
    PendingPerson[]
  >([]);
  const [sellerSearch, setSellerSearch] = useState("");
  const [verificationSearch, setVerificationSearch] = useState("");

  const fetchPendingSellers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          user_id,
          full_name,
          email,
          university_name,
          campus,
          student_id,
          phone_number,
          bio,
          account_type,
          rating,
          total_reviews,
          face_photo_url,
          created_at,
          is_banned,
          verification_status,
          is_verified,
          seller_status,
          seller_registration_paid
        `
        )
        .or("account_type.eq.seller,seller_registration_paid.eq.true")
        .or("seller_status.is.null,seller_status.eq.pending")
        .eq("is_banned", false)
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching pending sellers:", profilesError);
        setPendingSellers([]);
        return;
      }

      const transformedData = (profiles || []).map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name || "Unknown",
        email: profile.email || "Unknown",
        university_name: profile.university_name || "N/A",
        student_id: profile.student_id || "N/A",
        phone_number: profile.phone_number || "N/A",
        bio: profile.bio || "No bio provided",
        account_type: profile.account_type || "buyer",
        rating: profile.rating || 0,
        total_reviews: profile.total_reviews || 0,
        avatar_url: getImageUrl(profile.face_photo_url),
        face_photo_url: getImageUrl(profile.face_photo_url),
        created_at: profile.created_at,
        is_verified: profile.is_verified || false,
      }));

      setPendingSellers(transformedData);
    } catch (error) {
      console.error("Error in fetchPendingSellers:", error);
      setPendingSellers([]);
    }
  };

  const fetchVerificationRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!requests || requests.length === 0) {
        setVerificationRequests([]);
        return;
      }

      const userIds = requests.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      const transformedData = requests.map((request) => {
        const profile = profiles?.find((p) => p.user_id === request.user_id);
        return {
          id: profile?.id || request.id,
          user_id: request.user_id,
          full_name: profile?.full_name || "Unknown",
          email: profile?.email || "Unknown",
          university_name: profile?.university_name || "N/A",
          student_id: profile?.student_id || "N/A",
          phone_number: profile?.phone_number || "N/A",
          bio: profile?.bio || "No bio provided",
          account_type: profile?.account_type || "buyer",
          rating: profile?.rating || 0,
          total_reviews: profile?.total_reviews || 0,
          avatar_url: profile?.avatar_url,
          face_photo_url: profile?.avatar_url,
          created_at: request.created_at,
          is_verified: profile?.is_verified || false,
          verification_request_id: request.id,
        };
      });

      setVerificationRequests(transformedData);
    } catch (error) {
      setVerificationRequests([]);
    }
  };

  useEffect(() => {
    fetchPendingSellers();
    fetchVerificationRequests();
  }, []);

  useEffect(() => {
    onCountsChange?.(pendingSellers.length, verificationRequests.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSellers.length, verificationRequests.length]);

  const approveSeller = async (
    userId: string,
    userEmail: string,
    fullName: string
  ) => {
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ seller_status: "approved", account_type: "seller" })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "buyer");

      await supabase.from("user_roles").upsert(
        { user_id: userId, role: "seller" },
        { onConflict: "user_id,role" }
      );

      const { sendNotification } = await import(
        "@/utils/notificationService"
      );
      await sendNotification({
        userId,
        title: "Seller Account Approved! 🎉",
        message:
          "Congratulations! Your seller verification has been approved. You can now start listing items on UniMarket.",
        type: "success",
        url: "/dashboard",
      });

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await sendNotification({
            userId: admin.user_id,
            title: "Seller Approved",
            message: `${fullName} has been approved as a seller`,
            type: "info",
            url: "/admin",
          });
        }
      }

      try {
        await supabase.functions.invoke("send-notification-email", {
          body: { email: userEmail, name: fullName, type: "approved" },
        });
      } catch {
        // Email notification failed silently
      }

      toast.success("Seller approved successfully");
      fetchPendingSellers();
      onUserDataChanged?.();
      triggerProfileUpdate();
      window.dispatchEvent(
        new CustomEvent("profileUpdated", { detail: { userId } })
      );
    } catch (error) {
      toast.error("Failed to approve seller");
    }
  };

  const rejectSeller = async (
    userId: string,
    userEmail: string,
    fullName: string,
    rejectionReason: string
  ) => {
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          seller_status: "rejected",
          account_type: "buyer",
          admin_notes: rejectionReason,
        })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "seller");

      const { sendNotification } = await import(
        "@/utils/notificationService"
      );
      await sendNotification({
        userId,
        title: "Seller Application Update",
        message: `Your seller application was not approved at this time. Reason: ${rejectionReason}. Your account has been converted to buyer-only. You can still browse and purchase items.`,
        type: "warning",
        url: "/profile",
      });

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await sendNotification({
            userId: admin.user_id,
            title: "Seller Rejected",
            message: `${fullName}'s seller application has been rejected`,
            type: "warning",
            url: "/admin",
          });
        }
      }

      try {
        await supabase.functions.invoke("send-notification-email", {
          body: { email: userEmail, name: fullName, type: "rejected" },
        });
      } catch {
        // Email notification failed silently
      }

      toast.success("Seller application rejected");
      fetchPendingSellers();
      onUserDataChanged?.();
      triggerProfileUpdate();
    } catch (error) {
      toast.error("Failed to reject seller");
    }
  };

  const approveVerification = async (
    requestId: string,
    userId: string,
    _userEmail: string,
    _fullName: string
  ) => {
    try {
      await supabase
        .from("verification_requests")
        .update({ status: "approved" })
        .eq("id", requestId);

      await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("user_id", userId);

      const { sendNotification } = await import(
        "@/utils/notificationService"
      );
      await sendNotification({
        userId,
        title: "Account Verified! ✅",
        message:
          "Congratulations! Your account has been verified. You now have a verified badge on your profile.",
        type: "success",
        url: "/profile",
      });

      toast.success("User verification approved");
      fetchVerificationRequests();
      onUserDataChanged?.();
    } catch (error) {
      toast.error("Failed to approve verification");
    }
  };

  const rejectVerification = async (
    requestId: string,
    userId: string,
    _userEmail: string,
    _fullName: string,
    rejectionReason: string
  ) => {
    try {
      await supabase
        .from("verification_requests")
        .update({ status: "rejected", admin_notes: rejectionReason })
        .eq("id", requestId);

      const { sendNotification } = await import(
        "@/utils/notificationService"
      );
      await sendNotification({
        userId,
        title: "Verification Request Rejected",
        message: `Your verification request was rejected. Reason: ${rejectionReason}. You can submit a new request.`,
        type: "warning",
        url: "/profile",
      });

      toast.success("Verification request rejected");
      fetchVerificationRequests();
      onUserDataChanged?.();
    } catch (error) {
      toast.error("Failed to reject verification");
    }
  };

  const showToggle = canAccessSellers && canAccessVerification;

  const filteredSellers = pendingSellers.filter((seller) => {
    const q = sellerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      seller.full_name?.toLowerCase().includes(q) ||
      seller.email?.toLowerCase().includes(q) ||
      seller.university_name?.toLowerCase().includes(q)
    );
  });

  const filteredVerificationRequests = verificationRequests.filter((user) => {
    const q = verificationSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      user.full_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.university_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-flora-ink">Approvals</h2>
        {showToggle && (
          <div className="flex items-center gap-1 rounded-full border border-flora-ink/15 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveView("sellers")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeView === "sellers"
                  ? "bg-flora-ink text-white"
                  : "text-flora-ink hover:bg-flora-chip"
              }`}
            >
              Seller Applications
              {pendingSellers.length > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeView === "sellers"
                      ? "bg-white/20 text-white"
                      : "bg-flora-chip text-flora-ink"
                  }`}
                >
                  {pendingSellers.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView("verification")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeView === "verification"
                  ? "bg-flora-ink text-white"
                  : "text-flora-ink hover:bg-flora-chip"
              }`}
            >
              Verification Badges
              {verificationRequests.length > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeView === "verification"
                      ? "bg-white/20 text-white"
                      : "bg-flora-chip text-flora-ink"
                  }`}
                >
                  {verificationRequests.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {(showToggle ? activeView === "sellers" : canAccessSellers) && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-flora-muted">
              Approve or reject users who want to become sellers on the
              platform
            </p>
            <button
              type="button"
              onClick={fetchPendingSellers}
              className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
            <Input
              placeholder="Search by name, email, or university..."
              value={sellerSearch}
              onChange={(e) => setSellerSearch(e.target.value)}
              className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
            />
          </div>
          {pendingSellers.length === 0 ? (
            <div className="py-12 text-center">
              <UserCheck className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
              <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                No pending seller approvals
              </h3>
              <p className="text-flora-muted">
                All seller account requests have been processed
              </p>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
              <p className="text-flora-muted">
                No applicants match "{sellerSearch}"
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                    <TableHead className="text-flora-ink">Applicant</TableHead>
                    <TableHead className="text-flora-ink">Email</TableHead>
                    <TableHead className="text-flora-ink">University</TableHead>
                    <TableHead className="text-flora-ink">Applied</TableHead>
                    <TableHead className="text-flora-ink">Photo</TableHead>
                    <TableHead className="text-flora-ink">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellers.map((seller) => (
                    <TableRow
                      key={seller.id}
                      className="hover:bg-flora-chip/20"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={seller.avatar_url || undefined}
                              alt={seller.full_name || ""}
                            />
                            <AvatarFallback className="bg-flora-ink text-white text-sm">
                              {getInitials(seller.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-flora-ink">
                              {seller.full_name || "N/A"}
                            </p>
                            <p className="text-xs text-flora-muted">
                              ID: {seller.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-flora-ink">
                          {seller.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-flora-muted">
                        {seller.university_name || "N/A"}
                      </TableCell>
                      <TableCell className="text-flora-muted">
                        {new Date(seller.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <ProfileViewerDialog person={seller} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink px-3.5 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                              >
                                <CheckSquare className="h-4 w-4" />
                                Approve
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-flora-ink">
                                  Approve Seller Application
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-flora-muted">
                                  Are you sure you want to approve{" "}
                                  {seller.full_name || "this user"}'s seller
                                  application? This will allow them to list
                                  items on the marketplace and they will
                                  receive an email notification.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    approveSeller(
                                      seller.user_id,
                                      seller.email,
                                      seller.full_name || "User"
                                    )
                                  }
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                              >
                                <UserX className="h-4 w-4" />
                                Reject
                              </button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                              <DialogHeader>
                                <DialogTitle className="text-flora-ink">
                                  Reject Seller Application
                                </DialogTitle>
                                <DialogDescription className="text-flora-muted">
                                  Provide a reason for rejecting{" "}
                                  {seller.full_name || "this user"}'s seller
                                  application. Their account will be
                                  converted to buyer-only and they will
                                  receive an email notification including
                                  this reason.
                                </DialogDescription>
                              </DialogHeader>
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const formData = new FormData(
                                    e.currentTarget
                                  );
                                  const reason = formData.get(
                                    "seller_rejection_reason"
                                  ) as string;
                                  if (reason.trim()) {
                                    rejectSeller(
                                      seller.user_id,
                                      seller.email,
                                      seller.full_name || "User",
                                      reason.trim()
                                    );
                                  }
                                }}
                              >
                                <div className="space-y-4">
                                  <div>
                                    <Label
                                      htmlFor="seller_rejection_reason"
                                      className="text-flora-ink"
                                    >
                                      Rejection Reason *
                                    </Label>
                                    <Textarea
                                      name="seller_rejection_reason"
                                      placeholder="e.g., Face photo doesn't match ID, incomplete profile details..."
                                      required
                                      rows={3}
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <DialogTrigger asChild>
                                      <Button type="button" variant="outline">
                                        Cancel
                                      </Button>
                                    </DialogTrigger>
                                    <Button
                                      type="submit"
                                      variant="destructive"
                                    >
                                      Reject Application
                                    </Button>
                                  </div>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {(showToggle ? activeView === "verification" : canAccessVerification) && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-flora-muted">
              Review and approve verification badge requests for trusted
              users
            </p>
            <button
              type="button"
              onClick={fetchVerificationRequests}
              className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
            <Input
              placeholder="Search by name, email, or university..."
              value={verificationSearch}
              onChange={(e) => setVerificationSearch(e.target.value)}
              className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
            />
          </div>
          {verificationRequests.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
              <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                No pending verification requests
              </h3>
              <p className="text-flora-muted">
                All verification badge requests have been processed
              </p>
            </div>
          ) : filteredVerificationRequests.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
              <p className="text-flora-muted">
                No requests match "{verificationSearch}"
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                    <TableHead className="text-flora-ink">User</TableHead>
                    <TableHead className="text-flora-ink">Email</TableHead>
                    <TableHead className="text-flora-ink">University</TableHead>
                    <TableHead className="text-flora-ink">Requested</TableHead>
                    <TableHead className="text-flora-ink">Photo</TableHead>
                    <TableHead className="text-flora-ink">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVerificationRequests.map((user) => (
                    <TableRow
                      key={user.verification_request_id || user.id}
                      className="hover:bg-flora-chip/20"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={user.avatar_url || undefined}
                              alt={user.full_name || ""}
                            />
                            <AvatarFallback className="bg-flora-ink text-white text-sm">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-flora-ink">
                              {user.full_name || "N/A"}
                            </p>
                            <p className="text-xs text-flora-muted">
                              ID:{" "}
                              {user.student_id || user.user_id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-flora-muted">
                              {user.account_type} • Rating:{" "}
                              {user.rating?.toFixed(1) || "0.0"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-flora-ink">
                          {user.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-flora-ink">
                            {user.university_name || "N/A"}
                          </p>
                          <p className="text-xs text-flora-muted">
                            {user.phone_number || "No phone"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-flora-ink">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-flora-muted">
                            {user.total_reviews || 0} reviews
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProfileViewerDialog person={user} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink px-3.5 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                              >
                                <Shield className="h-4 w-4" />
                                Verify
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-flora-ink">
                                  Approve Verification Badge
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-flora-muted">
                                  Are you sure you want to grant{" "}
                                  {user.full_name || "this user"} a
                                  verification badge? This will show a green
                                  checkmark on their profile indicating they
                                  are a trusted user.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    approveVerification(
                                      user.verification_request_id ||
                                        user.id,
                                      user.user_id,
                                      user.email,
                                      user.full_name || "User"
                                    )
                                  }
                                >
                                  Grant Badge
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                              >
                                <UserX className="h-4 w-4" />
                                Reject
                              </button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                              <DialogHeader>
                                <DialogTitle className="text-flora-ink">
                                  Reject Verification Request
                                </DialogTitle>
                                <DialogDescription className="text-flora-muted">
                                  Provide a reason for rejecting{" "}
                                  {user.full_name || "this user"}'s
                                  verification request.
                                </DialogDescription>
                              </DialogHeader>
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const formData = new FormData(
                                    e.currentTarget
                                  );
                                  const reason = formData.get(
                                    "rejection_reason"
                                  ) as string;
                                  if (reason.trim()) {
                                    rejectVerification(
                                      user.verification_request_id ||
                                        user.id,
                                      user.user_id,
                                      user.email,
                                      user.full_name || "User",
                                      reason.trim()
                                    );
                                  }
                                }}
                              >
                                <div className="space-y-4">
                                  <div>
                                    <Label
                                      htmlFor="rejection_reason"
                                      className="text-flora-ink"
                                    >
                                      Rejection Reason *
                                    </Label>
                                    <Textarea
                                      name="rejection_reason"
                                      placeholder="e.g., Photo quality is poor, BVN/NIN mismatch, Additional verification needed..."
                                      required
                                      rows={3}
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <DialogTrigger asChild>
                                      <Button type="button" variant="outline">
                                        Cancel
                                      </Button>
                                    </DialogTrigger>
                                    <Button
                                      type="submit"
                                      variant="destructive"
                                    >
                                      Reject Request
                                    </Button>
                                  </div>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingApprovalsTab;
