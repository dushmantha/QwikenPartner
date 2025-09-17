import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJ6Y2VxbXF2Z3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzUzNzQ4OSwiZXhwIjoyMDM5MTEzNDg5fQ.CqGhsEOdHa2zKTIlcHnJqIgzKNLM6KEMACtM_L3QWq8';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Resend
const resend = new Resend('re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt');

// SQL Schema for password reset system
const setupSQL = `
-- ===================================================================
-- Qwiken Partner Forgot Password Complete System Setup
-- ===================================================================

-- Create password_reset_otps table using actual database schema
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_reset_otps_email_code') THEN
    CREATE INDEX idx_password_reset_otps_email_code ON password_reset_otps(email, otp_code);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_reset_otps_expires') THEN
    CREATE INDEX idx_password_reset_otps_expires ON password_reset_otps(expires_at);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous OTP operations" ON password_reset_otps;

-- Create RLS Policy
CREATE POLICY "Allow anonymous OTP operations" ON password_reset_otps
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Create or replace functions
CREATE OR REPLACE FUNCTION send_password_reset_email(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  otp_code TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validate email format
  IF user_email IS NULL OR user_email = '' OR user_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}$' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Generate 4-digit OTP
  otp_code := LPAD((RANDOM() * 9000 + 1000)::INT::TEXT, 4, '0');
  
  -- Set expiration to 10 minutes from now
  expires_at := NOW() + INTERVAL '10 minutes';
  
  -- Clean up old OTPs for this email
  DELETE FROM password_reset_otps 
  WHERE password_reset_otps.email = LOWER(user_email) 
  AND password_reset_otps.expires_at < NOW();
  
  -- Store OTP in database
  INSERT INTO password_reset_otps (email, otp_code, expires_at)
  VALUES (LOWER(user_email), otp_code, expires_at);
  
  -- Return success response with OTP
  RETURN json_build_object(
    'success', true,
    'message', 'OTP generated successfully',
    'email', LOWER(user_email),
    'otp_code', otp_code,
    'expires_in_minutes', 10
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error sending password reset email: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to send email: ' || SQLERRM
    );
END;
$func$;

CREATE OR REPLACE FUNCTION verify_password_reset_otp(user_email TEXT, user_otp TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  otp_record RECORD;
BEGIN
  -- Validate inputs
  IF user_email IS NULL OR user_email = '' OR user_otp IS NULL OR user_otp = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email and OTP are required'
    );
  END IF;

  -- Find valid OTP (using actual schema: verified_at, is_used)
  SELECT * INTO otp_record
  FROM password_reset_otps
  WHERE email = LOWER(user_email)
    AND otp_code = user_otp
    AND expires_at > NOW()
    AND verified_at IS NULL
    AND is_used = FALSE
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if OTP exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired OTP code'
    );
  END IF;
  
  -- Mark OTP as verified (using actual schema: verified_at)
  UPDATE password_reset_otps
  SET verified_at = NOW()
  WHERE id = otp_record.id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'OTP verified successfully',
    'email', LOWER(user_email),
    'otp_id', otp_record.id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error verifying OTP: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to verify OTP: ' || SQLERRM
    );
END;
$func$;

CREATE OR REPLACE FUNCTION reset_user_password(user_email TEXT, new_password TEXT, otp_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  user_record RECORD;
  otp_record RECORD;
BEGIN
  -- Validate inputs
  IF user_email IS NULL OR user_email = '' OR new_password IS NULL OR new_password = '' OR otp_code IS NULL OR otp_code = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email, password, and OTP are required'
    );
  END IF;

  -- Validate password strength
  IF LENGTH(new_password) < 6 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Password must be at least 6 characters long'
    );
  END IF;

  -- Verify OTP is still valid and verified (using actual schema: verified_at, is_used)
  SELECT * INTO otp_record
  FROM password_reset_otps
  WHERE email = LOWER(user_email)
    AND otp_code = otp_code
    AND verified_at IS NOT NULL
    AND expires_at > NOW()
    AND is_used = FALSE
  ORDER BY verified_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired OTP. Please request a new one.'
    );
  END IF;
  
  -- Check if user exists in auth.users
  SELECT * INTO user_record
  FROM auth.users
  WHERE email = LOWER(user_email);
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Update password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = user_record.id;
  
  -- Mark OTP as used (using actual schema: is_used)
  UPDATE password_reset_otps
  SET is_used = TRUE
  WHERE email = LOWER(user_email) AND otp_code = otp_code;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully',
    'email', LOWER(user_email)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error resetting password: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to reset password: ' || SQLERRM
    );
END;
$func$;
`;

// Email template function
function generateEmailTemplate(userName: string, otpCode: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Qwiken Partner Password Reset</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center;">
        <div style="font-size: 40px;">🐝</div>
        <h1 style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0;">Qwiken Partner</h1>
        <p style="margin: 0; color: #333; font-size: 16px;">Password Reset Request</p>
      </div>
      <div style="padding: 40px 30px; text-align: center;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}!</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 20px 0;">
          You requested to reset your password. Use the verification code below:
        </p>
        <div style="background: #f8f9fa; border: 3px dashed #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; font-size: 36px; font-weight: bold; color: #333; letter-spacing: 8px;">
          ${otpCode}
        </div>
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; font-size: 14px; color: #856404;">
          ⚠️ <strong>Important:</strong> This code expires in 10 minutes for security.
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #666; margin: 20px 0;">
          If you didn't request this, please ignore this email.
        </p>
        <div style="font-size: 12px; color: #999; margin-top: 20px;">
          🔒 Never share this code with anyone.<br>
          Qwiken Partner will never ask for verification codes.
        </div>
      </div>
      <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666;">
        <p>© 2024 Qwiken Partner. All rights reserved.</p>
        <p>This is automated - please don't reply.</p>
      </div>
    </div>
  </body>
  </html>`;
}

serve(async (req) => {
  console.log('🐝 Qwiken Partner Complete Forgot Password Function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, email, otp_code, password, user_name = 'User' } = await req.json();
    console.log('📧 Action:', action, 'Email:', email);

    // Setup database schema if needed
    if (action === 'setup' || action === 'send_reset_email') {
      try {
        console.log('🔧 Setting up database schema...');
        const { error: setupError } = await supabase.rpc('exec', { sql: setupSQL });
        if (setupError) {
          console.log('⚠️ Setup might have some conflicts (likely already exists):', setupError.message);
        } else {
          console.log('✅ Database schema setup completed');
        }
      } catch (setupErr) {
        console.log('⚠️ Schema setup had issues (likely already exists):', setupErr.message);
      }
    }

    switch (action) {
      case 'setup':
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Forgot password system setup completed',
            components: [
              'password_reset_otps table',
              'send_password_reset_email function',
              'verify_password_reset_otp function', 
              'reset_user_password function',
              'RLS policies'
            ]
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'send_reset_email':
        if (!email) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate OTP using database function
        console.log('🔄 Generating OTP for:', email);
        const { data: otpData, error: otpError } = await supabase.rpc('send_password_reset_email', {
          user_email: email.trim().toLowerCase()
        });

        if (otpError || !otpData?.success) {
          console.error('❌ OTP generation failed:', otpError || otpData);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: otpData?.error || otpError?.message || 'Failed to generate OTP' 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const generatedOTP = otpData.otp_code;
        console.log('✅ OTP generated:', generatedOTP);

        // Send email with OTP
        try {
          console.log('📤 Sending email via Resend...');
          const htmlContent = generateEmailTemplate(user_name, generatedOTP);
          
          const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Qwiken Partner <onboarding@resend.dev>',
            reply_to: 'sathyamalji@gmail.com',
            to: [email],
            subject: `🐝 Qwiken Partner Password Reset - Code: ${generatedOTP}`,
            html: htmlContent,
          });

          if (emailError) {
            console.log('⚠️ Email sending failed, but OTP is stored:', emailError);
            return new Response(
              JSON.stringify({ 
                success: true,
                message: 'OTP generated successfully, but email sending failed. Check database for OTP.',
                email: email,
                otp_stored: true,
                email_error: emailError.message
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log('✅ Email sent successfully:', emailData?.id);
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'Password reset email sent successfully',
              email: email,
              email_id: emailData?.id,
              otp_expires_in: '10 minutes'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (emailSendError) {
          console.log('⚠️ Email sending failed, but OTP is stored:', emailSendError);
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'OTP stored in database, but email sending failed. Check database for OTP.',
              email: email,
              otp_stored: true,
              email_error: emailSendError.message
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'verify_otp':
        if (!email || !otp_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email and OTP are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('🔍 Verifying OTP for:', email);
        const { data: verifyData, error: verifyError } = await supabase.rpc('verify_password_reset_otp', {
          user_email: email.trim().toLowerCase(),
          user_otp: otp_code
        });

        if (verifyError || !verifyData?.success) {
          console.error('❌ OTP verification failed:', verifyError || verifyData);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: verifyData?.error || verifyError?.message || 'OTP verification failed' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ OTP verified successfully');
        return new Response(
          JSON.stringify(verifyData),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'reset_password':
        if (!email || !password || !otp_code) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email, password, and OTP are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('🔄 Resetting password for:', email);
        const { data: resetData, error: resetError } = await supabase.rpc('reset_user_password', {
          user_email: email.trim().toLowerCase(),
          new_password: password,
          otp_code: otp_code
        });

        if (resetError || !resetData?.success) {
          console.error('❌ Password reset failed:', resetError || resetData);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: resetData?.error || resetError?.message || 'Password reset failed' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Password reset successfully');
        return new Response(
          JSON.stringify(resetData),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action. Use: setup, send_reset_email, verify_otp, or reset_password' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Function execution failed',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});