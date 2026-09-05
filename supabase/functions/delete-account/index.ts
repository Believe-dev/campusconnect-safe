// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This used to hard-delete a user's orders/escrow_transactions/payout_requests
// (among other tables) and then auth.users - the same risk (destroying
// another party's legitimate transaction/dispute record) the admin
// dashboard's Delete Account action was rebuilt to avoid, except this path
// is user-triggered and was never actually wired up to the frontend (nothing
// in src/ ever called it - Profile.tsx's delete flow calls the
// delete_user_completely() RPC directly instead).
//
// Now scoped to just the one thing that genuinely needs service-role/Auth
// Admin API access: scrubbing the caller's own real email/password so it can
// never be used to log back in as this identity again. This is called from
// Profile.tsx right AFTER delete_user_completely() has already anonymized
// the profile, banned the account, and deactivated their listings - an
// UPDATE via the Admin API, not a DELETE, so there's no
// auth.users -> profiles.user_id -> orders.buyer_id/seller_id cascade risk.
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Authenticated-as-the-caller client, so we only ever act on whoever
    // actually holds this token - never a service-role client trusting a
    // client-supplied user id.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();

    const { error: scrubError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: `deleted-${user.id}@deleted.unimarket.com.ng`,
      password: randomPassword,
      email_confirm: true,
    });
    if (scrubError) throw scrubError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
