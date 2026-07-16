import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { useRealTimeProfile } from "@/hooks/useRealTimeProfile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PullToRefresh } from "@/components/common/PullToRefresh";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  Star,
  Package,
  MessageCircle,
  Wallet,
  ArrowUpRight,
  Trash2,
  Play,
  Eye,
  Headphones,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Heart,
  User as UserIcon,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { SellerDocumentReminder } from "@/components/seller/SellerDocumentReminder";
import { CompressedImageUpload } from "@/components/ui/CompressedImageUpload";
import { useMemoryOptimization } from "@/hooks/useMemoryOptimization";
import { PremiumGameBadge } from "@/components/games/PremiumGameBadge";
import { SellerRegistrationCard } from "@/components/seller/SellerRegistrationCard";
import { SellerSubscriptionCard } from "@/components/seller/SellerSubscriptionCard";
import { ReferralCard } from "@/components/referrals/ReferralCard";

interface Profile {
  full_name: string;
  email: string;
  university_name?: string;
  student_id?: string;
  phone_number?: string;
  campus?: string;
  account_type: string;
  verification_status?: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  seller_status?: string;
  student_id_photo_url?: string;
  business_name?: string;
  seller_subscription_expires_at?: string;
  seller_features_active?: boolean;
  seller_subscription_type?: string;
  referral_code?: string;
  total_referrals?: number;
}

interface WalletData {
  available_balance: number;
  total_earnings: number;
}

interface GameBadgeData {
  overall_level: number;
  badge_type: "bronze" | "silver" | "gold" | "none";
  is_premium: boolean;
}

// Row icon used in the accordion lists on both breakpoints. "seller" tone
// gives the Seller section's rows a green-tinted accent (its own store
// identity) distinct from Account's neutral chip — the visual language the
// two sections are supposed to be told apart by, without resorting to a
// heavy full-section background tint that would compete with the CTA card.
const SectionIcon = ({
  icon: Icon,
  tone = "default",
}: {
  icon: typeof Shield;
  tone?: "default" | "seller" | "danger";
}) => (
  <span
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
      tone === "danger"
        ? "bg-red-50 text-red-600"
        : tone === "seller"
          ? "bg-flora-tagBg text-flora-tagText"
          : "bg-flora-chip text-flora-muted"
    }`}
  >
    <Icon className="h-4 w-4" />
  </span>
);

// Heading above each of the two page sections. Deliberately typographic
// instead of an icon-in-a-box — that pattern is the generic default for
// "section header" in basically every settings UI; a colored lead word plus
// a plain-language subtitle reads as more considered and ties directly to
// the section's own accent color instead of just repeating an icon.
const GroupHeading = ({
  lead,
  rest,
  subtitle,
  tone = "default",
}: {
  lead: string;
  rest: string;
  subtitle: string;
  tone?: "default" | "seller";
}) => (
  <div>
    <h2 className="text-xl font-extrabold tracking-tight text-flora-ink">
      <span className={tone === "seller" ? "text-flora-leaf" : ""}>{lead}</span> {rest}
    </h2>
    <p className="mt-0.5 text-sm text-flora-muted">{subtitle}</p>
  </div>
);

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const { isAdmin } = useAuth();
  useRealTimeProfile();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { toast } = useToast();
  const { isLowMemory } = useMemoryOptimization();
  const [uploadingStudentId, setUploadingStudentId] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [gameBadge, setGameBadge] = useState<GameBadgeData | null>(null);
  const [walletBalanceVisible, setWalletBalanceVisible] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [editingPhoneNumber, setEditingPhoneNumber] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [storeLinkCopied, setStoreLinkCopied] = useState(false);

  const storeUrl = user && (profile?.account_type === "seller" || profile?.account_type === "both") && profile?.seller_status === "approved"
    ? `https://unimarket.com.ng/seller/${user.id}`
    : null;

  const handleStoreLinkCopy = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = storeUrl;
      ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setStoreLinkCopied(true);
    toast({ title: "Store link copied!", description: storeUrl });
    setTimeout(() => setStoreLinkCopied(false), 2000);
  };

  const handleStoreLinkShare = async () => {
    if (!storeUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: `${profile?.business_name || profile?.full_name}'s Store`,
        text: "Check out my store on UniMarket!",
        url: storeUrl,
      });
    } else {
      handleStoreLinkCopy();
    }
  };
  const handleRefresh = useCallback(async () => {
    await fetchProfile();
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Initialize business name and phone number when profile loads
  useEffect(() => {
    if (profile?.business_name) {
      setNewBusinessName(profile.business_name);
    }
    if (profile?.phone_number) {
      setNewPhoneNumber(profile.phone_number);
    }
  }, [profile?.business_name, profile?.phone_number]);

  // Real-time updates for profile, wallet, and orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const profileData = payload.new as any;
          if (profileData?.user_id === user.id) {
            fetchProfile();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
        },
        (payload) => {
          const walletData = payload.new as any;
          if (walletData?.user_id === user.id) {
            fetchProfile(); // Refresh to get updated wallet data
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const orderData = payload.new as any;
          if (
            orderData?.seller_id === user.id ||
            orderData?.buyer_id === user.id
          ) {
            fetchProfile(); // Refresh to get updated stats
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
        },
        (payload) => {
          const reviewData = payload.new as any;
          if (reviewData?.reviewed_id === user.id) {
            fetchProfile(); // Refresh to get updated rating
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
        // If profile doesn't exist, create it with signup data
        if (error.code === "PGRST116") {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              email: user.email || "",
              full_name:
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "User",
              account_type: user.user_metadata?.account_type || "buyer",
              university_name: user.user_metadata?.university_name || "",
              campus: user.user_metadata?.university_name || "",
              student_id: user.user_metadata?.student_id || "",
              phone_number: user.user_metadata?.phone_number || "",
              business_name: user.user_metadata?.business_name || null,
              avatar_url: user.user_metadata?.avatar_url || null,
              student_id_photo_url:
                user.user_metadata?.student_id_photo_url || null,
              bio: user.user_metadata?.bio || null,
              seller_status:
                user.user_metadata?.account_type === "seller"
                  ? "pending"
                  : null,
              is_verified: false,
              rating: 0.0,
              total_reviews: 0,
            })
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
          return;
        }
        throw error;
      }

      // Fix any missing data in existing profile
      const fixedData = {
        ...data,
        full_name: data.full_name || user.email?.split("@")[0] || "User",
        email: data.email || user.email || "",
        account_type: data.account_type || "buyer",
        rating: data.rating || 0.0,
        total_reviews: data.total_reviews || 0,
        is_verified: data.is_verified || false,
        business_name: data.business_name || null,
        avatar_url: data.avatar_url || null,
        student_id_photo_url: data.student_id_photo_url || null,
      };

      setProfile(fixedData);

      // Fetch wallet data if user is a seller
      if (data.account_type === "seller" || data.account_type === "both") {
        const { data: walletData } = await supabase
          .from("wallets")
          .select("available_balance, total_earnings")
          .eq("user_id", user.id)
          .single();

        if (walletData) {
          setWallet(walletData);
        }
      }

      // Check for existing verification request
      const { data: verificationData } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (verificationData) {
        setVerificationRequest(verificationData);
      }

      // Fetch game badge
      const { data: badgeData } = await supabase.rpc("get_user_game_badge", {
        p_user_id: user.id,
      });
      if (badgeData && badgeData.length > 0) {
        setGameBadge(badgeData[0]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;
    setSaving(true);

    try {
      const updateData: any = {
        full_name: profile.full_name,
        bio: profile.bio?.trim() || null,
      };

      // Include business name and phone number if they're a seller and have changed
      if (
        profile.account_type === "seller" ||
        profile.account_type === "both"
      ) {
        if (newBusinessName.trim() !== (profile.business_name || "")) {
          updateData.business_name = newBusinessName.trim() || null;
        }
        if (newPhoneNumber.trim() !== (profile.phone_number || "")) {
          updateData.phone_number = newPhoneNumber.trim() || null;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local profile state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: profile.full_name,
              bio: updateData.bio,
              business_name:
                updateData.business_name !== undefined
                  ? updateData.business_name
                  : prev.business_name,
              phone_number:
                updateData.phone_number !== undefined
                  ? updateData.phone_number
                  : prev.phone_number,
            }
          : null,
      );

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessNameSave = async () => {
    if (!profile || !user || !newBusinessName.trim()) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: newBusinessName.trim(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, business_name: newBusinessName.trim() });
      toast({
        title: "Business Name Updated",
        description: "Your business name has been successfully updated.",
      });
      setEditingBusinessName(false);
      setNewBusinessName("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update business name",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneNumberSave = async () => {
    if (!profile || !user || !newPhoneNumber.trim()) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone_number: newPhoneNumber.trim(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, phone_number: newPhoneNumber.trim() });
      toast({
        title: "Phone Number Updated",
        description: "Your phone number has been successfully updated.",
      });
      setEditingPhoneNumber(false);
      setNewPhoneNumber("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update phone number",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !profile) return;

    if (deleteConfirmName !== profile.full_name) {
      toast({
        title: "Name Mismatch",
        description:
          "Please enter your full name exactly as shown to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);

    try {
      const userId = user.id;

      const { data, error } = await supabase.rpc(
        "delete_user_completely" as any,
      );

      if (error || !data) {
        throw new Error("Failed to delete account");
      }

      // Clear local storage and caches
      localStorage.clear();
      sessionStorage.clear();

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      toast({
        title: "Account Completely Deleted",
        description:
          "Your account has been permanently deleted. You can no longer sign in with this email.",
      });

      // Force redirect
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const fetchReviews = async () => {
    if (!user) return;

    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(
            full_name,
            avatar_url
          )
        `,
        )
        .eq("reviewed_id", user.id)
        .order("created_at", { ascending: false });

      if (error && !error.message.includes("relation")) {
        throw error;
      }

      setReviews(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load reviews",
        variant: "destructive",
      });
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleProfilePhotoUpload = async (url: string) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : null));

      toast({
        title: "Profile Photo Updated",
        description: "Your profile photo has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile photo",
        variant: "destructive",
      });
    }
  };

  const handleStudentIdUpload = async (url: string) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ student_id_photo_url: url })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) =>
        prev ? { ...prev, student_id_photo_url: url } : null,
      );

      toast({
        title: "Student ID Card Uploaded",
        description: "Your student ID card has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload student ID card",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name || name.trim() === "") return "U";

    const words = name
      .trim()
      .split(" ")
      .filter((word) => word.length > 0);
    if (words.length === 0) return "U";

    return words
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ---- Shared content renderers ----
  // Called from both the mobile accordion and the desktop grid so the two
  // layouts never drift out of sync with two copies of the same markup.

  const renderBadgesAndStats = () => (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge className="bg-flora-chip text-flora-ink border-transparent px-3 py-1 font-medium capitalize">
          {profile!.account_type === "seller" &&
          profile!.seller_status === "pending"
            ? "Buyer waiting to be approved as a seller"
            : profile!.account_type === "seller"
              ? "Seller & Buyer"
              : profile!.account_type === "both"
                ? "Seller & Buyer"
                : profile!.account_type}
        </Badge>
        {profile!.is_verified && (
          <Badge className="bg-verified-blue/10 text-verified-blue border-verified-blue/20 px-3 py-1 font-medium">
            ✓ Verified
          </Badge>
        )}
        {gameBadge && gameBadge.is_premium && (
          <PremiumGameBadge
            level={gameBadge.overall_level}
            badgeType={gameBadge.badge_type}
            isPremium={gameBadge.is_premium}
            size="sm"
          />
        )}
        {isAdmin && (
          <Badge className="bg-flora-ink text-white border-transparent px-3 py-1 font-medium flex items-center gap-1">
            <Headphones className="h-3 w-3" />
            Support
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2 bg-flora-chip px-4 py-2 rounded-full">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-flora-ink">
            {(profile!.rating || 0).toFixed(1)}
          </span>
        </div>
        <button
          className="flex items-center gap-2 bg-flora-chip hover:brightness-95 px-4 py-2 rounded-full transition"
          onClick={() => {
            setReviewsOpen(true);
            fetchReviews();
          }}
        >
          <MessageCircle className="h-5 w-5 text-flora-muted" />
          <span className="font-semibold text-flora-ink">
            {profile!.total_reviews || 0} reviews
          </span>
        </button>
      </div>
    </>
  );

  // No backend restriction actually backs "upload once, contact support to
  // change" — handleProfilePhotoUpload does an unconditional update and the
  // RLS policy has no column-level check. It was UI-only friction with zero
  // real enforcement, so the upload control is always available now.
  const renderPhotoUpload = () => (
    <div className="rounded-2xl border-2 border-dashed border-flora-ink/15 bg-flora-chip/50 p-6 text-center transition-colors hover:bg-flora-chip">
      <CompressedImageUpload
        onUpload={handleProfilePhotoUpload}
        bucket="verification-photos"
        path={`${user?.id}/profile-${Date.now()}.jpg`}
        uploading={uploadingPhoto}
        setUploading={setUploadingPhoto}
        label="Take/Upload Photo"
      />
    </div>
  );

  // Fields every account type has, regardless of buyer/seller.
  const renderAccountDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-semibold text-flora-ink">
            Full Name *
          </Label>
          <Input
            id="full_name"
            value={profile!.full_name}
            disabled
            className="bg-flora-chip text-flora-ink cursor-not-allowed border-0 rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-flora-ink">
            Email
          </Label>
          <Input
            id="email"
            value={profile!.email}
            disabled
            className="bg-flora-chip text-flora-ink cursor-not-allowed border-0 rounded-2xl"
          />
          <p className="text-xs text-flora-muted mt-1">Email cannot be changed</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="university" className="text-sm font-semibold text-flora-ink">
            University
          </Label>
          <Input
            id="university"
            value={profile!.university_name || ""}
            disabled
            className="bg-flora-chip text-flora-ink cursor-not-allowed border-0 rounded-2xl"
            placeholder="Not set"
          />
          <p className="text-xs text-flora-muted mt-1">
            University cannot be changed after registration
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_type" className="text-sm font-semibold text-flora-ink">
          Account Type
        </Label>
        <select
          value={
            profile!.account_type === "seller" &&
            profile!.seller_status === "pending"
              ? "pending"
              : profile!.account_type === "seller"
                ? "both"
                : profile!.account_type
          }
          disabled={true}
          className="w-full h-10 bg-flora-chip border-0 rounded-2xl px-3 py-2 text-sm cursor-not-allowed"
        >
          <option value="buyer">Buyer Only</option>
          <option value="pending">
            Buyer waiting to be approved as a seller
          </option>
          <option value="both">Both Buyer & Seller</option>
        </select>
        <p className="text-xs text-flora-muted mt-1">
          Account type cannot be changed. Contact support if you need
          assistance.
        </p>
      </div>
    </div>
  );

  // Fields specific to running a store — seller-only, same fields that were
  // already gated seller-only before, just regrouped under the Seller
  // section instead of living inside a generic "Account Details" block.
  const renderStoreDetails = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="student_id" className="text-sm font-semibold text-flora-ink">
          Student ID
        </Label>
        <Input
          id="student_id"
          value={profile!.student_id || ""}
          disabled
          className="bg-flora-chip text-flora-ink cursor-not-allowed border-0 rounded-2xl"
          placeholder="Not set"
        />
        <p className="text-xs text-flora-muted mt-1">
          Student ID cannot be changed after registration
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="phone" className="text-sm font-semibold text-flora-ink">
            Phone Number
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewPhoneNumber(profile!.phone_number || "");
              setEditingPhoneNumber(true);
            }}
            className="text-xs px-2 py-1 h-6"
          >
            Edit
          </Button>
        </div>
        <Input
          id="phone"
          value={profile!.phone_number || ""}
          disabled
          className="bg-flora-chip text-flora-ink cursor-not-allowed border-0 rounded-2xl"
          placeholder="Not set"
        />
        <p className="text-xs text-flora-muted mt-1">
          Click Edit to change your phone number
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="business_name" className="text-sm font-semibold text-flora-ink">
            Business Name
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewBusinessName(profile!.business_name || "");
              setEditingBusinessName(true);
            }}
            className="text-xs px-2 py-1 h-6"
          >
            Edit
          </Button>
        </div>
        <Input
          id="business_name"
          value={profile!.business_name || ""}
          disabled
          className="bg-flora-chip text-flora-ink cursor-not-allowed border-0 rounded-2xl"
          placeholder="Not set"
        />
        <p className="text-xs text-flora-muted mt-1">
          Click Edit to change your business name
        </p>
      </div>
    </div>
  );

  const renderWalletCard = () =>
    !wallet ? null : (
      <div className="p-4 bg-flora-chip rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold flex items-center gap-2 text-flora-ink">
            <Wallet className="h-5 w-5" />
            Wallet
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWalletBalanceVisible(!walletBalanceVisible)}
              title={walletBalanceVisible ? "Hide Balance" : "Show Balance"}
              className="flex h-7 w-7 items-center justify-center rounded-full text-flora-muted transition hover:bg-white hover:text-flora-ink"
            >
              <Eye className={`h-3.5 w-3.5 ${walletBalanceVisible ? "" : "opacity-50"}`} />
            </button>
            <a
              href="/dashboard"
              className="flex h-7 w-7 items-center justify-center rounded-full text-flora-muted transition hover:bg-white hover:text-flora-ink"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-flora-muted">Available:</span>
            <span className="font-bold text-flora-ink">
              {walletBalanceVisible
                ? `₦${wallet.available_balance.toLocaleString()}`
                : "••••••"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-flora-muted">Total Earned:</span>
            <span className="font-bold text-flora-ink">
              {walletBalanceVisible
                ? `₦${wallet.total_earnings.toLocaleString()}`
                : "••••••"}
            </span>
          </div>
        </div>
      </div>
    );

  const renderStoreLinkCard = () =>
    !storeUrl ? null : (
      <div className="p-4 bg-flora-chip rounded-2xl">
        <p className="text-xs font-semibold text-flora-ink mb-2 flex items-center gap-1">
          <Share2 className="h-3 w-3" /> My Store Link
        </p>
        <p className="text-xs text-flora-muted break-all mb-3 font-mono bg-white px-2 py-1 rounded-lg">
          {storeUrl}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleStoreLinkCopy}
            className="flex items-center justify-center gap-1 rounded-full border border-flora-ink/10 bg-white py-1.5 text-xs font-medium text-flora-ink transition hover:bg-flora-chip"
          >
            {storeLinkCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {storeLinkCopied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleStoreLinkShare}
            className="flex items-center justify-center gap-1 rounded-full border border-flora-ink/10 bg-white py-1.5 text-xs font-medium text-flora-ink transition hover:bg-flora-chip"
          >
            <Share2 className="h-3 w-3" />
            Share
          </button>
          <button
            type="button"
            onClick={() => window.open(storeUrl, "_blank")}
            title="Preview store"
            className="flex items-center justify-center gap-1 rounded-full border border-flora-ink/10 bg-white py-1.5 text-xs font-medium text-flora-ink transition hover:bg-flora-chip"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </button>
        </div>
      </div>
    );

  const renderSellerStatusPanel = () => (
    <div className="divide-y divide-flora-ink/8 rounded-2xl bg-flora-chip p-4">
      <div className="pb-4">
        <span className="text-sm font-semibold text-flora-ink">Seller Status</span>
        <div className="mt-1.5 text-sm">
          {profile!.seller_status === "approved" && (
            <div className="flex items-center gap-2 text-flora-leaf">
              <Shield className="h-4 w-4 shrink-0" />
              <span>Approved - You can sell items</span>
            </div>
          )}
          {profile!.seller_status === "pending" && (
            <div className="flex items-center gap-2 text-amber-600">
              <Shield className="h-4 w-4 shrink-0" />
              <span>Pending Admin Approval</span>
            </div>
          )}
          {profile!.seller_status === "rejected" && (
            <div className="flex items-center gap-2 text-red-600">
              <Shield className="h-4 w-4 shrink-0" />
              <span>Application Rejected</span>
            </div>
          )}
          {!profile!.seller_status && (
            <div className="flex items-center gap-2 text-flora-muted">
              <Shield className="h-4 w-4 shrink-0" />
              <span>Not yet submitted for approval</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4">
        <span className="text-sm font-semibold text-flora-ink flex items-center gap-2">
          <Package className="h-4 w-4" />
          Subscription Status
        </span>
        <div className="mt-1.5 text-sm space-y-1.5">
          {profile!.seller_features_active &&
          profile!.seller_subscription_expires_at ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-flora-leaf rounded-full animate-pulse"></div>
                <span className="text-flora-ink font-medium">
                  Active -{" "}
                  {profile!.seller_subscription_type === "monthly"
                    ? "Monthly"
                    : "Daily"}{" "}
                  Plan
                </span>
              </div>
              <div className="text-xs text-flora-muted ml-4">
                Expires:{" "}
                {new Date(
                  profile!.seller_subscription_expires_at,
                ).toLocaleDateString()}
              </div>
            </>
          ) : profile!.seller_subscription_expires_at &&
            new Date(profile!.seller_subscription_expires_at) < new Date() ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-600 font-medium">
                Expired - Renew to continue selling
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-flora-muted rounded-full"></div>
              <span className="text-flora-muted font-medium">
                No active subscription
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderVerificationSection = () =>
    !profile!.is_verified &&
    (profile!.account_type === "seller" || profile!.account_type === "both") &&
    profile!.seller_status === "approved" ? (
      <div className="w-full space-y-2">
        {verificationRequest ? (
          <div className="text-center">
            {verificationRequest.status === "pending" && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl">
                <p className="text-sm text-orange-800 font-medium">
                  Verification Pending
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Your request is under admin review
                </p>
              </div>
            )}
            {verificationRequest.status === "rejected" && (
              <div className="space-y-2">
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-800 font-medium">
                    Verification Rejected
                  </p>
                  {verificationRequest.admin_notes && (
                    <p className="text-xs text-red-600 mt-1">
                      {verificationRequest.admin_notes}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    window.location.href = "/verification-request";
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Request Again
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const hasRequiredDetails =
                profile!.full_name &&
                profile!.university_name &&
                profile!.student_id &&
                profile!.phone_number;

              if (!hasRequiredDetails) {
                toast({
                  title: "Complete Your Profile",
                  description:
                    "Please fill in all required details (name, university, student ID, phone) before requesting verification.",
                  variant: "destructive",
                });
                return;
              }

              window.location.href = "/verification-request";
            }}
          >
            <Shield className="h-4 w-4 mr-2" />
            Request Verification
          </Button>
        )}
      </div>
    ) : null;

  const renderStudentIdSection = () =>
    !(profile!.account_type === "seller" || profile!.account_type === "both") ? null : (
      <>
        {profile!.student_id_photo_url ? (
          <div className="p-6 rounded-2xl bg-flora-chip/50">
            <img
              src={profile!.student_id_photo_url}
              alt="Student ID Card"
              className="max-w-full h-auto rounded-lg"
              style={{ maxHeight: "200px" }}
              onError={(e) => {
                console.error(
                  "Failed to load student ID photo:",
                  profile!.student_id_photo_url,
                );
                e.currentTarget.style.display = "none";
              }}
            />
            <p className="text-xs text-flora-muted mt-3">
              Student ID card uploaded during registration
            </p>
          </div>
        ) : (
          <div className="p-6 border-2 border-dashed border-flora-ink/15 rounded-2xl bg-flora-chip/50">
            <div className="text-center">
              <p className="text-sm text-flora-muted mb-4">
                No student ID card uploaded yet
              </p>
              <div className="border-2 border-dashed border-flora-ink/15 rounded-2xl p-6 text-center bg-white/50">
                <div className="text-sm font-semibold mb-3 text-flora-ink">
                  Student ID Card
                </div>
                <CompressedImageUpload
                  onUpload={handleStudentIdUpload}
                  bucket="verification-photos"
                  path={`${user?.id}/student-id-${Date.now()}.jpg`}
                  uploading={uploadingStudentId}
                  setUploading={setUploadingStudentId}
                  label="Take/Upload ID"
                />
              </div>
              <p className="text-xs text-flora-muted mt-3">
                Required for seller verification
              </p>
            </div>
          </div>
        )}
      </>
    );

  const renderDangerZoneContent = () => (
    <div className="space-y-3">
      <p className="text-sm text-red-600">
        Once you delete your account, there is no going back. Please be
        certain.
      </p>
      <Button
        variant="destructive"
        onClick={() => setDeleteModalOpen(true)}
        className="w-full bg-red-600 hover:bg-red-700 font-semibold px-6 py-3 rounded-xl shadow-lg"
      >
        <Trash2 className="h-5 w-5 mr-2" />
        Delete Account
      </Button>
    </div>
  );

  // The one-click path to the dashboard this whole redesign is centered on
  // — a real CTA, not a row buried in a settings list. Flat ink card
  // instead of a gradient, and the arrow button itself carries the accent
  // color rather than a decorative icon-in-a-translucent-circle.
  const renderSellerDashboardCTA = () => (
    <a
      href="/dashboard"
      className="group flex items-center justify-between gap-4 rounded-4xl bg-flora-ink px-6 py-5 text-white shadow-floating transition hover:brightness-110 active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="text-lg font-bold">Seller Dashboard</p>
        <p className="mt-0.5 text-sm text-white/70">Orders, wallet & listings in one place</p>
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-flora-leafBright text-flora-ink transition group-hover:translate-x-0.5">
        <ArrowUpRight className="h-5 w-5" />
      </span>
    </a>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded mb-4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const showSellerFields =
    profile.account_type === "seller" || profile.account_type === "both";
  const showVerification =
    !profile.is_verified && showSellerFields && profile.seller_status === "approved";

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="container mx-auto px-4 pt-4 lg:pt-8 space-y-4">
          <SellerDocumentReminder />
          <SellerRegistrationCard />
          <SellerSubscriptionCard />
          <ReferralCard />
        </div>

        {/* ================= MOBILE ================= */}
        <div className="lg:hidden pb-24">
          <div className="px-4 pt-4">
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-flora-ink">
              My Profile
            </h1>
            <div className="overflow-hidden rounded-3xl bg-white shadow-card">
              <div className="relative h-14 bg-gradient-to-r from-flora-ink to-[#3a4436]">
                {/* Absolutely positioned instead of a negative margin on the
                    row below — a shared -mt on the whole row previously
                    dragged the name/email up into the banner along with the
                    avatar. This decouples the avatar's overlap from the
                    text's position entirely. */}
                <Avatar
                  className="absolute -bottom-8 left-4 h-16 w-16 cursor-pointer ring-4 ring-white transition hover:opacity-90"
                  onClick={() => setShowAvatarModal(true)}
                >
                  <AvatarImage
                    src={profile.avatar_url || undefined}
                    alt={profile.full_name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-flora-leaf text-lg font-bold text-white">
                    {getInitials(profile.full_name || "User")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center gap-3 px-4 pb-4 pt-2">
                <div className="w-16 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-base font-bold text-flora-ink">
                      {profile.business_name || profile.full_name || "User"}
                    </h2>
                    {profile.is_verified && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-verified-blue">
                        <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-flora-muted">
                    {profile.email || user?.email || "No email"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="shrink-0 rounded-full bg-flora-chip px-3.5 py-2 text-xs font-semibold text-flora-ink transition hover:brightness-95"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 px-4">
            <div className="rounded-3xl bg-white p-5 shadow-card">
              {renderBadgesAndStats()}
            </div>
          </div>

          {showSellerFields && (
            <div className="mt-4 px-4">{renderSellerDashboardCTA()}</div>
          )}

          {showSellerFields && (
            <div className="mt-6 px-4">
              <GroupHeading
                lead="Store"
                rest="settings"
                subtitle="Your listings, wallet, and verification status"
                tone="seller"
              />
              <div className="mt-3 overflow-hidden rounded-3xl bg-flora-tagBg/40 shadow-card">
                <Accordion type="single" collapsible>
                  <AccordionItem value="store-details" className="border-b border-flora-leaf/15 px-4">
                    <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                      <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                        <SectionIcon icon={UserIcon} tone="seller" />
                        Store Details
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="rounded-2xl bg-white p-4 shadow-card">{renderStoreDetails()}</div>
                    </AccordionContent>
                  </AccordionItem>

                  {wallet && (
                    <AccordionItem value="wallet" className="border-b border-flora-leaf/15 px-4">
                      <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                        <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                          <SectionIcon icon={Wallet} tone="seller" />
                          Wallet
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-1">
                        <div className="rounded-2xl bg-white p-4 shadow-card">{renderWalletCard()}</div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {storeUrl && (
                    <AccordionItem value="store-link" className="border-b border-flora-leaf/15 px-4">
                      <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                        <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                          <SectionIcon icon={Share2} tone="seller" />
                          Store Link
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-1">
                        <div className="rounded-2xl bg-white p-4 shadow-card">{renderStoreLinkCard()}</div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  <AccordionItem value="seller-status" className="border-b border-flora-leaf/15 px-4">
                    <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                      <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                        <SectionIcon icon={Shield} tone="seller" />
                        Seller &amp; Subscription Status
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="rounded-2xl bg-white p-4 shadow-card">{renderSellerStatusPanel()}</div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="student-id" className="border-b border-flora-leaf/15 px-4">
                    <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                      <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                        <SectionIcon icon={Package} tone="seller" />
                        Student ID Card
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1">
                      <div className="rounded-2xl bg-white p-4 shadow-card">{renderStudentIdSection()}</div>
                    </AccordionContent>
                  </AccordionItem>

                  {showVerification && (
                    <AccordionItem value="verification" className="px-4">
                      <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                        <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                          <SectionIcon icon={Shield} tone="seller" />
                          Verification
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-1">
                        <div className="rounded-2xl bg-white p-4 shadow-card">{renderVerificationSection()}</div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            </div>
          )}

          <div className="mt-6 px-4">
            <GroupHeading
              lead="Account"
              rest="details"
              subtitle="Your personal info, saved items, and security"
            />
            {/* Deliberately no card wrapper here — the Seller section above
                gets the elevated, branded card treatment; Account stays flat
                on the page background so the two visually read as different
                zones instead of two more identical white cards. */}
            <div className="mt-3">
              <Accordion type="single" collapsible>
                <AccordionItem value="photo" className="border-b border-flora-ink/10">
                  <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                    <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                      <SectionIcon icon={ImageIcon} />
                      Profile Photo
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <div className="rounded-2xl bg-white p-4 shadow-card">{renderPhotoUpload()}</div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="details" className="border-b border-flora-ink/10">
                  <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                    <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                      <SectionIcon icon={UserIcon} />
                      Account Details
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <div className="rounded-2xl bg-white p-4 shadow-card">{renderAccountDetails()}</div>
                  </AccordionContent>
                </AccordionItem>

                <button
                  type="button"
                  onClick={() => (window.location.href = "/favorites")}
                  className="flex w-full items-center justify-between border-b border-flora-ink/10 py-3.5 text-left"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                    <SectionIcon icon={Heart} />
                    Saved Items
                  </span>
                  <ChevronRight className="h-4 w-4 text-flora-muted" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnboarding(true)}
                  className="flex w-full items-center justify-between border-b border-flora-ink/10 py-3.5 text-left"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-flora-ink">
                    <SectionIcon icon={Play} />
                    How UniMarket Works
                  </span>
                </button>

                <AccordionItem value="danger">
                  <AccordionTrigger className="py-3.5 hover:no-underline [&>svg]:text-flora-muted">
                    <span className="flex items-center gap-3 text-sm font-medium text-red-600">
                      <SectionIcon icon={Trash2} tone="danger" />
                      Danger Zone
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <div className="rounded-2xl bg-white p-4 shadow-card">{renderDangerZoneContent()}</div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* ================= DESKTOP ================= */}
        <main className="hidden lg:block container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-flora-ink mb-1">
                  My Profile
                </h1>
                <p className="text-flora-muted">Manage your UniMarket account</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full bg-flora-ink px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Identity card */}
              <div className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start overflow-hidden rounded-3xl bg-white shadow-card">
                <div className="h-20 bg-gradient-to-r from-flora-ink to-[#3a4436]" />
                <div className="flex flex-col items-center space-y-4 p-6 sm:p-8">
                  <div className="relative -mt-16">
                    <Avatar
                      className="h-32 w-32 cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 ring-4 ring-white shadow-2xl"
                      onClick={() => setShowAvatarModal(true)}
                    >
                      <AvatarImage
                        src={profile.avatar_url || undefined}
                        alt={profile.full_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-flora-leaf text-white text-2xl font-bold">
                        {getInitials(profile.full_name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    {profile.is_verified && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-verified-blue rounded-full flex items-center justify-center ring-4 ring-white shadow-card">
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="w-full">{renderPhotoUpload()}</div>

                  <div className="text-center">
                    {profile.business_name ? (
                      <>
                        <h2 className="text-2xl font-bold text-flora-ink mb-1">
                          {profile.business_name}
                        </h2>
                        <p className="text-sm text-flora-muted mb-2">
                          Owner: {profile.full_name}
                        </p>
                      </>
                    ) : (
                      <h2 className="text-2xl font-bold text-flora-ink mb-1">
                        {profile.full_name || "User"}
                      </h2>
                    )}
                    <p className="text-flora-muted mb-4">
                      {profile.email || user?.email || "No email"}
                    </p>
                    {profile.bio && (
                      <p className="text-center text-sm text-flora-muted">{profile.bio}</p>
                    )}

                    {renderBadgesAndStats()}

                    <button
                      type="button"
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-flora-ink/10 bg-flora-chip py-2.5 text-sm font-medium text-flora-ink transition hover:brightness-95"
                      onClick={() => setShowOnboarding(true)}
                    >
                      <Play className="h-4 w-4" />
                      How UniMarket Works
                    </button>
                  </div>
                </div>
              </div>

              {/* Two sections */}
              <div className="lg:col-span-2 space-y-6">
                {showSellerFields && renderSellerDashboardCTA()}

                {showSellerFields && (
                  <div className="rounded-3xl bg-flora-tagBg/40 p-6 shadow-card sm:p-8 space-y-4">
                    <GroupHeading
                      lead="Store"
                      rest="settings"
                      subtitle="Your listings, wallet, and verification status"
                      tone="seller"
                    />
                    <Accordion type="single" collapsible defaultValue="store-details">
                      <AccordionItem value="store-details" className="border-b border-flora-leaf/15">
                        <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                          <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                            <SectionIcon icon={UserIcon} tone="seller" />
                            Store Details
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 pt-1">
                          <div className="rounded-2xl bg-white p-5 shadow-card">{renderStoreDetails()}</div>
                        </AccordionContent>
                      </AccordionItem>

                      {wallet && (
                        <AccordionItem value="wallet" className="border-b border-flora-leaf/15">
                          <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                            <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                              <SectionIcon icon={Wallet} tone="seller" />
                              Wallet
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-5 pt-1">
                            <div className="rounded-2xl bg-white p-5 shadow-card">{renderWalletCard()}</div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {storeUrl && (
                        <AccordionItem value="store-link" className="border-b border-flora-leaf/15">
                          <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                            <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                              <SectionIcon icon={Share2} tone="seller" />
                              Store Link
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-5 pt-1">
                            <div className="rounded-2xl bg-white p-5 shadow-card">{renderStoreLinkCard()}</div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      <AccordionItem value="seller-status" className="border-b border-flora-leaf/15">
                        <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                          <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                            <SectionIcon icon={Shield} tone="seller" />
                            Seller &amp; Subscription Status
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 pt-1">
                          <div className="rounded-2xl bg-white p-5 shadow-card">{renderSellerStatusPanel()}</div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="student-id" className="border-b border-flora-leaf/15">
                        <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                          <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                            <SectionIcon icon={Package} tone="seller" />
                            Student ID Card
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 pt-1">
                          <div className="rounded-2xl bg-white p-5 shadow-card">{renderStudentIdSection()}</div>
                        </AccordionContent>
                      </AccordionItem>

                      {showVerification && (
                        <AccordionItem value="verification">
                          <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                            <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                              <SectionIcon icon={Shield} tone="seller" />
                              Verification
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-5 pt-1">
                            <div className="rounded-2xl bg-white p-5 shadow-card">{renderVerificationSection()}</div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </div>
                )}

                {/* No card wrapper — same "plain vs branded" contrast as
                    mobile between Account and the Seller section above. */}
                <div className="space-y-4">
                  <GroupHeading
                    lead="Account"
                    rest="details"
                    subtitle="Your personal info, saved items, and security"
                  />
                  <Accordion type="single" collapsible defaultValue="details">
                    <AccordionItem value="details" className="border-b border-flora-ink/10">
                      <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                        <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                          <SectionIcon icon={UserIcon} />
                          Account Details
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 pt-1">
                        <div className="rounded-2xl bg-white p-5 shadow-card">{renderAccountDetails()}</div>
                      </AccordionContent>
                    </AccordionItem>

                    <a
                      href="/favorites"
                      className="flex items-center justify-between border-b border-flora-ink/10 py-4"
                    >
                      <span className="flex items-center gap-3 text-sm font-semibold text-flora-ink">
                        <SectionIcon icon={Heart} />
                        Saved Items
                      </span>
                      <ChevronRight className="h-4 w-4 text-flora-muted" />
                    </a>

                    <AccordionItem value="danger">
                      <AccordionTrigger className="py-4 hover:no-underline [&>svg]:text-flora-muted">
                        <span className="flex items-center gap-3 text-sm font-semibold text-red-600">
                          <SectionIcon icon={Trash2} tone="danger" />
                          Danger Zone
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 pt-1">
                        <div className="rounded-2xl bg-white p-5 shadow-card">{renderDangerZoneContent()}</div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </div>
          </div>
        </main>
      </PullToRefresh>

      {/* Edit Profile Dialog — shared trigger from mobile header + desktop button */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
                <UserIcon className="h-4 w-4" />
              </span>
              Edit Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_full_name" className="text-sm font-semibold text-flora-ink">
                Full Name *
              </Label>
              <Input
                id="edit_full_name"
                value={profile?.full_name || ""}
                onChange={(e) =>
                  setProfile(profile ? { ...profile, full_name: e.target.value } : null)
                }
                className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_bio" className="text-sm font-semibold text-flora-ink">
                Bio
              </Label>
              <Textarea
                id="edit_bio"
                value={profile?.bio || ""}
                onChange={(e) =>
                  setProfile(profile ? { ...profile, bio: e.target.value } : null)
                }
                placeholder="Tell others about yourself..."
                rows={3}
                maxLength={280}
                className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
              />
              <p className="text-right text-xs text-flora-muted">
                {(profile?.bio || "").length}/280
              </p>
            </div>

            {showSellerFields && (
              <div className="space-y-1.5">
                <Label htmlFor="edit_business_name" className="text-sm font-semibold text-flora-ink">
                  Business Name
                </Label>
                <Input
                  id="edit_business_name"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
                />
              </div>
            )}

            {showSellerFields && (
              <div className="space-y-1.5">
                <Label htmlFor="edit_phone_number" className="text-sm font-semibold text-flora-ink">
                  Phone Number
                </Label>
                <Input
                  id="edit_phone_number"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
                />
              </div>
            )}

            <div className="rounded-2xl bg-flora-chip p-4 space-y-2.5">
              <h4 className="text-sm font-semibold text-flora-ink">
                Need to change other details?
              </h4>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-flora-muted">Email</span>
                  <a
                    href={`https://wa.me/2349133054018?text=${encodeURIComponent(
                      "Hello UniMarket Support,\n\nI would like to change my email address on my account.\n\nCurrent Email: " +
                        (profile?.email || "") +
                        "\nNew Email: [Please specify]\n\nReason: [Please provide a valid reason]\n\nThank you.",
                    )}`}
                    target="_blank"
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-flora-ink shadow-card transition hover:brightness-95"
                  >
                    Contact Support
                  </a>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-flora-muted">University</span>
                  <a
                    href={`https://wa.me/2349133054018?text=${encodeURIComponent(
                      "Hello UniMarket Support,\n\nI would like to change my university information on my account.\n\nCurrent University: " +
                        (profile?.university_name || "Not set") +
                        "\nNew University: [Please specify]\n\nReason: [Please provide a valid reason such as transfer]\n\nThank you.",
                    )}`}
                    target="_blank"
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-flora-ink shadow-card transition hover:brightness-95"
                  >
                    Contact Support
                  </a>
                </div>

                {showSellerFields && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-flora-muted">Student ID</span>
                    <a
                      href={`https://wa.me/2349133054018?text=${encodeURIComponent(
                        "Hello UniMarket Support,\n\nI would like to change my student ID on my account.\n\nCurrent Student ID: " +
                          (profile?.student_id || "Not set") +
                          "\nNew Student ID: [Please specify]\n\nReason: [Please provide a valid reason]\n\nThank you.",
                      )}`}
                      target="_blank"
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-flora-ink shadow-card transition hover:brightness-95"
                    >
                      Contact Support
                    </a>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-flora-muted">Account Type</span>
                  <a
                    href={`https://wa.me/2349133054018?text=${encodeURIComponent(
                      "Hello UniMarket Support,\n\nI would like to change my account type.\n\nCurrent Account Type: " +
                        (profile?.account_type || "Not set") +
                        "\nDesired Account Type: [Please specify: buyer/seller/both]\n\nReason: [Please provide a valid reason]\n\nThank you.",
                    )}`}
                    target="_blank"
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-flora-ink shadow-card transition hover:brightness-95"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    showSellerFields &&
                    newBusinessName.trim() !== (profile?.business_name || "")
                  ) {
                    handleBusinessNameSave();
                  } else {
                    handleSave();
                  }
                }}
                disabled={saving}
                className="flex-1 rounded-full bg-flora-ink px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setNewBusinessName(profile?.business_name || "");
                }}
                className="flex-1 rounded-full border border-flora-ink/10 px-4 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog — shared trigger from both accordion + desktop danger zone */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-4 w-4" />
              </span>
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700 mb-2">
                This action cannot be undone.
              </p>
              <p className="text-sm text-red-700/80">
                This will permanently delete your account and all associated
                data, including:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-700/80">
                <li>• All your products and listings</li>
                <li>• Order history and transactions</li>
                <li>• Messages and conversations</li>
                <li>• Reviews and ratings</li>
                <li>• Wallet and payout history</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-name" className="text-sm font-semibold text-flora-ink">
                Type your full name <strong>"{profile.full_name}"</strong> to
                confirm:
              </Label>
              <Input
                id="confirm-name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Enter your full name"
                className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-red-400/40"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmName("");
                }}
                className="flex-1 rounded-full border border-flora-ink/10 px-4 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmName !== profile.full_name}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviews Dialog */}
      <Dialog open={reviewsOpen} onOpenChange={setReviewsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flora-chip text-yellow-500">
                <Star className="h-4 w-4 fill-yellow-400" />
              </span>
              My Reviews ({reviews.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingReviews ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flora-leaf mx-auto"></div>
                <p className="mt-2 text-flora-muted">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip">
                  <MessageCircle className="h-8 w-8 text-flora-muted" />
                </div>
                <p className="font-medium text-flora-ink">No reviews yet</p>
                <p className="text-sm text-flora-muted">
                  Reviews from buyers will appear here
                </p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-2xl bg-flora-chip p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.reviewer?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(review.reviewer?.full_name || "User")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-flora-ink">
                          {review.reviewer?.full_name || "Anonymous"}
                        </span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-flora-ink/15"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-flora-muted">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {review.comment && (
                        <p className="text-sm text-flora-muted">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Modal */}
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Avatar Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
                <ImageIcon className="h-4 w-4" />
              </span>
              Profile Picture
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="max-w-full max-h-96 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-flora-chip">
                <span className="text-4xl font-bold text-flora-muted">
                  {getInitials(profile.full_name || "User")}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Business Name Edit Modal */}
      <Dialog open={editingBusinessName} onOpenChange={setEditingBusinessName}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Business Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new_business_name" className="text-sm font-semibold text-flora-ink">
                Business Name
              </Label>
              <Input
                id="new_business_name"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                placeholder="Enter your business name"
                className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingBusinessName(false);
                  setNewBusinessName("");
                }}
                className="flex-1 rounded-full border border-flora-ink/10 px-4 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBusinessNameSave}
                disabled={saving || !newBusinessName.trim()}
                className="flex-1 rounded-full bg-flora-ink px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Number Edit Modal */}
      <Dialog open={editingPhoneNumber} onOpenChange={setEditingPhoneNumber}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new_phone_number" className="text-sm font-semibold text-flora-ink">
                Phone Number
              </Label>
              <Input
                id="new_phone_number"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="rounded-2xl border-0 bg-flora-chip focus-visible:ring-flora-leaf/40"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingPhoneNumber(false);
                  setNewPhoneNumber("");
                }}
                className="flex-1 rounded-full border border-flora-ink/10 px-4 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePhoneNumberSave}
                disabled={saving || !newPhoneNumber.trim()}
                className="flex-1 rounded-full bg-flora-ink px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
