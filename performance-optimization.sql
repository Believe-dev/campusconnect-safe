-- Database Performance Optimizations for 400+ concurrent users

-- 1. Add essential indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_seller ON conversations(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- 2. Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_messages_unread_receiver ON messages(conversation_id, sender_id) WHERE is_read = false;

-- 3. Optimize RLS policies for better performance
-- Enable RLS row security but optimize policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. Add connection pooling settings (for Supabase config)
-- These should be set in Supabase dashboard:
-- max_connections = 100
-- shared_preload_libraries = 'pg_stat_statements'
-- effective_cache_size = '1GB'
-- work_mem = '4MB'