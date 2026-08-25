import { supabase } from '@/integrations/supabase/client';

interface EmailNotificationData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  notification_type?: string;
}

export const sendEmailNotification = async (data: EmailNotificationData): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: data.to_email,
        subject: data.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">📢 ${data.subject}</h2>
            <p>Hello <strong>${data.to_name}</strong>,</p>
            <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
              <p>${data.message}</p>
            </div>
            <p>Please log in to your UniMarket account to take any necessary actions.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Best regards,<br>
              UniMarket Team<br>
              📧 noreply@unimarket.app
            </p>
          </div>
        `,
        text: `Hello ${data.to_name},\n\n${data.subject}\n\n${data.message}\n\nPlease log in to your UniMarket account to take any necessary actions.\n\nBest regards,\nUniMarket Team`
      }
    });

    if (error) {
      console.error('Failed to send email:', error);
      return false;
    }

    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Predefined email templates
export const emailTemplates = {
  orderShipped: (orderNumber: string) => ({
    subject: `Order #${orderNumber} Shipped! 📦`,
    message: `Great news! Your order #${orderNumber} has been shipped and is on its way to you. You'll receive tracking information shortly.`
  }),
  
  orderDelivered: (orderNumber: string) => ({
    subject: `Order #${orderNumber} Delivered! ✅`,
    message: `Your order #${orderNumber} has been delivered successfully. Please confirm receipt in your orders page.`
  }),
  
  newMessage: (senderName: string) => ({
    subject: `New message from ${senderName} 💬`,
    message: `You have received a new message from ${senderName}. Log in to UniMarket to read and reply.`
  }),
  
  paymentReceived: (amount: number) => ({
    subject: `Payment Received! 💰`,
    message: `You have received a payment of ₦${amount.toLocaleString()} in your UniMarket wallet.`
  }),
  
  sellerApproved: () => ({
    subject: `Seller Account Approved! 🎉`,
    message: `Congratulations! Your seller application has been approved. You can now start selling on UniMarket.`
  }),
  
  verificationApproved: () => ({
    subject: `Account Verified! ✅`,
    message: `Your UniMarket account has been verified successfully. You now have a verified badge on your profile.`
  })
};