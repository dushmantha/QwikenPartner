// Supabase Edge Function for sending emails via Resend
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text: string
  from_email?: string
  from_name?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text, from_email, from_name } = await req.json() as EmailRequest

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Construct from address
    const fromAddress = from_name 
      ? `${from_name} <${from_email || 'onboarding@resend.dev'}>`
      : from_email || 'onboarding@resend.dev'

    console.log('=ç Sending email via Resend:')
    console.log('   From:', fromAddress)
    console.log('   To:', to)
    console.log('   Subject:', subject)

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text fallback
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('L Resend API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: errorText,
          status: resendResponse.status
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await resendResponse.json()
    console.log(' Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: result.id,
        message: 'Email sent successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('L Edge Function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})