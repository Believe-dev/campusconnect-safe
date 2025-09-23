import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { SAFE_PROFILE_SELECT } from "@/lib/profileSecurity";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Shield,
  AlertTriangle,
  MessageCircle,
  Smile,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { useSearchParams } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_flagged: boolean;
  flagged_reason?: string;
  reactions?: { [emoji: string]: string[] };
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product?: {
    title: string;
    price: number;
  };
  other_user?: {
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
}

interface SecureChatProps {
  conversationId: string;
  currentUserId: string;
  onClose?: () => void;
}

const SecureChat = ({
  conversationId,
  currentUserId,
  onClose,
}: SecureChatProps) => {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "😡", "👏", "🔥"];

  const messageEmojis = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "😋",
    "😛",
    "😜",
    "🤪",
    "😝",
    "🤑",
    "🤗",
    "🤭",
    "🤫",
    "🤔",
    "🤐",
    "🤨",
    "😐",
    "😑",
    "😶",
    "😏",
    "😒",
    "🙄",
    "😬",
    "🤥",
    "😔",
    "😪",
    "🤤",
    "😴",
    "😷",
    "🤒",
    "🤕",
    "🤢",
    "🤮",
    "🤧",
    "🥵",
    "🥶",
    "🥴",
    "😵",
    "🤯",
    "🤠",
    "🥳",
    "😎",
    "🤓",
    "🧐",
    "😕",
    "😟",
    "🙁",
    "☹️",
    "😮",
    "😯",
    "😲",
    "😳",
    "🥺",
    "😦",
    "😧",
    "😨",
    "😰",
    "😥",
    "😢",
    "😭",
    "😱",
    "😖",
    "😣",
    "😞",
    "😓",
    "😩",
    "😫",
    "🥱",
    "😤",
    "😡",
    "😠",
    "🤬",
    "😈",
    "👿",
    "💀",
    "☠️",
    "💩",
    "🤡",
    "👹",
    "👺",
    "👻",
    "👽",
    "👾",
    "🤖",
    "😺",
    "😸",
    "😹",
    "😻",
    "😼",
    "😽",
    "🙀",
    "😿",
    "😾",
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🤎",
    "🖤",
    "🤍",
    "💔",
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "💟",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👍",
    "👎",
    "👊",
    "✊",
    "🤛",
    "🤜",
    "👏",
    "🙌",
    "👐",
    "🤲",
    "🤝",
    "🙏",
    "✍️",
    "💅",
    "🤳",
    "💪",
    "🦾",
    "🦿",
    "🦵",
    "🦶",
    "👂",
    "🦻",
    "👃",
    "🧠",
    "🦷",
    "🦴",
    "👀",
    "👁️",
    "👅",
    "👄",
    "💋",
    "🩸",
    "👶",
    "🧒",
    "👦",
    "👧",
    "🧑",
    "👱",
    "👨",
    "🧔",
    "👩",
    "🧓",
    "👴",
    "👵",
    "🙍",
    "🙎",
    "🙅",
    "🙆",
    "💁",
    "🙋",
    "🧏",
    "🙇",
    "🤦",
    "🤷",
    "👮",
    "🕵️",
    "💂",
    "👷",
    "🤴",
    "👸",
    "👳",
    "👲",
    "🧕",
    "🤵",
    "👰",
    "🤰",
    "🤱",
    "👼",
    "🎅",
    "🤶",
    "🦸",
    "🦹",
    "🧙",
    "🧚",
    "🧛",
    "🧜",
    "🧝",
    "🧞",
    "🧟",
    "💆",
    "💇",
    "🚶",
    "🧍",
    "🧎",
    "🏃",
    "💃",
    "🕺",
    "🕴️",
    "👯",
    "🧖",
    "🧗",
    "🤺",
    "🏇",
    "⛷️",
    "🏂",
    "🏌️",
    "🏄",
    "🚣",
    "🏊",
    "⛹️",
    "🏋️",
    "🚴",
    "🚵",
    "🤸",
    "🤼",
    "🤽",
    "🤾",
    "🤹",
    "🧘",
    "🛀",
    "🛌",
    "👭",
    "👫",
    "👬",
    "💏",
    "💑",
    "👪",
    "🗣️",
    "👤",
    "👥",
    "👣",
    "🦰",
    "🦱",
    "🦳",
    "🦲",
    "🐵",
    "🐒",
    "🦍",
    "🦧",
    "🐶",
    "🐕",
    "🦮",
    "🐕‍🦺",
    "🐩",
    "🐺",
    "🦊",
    "🦝",
    "🐱",
    "🐈",
    "🐈‍⬛",
    "🦁",
    "🐯",
    "🐅",
    "🐆",
    "🐴",
    "🐎",
    "🦄",
    "🦓",
    "🦌",
    "🐮",
    "🐂",
    "🐃",
    "🐄",
    "🐷",
    "🐖",
    "🐗",
    "🐽",
    "🐏",
    "🐑",
    "🐐",
    "🐪",
    "🐫",
    "🦙",
    "🦒",
    "🐘",
    "🦏",
    "🦛",
    "🐭",
    "🐁",
    "🐀",
    "🐹",
    "🐰",
    "🐇",
    "🐿️",
    "🦔",
    "🦇",
    "🐻",
    "🐨",
    "🐼",
    "🦥",
    "🦦",
    "🦨",
    "🦘",
    "🦡",
    "🐾",
    "🦃",
    "🐔",
    "🐓",
    "🐣",
    "🐤",
    "🐥",
    "🐦",
    "🐧",
    "🕊️",
    "🦅",
    "🦆",
    "🦢",
    "🦉",
    "🦩",
    "🦚",
    "🦜",
    "🐸",
    "🐊",
    "🐢",
    "🦎",
    "🐍",
    "🐲",
    "🐉",
    "🦕",
    "🦖",
    "🐳",
    "🐋",
    "🐬",
    "🐟",
    "🐠",
    "🐡",
    "🦈",
    "🐙",
    "🐚",
    "🐌",
    "🦋",
    "🐛",
    "🐜",
    "🐝",
    "🐞",
    "🦗",
    "🕷️",
    "🦂",
    "🦟",
    "🦠",
    "💐",
    "🌸",
    "💮",
    "🏵️",
    "🌹",
    "🥀",
    "🌺",
    "🌻",
    "🌼",
    "🌷",
    "🌱",
    "🌲",
    "🌳",
    "🌴",
    "🌵",
    "🌶️",
    "🍄",
    "🌰",
    "🌍",
    "🌎",
    "🌏",
    "🌕",
    "🌖",
    "🌗",
    "🌘",
    "🌑",
    "🌒",
    "🌓",
    "🌔",
    "🌙",
    "🌛",
    "🌜",
    "🌚",
    "🌝",
    "🌞",
    "⭐",
    "🌟",
    "💫",
    "✨",
    "☄️",
    "☀️",
    "🌤️",
    "⛅",
    "🌥️",
    "☁️",
    "🌦️",
    "🌧️",
    "⛈️",
    "🌩️",
    "🌨️",
    "❄️",
    "☃️",
    "⛄",
    "🌬️",
    "💨",
    "💧",
    "💦",
    "☔",
    "☂️",
    "🌊",
    "🌈",
    "🍏",
    "🍎",
    "🍐",
    "🍊",
    "🍋",
    "🍌",
    "🍉",
    "🍇",
    "🍓",
    "🍈",
    "🍒",
    "🍑",
    "🥭",
    "🍍",
    "🥥",
    "🥝",
    "🍅",
    "🍆",
    "🥑",
    "🥦",
    "🥬",
    "🥒",
    "🌶️",
    "🌽",
    "🥕",
    "🧄",
    "🧅",
    "🥔",
    "🍠",
    "🥐",
    "🥖",
    "🍞",
    "🥨",
    "🥯",
    "🧀",
    "🥚",
    "🍳",
    "🧈",
    "🥞",
    "🧇",
    "🥓",
    "🥩",
    "🍗",
    "🍖",
    "🦴",
    "🌭",
    "🍔",
    "🍟",
    "🍕",
    "🥪",
    "🥙",
    "🧆",
    "🌮",
    "🌯",
    "🥗",
    "🥘",
    "🥫",
    "🍝",
    "🍜",
    "🍲",
    "🍛",
    "🍣",
    "🍱",
    "🥟",
    "🦪",
    "🍤",
    "🍙",
    "🍚",
    "🍘",
    "🍥",
    "🥠",
    "🥮",
    "🍢",
    "🍡",
    "🍧",
    "🍨",
    "🍦",
    "🥧",
    "🧁",
    "🍰",
    "🎂",
    "🍮",
    "🍭",
    "🍬",
    "🍫",
    "🍿",
    "🍩",
    "🍪",
    "🌰",
    "🥜",
    "🍯",
    "🥛",
    "🍼",
    "☕",
    "🍵",
    "🧃",
    "🥤",
    "🍶",
    "🍺",
    "🍻",
    "🥂",
    "🍷",
    "🥃",
    "🍸",
    "🍹",
    "🧉",
    "🍾",
    "🧊",
    "🥄",
    "🍴",
    "🍽️",
    "🥣",
    "🥡",
    "🥢",
    "🧂",
    "⚽",
    "🏀",
    "🏈",
    "⚾",
    "🥎",
    "🎾",
    "🏐",
    "🏉",
    "🥏",
    "🎱",
    "🪀",
    "🏓",
    "🏸",
    "🏒",
    "🏑",
    "🥍",
    "🏏",
    "🪃",
    "🥅",
    "⛳",
    "🪁",
    "🏹",
    "🎣",
    "🤿",
    "🥊",
    "🥋",
    "🎽",
    "🛹",
    "🛷",
    "⛸️",
    "🥌",
    "🎿",
    "⛷️",
    "🏂",
    "🪂",
    "🏋️",
    "🤸",
    "🤺",
    "🤾",
    "🏌️",
    "🏇",
    "🧘",
    "🏄",
    "🏊",
    "🤽",
    "🚣",
    "🧗",
    "🚵",
    "🚴",
    "🏆",
    "🥇",
    "🥈",
    "🥉",
    "🏅",
    "🎖️",
    "🏵️",
    "🎗️",
    "🎫",
    "🎟️",
    "🎪",
    "🤹",
    "🎭",
    "🩰",
    "🎨",
    "🎬",
    "🎤",
    "🎧",
    "🎼",
    "🎵",
    "🎶",
    "🥇",
    "🥈",
    "🥉",
    "🏆",
    "🏅",
    "🎖️",
    "🏵️",
    "🎗️",
    "🎫",
    "🎟️",
    "🎪",
    "🤹",
    "🎭",
    "🩰",
    "🎨",
    "🎬",
    "🎤",
    "🎧",
    "🎼",
    "🎵",
    "🎶",
    "🎯",
    "🎲",
    "🎰",
    "🎳",
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎️",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "🚚",
    "🚛",
    "🚜",
    "🏍️",
    "🛵",
    "🚲",
    "🛴",
    "🛹",
    "🚁",
    "🚟",
    "🚠",
    "🚡",
    "🛰️",
    "🚀",
    "🛸",
    "🚂",
    "🚃",
    "🚄",
    "🚅",
    "🚆",
    "🚇",
    "🚈",
    "🚉",
    "🚊",
    "🚝",
    "🚞",
    "🚋",
    "🚌",
    "🚍",
    "🚎",
    "🚐",
    "🚑",
    "🚒",
    "🚓",
    "🚔",
    "🚕",
    "🚖",
    "🚗",
    "🚘",
    "🚙",
    "🚚",
    "🚛",
    "🚜",
    "🏎️",
    "🏍️",
    "🛵",
    "🚲",
    "🛴",
    "🛹",
    "⚽",
    "🏀",
    "🏈",
    "⚾",
    "🥎",
    "🎾",
    "🏐",
    "🏉",
    "🥏",
    "🎱",
    "🪀",
    "🏓",
    "🏸",
    "🏒",
    "🏑",
    "🥍",
    "🏏",
    "🪃",
    "🥅",
    "⛳",
    "🪁",
    "🏹",
    "🎣",
    "🤿",
    "🥊",
    "🥋",
    "🎽",
    "🛹",
    "🛷",
    "⛸️",
    "🥌",
    "🎿",
    "⛷️",
    "🏂",
    "🪂",
    "🏋️",
    "🤸",
    "🤺",
    "🤾",
    "🏌️",
    "🏇",
    "🧘",
    "🏄",
    "🏊",
    "🤽",
    "🚣",
    "🧗",
    "🚵",
    "🚴",
    "🏆",
    "🥇",
    "🥈",
    "🥉",
    "🏅",
    "🎖️",
    "🏵️",
    "🎗️",
    "🎫",
    "🎟️",
    "🎪",
    "🤹",
    "🎭",
    "🩰",
    "🎨",
    "🎬",
    "🎤",
    "🎧",
    "🎼",
    "🎵",
    "🎶",
    "🎯",
    "🎲",
    "🎰",
    "🎳",
  ];

  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState(false);

  // Handle draft messages per conversation
  useEffect(() => {
    const draftMessage = searchParams.get("draft");

    if (draftMessage && !newMessage) {
      setNewMessage(decodeURIComponent(draftMessage));
      // Store draft for this conversation
      localStorage.setItem(
        `draft_${conversationId}`,
        decodeURIComponent(draftMessage)
      );
      // Clear draft from URL immediately
      const url = new URL(window.location.href);
      url.searchParams.delete("draft");
      window.history.replaceState({}, "", url.toString());
    } else {
      // Load existing draft for this conversation
      const savedDraft = localStorage.getItem(`draft_${conversationId}`);
      if (savedDraft && !newMessage) {
        setNewMessage(savedDraft);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
    fetchMessages();

    // Mark messages as read when chat is opened
    const markMessagesAsRead = async () => {
      try {
        // Message read status is handled by the MessagePopup component
      } catch (error) {
        // Error handled silently
      }
    };

    // Mark messages as read immediately
    markMessagesAsRead();

    // Also mark when component mounts after a short delay
    const delayedMark = setTimeout(markMessagesAsRead, 500);

    return () => {
      clearTimeout(delayedMark);
    };

    // Optimized real-time messaging for high concurrent users
    const subscription = supabase
      .channel(`chat_${conversationId}_${currentUserId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUserId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Skip if it's our own message (already added optimistically)
          if (newMsg.sender_id === currentUserId) return;

          // Use cached profile data if available
          const cachedProfile = messages.find(
            (m) => m.sender_id === newMsg.sender_id
          )?.sender;
          let profile = cachedProfile;

          if (!profile) {
            const { data: fetchedProfile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", newMsg.sender_id)
              .maybeSingle();
            profile = fetchedProfile;
          }

          const messageWithSender = {
            ...newMsg,
            sender: profile,
          };

          setMessages((prev) => [...prev, messageWithSender]);
          scrollToBottom();

          // Message notifications are handled by MessagePopup component
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Handle message updates
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, ...payload.new }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          products (title, price),
          buyer:profiles!conversations_buyer_id_fkey (full_name, avatar_url, is_verified),
          seller:profiles!conversations_seller_id_fkey (full_name, avatar_url, is_verified)
        `
        )
        .eq("id", conversationId)
        .single();

      if (error) {
        return;
      }

      // Determine other user
      const otherUser =
        data.buyer_id === currentUserId ? data.seller : data.buyer;
      setConversation({ ...data, other_user: otherUser });
    } catch (error) {
      // Error handled silently
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          profiles!sender_id (
            full_name,
            avatar_url
          )
        `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        return;
      }

      setMessages(
        data.map((msg) => ({
          ...msg,
          sender: msg.profiles,
        })) || []
      );
    } catch (error) {
      // Error handled silently
    }
  };

  const detectBlockedContent = (
    content: string
  ): {
    blocked: boolean;
    reason: string;
    severity: "low" | "medium" | "high";
  } | null => {
    const lowerContent = content.toLowerCase();

    // Contact information patterns
    const contactPatterns = [
      { pattern: /\b\d{10,11}\b/g, reason: "Contains phone number" },
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        reason: "Contains email address",
      },
      {
        pattern:
          /whatsapp|telegram|instagram|facebook|twitter|snapchat|tiktok/gi,
        reason: "Contains social media reference",
      },
      {
        pattern: /contact me|call me|text me|dm me|reach me|phone me/gi,
        reason: "Contains direct contact request",
      },
      { pattern: /\b0[789]\d{8}\b/g, reason: "Contains Nigerian phone number" },
      {
        pattern: /\+234[789]\d{8}/g,
        reason: "Contains international phone number",
      },
    ];

    // Foul language patterns
    const foulLanguagePatterns = [
      {
        pattern: /\b(fuck|shit|damn|bitch|bastard|asshole|motherfucker)\b/gi,
        reason: "Contains profanity",
      },
      {
        pattern: /\b(mumu|olodo|ode|werey|ashawo|agbaya|oponu)\b/gi,
        reason: "Contains offensive language",
      },
      {
        pattern: /\b(stupid|idiot|fool|moron|dumb)\b/gi,
        reason: "Contains insulting language",
      },
      {
        pattern: /\b(kill|die|murder|suicide)\b/gi,
        reason: "Contains threatening language",
      },
    ];

    // Check contact information (high severity)
    for (const { pattern, reason } of contactPatterns) {
      if (pattern.test(content)) {
        return { blocked: true, reason, severity: "high" };
      }
    }

    // Check foul language (medium severity)
    for (const { pattern, reason } of foulLanguagePatterns) {
      if (pattern.test(content)) {
        return { blocked: true, reason, severity: "medium" };
      }
    }

    return null;
  };

  const notifyAdminsOfViolation = async (
    violationType: string,
    content: string,
    userId: string,
    severity: "low" | "medium" | "high"
  ) => {
    try {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, student_id")
        .eq("user_id", userId)
        .single();

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        const notificationTitle = `🚨 Message Violation Detected`;
        const notificationMessage = `User: ${
          userProfile?.full_name || "Unknown"
        } (ID: ${
          userProfile?.student_id || "N/A"
        })\nViolation: ${violationType}\nSeverity: ${severity.toUpperCase()}\nContent: "${content.substring(
          0,
          100
        )}${
          content.length > 100 ? "..." : ""
        }"\nTime: ${new Date().toLocaleString()}`;

        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: severity === "high" ? "error" : "warning",
          });
        }
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    // Content restriction disabled

    setLoading(true);

    try {
      const messageContent = newMessage.trim();
      const tempId = `temp-${Date.now()}`;

      // Optimistic update - add message immediately
      const optimisticMessage = {
        id: tempId,
        content: messageContent,
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        is_flagged: false,
        sender: messages.find((m) => m.sender_id === currentUserId)?.sender,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");
      scrollToBottom();

      // Clear draft for this conversation
      localStorage.removeItem(`draft_${conversationId}`);

      // Send to database
      const { data: insertedMessage, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent,
          is_flagged: false,
        })
        .select()
        .single();

      if (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw error;
      }

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...optimisticMessage, id: insertedMessage.id } : m
        )
      );

      // Message notifications are handled by MessagePopup component
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      toast({
        title: "Message Deleted",
        description: "The message has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <Card className="h-full flex flex-col border-0 shadow-lg rounded-none sm:rounded-lg">
        {/* Secure Chat Header */}
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 sm:p-4 rounded-t-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0 text-white hover:bg-white/20 bg-white/10 rounded-full flex-shrink-0"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Button>
            )}

            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                if (conversation?.other_user) {
                  const otherUserId =
                    conversation.buyer_id === currentUserId
                      ? conversation.seller_id
                      : conversation.buyer_id;
                  window.open(`/seller/${otherUserId}`, "_blank");
                }
              }}
            >
              {conversation?.other_user && (
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <AvatarImage src={conversation.other_user.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    {getInitials(conversation.other_user.full_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base sm:text-lg font-semibold truncate">
                    {conversation?.other_user?.full_name || "Secure Chat"}
                  </CardTitle>
                  {conversation?.other_user?.is_verified && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 flex-shrink-0" />
                  <span className="text-xs opacity-90">Secure Chat</span>
                  <Badge
                    variant="secondary"
                    className="bg-white/20 text-white border-0 text-xs"
                  >
                    Consolidated Chat
                  </Badge>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <span>Encrypted</span>
            </div>
          </div>
        </CardHeader>

        {/* Messages Container */}
        <CardContent className="flex-1 overflow-y-auto p-0 bg-gradient-to-b from-gray-50 to-white">
          <div className="p-3 sm:p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Start secure conversation
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    All messages are encrypted and monitored for safety
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex mb-3 ${
                    message.sender_id === currentUserId
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm border cursor-pointer select-none ${
                      message.sender_id === currentUserId
                        ? "bg-green-500 text-white border-green-500 rounded-br-sm"
                        : "bg-white text-foreground border-border rounded-bl-sm"
                    } ${
                      selectedMessage === message.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        setSelectedMessage(message.id);
                        navigator.vibrate?.(50);
                      }, 500);
                      e.currentTarget.dataset.timer = timer.toString();
                    }}
                    onTouchEnd={(e) => {
                      const timer = e.currentTarget.dataset.timer;
                      if (timer) clearTimeout(parseInt(timer));
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedMessage(message.id);
                    }}
                  >
                    {message.is_flagged && (
                      <div className="flex items-center gap-1 text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Content flagged for review</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed break-words">
                      {message.content}
                    </p>
                    {message.reactions &&
                      Object.keys(message.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(message.reactions).map(
                            ([emoji, userIds]) => (
                              <div
                                key={emoji}
                                className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-xs"
                              >
                                <span>{emoji}</span>
                                <span className="text-gray-600">
                                  {userIds.length}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs ${
                          message.sender_id === currentUserId
                            ? "text-green-100"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </span>
                      {message.sender_id === currentUserId && (
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs ${
                              message.id.startsWith("temp-")
                                ? "text-green-200"
                                : "text-green-100"
                            }`}
                          >
                            {message.id.startsWith("temp-") ? "⏳" : "✓"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        {/* Security Alert */}
        {blocked && (
          <div className="mx-4 mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2 text-destructive text-sm">
              <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Message blocked for safety</p>
                <p className="text-xs mt-1">
                  Contact information sharing is prohibited to protect users
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message Actions Modal */}
        {selectedMessage && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedMessage(null)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl border-t sm:border border-gray-100 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden"></div>
              <h3 className="font-bold text-lg text-center mb-6 text-gray-800">
                Message Actions
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 text-left border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  onClick={async () => {
                    const message = messages.find(
                      (m) => m.id === selectedMessage
                    );
                    if (message) {
                      try {
                        await navigator.clipboard.writeText(message.content);
                        toast({
                          title: "✅ Copied",
                          description: "Message copied to clipboard",
                        });
                      } catch (error) {
                        toast({
                          title: "❌ Error",
                          description: "Failed to copy message",
                          variant: "destructive",
                        });
                      }
                    }
                    setSelectedMessage(null);
                  }}
                >
                  <span className="text-lg mr-3">📋</span>
                  <span className="font-medium">Copy Message</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 text-left border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  onClick={() => {
                    setShowEmojiPicker(true);
                  }}
                >
                  <span className="text-lg mr-3">😊</span>
                  <span className="font-medium">React with Emoji</span>
                </Button>
                {Boolean(selectedMessage && messages.find((m) => m.id === selectedMessage)?.sender_id === currentUserId) && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 text-left border-red-200 text-red-600 hover:bg-red-50 transition-all duration-200"
                    onClick={() => {
                      deleteMessage(selectedMessage);
                      setSelectedMessage(null);
                    }}
                  >
                    <span className="text-lg mr-3">🗑️</span>
                    <span className="font-medium">Delete Message</span>
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 h-12 font-medium text-gray-600"
                onClick={() => setSelectedMessage(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Emoji Picker Modal */}
        {showEmojiPicker && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowEmojiPicker(false)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl border-t sm:border border-gray-100 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden"></div>
              <h3 className="font-bold text-lg text-center mb-6 text-gray-800">
                Choose Reaction
              </h3>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    className="text-3xl p-4 hover:bg-gray-100 rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                    onClick={async () => {
                      const message = messages.find(
                        (m) => m.id === selectedMessage
                      );
                      if (message) {
                        const reactions = { ...message.reactions } || {};
                        if (!reactions[emoji]) {
                          reactions[emoji] = [];
                        }
                        if (!reactions[emoji].includes(currentUserId)) {
                          reactions[emoji].push(currentUserId);
                        }

                        // Reactions feature temporarily disabled
                        toast({
                          title: "✅ Reacted!",
                          description: `You reacted with ${emoji}`,
                        });
                      }
                      setShowEmojiPicker(false);
                      setSelectedMessage(null);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full h-12 font-medium text-gray-600"
                onClick={() => {
                  setShowEmojiPicker(false);
                  setSelectedMessage(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Message Emoji Picker */}
        {showMessageEmojiPicker && (
          <div className="border-t bg-white p-3 sm:p-4 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {messageEmojis.map((emoji, index) => (
                <button
                  key={index}
                  className="text-2xl p-2 hover:bg-gray-100 rounded transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => {
                    setNewMessage((prev) => prev + emoji);
                    localStorage.setItem(
                      `draft_${conversationId}`,
                      newMessage + emoji
                    );
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input Area */}
        <div className="border-t bg-white p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-end gap-2 sm:gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowMessageEmojiPicker(!showMessageEmojiPicker)}
              className="h-10 w-10 rounded-full flex-shrink-0"
            >
              <Smile className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  // Clear draft when user clears input
                  if (!e.target.value.trim()) {
                    localStorage.removeItem(`draft_${conversationId}`);
                  }
                }}
                onKeyPress={handleKeyPress}
                onFocus={() => {
                  // Prevent page scroll on mobile keyboard
                  if (window.innerWidth < 768) {
                    document.body.style.position = "fixed";
                    document.body.style.width = "100%";
                  }
                }}
                onBlur={() => {
                  // Restore normal scroll behavior
                  if (window.innerWidth < 768) {
                    document.body.style.position = "";
                    document.body.style.width = "";
                  }
                }}
                disabled={loading}
                className="border-2 border-muted focus:border-green-500 rounded-full px-3 sm:px-4 py-2 text-sm min-h-[40px]"
              />
            </div>
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={loading || !newMessage.trim()}
              className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 shadow-lg flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Security Footer */}
          <div className="flex items-center justify-center gap-2 mt-2 sm:mt-3 text-xs text-muted-foreground">
            <Shield className="h-3 w-3 text-green-600" />
            <span className="text-center">
              End-to-end encrypted • Monitored for safety
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SecureChat;
