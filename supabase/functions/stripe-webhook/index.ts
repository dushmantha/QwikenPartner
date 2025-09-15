import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-test-mode',
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

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get Supabase client (using service role key for webhook)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body and signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    let event
    
    if (webhookSecret && signature) {
      // Verify webhook signature
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body)
    }

    console.log('Received webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabaseClient)
        break
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabaseClient)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabaseClient)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, supabaseClient)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabaseClient)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleCheckoutCompleted(session: any, supabaseClient: any) {
  try {
    console.log('Processing checkout completed:', session.id)
    
    if (session.subscription && session.metadata?.supabase_user_id) {
      const userId = session.metadata.supabase_user_id
      const planType = session.metadata.plan_type
      
      // Get subscription details from Stripe - reuse the same key logic
      const isTestMode = false // Webhooks should use the same key as the main function
      const stripeKey = isTestMode 
        ? Deno.env.get('STRIPE_SECRET_KEY_TEST') || Deno.env.get('STRIPE_SECRET_KEY')
        : Deno.env.get('STRIPE_SECRET_KEY_LIVE') || Deno.env.get('STRIPE_SECRET_KEY')
      
      const stripe = new Stripe(stripeKey!, {
        apiVersion: '2022-11-15',
        httpClient: Stripe.createFetchHttpClient(),
      })
      
      const subscription = await stripe.subscriptions.retrieve(session.subscription)
      
      // Create payment record
      await supabaseClient.rpc('create_payment_record', {
        p_user_id: userId,
        p_stripe_session_id: session.id,
        p_subscription_id: session.subscription,
        p_amount: session.amount_total,
        p_currency: session.currency,
        p_status: 'succeeded',
        p_plan_type: planType,
        p_metadata: {
          stripe_payment_intent: session.payment_intent,
          stripe_customer_id: session.customer,
          session_mode: session.mode
        }
      })
      
      // Update user subscription using the database function
      await supabaseClient.rpc('update_user_subscription_from_webhook', {
        p_user_id: userId,
        p_subscription_id: session.subscription,
        p_subscription_status: 'active',
        p_plan_type: planType,
        p_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })
      
      console.log(`User ${userId} upgraded to premium with subscription ${session.subscription}`)
      console.log(`Payment record created for session ${session.id}`)
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any, supabaseClient: any) {
  try {
    console.log('Processing subscription updated:', subscription.id)
    
    // Find user by subscription ID
    const { data: userData } = await supabaseClient
      .from('users')
      .select('id')
      .eq('subscription_id', subscription.id)
      .single()
    
    if (userData) {
      await supabaseClient
        .from('users')
        .update({
          subscription_status: subscription.status,
          subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          is_premium: subscription.status === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.id)
      
      console.log(`Subscription ${subscription.id} updated for user ${userData.id}`)
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any, supabaseClient: any) {
  try {
    console.log('Processing subscription deleted:', subscription.id)
    
    // Find user by subscription ID
    const { data: userData } = await supabaseClient
      .from('users')
      .select('id')
      .eq('subscription_id', subscription.id)
      .single()
    
    if (userData) {
      await supabaseClient
        .from('users')
        .update({
          is_premium: false,
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.id)
      
      console.log(`Subscription ${subscription.id} cancelled for user ${userData.id}`)
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handlePaymentSucceeded(invoice: any, supabaseClient: any) {
  try {
    console.log('Processing payment succeeded:', invoice.id)
    
    if (invoice.subscription) {
      // Find user by subscription ID
      const { data: userData } = await supabaseClient
        .from('users')
        .select('id')
        .eq('subscription_id', invoice.subscription)
        .single()
      
      if (userData) {
        await supabaseClient
          .from('users')
          .update({
            is_premium: true,
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id)
        
        console.log(`Payment succeeded for user ${userData.id}`)
      }
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(invoice: any, supabaseClient: any) {
  try {
    console.log('Processing payment failed:', invoice.id)
    
    if (invoice.subscription) {
      // Find user by subscription ID
      const { data: userData } = await supabaseClient
        .from('users')
        .select('id')
        .eq('subscription_id', invoice.subscription)
        .single()
      
      if (userData) {
        await supabaseClient
          .from('users')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id)
        
        console.log(`Payment failed for user ${userData.id}`)
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}