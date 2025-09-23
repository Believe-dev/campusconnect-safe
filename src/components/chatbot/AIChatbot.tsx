import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, X, Minimize2 } from "lucide-react";
import { getAIResponse } from "@/utils/aiChatbot";
import { sanitizeInput } from "@/utils/security";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  actionButtons?: Array<{
    label: string;
    path: string;
    variant?: "default" | "outline";
  }>;
}

export const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Initialize position on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem("chatbot-position");
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      // Default position (bottom right with safe margins)
      setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 110 });
    }
  }, []);

  // Save position when it changes
  useEffect(() => {
    localStorage.setItem("chatbot-position", JSON.stringify(position));
  }, [position]);

  const handleStart = (clientX: number, clientY: number) => {
    if (isOpen) return;
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y,
    });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || isOpen) return;

    const newX = Math.max(
      10,
      Math.min(window.innerWidth - 66, clientX - dragStart.x)
    );
    const newY = Math.max(
      10,
      Math.min(window.innerHeight - 150, clientY - dragStart.y)
    );

    setPosition({ x: newX, y: newY });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging, dragStart, isOpen]);

  // Load conversation from localStorage on mount (with decryption)
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem("aiChatMessages");
      const savedContext = localStorage.getItem("aiChatContext");

      if (savedMessages) {
        const decrypted = atob(savedMessages); // Basic decoding
        const parsed = JSON.parse(decrypted);
        setMessages(
          parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
        );
      } else {
        // Initial welcome message
        const welcomeMessage: Message = {
          id: "1",
          text: "Hi! I'm your UniMarket assistant. I can help you with questions about buying, selling, messaging, payments, and any issues you're facing. What would you like to know?",
          isBot: true,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }

      if (savedContext) {
        const decryptedContext = atob(savedContext); // Basic decoding
        setConversationContext(JSON.parse(decryptedContext));
      }
    } catch (error) {
      console.error("Failed to load chat data:", error);
      // Only reset if no data exists, preserve existing messages
      if (messages.length === 0) {
        const welcomeMessage: Message = {
          id: "1",
          text: "Hi! I'm your UniMarket assistant. I can help you with questions about buying, selling, messaging, payments, and any issues you're facing. What would you like to know?",
          isBot: true,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    }
  }, []);

  // Save conversation to localStorage whenever messages change (encrypted)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const data = JSON.stringify(messages);
        const encrypted = btoa(data); // Basic encoding
        localStorage.setItem("aiChatMessages", encrypted);
      } catch (error) {
        console.error("Failed to save messages:", error);
      }
    }
  }, [messages]);

  useEffect(() => {
    try {
      const data = JSON.stringify(conversationContext);
      const encrypted = btoa(data); // Basic encoding
      localStorage.setItem("aiChatContext", encrypted);
    } catch (error) {
      console.error("Failed to save context:", error);
    }
  }, [conversationContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Security: Sanitize user input
    const sanitizedInput = input.trim().substring(0, 500); // Limit length
    if (sanitizedInput.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: sanitizedInput,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { text, actionButtons } = await getAIResponse(
        input.trim(),
        conversationContext
      );
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text,
        isBot: true,
        timestamp: new Date(),
        actionButtons,
      };
      setMessages((prev) => [...prev, botMessage]);

      // Update conversation context
      setConversationContext((prev) => [
        ...prev.slice(-10), // Keep last 10 exchanges
        `User: ${input.trim()}`,
        `Assistant: ${text.substring(0, 100)}...`,
      ]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble right now. Please try asking your question again or contact support if the issue persists.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        ref={buttonRef}
        onClick={() => !isDragging && setIsOpen(true)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`fixed z-[60] h-14 w-14 rounded-full bg-university-green hover:bg-green-700 shadow-lg transition-all ${
          isDragging
            ? "cursor-grabbing scale-110"
            : "cursor-grab hover:scale-105"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: "none",
          userSelect: "none",
        }}
        size="icon"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <Card
      className={`fixed bottom-20 sm:bottom-4 left-4 right-4 sm:right-4 sm:left-auto z-[60] w-auto sm:w-96 max-w-none sm:max-w-sm shadow-xl transition-all ${
        isMinimized ? "h-14" : "h-[60vh] sm:h-[500px]"
      }`}
    >
      <CardHeader className="p-3 bg-university-green text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" />
            UniMarket Assistant
            <Badge
              variant="secondary"
              className="bg-green-600 text-white text-xs"
            >
              AI
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages([
                  {
                    id: "1",
                    text: "Hi! I'm your UniMarket assistant. I can help you with questions about buying, selling, messaging, payments, and any issues you're facing. What would you like to know?",
                    isBot: true,
                    timestamp: new Date(),
                  },
                ]);
                setConversationContext([]);
                localStorage.removeItem("aiChatMessages");
                localStorage.removeItem("aiChatContext");
              }}
              className="h-6 w-6 p-0 text-white hover:bg-green-600"
              title="Clear Chat"
            >
              🗑️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 text-white hover:bg-green-600"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-white hover:bg-green-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent
          className="p-0 flex flex-col"
          style={{ height: "calc(70vh - 56px)" }}
        >
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isBot ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    message.isBot
                      ? "bg-gray-100 text-gray-800"
                      : "bg-university-green text-white"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.isBot && (
                      <Bot className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    )}
                    {!message.isBot && (
                      <User className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="leading-relaxed whitespace-pre-line">
                        {message.text.split("\n").map((line, idx) => {
                          const sanitizedLine = sanitizeInput(line);
                          if (
                            sanitizedLine.startsWith("**") &&
                            sanitizedLine.endsWith("**")
                          ) {
                            return (
                              <div
                                key={idx}
                                className={`font-semibold mt-2 mb-1 ${
                                  message.isBot ? "text-gray-900" : "text-white"
                                }`}
                              >
                                {sanitizedLine.slice(2, -2)}
                              </div>
                            );
                          }
                          if (
                            sanitizedLine.startsWith("• ") ||
                            sanitizedLine.startsWith("- ")
                          ) {
                            return (
                              <div
                                key={idx}
                                className={`ml-2 ${
                                  message.isBot ? "text-gray-700" : "text-white"
                                }`}
                              >
                                • {sanitizedLine.slice(2)}
                              </div>
                            );
                          }
                          if (sanitizedLine.match(/^\d+\)/)) {
                            return (
                              <div
                                key={idx}
                                className={`ml-2 mt-1 ${
                                  message.isBot ? "text-gray-700" : "text-white"
                                }`}
                              >
                                {sanitizedLine}
                              </div>
                            );
                          }
                          if (
                            sanitizedLine.includes("🔐") ||
                            sanitizedLine.includes("🛒") ||
                            sanitizedLine.includes("💬") ||
                            sanitizedLine.includes("💳") ||
                            sanitizedLine.includes("🛡️") ||
                            sanitizedLine.includes("⚙️")
                          ) {
                            return (
                              <div
                                key={idx}
                                className={`font-medium mt-2 ${
                                  message.isBot ? "text-gray-800" : "text-white"
                                }`}
                              >
                                {sanitizedLine}
                              </div>
                            );
                          }
                          if (sanitizedLine.trim() === "") {
                            return <div key={idx} className="h-2"></div>;
                          }
                          return (
                            <div
                              key={idx}
                              className={
                                message.isBot ? "text-gray-700" : "text-white"
                              }
                            >
                              {sanitizedLine}
                            </div>
                          );
                        })}
                      </div>
                      {message.actionButtons && (
                        <div
                          className={`flex flex-wrap gap-2 mt-3 pt-2 ${
                            message.isBot
                              ? "border-t border-gray-200"
                              : "border-t border-green-400"
                          }`}
                        >
                          {message.actionButtons.map((button, idx) => (
                            <Button
                              key={idx}
                              size="sm"
                              variant={
                                button.variant === "outline"
                                  ? "outline"
                                  : "default"
                              }
                              className={`h-7 text-xs ${
                                button.variant === "outline"
                                  ? "border-university-green text-university-green hover:bg-university-green hover:text-white"
                                  : "bg-university-green hover:bg-green-700 text-white"
                              }`}
                              onClick={() => {
                                // Security: Validate URL before navigation
                                const allowedPaths = [
                                  "/marketplace",
                                  "/sell",
                                  "/profile",
                                  "/messages",
                                  "/orders",
                                  "/settings",
                                  "/learn-more",
                                  "/auth",
                                  "/wallet",
                                  "/search",
                                ];
                                const sanitizedPath = sanitizeInput(
                                  button.path
                                );
                                if (allowedPaths.includes(sanitizedPath)) {
                                  window.location.href = sanitizedPath;
                                }
                              }}
                            >
                              {sanitizeInput(button.label)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3 text-university-green" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-university-green rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-university-green rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-university-green rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t bg-gray-50 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
                className="text-xs sm:text-sm border-gray-300 focus:border-university-green focus:ring-university-green"
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                size="sm"
                className="bg-university-green hover:bg-green-700 text-white shadow-sm"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
