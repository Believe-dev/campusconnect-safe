import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SecureChat from "@/components/chat/SecureChat";

const Chat = () => {
  const { conversationId } = useParams();
  const { user, loading } = useAuth();

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
    <div className="h-fit bg-background flex flex-col overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <SecureChat
          conversationId={conversationId}
          currentUserId={user.id}
          onClose={() => window.history.back()}
        />
      </main>
    </div>
  );
};

export default Chat;
