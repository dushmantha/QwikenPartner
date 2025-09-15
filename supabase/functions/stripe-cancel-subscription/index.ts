import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-test-mode',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Stripe secret key based on environment
    const isTestMode = req.headers.get('x-test-mode') === 'true' || false;
    
    const stripeKey = isTestMode 
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST') || Deno.env.get('STRIPE_SECRET_KEY')
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not found')
    }
    
    console.log('Using Stripe key for:', isTestMode ? 'TEST/SANDBOX' : 'PRODUCTION')

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's subscription info from database
    console.log('📊 Getting user subscription info for user ID:', user.id)
    
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('subscription_id, subscription_status, subscription_type, is_premium')
      .eq('id', user.id)
      .single()

    console.log('📊 User data result:', userData)
    console.log('📊 User data error:', userDataError)

    if (userDataError) {
      console.error('❌ Error fetching user data:', userDataError)
      return new Response(
        JSON.stringify({ error: 'Error fetching user data: ' + userDataError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!userData?.subscription_id) {
      console.log('❌ No subscription_id found for user. User data:', userData)
      return new Response(
        JSON.stringify({ 
          error: 'No active subscription found',
          details: 'User does not have a subscription_id in the database',
          userData: userData
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Found subscription ID:', userData.subscription_id)

    // Cancel subscription at period end
    console.log('🔄 Cancelling Stripe subscription at period end...')
    const subscription = await stripe.subscriptions.update(userData.subscription_id, {
      cancel_at_period_end: true,
    })

    console.log('✅ Stripe subscription updated:', {
      id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    })

    // Update database - use 'cancelled' status (valid in check constraint)
    console.log('📊 Updating database with status: cancelled')
    console.log('📊 Updating user ID:', user.id)
    console.log('📊 Subscription cancel_at_period_end:', subscription.cancel_at_period_end)
    
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('users')
      .update({ 
        subscription_status: 'cancelled', // Use 'cancelled' which is valid in check constraint
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()

    if (updateError) {
      console.error('❌ Database update failed:', updateError)
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    console.log('✅ Database updated successfully:', updateResult)

    return new Response(
      JSON.stringify({
        success: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        periodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error canceling subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})