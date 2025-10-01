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

    const { amount, bank_name, account_number, account_name, admin_id } = await req.json()

    // Validate input
    if (!amount || !bank_name || !account_number || !account_name || !admin_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: adminCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', admin_id)
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
        p_admin_id: admin_id,
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

    // Process transfer via Paystack
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured')
    }

    // Create transfer recipient
    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: account_name,
        account_number: account_number,
        bank_code: getBankCode(bank_name),
        currency: 'NGN'
      })
    })

    const recipientData = await recipientResponse.json()
    
    if (!recipientData.status) {
      await supabaseClient.rpc('fail_admin_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_error_message: recipientData.message
      })
      
      return new Response(
        JSON.stringify({ error: `Failed to create recipient: ${recipientData.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100), // Convert to kobo
        recipient: recipientData.data.recipient_code,
        reason: `Admin commission withdrawal - ${new Date().toISOString()}`
      })
    })

    const transferData = await transferResponse.json()
    
    if (!transferData.status) {
      await supabaseClient.rpc('fail_admin_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_error_message: transferData.message
      })
      
      return new Response(
        JSON.stringify({ error: `Transfer failed: ${transferData.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Complete withdrawal
    await supabaseClient.rpc('complete_admin_withdrawal', {
      p_withdrawal_id: withdrawalId,
      p_transfer_code: transferData.data.transfer_code,
      p_paystack_reference: transferData.data.reference
    })

    return new Response(
      JSON.stringify({
        success: true,
        transfer_code: transferData.data.transfer_code,
        reference: transferData.data.reference,
        message: 'Withdrawal processed successfully'
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