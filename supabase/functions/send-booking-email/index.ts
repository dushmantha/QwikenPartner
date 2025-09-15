import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text, from_email, from_name } = await req.json();

    // Validate input
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    console.log('📧 Sending booking email to:', to);

    // Get Resend API key
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured, returning mock success');
      
      // Return mock success for development
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: 'dev-' + Date.now(),
          message: 'Email sent (development mode)',
          to: to,
          subject: subject
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Prepare email data for Resend - using verified Resend emails
    const emailData = {
      from: from_email && from_name ? `${from_name} <${from_email}>` : 'Qwiken <noreply@qwiken.org>',
      to: [to],
      subject: subject,
      html: html,
      text: text || subject
    };

    console.log('📧 Sending via Resend API...');

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Resend API error:', errorData);
      throw new Error(`Email API error: ${errorData}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully via Resend:', result.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: 'Email sent successfully',
        to: to,
        subject: subject
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    
    // For development, don't fail completely
    console.log('📧 Development fallback - email would be sent');
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        fallback: true,
        message: 'Email failed but booking succeeded'
      }),
      { 
        status: 200, // Don't fail the booking
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});