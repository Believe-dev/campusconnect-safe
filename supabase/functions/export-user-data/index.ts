import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Collect user data from all tables
    const userData: any = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: null,
      products: [],
      orders: [],
      messages: [],
      notifications: [],
      security_logs: [],
      privacy_settings: null,
      two_factor_auth: null
    }

    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    userData.profile = profile

    // Get products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
    userData.products = products || []

    // Get orders (as buyer and seller)
    const { data: buyerOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', user.id)
    
    const { data: sellerOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', user.id)
    
    userData.orders = [...(buyerOrders || []), ...(sellerOrders || [])]

    // Get messages
    const { data: sentMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', user.id)
    
    const { data: receivedMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', user.id)
    
    userData.messages = [...(sentMessages || []), ...(receivedMessages || [])]

    // Get notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
    userData.notifications = notifications || []

    // Get security logs
    const { data: securityLogs } = await supabase
      .from('security_logs')
      .select('*')
      .eq('user_id', user.id)
    userData.security_logs = securityLogs || []

    // Get privacy settings
    const { data: privacySettings } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()
    userData.privacy_settings = privacySettings

    // Get 2FA settings (without secret)
    const { data: twoFactorAuth } = await supabase
      .from('user_2fa')
      .select('enabled, created_at, updated_at')
      .eq('user_id', user.id)
      .single()
    userData.two_factor_auth = twoFactorAuth

    return new Response(
      JSON.stringify(userData, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="unimarket-data-${user.id}.json"`
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})