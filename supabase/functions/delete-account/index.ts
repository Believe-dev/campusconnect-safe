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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) throw new Error('Unauthorized')

    const userId = user.id

    // Delete all user data
    await supabaseAdmin.from('wallet_transactions').delete().eq('user_id', userId)
    await supabaseAdmin.from('disputes').delete().eq('reported_by', userId)
    await supabaseAdmin.from('payout_requests').delete().eq('user_id', userId)
    await supabaseAdmin.from('escrow_transactions').delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    await supabaseAdmin.from('wallets').delete().eq('user_id', userId)
    await supabaseAdmin.from('reviews').delete().or(`reviewer_id.eq.${userId},reviewed_id.eq.${userId}`)
    await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
    await supabaseAdmin.from('conversations').delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    await supabaseAdmin.from('orders').delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    await supabaseAdmin.from('products').delete().eq('seller_id', userId)
    await supabaseAdmin.from('favorites').delete().eq('user_id', userId)
    await supabaseAdmin.from('cart').delete().eq('user_id', userId)
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId)

    // Delete auth user completely
    await supabaseAdmin.auth.admin.deleteUser(userId)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})