import { useParams, useSearchParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import OptimizedChat from "@/components/chat/OptimizedChat";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Chat = () => {
  const { conversationId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [otherUser, setOtherUser] = useState(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  // A pre-filled draft (e.g. "Hi! I'm interested in your ...") arrives as a
  // query param from ProductDetails/Orders — capture it once, then strip it
  // from the URL so refreshing or going back doesn't re-fill the composer.
  const [initialDraft] = useState(() => searchParams.get("draft") || "");
  useEffect(() => {
    if (searchParams.get("draft") && conversationId) {
      navigate(`/chat/${conversationId}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          setOtherUserId(data.buyer_id === user.id ? data.seller_id : data.buyer_id);
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
      otherUserId={otherUserId}
      initialDraft={initialDraft}
      onClose={() => navigate('/messages')}
    />
  );
};

export default Chat;
