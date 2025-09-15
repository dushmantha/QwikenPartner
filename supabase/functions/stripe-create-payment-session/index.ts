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
    // Check if this is a development/test environment by looking for debug headers or test data
    const isTestMode = req.headers.get('x-test-mode') === 'true' || 
                      req.headers.get('user-agent')?.includes('development') ||
                      false; // Default to production for release builds
    
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

    // Parse request body
    const { planType, planId, price, currency, interval } = await req.json()

    // Get or create Stripe customer
    let customer
    const { data: userData } = await supabaseClient
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (userData?.stripe_customer_id) {
      // Get existing customer
      customer = await stripe.customers.retrieve(userData.stripe_customer_id)
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: userData?.email || user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      // Save customer ID to database
      await supabaseClient
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id)
    }

    // Create or get existing product and price
    let priceId
    
    // First, try to find existing product
    const productName = `Qwiken ${planType === 'monthly' ? 'Monthly' : 'Yearly'} Pro`
    const products = await stripe.products.list({
      limit: 10,
    })
    
    let product = products.data.find(p => p.name === productName)
    
    if (!product) {
      // Create new product
      product = await stripe.products.create({
        name: productName,
        description: `Professional plan for Qwiken - billed ${interval}ly`,
        metadata: {
          plan_type: planType,
        },
      })
      console.log('Created new product:', product.id)
    }
    
    // Now create or find price for the product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    })
    
    const existingPrice = existingPrices.data.find(p => {
      return p.unit_amount === Math.round(price * 100) && 
             p.currency === currency && 
             p.recurring?.interval === interval
    })
    
    if (existingPrice) {
      priceId = existingPrice.id
      console.log('Using existing price:', priceId)
    } else {
      // Create new price
      const stripePrice = await stripe.prices.create({
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: currency,
        recurring: { interval: interval },
        product: product.id,
        metadata: {
          plan_type: planType,
        },
      })
      priceId = stripePrice.id
      console.log('Created new price:', priceId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `https://buzybees-success.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://buzybees-success.com/payment-cancelled`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
      },
    })

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        customerId: customer.id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating payment session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})