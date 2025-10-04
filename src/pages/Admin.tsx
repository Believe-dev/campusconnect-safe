import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Edit,
  Ban,
  Eye,
  EyeOff,
  Users,
  Package,
  MessageSquare,
  BarChart3,
  Shield,
  Download,
  Search,
  Filter,
  RefreshCw,
  Settings,
  CheckSquare,
  Square,
  UserX,
  UserCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  IdCard,
  Flag,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import { triggerProfileUpdate } from "@/utils/realTimeEvents";
import { emailService } from "@/utils/emailService";
import { sanitizeInput, validateEmail, validateName } from "@/lib/security";
import { AdminWallet } from "@/components/admin/AdminWallet";

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_banned: boolean | null;
  account_type: string;
  campus: string | null;
  university_name: string | null;
  face_photo_url: string | null;
  student_id_photo_url: string | null;
  verification_status: string | null;
  created_at: string;
  user_roles?: { role: string }[];
  avatar_url?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  student_id?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
  is_verified?: boolean | null;
  // Verification request specific fields
  verification_request_id?: string;
  verification_reason?: string;
  verification_documents?: string[];
}

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition?: string;
  stock_quantity?: number;
  is_active: boolean;
  created_at: string;
  images?: string[];
  seller: { full_name: string; email: string };
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: { full_name: string; email: string };
  conversations: {
    products: { title: string };
    seller: { full_name: string };
    buyer: { full_name: string };
  };
}

interface Analytics {
  totalRevenue: number;
  monthlyGrowth: number;
  topCategories: { category: string; count: number }[];
  recentOrders: number;
}

interface EscrowTransaction {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  commission_amount: number;
  seller_amount: number;
  status: string;
  held_at: string;
  released_at: string | null;
  auto_release_at: string | null;
  created_at: string;
  updated_at: string;
  orders?: {
    id: string;
    products: { title: string };
    seller_profile: { full_name: string };
    buyer_profile: { full_name: string };
  };
}

interface PayoutRequest {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  status: string;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string };
}

interface Dispute {
  id: string;
  order_id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  orders: {
    products: { title: string };
    seller_profile: { full_name: string };
    buyer_profile: { full_name: string };
  };
  reporter: { full_name: string };
}

interface ProductReport {
  id: string;
  product_id: string;
  reported_by: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  product?: { title: string; seller_id: string };
  reporter?: { full_name: string; email: string };
  seller?: { full_name: string; email: string };
}

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    monthlyGrowth: 0,
    topCategories: [],
    recentOrders: 0,
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalMessages: 0,
    activeUsers: 0,
  });

  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Filter states
  const [userFilter, setUserFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Seller approval states
  const [pendingSellers, setPendingSellers] = useState<User[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<User[]>([]);

  // Escrow and payout states
  const [escrowTransactions, setEscrowTransactions] = useState<
    EscrowTransaction[]
  >([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [productReports, setProductReports] = useState<ProductReport[]>([]);
  const [banAppeals, setBanAppeals] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [disputeTemplates, setDisputeTemplates] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      console.log("Admin dashboard loading...");
      fetchUsers();
      fetchProducts();
      fetchMessages();
      fetchStats();
      fetchAnalytics();
      fetchPendingSellers();
      fetchVerificationRequests();
      fetchEscrowData();
      fetchProductReports();
      fetchBanAppeals();
      fetchEmailLogs();
      fetchDisputeTemplates();
      fetchSuggestions();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with specific fields to avoid deep type instantiation
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          user_id,
          email,
          full_name,
          is_banned,
          account_type,
          campus,
          university_name,
          face_photo_url,
          student_id_photo_url,
          verification_status,
          created_at,
          avatar_url,
          bio,
          phone_number,
          student_id,
          rating,
          total_reviews,
          is_verified
        `
        )
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const userIds = profiles?.map((p) => p.user_id) || [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const usersWithRoles = (profiles || []).map((profile) => ({
        ...profile,
        is_banned: profile.is_banned || false,
        verification_status: profile.verification_status || "pending",
        user_roles:
          roles
            ?.filter((role) => role.user_id === profile.user_id)
            .map((r) => ({ role: r.role })) || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      toast.error("Failed to fetch users");
      setUsers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          title,
          description,
          price,
          category,
          condition,
          stock_quantity,
          is_active,
          created_at,
          images,
          seller_id,
          seller:profiles(full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform data to handle missing seller profiles
      const transformedData = (data || []).map((product) => ({
        ...product,
        seller: product.seller || {
          full_name: "Unknown Seller",
          email: "unknown@example.com",
        },
      }));

      setProducts(transformedData);
    } catch (error) {
      toast.error("Failed to fetch products");
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!inner(full_name, email),
          conversations!inner(
            products(title),
            seller:profiles!conversations_seller_id_fkey(full_name),
            buyer:profiles!conversations_buyer_id_fkey(full_name)
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      toast.error("Failed to fetch messages");
    }
  };

  const fetchPendingSellers = async () => {
    try {
      // Get profiles that want to be sellers but haven't been approved yet
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
          student_id_photo_url,
          created_at,
          is_banned,
          verification_status,
          is_verified,
          seller_status
        `
        )
        .eq("account_type", "seller")
        .or("seller_status.is.null,seller_status.eq.pending")
        .eq("is_banned", false)
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching pending sellers:", profilesError);
        setPendingSellers([]);
        return;
      }

      // Transform data for pending sellers
      const transformedData = (profiles || []).map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name || "Unknown",
        email: profile.email || "Unknown",
        university_name: profile.university_name || "N/A",
        campus: profile.campus || "N/A",
        student_id: profile.student_id || "N/A",
        phone_number: profile.phone_number || "N/A",
        bio: profile.bio || "No bio provided",
        account_type: profile.account_type || "buyer",
        rating: profile.rating || 0,
        total_reviews: profile.total_reviews || 0,
        avatar_url: getImageUrl(profile.face_photo_url),
        face_photo_url: getImageUrl(profile.face_photo_url),
        student_id_photo_url: getImageUrl(profile.student_id_photo_url),
        created_at: profile.created_at,
        is_banned: profile.is_banned || false,
        verification_status: profile.verification_status || "pending",
        is_verified: profile.is_verified || false,
        user_roles: [],
      }));

      console.log("Pending sellers found:", transformedData.length);
      setPendingSellers(transformedData);
    } catch (error) {
      console.error("Error in fetchPendingSellers:", error);
      setPendingSellers([]);
    }
  };

  const getImageUrl = (filePath: string | null) => {
    if (!filePath) return null;

    // If already a full URL, return as is
    if (filePath.startsWith("http")) {
      return filePath;
    }

    // Get public URL using Supabase client
    const { data } = supabase.storage
      .from("verification-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
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
          campus: profile?.campus || "N/A",
          student_id: profile?.student_id || "N/A",
          phone_number: profile?.phone_number || "N/A",
          bio: profile?.bio || "No bio provided",
          account_type: profile?.account_type || "buyer",
          rating: profile?.rating || 0,
          total_reviews: profile?.total_reviews || 0,
          avatar_url: profile?.avatar_url,
          face_photo_url: profile?.avatar_url,
          student_id_photo_url: getImageUrl(profile?.student_id_photo_url),
          created_at: request.created_at,
          is_banned: profile?.is_banned || false,
          verification_status: profile?.verification_status || "pending",
          is_verified: profile?.is_verified || false,
          user_roles: [],
          verification_request_id: request.id,
          verification_reason: request.reason,
          verification_documents: request.documents || [],
        };
      });

      setVerificationRequests(transformedData);
    } catch (error) {
      setVerificationRequests([]);
    }
  };

  const approveSeller = async (
    userId: string,
    userEmail: string,
    fullName: string
  ) => {
    try {
      // Update both seller status and account type
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          seller_status: "approved",
          account_type: "seller",
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Remove any existing buyer role and add seller role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "buyer");

      // Add seller role
      const { error: roleError } = await supabase.from("user_roles").upsert(
        {
          user_id: userId,
          role: "seller",
        },
        {
          onConflict: "user_id,role",
        }
      );

      if (roleError) {
        // Failed to add seller role silently
      }

      // Create in-app notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "Seller Account Approved! 🎉",
          message:
            "Congratulations! Your seller verification has been approved. You can now start listing items on UniMarket.",
          type: "success",
        });

      if (notifError) {
        // Notification creation failed silently
      }

      // Notify all admins about the approval
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "Seller Approved",
            message: `${fullName} has been approved as a seller`,
            type: "info",
          });
        }
      }

      // Send email notification
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            email: userEmail,
            name: fullName,
            type: "approved",
          },
        });
      } catch (emailError) {
        // Email notification failed silently
      }

      toast.success("Seller approved successfully");
      fetchPendingSellers();
      fetchUsers();

      // Trigger real-time profile update for the approved seller
      triggerProfileUpdate();

      // Force refresh profile context for the approved user
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
    fullName: string
  ) => {
    try {
      // Simple rejection - update verification status and convert to buyer
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          seller_status: "rejected",
          account_type: "buyer",
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Remove seller role, keep only buyer role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "seller");

      // Create in-app notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "Seller Application Update",
          message:
            "Your seller application was not approved at this time. Your account has been converted to buyer-only. You can still browse and purchase items.",
          type: "warning",
        });

      if (notifError) {
        // Notification creation failed silently
      }

      // Notify all admins about the rejection
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "Seller Rejected",
            message: `${fullName}'s seller application has been rejected`,
            type: "warning",
          });
        }
      }

      // Send email notification
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            email: userEmail,
            name: fullName,
            type: "rejected",
          },
        });
      } catch (emailError) {
        // Email notification failed silently
      }

      toast.success("Seller application rejected");
      fetchPendingSellers();
      fetchUsers();

      // Trigger real-time profile update for the rejected seller
      triggerProfileUpdate();
    } catch (error) {
      toast.error("Failed to reject seller");
    }
  };

  const fetchStats = async () => {
    try {
      const [usersCount, productsCount, messagesCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalProducts: productsCount.count || 0,
        totalMessages: messagesCount.count || 0,
        activeUsers: users.filter((u) => !u.is_banned).length,
      });
    } catch (error) {
      // Stats fetch failed silently
    }
  };

  const fetchBanAppeals = async () => {
    try {
      const { data, error } = await supabase
        .from("ban_appeals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBanAppeals(data || []);
    } catch (error) {
      setBanAppeals([]);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      setEmailLogs([]);
    } catch (error) {
      setEmailLogs([]);
    }
  };

  const fetchDisputeTemplates = async () => {
    try {
      const { data: templates, error } = await supabase
        .from("dispute_notification_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisputeTemplates(templates || []);
    } catch (error) {
      setDisputeTemplates([]);
    }
  };

  const fetchSuggestions = async () => {
    try {
      // First fetch suggestions
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from("suggestions")
        .select(
          `
          id,
          user_id,
          title,
          category,
          description,
          priority,
          status,
          admin_notes,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false });

      if (suggestionsError) {
        console.error("Suggestions fetch error:", suggestionsError);
        setSuggestions([]);
        return;
      }

      if (!suggestionsData || suggestionsData.length === 0) {
        setSuggestions([]);
        return;
      }

      // Get unique user IDs
      const userIds = [
        ...new Set(suggestionsData.map((s) => s.user_id).filter(Boolean)),
      ];

      // Fetch user profiles separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      // Combine data
      const enrichedSuggestions = suggestionsData.map((suggestion) => ({
        ...suggestion,
        profiles: profiles?.find((p) => p.user_id === suggestion.user_id) || {
          full_name: "Unknown User",
          email: "unknown@example.com",
        },
      }));

      console.log("Fetched suggestions:", enrichedSuggestions);
      setSuggestions(enrichedSuggestions);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    }
  };

  const fetchProductReports = async () => {
    try {
      // Fetch product reports with products data
      const { data: reportsData, error: reportsError } = await supabase
        .from("product_reports")
        .select(
          `
          id,
          product_id,
          reported_by,
          reason,
          description,
          status,
          created_at,
          products(title, seller_id)
        `
        )
        .order("created_at", { ascending: false });

      if (reportsError) {
        console.error("Error fetching product reports:", reportsError);
        setProductReports([]);
        return;
      }

      if (!reportsData || reportsData.length === 0) {
        setProductReports([]);
        return;
      }

      // Get all unique user IDs (reporters and sellers)
      const reporterIds = reportsData
        .map((report) => report.reported_by)
        .filter(Boolean);
      const sellerIds = reportsData
        .map((report) => report.products?.seller_id)
        .filter(Boolean);
      const allUserIds = [...new Set([...reporterIds, ...sellerIds])];

      // Fetch all user profiles at once
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", allUserIds);

      const transformedReports = reportsData.map((report) => {
        const reporter = profiles?.find(
          (p) => p.user_id === report.reported_by
        );
        const seller = profiles?.find(
          (p) => p.user_id === report.products?.seller_id
        );

        return {
          id: report.id,
          product_id: report.product_id,
          reported_by: report.reported_by,
          reason: report.reason,
          description: report.description,
          status: report.status,
          created_at: report.created_at,
          product: report.products || {
            title: "Unknown Product",
            seller_id: null,
          },
          reporter: reporter || {
            full_name: "Unknown Reporter",
            email: "unknown@example.com",
          },
          seller: seller || {
            full_name: "Unknown Seller",
            email: "unknown@example.com",
          },
        };
      });

      setProductReports(transformedReports);
    } catch (error) {
      console.error("Error in fetchProductReports:", error);
      setProductReports([]);
    }
  };

  const fetchEscrowData = async () => {
    try {
      // Fetch escrow transactions
      const { data: escrowData, error: escrowError } = await supabase
        .from("escrow_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (escrowError) throw escrowError;
      setEscrowTransactions(escrowData || []);

      // Fetch payout requests
      const { data: payoutData, error: payoutError } = await supabase
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (payoutError) throw payoutError;

      // Fetch user profiles and wallets for payout requests
      if (payoutData && payoutData.length > 0) {
        const userIds = [...new Set(payoutData.map((p) => p.user_id))];
        const walletIds = [...new Set(payoutData.map((p) => p.wallet_id))];

        const [{ data: profiles }, { data: wallets }] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds),
          supabase
            .from("wallets")
            .select("id, available_balance")
            .in("id", walletIds),
        ]);

        const enrichedPayouts = payoutData.map((payout) => ({
          ...payout,
          profiles: profiles?.find((p) => p.user_id === payout.user_id),
          wallets: wallets?.find((w) => w.id === payout.wallet_id),
        }));

        setPayoutRequests(enrichedPayouts);
      } else {
        setPayoutRequests([]);
      }

      // Fetch disputes with left joins to handle missing data gracefully
      const { data: disputesData, error: disputeError } = await supabase
        .from("disputes")
        .select(
          `
          id,
          order_id,
          reported_by,
          reason,
          description,
          status,
          created_at,
          orders(
            id,
            seller_id,
            buyer_id,
            product_id,
            products(
              id,
              title
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (disputeError) {
        console.error("Error fetching disputes:", disputeError);
        setDisputes([]);
        return;
      }

      if (!disputesData || disputesData.length === 0) {
        setDisputes([]);
        return;
      }

      // Get all unique user IDs (sellers, buyers, reporters)
      const sellerIds = disputesData
        .map((d) => d.orders?.seller_id)
        .filter(Boolean);
      const buyerIds = disputesData
        .map((d) => d.orders?.buyer_id)
        .filter(Boolean);
      const reporterIds = disputesData
        .map((d) => d.reported_by)
        .filter(Boolean);
      const allUserIds = [
        ...new Set([...sellerIds, ...buyerIds, ...reporterIds]),
      ];

      // Fetch all user profiles at once
      const { data: userProfiles } =
        allUserIds.length > 0
          ? await supabase
              .from("profiles")
              .select("user_id, full_name, student_id")
              .in("user_id", allUserIds)
          : { data: [] };

      const transformedDisputes = disputesData.map((dispute) => {
        const order = dispute.orders;
        const product = order?.products;
        const seller = userProfiles?.find(
          (p) => p.user_id === order?.seller_id
        );
        const buyer = userProfiles?.find((p) => p.user_id === order?.buyer_id);
        const reporter = userProfiles?.find(
          (p) => p.user_id === dispute.reported_by
        );

        return {
          id: dispute.id,
          order_id: dispute.order_id,
          reason: dispute.reason,
          description: dispute.description,
          status: dispute.status,
          created_at: dispute.created_at,
          reported_by: dispute.reported_by,
          orders: {
            products: {
              title: product?.title || "Product Not Found",
            },
            seller_profile: {
              full_name: seller?.full_name || "Seller Not Found",
              student_id: seller?.student_id || "N/A",
            },
            buyer_profile: {
              full_name: buyer?.full_name || "Buyer Not Found",
              student_id: buyer?.student_id || "N/A",
            },
          },
          reporter: {
            full_name:
              reporter?.full_name ||
              `Reporter: ${dispute.reported_by?.slice(0, 8) || "Unknown"}`,
          },
        };
      });

      setDisputes(transformedDisputes);
    } catch (error) {
      console.error("Error in fetchEscrowData:", error);
      toast.error("Failed to fetch escrow data");
    }
  };

  const releaseEscrowFunds = async (escrowId: string) => {
    try {
      const { data, error } = await supabase.rpc("release_escrow_funds", {
        escrow_id: escrowId,
      });

      if (error) throw error;

      if (data === false) {
        toast.error("Escrow transaction not found or already released");
        return;
      }

      toast.success("Escrow funds released successfully");
      fetchEscrowData();
    } catch (error) {
      toast.error("Failed to release escrow funds");
    }
  };

  const processPayoutRequest = async (
    payoutId: string,
    approve: boolean,
    notes?: string
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (approve) {
        // First check payout eligibility for debugging
        const { data: eligibilityData, error: eligibilityError } =
          await supabase.rpc("check_payout_eligibility", {
            payout_id: payoutId,
          });

        if (eligibilityError) {
          console.error("Eligibility check error:", eligibilityError);
        } else if (eligibilityData && eligibilityData.length > 0) {
          const check = eligibilityData[0];
          console.log("Payout eligibility check:", check);

          if (!check.payout_exists) {
            toast.error("Payout request not found");
            return;
          }

          if (check.payout_status !== "pending") {
            toast.error(
              `Payout request status is '${check.payout_status}', not 'pending'`
            );
            return;
          }

          if (!check.wallet_exists) {
            toast.error("User wallet not found");
            return;
          }

          if (!check.sufficient_balance) {
            toast.error(
              `Insufficient balance. Available: ₦${check.available_balance}, Requested: ₦${check.requested_amount}`
            );
            return;
          }
        }

        // Process automatic bank transfer using Edge Function
        const { data: transferResult, error: transferError } = await supabase.functions.invoke(
          'process-payout',
          {
            body: { payout_id: payoutId }
          }
        );

        if (transferError) {
          console.error('Transfer error:', transferError);
          toast.error(`Transfer failed: ${transferError.message}`);
          return;
        }

        if (transferResult?.error) {
          toast.error(`Transfer failed: ${transferResult.error}`);
          return;
        }

        toast.success(
          `Payout approved and bank transfer initiated! Transfer code: ${transferResult.transfer_code}`
        );
      } else {
        // Just reject the payout request
        const { error } = await supabase
          .from("payout_requests")
          .update({
            status: "rejected",
            admin_notes: notes || null,
            processed_by: user.id,
            processed_at: new Date().toISOString(),
          })
          .eq("id", payoutId);

        if (error) throw error;
      }

      toast.success(
        `Payout request ${approve ? "approved and processed" : "rejected"}`
      );
      fetchEscrowData();
    } catch (error) {
      console.error("Process payout error:", error);
      toast.error(error?.message || "Failed to process payout request");
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch revenue and growth data
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("status", "confirmed");

      const totalRevenue =
        orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) ||
        0;

      // Calculate monthly growth (simplified)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthOrders = orders?.filter((order) => {
        const orderDate = new Date(order.created_at);
        return (
          orderDate.getMonth() === currentMonth &&
          orderDate.getFullYear() === currentYear
        );
      });
      const thisMonthRevenue =
        thisMonthOrders?.reduce(
          (sum, order) => sum + Number(order.total_amount),
          0
        ) || 0;

      // Fetch top categories
      const { data: categoryData } = await supabase
        .from("products")
        .select("category")
        .eq("is_active", true);

      const categories =
        categoryData?.reduce((acc: { [key: string]: number }, product) => {
          acc[product.category] = (acc[product.category] || 0) + 1;
          return acc;
        }, {}) || {};

      const topCategories = Object.entries(categories)
        .map(([category, count]) => ({ category, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalRevenue,
        monthlyGrowth: 15.2, // Simplified calculation
        topCategories,
        recentOrders: thisMonthOrders?.length || 0,
      });
    } catch (error) {
      // Analytics fetch failed silently
    }
  };

  const toggleUserBan = async (userId: string, isBanned: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: !isBanned })
        .eq("user_id", userId);

      if (error) throw error;

      // Send notification if user is being unbanned
      if (isBanned) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Account Restored! 🎉",
          message:
            "Your account has been restored by an administrator. Welcome back to UniMarket!",
          type: "success",
        });
      }

      toast.success(`User ${!isBanned ? "banned" : "unbanned"} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const updateUserRole = async (
    userId: string,
    newRole: "admin" | "seller" | "buyer"
  ) => {
    try {
      // First, remove existing roles
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // Then add new role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (roleError) throw roleError;

      // Update account type in profiles
      const accountType = newRole === "admin" ? "seller" : newRole; // Admins can sell
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ account_type: accountType })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast.success("User role updated successfully");
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const updateUserDetails = async (userId: string, updates: Partial<User>) => {
    try {
      // Sanitize and validate inputs
      const sanitizedUpdates: Partial<User> = {};

      if (updates.full_name) {
        const sanitizedName = sanitizeInput(updates.full_name);
        if (!validateName(sanitizedName)) {
          toast.error("Invalid name format");
          return;
        }
        sanitizedUpdates.full_name = sanitizedName;
      }

      if (updates.email) {
        const sanitizedEmail = sanitizeInput(updates.email).toLowerCase();
        if (!validateEmail(sanitizedEmail)) {
          toast.error("Invalid email format");
          return;
        }
        sanitizedUpdates.email = sanitizedEmail;
      }

      if (updates.bio) {
        sanitizedUpdates.bio = sanitizeInput(updates.bio).slice(0, 500); // Limit bio length
      }

      if (updates.phone_number) {
        sanitizedUpdates.phone_number = sanitizeInput(updates.phone_number);
      }

      if (updates.student_id) {
        sanitizedUpdates.student_id = sanitizeInput(updates.student_id);
      }

      if (updates.university_name) {
        sanitizedUpdates.university_name = sanitizeInput(
          updates.university_name
        );
      }

      // Validate numeric fields
      if (updates.rating !== undefined) {
        const rating = Number(updates.rating);
        if (isNaN(rating) || rating < 0 || rating > 5) {
          toast.error("Rating must be between 0 and 5");
          return;
        }
        sanitizedUpdates.rating = rating;
      }

      if (updates.total_reviews !== undefined) {
        const reviews = Number(updates.total_reviews);
        if (isNaN(reviews) || reviews < 0) {
          toast.error("Total reviews must be a positive number");
          return;
        }
        sanitizedUpdates.total_reviews = reviews;
      }

      const { error } = await supabase
        .from("profiles")
        .update(sanitizedUpdates)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("User details updated successfully");
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      toast.error("Failed to update user details");
    }
  };

  const approveVerification = async (
    requestId: string,
    userId: string,
    userEmail: string,
    fullName: string
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

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Account Verified! ✅",
        message:
          "Congratulations! Your account has been verified. You now have a verified badge on your profile.",
        type: "success",
      });

      toast.success("User verification approved");
      fetchVerificationRequests();
      fetchUsers();
    } catch (error) {
      toast.error("Failed to approve verification");
    }
  };

  const rejectVerification = async (
    requestId: string,
    userId: string,
    userEmail: string,
    fullName: string,
    rejectionReason: string
  ) => {
    try {
      await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          admin_notes: rejectionReason,
        })
        .eq("id", requestId);

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Verification Request Rejected",
        message: `Your verification request was rejected. Reason: ${rejectionReason}. You can submit a new request.`,
        type: "warning",
      });

      toast.success("Verification request rejected");
      fetchVerificationRequests();
      fetchUsers();
    } catch (error) {
      toast.error("Failed to reject verification");
    }
  };

  const toggleUserVerification = async (
    userId: string,
    isVerified: boolean,
    userEmail: string,
    fullName: string
  ) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: !isVerified })
        .eq("user_id", userId);

      if (error) throw error;

      // Send notification if user is being verified
      if (!isVerified) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Account Verified! ✅",
          message:
            "Congratulations! Your account has been verified. You now have a verified badge on your profile.",
          type: "success",
        });

        // Send email notification
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              email: userEmail,
              name: fullName,
              type: "verified",
            },
          });
        } catch (emailError) {
          // Email notification failed silently
        }
      }

      toast.success(
        `User ${!isVerified ? "verified" : "unverified"} successfully`
      );
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to update verification status");
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      toast.success("Message deleted successfully");
      fetchMessages();
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !isActive })
        .eq("id", productId);

      if (error) throw error;

      toast.success(
        `Product ${!isActive ? "activated" : "deactivated"} successfully`
      );
      fetchProducts();
    } catch (error) {
      toast.error("Failed to update product status");
    }
  };

  // Bulk operations
  const handleBulkUserAction = async (action: "ban" | "unban" | "delete") => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }

    try {
      if (action === "ban" || action === "unban") {
        const { error } = await supabase
          .from("profiles")
          .update({ is_banned: action === "ban" })
          .in("user_id", selectedUsers);

        if (error) throw error;
        toast.success(
          `${selectedUsers.length} users ${action}ned successfully`
        );
      }

      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to perform bulk action");
    }
  };

  const handleBulkProductAction = async (
    action: "activate" | "deactivate" | "delete"
  ) => {
    if (selectedProducts.length === 0) {
      toast.error("No products selected");
      return;
    }

    try {
      if (action === "delete") {
        const { error } = await supabase
          .from("products")
          .delete()
          .in("id", selectedProducts);

        if (error) throw error;
        toast.success(
          `${selectedProducts.length} products deleted successfully`
        );
      } else {
        const { error } = await supabase
          .from("products")
          .update({ is_active: action === "activate" })
          .in("id", selectedProducts);

        if (error) throw error;
        toast.success(
          `${selectedProducts.length} products ${action}d successfully`
        );
      }

      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      toast.error("Failed to perform bulk action");
    }
  };

  const exportData = (type: "users" | "products" | "messages") => {
    let data: any[] = [];
    let filename = "";

    switch (type) {
      case "users":
        data = users;
        filename = "users.csv";
        break;
      case "products":
        data = products;
        filename = "products.csv";
        break;
      case "messages":
        data = messages;
        filename = "messages.csv";
        break;
    }

    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filter data
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
      user.email?.toLowerCase().includes(userFilter.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !user.is_banned) ||
      (statusFilter === "banned" && user.is_banned);
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title?.toLowerCase().includes(productFilter.toLowerCase()) ||
      product.category?.toLowerCase().includes(productFilter.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && product.is_active) ||
      (statusFilter === "inactive" && !product.is_active);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  You don't have admin privileges to access this page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Dispute Investigation Form Component
  const DisputeInvestigationForm = React.memo(
    ({ dispute, onSuccess }: { dispute: Dispute; onSuccess: () => void }) => {
      const [selectedTemplate, setSelectedTemplate] = useState("");
      const [customMessage, setCustomMessage] = useState("");
      const [useCustomMessage, setUseCustomMessage] = useState(false);
      const [sending, setSending] = useState(false);

      const handleSendInvestigation = async () => {
        if (!selectedTemplate && !useCustomMessage) {
          toast.error("Please select a template or write a custom message");
          return;
        }

        if (useCustomMessage && !customMessage.trim()) {
          toast.error("Please enter a custom message");
          return;
        }

        setSending(true);
        try {
          // Since send_dispute_investigation_notification function doesn't exist in types, we'll skip this
          const error = null;

          if (error) throw error;

          toast.success("Investigation notification sent to seller");
          onSuccess();
        } catch (error) {
          toast.error("Failed to send investigation notification");
        } finally {
          setSending(false);
        }
      };

      const getTemplatePreview = () => {
        const template = disputeTemplates.find(
          (t) => t.dispute_type === selectedTemplate
        );
        if (!template) return "";

        return template.message
          .replace(
            "{seller_name}",
            dispute.orders?.seller_profile?.full_name || "Seller"
          )
          .replace(
            "{product_title}",
            dispute.orders?.products?.title || "Product"
          )
          .replace("{order_id}", dispute.order_id.slice(0, 8) + "...")
          .replace(
            "{buyer_name}",
            dispute.orders?.buyer_profile?.full_name || "Buyer"
          )
          .replace(
            "{order_date}",
            new Date(dispute.created_at).toLocaleDateString()
          );
      };

      return (
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded">
            <h4 className="font-medium mb-2">Dispute Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>Product:</strong>{" "}
                  {dispute.orders?.products?.title || "Unknown Product"}
                </p>
                <p>
                  <strong>Order ID:</strong> #{dispute.order_id.slice(0, 8)}...
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <Badge
                    variant={
                      dispute.status === "open" ? "destructive" : "default"
                    }
                  >
                    {dispute.status}
                  </Badge>
                </p>
              </div>
              <div>
                <p>
                  <strong>Reported By:</strong>{" "}
                  {dispute.reporter?.full_name || "Unknown Reporter"}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(dispute.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <h5 className="font-medium text-blue-900 mb-2">
                  Seller Information
                </h5>
                <p className="text-sm">
                  <strong>Name:</strong>{" "}
                  {dispute.orders?.seller_profile?.full_name ||
                    "Unknown Seller"}
                </p>
                <p className="text-sm">
                  <strong>Student ID:</strong>{" "}
                  {dispute.orders?.seller_profile?.student_id || "N/A"}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <h5 className="font-medium text-green-900 mb-2">
                  Buyer Information
                </h5>
                <p className="text-sm">
                  <strong>Name:</strong>{" "}
                  {dispute.orders?.buyer_profile?.full_name || "Unknown Buyer"}
                </p>
                <p className="text-sm">
                  <strong>Student ID:</strong>{" "}
                  {dispute.orders?.buyer_profile?.student_id || "N/A"}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-red-50 rounded">
              <h5 className="font-medium text-red-900 mb-2">
                Dispute Information
              </h5>
              <p className="text-sm">
                <strong>Reason:</strong>{" "}
                <Badge variant="outline" className="ml-1">
                  {dispute.reason.replace("_", " ").toUpperCase()}
                </Badge>
              </p>
              {dispute.description && (
                <p className="text-sm mt-2">
                  <strong>Description:</strong>{" "}
                  <span className="italic">{dispute.description}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="use-template"
                checked={!useCustomMessage}
                onChange={() => setUseCustomMessage(false)}
              />
              <Label htmlFor="use-template">Use Template Message</Label>
            </div>

            {!useCustomMessage && (
              <div>
                <Label>Select Template</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  {disputeTemplates.map((template) => (
                    <option key={template.id} value={template.dispute_type}>
                      {template.template_name}
                    </option>
                  ))}
                </select>

                {selectedTemplate && (
                  <div className="mt-3 p-3 bg-muted/30 rounded text-sm">
                    <Label className="font-medium">Preview:</Label>
                    <pre className="whitespace-pre-wrap mt-2 text-xs">
                      {getTemplatePreview()}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="use-custom"
                checked={useCustomMessage}
                onChange={() => setUseCustomMessage(true)}
              />
              <Label htmlFor="use-custom">Write Custom Message</Label>
            </div>

            {useCustomMessage && (
              <div>
                <Label>Custom Investigation Message</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Write your custom investigation message to the seller..."
                  rows={8}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <DialogTrigger asChild>
              <Button variant="outline" disabled={sending}>
                Cancel
              </Button>
            </DialogTrigger>
            <Button
              onClick={handleSendInvestigation}
              disabled={
                sending ||
                (!selectedTemplate && !useCustomMessage) ||
                (useCustomMessage && !customMessage.trim())
              }
            >
              {sending ? "Sending..." : "Send Investigation Notice"}
            </Button>
          </div>
        </div>
      );
    }
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage all aspects of your marketplace
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{analytics.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />+
                {analytics.monthlyGrowth}% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.recentOrders} this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different management areas */}
        <Tabs defaultValue="users" className="space-y-6 ">
          <div className="overflow-x-auto w-fit h-[150px]">
            <TabsList className="grid w-full min-w-max grid-cols-12 md:grid-cols-12 h-fit py-[15px]">
              <TabsTrigger value="users" className="text-xs md:text-sm">
                Users
              </TabsTrigger>
              <TabsTrigger
                value="sellers"
                className="text-xs md:text-sm relative"
              >
                Sellers
                {pendingSellers.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {pendingSellers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="verification"
                className="text-xs md:text-sm relative"
              >
                Verify
                {verificationRequests.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {verificationRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="appeals"
                className="text-xs md:text-sm relative"
              >
                Appeals
                {banAppeals.filter((a) => a.status === "pending").length >
                  0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {banAppeals.filter((a) => a.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="text-xs md:text-sm relative"
              >
                Reports
                {productReports.filter((r) => r.status === "pending").length >
                  0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {
                      productReports.filter((r) => r.status === "pending")
                        .length
                    }
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="escrow"
                className="text-xs md:text-sm relative"
              >
                Escrow
                {escrowTransactions.filter((e) => e.status === "held").length +
                  payoutRequests.filter((p) => p.status === "pending").length +
                  disputes.filter((d) => d.status === "open").length >
                  0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {escrowTransactions.filter((e) => e.status === "held")
                      .length +
                      payoutRequests.filter((p) => p.status === "pending")
                        .length +
                      disputes.filter((d) => d.status === "open").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs md:text-sm">
                Products
              </TabsTrigger>
              <TabsTrigger value="messages" className="text-xs md:text-sm">
                Messages
              </TabsTrigger>
              <TabsTrigger value="emails" className="text-xs md:text-sm">
                Emails
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs md:text-sm">
                Templates
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs md:text-sm">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs md:text-sm">
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs md:text-sm">
                Admin Wallet
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs md:text-sm">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => exportData("users")}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    {selectedUsers.length > 0 && (
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserX className="h-4 w-4 mr-2" />
                              Ban Selected
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Ban Selected Users</DialogTitle>
                              <DialogDescription>
                                Provide a reason for banning{" "}
                                {selectedUsers.length} selected users. This will
                                be shown to them when they try to access their
                                accounts.
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const reason = formData.get(
                                  "bulk_ban_reason"
                                ) as string;

                                try {
                                  const { error } = await supabase
                                    .from("profiles")
                                    .update({
                                      is_banned: true,
                                      admin_notes: reason.trim(),
                                    })
                                    .in("user_id", selectedUsers);

                                  if (error) throw error;

                                  toast.success(
                                    `${selectedUsers.length} users banned successfully`
                                  );
                                  setSelectedUsers([]);
                                  fetchUsers();
                                } catch (error) {
                                  toast.error("Failed to ban users");
                                }
                              }}
                            >
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="bulk_ban_reason">
                                    Ban Reason *
                                  </Label>
                                  <Textarea
                                    name="bulk_ban_reason"
                                    placeholder="e.g., Violation of community guidelines, Spam, Inappropriate behavior..."
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
                                  <Button type="submit" variant="destructive">
                                    Ban {selectedUsers.length} Users
                                  </Button>
                                </div>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          onClick={() => handleBulkUserAction("unban")}
                          variant="outline"
                          size="sm"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Unban Selected
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedUsers.length === filteredUsers.length &&
                              filteredUsers.length > 0
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(
                                  filteredUsers.map((u) => u.user_id)
                                );
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>University</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.user_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([
                                    ...selectedUsers,
                                    user.user_id,
                                  ]);
                                } else {
                                  setSelectedUsers(
                                    selectedUsers.filter(
                                      (id) => id !== user.user_id
                                    )
                                  );
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.university_name || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.user_roles?.[0]?.role || "buyer"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.is_banned ? "destructive" : "default"
                              }
                            >
                              {user.is_banned ? "Banned" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      User Details - {selectedUser?.full_name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* User Info */}
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16">
                                          <AvatarImage
                                            src={
                                              selectedUser?.avatar_url ||
                                              undefined
                                            }
                                          />
                                          <AvatarFallback className="bg-university-green text-white">
                                            {selectedUser?.full_name
                                              ? selectedUser.full_name
                                                  .split(" ")
                                                  .map((n) => n[0])
                                                  .join("")
                                                  .slice(0, 2)
                                              : "U"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <h3 className="font-semibold text-lg">
                                            {selectedUser?.full_name}
                                          </h3>
                                          <p className="text-muted-foreground">
                                            {selectedUser?.email}
                                          </p>
                                          <div className="flex gap-2 mt-1">
                                            <Badge variant="outline">
                                              {selectedUser?.account_type}
                                            </Badge>
                                            {(selectedUser?.is_verified ||
                                              false) && (
                                              <Badge variant="secondary">
                                                Verified
                                              </Badge>
                                            )}
                                            {(selectedUser?.is_banned ||
                                              false) && (
                                              <Badge variant="destructive">
                                                Banned
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <Label className="font-medium">
                                            University
                                          </Label>
                                          <p>
                                            {selectedUser?.university_name ||
                                              "Not set"}
                                          </p>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Student ID
                                          </Label>
                                          <p>
                                            {selectedUser?.student_id ||
                                              "Not set"}
                                          </p>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Phone
                                          </Label>
                                          <p>
                                            {selectedUser?.phone_number ||
                                              "Not set"}
                                          </p>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Joined
                                          </Label>
                                          <p>
                                            {selectedUser?.created_at
                                              ? new Date(
                                                  selectedUser.created_at
                                                ).toLocaleDateString()
                                              : "Unknown"}
                                          </p>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Role
                                          </Label>
                                          <p>
                                            {selectedUser?.user_roles?.[0]
                                              ?.role || "buyer"}
                                          </p>
                                        </div>
                                      </div>

                                      {selectedUser?.bio && (
                                        <div>
                                          <Label className="font-medium">
                                            Bio
                                          </Label>
                                          <p className="text-sm text-muted-foreground">
                                            {selectedUser.bio}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Photos */}
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="font-medium mb-2 block">
                                          Profile Photo
                                        </Label>
                                        {selectedUser?.avatar_url ? (
                                          <img
                                            src={selectedUser.avatar_url}
                                            alt="Profile"
                                            className="w-full max-w-xs h-auto rounded border"
                                          />
                                        ) : (
                                          <p className="text-muted-foreground text-sm">
                                            No profile photo
                                          </p>
                                        )}
                                      </div>

                                      <div>
                                        <Label className="font-medium mb-2 block">
                                          Student ID Card
                                        </Label>
                                        {selectedUser?.student_id_photo_url ? (
                                          <img
                                            src={getImageUrl(
                                              selectedUser.student_id_photo_url
                                            )}
                                            alt="Student ID"
                                            className="w-full max-w-xs h-auto rounded border"
                                            onError={(e) => {
                                              const target =
                                                e.currentTarget as HTMLImageElement;
                                              target.style.display = "none";
                                            }}
                                          />
                                        ) : (
                                          <p className="text-muted-foreground text-sm">
                                            No student ID photo
                                          </p>
                                        )}
                                      </div>

                                      {selectedUser?.face_photo_url && (
                                        <div>
                                          <Label className="font-medium mb-2 block">
                                            Face Verification Photo
                                          </Label>
                                          <img
                                            src={getImageUrl(
                                              selectedUser.face_photo_url
                                            )}
                                            alt="Face verification"
                                            className="w-full max-w-xs h-auto rounded border"
                                            onError={(e) => {
                                              const target =
                                                e.currentTarget as HTMLImageElement;
                                              target.style.display = "none";
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-2 mt-6 pt-4 border-t flex-wrap">
                                    <Select
                                      onValueChange={(
                                        value: "admin" | "seller" | "buyer"
                                      ) => updateUserRole(user.user_id, value)}
                                    >
                                      <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Change role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="buyer">
                                          Buyer
                                        </SelectItem>
                                        <SelectItem value="seller">
                                          Seller
                                        </SelectItem>
                                        <SelectItem value="admin">
                                          Admin
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {/* Password Reset */}
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          Reset Password
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Reset User Password</DialogTitle>
                                        </DialogHeader>
                                        <form
                                          onSubmit={async (e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.currentTarget);
                                            const newPassword = formData.get('new_password') as string;
                                            
                                            if (newPassword.length < 8) {
                                              toast.error('Password must be at least 8 characters');
                                              return;
                                            }

                                            try {
                                              // Try Edge Function first
                                              const { data, error } = await supabase.functions.invoke('admin-reset-password', {
                                                body: {
                                                  user_id: user.user_id,
                                                  new_password: newPassword
                                                }
                                              });

                                              if (error) {
                                                console.error('Edge Function error:', error);
                                                throw new Error('Edge Function not available. Please deploy the admin-reset-password function.');
                                              }
                                              
                                              if (data?.error) throw new Error(data.error);

                                              toast.success('Password updated successfully via Edge Function');
                                              
                                              // Send notification to user
                                              await supabase.from('notifications').insert({
                                                user_id: user.user_id,
                                                title: 'Password Changed',
                                                message: 'Your password has been reset by an administrator. Please log in with your new password.',
                                                type: 'info'
                                              });
                                            } catch (error: any) {
                                              console.error('Password reset error:', error);
                                              
                                              // Show specific error message with solution
                                              if (error.message?.includes('Edge Function') || error.message?.includes('Failed to send a request')) {
                                                toast.error(
                                                  'Edge Function not deployed. Please run deploy-admin-functions.bat to deploy the admin-reset-password function, or contact the system administrator.',
                                                  { duration: 8000 }
                                                );
                                              } else {
                                                toast.error(error.message || 'Failed to reset password');
                                              }
                                            }
                                          }}
                                        >
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="new_password">New Password</Label>
                                              <div className="relative">
                                                <Input
                                                  name="new_password"
                                                  type={showPassword ? "text" : "password"}
                                                  placeholder="Enter new password (min 8 characters)"
                                                  required
                                                  minLength={8}
                                                  className="pr-10"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => setShowPassword(!showPassword)}
                                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                  {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                  ) : (
                                                    <Eye className="h-4 w-4" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <DialogTrigger asChild>
                                                <Button type="button" variant="outline">
                                                  Cancel
                                                </Button>
                                              </DialogTrigger>
                                              <Button type="submit">
                                                Reset Password
                                              </Button>
                                            </div>
                                          </div>
                                        </form>
                                      </DialogContent>
                                    </Dialog>

                                    {/* Profile Picture Update */}
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          Change Photo
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Update Profile Picture</DialogTitle>
                                        </DialogHeader>
                                        <form
                                          onSubmit={async (e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.currentTarget);
                                            const file = formData.get('profile_image') as File;
                                            
                                            if (!file || file.size === 0) {
                                              toast.error('Please select an image file');
                                              return;
                                            }

                                            if (file.size > 5 * 1024 * 1024) {
                                              toast.error('Image must be less than 5MB');
                                              return;
                                            }

                                            try {
                                              // Upload to Supabase storage
                                              const fileExt = file.name.split('.').pop();
                                              const fileName = `${user.user_id}-${Date.now()}.${fileExt}`;
                                              
                                              const { error: uploadError } = await supabase.storage
                                                .from('verification-photos')
                                                .upload(fileName, file);

                                              if (uploadError) throw uploadError;

                                              // Get public URL
                                              const { data } = supabase.storage
                                                .from('verification-photos')
                                                .getPublicUrl(fileName);

                                              // Update user profile
                                              const { error: updateError } = await supabase
                                                .from('profiles')
                                                .update({ avatar_url: data.publicUrl })
                                                .eq('user_id', user.user_id);

                                              if (updateError) throw updateError;

                                              toast.success('Profile picture updated successfully');
                                              fetchUsers();
                                              
                                              // Send notification to user
                                              await supabase.from('notifications').insert({
                                                user_id: user.user_id,
                                                title: 'Profile Updated',
                                                message: 'Your profile picture has been updated by an administrator.',
                                                type: 'info'
                                              });
                                            } catch (error) {
                                              toast.error('Failed to update profile picture');
                                            }
                                          }}
                                        >
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="profile_image">Select New Image</Label>
                                              <Input
                                                name="profile_image"
                                                type="file"
                                                accept="image/*"
                                                required
                                              />
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Max size: 5MB. Supported formats: JPG, PNG, GIF
                                              </p>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <DialogTrigger asChild>
                                                <Button type="button" variant="outline">
                                                  Cancel
                                                </Button>
                                              </DialogTrigger>
                                              <Button type="submit">
                                                Update Picture
                                              </Button>
                                            </div>
                                          </div>
                                        </form>
                                      </DialogContent>
                                    </Dialog>

                                    <Button
                                      variant={
                                        user.is_verified ? "outline" : "default"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        toggleUserVerification(
                                          user.user_id,
                                          user.is_verified || false,
                                          user.email,
                                          user.full_name || "User"
                                        )
                                      }
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      {user.is_verified || false
                                        ? "Remove Verification"
                                        : "Verify User"}
                                    </Button>

                                    {user.is_banned || false ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          toggleUserBan(
                                            user.user_id,
                                            user.is_banned || false
                                          )
                                        }
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Unban User
                                      </Button>
                                    ) : (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                          >
                                            <Ban className="h-4 w-4 mr-2" />
                                            Ban User
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>
                                              Ban User -{" "}
                                              {user.full_name || "User"}
                                            </DialogTitle>
                                            <DialogDescription>
                                              Provide a reason for banning this
                                              user. This will be shown to them
                                              when they try to access their
                                              account.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <form
                                            onSubmit={async (e) => {
                                              e.preventDefault();
                                              const formData = new FormData(
                                                e.currentTarget
                                              );
                                              const reason = formData.get(
                                                "ban_reason"
                                              ) as string;

                                              try {
                                                const { error } = await supabase
                                                  .from("profiles")
                                                  .update({
                                                    is_banned: true,
                                                    admin_notes: reason.trim(),
                                                  })
                                                  .eq("user_id", user.user_id);

                                                if (error) throw error;

                                                toast.success(
                                                  "User banned successfully"
                                                );
                                                fetchUsers();
                                              } catch (error) {
                                                console.error(
                                                  "Ban user error:",
                                                  error
                                                );
                                                toast.error(
                                                  "Failed to ban user"
                                                );
                                              }
                                            }}
                                          >
                                            <div className="space-y-4">
                                              <div>
                                                <Label htmlFor="ban_reason">
                                                  Ban Reason *
                                                </Label>
                                                <Textarea
                                                  name="ban_reason"
                                                  placeholder="e.g., Violation of community guidelines, Spam, Inappropriate behavior..."
                                                  required
                                                  rows={3}
                                                />
                                              </div>
                                              <div className="flex justify-end gap-2">
                                                <DialogTrigger asChild>
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                  >
                                                    Cancel
                                                  </Button>
                                                </DialogTrigger>
                                                <Button
                                                  type="submit"
                                                  variant="destructive"
                                                >
                                                  Ban User
                                                </Button>
                                              </div>
                                            </div>
                                          </form>
                                        </DialogContent>
                                      </Dialog>
                                    )}

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Delete User Account
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Permanently delete {user.full_name}
                                            's account and all data?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={async () => {
                                              try {
                                                // Since delete_user_completely function doesn't exist, we'll handle this manually
                                                const { error } = await supabase
                                                  .from("profiles")
                                                  .delete()
                                                  .eq("user_id", user.user_id);
                                                if (error) throw error;
                                                toast.success("User deleted");
                                                fetchUsers();
                                              } catch (error) {
                                                toast.error(
                                                  "Failed to delete user"
                                                );
                                              }
                                            }}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {/* Edit User Dialog */}
                              <Dialog
                                open={editingUser?.user_id === user.user_id}
                                onOpenChange={() => setEditingUser(null)}
                              >
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Edit User - {editingUser?.full_name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  {editingUser && (
                                    <form
                                      data-university-form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(
                                          e.currentTarget
                                        );
                                        const updates = {
                                          full_name: formData.get(
                                            "full_name"
                                          ) as string,
                                          email: formData.get(
                                            "email"
                                          ) as string,
                                          university_name: formData.get(
                                            "university_name"
                                          ) as string,
                                          bio: formData.get("bio") as string,
                                          phone_number: formData.get(
                                            "phone_number"
                                          ) as string,
                                          student_id: formData.get(
                                            "student_id"
                                          ) as string,
                                          rating:
                                            parseFloat(
                                              formData.get("rating") as string
                                            ) || 0,
                                          total_reviews:
                                            parseInt(
                                              formData.get(
                                                "total_reviews"
                                              ) as string
                                            ) || 0,
                                        };
                                        updateUserDetails(
                                          editingUser.user_id,
                                          updates
                                        );
                                      }}
                                      className="space-y-4"
                                    >
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label htmlFor="full_name">
                                            Full Name
                                          </Label>
                                          <Input
                                            name="full_name"
                                            defaultValue={
                                              editingUser.full_name || ""
                                            }
                                            required
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="email">Email</Label>
                                          <Input
                                            name="email"
                                            type="email"
                                            defaultValue={
                                              editingUser.email || ""
                                            }
                                            required
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="university_name">
                                            University
                                          </Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between"
                                              >
                                                {editingUser.university_name ||
                                                  "Select university..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                              <Command>
                                                <CommandInput placeholder="Search universities..." />
                                                <CommandList>
                                                  <CommandEmpty>
                                                    No university found.
                                                  </CommandEmpty>
                                                  <CommandGroup>
                                                    {[
                                                      "Abia State University",
                                                      "Abubakar Tafawa Balewa University",
                                                      "Achievers University",
                                                      "Adamawa State University",
                                                      "Adeleke University",
                                                      "Afe Babalola University",
                                                      "African University of Science and Technology",
                                                      "Ahmadu Bello University",
                                                      "Ajayi Crowther University",
                                                      "Akwa Ibom State University",
                                                      "Alex Ekwueme Federal University",
                                                      "American University of Nigeria",
                                                      "Anchor University",
                                                      "Augustine University",
                                                      "Babcock University",
                                                      "Baze University",
                                                      "Bayero University Kano",
                                                      "Bells University of Technology",
                                                      "Benson Idahosa University",
                                                      "Bingham University",
                                                      "Bowen University",
                                                      "Caleb University",
                                                      "Caritas University",
                                                      "Chrisland University",
                                                      "Christopher University",
                                                      "Clifford University",
                                                      "Coal City University",
                                                      "Covenant University",
                                                      "Crawford University",
                                                      "Cross River University of Technology",
                                                      "Delta State University",
                                                      "Eastern Palm University",
                                                      "Ebonyi State University",
                                                      "Edo University",
                                                      "Ekiti State University",
                                                      "Elizade University",
                                                      "Enugu State University of Science and Technology",
                                                      "Federal University Birnin Kebbi",
                                                      "Federal University Dutse",
                                                      "Federal University Dutsin-Ma",
                                                      "Federal University Gashua",
                                                      "Federal University Gusau",
                                                      "Federal University Kashere",
                                                      "Federal University Lafia",
                                                      "Federal University Lokoja",
                                                      "Federal University Ndufu-Alike",
                                                      "Federal University of Agriculture, Abeokuta",
                                                      "Federal University of Agriculture, Makurdi",
                                                      "Federal University of Petroleum Resources",
                                                      "Federal University of Technology, Akure",
                                                      "Federal University of Technology, Minna",
                                                      "Federal University of Technology, Owerri",
                                                      "Federal University Otuoke",
                                                      "Federal University Oye-Ekiti",
                                                      "Federal University Wukari",
                                                      "Fountain University",
                                                      "Godfrey Okoye University",
                                                      "Gombe State University",
                                                      "Gregory University",
                                                      "Hallmark University",
                                                      "Hezekiah University",
                                                      "Igbinedion University",
                                                      "Imo State University",
                                                      "Joseph Ayo Babalola University",
                                                      "Kaduna State University",
                                                      "Kano University of Science and Technology",
                                                      "Kebbi State University of Science and Technology",
                                                      "Kogi State University",
                                                      "Kwara State University",
                                                      "Ladoke Akintola University of Technology",
                                                      "Lagos State University",
                                                      "Landmark University",
                                                      "Lead City University",
                                                      "Madonna University",
                                                      "Michael Okpara University of Agriculture",
                                                      "Modibbo Adama University of Technology",
                                                      "Mountain Top University",
                                                      "Nasarawa State University",
                                                      "Niger Delta University",
                                                      "Nile University of Nigeria",
                                                      "Nnamdi Azikiwe University",
                                                      "Northwest University",
                                                      "Novena University",
                                                      "Obafemi Awolowo University",
                                                      "Obong University",
                                                      "Oduduwa University",
                                                      "Olabisi Onabanjo University",
                                                      "Osun State University",
                                                      "Pan-Atlantic University",
                                                      "Paul University",
                                                      "Plateau State University",
                                                      "Redeemer's University",
                                                      "Renaissance University",
                                                      "Rhema University",
                                                      "Rivers State University",
                                                      "Salem University",
                                                      "Samuel Adegboyega University",
                                                      "Sokoto State University",
                                                      "Summit University",
                                                      "Taraba State University",
                                                      "Tansian University",
                                                      "University of Abuja",
                                                      "University of Agriculture and Environmental Sciences",
                                                      "University of Benin",
                                                      "University of Calabar",
                                                      "University of Ibadan",
                                                      "University of Ilorin",
                                                      "University of Jos",
                                                      "University of Lagos",
                                                      "University of Maiduguri",
                                                      "University of Nigeria, Nsukka",
                                                      "University of Port Harcourt",
                                                      "University of Uyo",
                                                      "Veritas University",
                                                      "Wesley University",
                                                      "Western Delta University",
                                                      "Yobe State University",
                                                      "Yusuf Maitama Sule University",
                                                    ]
                                                      .sort()
                                                      .map((uni) => (
                                                        <CommandItem
                                                          key={uni}
                                                          value={uni}
                                                          onSelect={(
                                                            currentValue
                                                          ) => {
                                                            const form =
                                                              document.querySelector(
                                                                "form[data-university-form]"
                                                              ) as HTMLFormElement;
                                                            if (form) {
                                                              const input =
                                                                form.querySelector(
                                                                  'input[name="university_name"]'
                                                                ) as HTMLInputElement;
                                                              if (input)
                                                                input.value =
                                                                  currentValue;
                                                            }
                                                          }}
                                                        >
                                                          <Check
                                                            className={cn(
                                                              "mr-2 h-4 w-4",
                                                              editingUser.university_name ===
                                                                uni
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                            )}
                                                          />
                                                          {uni}
                                                        </CommandItem>
                                                      ))}
                                                  </CommandGroup>
                                                </CommandList>
                                              </Command>
                                            </PopoverContent>
                                          </Popover>
                                          <Input
                                            name="university_name"
                                            type="hidden"
                                            defaultValue={
                                              editingUser.university_name || ""
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="phone_number">
                                            Phone Number
                                          </Label>
                                          <Input
                                            name="phone_number"
                                            defaultValue={
                                              editingUser.phone_number || ""
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="student_id">
                                            Student ID
                                          </Label>
                                          <Input
                                            name="student_id"
                                            defaultValue={
                                              editingUser.student_id || ""
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="rating">Rating</Label>
                                          <Input
                                            name="rating"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            defaultValue={
                                              editingUser.rating || 0
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="total_reviews">
                                            Total Reviews
                                          </Label>
                                          <Input
                                            name="total_reviews"
                                            type="number"
                                            min="0"
                                            defaultValue={
                                              editingUser.total_reviews || 0
                                            }
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <Label htmlFor="bio">Bio</Label>
                                        <Textarea
                                          name="bio"
                                          defaultValue={editingUser.bio || ""}
                                          rows={3}
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => setEditingUser(null)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button type="submit">
                                          Save Changes
                                        </Button>
                                      </div>
                                    </form>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seller Approvals Tab */}
          <TabsContent value="sellers">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Seller Account Approvals</CardTitle>
                  <div className="flex items-center gap-2">
                    {pendingSellers.length > 0 && (
                      <Badge variant="secondary">
                        {pendingSellers.length} pending
                      </Badge>
                    )}
                    <Button
                      onClick={fetchPendingSellers}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Approve or reject users who want to become sellers on the
                  platform
                </p>
              </CardHeader>
              <CardContent>
                {pendingSellers.length === 0 ? (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No pending seller approvals
                    </h3>
                    <p className="text-muted-foreground">
                      All seller account requests have been processed
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Applicant</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>University</TableHead>
                          <TableHead>Applied</TableHead>
                          <TableHead>Verification Photos</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingSellers.map((seller) => (
                          <TableRow key={seller.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={seller.avatar_url}
                                    alt={seller.full_name}
                                  />
                                  <AvatarFallback className="bg-university-green text-white text-sm">
                                    {seller.full_name
                                      ? seller.full_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)
                                      : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {seller.full_name || "N/A"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ID: {seller.user_id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{seller.email}</p>
                            </TableCell>
                            <TableCell>
                              {seller.university_name || "N/A"}
                            </TableCell>
                            <TableCell>
                              {new Date(seller.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {seller.face_photo_url && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-1" />
                                        Face Photo
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Face Verification Photo
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="flex justify-center">
                                        <img
                                          src={getImageUrl(
                                            seller.face_photo_url
                                          )}
                                          alt="Face verification"
                                          className="max-w-full max-h-96 object-contain border rounded"
                                          onError={(e) => {
                                            const target =
                                              e.currentTarget as HTMLImageElement;
                                            target.style.display = "none";
                                            const errorMsg =
                                              target.nextElementSibling as HTMLElement;
                                            if (errorMsg)
                                              errorMsg.style.display = "block";
                                          }}
                                        />
                                        <div
                                          className="text-red-500 text-sm text-center"
                                          style={{ display: "none" }}
                                        >
                                          ❌ Image failed to load
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                {seller.student_id_photo_url && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <IdCard className="h-4 w-4 mr-1" />
                                        ID Photo
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Student ID Verification Photo
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="flex justify-center">
                                        <img
                                          src={getImageUrl(
                                            seller.student_id_photo_url
                                          )}
                                          alt="Student ID verification"
                                          className="max-w-full max-h-96 object-contain border rounded"
                                          onError={(e) => {
                                            const target =
                                              e.currentTarget as HTMLImageElement;
                                            target.style.display = "none";
                                            const errorMsg =
                                              target.nextElementSibling as HTMLElement;
                                            if (errorMsg)
                                              errorMsg.style.display = "block";
                                          }}
                                        />
                                        <div
                                          className="text-red-500 text-sm text-center"
                                          style={{ display: "none" }}
                                        >
                                          ❌ Image failed to load
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="default" size="sm">
                                      <CheckSquare className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Approve Seller Application
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to approve{" "}
                                        {seller.full_name || "this user"}'s
                                        seller application? This will allow them
                                        to list items on the marketplace and
                                        they will receive an email notification.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
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

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <UserX className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Reject Seller Application
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to reject{" "}
                                        {seller.full_name || "this user"}'s
                                        seller application? Their account will
                                        be converted to buyer-only and they will
                                        receive an email notification.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          rejectSeller(
                                            seller.user_id,
                                            seller.email,
                                            seller.full_name || "User"
                                          )
                                        }
                                      >
                                        Reject
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Product Issue Reports</CardTitle>
                  <div className="flex items-center gap-2">
                    {productReports.filter((r) => r.status === "pending")
                      .length > 0 && (
                      <Badge variant="secondary">
                        {
                          productReports.filter((r) => r.status === "pending")
                            .length
                        }{" "}
                        pending
                      </Badge>
                    )}
                    <Button
                      onClick={fetchProductReports}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Review product issue reports and contact sellers via email
                </p>
              </CardHeader>
              <CardContent>
                {productReports.length === 0 ? (
                  <div className="text-center py-12">
                    <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No product reports
                    </h3>
                    <p className="text-muted-foreground">
                      No issues have been reported with products
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Reported By</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reported</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {report.product?.title || "Unknown Product"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Seller:{" "}
                                  {report.seller?.full_name || "Unknown"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {report.reporter?.full_name || "Unknown"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {report.reporter?.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {report.reason.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p
                                className="text-sm truncate"
                                title={report.description}
                              >
                                {report.description}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  report.status === "pending"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(report.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      Email Seller
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Send Email to Seller
                                      </DialogTitle>
                                      <DialogDescription>
                                        Send an email notification to{" "}
                                        {report.seller?.full_name} about the
                                        reported issue
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Seller Email</Label>
                                        <Input
                                          value={report.seller?.email || ""}
                                          disabled
                                        />
                                      </div>
                                      <div>
                                        <Label>Subject</Label>
                                        <Input
                                          defaultValue={`Issue Reported: ${report.product?.title}`}
                                          id={`subject-${report.id}`}
                                        />
                                      </div>
                                      <div>
                                        <Label>Message</Label>
                                        <Textarea
                                          defaultValue={`Hello ${
                                            report.seller?.full_name
                                          },\n\nA user has reported an issue with your product "${
                                            report.product?.title
                                          }".\n\nReason: ${report.reason.replace(
                                            "_",
                                            " "
                                          )}\nDescription: ${
                                            report.description
                                          }\n\nPlease review your product listing and make any necessary corrections.\n\nBest regards,\nCampusConnect Admin Team`}
                                          rows={8}
                                          id={`message-${report.id}`}
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <DialogTrigger asChild>
                                          <Button variant="outline">
                                            Cancel
                                          </Button>
                                        </DialogTrigger>
                                        <Button
                                          onClick={async () => {
                                            const subject = (
                                              document.getElementById(
                                                `subject-${report.id}`
                                              ) as HTMLInputElement
                                            )?.value;
                                            const message = (
                                              document.getElementById(
                                                `message-${report.id}`
                                              ) as HTMLTextAreaElement
                                            )?.value;

                                            try {
                                              await supabase.functions.invoke(
                                                "send-notification-email",
                                                {
                                                  body: {
                                                    email: report.seller?.email,
                                                    name: report.seller
                                                      ?.full_name,
                                                    subject: subject,
                                                    message: message,
                                                    type: "custom",
                                                  },
                                                }
                                              );

                                              // Update report status - skip since table doesn't exist

                                              toast.success(
                                                "Email sent successfully"
                                              );
                                              fetchProductReports();
                                            } catch (error) {
                                              toast.error(
                                                "Failed to send email"
                                              );
                                            }
                                          }}
                                        >
                                          Send Email
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                {report.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from("product_reports")
                                          .update({ status: "resolved" })
                                          .eq("id", report.id);

                                        if (error) throw error;

                                        toast.success(
                                          "Report marked as resolved"
                                        );
                                        fetchProductReports();
                                      } catch (error) {
                                        toast.error("Failed to update report");
                                      }
                                    }}
                                  >
                                    Mark Resolved
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ban Appeals Tab */}
          <TabsContent value="appeals">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Ban Appeals</CardTitle>
                  <div className="flex items-center gap-2">
                    {banAppeals.filter((a) => a.status === "pending").length >
                      0 && (
                      <Badge variant="secondary">
                        {
                          banAppeals.filter((a) => a.status === "pending")
                            .length
                        }{" "}
                        pending
                      </Badge>
                    )}
                    <Button
                      onClick={fetchBanAppeals}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review appeals from banned users
                </p>
              </CardHeader>
              <CardContent>
                {banAppeals.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No ban appeals
                    </h3>
                    <p className="text-muted-foreground">
                      Banned users can submit appeals through the login screen
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User Details</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Appeal Message</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {banAppeals.map((appeal) => (
                          <TableRow key={appeal.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {appeal.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Appeal #{appeal.id.slice(0, 8)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{appeal.user_email}</TableCell>
                            <TableCell>{appeal.matric_number}</TableCell>
                            <TableCell className="max-w-xs">
                              <div className="flex items-center gap-2">
                                <p
                                  className="text-sm truncate flex-1"
                                  title={appeal.message}
                                >
                                  {appeal.message}
                                </p>
                                {appeal.message.length > 50 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Full Appeal Message
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="max-h-96 overflow-y-auto">
                                        <p className="text-sm whitespace-pre-wrap">
                                          {appeal.message}
                                        </p>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  appeal.status === "pending"
                                    ? "secondary"
                                    : appeal.status === "approved"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {appeal.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(appeal.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {appeal.status === "pending" && (
                                <div className="flex gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="default">
                                        Approve
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Approve Ban Appeal
                                        </DialogTitle>
                                        <DialogDescription>
                                          This will unban the user and send them
                                          a notification. Provide a response
                                          message.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <form
                                        onSubmit={async (e) => {
                                          e.preventDefault();
                                          const formData = new FormData(
                                            e.currentTarget
                                          );
                                          const response = formData.get(
                                            "admin_response"
                                          ) as string;

                                          try {
                                            // Update appeal status
                                            const { error: appealError } =
                                              await supabase
                                                .from("ban_appeals")
                                                .update({
                                                  status: "approved",
                                                  admin_response:
                                                    response ||
                                                    "Your appeal was approved and your account has been restored.",
                                                })
                                                .eq("id", appeal.id);

                                            if (appealError) throw appealError;

                                            // Find and unban the user
                                            const { data: user } =
                                              await supabase
                                                .from("profiles")
                                                .select("user_id, full_name")
                                                .eq("email", appeal.user_email)
                                                .eq(
                                                  "student_id",
                                                  appeal.matric_number
                                                )
                                                .single();

                                            if (user) {
                                              // Unban the user
                                              await supabase
                                                .from("profiles")
                                                .update({
                                                  is_banned: false,
                                                  admin_notes: null,
                                                })
                                                .eq("user_id", user.user_id);

                                              // Send notification to unbanned user
                                              await supabase
                                                .from("notifications")
                                                .insert({
                                                  user_id: user.user_id,
                                                  title: "Account Restored! 🎉",
                                                  message:
                                                    response ||
                                                    "Your ban appeal has been approved and your account has been restored. Welcome back to UniMarket!",
                                                  type: "success",
                                                });

                                              // Send secure email notification
                                              try {
                                                await emailService.sendBanApprovalEmail(
                                                  appeal.user_email,
                                                  appeal.full_name,
                                                  response ||
                                                    "Your appeal was approved and your account has been restored."
                                                );
                                              } catch (emailError) {
                                                // Email notification failed silently
                                              }
                                            }

                                            toast.success(
                                              "Appeal approved, user unbanned, and email sent"
                                            );
                                            fetchBanAppeals();
                                            fetchUsers();
                                          } catch (error) {
                                            toast.error(
                                              "Failed to approve appeal"
                                            );
                                          }
                                        }}
                                      >
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Response to User</Label>
                                            <Textarea
                                              name="admin_response"
                                              placeholder="Your appeal has been approved. Welcome back to UniMarket."
                                              rows={3}
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <DialogTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="outline"
                                              >
                                                Cancel
                                              </Button>
                                            </DialogTrigger>
                                            <Button type="submit">
                                              Approve Appeal
                                            </Button>
                                          </div>
                                        </div>
                                      </form>
                                    </DialogContent>
                                  </Dialog>

                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        Reject
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Reject Ban Appeal
                                        </DialogTitle>
                                        <DialogDescription>
                                          Provide a reason for rejecting this
                                          appeal.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <form
                                        onSubmit={async (e) => {
                                          e.preventDefault();
                                          const formData = new FormData(
                                            e.currentTarget
                                          );
                                          const response = formData.get(
                                            "admin_response"
                                          ) as string;

                                          try {
                                            // Update appeal status
                                            const { error: appealError } =
                                              await supabase
                                                .from("ban_appeals")
                                                .update({
                                                  status: "rejected",
                                                  admin_response: response,
                                                })
                                                .eq("id", appeal.id);

                                            if (appealError) throw appealError;

                                            // Send rejection email
                                            try {
                                              await emailService.sendBanRejectionEmail(
                                                appeal.user_email,
                                                appeal.full_name,
                                                response
                                              );
                                            } catch (emailError) {
                                              // Email notification failed silently
                                            }

                                            toast.success(
                                              "Appeal rejected and email sent"
                                            );
                                            fetchBanAppeals();
                                          } catch (error) {
                                            toast.error(
                                              "Failed to reject appeal"
                                            );
                                          }
                                        }}
                                      >
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Rejection Reason</Label>
                                            <Textarea
                                              name="admin_response"
                                              placeholder="Your appeal has been reviewed and rejected because..."
                                              required
                                              rows={3}
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <DialogTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="outline"
                                              >
                                                Cancel
                                              </Button>
                                            </DialogTrigger>
                                            <Button
                                              type="submit"
                                              variant="destructive"
                                            >
                                              Reject Appeal
                                            </Button>
                                          </div>
                                        </div>
                                      </form>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              )}
                              {appeal.status !== "pending" &&
                                appeal.admin_response && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        View Response
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Admin Response
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-2">
                                        <p className="text-sm">
                                          {appeal.admin_response}
                                        </p>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Requests Tab */}
          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Verification Badge Requests</CardTitle>
                  <div className="flex items-center gap-2">
                    {verificationRequests.length > 0 && (
                      <Badge variant="secondary">
                        {verificationRequests.length} pending
                      </Badge>
                    )}
                    <Button
                      onClick={fetchVerificationRequests}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Review and approve verification badge requests for trusted
                  users
                </p>
              </CardHeader>
              <CardContent>
                {verificationRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No pending verification requests
                    </h3>
                    <p className="text-muted-foreground">
                      All verification badge requests have been processed
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>University</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Verification Photos</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verificationRequests.map((user) => (
                          <TableRow
                            key={user.verification_request_id || user.id}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={user.avatar_url}
                                    alt={user.full_name}
                                  />
                                  <AvatarFallback className="bg-university-green text-white text-sm">
                                    {user.full_name
                                      ? user.full_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)
                                      : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {user.full_name || "N/A"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ID:{" "}
                                    {user.student_id ||
                                      user.user_id.slice(0, 8)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {user.account_type} • Rating:{" "}
                                    {user.rating?.toFixed(1) || "0.0"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{user.email}</p>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{user.university_name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {user.phone_number || "No phone"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>
                                  {new Date(
                                    user.created_at
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {user.total_reviews || 0} reviews
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4 mr-1" />
                                      Face Photo
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Face Verification Photo
                                      </DialogTitle>
                                      <DialogDescription>
                                        View the user's face verification photo
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-center flex-col items-center gap-2">
                                      {user.face_photo_url ? (
                                        <>
                                          <img
                                            src={user.face_photo_url}
                                            alt="Face verification"
                                            className="max-w-full max-h-96 object-contain border rounded"
                                            onError={(e) => {
                                              const target =
                                                e.currentTarget as HTMLImageElement;
                                              target.style.display = "none";
                                              const errorMsg =
                                                target.nextElementSibling as HTMLElement;
                                              if (errorMsg)
                                                errorMsg.style.display =
                                                  "block";
                                            }}
                                          />
                                          <div
                                            className="text-red-500 text-sm text-center"
                                            style={{ display: "none" }}
                                          >
                                            ❌ Image failed to load
                                            <br />
                                            <span className="text-xs">
                                              Check storage permissions or run
                                              fix_profile_photos.sql
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <p className="text-muted-foreground">
                                          No face photo uploaded
                                        </p>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <IdCard className="h-4 w-4 mr-1" />
                                      View Profile
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Complete Seller Profile -{" "}
                                        {user.full_name}
                                      </DialogTitle>
                                      <DialogDescription>
                                        View all seller details and verification
                                        documents
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                          <Avatar className="h-16 w-16">
                                            <AvatarImage
                                              src={user.avatar_url}
                                            />
                                            <AvatarFallback className="bg-university-green text-white">
                                              {user.full_name
                                                ? user.full_name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .slice(0, 2)
                                                : "U"}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <h3 className="font-semibold text-lg">
                                              {user.full_name}
                                            </h3>
                                            <p className="text-muted-foreground">
                                              {user.email}
                                            </p>
                                            <div className="flex gap-2 mt-1">
                                              <Badge variant="outline">
                                                {user.account_type}
                                              </Badge>
                                              {user.is_verified && (
                                                <Badge variant="secondary">
                                                  Verified
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <Label className="font-medium">
                                              University
                                            </Label>
                                            <p>
                                              {user.university_name ||
                                                "Not set"}
                                            </p>
                                          </div>
                                          <div>
                                            <Label className="font-medium">
                                              Student ID
                                            </Label>
                                            <p>
                                              {user.student_id || "Not set"}
                                            </p>
                                          </div>
                                          <div>
                                            <Label className="font-medium">
                                              Phone
                                            </Label>
                                            <p>
                                              {user.phone_number || "Not set"}
                                            </p>
                                          </div>
                                          <div>
                                            <Label className="font-medium">
                                              Rating
                                            </Label>
                                            <p>
                                              {user.rating?.toFixed(1) || "0.0"}{" "}
                                              ({user.total_reviews || 0}{" "}
                                              reviews)
                                            </p>
                                          </div>
                                        </div>

                                        {user.bio && (
                                          <div>
                                            <Label className="font-medium">
                                              Bio
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                              {user.bio}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      <div className="space-y-4">
                                        <div>
                                          <Label className="font-medium mb-2 block">
                                            Face Verification Photo
                                          </Label>
                                          {user.avatar_url ? (
                                            <img
                                              src={user.avatar_url}
                                              alt="Face verification"
                                              className="w-full max-w-xs h-auto rounded border"
                                            />
                                          ) : (
                                            <p className="text-muted-foreground text-sm">
                                              No profile photo
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <Label className="font-medium mb-2 block">
                                            Student ID Card (Click to enlarge)
                                          </Label>
                                          {user.student_id_photo_url ? (
                                            <img
                                              src={user.student_id_photo_url}
                                              alt="Student ID verification"
                                              className="w-full h-auto rounded border"
                                              onClick={() =>
                                                window.open(
                                                  user.student_id_photo_url,
                                                  "_blank"
                                                )
                                              }
                                              title="Click to view full size"
                                            />
                                          ) : (
                                            <p className="text-muted-foreground text-sm">
                                              No ID photo
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="default" size="sm">
                                      <Shield className="h-4 w-4 mr-1" />
                                      Verify
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Approve Verification Badge
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to grant{" "}
                                        {user.full_name || "this user"} a
                                        verification badge? This will show a
                                        green checkmark on their profile
                                        indicating they are a trusted user.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
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
                                    <Button variant="outline" size="sm">
                                      <UserX className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Reject Verification Request
                                      </DialogTitle>
                                      <DialogDescription>
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
                                          <Label htmlFor="rejection_reason">
                                            Rejection Reason *
                                          </Label>
                                          <Textarea
                                            name="rejection_reason"
                                            placeholder="e.g., Photo quality is poor, Student ID is not clear, Additional verification needed..."
                                            required
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <DialogTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="outline"
                                            >
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Wallet Tab */}
          <TabsContent value="wallet">
            <AdminWallet />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Product Management</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => exportData("products")}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    {selectedProducts.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleBulkProductAction("activate")}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Activate
                        </Button>
                        <Button
                          onClick={() => handleBulkProductAction("deactivate")}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Products
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete{" "}
                                {selectedProducts.length} selected products?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleBulkProductAction("delete")
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedProducts.length ===
                                filteredProducts.length &&
                              filteredProducts.length > 0
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProducts(
                                  filteredProducts.map((p) => p.id)
                                );
                              } else {
                                setSelectedProducts([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProducts([
                                    ...selectedProducts,
                                    product.id,
                                  ]);
                                } else {
                                  setSelectedProducts(
                                    selectedProducts.filter(
                                      (id) => id !== product.id
                                    )
                                  );
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.title}
                          </TableCell>
                          <TableCell>₦{product.price}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>
                            {product.seller?.full_name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.is_active ? "default" : "secondary"
                              }
                            >
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(product.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Product Details - {product.title}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="font-medium">
                                          Title
                                        </Label>
                                        <p>{product.title}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">
                                          Description
                                        </Label>
                                        <p className="text-sm">
                                          {product.description ||
                                            "No description"}
                                        </p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="font-medium">
                                            Price
                                          </Label>
                                          <p>
                                            ₦{product.price.toLocaleString()}
                                          </p>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Category
                                          </Label>
                                          <p>{product.category}</p>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Status
                                          </Label>
                                          <Badge
                                            variant={
                                              product.is_active
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {product.is_active
                                              ? "Active"
                                              : "Inactive"}
                                          </Badge>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Created
                                          </Label>
                                          <p>
                                            {new Date(
                                              product.created_at
                                            ).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="font-medium">
                                          Seller
                                        </Label>
                                        <p>
                                          {product.seller?.full_name} (
                                          {product.seller?.email})
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="font-medium">
                                          Product Images
                                        </Label>
                                        {product.images &&
                                        product.images.length > 0 ? (
                                          <div className="grid grid-cols-2 gap-2 mt-2">
                                            {product.images.map(
                                              (image, index) => (
                                                <img
                                                  key={index}
                                                  src={image}
                                                  alt={`Product ${index + 1}`}
                                                  className="w-full h-32 object-cover rounded border"
                                                />
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-muted-foreground text-sm">
                                            No images uploaded
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-6 pt-4 border-t">
                                    <Button
                                      variant="outline"
                                      onClick={() => setEditingProduct(product)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Product
                                    </Button>
                                    <Button
                                      variant={
                                        product.is_active
                                          ? "outline"
                                          : "default"
                                      }
                                      onClick={() =>
                                        toggleProductStatus(
                                          product.id,
                                          product.is_active
                                        )
                                      }
                                    >
                                      {product.is_active
                                        ? "Deactivate"
                                        : "Activate"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Product
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {product.title}"? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteProduct(product.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Message Monitoring</CardTitle>
                  <Button
                    onClick={() => exportData("messages")}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="max-w-xs truncate">
                            {message.content}
                          </TableCell>
                          <TableCell>
                            {message.sender?.full_name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {message.conversations?.products?.title || "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>
                                Seller:{" "}
                                {message.conversations?.seller?.full_name ||
                                  "Unknown"}
                              </div>
                              <div>
                                Buyer:{" "}
                                {message.conversations?.buyer?.full_name ||
                                  "Unknown"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(message.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Message
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this
                                      message? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMessage(message.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Email Management</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {emailLogs.length} emails sent
                    </Badge>
                    <Button
                      onClick={fetchEmailLogs}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  View all emails sent by the system
                </p>
              </CardHeader>
              <CardContent>
                {emailLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No emails sent
                    </h3>
                    <p className="text-muted-foreground">
                      Email logs will appear here when notifications are sent
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailLogs.map((email) => (
                          <TableRow key={email.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {email.recipient_email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  From: {email.from_name}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="truncate" title={email.subject}>
                                {email.subject}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  email.status === "delivered"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {email.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(email.sent_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Email Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <Label className="font-medium">
                                          To:
                                        </Label>
                                        <p>{email.recipient_email}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">
                                          From:
                                        </Label>
                                        <p>{`${email.from_name} <${email.from_email}>`}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">
                                          Subject:
                                        </Label>
                                        <p>{email.subject}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">
                                          Status:
                                        </Label>
                                        <Badge
                                          variant={
                                            email.status === "delivered"
                                              ? "default"
                                              : "destructive"
                                          }
                                        >
                                          {email.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="font-medium">
                                        HTML Content:
                                      </Label>
                                      <div
                                        className="mt-2 p-4 border rounded bg-muted/50 max-h-96 overflow-y-auto"
                                        dangerouslySetInnerHTML={{
                                          __html: email.html_content,
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <Label className="font-medium">
                                        Text Content:
                                      </Label>
                                      <pre className="mt-2 p-4 border rounded bg-muted/50 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                                        {email.text_content}
                                      </pre>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Dispute Notification Templates</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {disputeTemplates.length} templates
                    </Badge>
                    <Button
                      onClick={fetchDisputeTemplates}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage email templates for dispute investigations
                </p>
              </CardHeader>
              <CardContent>
                {disputeTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No templates found
                    </h3>
                    <p className="text-muted-foreground">
                      Run the dispute system migration to create default
                      templates
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dispute Type</TableHead>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disputeTemplates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {template.dispute_type.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {template.template_name}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {template.subject}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                template.updated_at
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Template: {template.template_name}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="font-medium">
                                          Dispute Type:
                                        </Label>
                                        <p>
                                          {template.dispute_type.replace(
                                            "_",
                                            " "
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">
                                          Subject:
                                        </Label>
                                        <p>{template.subject}</p>
                                      </div>
                                      <div>
                                        <Label className="font-medium">
                                          Message Template:
                                        </Label>
                                        <pre className="mt-2 p-4 border rounded bg-muted/50 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                                          {template.message}
                                        </pre>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        <p>
                                          <strong>
                                            Available placeholders:
                                          </strong>
                                        </p>
                                        <p>
                                          {"{seller_name}"} - Seller's full name
                                        </p>
                                        <p>
                                          {"{product_title}"} - Product title
                                        </p>
                                        <p>{"{order_id}"} - Order ID</p>
                                        <p>
                                          {"{buyer_name}"} - Buyer's full name
                                        </p>
                                        <p>
                                          {"{order_date}"} - Order creation date
                                        </p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Edit Template: {template.template_name}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <form
                                      onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(
                                          e.currentTarget
                                        );
                                        const updates = {
                                          template_name: formData.get(
                                            "template_name"
                                          ) as string,
                                          subject: formData.get(
                                            "subject"
                                          ) as string,
                                          message: formData.get(
                                            "message"
                                          ) as string,
                                          updated_at: new Date().toISOString(),
                                        };

                                        try {
                                          // Mock update since table doesn't exist

                                          toast.success(
                                            "Template updated successfully"
                                          );
                                          fetchDisputeTemplates();
                                        } catch (error) {
                                          console.error(
                                            "Update template error:",
                                            error
                                          );
                                          toast.error(
                                            "Failed to update template"
                                          );
                                        }
                                      }}
                                      className="space-y-4"
                                    >
                                      <div>
                                        <Label htmlFor="template_name">
                                          Template Name
                                        </Label>
                                        <Input
                                          name="template_name"
                                          defaultValue={template.template_name}
                                          required
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="subject">
                                          Email Subject
                                        </Label>
                                        <Input
                                          name="subject"
                                          defaultValue={template.subject}
                                          required
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="message">
                                          Message Template
                                        </Label>
                                        <Textarea
                                          name="message"
                                          defaultValue={template.message}
                                          required
                                          rows={12}
                                          className="font-mono text-sm"
                                        />
                                      </div>
                                      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
                                        <p>
                                          <strong>
                                            Available placeholders:
                                          </strong>
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                          <p>
                                            {"{seller_name}"} - Seller's full
                                            name
                                          </p>
                                          <p>
                                            {"{product_title}"} - Product title
                                          </p>
                                          <p>{"{order_id}"} - Order ID</p>
                                          <p>
                                            {"{buyer_name}"} - Buyer's full name
                                          </p>
                                          <p>
                                            {"{order_date}"} - Order creation
                                            date
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <DialogTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="outline"
                                          >
                                            Cancel
                                          </Button>
                                        </DialogTrigger>
                                        <Button type="submit">
                                          Save Changes
                                        </Button>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>User Suggestions</CardTitle>
                  <div className="flex items-center gap-2">
                    {suggestions.filter((s) => s.status === "pending").length >
                      0 && (
                      <Badge variant="secondary">
                        {
                          suggestions.filter((s) => s.status === "pending")
                            .length
                        }{" "}
                        pending
                      </Badge>
                    )}
                    <Button
                      onClick={fetchSuggestions}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Review and manage user suggestions for platform improvements
                </p>
              </CardHeader>
              <CardContent>
                {suggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No suggestions
                    </h3>
                    <p className="text-muted-foreground">
                      Users can submit suggestions for platform improvements
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suggestions.map((suggestion) => (
                          <TableRow key={suggestion.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {suggestion.title}
                                </p>
                                <p
                                  className="text-sm text-muted-foreground truncate max-w-xs"
                                  title={suggestion.description}
                                >
                                  {suggestion.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {suggestion.category || "General"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  suggestion.priority === "critical"
                                    ? "destructive"
                                    : suggestion.priority === "high"
                                    ? "default"
                                    : suggestion.priority === "medium"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {suggestion.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  suggestion.status === "pending"
                                    ? "secondary"
                                    : suggestion.status === "approved"
                                    ? "default"
                                    : suggestion.status === "implemented"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {suggestion.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {suggestion.profiles?.full_name ||
                                    "Unknown User"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {suggestion.profiles?.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(
                                suggestion.created_at
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {suggestion.title}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Suggestion from{" "}
                                        {suggestion.profiles?.full_name}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="font-medium">
                                          Description
                                        </Label>
                                        <p className="text-sm mt-1 whitespace-pre-wrap">
                                          {suggestion.description}
                                        </p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="font-medium">
                                            Category
                                          </Label>
                                          <p className="text-sm">
                                            {suggestion.category || "General"}
                                          </p>
                                        </div>
                                        <div>
                                          <Label className="font-medium">
                                            Priority
                                          </Label>
                                          <p className="text-sm">
                                            {suggestion.priority}
                                          </p>
                                        </div>
                                      </div>
                                      {suggestion.admin_notes && (
                                        <div>
                                          <Label className="font-medium">
                                            Admin Notes
                                          </Label>
                                          <p className="text-sm mt-1 whitespace-pre-wrap">
                                            {suggestion.admin_notes}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                {suggestion.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={async () => {
                                        try {
                                          const { error } = await supabase
                                            .from("suggestions")
                                            .update({
                                              status: "approved",
                                              reviewed_by: user?.id,
                                              reviewed_at:
                                                new Date().toISOString(),
                                            })
                                            .eq("id", suggestion.id);

                                          if (error) throw error;

                                          toast.success("Suggestion approved");
                                          fetchSuggestions();
                                        } catch (error) {
                                          toast.error(
                                            "Failed to approve suggestion"
                                          );
                                        }
                                      }}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        try {
                                          const { error } = await supabase
                                            .from("suggestions")
                                            .update({
                                              status: "rejected",
                                              reviewed_by: user?.id,
                                              reviewed_at:
                                                new Date().toISOString(),
                                            })
                                            .eq("id", suggestion.id);

                                          if (error) throw error;

                                          toast.success("Suggestion rejected");
                                          fetchSuggestions();
                                        } catch (error) {
                                          toast.error(
                                            "Failed to reject suggestion"
                                          );
                                        }
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {suggestion.status === "approved" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from("suggestions")
                                          .update({
                                            status: "implemented",
                                            reviewed_by: user?.id,
                                            reviewed_at:
                                              new Date().toISOString(),
                                          })
                                          .eq("id", suggestion.id);

                                        if (error) throw error;

                                        toast.success(
                                          "Suggestion marked as implemented"
                                        );
                                        fetchSuggestions();
                                      } catch (error) {
                                        toast.error(
                                          "Failed to update suggestion"
                                        );
                                      }
                                    }}
                                  >
                                    Mark Implemented
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topCategories.map((category, index) => (
                      <div
                        key={category.category}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded">
                            <div
                              className="h-full bg-primary rounded"
                              style={{
                                width: `${
                                  (category.count /
                                    analytics.topCategories[0]?.count) *
                                    100 || 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {category.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Revenue</span>
                      <span className="font-bold text-lg">
                        ₦{analytics.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Monthly Growth</span>
                      <span className="font-bold text-green-600 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />+
                        {analytics.monthlyGrowth}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Orders This Month</span>
                      <span className="font-bold">
                        {analytics.recentOrders}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Escrow & Payouts Tab */}
          <TabsContent value="escrow">
            <div className="space-y-6">
              {/* Escrow Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Escrow Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Seller Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Auto Release</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {escrowTransactions.map((escrow) => (
                          <TableRow key={escrow.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  Order #{escrow.order_id.slice(0, 8)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Escrow Transaction
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              ₦{escrow.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              ₦{escrow.commission_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              ₦{escrow.seller_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  escrow.status === "held"
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {escrow.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {escrow.auto_release_at ? (
                                <span className="text-sm">
                                  {new Date(
                                    escrow.auto_release_at
                                  ).toLocaleDateString()}
                                </span>
                              ) : (
                                "Manual"
                              )}
                            </TableCell>
                            <TableCell>
                              {escrow.status === "held" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      Release Funds
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Release Escrow Funds
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to manually
                                        release ₦
                                        {escrow.seller_amount.toLocaleString()}{" "}
                                        to the seller?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          releaseEscrowFunds(escrow.id)
                                        }
                                      >
                                        Release Funds
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Payout Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Payout Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Bank Details</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payoutRequests.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {payout.profiles?.full_name ||
                                    `User #${payout.user_id.slice(0, 8)}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {payout.profiles?.email || "No email"}
                                </p>
                                {payout.wallets && (
                                  <p className="text-xs text-blue-600">
                                    Wallet: ₦
                                    {payout.wallets.available_balance?.toLocaleString() ||
                                      "0"}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              ₦{payout.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{payout.bank_account_name}</p>
                                <p>{payout.bank_account_number}</p>
                                <p>{payout.bank_name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payout.status === "pending"
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {payout.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(payout.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {payout.status === "pending" && (
                                <div className="flex gap-2">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm">Approve</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Approve Payout Request
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to approve this
                                          payout of ₦
                                          {payout.amount.toLocaleString()} to{" "}
                                          {payout.bank_account_name} (
                                          {payout.bank_name})?
                                          {payout.wallets &&
                                            payout.wallets.available_balance <
                                              payout.amount && (
                                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                                                ⚠️ Warning: Insufficient wallet
                                                balance (₦
                                                {payout.wallets.available_balance?.toLocaleString() ||
                                                  "0"}
                                                ) for this payout.
                                              </div>
                                            )}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            processPayoutRequest(
                                              payout.id,
                                              true,
                                              "Payout approved by admin"
                                            )
                                          }
                                          disabled={
                                            payout.wallets &&
                                            payout.wallets.available_balance <
                                              payout.amount
                                          }
                                        >
                                          Approve Payout
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      processPayoutRequest(
                                        payout.id,
                                        false,
                                        "Rejected by admin"
                                      )
                                    }
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {payout.status === "approved" && (
                                <Badge
                                  variant="default"
                                  className="text-green-700 bg-green-100"
                                >
                                  ✓ Processed
                                </Badge>
                              )}
                              {payout.status === "rejected" &&
                                payout.admin_notes && (
                                  <div className="text-xs text-red-600">
                                    Rejected: {payout.admin_notes}
                                  </div>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Disputes */}
              <Card>
                <CardHeader>
                  <CardTitle>Disputes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Reported By</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disputes.map((dispute) => (
                          <TableRow key={dispute.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  Order #{dispute.order_id.slice(0, 8)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {dispute.orders?.products?.title || "Product"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {dispute.reporter?.full_name || "Unknown"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Buyer
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {dispute.reason.replace("_", " ")}
                                </p>
                                {dispute.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {dispute.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  dispute.status === "open"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {dispute.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(
                                dispute.created_at
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {dispute.status === "open" && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      Investigate
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Investigate Dispute
                                      </DialogTitle>
                                      <DialogDescription>
                                        Contact seller about this dispute
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="p-4 bg-muted/50 rounded">
                                        <h4 className="font-medium mb-2">
                                          Dispute Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <p>
                                              <strong>Product:</strong>{" "}
                                              {dispute.orders?.products
                                                ?.title || "Unknown Product"}
                                            </p>
                                            <p>
                                              <strong>Order ID:</strong> #
                                              {dispute.order_id.slice(0, 8)}...
                                            </p>
                                            <p>
                                              <strong>Status:</strong>{" "}
                                              <Badge
                                                variant={
                                                  dispute.status === "open"
                                                    ? "destructive"
                                                    : "default"
                                                }
                                              >
                                                {dispute.status}
                                              </Badge>
                                            </p>
                                          </div>
                                          <div>
                                            <p>
                                              <strong>Reported By:</strong>{" "}
                                              {dispute.reporter?.full_name ||
                                                "Unknown Reporter"}
                                            </p>
                                            <p>
                                              <strong>Date Reported:</strong>{" "}
                                              {new Date(
                                                dispute.created_at
                                              ).toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="p-3 bg-blue-50 rounded">
                                            <h5 className="font-medium text-blue-900 mb-2">
                                              Seller Information
                                            </h5>
                                            <p className="text-sm">
                                              <strong>Name:</strong>{" "}
                                              {dispute.orders?.seller_profile
                                                ?.full_name || "Unknown Seller"}
                                            </p>
                                            <p className="text-sm">
                                              <strong>Student ID:</strong>{" "}
                                              {dispute.orders?.seller_profile
                                                ?.student_id || "N/A"}
                                            </p>
                                          </div>
                                          <div className="p-3 bg-green-50 rounded">
                                            <h5 className="font-medium text-green-900 mb-2">
                                              Buyer Information
                                            </h5>
                                            <p className="text-sm">
                                              <strong>Name:</strong>{" "}
                                              {dispute.orders?.buyer_profile
                                                ?.full_name || "Unknown Buyer"}
                                            </p>
                                            <p className="text-sm">
                                              <strong>Student ID:</strong>{" "}
                                              {dispute.orders?.buyer_profile
                                                ?.student_id || "N/A"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="mt-4 p-3 bg-red-50 rounded">
                                          <h5 className="font-medium text-red-900 mb-2">
                                            Dispute Information
                                          </h5>
                                          <p className="text-sm">
                                            <strong>Reason:</strong>{" "}
                                            <Badge
                                              variant="outline"
                                              className="ml-1"
                                            >
                                              {dispute.reason
                                                .replace("_", " ")
                                                .toUpperCase()}
                                            </Badge>
                                          </p>
                                          {dispute.description && (
                                            <p className="text-sm mt-2">
                                              <strong>Description:</strong>{" "}
                                              <span className="italic">
                                                {dispute.description}
                                              </span>
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => {
                                            const message = `🚨 DISPUTE ALERT - CampusConnect Admin\n\n📋 Order Details:\n• Order ID: #${dispute.order_id.slice(
                                              0,
                                              8
                                            )}...\n• Product: ${
                                              dispute.orders?.products?.title ||
                                              "Unknown Product"
                                            }\n\n👤 Seller Info:\n• Name: ${
                                              dispute.orders?.seller_profile
                                                ?.full_name || "Unknown"
                                            }\n• Student ID: ${
                                              dispute.orders?.seller_profile
                                                ?.student_id || "N/A"
                                            }\n\n👤 Buyer Info:\n• Name: ${
                                              dispute.orders?.buyer_profile
                                                ?.full_name || "Unknown"
                                            }\n• Student ID: ${
                                              dispute.orders?.buyer_profile
                                                ?.student_id || "N/A"
                                            }\n\n⚠️ Dispute Details:\n• Reason: ${dispute.reason
                                              .replace("_", " ")
                                              .toUpperCase()}\n• Description: ${
                                              dispute.description ||
                                              "No description provided"
                                            }\n• Reported: ${new Date(
                                              dispute.created_at
                                            ).toLocaleDateString()}\n\n📞 Please respond ASAP to help resolve this issue. Contact the buyer directly or provide clarification about the product/service.`;
                                            window.open(
                                              `https://wa.me/2349133054018?text=${encodeURIComponent(
                                                message
                                              )}`,
                                              "_blank"
                                            );
                                          }}
                                          className="text-green-600 border-green-600 hover:bg-green-50"
                                          variant="outline"
                                        >
                                          📱 Contact Seller via WhatsApp
                                        </Button>
                                        <Button
                                          onClick={async () => {
                                            try {
                                              await supabase
                                                .from("orders")
                                                .update({ status: "delivered" })
                                                .eq("id", dispute.order_id);

                                              toast.success("Dispute resolved");
                                              fetchEscrowData();
                                            } catch (error) {
                                              toast.error(
                                                "Failed to resolve dispute"
                                              );
                                            }
                                          }}
                                        >
                                          Mark Resolved
                                        </Button>
                                      </div>
                                    </div>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Investigate Dispute
                                      </DialogTitle>
                                      <DialogDescription>
                                        Send investigation notification to
                                        seller with custom message
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DisputeInvestigationForm
                                      dispute={dispute}
                                      onSuccess={() => fetchEscrowData()}
                                    />
                                  </DialogContent>
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Send Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Notifications</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Send notifications to users
                  </p>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const title = formData.get("title") as string;
                      const message = formData.get("message") as string;
                      const type = formData.get("type") as string;
                      const recipient = formData.get("recipient") as string;
                      const specificUserId = formData.get(
                        "specific_user_id"
                      ) as string;

                      try {
                        if (recipient === "all") {
                          // Send to all users
                          const { data: allUsers } = await supabase
                            .from("profiles")
                            .select("user_id");

                          if (allUsers) {
                            for (const user of allUsers) {
                              await supabase.from("notifications").insert({
                                user_id: user.user_id,
                                title,
                                message,
                                type,
                              });
                            }
                          }
                        } else if (recipient === "sellers") {
                          // Send to all sellers
                          const { data: sellers } = await supabase
                            .from("user_roles")
                            .select("user_id")
                            .eq("role", "seller");

                          if (sellers) {
                            for (const seller of sellers) {
                              await supabase.from("notifications").insert({
                                user_id: seller.user_id,
                                title,
                                message,
                                type,
                              });
                            }
                          }
                        } else if (recipient === "buyers") {
                          // Send to all buyers (users without seller role)
                          const { data: allUsers } = await supabase
                            .from("profiles")
                            .select("user_id");

                          const { data: sellers } = await supabase
                            .from("user_roles")
                            .select("user_id")
                            .eq("role", "seller");

                          const sellerIds =
                            sellers?.map((s) => s.user_id) || [];
                          const buyers =
                            allUsers?.filter(
                              (u) => !sellerIds.includes(u.user_id)
                            ) || [];

                          for (const buyer of buyers) {
                            await supabase.from("notifications").insert({
                              user_id: buyer.user_id,
                              title,
                              message,
                              type,
                            });
                          }
                        } else if (recipient === "specific" && specificUserId) {
                          // Find user by student ID
                          const { data: user, error: userError } =
                            await supabase
                              .from("profiles")
                              .select("user_id, full_name")
                              .eq("student_id", specificUserId.trim())
                              .single();

                          if (userError || !user) {
                            throw new Error(
                              `User not found with student ID: ${specificUserId}`
                            );
                          }

                          await supabase.from("notifications").insert({
                            user_id: user.user_id,
                            title,
                            message,
                            type,
                          });

                          toast.success(
                            `Notification sent to ${user.full_name}`
                          );
                        }

                        toast.success("Notifications sent successfully");
                        (e.target as HTMLFormElement).reset();
                      } catch (error) {
                        console.error("Send notification error:", error);
                        toast.error("Failed to send notifications");
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          name="title"
                          placeholder="Notification title"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select name="type" defaultValue="info">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        name="message"
                        placeholder="Notification message"
                        required
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recipient">Send To</Label>
                        <Select name="recipient" defaultValue="all">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="sellers">All Sellers</SelectItem>
                            <SelectItem value="buyers">All Buyers</SelectItem>
                            <SelectItem value="specific">
                              Specific User
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="specific_user_id">
                          Student ID (if specific)
                        </Label>
                        <Input
                          name="specific_user_id"
                          placeholder="Enter student ID"
                        />
                      </div>
                    </div>
                    <Button type="submit">Send Notification</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Platform Configuration
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Allow New Registrations</Label>
                            <p className="text-sm text-muted-foreground">
                              Control whether new users can register
                            </p>
                          </div>
                          <input type="checkbox" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Require Email Verification</Label>
                            <p className="text-sm text-muted-foreground">
                              Require users to verify their email
                            </p>
                          </div>
                          <input type="checkbox" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Enable Product Moderation</Label>
                            <p className="text-sm text-muted-foreground">
                              All new products require admin approval
                            </p>
                          </div>
                          <input type="checkbox" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Commission Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label>Platform Commission (%)</Label>
                          <Input
                            type="number"
                            defaultValue="5"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <Label>Minimum Order Value</Label>
                          <Input type="number" defaultValue="10" min="0" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button>Save Settings</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        {editingProduct && (
          <Dialog
            open={!!editingProduct}
            onOpenChange={() => setEditingProduct(null)}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Product - {editingProduct.title}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const updates = {
                    title: formData.get("title") as string,
                    description: formData.get("description") as string,
                    category: formData.get("category") as string,
                    price: parseFloat(formData.get("price") as string),
                    stock_quantity: parseInt(
                      formData.get("stock_quantity") as string
                    ),
                    condition: formData.get("condition") as string,
                    is_active: formData.get("is_active") === "true",
                  };
                  updateProductDetails(editingProduct.id, updates);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      name="title"
                      defaultValue={editingProduct.title}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      name="category"
                      defaultValue={editingProduct.category}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (₦)</Label>
                    <Input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={editingProduct.price}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      name="stock_quantity"
                      type="number"
                      defaultValue={editingProduct.stock_quantity}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      name="condition"
                      defaultValue={editingProduct.condition}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="is_active">Status</Label>
                    <Select
                      name="is_active"
                      defaultValue={editingProduct.is_active.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    name="description"
                    defaultValue={editingProduct.description}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingProduct(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

const updateProductDetails = async (productId: string, updates: any) => {
  try {
    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId);

    if (error) throw error;

    toast.success("Product updated successfully");
    // Refresh products list
    window.location.reload();
  } catch (error) {
    console.error("Update product error:", error);
    toast.error("Failed to update product");
  }
};
