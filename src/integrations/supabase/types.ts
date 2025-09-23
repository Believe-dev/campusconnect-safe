export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cart: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          is_active: boolean | null
          order_id: string | null
          product_id: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          order_id?: string | null
          product_id?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          order_id?: string | null
          product_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          flagged_reason: string | null
          id: string
          is_flagged: boolean | null
          message_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          message_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          auto_confirm_at: string | null
          buyer_id: string
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          escrow_released: boolean | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          product_id: string
          quantity: number
          seller_id: string
          shipping_address: string | null
          status: string
          total_amount: number
          tracking_info: string | null
          updated_at: string
        }
        Insert: {
          auto_confirm_at?: string | null
          buyer_id: string
          commission_amount?: number
          confirmed_at?: string | null
          created_at?: string
          escrow_released?: boolean | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          product_id: string
          quantity?: number
          seller_id: string
          shipping_address?: string | null
          status?: string
          total_amount: number
          tracking_info?: string | null
          updated_at?: string
        }
        Update: {
          auto_confirm_at?: string | null
          buyer_id?: string
          commission_amount?: number
          confirmed_at?: string | null
          created_at?: string
          escrow_released?: boolean | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string
          quantity?: number
          seller_id?: string
          shipping_address?: string | null
          status?: string
          total_amount?: number
          tracking_info?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_analytics: {
        Row: {
          cart_additions: number
          favorites_count: number
          id: string
          last_updated: string
          orders_count: number
          product_id: string
          revenue: number
          views: number
        }
        Insert: {
          cart_additions?: number
          favorites_count?: number
          id?: string
          last_updated?: string
          orders_count?: number
          product_id: string
          revenue?: number
          views?: number
        }
        Update: {
          cart_additions?: number
          favorites_count?: number
          id?: string
          last_updated?: string
          orders_count?: number
          product_id?: string
          revenue?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          campus: string | null
          category: string
          condition: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          price: number
          seller_id: string
          stock_quantity: number
          title: string
          updated_at: string
        }
        Insert: {
          campus?: string | null
          category: string
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price: number
          seller_id: string
          stock_quantity?: number
          title: string
          updated_at?: string
        }
        Update: {
          campus?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price?: number
          seller_id?: string
          stock_quantity?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          admin_notes: string | null
          avatar_url: string | null
          bio: string | null
          campus: string | null
          created_at: string
          email: string
          face_photo_url: string | null
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_verified: boolean | null
          phone_number: string | null
          rating: number | null
          student_id: string | null
          student_id_photo_url: string | null
          total_reviews: number | null
          university_name: string | null
          updated_at: string
          user_id: string
          verification_status: string | null
          verification_type: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_type?: string
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          campus?: string | null
          created_at?: string
          email: string
          face_photo_url?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_verified?: boolean | null
          phone_number?: string | null
          rating?: number | null
          student_id?: string | null
          student_id_photo_url?: string | null
          total_reviews?: number | null
          university_name?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
          verification_type?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_type?: string
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          campus?: string | null
          created_at?: string
          email?: string
          face_photo_url?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_verified?: boolean | null
          phone_number?: string | null
          rating?: number | null
          student_id?: string | null
          student_id_photo_url?: string | null
          total_reviews?: number | null
          university_name?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          verification_type?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          available_balance: number
          pending_balance: number
          total_earnings: number
          total_commission_paid: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          available_balance?: number
          pending_balance?: number
          total_earnings?: number
          total_commission_paid?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          available_balance?: number
          pending_balance?: number
          total_earnings?: number
          total_commission_paid?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          id: string
          order_id: string
          buyer_id: string
          seller_id: string
          amount: number
          commission_amount: number
          seller_amount: number
          status: string
          held_at: string
          released_at: string | null
          auto_release_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          buyer_id: string
          seller_id: string
          amount: number
          commission_amount: number
          seller_amount: number
          status?: string
          held_at?: string
          released_at?: string | null
          auto_release_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          buyer_id?: string
          seller_id?: string
          amount?: number
          commission_amount?: number
          seller_amount?: number
          status?: string
          held_at?: string
          released_at?: string | null
          auto_release_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      wallet_transactions: {
        Row: {
          id: string
          wallet_id: string
          user_id: string
          type: string
          amount: number
          description: string
          reference_id: string | null
          reference_type: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          user_id: string
          type: string
          amount: number
          description: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          wallet_id?: string
          user_id?: string
          type?: string
          amount?: number
          description?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          }
        ]
      }
      bank_details: {
        Row: {
          id: string
          user_id: string
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          status: string
          admin_notes: string | null
          processed_by: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          status?: string
          admin_notes?: string | null
          processed_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_id?: string
          amount?: number
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          status?: string
          admin_notes?: string | null
          processed_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          }
        ]
      }
      disputes: {
        Row: {
          id: string
          order_id: string
          escrow_transaction_id: string
          reported_by: string
          reason: string
          description: string | null
          status: string
          resolution: string | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          escrow_transaction_id: string
          reported_by: string
          reason: string
          description?: string | null
          status?: string
          resolution?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          escrow_transaction_id?: string
          reported_by?: string
          reason?: string
          description?: string | null
          status?: string
          resolution?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_or_create_conversation: {
        Args: { p_buyer_id: string; p_product_id?: string; p_seller_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      track_product_view: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      release_escrow_funds: {
        Args: { escrow_id: string }
        Returns: boolean
      }
      auto_release_escrow: {
        Args: {}
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "buyer"],
    },
  },
} as const
