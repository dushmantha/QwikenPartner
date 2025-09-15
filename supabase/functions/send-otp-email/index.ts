import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('🐝 Qwiken OTP Email Function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, otp_code, user_name = 'User' } = await req.json();
    console.log('📧 Processing email request for:', email);
    
    if (!email || !otp_code) {
      console.log('❌ Missing email or OTP code');
      return new Response(
        JSON.stringify({ error: 'Email and OTP required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Qwiken Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center;">
                <div style="font-size: 40px;">🐝</div>
                <h1 style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0;">Qwiken</h1>
                <p style="margin: 0; color: #333; font-size: 16px;">Password Reset Request</p>
            </div>
            <div style="padding: 40px 30px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${user_name}!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 20px 0;">
                    You requested to reset your password. Use the verification code below:
                </p>
                <div style="background: #f8f9fa; border: 3px dashed #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; font-size: 36px; font-weight: bold; color: #333; letter-spacing: 8px;">
                    ${otp_code}
                </div>
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; font-size: 14px; color: #856404;">
                    ⚠️ <strong>Important:</strong> This code expires in 10 minutes for security.
                </div>
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 20px 0;">
                    If you didn't request this, please ignore this email.
                </p>
                <div style="font-size: 12px; color: #999; margin-top: 20px;">
                    🔒 Never share this code with anyone.<br>
                    Qwiken will never ask for verification codes.
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666;">
                <p>© 2024 Qwiken. All rights reserved.</p>
                <p>This is automated - please don't reply.</p>
            </div>
        </div>
    </body>
    </html>`;

    const resend = new Resend('re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt');
    
    console.log('📤 Sending email via Resend SDK...');
    const { data, error } = await resend.emails.send({
      from: 'Qwiken <onboarding@resend.dev>',
      reply_to: 'sathyamalji@gmail.com',
      to: [email],
      subject: `🐝 Qwiken Password Reset - Code: ${otp_code}`,
      html: htmlContent,
    });

    console.log('📬 Resend SDK response:', { data, error });
    
    if (error) {
      console.log('❌ Resend SDK error:', error);
      throw new Error(error.message || 'Email send failed');
    }

    console.log('✅ Email sent successfully!');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP email sent successfully',
        email_id: data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to send email',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});