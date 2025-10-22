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
      throw new Error('Missing required Supabase environment variables')
    }

    console.log('Processing payout request:', payoutId)
    console.log('Paystack key configured:', paystackKey ? `Yes (${paystackKey.substring(0, 10)}...)` : 'No')
    console.log('Environment check - PAYSTACK_SECRET_KEY exists:', !!paystackKey)

    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Get payout request details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('payout_requests')
      .select('*')
      .eq('id', payoutId)
      .eq('status', 'pending')
      .single()

    if (payoutError || !payout) {
      console.error('Payout fetch error:', payoutError)
      throw new Error('Payout request not found or not pending')
    }

    console.log('Found payout request:', {
      id: payout.id,
      amount: payout.amount,
      bank_name: payout.bank_name,
      account_number: payout.bank_account_number
    })

    // Check wallet exists and has sufficient balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('available_balance')
      .eq('id', payout.wallet_id)
      .single()

    if (walletError || !wallet) {
      console.error('Wallet fetch error:', walletError)
      throw new Error('Wallet not found')
    }

    if (wallet.available_balance < payout.amount) {
      throw new Error(`Insufficient balance: ${wallet.available_balance} < ${payout.amount}`)
    }

    console.log('Wallet balance check passed:', wallet.available_balance)

    // Process transfer
    let transferCode: string
    let isRealTransfer = false
    
    // Ensure we only use live Paystack keys - no test/simulation modes
    const isValidLivePaystackKey = paystackKey && 
      paystackKey !== 'your_paystack_secret_key_here' && 
      paystackKey !== 'sk_live_your_live_secret_key' &&
      paystackKey !== 'sk_test_your_test_secret_key' &&
      paystackKey.startsWith('sk_live_') // Only accept live keys
    
    // Generate manual transfer code instead of using Paystack
    transferCode = `MANUAL_${Date.now()}_${payoutId.slice(0, 8)}`
    isRealTransfer = false // This is now a manual transfer
    console.log('Manual transfer code generated:', transferCode)

    // Update database regardless of real or simulated transfer
    console.log('Updating database records...')
    
    // Update payout status
    const { error: payoutUpdateError } = await supabaseClient
      .from('payout_requests')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        admin_notes: `Manual transfer approved. Please transfer ₦${payout.amount} to ${payout.bank_account_name} (${payout.bank_name}) - Account: ${payout.bank_account_number}. Reference: ${transferCode}`,
        transfer_code: transferCode,
        transfer_status: 'manual_pending'
      })
      .eq('id', payoutId)

    if (payoutUpdateError) {
      console.error('Payout update error:', payoutUpdateError)
      throw new Error('Failed to update payout status')
    }

    // Deduct from wallet
    const { error: walletUpdateError } = await supabaseClient
      .from('wallets')
      .update({
        available_balance: wallet.available_balance - payout.amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', payout.wallet_id)

    if (walletUpdateError) {
      console.error('Wallet update error:', walletUpdateError)
      throw new Error('Failed to update wallet balance')
    }

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        wallet_id: payout.wallet_id,
        user_id: payout.user_id,
        type: 'payout',
        amount: -payout.amount, // Negative for debit
        description: `Payout to ${payout.bank_account_name} (${payout.bank_name}) - ${payout.bank_account_number}`,
        reference_id: transferCode,
        reference_type: 'manual_transfer',
        status: 'completed'
      })

    if (transactionError) {
      console.error('Transaction record error:', transactionError)
      // Don't throw here as the main operation succeeded
    }

    // Create notification for user
    const notificationTitle = 'Payout Processed! 💰'
    const notificationMessage = `Your payout request of ₦${payout.amount.toLocaleString()} has been approved. The funds have been deducted from your wallet and will be manually transferred to your bank account (${payout.bank_name}) within 1-2 business days.`
    
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: payout.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'success'
      })

    if (notificationError) {
      console.error('Notification error:', notificationError)
      // Don't throw here as the main operation succeeded
    }

    // Send push notification
    try {
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          user_id: payout.user_id,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            type: 'payout',
            url: '/wallet',
            transfer_code: transferCode
          }
        }
      })
    } catch (pushError) {
      console.error('Push notification error:', pushError)
      // Don't throw here as the main operation succeeded
    }

    console.log('Payout processing completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        transfer_code: transferCode,
        is_real_transfer: false,
        message: 'Manual transfer approved - funds deducted from wallet'
      }),
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
            admin_notes: `Error: ${error.message}`,
            transfer_status: 'failed'
          }).eq('id', payoutId)
        }
      } catch (updateError) {
        console.error('Failed to update payout status:', updateError)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the Edge Function logs for more information'
      }),
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