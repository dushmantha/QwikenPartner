import { supabase } from '../lib/supabase/index';

interface OTPEmailData {
  to_email: string;
  user_name?: string;
  otp_code: string;
  expires_at: string;
}

interface EmailServiceResult {
  success: boolean;
  error?: string;
  otpId?: string;
}

class EmailService {
  private readonly FROM_EMAIL = 'sathyamalji@gmail.com';
  private readonly FROM_NAME = 'Qwiken Support';

  /**
   * Generate a 4-digit OTP code
   */
  generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Store OTP in database with expiration
   */
  private async storeOTP(email: string, otpCode: string): Promise<{ success: boolean; otpId?: string; error?: string }> {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      // Use service role or anonymous access for OTP operations
      const supabaseServiceClient = supabase;
      
      // First, invalidate any existing OTPs for this email
      const { error: updateError } = await supabaseServiceClient
        .from('password_reset_otps')
        .update({ is_used: true })
        .eq('email', email)
        .eq('is_used', false);

      if (updateError && !updateError.message.includes('password_reset_otps')) {
        console.warn('Warning updating existing OTPs:', updateError);
      }

      // Insert new OTP
      const { data, error } = await supabaseServiceClient
        .from('password_reset_otps')
        .insert({
          email: email.toLowerCase(),
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
          is_used: false,
          attempts: 0,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing OTP:', error);
        
        // Check if table doesn't exist
        if (error.message?.includes('password_reset_otps') || error.code === '42P01') {
          return { 
            success: false, 
            error: 'Password reset system not configured. Please run the database setup script first.' 
          };
        }
        
        return { success: false, error: error.message };
      }

      return { success: true, otpId: data?.id };
    } catch (error) {
      console.error('Error in storeOTP:', error);
      return { success: false, error: 'Failed to store OTP' };
    }
  }

  /**
   * Send OTP email using Supabase Edge Function
   */
  private async sendEmailViaSMTP(emailData: OTPEmailData): Promise<boolean> {
    try {
      console.log('📧 Sending OTP Email via Supabase Edge Function:');
      console.log('To:', emailData.to_email);
      console.log('OTP Code:', emailData.otp_code);

      // Get Supabase URL and anon key
      const SUPABASE_URL = supabase.supabaseUrl;
      const SUPABASE_ANON_KEY = supabase.supabaseKey;
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('❌ Supabase configuration missing');
        return false;
      }

      // Call Supabase Edge Function
      const functionUrl = `${SUPABASE_URL}/functions/v1/send-otp-email`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailData.to_email,
          otp_code: emailData.otp_code,
          user_name: emailData.user_name
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Email sent successfully:', result);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Email function error:', error);
        
        // Fall back to development logging
        console.log('📧 Fallback - Email Details:');
        console.log('To:', emailData.to_email);
        console.log('Subject: Qwiken Password Reset - Verification Code');
        console.log('OTP Code:', emailData.otp_code);
        console.log('User Name:', emailData.user_name);
        
        // For development, return true even if edge function fails
        return true;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Development fallback - log the email details
      console.log('📧 Development Mode - Email would be sent:');
      console.log('To:', emailData.to_email);
      console.log('Subject: Qwiken Password Reset - Verification Code');
      console.log('OTP Code:', emailData.otp_code);
      console.log('User Name:', emailData.user_name);
      console.log('Expires at:', emailData.expires_at);
      
      // Return true for development
      return true;
    }
  }

  /**
   * Generate HTML email template for OTP
   */
  private generateEmailTemplate(emailData: OTPEmailData): string {
    const userName = emailData.user_name || 'User';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Qwiken Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #00C9A7; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code { background: #00C9A7; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚡ Qwiken</h1>
            <h2>Password Reset Request</h2>
          </div>
          
          <div class="content">
            <h3>Hello ${userName}!</h3>
            
            <p>We received a request to reset your password for your Qwiken account.</p>
            
            <p>Use the verification code below to continue with your password reset:</p>
            
            <div class="otp-code">${emailData.otp_code}</div>
            
            <div class="warning">
              <strong>⏰ Important:</strong>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>For security, do not share this code with anyone</li>
                <li>If you didn't request a password reset, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br>The Qwiken Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent from Qwiken Password Reset Service</p>
            <p>© 2025 Qwiken. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send password reset OTP to user's email
   */
  async sendPasswordResetOTP(email: string, userName?: string): Promise<EmailServiceResult> {
    try {
      // Validate email
      if (!email || !email.includes('@')) {
        return { success: false, error: 'Invalid email address' };
      }

      // Check if user exists in database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !user) {
        console.log('User not found for email:', email);
        // For security, don't reveal if email exists or not
        return { success: true }; // Return success but don't actually send
      }

      // Generate OTP
      const otpCode = this.generateOTP();
      
      // Store OTP in database
      const storeResult = await this.storeOTP(email, otpCode);
      if (!storeResult.success) {
        return { success: false, error: storeResult.error };
      }

      // Prepare email data
      const emailData: OTPEmailData = {
        to_email: email.toLowerCase(),
        user_name: userName || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
        otp_code: otpCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };

      // Send email
      const emailSent = await this.sendEmailViaSMTP(emailData);
      
      if (!emailSent) {
        return { success: false, error: 'Failed to send email' };
      }

      return { 
        success: true, 
        otpId: storeResult.otpId 
      };
    } catch (error) {
      console.error('Error in sendPasswordResetOTP:', error);
      return { success: false, error: 'Failed to process request' };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, otpCode: string): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      // Get the latest unused OTP for this email
      const { data: otpRecord, error: fetchError } = await supabase
        .from('password_reset_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('otp_code', otpCode)
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !otpRecord) {
        // Increment attempts for any matching email/code combination
        // First get current attempts, then increment
        const { data: existingOtp } = await supabase
          .from('password_reset_otps')
          .select('attempts')
          .eq('email', email.toLowerCase())
          .eq('otp_code', otpCode)
          .single();

        if (existingOtp) {
          await supabase
            .from('password_reset_otps')
            .update({ attempts: (existingOtp.attempts || 0) + 1 })
            .eq('email', email.toLowerCase())
            .eq('otp_code', otpCode);
        }

        return { success: false, error: 'Invalid or expired verification code' };
      }

      // Check if too many attempts
      if (otpRecord.attempts >= 3) {
        await supabase
          .from('password_reset_otps')
          .update({ is_used: true })
          .eq('id', otpRecord.id);

        return { success: false, error: 'Too many attempts. Please request a new code.' };
      }

      // Get user ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !user) {
        return { success: false, error: 'User not found' };
      }

      // Mark OTP as used
      await supabase
        .from('password_reset_otps')
        .update({ is_used: true, verified_at: new Date().toISOString() })
        .eq('id', otpRecord.id);

      return { success: true, userId: user.id };
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return { success: false, error: 'Failed to verify code' };
    }
  }

  /**
   * Clean up expired OTPs (run periodically)
   */
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      await supabase
        .from('password_reset_otps')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }
}

export const emailService = new EmailService();
export default emailService;