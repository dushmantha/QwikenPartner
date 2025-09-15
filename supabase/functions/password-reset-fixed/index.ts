import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzUzNzQ4OSwiZXhwIjoyMDM5MTEzNDg5fQ.CqGhsEOdHa2zKTIlcHnJqIgzKNLM6KEMACtM_L3QWq8';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, otp_code } = await req.json();
    console.log('🔄 Password reset request for:', email, 'OTP:', otp_code);

    // Validate inputs
    if (!email || !password || !otp_code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, password, and OTP are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check OTP exists and is verified (allow already used OTPs for retry)
    const { data: otps, error: fetchError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otp_code)
      .gt('expires_at', new Date().toISOString())
      .not('verified_at', 'is', null)
      .order('verified_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('❌ Database error:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error: ' + fetchError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otps || otps.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired OTP. Please verify your OTP first.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otp = otps[0];

    // Get user by email
    const { data: authUsers, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('❌ Failed to get users:', getUserError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to find user' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id, 
      { password: password }
    );

    if (updateError) {
      console.error('❌ Failed to update password:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update password: ' + updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as used (only if not already used)
    if (!otp.is_used) {
      const { error: markUsedError } = await supabase
        .from('password_reset_otps')
        .update({ is_used: true })
        .eq('id', otp.id);

      if (markUsedError) {
        console.warn('⚠️ Failed to mark OTP as used:', markUsedError);
      }
    } else {
      console.log('ℹ️ OTP already marked as used, proceeding with password update');
    }

    console.log('✅ Password reset successful');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset successfully',
        email: email.toLowerCase()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Function execution failed: ' + error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});