#!/bin/bash

# Create all necessary files for BuzyBees email function

echo "📁 Creating BuzyBees Email Function Files..."

# Create directory structure
mkdir -p supabase/functions/send-otp-email
mkdir -p supabase/.env

echo "✅ Directories created"

# Create the Edge Function
cat > supabase/functions/send-otp-email/index.ts << 'TSEOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, otp_code, user_name = 'User' } = await req.json();
    
    if (!email || !otp_code) {
      return new Response(
        JSON.stringify({ error: 'Email and OTP required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Beautiful email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BuzyBees Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center;">
                <div style="font-size: 40px;">🐝</div>
                <h1 style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0;">BuzyBees</h1>
                <p style="margin: 0; color: #333; font-size: 16px;">Password Reset Request</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${user_name}!</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 20px 0;">
                    You requested to reset your password. Use the verification code below:
                </p>
                
                <!-- OTP Code -->
                <div style="background: #f8f9fa; border: 3px dashed #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; font-size: 36px; font-weight: bold; color: #333; letter-spacing: 8px;">
                    ${otp_code}
                </div>
                
                <!-- Warning -->
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; font-size: 14px; color: #856404;">
                    ⚠️ <strong>Important:</strong> This code expires in 10 minutes for security.
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 20px 0;">
                    If you didn't request this, please ignore this email.
                </p>
                
                <div style="font-size: 12px; color: #999; margin-top: 20px;">
                    🔒 Never share this code with anyone.<br>
                    BuzyBees will never ask for verification codes.
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666;">
                <p>© 2024 BuzyBees. All rights reserved.</p>
                <p>This is automated - please don't reply.</p>
            </div>
        </div>
    </body>
    </html>`;

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BuzyBees Support <sathyamalji@gmail.com>',
        to: [email],
        subject: `🐝 BuzyBees Password Reset - Code: ${otp_code}`,
        html: htmlContent,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Email send failed');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP email sent successfully',
        email_id: data.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
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
TSEOF

echo "✅ Edge Function created: supabase/functions/send-otp-email/index.ts"

# Create Supabase config
cat > supabase/config.toml << 'CONFIGEOF'
project_id = "buzybees"

[api]
enabled = true
port = 54321

[db]  
enabled = true
port = 54322
major_version = 15

[functions.send-otp-email]
verify_jwt = false

[auth]
enabled = true
site_url = "http://localhost:3000"
enable_signup = true

[storage]
enabled = true
file_size_limit = "50MiB"
CONFIGEOF

echo "✅ Supabase config created: supabase/config.toml"

# Create environment file
cat > supabase/.env/send-otp-email.env << 'ENVEOF'
SUPABASE_URL=https://fezdmxvqurczeqmqvgzm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_cijzp4tMNXM6SLVe0hdItw_zEKKL5zf
RESEND_API_KEY=re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt
ENVEOF

echo "✅ Environment config created: supabase/.env/send-otp-email.env"

echo ""
echo "🎉 All files created successfully!"
echo ""
echo "📁 Created files:"
echo "  • supabase/functions/send-otp-email/index.ts"
echo "  • supabase/config.toml"  
echo "  • supabase/.env/send-otp-email.env"
echo ""
echo "🚀 Next: Run deployment script"
echo "   chmod +x deploy-simple.sh && ./deploy-simple.sh"
echo ""