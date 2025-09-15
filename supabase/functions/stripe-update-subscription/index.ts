import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-test-mode',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { newPlanType } = await req.json()
    
    if (!newPlanType || (newPlanType !== 'monthly' && newPlanType !== 'yearly')) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

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
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`🔄 Updating subscription for user: ${user.id} to ${newPlanType} plan`)

    // Get user's current subscription from our database
    const { data: userRecord, error: userFetchError } = await supabaseClient
      .from('users')
      .select('stripe_customer_id, subscription_id, subscription_status, subscription_type')
      .eq('id', user.id)
      .single()

    if (userFetchError || !userRecord) {
      console.error('❌ Error fetching user:', userFetchError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!userRecord.subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Don't allow downgrade from yearly to monthly
    if (userRecord.subscription_type === 'yearly' && newPlanType === 'monthly') {
      return new Response(
        JSON.stringify({ error: 'Cannot downgrade from yearly to monthly plan. Please cancel and resubscribe.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If already on the same plan, return error
    if (userRecord.subscription_type === newPlanType) {
      return new Response(
        JSON.stringify({ error: 'Already on this plan' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`📋 Upgrading from ${userRecord.subscription_type} to ${newPlanType}`)

    // Get the current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(userRecord.subscription_id)

    // Find the correct price ID based on the plan type
    const priceId = newPlanType === 'monthly' 
      ? 'price_monthly' // You'll need to replace with actual Stripe price IDs
      : 'price_yearly'

    // Create products and prices if they don't exist
    let yearlyPrice
    if (newPlanType === 'yearly') {
      // Check if yearly product exists
      const yearlyProducts = await stripe.products.search({
        query: 'metadata[\'plan_type\']:\'yearly\'',
      })

      let yearlyProduct
      if (yearlyProducts.data.length === 0) {
        // Create yearly product
        yearlyProduct = await stripe.products.create({
          name: 'Qwiken Pro - Yearly',
          description: 'Yearly subscription with all premium features',
          metadata: {
            plan_type: 'yearly',
          },
        })
      } else {
        yearlyProduct = yearlyProducts.data[0]
      }

      // Create yearly price
      yearlyPrice = await stripe.prices.create({
        product: yearlyProduct.id,
        unit_amount: 9999, // $99.99
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
      })
    }

    // Update the subscription to the new plan
    const updatedSubscription = await stripe.subscriptions.update(
      userRecord.subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: yearlyPrice.id,
        }],
        proration_behavior: 'create_prorations', // This will credit unused time from monthly plan
      }
    )

    console.log(`✅ Subscription updated successfully: ${updatedSubscription.id}`)
    console.log(`📅 New period: ${new Date(updatedSubscription.current_period_start * 1000).toISOString()} to ${new Date(updatedSubscription.current_period_end * 1000).toISOString()}`)

    // Update our database to reflect the plan change
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        subscription_type: newPlanType,
        subscription_status: 'active',
        subscription_end_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        subscription_start_date: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating user subscription plan:', updateError)
      // Don't fail the request since Stripe was updated successfully
    }

    // Create a record in subscription_history
    const { error: historyError } = await supabaseClient
      .from('subscription_history')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        action: 'upgraded',
        status: 'active',
        metadata: {
          from_plan: userRecord.subscription_type,
          to_plan: newPlanType,
          proration_amount: updatedSubscription.latest_invoice,
        },
      })

    if (historyError) {
      console.error('❌ Error creating subscription history:', historyError)
      // Don't fail the request since main operation was successful
    }

    console.log(`🎯 Subscription upgrade completed for user: ${user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully upgraded to ${newPlanType} plan`,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          current_period_end: updatedSubscription.current_period_end,
          current_period_start: updatedSubscription.current_period_start,
          plan_type: newPlanType,
          subscription_end_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          subscription_start_date: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Stripe update subscription error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update subscription',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})