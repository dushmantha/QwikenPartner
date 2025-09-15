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
    console.log('🔧 Applying function fixes...');
    
    const fixSQL = `
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
      
      -- Mark OTP as used (using actual schema: is_used boolean)
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
    
    const { error } = await supabase.rpc('exec', { sql: fixSQL });
    
    if (error) {
      console.error('❌ Fix failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Fix failed: ' + error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Database functions fixed - password reset should now work' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});