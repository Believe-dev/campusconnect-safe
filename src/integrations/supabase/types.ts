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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          tab_key: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          tab_key: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          tab_key?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_wallet: {
        Row: {
          available_balance: number | null
          created_at: string
          id: string
          total_commissions: number | null
          total_withdrawn: number | null
          updated_at: string
        }
        Insert: {
          available_balance?: number | null
          created_at?: string
          id?: string
          total_commissions?: number | null
          total_withdrawn?: number | null
          updated_at?: string
        }
        Update: {
          available_balance?: number | null
          created_at?: string
          id?: string
          total_commissions?: number | null
          total_withdrawn?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_withdrawals: {
        Row: {
          account_name: string
          account_number: string
          admin_id: string
          amount: number
          bank_name: string
          created_at: string
          id: string
          paystack_reference: string | null
          processed_at: string | null
          status: string | null
          transfer_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_id: string
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          paystack_reference?: string | null
          processed_at?: string | null
          status?: string | null
          transfer_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_id?: string
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          paystack_reference?: string | null
          processed_at?: string | null
          status?: string | null
          transfer_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      anchor_webhook_events: {
        Row: {
          anchor_event_id: string
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          anchor_event_id: string
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
        }
        Update: {
          anchor_event_id?: string
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: []
      }
      ban_appeals: {
        Row: {
          admin_response: string | null
          created_at: string
          full_name: string
          id: string
          matric_number: string
          message: string
          status: string | null
          updated_at: string
          user_email: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          full_name: string
          id?: string
          matric_number: string
          message: string
          status?: string | null
          updated_at?: string
          user_email: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          full_name?: string
          id?: string
          matric_number?: string
          message?: string
          status?: string | null
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      bank_details: {
        Row: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cart: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          selected_size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          selected_size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          selected_size?: string | null
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
      conversation_reads: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          last_read_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
      crossword_leaderboard: {
        Row: {
          best_score: number | null
          best_time: number | null
          created_at: string
          id: string
          puzzles_completed: number | null
          total_score: number | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          best_score?: number | null
          best_time?: number | null
          created_at?: string
          id?: string
          puzzles_completed?: number | null
          total_score?: number | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          best_score?: number | null
          best_time?: number | null
          created_at?: string
          id?: string
          puzzles_completed?: number | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      dispute_notification_templates: {
        Row: {
          created_at: string
          dispute_type: string
          id: string
          message: string
          subject: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispute_type: string
          id?: string
          message: string
          subject: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispute_type?: string
          id?: string
          message?: string
          subject?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          created_at: string
          description: string | null
          escrow_transaction_id: string
          id: string
          order_id: string
          reason: string
          reported_by: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          escrow_transaction_id: string
          id?: string
          order_id: string
          reason: string
          reported_by: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          escrow_transaction_id?: string
          id?: string
          order_id?: string
          reason?: string
          reported_by?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          html_content: string
          id: string
          recipient_email: string
          sent_at: string
          status: string | null
          subject: string
          text_content: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name: string
          html_content: string
          id?: string
          recipient_email: string
          sent_at?: string
          status?: string | null
          subject: string
          text_content: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          html_content?: string
          id?: string
          recipient_email?: string
          sent_at?: string
          status?: string | null
          subject?: string
          text_content?: string
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          amount: number
          anchor_sub_account_id: string | null
          anchor_sub_account_number: string | null
          anchor_transfer_status: string | null
          auto_release_at: string | null
          buyer_id: string
          commission_amount: number
          created_at: string
          held_at: string
          id: string
          order_id: string
          release_reference: string | null
          released_at: string | null
          reversal_reference: string | null
          seller_amount: number
          seller_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          anchor_sub_account_id?: string | null
          anchor_sub_account_number?: string | null
          anchor_transfer_status?: string | null
          auto_release_at?: string | null
          buyer_id: string
          commission_amount: number
          created_at?: string
          held_at?: string
          id?: string
          order_id: string
          release_reference?: string | null
          released_at?: string | null
          reversal_reference?: string | null
          seller_amount: number
          seller_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          anchor_sub_account_id?: string | null
          anchor_sub_account_number?: string | null
          anchor_transfer_status?: string | null
          auto_release_at?: string | null
          buyer_id?: string
          commission_amount?: number
          created_at?: string
          held_at?: string
          id?: string
          order_id?: string
          release_reference?: string | null
          released_at?: string | null
          reversal_reference?: string | null
          seller_amount?: number
          seller_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
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
      game_sessions: {
        Row: {
          completed_at: string
          duration_seconds: number | null
          game_type: string
          id: string
          score: number
          unicoins_earned: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          duration_seconds?: number | null
          game_type: string
          id?: string
          score?: number
          unicoins_earned?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          duration_seconds?: number | null
          game_type?: string
          id?: string
          score?: number
          unicoins_earned?: number
          user_id?: string
        }
        Relationships: []
      }
      game_stats: {
        Row: {
          best_streak: number | null
          color_level: number | null
          created_at: string
          crossword_level: number | null
          fillword_level: number | null
          games_played: number | null
          id: string
          math_level: number | null
          memory_level: number | null
          overall_game_level: number | null
          quiz_level: number | null
          reaction_level: number | null
          tap_level: number | null
          total_score: number | null
          unicoins_balance: number | null
          updated_at: string
          user_id: string
          word_level: number | null
        }
        Insert: {
          best_streak?: number | null
          color_level?: number | null
          created_at?: string
          crossword_level?: number | null
          fillword_level?: number | null
          games_played?: number | null
          id?: string
          math_level?: number | null
          memory_level?: number | null
          overall_game_level?: number | null
          quiz_level?: number | null
          reaction_level?: number | null
          tap_level?: number | null
          total_score?: number | null
          unicoins_balance?: number | null
          updated_at?: string
          user_id: string
          word_level?: number | null
        }
        Update: {
          best_streak?: number | null
          color_level?: number | null
          created_at?: string
          crossword_level?: number | null
          fillword_level?: number | null
          games_played?: number | null
          id?: string
          math_level?: number | null
          memory_level?: number | null
          overall_game_level?: number | null
          quiz_level?: number | null
          reaction_level?: number | null
          tap_level?: number | null
          total_score?: number | null
          unicoins_balance?: number | null
          updated_at?: string
          user_id?: string
          word_level?: number | null
        }
        Relationships: []
      }
      live_feed: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          location: string | null
          price: number
          seller_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          location?: string | null
          price: number
          seller_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          location?: string | null
          price?: number
          seller_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_feed_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_feed_comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_feed_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "live_feed_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      live_feed_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          live_feed_id: string
          parent_comment_id: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          live_feed_id: string
          parent_comment_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          live_feed_id?: string
          parent_comment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_feed_comments_live_feed_id_fkey"
            columns: ["live_feed_id"]
            isOneToOne: false
            referencedRelation: "live_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_feed_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "live_feed_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      live_feed_likes: {
        Row: {
          created_at: string | null
          id: string
          live_feed_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          live_feed_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          live_feed_id?: string
          user_id?: string
        }
        Relationships: []
      }
      live_feed_views: {
        Row: {
          created_at: string | null
          id: string
          live_feed_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          live_feed_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          live_feed_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_feed_views_live_feed_id_fkey"
            columns: ["live_feed_id"]
            isOneToOne: false
            referencedRelation: "live_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          flagged_reason: string | null
          id: string
          is_flagged: boolean | null
          is_read: boolean | null
          message_type: string | null
          reactions: Json | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          reactions?: Json | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_read?: boolean | null
          message_type?: string | null
          reactions?: Json | null
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
      notification_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          message_notifications: boolean | null
          order_updates: boolean | null
          payment_notifications: boolean | null
          push_notifications: boolean | null
          seller_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          message_notifications?: boolean | null
          order_updates?: boolean | null
          payment_notifications?: boolean | null
          push_notifications?: boolean | null
          seller_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          message_notifications?: boolean | null
          order_updates?: boolean | null
          payment_notifications?: boolean | null
          push_notifications?: boolean | null
          seller_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          anchor_bank_name: string | null
          anchor_sub_account_id: string | null
          anchor_sub_account_number: string | null
          auto_confirm_at: string | null
          buyer_id: string
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          delivery_method: string
          escrow_released: boolean | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          product_id: string
          quantity: number
          selected_size: string | null
          seller_id: string
          shipping_address: string | null
          status: string
          total_amount: number
          tracking_info: string | null
          university_name: string | null
          updated_at: string
        }
        Insert: {
          anchor_bank_name?: string | null
          anchor_sub_account_id?: string | null
          anchor_sub_account_number?: string | null
          auto_confirm_at?: string | null
          buyer_id: string
          commission_amount?: number
          confirmed_at?: string | null
          created_at?: string
          delivery_method?: string
          escrow_released?: boolean | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          product_id: string
          quantity?: number
          selected_size?: string | null
          seller_id: string
          shipping_address?: string | null
          status?: string
          total_amount: number
          tracking_info?: string | null
          university_name?: string | null
          updated_at?: string
        }
        Update: {
          anchor_bank_name?: string | null
          anchor_sub_account_id?: string | null
          anchor_sub_account_number?: string | null
          auto_confirm_at?: string | null
          buyer_id?: string
          commission_amount?: number
          confirmed_at?: string | null
          created_at?: string
          delivery_method?: string
          escrow_released?: boolean | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string
          quantity?: number
          selected_size?: string | null
          seller_id?: string
          shipping_address?: string | null
          status?: string
          total_amount?: number
          tracking_info?: string | null
          university_name?: string | null
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
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          recipient_code: string | null
          status: string | null
          transfer_code: string | null
          transfer_status: string | null
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          recipient_code?: string | null
          status?: string | null
          transfer_code?: string | null
          transfer_status?: string | null
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          recipient_code?: string | null
          status?: string | null
          transfer_code?: string | null
          transfer_status?: string | null
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone_number: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          phone_number: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone_number?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          allow_messages: boolean | null
          created_at: string | null
          data_collection_consent: boolean | null
          id: string
          marketing_consent: boolean | null
          profile_visibility: string | null
          show_online_status: boolean | null
          show_phone_number: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_messages?: boolean | null
          created_at?: string | null
          data_collection_consent?: boolean | null
          id?: string
          marketing_consent?: boolean | null
          profile_visibility?: string | null
          show_online_status?: boolean | null
          show_phone_number?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_messages?: boolean | null
          created_at?: string | null
          data_collection_consent?: boolean | null
          id?: string
          marketing_consent?: boolean | null
          profile_visibility?: string | null
          show_online_status?: boolean | null
          show_phone_number?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      product_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string
          id: string
          product_id: string
          reason: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description: string
          id?: string
          product_id: string
          reason: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string
          id?: string
          product_id?: string
          reason?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string
          rating: number
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          available_sizes: string[] | null
          average_rating: number | null
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
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          available_sizes?: string[] | null
          average_rating?: number | null
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
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          available_sizes?: string[] | null
          average_rating?: number | null
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
          total_reviews?: number | null
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
          anchor_customer_id: string | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bio: string | null
          business_name: string | null
          campus: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          face_photo_url: string | null
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_verified: boolean | null
          kyc_rejection_reason: string | null
          kyc_status: string | null
          onesignal_player_id: string | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          privacy_accepted_at: string | null
          privacy_accepted_version: number | null
          rating: number | null
          sanctions_screened_at: string | null
          sanctions_status: string | null
          seller_application_reason: string | null
          seller_approved_at: string | null
          seller_approved_by: string | null
          seller_features_active: boolean | null
          seller_last_payment_date: string | null
          seller_registration_paid: boolean | null
          seller_registration_paid_at: string | null
          seller_status: string | null
          seller_subscription_expires_at: string | null
          seller_subscription_type: string | null
          student_id: string | null
          terms_accepted_at: string | null
          terms_accepted_version: number | null
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
          anchor_customer_id?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          business_name?: string | null
          campus?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          face_photo_url?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_verified?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_status?: string | null
          onesignal_player_id?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          privacy_accepted_at?: string | null
          privacy_accepted_version?: number | null
          rating?: number | null
          sanctions_screened_at?: string | null
          sanctions_status?: string | null
          seller_application_reason?: string | null
          seller_approved_at?: string | null
          seller_approved_by?: string | null
          seller_features_active?: boolean | null
          seller_last_payment_date?: string | null
          seller_registration_paid?: boolean | null
          seller_registration_paid_at?: string | null
          seller_status?: string | null
          seller_subscription_expires_at?: string | null
          seller_subscription_type?: string | null
          student_id?: string | null
          terms_accepted_at?: string | null
          terms_accepted_version?: number | null
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
          anchor_customer_id?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          business_name?: string | null
          campus?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          face_photo_url?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_verified?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_status?: string | null
          onesignal_player_id?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          privacy_accepted_at?: string | null
          privacy_accepted_version?: number | null
          rating?: number | null
          sanctions_screened_at?: string | null
          sanctions_status?: string | null
          seller_application_reason?: string | null
          seller_approved_at?: string | null
          seller_approved_by?: string | null
          seller_features_active?: boolean | null
          seller_last_payment_date?: string | null
          seller_registration_paid?: boolean | null
          seller_registration_paid_at?: string | null
          seller_status?: string | null
          seller_subscription_expires_at?: string | null
          seller_subscription_type?: string | null
          student_id?: string | null
          terms_accepted_at?: string | null
          terms_accepted_version?: number | null
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
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string
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
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
          updated_at?: string | null
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
      sanctions_screenings: {
        Row: {
          created_at: string
          id: string
          match_score: number | null
          matched_watchlist_name: string | null
          result: string
          screened_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score?: number | null
          matched_watchlist_name?: string | null
          result: string
          screened_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number | null
          matched_watchlist_name?: string | null
          result?: string
          screened_name?: string
          user_id?: string
        }
        Relationships: []
      }
      sanctions_watchlist: {
        Row: {
          full_name: string
          id: string
          list_type: string | null
          normalized_name: string
          source: string
          synced_at: string
        }
        Insert: {
          full_name: string
          id?: string
          list_type?: string | null
          normalized_name: string
          source?: string
          synced_at?: string
        }
        Update: {
          full_name?: string
          id?: string
          list_type?: string | null
          normalized_name?: string
          source?: string
          synced_at?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          description: string
          event_type: string
          id: string
          ip_address: unknown
          location: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          event_type: string
          id?: string
          ip_address?: unknown
          location?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          location?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seller_applications: {
        Row: {
          admin_response: string | null
          created_at: string | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seller_payment_intents: {
        Row: {
          amount: number
          anchor_bank_name: string | null
          anchor_sub_account_id: string | null
          anchor_sub_account_number: string | null
          created_at: string
          id: string
          payment_reference: string | null
          purpose: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          anchor_bank_name?: string | null
          anchor_sub_account_id?: string | null
          anchor_sub_account_number?: string | null
          created_at?: string
          id?: string
          payment_reference?: string | null
          purpose: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          anchor_bank_name?: string | null
          anchor_sub_account_id?: string | null
          anchor_sub_account_number?: string | null
          created_at?: string
          id?: string
          payment_reference?: string | null
          purpose?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_registration_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean | null
          created_at: string
          expires_at: string
          id: string
          payment_reference: string
          starts_at: string
          status: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_renew?: boolean | null
          created_at?: string
          expires_at: string
          id?: string
          payment_reference: string
          starts_at: string
          status?: string
          subscription_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean | null
          created_at?: string
          expires_at?: string
          id?: string
          payment_reference?: string
          starts_at?: string
          status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          priority: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unicoin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          game_session_id: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          game_session_id?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          game_session_id?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unicoin_transactions_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          secret: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      verification_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          documents: string[] | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          documents?: string[] | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          documents?: string[] | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number | null
          created_at: string
          id: string
          pending_balance: number | null
          total_commission_paid: number | null
          total_earnings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          created_at?: string
          id?: string
          pending_balance?: number | null
          total_commission_paid?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number | null
          created_at?: string
          id?: string
          pending_balance?: number | null
          total_commission_paid?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_seller_features: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      admin_approve_payout_request: {
        Args: { p_notes?: string; p_payout_id: string }
        Returns: undefined
      }
      admin_extend_subscription: {
        Args: { p_days: number; p_user_id: string }
        Returns: boolean
      }
      admin_reject_payout_request: {
        Args: { p_notes?: string; p_payout_id: string }
        Returns: undefined
      }
      admin_update_user_profile: {
        Args: { p_updates: Json; p_user_id: string }
        Returns: boolean
      }
      approve_seller: {
        Args: { admin_user_id: string; seller_user_id: string }
        Returns: undefined
      }
      approve_seller_application: {
        Args: { admin_response?: string; application_id: string }
        Returns: undefined
      }
      assign_seller_role: { Args: { p_user_id: string }; Returns: undefined }
      assign_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      auto_release_escrow: { Args: never; Returns: undefined }
      award_unicoins: {
        Args: { p_amount: number; p_game_type: string; p_user_id: string }
        Returns: boolean
      }
      award_unicoins_and_level_up: {
        Args: { p_amount: number; p_game_type: string; p_user_id: string }
        Returns: boolean
      }
      ban_user: {
        Args: { reason?: string; target_user_id: string }
        Returns: undefined
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      check_expired_seller_subscriptions: { Args: never; Returns: number }
      check_expiring_subscriptions: { Args: never; Returns: undefined }
      check_payout_eligibility: {
        Args: { payout_id: string }
        Returns: {
          available_balance: number
          payout_exists: boolean
          payout_status: string
          requested_amount: number
          sufficient_balance: boolean
          user_id: string
          wallet_exists: boolean
          wallet_id: string
        }[]
      }
      check_seller_subscriptions: { Args: never; Returns: undefined }
      cleanup_expired_live_feed: { Args: never; Returns: undefined }
      cleanup_old_push_subscriptions: { Args: never; Returns: undefined }
      clear_game_data: { Args: { p_user_id: string }; Returns: boolean }
      complete_admin_withdrawal: {
        Args: {
          p_transfer_code: string
          p_transfer_reference: string
          p_withdrawal_id: string
        }
        Returns: undefined
      }
      create_seller_subscription: {
        Args: {
          p_amount?: number
          p_payment_reference?: string
          p_subscription_type?: string
          p_user_id: string
        }
        Returns: string
      }
      delete_user_account:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      delete_user_completely: { Args: never; Returns: boolean }
      delete_user_data: { Args: never; Returns: boolean }
      ensure_all_users_have_wallets: { Args: never; Returns: undefined }
      extend_seller_subscription: {
        Args: { p_days?: number; p_user_id: string }
        Returns: boolean
      }
      fail_admin_withdrawal: {
        Args: { p_error_message?: string; p_withdrawal_id: string }
        Returns: undefined
      }
      find_or_create_consolidated_conversation: {
        Args: { p_buyer_id: string; p_product_id?: string; p_seller_id: string }
        Returns: string
      }
      get_conversations_with_last_message: {
        Args: { user_uuid: string }
        Returns: {
          buyer_id: string
          conversation_id: string
          created_at: string
          last_message_content: string
          last_message_created_at: string
          last_message_sender_id: string
          product_id: string
          seller_id: string
          unread_count: number
        }[]
      }
      get_unread_messages_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_game_badge: {
        Args: { p_user_id: string }
        Returns: {
          badge_type: string
          is_premium: boolean
          overall_level: number
        }[]
      }
      get_verification_photo_url: {
        Args: { file_path: string }
        Returns: string
      }
      has_admin_permission: {
        Args: { _tab_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_seller_features_active: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_conversation_messages_read: {
        Args: { conv_id: string; user_uuid: string }
        Returns: number
      }
      mark_messages_delivered: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      notify_subscription_expiring_soon: { Args: never; Returns: number }
      process_admin_withdrawal: {
        Args: {
          p_account_name: string
          p_account_number: string
          p_admin_id: string
          p_amount: number
          p_bank_name: string
        }
        Returns: string
      }
      process_payout_request:
        | {
            Args: { admin_id: string; admin_notes?: string; payout_id: string }
            Returns: boolean
          }
        | {
            Args: {
              admin_user_id: string
              approve: boolean
              notes?: string
              payout_id: string
            }
            Returns: boolean
          }
      reject_seller: {
        Args: { admin_user_id: string; seller_user_id: string }
        Returns: undefined
      }
      reject_seller_application: {
        Args: { admin_response: string; application_id: string }
        Returns: undefined
      }
      release_escrow_funds: { Args: { escrow_id: string }; Returns: boolean }
      release_escrow_to_wallet: {
        Args: { order_id_param: string }
        Returns: boolean
      }
      renew_seller_subscription: {
        Args: { p_payment_reference: string; p_user_id: string }
        Returns: boolean
      }
      resolve_dispute: {
        Args: {
          p_admin_notes?: string
          p_dispute_id: string
          p_refund_buyer?: boolean
        }
        Returns: boolean
      }
      reverse_escrow_funds: { Args: { escrow_id: string }; Returns: boolean }
      screen_sanctions_name: {
        Args: { search_name: string; threshold?: number }
        Returns: {
          full_name: string
          score: number
        }[]
      }
      send_seller_reminders: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      spend_unicoins: {
        Args: { p_amount: number; p_description: string; p_user_id: string }
        Returns: boolean
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      track_product_view: { Args: { p_product_id: string }; Returns: undefined }
      trigger_subscription_checks: { Args: never; Returns: string }
      unban_user: {
        Args: { clear_notes?: boolean; target_user_id: string }
        Returns: undefined
      }
      update_admin_wallet_commission: {
        Args: { commission_amount: number }
        Returns: undefined
      }
      update_bank_details: {
        Args: {
          p_account_name: string
          p_account_number: string
          p_bank_name: string
        }
        Returns: boolean
      }
      update_crossword_leaderboard: {
        Args: {
          p_completion_time: number
          p_level: number
          p_score: number
          p_user_id: string
        }
        Returns: boolean
      }
      update_seller_subscription_payment: {
        Args: {
          p_amount?: number
          p_payment_reference: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_user_profile: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_full_name?: string
          p_phone_number?: string
          p_student_id?: string
          p_university_name?: string
          p_user_id: string
        }
        Returns: boolean
      }
      upgrade_to_seller: { Args: never; Returns: undefined }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      verify_seller_approved: { Args: { user_id: string }; Returns: boolean }
      withdraw_dispute: { Args: { dispute_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer" | "super_admin"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "seller", "buyer", "super_admin"],
    },
  },
} as const
