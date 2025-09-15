import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzUzNzQ4OSwiZXhwIjoyMDM5MTEzNDg5fQ.CqGhsEOdHa2zKTIlcHnJqIgzKNLM6KEMACtM_L3QWq8';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const schemaFixSQL = `
-- Update the stored functions to use the correct schema
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

  -- Find valid OTP (using actual database schema with verified_at and is_used)
  SELECT * INTO otp_record
  FROM password_reset_otps
  WHERE email = LOWER(user_email)
    AND otp_code = user_otp
    AND expires_at > NOW()
    AND (verified_at IS NULL AND (is_used = FALSE OR is_used IS NULL))
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if OTP exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired OTP code'
    );
  END IF;
  
  -- Mark OTP as verified (using actual schema: verified_at timestamp)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔧 Applying schema fix for password reset functions...');
    
    // Apply the schema fix
    const { error: schemaError } = await supabase.rpc('exec', { sql: schemaFixSQL });
    
    if (schemaError) {
      console.error('❌ Schema fix failed:', schemaError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Schema fix failed: ' + schemaError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Schema fix completed - functions updated to use correct columns');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Schema fix completed - password reset functions updated to use verified_at and is_used columns'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Schema fix failed: ' + error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});