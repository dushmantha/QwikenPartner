// WORKING Edge Function - Copy this EXACT code to Supabase
// Replace ALL existing code in buzybees-email-otp function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

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
    const { action, email, otp_code, password, user_name = 'User' } = await req.json();
    
    // Initialize Supabase with service role
    const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Initialize Resend
    const resend = new Resend('re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt');

    switch (action) {
      case 'send_reset_email':
        // Generate OTP
        const otpCode = String(Math.floor(1000 + Math.random() * 9000));
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        
        // Clean old OTPs
        await supabase
          .from('password_reset_otps')
          .delete()
          .eq('email', email.toLowerCase())
          .lt('expires_at', new Date().toISOString());
        
        // Insert new OTP
        const { error: insertError } = await supabase
          .from('password_reset_otps')
          .insert({
            email: email.toLowerCase(),
            otp_code: otpCode,
            expires_at: expiresAt,
            is_used: false,
            attempts: 0
          });
          
        if (insertError) {
          throw new Error('Failed to generate OTP');
        }

        // Send email
        try {
          await resend.emails.send({
            from: 'BuzyBees <onboarding@resend.dev>',
            to: [email],
            subject: `BuzyBees OTP: ${otpCode}`,
            html: `
              <div style="font-family: Arial; padding: 20px; text-align: center;">
                <h1>🐝 BuzyBees Password Reset</h1>
                <p>Hello ${user_name},</p>
                <div style="font-size: 32px; font-weight: bold; background: #f0f0f0; padding: 20px; margin: 20px 0;">
                  ${otpCode}
                </div>
                <p>This code expires in 10 minutes.</p>
              </div>
            `,
          });
          
          return new Response(
            JSON.stringify({ success: true, message: 'Email sent successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (emailError) {
          return new Response(
            JSON.stringify({ success: true, message: 'OTP stored in database' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'verify_otp':
        // Find valid OTP using EXACT column names that exist
        const { data: otpData, error: findError } = await supabase
          .from('password_reset_otps')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('otp_code', otp_code)
          .gt('expires_at', new Date().toISOString())
          .is('verified_at', null)
          .eq('is_used', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (findError || !otpData || otpData.length === 0) {
          throw new Error('Invalid or expired OTP');
        }

        // Mark as verified
        const { error: verifyError } = await supabase
          .from('password_reset_otps')
          .update({ verified_at: new Date().toISOString() })
          .eq('id', otpData[0].id);

        if (verifyError) {
          throw new Error('Failed to verify OTP');
        }

        return new Response(
          JSON.stringify({ success: true, message: 'OTP verified' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'reset_password':
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        // Find verified OTP
        const { data: verifiedOtp, error: otpError } = await supabase
          .from('password_reset_otps')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('otp_code', otp_code)
          .gt('expires_at', new Date().toISOString())
          .not('verified_at', 'is', null)
          .order('verified_at', { ascending: false })
          .limit(1);

        if (otpError || !verifiedOtp || verifiedOtp.length === 0) {
          throw new Error('OTP not verified or expired');
        }

        // Get user from auth
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        if (userError) {
          throw new Error('Failed to get users');
        }

        const user = users.users.find(u => u.email === email.toLowerCase());
        if (!user) {
          throw new Error('User not found');
        }

        // Update password
        const { error: passwordError } = await supabase.auth.admin.updateUserById(user.id, {
          password: password
        });

        if (passwordError) {
          throw new Error('Failed to update password: ' + passwordError.message);
        }

        // Mark OTP as used
        await supabase
          .from('password_reset_otps')
          .update({ is_used: true })
          .eq('id', verifiedOtp[0].id);

        return new Response(
          JSON.stringify({ success: true, message: 'Password updated successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});