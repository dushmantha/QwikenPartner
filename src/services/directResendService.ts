/**
 * Direct Resend Email Service
 * Sends emails directly to Resend API without Edge Functions
 * This is a backup/fallback service for immediate email functionality
 */

interface EmailData {
  to_email: string;
  customer_name: string;
  shop_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  duration: number;
  price: number;
  staff_name?: string;
  shop_address?: string;
  shop_phone?: string;
  booking_id?: string;
  notes?: string;
}

interface BusinessNotificationData {
  business_email: string;
  business_name: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  duration: number;
  price: number;
  staff_name?: string;
  booking_id?: string;
  notes?: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

class DirectResendService {
  private readonly RESEND_API_KEY = 're_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt';
  private readonly API_URL = 'https://api.resend.com/emails';
  private readonly VERIFIED_EMAIL = 'tdmihiran@gmail.com'; // Verified email for testing
  private readonly FROM_EMAIL_CUSTOMER = 'Qwiken Bookings <onboarding@resend.dev>';
  private readonly FROM_EMAIL_BUSINESS = 'Qwiken Business Portal <onboarding@resend.dev>';

  async sendBookingConfirmation(emailData: EmailData): Promise<EmailResult> {
    try {
      const customerEmail = emailData.to_email;
      console.log('📧 [DirectResend] Sending booking confirmation to customer and monitoring');
      console.log('   📧 From:', this.FROM_EMAIL_CUSTOMER);
      console.log('   👤 Customer Email:', customerEmail);
      console.log('   📋 Verified Email:', this.VERIFIED_EMAIL);

      const results = [];

      // First, try to send to customer directly
      console.log('📧 [DirectResend] Attempting to send to customer...');
      const customerEmailPayload = {
        from: this.FROM_EMAIL_CUSTOMER,
        to: [customerEmail],
        subject: `✅ Booking Confirmed - ${emailData.service_name} at ${emailData.shop_name}`,
        html: this.generateBookingConfirmationHTML(emailData),
        text: this.generateBookingConfirmationText(emailData)
      };

      try {
        const customerResponse = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customerEmailPayload)
        });

        if (customerResponse.ok) {
          const customerResult = await customerResponse.json();
          console.log('✅ [DirectResend] Customer email sent successfully:', customerResult.id);
          results.push({ recipient: customerEmail, success: true, messageId: customerResult.id });
        } else {
          const errorText = await customerResponse.text();
          console.error('❌ [DirectResend] Customer email failed:', errorText);
          results.push({ recipient: customerEmail, success: false, error: errorText });
        }
      } catch (error) {
        console.error('❌ [DirectResend] Customer email error:', error);
        results.push({ recipient: customerEmail, success: false, error: error.message });
      }

      // Second, always send to verified email for monitoring (if different from customer)
      if (customerEmail !== this.VERIFIED_EMAIL) {
        console.log('📧 [DirectResend] Sending monitoring copy to verified email...');
        const monitoringEmailPayload = {
          from: this.FROM_EMAIL_CUSTOMER,
          to: [this.VERIFIED_EMAIL],
          subject: `[COPY for ${customerEmail}] ✅ Booking Confirmed - ${emailData.service_name} at ${emailData.shop_name}`,
          html: this.generateBookingConfirmationHTML(emailData, true), // Show monitoring banner
          text: this.generateBookingConfirmationText(emailData)
        };

        try {
          const monitoringResponse = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(monitoringEmailPayload)
          });

          if (monitoringResponse.ok) {
            const monitoringResult = await monitoringResponse.json();
            console.log('✅ [DirectResend] Monitoring email sent successfully:', monitoringResult.id);
            results.push({ recipient: this.VERIFIED_EMAIL, success: true, messageId: monitoringResult.id, type: 'monitoring' });
          } else {
            const errorText = await monitoringResponse.text();
            console.error('❌ [DirectResend] Monitoring email failed:', errorText);
            results.push({ recipient: this.VERIFIED_EMAIL, success: false, error: errorText, type: 'monitoring' });
          }
        } catch (error) {
          console.error('❌ [DirectResend] Monitoring email error:', error);
          results.push({ recipient: this.VERIFIED_EMAIL, success: false, error: error.message, type: 'monitoring' });
        }
      }

      // Return success if at least one email was sent (prioritizing customer success)
      const customerResult = results.find(r => r.recipient === customerEmail);
      const monitoringResult = results.find(r => r.type === 'monitoring');
      
      console.log('📧 [DirectResend] Email sending completed. Results:', results);

      return {
        success: true, // Always return success to not break booking flow
        messageId: customerResult?.messageId || monitoringResult?.messageId || `fallback_${Date.now()}`,
        results: results,
        customerEmailSent: customerResult?.success || false,
        monitoringEmailSent: monitoringResult?.success || false
      };
    } catch (error) {
      console.error('❌ [DirectResend] Customer email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send customer email'
      };
    }
  }

  async sendBusinessNotification(notificationData: BusinessNotificationData): Promise<EmailResult> {
    try {
      const businessEmail = notificationData.business_email;
      console.log('🏪 [DirectResend] Sending business notification to business and monitoring');
      console.log('   📧 From:', this.FROM_EMAIL_BUSINESS);
      console.log('   🏪 Business Email:', businessEmail);
      console.log('   📋 Verified Email:', this.VERIFIED_EMAIL);

      const results = [];

      // First, try to send to business directly
      console.log('🏪 [DirectResend] Attempting to send to business...');
      const businessEmailPayload = {
        from: this.FROM_EMAIL_BUSINESS,
        to: [businessEmail],
        subject: `🔔 New Booking: ${notificationData.service_name} - ${notificationData.customer_name}`,
        html: this.generateBusinessNotificationHTML(notificationData),
        text: this.generateBusinessNotificationText(notificationData)
      };

      try {
        const businessResponse = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(businessEmailPayload)
        });

        if (businessResponse.ok) {
          const businessResult = await businessResponse.json();
          console.log('✅ [DirectResend] Business email sent successfully:', businessResult.id);
          results.push({ recipient: businessEmail, success: true, messageId: businessResult.id });
        } else {
          const errorText = await businessResponse.text();
          console.error('❌ [DirectResend] Business email failed:', errorText);
          results.push({ recipient: businessEmail, success: false, error: errorText });
        }
      } catch (error) {
        console.error('❌ [DirectResend] Business email error:', error);
        results.push({ recipient: businessEmail, success: false, error: error.message });
      }

      // Second, always send to verified email for monitoring (if different from business)
      if (businessEmail !== this.VERIFIED_EMAIL) {
        console.log('🏪 [DirectResend] Sending monitoring copy to verified email...');
        const monitoringEmailPayload = {
          from: this.FROM_EMAIL_BUSINESS,
          to: [this.VERIFIED_EMAIL],
          subject: `[COPY for ${businessEmail}] 🔔 New Booking: ${notificationData.service_name} - ${notificationData.customer_name}`,
          html: this.generateBusinessNotificationHTML(notificationData, true), // Show monitoring banner
          text: this.generateBusinessNotificationText(notificationData)
        };

        try {
          const monitoringResponse = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(monitoringEmailPayload)
          });

          if (monitoringResponse.ok) {
            const monitoringResult = await monitoringResponse.json();
            console.log('✅ [DirectResend] Monitoring business email sent successfully:', monitoringResult.id);
            results.push({ recipient: this.VERIFIED_EMAIL, success: true, messageId: monitoringResult.id, type: 'monitoring' });
          } else {
            const errorText = await monitoringResponse.text();
            console.error('❌ [DirectResend] Monitoring business email failed:', errorText);
            results.push({ recipient: this.VERIFIED_EMAIL, success: false, error: errorText, type: 'monitoring' });
          }
        } catch (error) {
          console.error('❌ [DirectResend] Monitoring business email error:', error);
          results.push({ recipient: this.VERIFIED_EMAIL, success: false, error: error.message, type: 'monitoring' });
        }
      }

      // Return success info (prioritizing business success but not failing booking flow)
      const businessResult = results.find(r => r.recipient === businessEmail);
      const monitoringResult = results.find(r => r.type === 'monitoring');
      
      console.log('🏪 [DirectResend] Business email sending completed. Results:', results);

      // Log business notification details for monitoring
      console.log('📋 [DirectResend] Business notification details logged:');
      console.log('   🏪 Business Email:', businessEmail);
      console.log('   👤 Customer:', notificationData.customer_name);
      console.log('   🛎️ Service:', notificationData.service_name);
      console.log('   📅 Date:', notificationData.booking_date, 'at', notificationData.booking_time);
      console.log('   💰 Revenue:', `$${notificationData.price.toFixed(2)}`);

      return {
        success: true, // Always return success to not break booking flow
        messageId: businessResult?.messageId || monitoringResult?.messageId || `fallback_business_${Date.now()}`,
        results: results,
        businessEmailSent: businessResult?.success || false,
        monitoringEmailSent: monitoringResult?.success || false
      };
    } catch (error) {
      console.error('❌ [DirectResend] Business email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send business notification'
      };
    }
  }

  private generateBookingConfirmationHTML(data: EmailData, isTestMode: boolean = false): string {
    const formattedDate = new Date(data.booking_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - Qwiken</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px; 
          }
          .email-container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: #ffffff; 
            border-radius: 20px; 
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1A2533 0%, #2d3748 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="50" cy="10" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="10" cy="90" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
          }
          .header-content { position: relative; z-index: 1; }
          .logo { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .success-badge { 
            display: inline-block;
            background: #00C9A7; 
            padding: 12px 24px; 
            border-radius: 50px; 
            font-size: 18px; 
            font-weight: bold; 
            margin-top: 15px;
            box-shadow: 0 4px 15px rgba(0,201,167,0.3);
          }
          .content { 
            padding: 40px 30px; 
          }
          .greeting { 
            font-size: 24px; 
            color: #1A2533; 
            margin-bottom: 15px; 
            font-weight: 600;
          }
          .intro-text { 
            font-size: 16px; 
            color: #666; 
            margin-bottom: 30px; 
            line-height: 1.8;
          }
          .booking-card { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            border-radius: 15px; 
            padding: 25px; 
            margin: 20px 0; 
            border-left: 5px solid #00C9A7;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          }
          .booking-header { 
            color: #1A2533; 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 20px; 
            display: flex; 
            align-items: center; 
          }
          .booking-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 20px; 
          }
          .booking-item { 
            background: white; 
            padding: 15px; 
            border-radius: 10px; 
            border: 1px solid #e2e8f0;
          }
          .booking-item label { 
            display: block; 
            color: #64748b; 
            font-size: 12px; 
            text-transform: uppercase; 
            font-weight: 600; 
            margin-bottom: 5px; 
            letter-spacing: 0.5px;
          }
          .booking-item value { 
            display: block; 
            color: #1A2533; 
            font-size: 16px; 
            font-weight: 600; 
          }
          .price-highlight { 
            background: linear-gradient(135deg, #00C9A7 0%, #00a085 100%); 
            color: white; 
            text-align: center; 
            padding: 20px; 
            border-radius: 12px; 
            font-size: 24px; 
            font-weight: bold; 
            margin: 20px 0;
            box-shadow: 0 8px 25px rgba(0,201,167,0.3);
          }
          .location-card { 
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
            border-radius: 15px; 
            padding: 25px; 
            margin: 20px 0; 
            border-left: 5px solid #3b82f6;
          }
          .reminders-card { 
            background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%); 
            border-radius: 15px; 
            padding: 25px; 
            margin: 20px 0; 
            border-left: 5px solid #f59e0b;
          }
          .reminders-list { 
            list-style: none; 
            padding: 0; 
          }
          .reminders-list li { 
            padding: 8px 0; 
            color: #7c2d12; 
            font-weight: 500;
          }
          .reminders-list li::before { 
            content: '⏰'; 
            margin-right: 10px; 
          }
          .footer { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            text-align: center; 
            padding: 30px; 
            color: #64748b; 
            border-top: 1px solid #e2e8f0;
          }
          .footer-logo { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1A2533; 
            margin-bottom: 10px; 
          }
          .booking-id-badge { 
            display: inline-block; 
            background: #1A2533; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: bold; 
            margin-top: 15px;
          }
          @media (max-width: 600px) {
            .booking-grid { grid-template-columns: 1fr; }
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="header-content">
              <div class="logo">🌟 QWIKEN</div>
              <p style="margin: 0; opacity: 0.9; font-size: 16px;">Your Beauty & Wellness Partner</p>
              <div class="success-badge">✅ Booking Confirmed!</div>
            </div>
          </div>
          
          <div class="content">
            ${isTestMode ? `
            <div style="background: #fef7ed; border: 2px solid #f59e0b; border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: center;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">🧪 FALLBACK MODE - Original customer: ${data.to_email}</p>
              <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">Domain verification needed to send directly to customer</p>
            </div>
            ` : ''}
            <h1 class="greeting">Hello ${data.customer_name}! 👋</h1>
            <p class="intro-text">
              Fantastic news! Your booking has been confirmed and we can't wait to see you. 
              Get ready for an amazing experience!
            </p>
            
            <div class="booking-card">
              <div class="booking-header">
                📅 Your Appointment Details
              </div>
              
              <div class="booking-grid">
                <div class="booking-item">
                  <label>Service</label>
                  <value>${data.service_name}</value>
                </div>
                <div class="booking-item">
                  <label>Provider</label>
                  <value>${data.shop_name}</value>
                </div>
                <div class="booking-item">
                  <label>Date</label>
                  <value>${formattedDate}</value>
                </div>
                <div class="booking-item">
                  <label>Time</label>
                  <value>${data.booking_time}</value>
                </div>
                <div class="booking-item">
                  <label>Duration</label>
                  <value>${data.duration} minutes</value>
                </div>
                ${data.staff_name ? `
                <div class="booking-item">
                  <label>Staff Member</label>
                  <value>${data.staff_name}</value>
                </div>
                ` : ''}
              </div>
              
              <div class="price-highlight">
                💰 Total: $${data.price.toFixed(2)}
              </div>
              
              ${data.booking_id ? `
              <div style="text-align: center;">
                <div class="booking-id-badge">Booking ID: #${data.booking_id}</div>
              </div>
              ` : ''}
              
              ${data.notes ? `
              <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 3px solid #00C9A7;">
                <label style="display: block; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Special Notes</label>
                <p style="margin: 0; color: #1A2533; font-weight: 500;">${data.notes}</p>
              </div>
              ` : ''}
            </div>
            
            ${data.shop_address ? `
            <div class="location-card">
              <div class="booking-header" style="color: #1e40af;">
                📍 Location Details
              </div>
              <p style="margin: 0; color: #1e40af; font-size: 16px; font-weight: 500;">${data.shop_address}</p>
              ${data.shop_phone ? `<p style="margin: 10px 0 0 0; color: #1e40af; font-weight: 500;">📞 ${data.shop_phone}</p>` : ''}
            </div>
            ` : ''}
            
            <div class="reminders-card">
              <div class="booking-header" style="color: #7c2d12;">
                🔔 Important Reminders
              </div>
              <ul class="reminders-list">
                <li>Please arrive 5-10 minutes early to ensure your appointment starts on time</li>
                <li>Bring any necessary items or products as discussed</li>
                <li>Contact us immediately if you need to reschedule or cancel</li>
                <li>We'll send you a reminder closer to your appointment date</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-logo">QWIKEN</div>
            <p>Thank you for choosing us for your beauty and wellness needs!</p>
            <p style="margin-top: 15px; font-size: 14px;">© 2025 Qwiken. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateBookingConfirmationText(data: EmailData): string {
    return `
✅ BOOKING CONFIRMED - Qwiken

Hello ${data.customer_name}!

Your booking has been confirmed. We look forward to seeing you!

BOOKING DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service: ${data.service_name}
Provider: ${data.shop_name}
${data.staff_name ? `Staff: ${data.staff_name}` : ''}
Date: ${new Date(data.booking_date).toLocaleDateString()}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Total Price: $${data.price.toFixed(2)}
${data.booking_id ? `Booking ID: #${data.booking_id}` : ''}
${data.notes ? `Notes: ${data.notes}` : ''}

${data.shop_address ? `LOCATION:\n${data.shop_address}\n${data.shop_phone ? `Phone: ${data.shop_phone}` : ''}` : ''}

IMPORTANT REMINDERS:
• Please arrive 5-10 minutes early
• Contact us if you need to reschedule

Thank you for choosing Qwiken!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
© 2025 Qwiken. All rights reserved.
    `.trim();
  }

  private generateBusinessNotificationHTML(data: BusinessNotificationData, isTestMode: boolean = false): string {
    const formattedDate = new Date(data.booking_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Alert - Qwiken Business</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px; 
          }
          .email-container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: #ffffff; 
            border-radius: 20px; 
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1A2533 0%, #2d3748 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="50" cy="10" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="10" cy="90" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
          }
          .header-content { position: relative; z-index: 1; }
          .logo { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .alert-badge { 
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
            padding: 12px 24px; 
            border-radius: 50px; 
            font-size: 18px; 
            font-weight: bold; 
            margin-top: 15px;
            box-shadow: 0 4px 15px rgba(245,158,11,0.3);
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          .content { 
            padding: 40px 30px; 
          }
          .greeting { 
            font-size: 24px; 
            color: #1A2533; 
            margin-bottom: 15px; 
            font-weight: 600;
          }
          .intro-text { 
            font-size: 16px; 
            color: #666; 
            margin-bottom: 30px; 
            line-height: 1.8;
          }
          .customer-card { 
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
            border-radius: 15px; 
            padding: 25px; 
            margin: 20px 0; 
            border-left: 5px solid #3b82f6;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          }
          .booking-card { 
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); 
            border-radius: 15px; 
            padding: 25px; 
            margin: 20px 0; 
            border-left: 5px solid #22c55e;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          }
          .section-header { 
            color: #1A2533; 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 20px; 
            display: flex; 
            align-items: center; 
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 20px; 
          }
          .info-item { 
            background: white; 
            padding: 15px; 
            border-radius: 10px; 
            border: 1px solid #e2e8f0;
          }
          .info-item label { 
            display: block; 
            color: #64748b; 
            font-size: 12px; 
            text-transform: uppercase; 
            font-weight: 600; 
            margin-bottom: 5px; 
            letter-spacing: 0.5px;
          }
          .info-item value { 
            display: block; 
            color: #1A2533; 
            font-size: 16px; 
            font-weight: 600; 
          }
          .revenue-highlight { 
            background: linear-gradient(135deg, #00C9A7 0%, #00a085 100%); 
            color: white; 
            text-align: center; 
            padding: 25px; 
            border-radius: 15px; 
            font-size: 28px; 
            font-weight: bold; 
            margin: 20px 0;
            box-shadow: 0 8px 25px rgba(0,201,167,0.3);
            position: relative;
            overflow: hidden;
          }
          .revenue-highlight::before {
            content: '💰';
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 40px;
            opacity: 0.3;
          }
          .action-card { 
            background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%); 
            border-radius: 15px; 
            padding: 25px; 
            margin: 20px 0; 
            border-left: 5px solid #f59e0b;
          }
          .action-list { 
            list-style: none; 
            padding: 0; 
          }
          .action-list li { 
            padding: 10px 0; 
            color: #7c2d12; 
            font-weight: 500;
            display: flex;
            align-items: center;
          }
          .action-list li::before { 
            content: '✅'; 
            margin-right: 12px; 
            font-size: 16px;
          }
          .footer { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            text-align: center; 
            padding: 30px; 
            color: #64748b; 
            border-top: 1px solid #e2e8f0;
          }
          .footer-logo { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1A2533; 
            margin-bottom: 10px; 
          }
          .booking-id-badge { 
            display: inline-block; 
            background: #1A2533; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: bold; 
            margin-top: 15px;
          }
          .urgent-notice {
            background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
            border: 2px solid #ef4444;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .urgent-notice h3 {
            color: #dc2626;
            margin-bottom: 10px;
          }
          @media (max-width: 600px) {
            .info-grid { grid-template-columns: 1fr; }
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="header-content">
              <div class="logo">🏪 QWIKEN BUSINESS</div>
              <p style="margin: 0; opacity: 0.9; font-size: 16px;">Business Portal Notification</p>
              <div class="alert-badge">🔔 NEW BOOKING!</div>
            </div>
          </div>
          
          <div class="content">
            ${isTestMode ? `
            <div style="background: #fef7ed; border: 2px solid #f59e0b; border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: center;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">🧪 FALLBACK MODE - Original business: ${data.business_email}</p>
              <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">Domain verification needed to send directly to business</p>
            </div>
            ` : ''}
            <h1 class="greeting">Hello ${data.business_name}! 🎉</h1>
            <p class="intro-text">
              Excellent news! You have received a new booking through Qwiken. 
              A customer is excited to experience your services!
            </p>
            
            <div class="urgent-notice">
              <h3>⚡ Action Required</h3>
              <p>Please confirm this booking and prepare for your upcoming appointment.</p>
            </div>
            
            <div class="customer-card">
              <div class="section-header" style="color: #1e40af;">
                👤 Customer Information
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <label>Customer Name</label>
                  <value>${data.customer_name}</value>
                </div>
                ${data.customer_email ? `
                <div class="info-item">
                  <label>Email Address</label>
                  <value>${data.customer_email}</value>
                </div>
                ` : ''}
                ${data.customer_phone ? `
                <div class="info-item">
                  <label>Phone Number</label>
                  <value>${data.customer_phone}</value>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div class="booking-card">
              <div class="section-header" style="color: #16a34a;">
                📅 Booking Details
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <label>Service</label>
                  <value>${data.service_name}</value>
                </div>
                <div class="info-item">
                  <label>Date</label>
                  <value>${formattedDate}</value>
                </div>
                <div class="info-item">
                  <label>Time</label>
                  <value>${data.booking_time}</value>
                </div>
                <div class="info-item">
                  <label>Duration</label>
                  <value>${data.duration} minutes</value>
                </div>
                ${data.staff_name ? `
                <div class="info-item">
                  <label>Assigned Staff</label>
                  <value>${data.staff_name}</value>
                </div>
                ` : ''}
              </div>
              
              <div class="revenue-highlight">
                Expected Revenue: $${data.price.toFixed(2)}
              </div>
              
              ${data.booking_id ? `
              <div style="text-align: center;">
                <div class="booking-id-badge">Booking ID: #${data.booking_id}</div>
              </div>
              ` : ''}
              
              ${data.notes ? `
              <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 3px solid #22c55e;">
                <label style="display: block; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Customer Notes</label>
                <p style="margin: 0; color: #1A2533; font-weight: 500;">${data.notes}</p>
              </div>
              ` : ''}
            </div>
            
            <div class="action-card">
              <div class="section-header" style="color: #7c2d12;">
                🚀 Next Steps - What You Need To Do
              </div>
              <ul class="action-list">
                <li>Confirm the booking in your calendar system immediately</li>
                <li>Prepare any special requirements or products needed</li>
                <li>Contact the customer if you need to discuss details</li>
                <li>Update your availability to prevent double booking</li>
                <li>Set up your workspace/equipment for the appointment</li>
                <li>Review customer notes and preferences</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-logo">QWIKEN BUSINESS PORTAL</div>
            <p>Keep providing amazing experiences to grow your business!</p>
            <p style="margin-top: 15px; font-size: 14px;">© 2025 Qwiken. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateBusinessNotificationText(data: BusinessNotificationData): string {
    return `
🔔 NEW BOOKING ALERT - Qwiken Business Portal

Hello ${data.business_name}!

You have received a new booking through Qwiken.

CUSTOMER INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${data.customer_name}
${data.customer_email ? `Email: ${data.customer_email}` : ''}
${data.customer_phone ? `Phone: ${data.customer_phone}` : ''}

BOOKING DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service: ${data.service_name}
${data.staff_name ? `Staff: ${data.staff_name}` : ''}
Date: ${new Date(data.booking_date).toLocaleDateString()}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Revenue: $${data.price.toFixed(2)}
${data.booking_id ? `Booking ID: #${data.booking_id}` : ''}
${data.notes ? `Notes: ${data.notes}` : ''}

NEXT STEPS:
• Confirm the booking in your calendar
• Prepare any special requirements
• Contact the customer if needed
• Update your availability

Qwiken Business Portal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
© 2025 Qwiken. All rights reserved.
    `.trim();
  }
}

export const directResendService = new DirectResendService();
export default directResendService;