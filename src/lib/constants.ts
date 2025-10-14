// App-wide constants
export const APP_CONFIG = {
  name: "CampusConnect",
  version: "1.0.0",
  description: "Nigeria's Trusted University Marketplace",
  supportEmail: "support@campusconnect.ng",
} as const;

// Debug: Log the Paystack key being used
console.log(
  "Paystack Key:",
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
    ? "LIVE KEY LOADED"
    : "USING TEST FALLBACK"
);

export const API_CONFIG = {
  paystack: {
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  },
  supabase: {
    storageUrl:
      import.meta.env.VITE_SUPABASE_STORAGE_URL ||
      "https://ssqplkrxtrvfptrsnpow.supabase.co/storage/v1/object/public",
  },
} as const;

export const BUSINESS_RULES = {
  commission: {
    rate: 0.0, // 0% - No commission, sellers pay registration fee instead
    minAmount: 100, // ₦100
  },
  sellerRegistration: {
    fee: 100, // ₦100 one-time registration fee for sellers
  },
  escrow: {
    autoReleaseDays: 2,
    disputeWindowDays: 14,
  },
  delivery: {
    flatRate: 0, // ₦2,000
  },
  pagination: {
    defaultLimit: (navigator as any).deviceMemory < 2 ? 10 : 20,
    maxLimit: (navigator as any).deviceMemory < 2 ? 50 : 100,
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
  home: "/",
  auth: "/auth",
  marketplace: "/marketplace",
  profile: "/profile",
  orders: "/orders",
  cart: "/cart",
  checkout: "/checkout",
  admin: "/admin",
  sell: "/sell",
  dashboard: "/dashboard",
  games: "/games",
} as const;

export const CATEGORIES = [
  {
    id: "books-textbooks",
    name: "Books & Textbooks",
    icon: "Book",
    keywords: [
      "book",
      "textbook",
      "novel",
      "study",
      "academic",
      "literature",
      "manual",
      "guide",
    ],
  },
  {
    id: "electronics",
    name: "Electronics",
    icon: "Laptop",
    keywords: [
      "laptop",
      "phone",
      "computer",
      "tablet",
      "headphone",
      "speaker",
      "charger",
      "gadget",
      "tech",
    ],
  },
  {
    id: "fashion-accessories",
    name: "Fashion & Accessories",
    icon: "Shirt",
    keywords: [
      "clothes",
      "shirt",
      "dress",
      "shoes",
      "bag",
      "watch",
      "jewelry",
      "fashion",
      "style",
    ],
  },
  {
    id: "food-beverages",
    name: "Food & Beverages",
    icon: "Utensils",
    keywords: [
      "food",
      "snack",
      "drink",
      "beverage",
      "meal",
      "lunch",
      "breakfast",
      "dinner",
    ],
  },
  {
    id: "sports-recreation",
    name: "Sports & Recreation",
    icon: "Dumbbell",
    keywords: [
      "sport",
      "fitness",
      "gym",
      "exercise",
      "ball",
      "equipment",
      "recreation",
      "game",
    ],
  },
  {
    id: "home-living",
    name: "Home & Living",
    icon: "Home",
    keywords: [
      "furniture",
      "decor",
      "kitchen",
      "bedroom",
      "living",
      "home",
      "appliance",
      "household",
    ],
  },
  {
    id: "stationery-supplies",
    name: "Stationery & Supplies",
    icon: "PenTool",
    keywords: [
      "pen",
      "pencil",
      "paper",
      "notebook",
      "stationery",
      "supplies",
      "office",
      "writing",
    ],
  },
  {
    id: "services",
    name: "Services",
    icon: "Users",
    keywords: [
      "service",
      "tutoring",
      "help",
      "assistance",
      "consultation",
      "repair",
      "maintenance",
    ],
  },
] as const;

export const CAMPUSES = [
  { id: "main_campus", name: "Main Campus" },
  { id: "akoka_campus", name: "Akoka Campus" },
  { id: "yaba_campus", name: "Yaba Campus" },
  { id: "distance_learning", name: "Distance Learning" },
] as const;

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;
