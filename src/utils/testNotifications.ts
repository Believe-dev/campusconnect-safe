import { supabase } from '@/integrations/supabase/client';
import { 
  notifyOrderShipped, 
  notifyOrderDelivered, 
  notifyNewMessage, 
  notifyPaymentReceived,
  notifySellerApproved,
  notifyVerificationApproved 
} from './notificationHelpers';

// Test functions to demonstrate the enhanced notification system
export const testNotificationSystem = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return;
  }

  console.log('Testing enhanced notification system...');

  // Test different types of notifications
  const tests = [
    {
      name: 'Order Shipped',
      fn: () => notifyOrderShipped(user.id, 'ORD-12345')
    },
    {
      name: 'Order Delivered', 
      fn: () => notifyOrderDelivered(user.id, 'ORD-12345')
    },
    {
      name: 'New Message',
      fn: () => notifyNewMessage(user.id, 'John Doe')
    },
    {
      name: 'Payment Received',
      fn: () => notifyPaymentReceived(user.id, 5000)
    },
    {
      name: 'Seller Approved',
      fn: () => notifySellerApproved(user.id)
    },
    {
      name: 'Verification Approved',
      fn: () => notifyVerificationApproved(user.id)
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      await test.fn();
      console.log(`✅ ${test.name} notification sent successfully`);
      
      // Wait 2 seconds between tests to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
    }
  }

  console.log('Notification system test completed!');
};

// Test database notification functions
export const testDatabaseNotifications = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return;
  }

  console.log('Testing database notification functions...');

  try {
    // Test the notify_user function
    const { data, error } = await supabase.rpc('notify_user', {
      target_user_id: user.id,
      notification_title: 'Database Test Notification 🧪',
      notification_message: 'This is a test notification sent directly from the database function. It should trigger both email and push notifications based on your preferences.',
      notification_type: 'info',
      send_push: true,
      send_email: true
    });

    if (error) {
      console.error('Database notification test failed:', error);
    } else {
      console.log('✅ Database notification sent successfully:', data);
    }
  } catch (error) {
    console.error('❌ Database notification test failed:', error);
  }
};

// Test notification preferences
export const testNotificationPreferences = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return;
  }

  console.log('Testing notification preferences...');

  try {
    // Get current preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      throw prefsError;
    }

    console.log('Current notification preferences:', prefs);

    // If no preferences exist, create default ones
    if (!prefs) {
      const { data: newPrefs, error: createError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          email_notifications: true,
          push_notifications: true,
          order_updates: true,
          message_notifications: true,
          payment_notifications: true,
          marketing_emails: false,
          seller_notifications: true
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      console.log('✅ Created default notification preferences:', newPrefs);
    } else {
      console.log('✅ Notification preferences loaded successfully');
    }
  } catch (error) {
    console.error('❌ Notification preferences test failed:', error);
  }
};

// Run all tests
export const runAllNotificationTests = async () => {
  console.log('🚀 Starting comprehensive notification system tests...');
  
  await testNotificationPreferences();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testDatabaseNotifications();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testNotificationSystem();
  
  console.log('🎉 All notification tests completed!');
};

// Make functions available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testNotifications = {
    testNotificationSystem,
    testDatabaseNotifications,
    testNotificationPreferences,
    runAllNotificationTests
  };
}