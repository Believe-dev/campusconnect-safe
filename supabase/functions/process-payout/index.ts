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
    const { payout_id, admin_id } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get payout request details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('payout_requests')
      .select(`
        *,
        profiles!inner(full_name, email)
      `)
      .eq('id', payout_id)
      .eq('status', 'pending')
      .single()

    if (payoutError || !payout) {
      throw new Error('Payout request not found')
    }

    // Check wallet balance
    const { data: wallet } = await supabaseClient
      .from('wallets')
      .select('available_balance')
      .eq('id', payout.wallet_id)
      .single()

    if (!wallet || wallet.available_balance < payout.amount) {
      throw new Error('Insufficient balance')
    }

    // Create transfer recipient on Paystack
    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: payout.bank_account_name,
        account_number: payout.bank_account_number,
        bank_code: getBankCode(payout.bank_name),
        currency: 'NGN'
      })
    })

    const recipientData = await recipientResponse.json()
    if (!recipientData.status) {
      throw new Error(`Failed to create recipient: ${recipientData.message}`)
    }

    // Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(payout.amount * 100), // Convert to kobo
        recipient: recipientData.data.recipient_code,
        reason: `Payout for CampusConnect user ${payout.profiles.full_name}`
      })
    })

    const transferData = await transferResponse.json()
    if (!transferData.status) {
      throw new Error(`Transfer failed: ${transferData.message}`)
    }

    // Update database
    await supabaseClient.from('payout_requests').update({
      status: 'completed',
      processed_by: admin_id,
      processed_at: new Date().toISOString(),
      admin_notes: `Transfer initiated: ${transferData.data.transfer_code}`
    }).eq('id', payout_id)

    await supabaseClient.from('wallets').update({
      available_balance: wallet.available_balance - payout.amount
    }).eq('id', payout.wallet_id)

    // Create transaction record
    await supabaseClient.from('wallet_transactions').insert({
      wallet_id: payout.wallet_id,
      user_id: payout.user_id,
      type: 'payout',
      amount: -payout.amount,
      description: `Payout to ${payout.bank_account_name} (${payout.bank_name})`,
      reference_id: transferData.data.transfer_code,
      reference_type: 'paystack_transfer',
      status: 'completed'
    })

    return new Response(
      JSON.stringify({ success: true, transfer_code: transferData.data.transfer_code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function getBankCode(bankName: string): string {
  const bankCodes: Record<string, string> = {
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
  
  return bankCodes[bankName] || '011'
}