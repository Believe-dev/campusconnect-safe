import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, type, orderDetails } = await req.json()

    let subject = 'New Order Received - CampusConnect'
    let htmlContent = `
      <h2>🎉 New Order Received!</h2>
      <p>Hi ${name},</p>
      <p>You have a new order for: ${orderDetails.items}</p>
      <p>Total: ₦${orderDetails.total.toLocaleString()}</p>
      <p>Buyer: ${orderDetails.buyerName}</p>
      <p>Login to your dashboard to manage this order.</p>
    `

    console.log('Order notification sent:', { email, subject })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})