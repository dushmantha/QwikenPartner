-- Fix password reset schema issue
-- Add verified_at column if it doesn't exist and fix the verify function

-- Add verified_at column if it doesn't exist
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'password_reset_otps' 
        AND column_name = 'verified_at'
    ) THEN
        -- Add the column
        ALTER TABLE password_reset_otps ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added verified_at column to password_reset_otps table';
    ELSE
        RAISE NOTICE 'verified_at column already exists in password_reset_otps table';
    END IF;
END $$;

-- Ensure the table has the correct structure
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE NULL
);

-- Update the verify function to handle the verified_at column properly
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

  -- Find valid OTP
  SELECT * INTO otp_record
  FROM password_reset_otps
  WHERE email = LOWER(user_email)
    AND otp_code = user_otp
    AND expires_at > NOW()
    AND (is_used = FALSE OR is_used IS NULL)
    AND verified_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if OTP exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired OTP code'
    );
  END IF;
  
  -- Mark OTP as verified
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

-- Check the final table structure
SELECT 
  'SUCCESS: password_reset_otps table structure verified!' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'password_reset_otps'
ORDER BY ordinal_position;