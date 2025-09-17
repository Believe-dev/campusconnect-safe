// App-wide constants
export const APP_CONFIG = {
  name: 'CampusConnect',
  version: '1.0.0',
  description: 'Nigeria\'s Trusted University Marketplace',
  supportEmail: 'support@campusconnect.ng',
} as const;

export const API_CONFIG = {
  paystack: {
    publicKey: 'pk_test_5fdf1c7e08e4950078f88266e68ede32e832baf7',
  },
  supabase: {
    storageUrl: 'https://ssqplkrxtrvfptrsnpow.supabase.co/storage/v1/object/public',
  },
} as const;

export const BUSINESS_RULES = {
  commission: {
    rate: 0.05, // 5%
    minAmount: 100, // ₦100
  },
  escrow: {
    autoReleaseDays: 7,
    disputeWindowDays: 14,
  },
  delivery: {
    flatRate: 2000, // ₦2,000
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;

export const UI_CONFIG = {
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
} as const;

export const ROUTES = {
  home: '/',
  auth: '/auth',
  marketplace: '/marketplace',
  profile: '/profile',
  orders: '/orders',
  cart: '/cart',
  checkout: '/checkout',
  admin: '/admin',
  sell: '/sell',
  dashboard: '/dashboard',
} as const;

export const CATEGORIES = [
  { id: 'Books & Textbooks', name: 'Books', icon: 'Book' },
  { id: 'Electronics', name: 'Electronics', icon: 'Laptop' },
  { id: 'Fashion & Accessories', name: 'Fashion', icon: 'Shirt' },
  { id: 'Food & Beverages', name: 'Food & Snacks', icon: 'Utensils' },
  { id: 'Sports & Recreation', name: 'Sports', icon: 'Dumbbell' },
  { id: 'Home & Living', name: 'Home', icon: 'Home' },
] as const;

export const CAMPUSES = [
  { id: 'main_campus', name: 'Main Campus' },
  { id: 'akoka_campus', name: 'Akoka Campus' },
  { id: 'yaba_campus', name: 'Yaba Campus' },
  { id: 'distance_learning', name: 'Distance Learning' },
] as const;

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
] as const;