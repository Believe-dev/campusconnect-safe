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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Verify the caller's own JWT rather than trusting a client-supplied
    // admin_id - previously this endpoint took whatever admin_id was in the
    // request body at face value, so any authenticated user could pass a
    // real admin's id and have a withdrawal created and "completed" in that
    // admin's name with attacker-controlled bank details.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: userData, error: authError } = await authClient.auth.getUser()
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const adminId = userData.user.id

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { amount, bank_name, account_number, account_name } = await req.json()

    // Validate input
    if (!amount || !bank_name || !account_number || !account_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status of the verified caller, not a client-supplied id
    const { data: adminCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId)
      .eq('role', 'admin')
      .single()

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create withdrawal request in database
    const { data: withdrawalData, error: withdrawalError } = await supabaseClient
      .rpc('process_admin_withdrawal', {
        p_admin_id: adminId,
        p_amount: amount,
        p_bank_name: bank_name,
        p_account_number: account_number,
        p_account_name: account_name
      })

    if (withdrawalError) {
      console.error('Withdrawal creation error:', withdrawalError)
      return new Response(
        JSON.stringify({ error: withdrawalError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const withdrawalId = withdrawalData

    // Update withdrawal status to processing
    await supabaseClient
      .from('admin_withdrawals')
      .update({ status: 'processing' })
      .eq('id', withdrawalId)

    // Generate Anchor BaaS transfer reference
    const transferCode = `ADMIN_ANCHOR_${Date.now()}_${withdrawalId.toString().slice(0, 8)}`
    const reference = `ADM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Complete withdrawal with manual transfer details
    await supabaseClient.rpc('complete_admin_withdrawal', {
      p_withdrawal_id: withdrawalId,
      p_transfer_code: transferCode,
      p_transfer_reference: reference
    })

    // Update withdrawal with manual transfer notes
    await supabaseClient
      .from('admin_withdrawals')
      .update({ 
        status: 'completed',
        notes: `Manual transfer required: ₦${amount.toLocaleString()} to ${account_name} (${bank_name}) - Account: ${account_number}. Reference: ${transferCode}`
      })
      .eq('id', withdrawalId)

    return new Response(
      JSON.stringify({
        success: true,
        transfer_code: transferCode,
        reference: reference,
        message: `Manual transfer approved: ₦${amount.toLocaleString()} to ${account_name} (${bank_name}) - Account: ${account_number}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin payout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to get bank codes
function getBankCode(bankName: string): string {
  const bankCodes: { [key: string]: string } = {
    'Access Bank': '044',
    'Citibank Nigeria': '023',
    'Diamond Bank': '063',
    'Ecobank Nigeria': '050',
    'Fidelity Bank': '070',
    'First Bank of Nigeria': '011',
    'First City Monument Bank': '214',
    'Guaranty Trust Bank': '058',
    'Heritage Bank': '030',
    'Keystone Bank': '082',
    'Polaris Bank': '076',
    'Providus Bank': '101',
    'Stanbic IBTC Bank': '221',
    'Standard Chartered Bank': '068',
    'Sterling Bank': '232',
    'Union Bank of Nigeria': '032',
    'United Bank For Africa': '033',
    'Unity Bank': '215',
    'Wema Bank': '035',
    'Zenith Bank': '057'
  }
  
  return bankCodes[bankName] || '044'
}