import { MessageCircle } from "lucide-react";
import { Button } from "./enhanced-button";

interface WhatsAppSupportProps {
  message: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const WhatsAppSupport = ({ 
  message, 
  variant = "outline", 
  size = "sm",
  className = ""
}: WhatsAppSupportProps) => {
  const phoneNumber = "+2349133054018";
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => window.open(whatsappUrl, '_blank')}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Contact Support
    </Button>
  );
};