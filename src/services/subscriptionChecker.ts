import { supabase } from '@/integrations/supabase/client';

export const checkExpiringSubscriptions = async () => {
  try {
    // Get subscriptions expiring in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data: expiringProfiles } = await supabase
      .from('profiles')
      .select('user_id, seller_subscription_expires_at')
      .not('seller_subscription_expires_at', 'is', null)
      .gte('seller_subscription_expires_at', new Date().toISOString())
      .lte('seller_subscription_expires_at', sevenDaysFromNow.toISOString())
      .in('account_type', ['seller', 'both']);

    // Send notifications for expiring subscriptions
    if (expiringProfiles && expiringProfiles.length > 0) {
      const notifications = expiringProfiles.map(profile => ({
        user_id: profile.user_id,
        type: 'subscription_warning',
        title: 'Subscription Expiring Soon',
        message: 'Your seller subscription expires in 7 days. Renew now to avoid service interruption.',
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    }

    // Get expired subscriptions
    const { data: expiredProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .not('seller_subscription_expires_at', 'is', null)
      .lt('seller_subscription_expires_at', new Date().toISOString())
      .eq('seller_features_active', true)
      .in('account_type', ['seller', 'both']);

    if (expiredProfiles && expiredProfiles.length > 0) {
      // Disable features for expired subscriptions
      const userIds = expiredProfiles.map(p => p.user_id);
      
      await supabase
        .from('profiles')
        .update({ seller_features_active: false })
        .in('user_id', userIds);

      // Send expiry notifications
      const expiredNotifications = expiredProfiles.map(profile => ({
        user_id: profile.user_id,
        type: 'subscription_expired',
        title: 'Subscription Expired',
        message: 'Your seller subscription has expired. Renew now to reactivate your seller features.',
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('notifications')
        .insert(expiredNotifications);
    }

  } catch (error) {
    console.error('Error checking expiring subscriptions:', error);
  }
};