import { ArrowLeft } from 'lucide-react';
import { Button } from './enhanced-button';
import { useNavigate, useLocation } from 'react-router-dom';

const FloatingBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isInMessages = location.pathname === '/messages';
  const isInChat = location.pathname.startsWith('/chat/');

  const showBackButton = location.pathname !== '/' && location.pathname !== '/marketplace' && !isInMessages && !isInChat;

  if (!showBackButton) return null;

  return (
    <div className="fixed top-20 left-4 z-40">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 bg-background/80 backdrop-blur-sm shadow-md hover:shadow-lg"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
    </div>
  );
};

export default FloatingBackButton;