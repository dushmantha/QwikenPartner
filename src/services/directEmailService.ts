/**
 * Direct email service that sends emails directly via Resend API
 * Bypasses Supabase Edge Functions for immediate functionality
 * 
 * PRODUCTION MODE ENABLED
 * - Emails are sent to actual recipients
 * - Using Resend API with onboarding@resend.dev (testing domain)
 * 
 * For custom domain setup:
 *   1. Verify your domain at https://resend.com/domains
 *   2. Update the FROM_EMAIL to use your verified domain
 *   3. Replace the API key with a production key
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

class DirectEmailService {
  private readonly RESEND_API_KEY = 're_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt';
  private readonly FROM_EMAIL = 'onboarding@resend.dev';
  private readonly FROM_NAME = 'Qwiken Bookings';

  async sendBookingConfirmation(emailData: EmailData): Promise<EmailResult> {
    try {
      // Production mode - sending to actual recipients
      const isTestMode = false; // Production mode enabled
      const recipientEmail = emailData.to_email;
      
      console.log('📧 Direct email: Sending confirmation to:', recipientEmail);

      const htmlContent = this.generateConfirmationHTML(emailData);
      const textContent = this.generateConfirmationText(emailData);

      // Send directly via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.FROM_NAME} <${this.FROM_EMAIL}>`,
          to: [recipientEmail],
          subject: `Booking Confirmed - ${emailData.service_name} at ${emailData.shop_name}`,
          html: htmlContent,
          text: textContent
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Direct email sent successfully:', result.id);
        return { success: true, messageId: result.id };
      } else {
        const error = await response.text();
        console.error('❌ Direct email failed:', error);
        return { success: false, error: `Email API error: ${error}` };
      }
    } catch (error) {
      console.error('❌ Direct email service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendBusinessNotification(notificationData: BusinessNotificationData): Promise<EmailResult> {
    try {
      // Production mode - sending to actual recipients
      const isTestMode = false; // Production mode enabled
      const recipientEmail = notificationData.business_email;
      
      console.log('🏪 Direct email: Sending business notification to:', recipientEmail);

      const htmlContent = this.generateBusinessNotificationHTML(notificationData);
      const textContent = this.generateBusinessNotificationText(notificationData);

      // Send directly via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.FROM_NAME} <${this.FROM_EMAIL}>`,
          to: [recipientEmail],
          subject: `New Booking: ${notificationData.service_name} - ${notificationData.customer_name}`,
          html: htmlContent,
          text: textContent
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Direct business notification sent successfully:', result.id);
        return { success: true, messageId: result.id };
      } else {
        const error = await response.text();
        console.error('❌ Direct business notification failed:', error);
        return { success: false, error: `Email API error: ${error}` };
      }
    } catch (error) {
      console.error('❌ Direct business notification error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private generateConfirmationHTML(data: EmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - Qwiken</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #9B79D9 0%, #7B59B9 100%);
            color: white; 
            padding: 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
          }
          .content { 
            padding: 30px;
          }
          .booking-details {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .success-badge {
            display: inline-block;
            background: #10B981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            margin: 20px 0;
          }
          .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
            <p style="margin: 10px 0 0 0;">Qwiken</p>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <span class="success-badge">✓ Booking Confirmed</span>
            </div>
            
            <h2>Hello ${data.customer_name}!</h2>
            
            <p>Great news! Your booking has been confirmed. We look forward to seeing you!</p>
            
            <div class="booking-details">
              <h3 style="margin-top: 0; color: #9B79D9;">Booking Details</h3>
              
              <div class="detail-row">
                <span>Service:</span>
                <strong>${data.service_name}</strong>
              </div>
              
              <div class="detail-row">
                <span>Provider:</span>
                <strong>${data.shop_name}</strong>
              </div>
              
              ${data.staff_name ? `
              <div class="detail-row">
                <span>Staff:</span>
                <strong>${data.staff_name}</strong>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span>Date:</span>
                <strong>${new Date(data.booking_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</strong>
              </div>
              
              <div class="detail-row">
                <span>Time:</span>
                <strong>${data.booking_time}</strong>
              </div>
              
              <div class="detail-row">
                <span>Duration:</span>
                <strong>${data.duration} minutes</strong>
              </div>
              
              <div class="detail-row">
                <span>Total Price:</span>
                <strong style="color: #10B981; font-size: 18px;">$${data.price.toFixed(2)}</strong>
              </div>
            </div>
            
            ${data.shop_address ? `
            <div class="booking-details">
              <h3 style="margin-top: 0; color: #9B79D9;">📍 Location</h3>
              <p style="margin: 0;">${data.shop_address}</p>
              ${data.shop_phone ? `<p style="margin: 5px 0;">Phone: ${data.shop_phone}</p>` : ''}
            </div>
            ` : ''}
            
            <div style="background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>⏰ Reminder:</strong> We'll send you a reminder 6 hours before your appointment.
            </div>
            
            <p>If you need to reschedule or have any questions, please don't hesitate to contact us.</p>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing Qwiken!</p>
            <p style="margin: 5px 0;">© 2025 Qwiken. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateConfirmationText(data: EmailData): string {
    return `
Booking Confirmation - Qwiken

Hello ${data.customer_name}!

Your booking has been confirmed. We look forward to seeing you!

BOOKING DETAILS:
Service: ${data.service_name}
Provider: ${data.shop_name}
${data.staff_name ? `Staff: ${data.staff_name}` : ''}
Date: ${new Date(data.booking_date).toLocaleDateString()}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Total Price: $${data.price.toFixed(2)}

${data.shop_address ? `Location: ${data.shop_address}` : ''}

We'll send you a reminder 6 hours before your appointment.

Thank you for choosing Qwiken!
    `.trim();
  }

  private generateBusinessNotificationHTML(data: BusinessNotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Booking - ${data.business_name}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1A2533 0%, #0F1419 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .alert-badge { display: inline-block; background: #00C9A7; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 20px 0; }
          .booking-details { background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #666; font-weight: 500; }
          .detail-value { color: #333; font-weight: 600; }
          .customer-info { background: #E3F2FD; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 New Booking Alert</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Qwiken Business Portal</p>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <span class="alert-badge">🔔 New Booking</span>
            </div>
            
            <h2>Hello ${data.business_name}!</h2>
            <p>You have received a new booking through Qwiken.</p>
            
            <div class="customer-info">
              <h3 style="margin-top: 0; color: #2196F3;">👤 Customer Information</h3>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${data.customer_name}</span>
              </div>
              ${data.customer_phone ? `
              <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${data.customer_phone}</span>
              </div>
              ` : ''}
              ${data.customer_email ? `
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${data.customer_email}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="booking-details">
              <h3 style="margin-top: 0; color: #1A2533;">📋 Booking Details</h3>
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${data.service_name}</span>
              </div>
              ${data.staff_name ? `
              <div class="detail-row">
                <span class="detail-label">Staff:</span>
                <span class="detail-value">${data.staff_name}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${new Date(data.booking_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${data.booking_time}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${data.duration} minutes</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Revenue:</span>
                <span class="detail-value" style="color: #00C9A7; font-size: 18px;">$${data.price.toFixed(2)}</span>
              </div>
              ${data.notes ? `
              <div class="detail-row">
                <span class="detail-label">Notes:</span>
                <span class="detail-value">${data.notes}</span>
              </div>
              ` : ''}
              ${data.booking_id ? `
              <div class="detail-row">
                <span class="detail-label">Booking ID:</span>
                <span class="detail-value">#${data.booking_id}</span>
              </div>
              ` : ''}
            </div>
            
            <div style="background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>💡 Next Steps:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Confirm the booking</li>
                <li>Update your calendar</li>
                <li>Prepare for the appointment</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>Qwiken Business Portal</p>
            <p style="margin: 5px 0;">© 2025 Qwiken. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateBusinessNotificationText(data: BusinessNotificationData): string {
    return `
New Booking Alert - Qwiken

Hello ${data.business_name}!

You have received a new booking through Qwiken.

CUSTOMER INFORMATION:
Name: ${data.customer_name}
${data.customer_phone ? `Phone: ${data.customer_phone}` : ''}
${data.customer_email ? `Email: ${data.customer_email}` : ''}

BOOKING DETAILS:
Service: ${data.service_name}
${data.staff_name ? `Staff: ${data.staff_name}` : ''}
Date: ${new Date(data.booking_date).toLocaleDateString()}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Revenue: $${data.price.toFixed(2)}
${data.notes ? `Notes: ${data.notes}` : ''}
${data.booking_id ? `Booking ID: #${data.booking_id}` : ''}

NEXT STEPS:
- Confirm the booking
- Update your calendar
- Prepare for the appointment

Please respond promptly to maintain good customer service.

Qwiken Business Portal
© 2025 Qwiken. All rights reserved.
    `.trim();
  }
}

export const directEmailService = new DirectEmailService();
export default directEmailService;