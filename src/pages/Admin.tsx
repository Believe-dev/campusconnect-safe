import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { NIGERIAN_UNIVERSITIES } from "@/lib/constants";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  ShoppingBag,
  Flag,
  Check,
  ChevronsUpDown,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { triggerProfileUpdate } from "@/utils/realTimeEvents";
import { sendEmailNotification } from "@/utils/emailService";
import { sanitizeInput, validateEmail, validateName } from "@/lib/security";
import { AdminWallet } from "@/components/admin/AdminWallet";
import { SellerSubscriptionManager } from "@/components/admin/SellerSubscriptionManager";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { AdminStaffAccessTab } from "@/components/admin/tabs/AdminStaffAccessTab";
import { PendingApprovalsTab } from "@/components/admin/tabs/PendingApprovalsTab";
import { AtRiskSellersCard } from "@/components/admin/AtRiskSellersCard";
import { approveSellerEscrow, refundAnchorPayment } from "@/services/anchorBaasService";

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

interface ConversationSummary {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id?: string;
  created_at: string;
  product?: { title: string; price: number };
  buyer: { full_name: string; email: string; avatar_url?: string };
  seller: { full_name: string; email: string; avatar_url?: string };
  message_count: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
}

interface Analytics {
  totalRevenue: number;
  monthlyGrowth: number;
  topCategories: { category: string; count: number }[];
  recentOrders: number;
  sellerFeesEarned: number;
  commissionsEarned: number;
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
    seller_id: string;
    buyer_id: string;
    products: { title: string };
    seller_profile: { full_name: string; student_id?: string; email?: string };
    buyer_profile: { full_name: string; student_id?: string };
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
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const { canAccessTab, loading: permissionsLoading } = useAdminPermissions();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    monthlyGrowth: 0,
    topCategories: [],
    recentOrders: 0,
    sellerFeesEarned: 0,
    commissionsEarned: 0,
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalMessages: 0,
    totalConversations: 0,
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

  // Sellers + Verification are now PendingApprovalsTab's own state (see
  // that component) - this just receives its counts back for the combined
  // TabsTrigger badge, since that lives here in the tab strip.
  const [pendingApprovalCounts, setPendingApprovalCounts] = useState({
    sellers: 0,
    verification: 0,
  });
  // Same lift pattern as pendingApprovalCounts above, for the nav sidebar's
  // Orders and Subscriptions badges.
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [subscriptionAttentionCount, setSubscriptionAttentionCount] = useState(0);
  // Grouped-nav state (Stage 6) - Tabs is now controlled so the sidebar /
  // mobile picker can drive selection directly, instead of TabsTrigger
  // switching itself internally.
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Escrow and payout states
  const [escrowTransactions, setEscrowTransactions] = useState<
    EscrowTransaction[]
  >([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [productReports, setProductReports] = useState<ProductReport[]>([]);
  const [reportSearch, setReportSearch] = useState("");
  const [banAppeals, setBanAppeals] = useState<any[]>([]);
  const [appealSearch, setAppealSearch] = useState("");
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [disputeTemplates, setDisputeTemplates] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);

  // Refresh function for pull-to-refresh
  const handleRefresh = async () => {
    if (isAdmin || isSuperAdmin) {
      await Promise.all([
        fetchUsers(),
        fetchProducts(),
        fetchMessages(),
        fetchConversations(),
        fetchStats(),
        fetchAnalytics(),
        fetchEscrowData(),
        fetchProductReports(),
        fetchBanAppeals(),
        fetchEmailLogs(),
        fetchDisputeTemplates(),
        fetchSuggestions(),
        fetchPlatformSettings()
      ]);
    }
  };

  const handleViewConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    await fetchConversationMessages(conversationId);
  };

  const handleCloseConversationModal = () => {
    setSelectedConversationId(null);
    setConversationMessages([]);
  };

  useEffect(() => {
    if (isAdmin || isSuperAdmin) {
      console.log("Admin dashboard loading...");
      fetchUsers();
      fetchProducts();
      fetchMessages();
      fetchConversations();
      fetchStats();
      fetchAnalytics();
      fetchEscrowData();
      fetchProductReports();
      fetchBanAppeals();
      fetchEmailLogs();
      fetchDisputeTemplates();
      fetchSuggestions();
      fetchPlatformSettings();
    }
  }, [isAdmin, isSuperAdmin]);

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

  const fetchConversations = async () => {
    try {
      // Fetch conversations with message counts and last message
      const { data: conversationsData, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          buyer_id,
          seller_id,
          product_id,
          created_at,
          products(title, price),
          buyer:profiles!conversations_buyer_id_fkey(full_name, email, avatar_url),
          seller:profiles!conversations_seller_id_fkey(full_name, email, avatar_url)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      // Get message counts and last messages for each conversation
      const conversationIds = conversationsData.map(c => c.id);
      
      // Batch fetch message counts
      const messageCounts = {};
      const lastMessages = {};
      
      for (const convId of conversationIds) {
        // Get message count
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId);
        
        messageCounts[convId] = count || 0;
        
        // Get last message with sender info
        const { data: lastMsg } = await supabase
          .from("messages")
          .select(
            `
            content,
            created_at,
            sender:profiles!messages_sender_id_fkey(full_name)
          `
          )
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (lastMsg) {
          lastMessages[convId] = {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            sender_name: lastMsg.sender?.full_name || "Unknown"
          };
        }
      }

      // Process conversations with counts and last messages
      const processedConversations = conversationsData.map(conv => ({
        ...conv,
        message_count: messageCounts[conv.id] || 0,
        last_message: lastMessages[conv.id]
      }));

      setConversations(processedConversations);
    } catch (error) {
      toast.error("Failed to fetch conversations");
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    setLoadingConversation(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(full_name, email, avatar_url)
        `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setConversationMessages(data || []);
    } catch (error) {
      toast.error("Failed to fetch conversation messages");
    } finally {
      setLoadingConversation(false);
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

  const fetchStats = async () => {
    try {
      const [usersCount, productsCount, messagesCount, conversationsCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalProducts: productsCount.count || 0,
        totalMessages: messagesCount.count || 0,
        totalConversations: conversationsCount.count || 0,
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

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) throw error;
      setPlatformSettings(data);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
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
              .select("user_id, full_name, student_id, email")
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
            seller_id: order?.seller_id || "",
            buyer_id: order?.buyer_id || "",
            products: {
              title: product?.title || "Product Not Found",
            },
            seller_profile: {
              full_name: seller?.full_name || "Seller Not Found",
              student_id: seller?.student_id || "N/A",
              email: seller?.email || undefined,
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

  const releaseEscrowFunds = async (orderId: string) => {
    try {
      // Goes through the edge function's admin-release branch - it's the
      // only thing that can call release_escrow_funds now that it's
      // service_role-only, and it's also the only path that actually moves
      // the real Anchor bank transfer, not just the internal ledger.
      const result = await approveSellerEscrow(orderId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      fetchEscrowData();
    } catch (error) {
      toast.error("Failed to release escrow funds");
    }
  };

  const resolveDisputeForSeller = async (dispute: Dispute, reason: string) => {
    if (!dispute.orders?.seller_id) {
      toast.error("Missing seller information for this order");
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const result = await approveSellerEscrow(dispute.order_id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const { error } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution: `Resolved in favor of seller - funds released. Reason: ${reason}`,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", dispute.id);

      if (error) throw error;

      toast.success("Dispute resolved for seller - funds released");
      fetchEscrowData();
    } catch (error) {
      console.error("Error resolving dispute for seller:", error);
      toast.error("Failed to resolve dispute");
    }
  };

  const resolveDisputeForBuyer = async (dispute: Dispute, reason: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const result = await refundAnchorPayment(dispute.order_id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const { error: disputeError } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution: `Resolved in favor of buyer - payment reversed. Reason: ${reason}`,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", dispute.id);

      if (disputeError) throw disputeError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", dispute.order_id);

      if (orderError) {
        console.error("Error updating order status after reversal:", orderError);
      }

      toast.success("Dispute resolved for buyer - payment reversed");
      fetchEscrowData();
    } catch (error) {
      console.error("Error resolving dispute for buyer:", error);
      toast.error("Failed to resolve dispute");
    }
  };

  const processPayoutRequest = async (
    payoutId: string,
    approve: boolean,
    notes?: string
  ) => {
    try {
      if (approve) {
        // Fetched only for the confirmation message below - the actual
        // approval (pending/balance checks, wallet deduction, status
        // update, transaction record) is now atomic inside
        // admin_approve_payout_request, row-locked server-side.
        const { data: payout } = await supabase
          .from("payout_requests")
          .select("amount, bank_account_name, bank_account_number, bank_name")
          .eq("id", payoutId)
          .single();

        const { error } = await supabase.rpc("admin_approve_payout_request", {
          p_payout_id: payoutId,
          p_notes: notes || null,
        });

        if (error) throw error;

        toast.success(
          payout
            ? `Payout approved! ₦${payout.amount.toLocaleString()} deducted from wallet. Please manually transfer to ${payout.bank_account_name} (${payout.bank_name}) - Account: ${payout.bank_account_number}`
            : "Payout approved!"
        );
      } else {
        const { error } = await supabase.rpc("admin_reject_payout_request", {
          p_payout_id: payoutId,
          p_notes: notes || null,
        });

        if (error) throw error;

        toast.success("Payout request rejected");
      }

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

      // Real month-over-month revenue growth, using confirmed orders already
      // fetched above - no extra query needed.
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const lastMonth = lastMonthDate.getMonth();
      const lastMonthYear = lastMonthDate.getFullYear();

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

      const lastMonthRevenue =
        orders
          ?.filter((order) => {
            const orderDate = new Date(order.created_at);
            return (
              orderDate.getMonth() === lastMonth &&
              orderDate.getFullYear() === lastMonthYear
            );
          })
          .reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // No revenue last month makes a percentage change undefined - treat any
      // revenue this month as a fresh start (100%) rather than dividing by
      // zero or showing a fabricated figure.
      const monthlyGrowth =
        lastMonthRevenue > 0
          ? Number((((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
          : thisMonthRevenue > 0
          ? 100
          : 0;

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

      // What the platform itself earns, as opposed to totalRevenue above
      // (the gross value of products sold, which passes through to
      // sellers). Two real sources today: seller registration/renewal fees
      // (seller_subscriptions.amount - not seller_payment_intents, which
      // has zero 'paid' rows since all revenue so far predates the Anchor
      // payment flow) and commission on sales (escrow_transactions.
      // commission_amount where released - computed live rather than read
      // from admin_wallet.total_commissions, since that table currently has
      // no row and would silently read as 0 regardless of real commission
      // activity). Commission is 0% by deliberate current pricing (sellers
      // pay the registration fee instead), so this will legitimately show
      // ₦0 commission until/unless that changes.
      const { data: sellerFeeRows } = await supabase
        .from("seller_subscriptions")
        .select("amount");
      const sellerFeesEarned =
        sellerFeeRows?.reduce((sum, row) => sum + Number(row.amount), 0) || 0;

      const { data: commissionRows } = await supabase
        .from("escrow_transactions")
        .select("commission_amount")
        .eq("status", "released");
      const commissionsEarned =
        commissionRows?.reduce(
          (sum, row) => sum + Number(row.commission_amount || 0),
          0
        ) || 0;

      setAnalytics({
        totalRevenue,
        monthlyGrowth,
        topCategories,
        recentOrders: thisMonthOrders?.length || 0,
        sellerFeesEarned,
        commissionsEarned,
      });
    } catch (error) {
      // Analytics fetch failed silently
    }
  };

  const toggleUserBan = async (userId: string, isBanned: boolean) => {
    try {
      const { error } = isBanned
        ? await supabase.rpc("unban_user", { target_user_id: userId })
        : await supabase.rpc("ban_user", { target_user_id: userId });

      if (error) throw error;

      // Send notification if user is being unbanned
      if (isBanned) {
        const { sendNotification } = await import('@/utils/notificationService');
        await sendNotification({
          userId: userId,
          title: "Account Restored! 🎉",
          message:
            "Your account has been restored by an administrator. Welcome back to UniMarket!",
          type: "success",
          url: "/"
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
      // assign_user_role enforces this server-side now: 'users' tab grant
      // for buyer/seller changes, super_admin specifically for granting
      // 'admin'. The frontend dropdown already hides the Admin option from
      // non-super-admins, but that was only a UI restriction - this closes
      // the same gap at the RLS/function layer, verified against a scoped
      // admin actually getting rejected, not just that the code looks right.
      const { error } = await supabase.rpc("assign_user_role", {
        target_user_id: userId,
        new_role: newRole,
      });

      if (error) throw error;

      toast.success("User role updated successfully");
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      toast.error(error?.message || "Failed to update user role");
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
        const { sendNotification } = await import('@/utils/notificationService');
        await sendNotification({
          userId: userId,
          title: "Account Verified! ✅",
          message:
            "Congratulations! Your account has been verified. You now have a verified badge on your profile.",
          type: "success",
          url: "/profile"
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

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const updateProductDetails = async (productId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
      fetchProducts();
      setEditingProduct(null);
    } catch (error) {
      console.error("Update product error:", error);
      toast.error("Failed to update product");
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

      queryClient.invalidateQueries({ queryKey: ["products"] });
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
        const rpcName = action === "ban" ? "ban_user" : "unban_user";
        const results = await Promise.all(
          selectedUsers.map((userId) =>
            supabase.rpc(rpcName, { target_user_id: userId })
          )
        );
        const firstError = results.find((r) => r.error)?.error;
        if (firstError) throw firstError;

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

      queryClient.invalidateQueries({ queryKey: ["products"] });
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

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background">
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

      const handleSendInvestigation = async () => {
        if (!selectedTemplate && !useCustomMessage) {
          toast.error("Please select a template or write a custom message");
          return;
        }

        if (useCustomMessage && !customMessage.trim()) {
          toast.error("Please enter a custom message");
          return;
        }

        if (!dispute.orders?.seller_id) {
          toast.error("Missing seller information for this order");
          return;
        }

        const template = disputeTemplates.find(
          (t) => t.dispute_type === selectedTemplate
        );
        const message = useCustomMessage
          ? customMessage.trim()
          : getTemplatePreview();
        const subject =
          !useCustomMessage && template?.subject
            ? template.subject
            : `Dispute Investigation - Order #${dispute.order_id.slice(0, 8)}`;

        setSending(true);
        try {
          const { sendNotification } = await import(
            "@/utils/notificationService"
          );
          const notified = await sendNotification({
            userId: dispute.orders.seller_id,
            title: subject,
            message,
            type: "warning",
            url: "/orders",
          });

          let emailed = true;
          if (dispute.orders.seller_profile?.email) {
            emailed = await sendEmailNotification({
              to_email: dispute.orders.seller_profile.email,
              to_name: dispute.orders.seller_profile?.full_name || "Seller",
              subject,
              message,
              notification_type: "dispute_investigation",
            });
          }

          if (!notified && !emailed) {
            throw new Error("Both notification channels failed");
          }

          toast.success("Investigation notification sent to seller");
          onSuccess();
        } catch (error) {
          console.error("Error sending investigation notification:", error);
          toast.error("Failed to send investigation notification");
        } finally {
          setSending(false);
        }
      };

      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="use-template"
                checked={!useCustomMessage}
                onChange={() => setUseCustomMessage(false)}
              />
              <Label htmlFor="use-template" className="text-flora-ink">
                Use Template Message
              </Label>
            </div>

            {!useCustomMessage && (
              <div>
                <Label className="text-flora-ink">Select Template</Label>
                <select
                  className="w-full rounded-lg border border-flora-ink/15 bg-white p-2 text-sm text-flora-ink"
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
                  <div className="mt-3 rounded-xl bg-flora-chip/30 p-3 text-sm">
                    <Label className="font-medium text-flora-ink">Preview:</Label>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-flora-ink">
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
              <Label htmlFor="use-custom" className="text-flora-ink">
                Write Custom Message
              </Label>
            </div>

            {useCustomMessage && (
              <div>
                <Label className="text-flora-ink">Custom Investigation Message</Label>
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
              <button
                type="button"
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-2 text-sm font-medium text-flora-ink transition hover:bg-flora-chip disabled:opacity-50"
              >
                Cancel
              </button>
            </DialogTrigger>
            <button
              type="button"
              onClick={handleSendInvestigation}
              disabled={
                sending ||
                (!selectedTemplate && !useCustomMessage) ||
                (useCustomMessage && !customMessage.trim())
              }
              className="inline-flex items-center gap-2 rounded-full bg-flora-ink px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Investigation Notice"}
            </button>
          </div>
        </div>
      );
    }
  );

  // Grouped nav config (Stage 6). Each tab keeps using the exact same
  // canAccessTab()/isSuperAdmin checks the old flat TabsTrigger strip used -
  // grouping is presentation only, a group heading grants nothing. A group
  // only renders if at least one of its tabs is visible; a badge only
  // counts tabs the current admin can actually see.
  const navGroups = [
    {
      key: "overview",
      label: "Overview",
      icon: BarChart3,
      tabs: [{ value: "overview", label: "Overview", visible: true, badge: 0 }],
    },
    {
      key: "moderation",
      label: "Moderation",
      icon: Flag,
      tabs: [
        {
          value: "approvals",
          label: "Approvals",
          visible: canAccessTab("sellers") || canAccessTab("verification"),
          badge: pendingApprovalCounts.sellers + pendingApprovalCounts.verification,
        },
        {
          value: "reports",
          label: "Reports",
          visible: canAccessTab("reports"),
          badge: productReports.filter((r) => r.status === "pending").length,
        },
        {
          value: "appeals",
          label: "Appeals",
          visible: canAccessTab("appeals"),
          badge: banAppeals.filter((a) => a.status === "pending").length,
        },
      ],
    },
    {
      key: "marketplace",
      label: "Marketplace",
      icon: Package,
      tabs: [
        { value: "products", label: "Products", visible: canAccessTab("products"), badge: 0 },
        {
          value: "orders",
          label: "Orders",
          visible: canAccessTab("orders"),
          badge: pendingOrdersCount,
        },
        { value: "messages", label: "Messages", visible: canAccessTab("messages"), badge: 0 },
      ],
    },
    {
      key: "finance",
      label: "Finance",
      icon: DollarSign,
      tabs: [
        {
          value: "escrow",
          label: "Escrow",
          visible: canAccessTab("escrow"),
          badge:
            escrowTransactions.filter((e) => e.status === "held").length +
            payoutRequests.filter((p) => p.status === "pending").length +
            disputes.filter((d) => d.status === "open").length,
        },
        { value: "wallet", label: "Admin Wallet", visible: canAccessTab("wallet"), badge: 0 },
        {
          value: "subscriptions",
          label: "Subscriptions",
          visible: canAccessTab("subscriptions"),
          badge: subscriptionAttentionCount,
        },
      ],
    },
    {
      key: "people",
      label: "People",
      icon: Users,
      tabs: [{ value: "users", label: "Users", visible: canAccessTab("users"), badge: 0 }],
    },
    {
      key: "platform",
      label: "Platform",
      icon: Settings,
      tabs: [
        {
          value: "suggestions",
          label: "Suggestions",
          visible: canAccessTab("suggestions"),
          badge: suggestions.filter((s) => s.status === "pending").length,
        },
        { value: "settings", label: "Settings", visible: canAccessTab("settings"), badge: 0 },
        { value: "templates", label: "Templates", visible: canAccessTab("templates"), badge: 0 },
        { value: "emails", label: "Emails", visible: canAccessTab("emails"), badge: 0 },
      ],
    },
    {
      key: "staff",
      label: "Staff",
      icon: Shield,
      tabs: [{ value: "staff", label: "Staff Access", visible: isSuperAdmin, badge: 0 }],
    },
  ]
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((t) => t.visible),
    }))
    .filter((group) => group.tabs.length > 0)
    .map((group) => ({
      ...group,
      badge: group.tabs.reduce((sum, t) => sum + t.badge, 0),
    }));

  const activeGroup =
    navGroups.find((g) => g.tabs.some((t) => t.value === activeTab)) ||
    navGroups[0];

  const selectGroup = (group: (typeof navGroups)[number]) => {
    if (!group.tabs.some((t) => t.value === activeTab)) {
      setActiveTab(group.tabs[0].value);
    }
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-flora-ink sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-flora-muted">
              Manage all aspects of your marketplace
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Grouped navigation (Stage 6) - all TabsContent blocks below are
            unchanged from the old flat-TabsList version; only the nav chrome
            around them changed. Tabs is now controlled so the sidebar/mobile
            picker can drive selection. */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {/* Desktop sidebar */}
            <nav className="hidden shrink-0 flex-col gap-1 md:flex md:w-56">
              {navGroups.map((group) => {
                const Icon = group.icon;
                const isActive = group.key === activeGroup.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => selectGroup(group)}
                    className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-flora-ink text-white"
                        : "text-flora-ink hover:bg-flora-chip"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {group.label}
                    </span>
                    {group.badge > 0 && (
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                          isActive ? "bg-white/20 text-white" : "bg-flora-chip text-flora-ink"
                        }`}
                      >
                        {group.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0 flex-1">
              {/* Mobile section picker */}
              <div className="mb-4 md:hidden">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-full border border-flora-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-flora-ink"
                    >
                      <span className="flex items-center gap-2">
                        <activeGroup.icon className="h-4 w-4" />
                        {activeGroup.label}
                      </span>
                      <span className="flex items-center gap-2">
                        {activeGroup.badge > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-flora-chip px-1 text-xs font-semibold text-flora-ink">
                            {activeGroup.badge}
                          </span>
                        )}
                        <ChevronDown className="h-4 w-4 text-flora-muted" />
                      </span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-3xl">
                    <SheetHeader>
                      <SheetTitle className="text-flora-ink">Jump to section</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-1 pb-4">
                      {navGroups.map((group) => {
                        const Icon = group.icon;
                        const isActive = group.key === activeGroup.key;
                        return (
                          <button
                            key={group.key}
                            type="button"
                            onClick={() => selectGroup(group)}
                            className={`flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                              isActive
                                ? "bg-flora-ink text-white"
                                : "text-flora-ink hover:bg-flora-chip"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {group.label}
                            </span>
                            {group.badge > 0 && (
                              <span
                                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                                  isActive ? "bg-white/20 text-white" : "bg-flora-chip text-flora-ink"
                                }`}
                              >
                                {group.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Sub-tab pills - only for groups with more than one visible
                  tab; single-destination groups (Overview, People, Staff)
                  render straight into their content. */}
              {activeGroup.tabs.length > 1 && (
                <div className="mb-4 flex w-fit flex-wrap items-center gap-1 rounded-full border border-flora-ink/15 bg-white p-1">
                  {activeGroup.tabs.map((tab) => {
                    const isActive = tab.value === activeTab;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                          isActive
                            ? "bg-flora-ink text-white"
                            : "text-flora-ink hover:bg-flora-chip"
                        }`}
                      >
                        {tab.label}
                        {tab.badge > 0 && (
                          <span
                            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                              isActive ? "bg-white/20 text-white" : "bg-flora-chip text-flora-ink"
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="rounded-3xl bg-flora-card p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-flora-muted">Total Users</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
                        <Users className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-flora-ink">{stats.totalUsers}</p>
                    <p className="mt-1 text-xs text-flora-muted">
                      {stats.activeUsers} active users
                    </p>
                  </div>

                  <div className="rounded-3xl bg-flora-card p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-flora-muted">Total Products</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
                        <Package className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-flora-ink">{stats.totalProducts}</p>
                  </div>

                  {/* Financial - default withheld from a regular admin unless
                      specifically granted one of the financial tabs, same boundary
                      as the tabs themselves (this card sits outside the tab system
                      entirely, so it needs its own check). */}
                  {(isSuperAdmin ||
                    canAccessTab("escrow") ||
                    canAccessTab("wallet") ||
                    canAccessTab("subscriptions")) && (
                  <div className="rounded-3xl bg-flora-card p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-flora-muted">Products Sold</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
                        <DollarSign className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-flora-ink">
                      ₦{analytics.totalRevenue.toLocaleString()}
                    </p>
                    <p
                      className={`mt-1 flex items-center text-xs ${
                        analytics.monthlyGrowth >= 0 ? "text-flora-leaf" : "text-red-600"
                      }`}
                    >
                      {analytics.monthlyGrowth >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {analytics.monthlyGrowth >= 0 ? "+" : ""}
                      {analytics.monthlyGrowth}% from last month
                    </p>
                  </div>
                  )}

                  {/* What the platform itself earns (fees + commission), separate
                      from the gross product value above which passes through to
                      sellers. Same financial-visibility boundary. */}
                  {(isSuperAdmin ||
                    canAccessTab("escrow") ||
                    canAccessTab("wallet") ||
                    canAccessTab("subscriptions")) && (
                  <div className="rounded-3xl bg-flora-card p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-flora-muted">Platform Earnings</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
                        <DollarSign className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-flora-ink">
                      ₦{(analytics.sellerFeesEarned + analytics.commissionsEarned).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-flora-muted">
                      ₦{analytics.sellerFeesEarned.toLocaleString()} fees · ₦{analytics.commissionsEarned.toLocaleString()} commission
                    </p>
                  </div>
                  )}

                  {/* Same financial-visibility boundary as Revenue - order volume is
                      business-performance data, not something a regular admin needs
                      by default. */}
                  {(isSuperAdmin ||
                    canAccessTab("escrow") ||
                    canAccessTab("wallet") ||
                    canAccessTab("subscriptions")) && (
                  <div className="rounded-3xl bg-flora-card p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-flora-muted">Orders This Month</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
                        <ShoppingBag className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-flora-ink">{analytics.recentOrders}</p>
                  </div>
                  )}

                  <div className="rounded-3xl bg-flora-card p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-flora-muted">Conversations</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-flora-ink">{stats.totalConversations}</p>
                    <p className="mt-1 text-xs text-flora-muted">
                      {stats.totalMessages} total messages
                    </p>
                  </div>
                </div>

                {/* Top Categories - active product distribution, not financial, so
                    visible to any admin regardless of tab grants. */}
                <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
                  <h2 className="text-lg font-bold text-flora-ink">Top Categories</h2>
                  <p className="mt-1 text-sm text-flora-muted">
                    Active product listings by category
                  </p>
                  {analytics.topCategories.length === 0 ? (
                    <p className="mt-4 text-sm text-flora-muted">
                      No active products yet
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {analytics.topCategories.map((category) => (
                        <div
                          key={category.category}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="font-medium text-flora-ink">
                            {category.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-flora-chip sm:w-40">
                              <div
                                className="h-full rounded-full bg-flora-leaf"
                                style={{
                                  width: `${
                                    (category.count /
                                      analytics.topCategories[0]?.count) *
                                      100 || 0
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-flora-muted">
                              {category.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

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
                                  const results = await Promise.all(
                                    selectedUsers.map((userId) =>
                                      supabase.rpc("ban_user", {
                                        target_user_id: userId,
                                        reason: reason.trim(),
                                      })
                                    )
                                  );
                                  const firstError = results.find((r) => r.error)?.error;
                                  if (firstError) throw firstError;

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
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-32 h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                    style={{
                      backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '12px 8px'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                  </select>
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
                                    <select
                                      onChange={(e) => updateUserRole(user.user_id, e.target.value as "admin" | "seller" | "buyer")}
                                      className="w-40 h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                                      style={{
                                        backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        backgroundSize: '12px 8px'
                                      }}
                                    >
                                      <option value="">Change role</option>
                                      <option value="buyer">Buyer</option>
                                      <option value="seller">Seller</option>
                                      {/* Only super_admin can grant admin - closes the
                                          previous gap where any admin could promote
                                          anyone, including themselves. */}
                                      {isSuperAdmin && <option value="admin">Admin</option>}
                                    </select>

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
                                              const { sendNotification } = await import('@/utils/notificationService');
                                              await sendNotification({
                                                userId: user.user_id,
                                                title: 'Password Changed',
                                                message: 'Your password has been reset by an administrator. Please log in with your new password.',
                                                type: 'info',
                                                url: '/auth'
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
                                              const { sendNotification } = await import('@/utils/notificationService');
                                              await sendNotification({
                                                userId: user.user_id,
                                                title: 'Profile Updated',
                                                message: 'Your profile picture has been updated by an administrator.',
                                                type: 'info',
                                                url: '/profile'
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
                                                const { error } = await supabase.rpc(
                                                  "ban_user",
                                                  {
                                                    target_user_id: user.user_id,
                                                    reason: reason.trim(),
                                                  }
                                                );

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
                                          Delete Account
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Delete Account
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Permanently ban {user.full_name} and
                                            remove their personal information
                                            (name, email, phone, photos, bio).
                                            Their orders, products, and
                                            messages stay on record - other
                                            users' order/dispute history still
                                            needs them to make sense - but will
                                            show as "Deleted User" going
                                            forward. Their listings are taken
                                            down. This cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={async () => {
                                              try {
                                                const { error } = await supabase.rpc(
                                                  "admin_delete_user",
                                                  { target_user_id: user.user_id }
                                                );
                                                if (error) throw error;
                                                toast.success("Account deleted");
                                                fetchUsers();
                                              } catch (error: any) {
                                                toast.error(
                                                  error.message || "Failed to delete account"
                                                );
                                              }
                                            }}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete Account
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
                                          <select
                                            name="university_name"
                                            defaultValue={editingUser.university_name || ""}
                                            className="w-full h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                                            style={{
                                              backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                                              backgroundRepeat: 'no-repeat',
                                              backgroundPosition: 'right 12px center',
                                              backgroundSize: '12px 8px'
                                            }}
                                          >
                                            <option value="">Select university...</option>
                                            {NIGERIAN_UNIVERSITIES.map((university) => (
                                              <option key={university} value={university}>
                                                {university}
                                              </option>
                                            ))}
                                          </select>
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

          {/* Seller applications + verification badge requests - merged into
              one tab with two sub-views (see PendingApprovalsTab); the two
              admin_permissions tab_keys stay separate so a Super Admin can
              still delegate one without the other. */}
          <TabsContent value="approvals">
            <PendingApprovalsTab
              canAccessSellers={canAccessTab("sellers")}
              canAccessVerification={canAccessTab("verification")}
              onUserDataChanged={fetchUsers}
              onCountsChange={(sellers, verification) =>
                setPendingApprovalCounts({ sellers, verification })
              }
            />
          </TabsContent>

          {/* Product Reports Tab */}
          <TabsContent value="reports">
            <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-flora-ink">
                  Product Issue Reports
                </h2>
                <div className="flex items-center gap-2">
                  {productReports.filter((r) => r.status === "pending")
                    .length > 0 && (
                    <span className="rounded-full bg-flora-chip px-2.5 py-0.5 text-xs font-medium text-flora-ink">
                      {
                        productReports.filter((r) => r.status === "pending")
                          .length
                      }{" "}
                      pending
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fetchProductReports}
                    className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-flora-muted">
                Review product issue reports and contact sellers via email
              </p>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
                <Input
                  placeholder="Search by product, seller, or reporter..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
                />
              </div>
              {productReports.length === 0 ? (
                <div className="py-12 text-center">
                  <Flag className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
                  <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                    No product reports
                  </h3>
                  <p className="text-flora-muted">
                    No issues have been reported with products
                  </p>
                </div>
              ) : (
                (() => {
                  const q = reportSearch.trim().toLowerCase();
                  const filteredReports = q
                    ? productReports.filter(
                        (report) =>
                          report.product?.title?.toLowerCase().includes(q) ||
                          report.seller?.full_name
                            ?.toLowerCase()
                            .includes(q) ||
                          report.reporter?.full_name
                            ?.toLowerCase()
                            .includes(q) ||
                          report.reporter?.email?.toLowerCase().includes(q)
                      )
                    : productReports;

                  return filteredReports.length === 0 ? (
                    <div className="py-12 text-center">
                      <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
                      <p className="text-flora-muted">
                        No reports match "{reportSearch}"
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                            <TableHead className="text-flora-ink">
                              Product
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Reported By
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Reason
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Description
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Status
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Reported
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredReports.map((report) => (
                            <TableRow
                              key={report.id}
                              className="hover:bg-flora-chip/20"
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium text-flora-ink">
                                    {report.product?.title ||
                                      "Unknown Product"}
                                  </p>
                                  <p className="text-sm text-flora-muted">
                                    Seller:{" "}
                                    {report.seller?.full_name || "Unknown"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-flora-ink">
                                    {report.reporter?.full_name || "Unknown"}
                                  </p>
                                  <p className="text-sm text-flora-muted">
                                    {report.reporter?.email}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="rounded-full bg-flora-chip px-2.5 py-0.5 text-xs font-medium text-flora-ink">
                                  {report.reason.replace("_", " ")}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p
                                  className="truncate text-sm text-flora-muted"
                                  title={report.description}
                                >
                                  {report.description}
                                </p>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    report.status === "pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-flora-leaf/15 text-flora-leaf"
                                  }`}
                                >
                                  {report.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-flora-muted">
                                {new Date(
                                  report.created_at
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                                      >
                                        Email Seller
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-3xl">
                                      <DialogHeader>
                                        <DialogTitle className="text-flora-ink">
                                          Send Email to Seller
                                        </DialogTitle>
                                        <DialogDescription className="text-flora-muted">
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
                                            }\n\nPlease review your product listing and make any necessary corrections.\n\nBest regards,\nUniMarket Admin Team`}
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
                                                      email:
                                                        report.seller?.email,
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
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink px-3.5 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                                        >
                                          Mark Resolved
                                        </button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-3xl">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-flora-ink">
                                            Mark Report as Resolved
                                          </AlertDialogTitle>
                                          <AlertDialogDescription className="text-flora-muted">
                                            This just updates the report's
                                            status for your own tracking - the
                                            reporter and seller are not
                                            notified.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={async () => {
                                              try {
                                                const { error } =
                                                  await supabase
                                                    .from("product_reports")
                                                    .update({
                                                      status: "resolved",
                                                    })
                                                    .eq("id", report.id);

                                                if (error) throw error;

                                                toast.success(
                                                  "Report marked as resolved"
                                                );
                                                fetchProductReports();
                                              } catch (error) {
                                                toast.error(
                                                  "Failed to update report"
                                                );
                                              }
                                            }}
                                          >
                                            Mark Resolved
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()
              )}
            </div>
          </TabsContent>

          {/* Ban Appeals Tab */}
          <TabsContent value="appeals">
            <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-flora-ink">
                  Ban Appeals
                </h2>
                <div className="flex items-center gap-2">
                  {banAppeals.filter((a) => a.status === "pending").length >
                    0 && (
                    <span className="rounded-full bg-flora-chip px-2.5 py-0.5 text-xs font-medium text-flora-ink">
                      {
                        banAppeals.filter((a) => a.status === "pending")
                          .length
                      }{" "}
                      pending
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fetchBanAppeals}
                    className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-flora-muted">
                Review appeals from banned users
              </p>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
                <Input
                  placeholder="Search by name, email, or student ID..."
                  value={appealSearch}
                  onChange={(e) => setAppealSearch(e.target.value)}
                  className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
                />
              </div>
              {banAppeals.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
                  <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                    No ban appeals
                  </h3>
                  <p className="text-flora-muted">
                    Banned users can submit appeals through the login screen
                  </p>
                </div>
              ) : (
                (() => {
                  const q = appealSearch.trim().toLowerCase();
                  const filteredAppeals = q
                    ? banAppeals.filter(
                        (appeal) =>
                          appeal.full_name?.toLowerCase().includes(q) ||
                          appeal.user_email?.toLowerCase().includes(q) ||
                          appeal.matric_number?.toLowerCase().includes(q)
                      )
                    : banAppeals;

                  return filteredAppeals.length === 0 ? (
                    <div className="py-12 text-center">
                      <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
                      <p className="text-flora-muted">
                        No appeals match "{appealSearch}"
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                            <TableHead className="text-flora-ink">
                              User Details
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Email
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Student ID
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Appeal Message
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Status
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Submitted
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppeals.map((appeal) => (
                            <TableRow
                              key={appeal.id}
                              className="hover:bg-flora-chip/20"
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium text-flora-ink">
                                    {appeal.full_name}
                                  </p>
                                  <p className="text-xs text-flora-muted">
                                    Appeal #{appeal.id.slice(0, 8)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-flora-muted">
                                {appeal.user_email}
                              </TableCell>
                              <TableCell className="text-flora-muted">
                                {appeal.matric_number}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="flex items-center gap-2">
                                  <p
                                    className="flex-1 truncate text-sm text-flora-muted"
                                    title={appeal.message}
                                  >
                                    {appeal.message}
                                  </p>
                                  {appeal.message.length > 50 && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white p-1.5 text-flora-ink transition hover:bg-flora-chip"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="rounded-3xl">
                                        <DialogHeader>
                                          <DialogTitle className="text-flora-ink">
                                            Full Appeal Message
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="max-h-96 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-flora-ink">
                                            {appeal.message}
                                          </p>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    appeal.status === "pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : appeal.status === "approved"
                                      ? "bg-flora-leaf/15 text-flora-leaf"
                                      : "bg-red-100 text-red-600"
                                  }`}
                                >
                                  {appeal.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-flora-muted">
                                {new Date(
                                  appeal.created_at
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {appeal.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink px-3.5 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                                        >
                                          Approve
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="rounded-3xl">
                                        <DialogHeader>
                                          <DialogTitle className="text-flora-ink">
                                            Approve Ban Appeal
                                          </DialogTitle>
                                          <DialogDescription className="text-flora-muted">
                                            This will unban the user and send
                                            them a notification. Provide a
                                            response message.
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

                                              if (appealError)
                                                throw appealError;

                                              // Find and unban the user
                                              const { data: user } =
                                                await supabase
                                                  .from("profiles")
                                                  .select("user_id, full_name")
                                                  .eq(
                                                    "email",
                                                    appeal.user_email
                                                  )
                                                  .eq(
                                                    "student_id",
                                                    appeal.matric_number
                                                  )
                                                  .single();

                                              if (user) {
                                                // Unban the user
                                                await supabase.rpc(
                                                  "unban_user",
                                                  {
                                                    target_user_id:
                                                      user.user_id,
                                                    clear_notes: true,
                                                  }
                                                );

                                                // Send notification to unbanned user
                                                const { sendNotification } =
                                                  await import(
                                                    "@/utils/notificationService"
                                                  );
                                                await sendNotification({
                                                  userId: user.user_id,
                                                  title:
                                                    "Account Restored! 🎉",
                                                  message:
                                                    response ||
                                                    "Your ban appeal has been approved and your account has been restored. Welcome back to UniMarket!",
                                                  type: "success",
                                                  url: "/",
                                                });

                                                // Send secure email notification
                                                try {
                                                  await sendEmailNotification({
                                                    to_email:
                                                      appeal.user_email,
                                                    to_name: appeal.full_name,
                                                    subject:
                                                      "Ban Appeal Approved - Account Restored",
                                                    message:
                                                      response ||
                                                      "Your appeal was approved and your account has been restored.",
                                                    notification_type:
                                                      "ban_approval",
                                                  });
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
                                        <button
                                          type="button"
                                          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                                        >
                                          Reject
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="rounded-3xl">
                                        <DialogHeader>
                                          <DialogTitle className="text-flora-ink">
                                            Reject Ban Appeal
                                          </DialogTitle>
                                          <DialogDescription className="text-flora-muted">
                                            Provide a reason for rejecting
                                            this appeal.
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

                                              if (appealError)
                                                throw appealError;

                                              // Send rejection email
                                              try {
                                                await sendEmailNotification({
                                                  to_email: appeal.user_email,
                                                  to_name: appeal.full_name,
                                                  subject:
                                                    "Ban Appeal Rejected",
                                                  message: response,
                                                  notification_type:
                                                    "ban_rejection",
                                                });
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
                                              <Label>Rejection Reason *</Label>
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
                                        <button
                                          type="button"
                                          className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                                        >
                                          View Response
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="rounded-3xl">
                                        <DialogHeader>
                                          <DialogTitle className="text-flora-ink">
                                            Admin Response
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-2">
                                          <p className="text-sm text-flora-ink">
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
                  );
                })()
              )}
            </div>
          </TabsContent>

          {/* Seller Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <SellerSubscriptionManager onCountsChange={setSubscriptionAttentionCount} />
          </TabsContent>

          {/* Admin Wallet Tab */}
          <TabsContent value="wallet">
            <AdminWallet />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-flora-ink">
                  Product Management
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportData("products")}
                    className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  {selectedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                          >
                            <Eye className="h-4 w-4" />
                            Activate
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-flora-ink">
                              Activate Products
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-flora-muted">
                              Make {selectedProducts.length} selected product
                              {selectedProducts.length === 1
                                ? ""
                                : "s"}{" "}
                              visible on the marketplace again?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleBulkProductAction("activate")
                              }
                            >
                              Activate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                          >
                            <Eye className="h-4 w-4" />
                            Deactivate
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-flora-ink">
                              Deactivate Products
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-flora-muted">
                              Hide {selectedProducts.length} selected product
                              {selectedProducts.length === 1
                                ? ""
                                : "s"}{" "}
                              from the marketplace? Sellers keep the listing,
                              it just won't be visible to buyers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleBulkProductAction("deactivate")
                              }
                            >
                              Deactivate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-flora-ink">
                              Delete Products
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-flora-muted">
                              Are you sure you want to delete{" "}
                              {selectedProducts.length} selected products?
                              This action cannot be undone.
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
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
                <Input
                  placeholder="Search products..."
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
                />
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
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
                      <TableHead className="text-flora-ink">Title</TableHead>
                      <TableHead className="text-flora-ink">Price</TableHead>
                      <TableHead className="text-flora-ink">
                        Category
                      </TableHead>
                      <TableHead className="text-flora-ink">Seller</TableHead>
                      <TableHead className="text-flora-ink">Status</TableHead>
                      <TableHead className="text-flora-ink">
                        Created
                      </TableHead>
                      <TableHead className="text-flora-ink">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="hover:bg-flora-chip/20"
                      >
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
                        <TableCell className="font-medium text-flora-ink">
                          {product.title}
                        </TableCell>
                        <TableCell className="text-flora-muted">
                          ₦{product.price}
                        </TableCell>
                        <TableCell className="text-flora-muted">
                          {product.category}
                        </TableCell>
                        <TableCell className="text-flora-muted">
                          {product.seller?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              product.is_active
                                ? "bg-flora-leaf/15 text-flora-leaf"
                                : "bg-flora-chip text-flora-ink"
                            }`}
                          >
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-flora-muted">
                          {new Date(product.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white p-1.5 text-flora-ink transition hover:bg-flora-chip"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
                                <DialogHeader>
                                  <DialogTitle className="text-flora-ink">
                                    Product Details - {product.title}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="font-medium text-flora-ink">
                                        Title
                                      </Label>
                                      <p className="text-flora-muted">
                                        {product.title}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="font-medium text-flora-ink">
                                        Description
                                      </Label>
                                      <p className="text-sm text-flora-muted">
                                        {product.description ||
                                          "No description"}
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="font-medium text-flora-ink">
                                          Price
                                        </Label>
                                        <p className="text-flora-muted">
                                          ₦{product.price.toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="font-medium text-flora-ink">
                                          Category
                                        </Label>
                                        <p className="text-flora-muted">
                                          {product.category}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="font-medium text-flora-ink">
                                          Status
                                        </Label>
                                        <div>
                                          <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                              product.is_active
                                                ? "bg-flora-leaf/15 text-flora-leaf"
                                                : "bg-flora-chip text-flora-ink"
                                            }`}
                                          >
                                            {product.is_active
                                              ? "Active"
                                              : "Inactive"}
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="font-medium text-flora-ink">
                                          Created
                                        </Label>
                                        <p className="text-flora-muted">
                                          {new Date(
                                            product.created_at
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="font-medium text-flora-ink">
                                        Seller
                                      </Label>
                                      <p className="text-flora-muted">
                                        {product.seller?.full_name} (
                                        {product.seller?.email})
                                      </p>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="font-medium text-flora-ink">
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
                                                className="w-full h-32 object-cover rounded-2xl border border-flora-ink/10"
                                              />
                                            )
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-flora-muted text-sm">
                                          No images uploaded
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-6 pt-4 border-t border-flora-ink/10">
                                  <button
                                    type="button"
                                    onClick={() => setEditingProduct(product)}
                                    className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-2 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit Product
                                  </button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button
                                        type="button"
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                                          product.is_active
                                            ? "border border-flora-ink/15 bg-white text-flora-ink hover:bg-flora-chip"
                                            : "bg-flora-ink text-white hover:brightness-110"
                                        }`}
                                      >
                                        {product.is_active
                                          ? "Deactivate"
                                          : "Activate"}
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-flora-ink">
                                          {product.is_active
                                            ? "Deactivate Product"
                                            : "Activate Product"}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-flora-muted">
                                          {product.is_active
                                            ? `Hide "${product.title}" from the marketplace? The seller keeps the listing, it just won't be visible to buyers.`
                                            : `Make "${product.title}" visible on the marketplace again?`}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
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
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <button
                              type="button"
                              onClick={() => setEditingProduct(product)}
                              className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white p-1.5 text-flora-ink transition hover:bg-flora-chip"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-flora-ink">
                                    Delete Product
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-flora-muted">
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
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-flora-ink">
                  Conversation Monitoring
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchConversations}
                    className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => exportData("messages")}
                    className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-flora-muted">
                Monitor all conversations between users. Click "View Chat" to
                see the full conversation.
              </p>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
                <Input
                  placeholder="Search by buyer, seller, or product..."
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
                />
              </div>
              {conversations.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
                  <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                    No conversations found
                  </h3>
                  <p className="text-flora-muted">
                    Users haven't started any conversations yet
                  </p>
                </div>
              ) : (
                (() => {
                  const q = conversationSearch.trim().toLowerCase();
                  const filteredConversations = q
                    ? conversations.filter(
                        (conversation) =>
                          conversation.buyer?.full_name
                            ?.toLowerCase()
                            .includes(q) ||
                          conversation.seller?.full_name
                            ?.toLowerCase()
                            .includes(q) ||
                          conversation.product?.title
                            ?.toLowerCase()
                            .includes(q)
                      )
                    : conversations;

                  return filteredConversations.length === 0 ? (
                    <div className="py-12 text-center">
                      <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
                      <p className="text-flora-muted">
                        No conversations match "{conversationSearch}"
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                            <TableHead className="text-flora-ink">
                              Participants
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Product
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Messages
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Last Message
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Started
                            </TableHead>
                            <TableHead className="text-flora-ink">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredConversations.map((conversation) => (
                            <TableRow
                              key={conversation.id}
                              className="hover:bg-flora-chip/20"
                            >
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={conversation.buyer?.avatar_url}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {conversation.buyer?.full_name?.charAt(
                                          0
                                        ) || "B"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-flora-ink">
                                      {conversation.buyer?.full_name ||
                                        "Unknown Buyer"}
                                    </span>
                                    <span className="rounded-full bg-flora-chip px-2 py-0.5 text-xs font-medium text-flora-ink">
                                      Buyer
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={conversation.seller?.avatar_url}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {conversation.seller?.full_name?.charAt(
                                          0
                                        ) || "S"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-flora-ink">
                                      {conversation.seller?.full_name ||
                                        "Unknown Seller"}
                                    </span>
                                    <span className="rounded-full bg-flora-chip px-2 py-0.5 text-xs font-medium text-flora-ink">
                                      Seller
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {conversation.product ? (
                                  <div>
                                    <p className="text-sm font-medium text-flora-ink">
                                      {conversation.product.title}
                                    </p>
                                    <p className="text-xs text-flora-muted">
                                      ₦
                                      {conversation.product.price?.toLocaleString()}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm text-flora-muted">
                                    General Chat
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-flora-muted" />
                                  <span className="font-medium text-flora-ink">
                                    {conversation.message_count}
                                  </span>
                                  <span className="text-xs text-flora-muted">
                                    messages
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {conversation.last_message ? (
                                  <div>
                                    <p
                                      className="truncate text-sm text-flora-ink"
                                      title={conversation.last_message.content}
                                    >
                                      <span className="font-medium">
                                        {
                                          conversation.last_message
                                            .sender_name
                                        }
                                        :
                                      </span>{" "}
                                      {conversation.last_message.content}
                                    </p>
                                    <p className="text-xs text-flora-muted">
                                      {new Date(
                                        conversation.last_message.created_at
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm italic text-flora-muted">
                                    No messages yet
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-flora-muted">
                                  {new Date(
                                    conversation.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleViewConversation(conversation.id)
                                    }
                                    disabled={
                                      conversation.message_count === 0
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Chat
                                  </button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-flora-ink">
                                          Delete Conversation
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-flora-muted">
                                          Are you sure you want to delete this
                                          entire conversation? This will
                                          delete all{" "}
                                          {conversation.message_count} messages
                                          and cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={async () => {
                                            try {
                                              const { error } = await supabase
                                                .from("conversations")
                                                .delete()
                                                .eq("id", conversation.id);

                                              if (error) throw error;

                                              toast.success(
                                                "Conversation deleted successfully"
                                              );
                                              fetchConversations();
                                            } catch (error) {
                                              toast.error(
                                                "Failed to delete conversation"
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
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Conversation Modal */}
            <Dialog
              open={!!selectedConversationId}
              onOpenChange={handleCloseConversationModal}
            >
              <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col rounded-3xl">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="flex items-center gap-2 text-flora-ink">
                    <MessageSquare className="h-5 w-5" />
                    Conversation Details
                  </DialogTitle>
                  <DialogDescription className="text-flora-muted">
                    {selectedConversationId && (
                      <span>
                        Conversation ID: {selectedConversationId.slice(0, 8)}
                        ...
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loadingConversation ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-flora-ink"></div>
                      <span className="ml-2 text-flora-muted">
                        Loading conversation...
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4">
                      {conversationMessages.length === 0 ? (
                        <div className="py-8 text-center">
                          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
                          <p className="text-flora-muted">
                            No messages in this conversation
                          </p>
                        </div>
                      ) : (
                        conversationMessages.map((message) => (
                          <div
                            key={message.id}
                            className="flex gap-3 rounded-2xl bg-flora-chip/30 p-3"
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={message.sender?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {message.sender?.full_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-sm font-medium text-flora-ink">
                                  {message.sender?.full_name ||
                                    "Unknown User"}
                                </span>
                                <span className="text-xs text-flora-muted">
                                  {new Date(
                                    message.created_at
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <p className="break-words text-sm text-flora-ink">
                                {message.content}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-flora-muted transition hover:bg-red-100 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-flora-ink">
                                      Delete Message
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-flora-muted">
                                      Are you sure you want to delete this
                                      message? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={async () => {
                                        try {
                                          const { error } = await supabase
                                            .from("messages")
                                            .delete()
                                            .eq("id", message.id);

                                          if (error) throw error;

                                          toast.success(
                                            "Message deleted successfully"
                                          );
                                          if (selectedConversationId) {
                                            await fetchConversationMessages(
                                              selectedConversationId
                                            );
                                          }
                                          fetchConversations();
                                        } catch (error) {
                                          toast.error(
                                            "Failed to delete message"
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
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                                        try {
                                          const { error } = await supabase.rpc(
                                            "update_dispute_template",
                                            {
                                              p_template_id: template.id,
                                              p_template_name: formData.get(
                                                "template_name"
                                              ) as string,
                                              p_subject: formData.get(
                                                "subject"
                                              ) as string,
                                              p_message: formData.get(
                                                "message"
                                              ) as string,
                                            }
                                          );
                                          if (error) throw error;

                                          toast.success(
                                            "Template updated successfully"
                                          );
                                          fetchDisputeTemplates();
                                        } catch (error: any) {
                                          console.error(
                                            "Update template error:",
                                            error
                                          );
                                          toast.error(
                                            error.message || "Failed to update template"
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

          {/* Escrow & Payouts Tab */}
          <TabsContent value="escrow">
            <div className="space-y-6">
              <AtRiskSellersCard />

              {/* Escrow Transactions */}
              <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
                <h2 className="text-lg font-bold text-flora-ink">Escrow Transactions</h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                        <TableHead className="text-flora-ink">Order</TableHead>
                        <TableHead className="text-flora-ink">Amount</TableHead>
                        <TableHead className="text-flora-ink">Commission</TableHead>
                        <TableHead className="text-flora-ink">Seller Amount</TableHead>
                        <TableHead className="text-flora-ink">Status</TableHead>
                        <TableHead className="text-flora-ink">Auto Release</TableHead>
                        <TableHead className="text-flora-ink">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escrowTransactions.map((escrow) => (
                        <TableRow key={escrow.id} className="hover:bg-flora-chip/20">
                          <TableCell>
                            <p className="font-medium text-flora-ink">
                              Order #{escrow.order_id.slice(0, 8)}
                            </p>
                            <p className="text-sm text-flora-muted">
                              Escrow Transaction
                            </p>
                          </TableCell>
                          <TableCell className="text-flora-ink">
                            ₦{escrow.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-flora-muted">
                            ₦{escrow.commission_amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-flora-ink">
                            ₦{escrow.seller_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                escrow.status === "held"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-flora-leaf/15 text-flora-leaf"
                              }`}
                            >
                              {escrow.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-flora-muted">
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
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                                  >
                                    Release Funds
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-flora-ink">
                                      Release Escrow Funds
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-flora-muted">
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
                                        releaseEscrowFunds(escrow.order_id)
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
              </div>

              {/* Payout Requests */}
              <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
                <h2 className="text-lg font-bold text-flora-ink">Payout Requests</h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                        <TableHead className="text-flora-ink">User</TableHead>
                        <TableHead className="text-flora-ink">Amount</TableHead>
                        <TableHead className="text-flora-ink">Bank Details</TableHead>
                        <TableHead className="text-flora-ink">Status</TableHead>
                        <TableHead className="text-flora-ink">Requested</TableHead>
                        <TableHead className="text-flora-ink">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payoutRequests.map((payout) => (
                        <TableRow key={payout.id} className="hover:bg-flora-chip/20">
                          <TableCell>
                            <p className="font-medium text-flora-ink">
                              {payout.profiles?.full_name ||
                                `User #${payout.user_id.slice(0, 8)}`}
                            </p>
                            <p className="text-sm text-flora-muted">
                              {payout.profiles?.email || "No email"}
                            </p>
                            {payout.wallets && (
                              <p className="text-xs text-blue-600">
                                Wallet: ₦
                                {payout.wallets.available_balance?.toLocaleString() ||
                                  "0"}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-flora-ink">
                            ₦{payout.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-flora-muted">
                            <p>{payout.bank_account_name}</p>
                            <p>{payout.bank_account_number}</p>
                            <p>{payout.bank_name}</p>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                payout.status === "pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-flora-leaf/15 text-flora-leaf"
                              }`}
                            >
                              {payout.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-flora-muted">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {payout.status === "pending" && (
                              <div className="flex gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink px-3.5 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                                    >
                                      Approve
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-3xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-flora-ink">
                                        Approve Payout Request
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-flora-muted">
                                        Are you sure you want to approve this
                                        payout of ₦
                                        {payout.amount.toLocaleString()} to{" "}
                                        {payout.bank_account_name} (
                                        {payout.bank_name})?
                                        {payout.wallets &&
                                          payout.wallets.available_balance <
                                            payout.amount && (
                                            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-red-700">
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
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                                    >
                                      Reject
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="rounded-3xl">
                                    <DialogHeader>
                                      <DialogTitle className="text-flora-ink">
                                        Reject Payout Request
                                      </DialogTitle>
                                      <DialogDescription className="text-flora-muted">
                                        Provide a reason for rejecting this ₦
                                        {payout.amount.toLocaleString()}{" "}
                                        payout to{" "}
                                        {payout.bank_account_name}. This is
                                        recorded on the request and shown to
                                        the requester.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(
                                          e.currentTarget
                                        );
                                        const reason = formData.get(
                                          "payout_rejection_reason"
                                        ) as string;
                                        if (reason.trim()) {
                                          processPayoutRequest(
                                            payout.id,
                                            false,
                                            reason.trim()
                                          );
                                        }
                                      }}
                                    >
                                      <div className="space-y-4">
                                        <div>
                                          <Label
                                            htmlFor="payout_rejection_reason"
                                            className="text-flora-ink"
                                          >
                                            Rejection Reason *
                                          </Label>
                                          <Textarea
                                            name="payout_rejection_reason"
                                            placeholder="e.g., Bank details could not be verified, suspected fraud, duplicate request..."
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
                                            Reject Payout
                                          </Button>
                                        </div>
                                      </div>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                            {payout.status === "approved" && (
                              <span className="rounded-full bg-flora-leaf/15 px-2.5 py-0.5 text-xs font-medium text-flora-leaf">
                                ✓ Processed
                              </span>
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
              </div>

              {/* Disputes */}
              <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
                <h2 className="text-lg font-bold text-flora-ink">Disputes</h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                        <TableHead className="text-flora-ink">Order</TableHead>
                        <TableHead className="text-flora-ink">Reported By</TableHead>
                        <TableHead className="text-flora-ink">Reason</TableHead>
                        <TableHead className="text-flora-ink">Status</TableHead>
                        <TableHead className="text-flora-ink">Created</TableHead>
                        <TableHead className="text-flora-ink">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {disputes.map((dispute) => (
                        <TableRow key={dispute.id} className="hover:bg-flora-chip/20">
                          <TableCell>
                            <p className="font-medium text-flora-ink">
                              Order #{dispute.order_id.slice(0, 8)}
                            </p>
                            <p className="text-sm text-flora-muted">
                              {dispute.orders?.products?.title || "Product"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-flora-ink">
                              {dispute.reporter?.full_name || "Unknown"}
                            </p>
                            <p className="text-sm text-flora-muted">Buyer</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-flora-ink">
                              {dispute.reason.replace("_", " ")}
                            </p>
                            {dispute.description && (
                              <p className="text-sm text-flora-muted">
                                {dispute.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                dispute.status === "open"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-flora-leaf/15 text-flora-leaf"
                              }`}
                            >
                              {dispute.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-flora-muted">
                            {new Date(
                              dispute.created_at
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {dispute.status === "open" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                                  >
                                    Investigate
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-flora-ink">
                                      Investigate Dispute
                                    </DialogTitle>
                                    <DialogDescription className="text-flora-muted">
                                      Contact seller about this dispute
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="rounded-2xl bg-flora-chip/30 p-4">
                                      <h4 className="mb-2 font-medium text-flora-ink">
                                        Dispute Details
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="text-flora-ink">
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
                                            <span
                                              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                dispute.status === "open"
                                                  ? "bg-red-100 text-red-600"
                                                  : "bg-flora-leaf/15 text-flora-leaf"
                                              }`}
                                            >
                                              {dispute.status}
                                            </span>
                                          </p>
                                        </div>
                                        <div className="text-flora-ink">
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
                                        <div className="rounded-xl bg-blue-50 p-3">
                                          <h5 className="mb-2 font-medium text-blue-900">
                                            Seller Information
                                          </h5>
                                          <p className="text-sm text-blue-900">
                                            <strong>Name:</strong>{" "}
                                            {dispute.orders?.seller_profile
                                              ?.full_name || "Unknown Seller"}
                                          </p>
                                          <p className="text-sm text-blue-900">
                                            <strong>Student ID:</strong>{" "}
                                            {dispute.orders?.seller_profile
                                              ?.student_id || "N/A"}
                                          </p>
                                        </div>
                                        <div className="rounded-xl bg-flora-leaf/10 p-3">
                                          <h5 className="mb-2 font-medium text-flora-leaf">
                                            Buyer Information
                                          </h5>
                                          <p className="text-sm text-flora-ink">
                                            <strong>Name:</strong>{" "}
                                            {dispute.orders?.buyer_profile
                                              ?.full_name || "Unknown Buyer"}
                                          </p>
                                          <p className="text-sm text-flora-ink">
                                            <strong>Student ID:</strong>{" "}
                                            {dispute.orders?.buyer_profile
                                              ?.student_id || "N/A"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mt-4 rounded-xl bg-red-50 p-3">
                                        <h5 className="mb-2 font-medium text-red-900">
                                          Dispute Information
                                        </h5>
                                        <p className="text-sm text-red-900">
                                          <strong>Reason:</strong>{" "}
                                          <span className="ml-1 rounded-full border border-red-200 px-2 py-0.5 text-xs font-medium">
                                            {dispute.reason
                                              .replace("_", " ")
                                              .toUpperCase()}
                                          </span>
                                        </p>
                                        {dispute.description && (
                                          <p className="mt-2 text-sm text-red-900">
                                            <strong>Description:</strong>{" "}
                                            <span className="italic">
                                              {dispute.description}
                                            </span>
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const message = `🚨 DISPUTE ALERT - UniMarket Admin\n\n📋 Order Details:\n• Order ID: #${dispute.order_id.slice(
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
                                            `https://wa.me/${
                                              platformSettings?.support_whatsapp_number ||
                                              "2349133054018"
                                            }?text=${encodeURIComponent(
                                              message
                                            )}`,
                                            "_blank"
                                          );
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-flora-leaf/40 bg-flora-leaf/10 px-4 py-2 text-sm font-medium text-flora-leaf transition hover:bg-flora-leaf/20"
                                      >
                                        📱 Contact Seller via WhatsApp
                                      </button>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <button
                                            type="button"
                                            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                                          >
                                            Resolve for Buyer (Reverse Funds)
                                          </button>
                                        </DialogTrigger>
                                        <DialogContent className="rounded-3xl">
                                          <DialogHeader>
                                            <DialogTitle className="text-flora-ink">
                                              Resolve Dispute for Buyer
                                            </DialogTitle>
                                            <DialogDescription className="text-flora-muted">
                                              This reverses the held escrow
                                              payment back to{" "}
                                              {dispute.orders?.buyer_profile
                                                ?.full_name || "the buyer"}
                                              . The seller will not be paid
                                              for this order. Record why, for
                                              the seller's side of the case.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <form
                                            onSubmit={(e) => {
                                              e.preventDefault();
                                              const formData = new FormData(
                                                e.currentTarget
                                              );
                                              const reason = formData.get(
                                                "resolve_buyer_reason"
                                              ) as string;
                                              if (reason.trim()) {
                                                resolveDisputeForBuyer(
                                                  dispute,
                                                  reason.trim()
                                                );
                                              }
                                            }}
                                          >
                                            <div className="space-y-4">
                                              <div>
                                                <Label
                                                  htmlFor="resolve_buyer_reason"
                                                  className="text-flora-ink"
                                                >
                                                  Reason *
                                                </Label>
                                                <Textarea
                                                  name="resolve_buyer_reason"
                                                  placeholder="e.g., Seller could not provide proof of delivery, item as described does not match photos..."
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
                                                  className="bg-red-600 hover:bg-red-700"
                                                >
                                                  Reverse Funds to Buyer
                                                </Button>
                                              </div>
                                            </div>
                                          </form>
                                        </DialogContent>
                                      </Dialog>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <button
                                            type="button"
                                            className="inline-flex items-center gap-1.5 rounded-full bg-flora-leaf px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                                          >
                                            Resolve for Seller (Release Funds)
                                          </button>
                                        </DialogTrigger>
                                        <DialogContent className="rounded-3xl">
                                          <DialogHeader>
                                            <DialogTitle className="text-flora-ink">
                                              Resolve Dispute for Seller
                                            </DialogTitle>
                                            <DialogDescription className="text-flora-muted">
                                              This releases the held escrow
                                              payment to{" "}
                                              {dispute.orders?.seller_profile
                                                ?.full_name || "the seller"}
                                              . The buyer will not be
                                              refunded for this order. Record
                                              why, for the buyer's side of
                                              the case.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <form
                                            onSubmit={(e) => {
                                              e.preventDefault();
                                              const formData = new FormData(
                                                e.currentTarget
                                              );
                                              const reason = formData.get(
                                                "resolve_seller_reason"
                                              ) as string;
                                              if (reason.trim()) {
                                                resolveDisputeForSeller(
                                                  dispute,
                                                  reason.trim()
                                                );
                                              }
                                            }}
                                          >
                                            <div className="space-y-4">
                                              <div>
                                                <Label
                                                  htmlFor="resolve_seller_reason"
                                                  className="text-flora-ink"
                                                >
                                                  Reason *
                                                </Label>
                                                <Textarea
                                                  name="resolve_seller_reason"
                                                  placeholder="e.g., Buyer's claim was unsubstantiated, seller provided valid proof of delivery..."
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
                                                  className="bg-green-600 hover:bg-green-700"
                                                >
                                                  Release Funds to Seller
                                                </Button>
                                              </div>
                                            </div>
                                          </form>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>
                                  <div className="border-t border-flora-ink/10 pt-2">
                                    <h4 className="mb-1 font-medium text-flora-ink">
                                      Send Investigation Notice
                                    </h4>
                                    <p className="mb-3 text-sm text-flora-muted">
                                      Send investigation notification to
                                      seller with custom message
                                    </p>
                                  </div>
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
              </div>
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
                        <select
                          name="type"
                          defaultValue="info"
                          className="w-full h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                          style={{
                            backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundSize: '12px 8px'
                          }}
                        >
                          <option value="info">Info</option>
                          <option value="success">Success</option>
                          <option value="warning">Warning</option>
                          <option value="error">Error</option>
                        </select>
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
                        <select
                          name="recipient"
                          defaultValue="all"
                          className="w-full h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                          style={{
                            backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundSize: '12px 8px'
                          }}
                        >
                          <option value="all">All Users</option>
                          <option value="sellers">All Sellers</option>
                          <option value="buyers">All Buyers</option>
                          <option value="specific">Specific User</option>
                        </select>
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
                  <CardTitle>Platform Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Persisted in platform_settings - these now actually save.
                    Note: these control what an admin can configure, not
                    enforcement elsewhere in the app (e.g. turning off "Allow
                    New Registrations" here doesn't yet block signups).
                  </p>
                </CardHeader>
                <CardContent>
                  {!platformSettings ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : (
                    <form
                      key={platformSettings.updated_at}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        setSavingSettings(true);
                        try {
                          const { error } = await supabase.rpc(
                            "update_platform_settings",
                            {
                              p_allow_new_registrations:
                                formData.get("allow_new_registrations") === "on",
                              p_require_email_verification:
                                formData.get("require_email_verification") === "on",
                              p_enable_product_moderation:
                                formData.get("enable_product_moderation") === "on",
                              p_minimum_order_value: Number(
                                formData.get("minimum_order_value") || 0
                              ),
                              p_support_whatsapp_number: String(
                                formData.get("support_whatsapp_number") || ""
                              ),
                            }
                          );
                          if (error) throw error;
                          toast.success("Settings saved");
                          fetchPlatformSettings();
                        } catch (error: any) {
                          console.error("Save platform settings error:", error);
                          toast.error(
                            error.message || "Failed to save settings"
                          );
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Allow New Registrations</Label>
                            <p className="text-sm text-muted-foreground">
                              Control whether new users can register
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            name="allow_new_registrations"
                            defaultChecked={platformSettings.allow_new_registrations}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Require Email Verification</Label>
                            <p className="text-sm text-muted-foreground">
                              Require users to verify their email
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            name="require_email_verification"
                            defaultChecked={platformSettings.require_email_verification}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Enable Product Moderation</Label>
                            <p className="text-sm text-muted-foreground">
                              All new products require admin approval
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            name="enable_product_moderation"
                            defaultChecked={platformSettings.enable_product_moderation}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Minimum Order Value</Label>
                          <Input
                            type="number"
                            name="minimum_order_value"
                            defaultValue={platformSettings.minimum_order_value}
                            min="0"
                          />
                        </div>
                        <div>
                          <Label>Support WhatsApp Number</Label>
                          <p className="text-sm text-muted-foreground">
                            Shown to buyers/sellers as a contact option (e.g.
                            in the Escrow dispute view) - was hardcoded in
                            source before this.
                          </p>
                          <Input
                            type="text"
                            name="support_whatsapp_number"
                            defaultValue={platformSettings.support_whatsapp_number || ""}
                            placeholder="2349133054018"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={savingSettings}>
                          {savingSettings ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Default withheld from any admin who isn't Super Admin -
                  canAccessTab('commission_settings') only returns true for
                  isSuperAdmin or a regular admin specifically granted this
                  key via Staff Access, same mechanism as escrow/wallet/
                  subscriptions, independent of whether they also have plain
                  'settings' access above. */}
              {canAccessTab("commission_settings") && platformSettings && (
                <Card>
                  <CardHeader>
                    <CardTitle>Commission Rate</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Applied to new orders at checkout. Only visible to
                      Super Admins by default.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form
                      key={platformSettings.updated_at}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        setSavingCommission(true);
                        try {
                          const { error } = await supabase.rpc(
                            "update_commission_rate",
                            {
                              p_rate: Number(
                                formData.get("commission_rate_percent")
                              ),
                            }
                          );
                          if (error) throw error;
                          toast.success("Commission rate updated");
                          fetchPlatformSettings();
                        } catch (error: any) {
                          console.error("Update commission rate error:", error);
                          toast.error(
                            error.message || "Failed to update commission rate"
                          );
                        } finally {
                          setSavingCommission(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label>Platform Commission (%)</Label>
                        <Input
                          type="number"
                          name="commission_rate_percent"
                          defaultValue={platformSettings.commission_rate_percent}
                          min="0"
                          max="50"
                          step="0.1"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={savingCommission}>
                          {savingCommission ? "Saving..." : "Save Commission Rate"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrdersTab onCountsChange={setPendingOrdersCount} />
          </TabsContent>
          {/* Staff Access - super_admin only; RLS on admin_permissions also
              only allows super_admin writes regardless, this is defense in
              depth on top of that. */}
          {isSuperAdmin && (
            <TabsContent value="staff">
              <AdminStaffAccessTab />
            </TabsContent>
          )}
            </div>
          </div>
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
      </PullToRefresh>
    </div>
  );
}
