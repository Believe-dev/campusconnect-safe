import { Check, CheckCheck, AlertCircle } from "lucide-react";

interface TickMessage {
  created_at: string;
  delivered_at?: string | null;
  _isOptimistic?: boolean;
  _isFailed?: boolean;
}

interface MessageTicksProps {
  message: TickMessage;
  otherUserLastReadAt: string | null;
  /** "on-dark" for sent bubbles (flora-ink background), "on-light" for the
   * conversation list's last-message preview. */
  tone?: "on-dark" | "on-light";
  className?: string;
}

/**
 * WhatsApp-style tick state, shared between the open-chat bubbles and the
 * conversation list's last-message preview so both derive "sent / delivered
 * / read" identically instead of each hand-rolling their own logic.
 */
export const MessageTicks = ({
  message,
  otherUserLastReadAt,
  tone = "on-dark",
  className = "",
}: MessageTicksProps) => {
  const mutedColor = tone === "on-dark" ? "text-white/70" : "text-flora-muted";
  const readColor = "text-sky-400";

  if (message._isFailed) {
    return <AlertCircle className={`h-3.5 w-3.5 shrink-0 text-red-300 ${className}`} />;
  }

  if (message._isOptimistic) {
    return <Check className={`h-3.5 w-3.5 shrink-0 ${mutedColor} ${className}`} />;
  }

  const isRead = !!otherUserLastReadAt && message.created_at <= otherUserLastReadAt;
  if (isRead) {
    return <CheckCheck className={`h-3.5 w-3.5 shrink-0 ${readColor} ${className}`} />;
  }

  if (message.delivered_at) {
    return <CheckCheck className={`h-3.5 w-3.5 shrink-0 ${mutedColor} ${className}`} />;
  }

  return <Check className={`h-3.5 w-3.5 shrink-0 ${mutedColor} ${className}`} />;
};

export default MessageTicks;
