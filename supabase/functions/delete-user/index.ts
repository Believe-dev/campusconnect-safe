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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Delete user data
    await supabaseClient.from('notifications').delete().eq('user_id', user.id)
    await supabaseClient.from('reviews').delete().or(`reviewer_id.eq.${user.id},reviewed_id.eq.${user.id}`)
    await supabaseClient.from('messages').delete().eq('sender_id', user.id)
    await supabaseClient.from('conversations').delete().or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    await supabaseClient.from('orders').delete().or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    await supabaseClient.from('products').delete().eq('seller_id', user.id)
    await supabaseClient.from('profiles').delete().eq('user_id', user.id)

    // Delete auth user
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})