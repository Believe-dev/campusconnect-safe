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

  let requestBody: any = {}
  let payoutId: string | null = null

  try {
    // Parse request body once
    requestBody = await req.json()
    payoutId = requestBody.payout_id

    if (!payoutId) {
      throw new Error('payout_id is required')
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Get payout request details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('payout_requests')
      .select('*')
      .eq('id', payoutId)
      .eq('status', 'pending')
      .single()

    if (payoutError || !payout) {
      throw new Error('Payout request not found or not pending')
    }

    // Check wallet exists and has sufficient balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('available_balance')
      .eq('id', payout.wallet_id)
      .single()

    if (walletError || !wallet) {
      throw new Error('Wallet not found')
    }

    if (wallet.available_balance < payout.amount) {
      throw new Error(`Insufficient balance: ${wallet.available_balance} < ${payout.amount}`)
    }

    // Process transfer - ONLY deduct wallet if real transfer succeeds
    let transferCode: string
    let isRealTransfer = false
    
    if (paystackKey && paystackKey !== 'your_paystack_secret_key_here') {
      // Create transfer recipient
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackKey}`,
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
          'Authorization': `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(payout.amount * 100),
          recipient: recipientData.data.recipient_code,
          reason: `Payout for CampusConnect user`
        })
      })

      const transferData = await transferResponse.json()
      if (!transferData.status) {
        throw new Error(`Transfer failed: ${transferData.message}`)
      }

      transferCode = transferData.data.transfer_code
      isRealTransfer = true
      console.log('Real Paystack transfer successful:', transferCode)
    } else {
      throw new Error('Paystack not configured - cannot process real transfers')
    }

    // Only proceed with wallet deduction if real transfer succeeded
    if (isRealTransfer) {
      // Update payout status
      await supabaseClient.from('payout_requests').update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        admin_notes: `Real transfer completed: ${transferCode}`
      }).eq('id', payoutId)

      // Deduct from wallet
      await supabaseClient.from('wallets').update({
        available_balance: wallet.available_balance - payout.amount
      }).eq('id', payout.wallet_id)

      // Create transaction record
      await supabaseClient.from('wallet_transactions').insert({
        wallet_id: payout.wallet_id,
        user_id: payout.user_id,
        type: 'payout',
        amount: payout.amount,
        description: `Payout to ${payout.bank_account_name} (${payout.bank_name})`,
        reference_id: transferCode,
        reference_type: 'paystack_transfer',
        status: 'completed'
      })
    }

    return new Response(
      JSON.stringify({ success: true, transfer_code: transferCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Payout processing error:', error)
    
    // Update payout status to failed if we have the ID
    if (payoutId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (supabaseUrl && supabaseKey) {
          const supabaseClient = createClient(supabaseUrl, supabaseKey)
          await supabaseClient.from('payout_requests').update({
            status: 'failed',
            admin_notes: `Error: ${error.message}`
          }).eq('id', payoutId)
        }
      } catch (updateError) {
        console.error('Failed to update payout status:', updateError)
      }
    }
    
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
    'Zenith Bank': '057',
    'Kuda Bank': '50211',
    'Opay': '999992',
    'PalmPay': '999991',
    'Moniepoint': '50515',
    'Carbon': '565',
    'Rubies Bank': '125',
    'VFD Microfinance Bank': '566',
    'Jaiz Bank': '301',
    'TAJ Bank': '302',
    'Lotus Bank': '303'
  }
  
  const code = bankCodes[bankName]
  if (!code) {
    throw new Error(`Unsupported bank: ${bankName}. Please contact support.`)
  }
  return code
}