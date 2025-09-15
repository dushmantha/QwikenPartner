-- URGENT: Run this SQL in Supabase Dashboard > SQL Editor to fix password reset
-- This fixes the "column password_reset_otps.verified does not exist" error

-- Update the reset_user_password function to use correct columns
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

  -- Verify OTP is still valid and verified (using ACTUAL schema: verified_at, is_used)
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
  
  -- Mark OTP as used (using ACTUAL schema: is_used boolean)
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