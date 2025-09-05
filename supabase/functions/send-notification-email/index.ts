import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  email: string;
  name: string;
  type: 'approved' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, type }: NotificationEmailRequest = await req.json();

    const isApproved = type === 'approved';
    const subject = isApproved 
      ? "🎉 Your UniMarket seller account has been approved!" 
      : "UniMarket seller application update";

    const htmlContent = isApproved ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669; text-align: center;">Congratulations, ${name}!</h1>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #065f46; margin-top: 0;">Your seller account has been approved! 🎉</h2>
          <p style="color: #374151; line-height: 1.6;">
            Great news! Our admin team has reviewed and approved your seller verification. 
            You can now start listing items on UniMarket and reach students in your university community.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">What's next?</h3>
          <ul style="color: #374151; line-height: 1.6;">
            <li>Log into your UniMarket account</li>
            <li>Navigate to the "Sell" section</li>
            <li>Create your first product listing</li>
            <li>Start connecting with buyers in your area</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('SITE_URL') || 'https://unimarket.app'}/sell" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Selling Now
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Welcome to the UniMarket community! If you have any questions, our support team is here to help.
        </p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626; text-align: center;">Seller Application Update</h1>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #991b1b; margin-top: 0;">Application Not Approved</h2>
          <p style="color: #374151; line-height: 1.6;">
            Thank you for your interest in becoming a seller on UniMarket, ${name}. 
            Unfortunately, we were unable to approve your seller application at this time.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">What this means:</h3>
          <ul style="color: #374151; line-height: 1.6;">
            <li>Your account has been converted to a buyer-only account</li>
            <li>You can still browse and purchase items from other sellers</li>
            <li>You may reapply for seller status in the future</li>
          </ul>
        </div>

        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">Common reasons for rejection:</h3>
          <ul style="color: #374151; line-height: 1.6;">
            <li>Unclear or blurry verification photos</li>
            <li>Student ID information doesn't match profile details</li>
            <li>Incomplete application information</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('SITE_URL') || 'https://unimarket.app'}/marketplace" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Browse Marketplace
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          If you have questions about your application, please contact our support team.
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "UniMarket <notifications@unimarket.app>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);