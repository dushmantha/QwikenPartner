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

const migrationSQL = `
-- Add verified_at column if it doesn't exist
DO $MIGRATION$
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_otps' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE password_reset_otps ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added verified_at column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_otps' AND column_name = 'is_used'
    ) THEN
        ALTER TABLE password_reset_otps ADD COLUMN is_used BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_used column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_otps' AND column_name = 'attempts'
    ) THEN
        ALTER TABLE password_reset_otps ADD COLUMN attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added attempts column';
    END IF;
END $MIGRATION$;

-- Update verification function to work with current schema
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

  -- Find valid OTP (compatible with both old and new schema)
  SELECT * INTO otp_record
  FROM password_reset_otps
  WHERE email = LOWER(user_email)
    AND otp_code = user_otp
    AND expires_at > NOW()
    AND (
      (verified = FALSE OR verified IS NULL) OR  -- old schema
      (verified_at IS NULL AND (is_used = FALSE OR is_used IS NULL)) -- new schema
    )
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if OTP exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired OTP code'
    );
  END IF;
  
  -- Mark OTP as verified (compatible with both schemas)
  BEGIN
    -- Try new schema first
    UPDATE password_reset_otps
    SET verified_at = NOW()
    WHERE id = otp_record.id;
  EXCEPTION
    WHEN undefined_column THEN
      -- Fall back to old schema
      UPDATE password_reset_otps
      SET verified = TRUE
      WHERE id = otp_record.id;
  END;
  
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
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔧 Applying schema migration...');
    
    // Apply migration
    const { error: migrationError } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (migrationError) {
      console.error('❌ Migration failed:', migrationError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Migration failed: ' + migrationError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Schema migration completed');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Schema migration completed - OTP verification should now work'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Migration failed: ' + error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});