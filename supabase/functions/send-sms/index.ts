import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customers, message, providerInfo } = await req.json()

    // Validate input
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      throw new Error('No customers provided')
    }

    if (!message) {
      throw new Error('Message is required')
    }

    console.log(`📱 Sending SMS to ${customers.length} customers`)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Using Twilio for SMS sending
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('SMS service not configured')
    }

    const results = []
    const errors = []

    // Create authorization header for Twilio
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

    // Send SMS to each customer
    for (const customer of customers) {
      try {
        console.log(`📱 Sending SMS to ${customer.phone}`)

        // Format the message with provider info
        const fullMessage = `${message}\n\n---\n${providerInfo?.name || 'Qwiken'}\n${providerInfo?.phone || ''}`

        const smsData = new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: customer.phone,
          Body: fullMessage
        })

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: smsData.toString(),
          }
        )

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`SMS API error: ${errorData}`)
        }

        const result = await response.json()
        results.push({
          customer: customer.phone,
          success: true,
          messageId: result.sid
        })

        console.log(`✅ SMS sent successfully to ${customer.phone}`)

        // Optional: Log the SMS send to database
        await supabaseClient.from('sms_logs').insert({
          recipient_phone: customer.phone,
          recipient_name: customer.name,
          message: message,
          status: 'sent',
          provider_id: providerInfo?.id,
          sent_at: new Date().toISOString()
        })

      } catch (error) {
        console.error(`❌ Failed to send SMS to ${customer.phone}:`, error.message)
        errors.push({
          customer: customer.phone,
          error: error.message
        })
      }
    }

    // Return results
    const response = {
      success: true,
      totalSent: results.length,
      totalFailed: errors.length,
      results: results,
      errors: errors,
      message: `Successfully sent ${results.length} SMS messages, ${errors.length} failed`
    }

    console.log('📱 SMS sending completed:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ SMS sending error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})