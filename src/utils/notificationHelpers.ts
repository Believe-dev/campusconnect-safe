import { supabase } from '@/integrations/supabase/client';
import { sendEmailNotification } from './emailService';
import { sendServerPushNotification } from './pushNotifications';

interface NotificationOptions {
  sendEmail?: boolean;
  sendPush?: boolean;
  emailTemplate?: 'default' | 'seller_approval' | 'verification_approval' | 'ban_approval' | 'ban_rejection';
  adminResponse?: string;
  rejectionReason?: string;
}

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'info',
  options: NotificationOptions = { sendEmail: true, sendPush: true }
) => {
  try {
    // 1. Store in database
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false
      });

    if (error) throw error;

    // 2. Get user details for email and push notifications
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (!profile) {
      console.warn('Profile not found for user:', userId);
      return true; // Still return success as database notification was created
    }

    // 3. Send push notification
    if (options.sendPush) {
      await sendPushNotification(userId, title, message, { type: type, url: '/notifications' });
    }

    // 4. Send email notification
    if (options.sendEmail && profile.email) {
      await sendEmail(
        profile.email,
        profile.full_name || 'User',
        title,
        message,
        options
      );
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

const sendPushNotification = async (userId: string, title: string, message: string, data?: any) => {
  try {
    // Send server push notification via OneSignal
    await sendServerPushNotification(userId, title, message, data);
    
    // Also try browser notification as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'unimarket-notification',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: data || {}
      });
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

const sendEmail = async (
  email: string,
  name: string,
  title: string,
  message: string,
  options: NotificationOptions
) => {
  try {
    await sendEmailNotification({
      to_email: email,
      to_name: name,
      subject: title,
      message: message,
      notification_type: options.emailTemplate || 'default'
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
};

// Enhanced notification functions
export const notifyVerificationRemoved = async (userId: string) => {
  return createNotification(
    userId,
    'Verification Badge Removed ⚠️',
    'Your seller verification badge has been removed. Please contact support if you believe this is an error.',
    'warning',
    { sendEmail: true, sendPush: true }
  );
};

export const notifySellerApproved = async (userId: string) => {
  return createNotification(
    userId,
    'Seller Account Approved! 🎉',
    'Congratulations! Your seller application has been approved. You can now start selling on UniMarket.',
    'success',
    { sendEmail: true, sendPush: true, emailTemplate: 'seller_approval' }
  );
};

export const notifyVerificationApproved = async (userId: string) => {
  return createNotification(
    userId,
    'Account Verified! ✅',
    'Your account has been verified and you now have a verified badge on your profile.',
    'success',
    { sendEmail: true, sendPush: true, emailTemplate: 'verification_approval' }
  );
};

export const notifyBanApproved = async (userId: string, adminResponse: string) => {
  return createNotification(
    userId,
    'Ban Appeal Approved! 🎉',
    'Great news! Your ban appeal has been approved and your account has been restored.',
    'success',
    { sendEmail: true, sendPush: true, emailTemplate: 'ban_approval', adminResponse }
  );
};

export const notifyBanRejected = async (userId: string, rejectionReason: string) => {
  return createNotification(
    userId,
    'Ban Appeal Rejected ❌',
    'Your ban appeal has been reviewed and rejected. You may submit a new appeal with additional information.',
    'error',
    { sendEmail: true, sendPush: true, emailTemplate: 'ban_rejection', rejectionReason }
  );
};

export const notifyOrderShipped = async (userId: string, orderId: string) => {
  return createNotification(
    userId,
    'Order Shipped! 📦',
    `Your order #${orderId} has been shipped and is on its way to you.`,
    'info',
    { sendEmail: true, sendPush: true }
  );
};

export const notifyOrderDelivered = async (userId: string, orderId: string) => {
  return createNotification(
    userId,
    'Order Delivered! ✅',
    `Your order #${orderId} has been delivered. Please confirm receipt in your orders page.`,
    'success',
    { sendEmail: true, sendPush: true }
  );
};

export const notifyNewMessage = async (userId: string, senderName: string) => {
  return createNotification(
    userId,
    'New Message 💬',
    `You have a new message from ${senderName}.`,
    'info',
    { sendEmail: true, sendPush: true }
  );
};

export const notifyPaymentReceived = async (userId: string, amount: number) => {
  return createNotification(
    userId,
    'Payment Received! 💰',
    `You have received a payment of ₦${amount.toLocaleString()} in your wallet.`,
    'success',
    { sendEmail: true, sendPush: true }
  );
};

export const notifyLowStock = async (userId: string, productName: string, stock: number) => {
  return createNotification(
    userId,
    'Low Stock Alert! ⚠️',
    `Your product "${productName}" is running low on stock (${stock} remaining).`,
    'warning',
    { sendEmail: true, sendPush: true }
  );
};

