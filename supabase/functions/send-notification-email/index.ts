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
    const { email, name, type } = await req.json()

    let subject = ''
    let html = ''

    if (type === 'approved') {
      subject = 'Seller Account Approved - CampusConnect'
      html = `
        <h2>Congratulations! Your Seller Account is Approved 🎉</h2>
        <p>Hello ${name},</p>
        <p>Great news! Your seller verification has been approved by our admin team.</p>
        <p><strong>What you can do now:</strong></p>
        <ul>
          <li>List unlimited products on CampusConnect</li>
          <li>Access your seller dashboard</li>
          <li>Start earning money from sales</li>
          <li>Manage your wallet and payouts</li>
        </ul>
        <p>Start selling today by visiting your dashboard!</p>
        <p>Best regards,<br>CampusConnect Team</p>
      `
    } else if (type === 'rejected') {
      subject = 'Seller Application Update - CampusConnect'
      html = `
        <h2>Seller Application Update</h2>
        <p>Hello ${name},</p>
        <p>Thank you for your interest in becoming a seller on CampusConnect.</p>
        <p>After reviewing your application, we were unable to approve your seller account at this time. Your account has been converted to buyer-only.</p>
        <p><strong>You can still:</strong></p>
        <ul>
          <li>Browse and purchase items from other sellers</li>
          <li>Use all buyer features on the platform</li>
          <li>Contact support if you have questions</li>
        </ul>
        <p>If you believe this was an error, please contact our support team.</p>
        <p>Best regards,<br>CampusConnect Team</p>
      `
    } else if (type === 'verified') {
      subject = 'Account Verified - CampusConnect'
      html = `
        <h2>Account Verified Successfully ✅</h2>
        <p>Hello ${name},</p>
        <p>Your CampusConnect account has been verified!</p>
        <p>You now have a verified badge on your profile, which helps build trust with other users.</p>
        <p>Thank you for being part of our community!</p>
        <p>Best regards,<br>CampusConnect Team</p>
      `
    }

    // Use Resend API to send email
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not found')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'CampusConnect <noreply@campusconnect.com>',
        to: [email],
        subject: subject,
        html: html,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error sending notification email:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})