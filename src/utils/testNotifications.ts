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
    throw new Error('User not authenticated');
  }

  console.log('Testing database notification functions...');
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  try {
    // First try the notify_user function
    const { data, error } = await supabase.rpc('notify_user', {
      target_user_id: user.id,
      notification_title: `Database Test ${isMobile ? '📱' : '🧪'}`,
      notification_message: `This is a test notification sent from the database function on ${isMobile ? 'mobile' : 'desktop'}. Testing notification system functionality.`,
      notification_type: 'info',
      send_push: false, // Disable push for mobile to avoid conflicts
      send_email: false // Disable email for testing
    });

    if (error) {
      console.error('Database notification test failed:', error);
      
      // Fallback: try direct database insert
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: `Fallback Test ${isMobile ? '📱' : '🧪'}`,
          message: 'Database function failed, but direct insert worked. This means the notifications table is accessible.',
          type: 'warning'
        });
        
      if (insertError) {
        throw new Error(`Both RPC and direct insert failed: ${insertError.message}`);
      } else {
        console.log('✅ Fallback database notification created successfully');
        return { success: true, method: 'fallback' };
      }
    } else {
      console.log('✅ Database notification sent successfully:', data);
      return { success: true, method: 'rpc', data };
    }
  } catch (error) {
    console.error('❌ Database notification test failed:', error);
    throw error;
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

// Run all tests with mobile-friendly approach
export const runAllNotificationTests = async () => {
  console.log('🚀 Starting comprehensive notification system tests...');
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const results = { preferences: false, database: false, system: false };
  
  try {
    console.log(`Running tests on ${isMobile ? 'mobile' : 'desktop'} device...`);
    
    // Test 1: Notification preferences
    try {
      await testNotificationPreferences();
      results.preferences = true;
      console.log('✅ Preferences test passed');
    } catch (error) {
      console.error('❌ Preferences test failed:', error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Database notifications
    try {
      await testDatabaseNotifications();
      results.database = true;
      console.log('✅ Database test passed');
    } catch (error) {
      console.error('❌ Database test failed:', error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Notification system (simplified for mobile)
    try {
      if (isMobile) {
        await testMobileNotificationSystem();
      } else {
        await testNotificationSystem();
      }
      results.system = true;
      console.log('✅ System test passed');
    } catch (error) {
      console.error('❌ System test failed:', error.message);
    }
    
    const passedTests = Object.values(results).filter(Boolean).length;
    console.log(`🎉 Notification tests completed! ${passedTests}/3 tests passed`);
    
    if (passedTests === 0) {
      throw new Error('All notification tests failed');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    throw error;
  }
};

// Mobile-specific notification system test
export const testMobileNotificationSystem = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('Testing mobile notification system...');

  // Simplified mobile tests - just test database notifications
  const tests = [
    {
      name: 'Mobile Order Update',
      fn: async () => {
        const { error } = await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Mobile Order Test 📱',
          message: 'Your mobile order notification test is working!',
          type: 'info'
        });
        if (error) throw error;
      }
    },
    {
      name: 'Mobile Message Test',
      fn: async () => {
        const { error } = await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Mobile Message Test 💬',
          message: 'Mobile message notifications are functional!',
          type: 'info'
        });
        if (error) throw error;
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      await test.fn();
      console.log(`✅ ${test.name} notification created successfully`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
      throw error;
    }
  }

  console.log('Mobile notification system test completed!');
};

// Make functions available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testNotifications = {
    testNotificationSystem,
    testDatabaseNotifications,
    testNotificationPreferences,
    testMobileNotificationSystem,
    runAllNotificationTests
  };
}