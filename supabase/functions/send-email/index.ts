import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    console.log('📧 Edge Function received payload:', {
      hasTo: !!requestBody.to,
      hasSubject: !!requestBody.subject,
      hasHtml: !!requestBody.html,
      hasText: !!requestBody.text,
      type: requestBody.type,
      keys: Object.keys(requestBody)
    })
    
    // Validate required fields for appointment emails
    if (!requestBody.to || !requestBody.subject || !requestBody.html) {
      const missingFields = []
      if (!requestBody.to) missingFields.push('to')
      if (!requestBody.subject) missingFields.push('subject')
      if (!requestBody.html) missingFields.push('html')
      
      throw new Error(`Missing required fields: ${missingFields.join(', ')}. Received: ${Object.keys(requestBody).join(', ')}`)
    }
    
    return await handleAppointmentEmail(requestBody)

  } catch (error) {
    console.error('❌ Email function error:', error.message)
    
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

// Handle appointment email (for both customer and business owner notifications)
async function handleAppointmentEmail(requestBody: any) {
  const { to, subject, html, text, type } = requestBody

  console.log(`📧 Sending appointment ${type || 'notification'} email to:`, to)

  // Get Resend API key from environment
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  console.log('🔍 Debug - RESEND_API_KEY value:', RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 10)}...` : 'null/undefined')
  console.log('🔍 Debug - RESEND_API_KEY length:', RESEND_API_KEY?.length || 0)
  console.log('🔍 Debug - RESEND_API_KEY type:', typeof RESEND_API_KEY)
  
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
    console.error('❌ RESEND_API_KEY not configured or empty in environment variables')
    console.log('ℹ️ Available environment variables:', Object.keys(Deno.env.toObject()))
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'RESEND_API_KEY not configured or empty in environment variables',
        message: 'Email service not configured - please set RESEND_API_KEY in Supabase secrets',
        availableEnvVars: Object.keys(Deno.env.toObject()),
        keyValue: RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 10)}...` : 'null/undefined',
        keyLength: RESEND_API_KEY?.length || 0
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }

  // Determine the sender based on email type - using verified Resend emails
  const fromAddress = type === 'contact_form'
    ? 'Qwiken Partner Support <support@qwiken.org>'
    : type === 'business_notification' 
    ? 'Qwiken Partner Business <admin@qwiken.org>'
    : 'Qwiken Partner <noreply@qwiken.org>'

  // Prepare email data for Resend
  const emailData = {
    from: fromAddress,
    to: [to],
    subject: subject,
    html: html,
    text: text || subject.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
  }

  console.log('📧 Sending via Resend API...')

  try {
    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Resend API error:', errorText)
      throw new Error(`Resend API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Email sent successfully via Resend:', result.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: 'Appointment email sent successfully',
        to: to,
        subject: subject
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('❌ Appointment email error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to send appointment email'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
}