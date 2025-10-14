// Centralized type definitions
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  university_name?: string;
  campus?: string;
  student_id?: string;
  phone_number?: string;
  account_type: 'buyer' | 'seller';
  seller_status?: 'pending' | 'approved' | 'rejected';
  is_verified: boolean;
  is_banned: boolean;
  rating: number;
  total_reviews: number;
  face_photo_url?: string;
  student_id_photo_url?: string;
  department?: string;
  business_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  campus: string;
  seller_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  seller?: Profile;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products: Product;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  commission_amount: number;
  shipping_address: string;
  payment_method: string;
  payment_reference: string;
  status: 'pending' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'disputed';
  auto_confirm_at?: string;
  created_at: string;
  updated_at: string;
  products?: Product;
  buyer_profile?: Profile;
  seller_profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface EscrowTransaction {
  id: string;
  order_id: string;
  amount: number;
  commission_amount: number;
  seller_amount: number;
  status: 'held' | 'released' | 'disputed';
  held_at: string;
  released_at?: string;
  auto_release_at?: string;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  reported_by: string;
  reason: string;
  description?: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ProductReport {
  id: string;
  product_id: string;
  reported_by: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  product?: Product;
  reporter?: Profile;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_flagged: boolean;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextPage?: number;
}

// Form types
export interface CheckoutForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  paymentMethod: string;
}

export interface ProductForm {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  campus: string;
  images: File[];
}

export interface ProfileForm {
  full_name: string;
  phone_number: string;
  university_name: string;
  campus: string;
  student_id: string;
}

// Component prop types
export interface ProductCardProps {
  product: Product;
  onViewProduct: (id: string) => void;
  isAuthenticated: boolean;
  showActions?: boolean;
}

export interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Hook return types
export interface UseAuthReturn {
  user: User | null;
  session: any;
  loading: boolean;
  isAdmin: boolean;
}

export interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

// Utility types
export type AppRole = 'buyer' | 'seller' | 'admin';
export type OrderStatus = Order['status'];
export type NotificationType = Notification['type'];
export type ProductCondition = Product['condition'];

// Event types
export interface PaystackResponse {
  status: 'success' | 'failed';
  reference: string;
  trans: string;
  transaction: string;
  message: string;
  redirecturl: string;
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionSpeed: 'slow' | 'medium' | 'fast';
  signalStrength: number; // 1-5 bars
}