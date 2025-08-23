import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModerationRequest {
  message: string;
  conversationId: string;
  senderId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using service role for database operations
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { message, conversationId, senderId }: ModerationRequest = await req.json();

    console.log("Moderating message:", { message, conversationId, senderId });

    // Advanced content filtering patterns
    const prohibitedPatterns = [
      // Phone numbers (Nigerian patterns)
      /\b0[789][01]\d{8}\b/g, // Nigerian phone numbers
      /\+234[789][01]\d{8}\b/g, // International format
      /\b[0-9]{11}\b/g, // Generic 11-digit numbers
      
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      
      // Bank account patterns
      /\b\d{10}\b/g, // 10-digit account numbers
      /account.{0,10}number/gi,
      
      // Social media and external platforms
      /whatsapp|wa\.me|telegram|instagram|facebook|twitter|snapchat|tiktok/gi,
      
      // Direct contact phrases
      /contact.{0,10}me|call.{0,10}me|text.{0,10}me|dm.{0,10}me|reach.{0,10}me/gi,
      /my.{0,10}number|phone.{0,10}number|mobile.{0,10}number/gi,
      /outside.{0,10}platform|off.{0,10}platform|external.{0,10}contact/gi,
      
      // Payment bypass attempts
      /direct.{0,10}payment|cash.{0,10}payment|bypass.{0,10}platform/gi,
      /meet.{0,10}person|meet.{0,10}cash|cash.{0,10}delivery/gi,
    ];

    let isBlocked = false;
    let flaggedReason = "";

    // Check each pattern
    for (const pattern of prohibitedPatterns) {
      if (pattern.test(message)) {
        isBlocked = true;
        flaggedReason = "Contains prohibited contact information or platform bypass attempt";
        break;
      }
    }

    // Additional contextual analysis
    if (!isBlocked) {
      const suspiciousKeywords = [
        "meet outside", "campus gate", "student union", "library", 
        "hostel room", "outside unimarket", "forget the platform"
      ];
      
      const lowerMessage = message.toLowerCase();
      for (const keyword of suspiciousKeywords) {
        if (lowerMessage.includes(keyword)) {
          isBlocked = true;
          flaggedReason = "Potentially attempting to bypass platform security";
          break;
        }
      }
    }

    console.log("Moderation result:", { isBlocked, flaggedReason });

    if (isBlocked) {
      // Log the blocked attempt for admin review
      await supabaseService.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: message,
        message_type: "text",
        is_flagged: true,
        flagged_reason: flaggedReason,
      });

      console.log("Message blocked and logged");

      return new Response(
        JSON.stringify({
          allowed: false,
          reason: flaggedReason,
          blockedContent: message.replace(/\d/g, "*").replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g, "[EMAIL]")
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Message is allowed - insert it normally
    const { error } = await supabaseService.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: message,
      message_type: "text",
      is_flagged: false,
    });

    if (error) {
      console.error("Error inserting message:", error);
      throw error;
    }

    console.log("Message allowed and inserted");

    return new Response(
      JSON.stringify({
        allowed: true,
        messageId: "success"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in message moderation:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to process message",
        details: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});