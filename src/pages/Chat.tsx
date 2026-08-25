import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import OptimizedChat from "@/components/chat/OptimizedChat";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Chat = () => {
  const { conversationId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState(null);

  // Fetch conversation details to get other user info
  useEffect(() => {
    if (conversationId && user) {
      const fetchConversation = async () => {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select(`
              *,
              buyer:profiles!conversations_buyer_id_fkey (full_name, avatar_url, is_verified),
              seller:profiles!conversations_seller_id_fkey (full_name, avatar_url, is_verified)
            `)
            .eq('id', conversationId)
            .single();

          if (error) throw error;

          // Determine other user
          const otherUserData = data.buyer_id === user.id ? data.seller : data.buyer;
          setOtherUser(otherUserData);
        } catch (error) {
          console.error('Failed to fetch conversation:', error);
        }
      };

      fetchConversation();
    }
  }, [conversationId, user]);

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading chat...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!conversationId) {
    return <Navigate to="/messages" replace />;
  }

  return (
    <OptimizedChat
      conversationId={conversationId}
      currentUserId={user.id}
      otherUser={otherUser}
      onClose={() => navigate('/messages')}
    />
  );
};

export default Chat;
