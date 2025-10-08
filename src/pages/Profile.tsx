import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { useRealTimeProfile } from "@/hooks/useRealTimeProfile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Star,
  Package,
  MessageCircle,
  Wallet,
  ArrowUpRight,
  Trash2,
  Play,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { SellerDocumentReminder } from "@/components/seller/SellerDocumentReminder";
import { CompressedImageUpload } from "@/components/ui/CompressedImageUpload";
import { useMemoryOptimization } from "@/hooks/useMemoryOptimization";
import { PremiumGameBadge } from "@/components/games/PremiumGameBadge";
import { SellerRegistrationCard } from "@/components/seller/SellerRegistrationCard";
import { SellerSubscriptionCard } from "@/components/seller/SellerSubscriptionCard";

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

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
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
  const [showUploadWarning, setShowUploadWarning] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [gameBadge, setGameBadge] = useState<GameBadgeData | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Real-time updates for profile, wallet, and orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const profileData = payload.new as any;
          if (profileData?.user_id === user.id) {
            fetchProfile();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
        },
        (payload) => {
          const walletData = payload.new as any;
          if (walletData?.user_id === user.id) {
            fetchProfile(); // Refresh to get updated wallet data
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const orderData = payload.new as any;
          if (orderData?.seller_id === user.id || orderData?.buyer_id === user.id) {
            fetchProfile(); // Refresh to get updated stats
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
        },
        (payload) => {
          const reviewData = payload.new as any;
          if (reviewData?.reviewed_id === user.id) {
            fetchProfile(); // Refresh to get updated rating
          }
        }
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
      // Only allow updating name and bio - secure backend validation
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
        })
        .eq("user_id", user.id);

      if (error) throw error;

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
        "delete_user_completely" as any
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
        `
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

  const openWhatsAppSupport = () => {
    const message = encodeURIComponent(
      "Hello, I would like to change my profile picture on UniMarket. Please assist me with this request."
    );
    window.open(`https://wa.me/2349133054018?text=${message}`, "_blank");
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
        prev ? { ...prev, student_id_photo_url: url } : null
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <SellerDocumentReminder />
          <SellerRegistrationCard />
          <SellerSubscriptionCard />
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-primary">Profile</h1>
            <Button
              variant={editing ? "outline" : "brand"}
              onClick={() => (editing ? setEditing(false) : setEditing(true))}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <Avatar
                      className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowAvatarModal(true)}
                    >
                      <AvatarImage
                        src={profile.avatar_url || undefined}
                        alt={profile.full_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-university-green text-white text-lg">
                        {getInitials(profile.full_name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    {profile.is_verified && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-1">
                        <svg
                          className="h-3 w-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="w-full">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                      <div className="text-sm font-medium mb-2">
                        Profile Photo
                      </div>
                      {profile.avatar_url ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Profile photo already uploaded. Contact support to
                            change.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openWhatsAppSupport}
                            className="w-full"
                          >
                            Contact Support
                          </Button>
                        </div>
                      ) : (
                        <>
                          <CompressedImageUpload
                            onUpload={handleProfilePhotoUpload}
                            bucket="verification-photos"
                            path={`${user?.id}/profile-${Date.now()}.jpg`}
                            uploading={uploadingPhoto}
                            setUploading={setUploadingPhoto}
                            label="Take/Upload Photo"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowUploadWarning(true)}
                            className="mt-2 text-xs text-muted-foreground border-[1px] border-gray-500"
                          >
                            ⚠️ Read Warning First
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <h2 className="text-xl font-semibold">
                      {profile.full_name || "User"}
                    </h2>
                    <p className="text-muted-foreground">
                      {profile.email || user?.email || "No email"}
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{profile.account_type}</Badge>
                      {profile.is_verified && (
                        <Badge variant="outline" className="text-verified-blue">
                          Verified
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
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{(profile.rating || 0).toFixed(1)}</span>
                      </div>
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => {
                          setReviewsOpen(true);
                          fetchReviews();
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{profile.total_reviews || 0} reviews</span>
                      </button>
                    </div>

                    {/* Wallet Summary for Sellers */}
                    {wallet &&
                      (profile.account_type === "seller" ||
                        profile.account_type === "both") && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-1">
                              <Wallet className="h-4 w-4" />
                              Wallet
                            </span>
                            <Button variant="ghost" size="sm" asChild>
                              <a href="/dashboard">
                                <ArrowUpRight className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Available:
                              </span>
                              <span className="font-medium">
                                ₦{wallet.available_balance.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Total Earned:
                              </span>
                              <span className="font-medium">
                                ₦{wallet.total_earnings.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Seller Status Display */}
                    {(profile.account_type === "seller" ||
                      profile.account_type === "both") && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Seller Status
                          </span>
                        </div>
                        <div className="text-sm">
                          {profile.seller_status === "approved" && (
                            <div className="flex items-center gap-2 text-green-600">
                              <Shield className="h-4 w-4" />
                              <span>Approved - You can sell items</span>
                            </div>
                          )}
                          {profile.seller_status === "pending" && (
                            <div className="flex items-center gap-2 text-orange-600">
                              <Shield className="h-4 w-4" />
                              <span>Pending Admin Approval</span>
                            </div>
                          )}
                          {profile.seller_status === "rejected" && (
                            <div className="flex items-center gap-2 text-red-600">
                              <Shield className="h-4 w-4" />
                              <span>Application Rejected</span>
                            </div>
                          )}
                          {!profile.seller_status && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Shield className="h-4 w-4" />
                              <span>Not yet submitted for approval</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Verification Request Button */}
                    {!profile.is_verified &&
                      (profile.account_type === "seller" ||
                        profile.account_type === "both") &&
                      profile.seller_status === "approved" && (
                        <div className="mt-4 w-full space-y-2">
                          {verificationRequest ? (
                            <div className="text-center">
                              {verificationRequest.status === "pending" && (
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
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
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
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
                                      window.location.href =
                                        "/verification-request";
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
                                // Check if seller has required details
                                const hasRequiredDetails =
                                  profile.full_name &&
                                  profile.university_name &&
                                  profile.student_id &&
                                  profile.phone_number;

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
                      )}

                    {/* Onboarding Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setShowOnboarding(true)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      How UniMarket Works
                    </Button>
                  </div>

                  {profile.bio && (
                    <p className="text-center text-sm text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      disabled={!editing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      value={profile.university_name || ""}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                      placeholder="Not set"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      University cannot be changed after registration
                    </p>
                  </div>

                  {profile.account_type === "seller" && (
                    <>
                      <div>
                        <Label htmlFor="student_id">Student ID</Label>
                        <Input
                          id="student_id"
                          value={profile.student_id || ""}
                          disabled
                          className="bg-muted text-muted-foreground cursor-not-allowed"
                          placeholder="Not set"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Student ID cannot be changed after registration
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={profile.phone_number || ""}
                          disabled
                          className="bg-muted text-muted-foreground cursor-not-allowed"
                          placeholder="Not set"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Phone number cannot be changed for security reasons
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    disabled={!editing}
                    placeholder="Tell others about yourself..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select value={profile.account_type} disabled={true}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer Only</SelectItem>
                      <SelectItem value="seller">Seller Only</SelectItem>
                      <SelectItem value="both">Both Buyer & Seller</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Account type cannot be changed. Contact support if you need
                    assistance.
                  </p>
                </div>

                {/* Student ID Photo Section */}
                {(profile.account_type === "seller" ||
                  profile.account_type === "both") && (
                  <div>
                    <Label>Student ID Card</Label>
                    {profile.student_id_photo_url ? (
                      <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                        <img
                          src={
                            profile.student_id_photo_url.startsWith("http")
                              ? profile.student_id_photo_url
                              : supabase.storage
                                  .from("verification-photos")
                                  .getPublicUrl(profile.student_id_photo_url)
                                  .data.publicUrl
                          }
                          alt="Student ID Card"
                          className="max-w-full h-auto rounded border"
                          style={{ maxHeight: "200px" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Student ID card uploaded during registration
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/50">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            No student ID card uploaded yet
                          </p>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <div className="text-sm font-medium mb-2">
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
                          <p className="text-xs text-muted-foreground mt-2">
                            Required for seller verification
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Account Deletion Section */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-destructive mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. Please
                    be certain.
                  </p>
                  <Dialog
                    open={deleteModalOpen}
                    onOpenChange={setDeleteModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                          <p className="text-sm text-destructive font-medium mb-2">
                            ⚠️ This action cannot be undone!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            This will permanently delete your account and all
                            associated data including:
                          </p>
                          <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                            <li>All your products and listings</li>
                            <li>Order history and transactions</li>
                            <li>Messages and conversations</li>
                            <li>Reviews and ratings</li>
                            <li>Wallet and payout history</li>
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-name">
                            Type your full name{" "}
                            <strong>"{profile.full_name}"</strong> to confirm:
                          </Label>
                          <Input
                            id="confirm-name"
                            value={deleteConfirmName}
                            onChange={(e) =>
                              setDeleteConfirmName(e.target.value)
                            }
                            placeholder="Enter your full name"
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setDeleteModalOpen(false);
                              setDeleteConfirmName("");
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={
                              deleting ||
                              deleteConfirmName !== profile.full_name
                            }
                            className="flex-1"
                          >
                            {deleting ? "Deleting..." : "Delete Account"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Reviews Dialog */}
      <Dialog open={reviewsOpen} onOpenChange={setReviewsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              My Reviews ({reviews.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingReviews ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No reviews yet</p>
                <p className="text-sm text-muted-foreground">
                  Reviews from buyers will appear here
                </p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.reviewer?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(review.reviewer?.full_name || "User")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {review.reviewer?.full_name || "Anonymous"}
                        </span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {review.comment && (
                        <p className="text-sm text-muted-foreground">
                          {review.comment}
                        </p>
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
      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Avatar Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-4xl text-muted-foreground">
                  {getInitials(profile.full_name || "User")}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Warning Modal */}
      <Dialog open={showUploadWarning} onOpenChange={setShowUploadWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600">
              ⚠️ Important Warning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 font-medium mb-2">
                Profile Picture Upload Policy
              </p>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• You can only upload your profile picture ONCE</li>
                <li>• After uploading, you cannot change it yourself</li>
                <li>• To change it later, you must contact customer support</li>
                <li>• Make sure your photo is clear and appropriate</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Need to change later?</strong>
                <br />
                Contact support on WhatsApp: +234 913 305 4018
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadWarning(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowUploadWarning(false);
                  // User can now proceed with upload
                }}
                className="flex-1"
              >
                I Understand
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
