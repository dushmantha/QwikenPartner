import { supabase } from '../lib/supabase/index';

interface BookingEmailData {
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

interface ReminderEmailData extends BookingEmailData {
  hours_before: number;
}

interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

class BookingEmailService {
  private readonly FROM_EMAIL = 'onboarding@resend.dev';
  private readonly FROM_NAME = 'Qwiken Bookings';
  private readonly APP_NAME = 'Qwiken';

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(emailData: BookingEmailData): Promise<EmailResult> {
    try {
      console.log('📧 Sending booking confirmation email via Enhanced Edge Function:', emailData.to_email);

      // Use the enhanced Edge Function for customer confirmations
      const result = await this.sendCustomerConfirmationDirect(emailData);

      if (result.success) {
        console.log('✅ Booking confirmation email sent successfully');
        
        // Log email in database for tracking
        await this.logEmailSent({
          type: 'booking_confirmation',
          recipient: emailData.to_email,
          booking_id: emailData.booking_id,
          sent_at: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending booking confirmation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send confirmation email' 
      };
    }
  }

  /**
   * Send business notification email when new booking is created
   */
  async sendBusinessNotification(notificationData: BusinessNotificationData): Promise<EmailResult> {
    try {
      console.log('🏪 Sending business notification email:', notificationData.business_email);

      const emailTemplate = this.generateBusinessNotificationTemplate(notificationData);
      
      // Use the enhanced Edge Function for business notifications
      const result = await this.sendBusinessNotificationDirect(notificationData);

      if (result.success) {
        console.log('✅ Business notification email sent successfully');
        
        await this.logEmailSent({
          type: 'business_notification',
          recipient: notificationData.business_email,
          booking_id: notificationData.booking_id,
          sent_at: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending business notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send business notification' 
      };
    }
  }

  /**
   * Send booking reminder email (6 hours before appointment)
   */
  async sendBookingReminder(emailData: ReminderEmailData): Promise<EmailResult> {
    try {
      console.log('⏰ Sending booking reminder email:', emailData.to_email);

      const emailTemplate = this.generateReminderTemplate(emailData);
      
      const result = await this.sendEmail({
        to: emailData.to_email,
        subject: `Reminder: Your appointment at ${emailData.shop_name} is coming up!`,
        html: emailTemplate,
        text: this.generatePlainTextReminder(emailData)
      });

      if (result.success) {
        console.log('✅ Reminder email sent successfully');
        
        await this.logEmailSent({
          type: 'booking_reminder',
          recipient: emailData.to_email,
          booking_id: emailData.booking_id,
          sent_at: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending reminder email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send reminder email' 
      };
    }
  }

  /**
   * Generate booking confirmation HTML template
   */
  private generateBookingConfirmationTemplate(data: BookingEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - ${this.APP_NAME}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
            letter-spacing: 1px;
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
          .detail-label {
            color: #666;
            font-weight: 500;
          }
          .detail-value {
            color: #333;
            font-weight: 600;
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
          .action-button {
            display: inline-block;
            background: #9B79D9;
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin: 10px 5px;
          }
          .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .logo {
            font-size: 48px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Q</div>
            <h1>${this.APP_NAME}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Booking Confirmation</p>
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
                <span class="detail-label">Service:</span>
                <span class="detail-value">${data.service_name}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Provider:</span>
                <span class="detail-value">${data.shop_name}</span>
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
                <span class="detail-label">Total Price:</span>
                <span class="detail-value" style="color: #10B981; font-size: 18px;">$${data.price.toFixed(2)}</span>
              </div>
              
              ${data.notes ? `
              <div class="detail-row">
                <span class="detail-label">Notes:</span>
                <span class="detail-value">${data.notes}</span>
              </div>
              ` : ''}
            </div>
            
            ${data.shop_address ? `
            <div class="booking-details">
              <h3 style="margin-top: 0; color: #9B79D9;">Location</h3>
              <p style="margin: 0;">${data.shop_address}</p>
              ${data.shop_phone ? `<p style="margin: 5px 0;">Phone: ${data.shop_phone}</p>` : ''}
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="action-button">View Booking</a>
              <a href="#" class="action-button" style="background: #EF4444;">Cancel Booking</a>
            </div>
            
            <div style="background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>⏰ Reminder:</strong> We'll send you a reminder 6 hours before your appointment.
            </div>
            
            <p>If you need to reschedule or have any questions, please don't hesitate to contact us.</p>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing ${this.APP_NAME}!</p>
            <p style="margin: 5px 0;">© 2025 ${this.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate business notification HTML template
   */
  private generateBusinessNotificationTemplate(data: BusinessNotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Notification - ${this.APP_NAME}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
            background: linear-gradient(135deg, #1A2533 0%, #0F1419 100%);
            color: white; 
            padding: 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 1px;
          }
          .content { 
            padding: 30px;
          }
          .alert-badge {
            display: inline-block;
            background: #00C9A7;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            margin: 20px 0;
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
          .detail-label {
            color: #666;
            font-weight: 500;
          }
          .detail-value {
            color: #333;
            font-weight: 600;
          }
          .customer-info {
            background: #E3F2FD;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
          }
          .action-button {
            display: inline-block;
            background: #1A2533;
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin: 10px 5px;
          }
          .action-button.accept {
            background: #00C9A7;
          }
          .action-button.decline {
            background: #EF4444;
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
            <h1>📅 New Booking</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${this.APP_NAME} Business Portal</p>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <span class="alert-badge">🔔 New Booking Alert</span>
            </div>
            
            <h2>Hello ${data.business_name}!</h2>
            
            <p>You have received a new booking through ${this.APP_NAME}. Here are the details:</p>
            
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
                <span class="detail-label">Assigned Staff:</span>
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
                <span class="detail-label">Customer Notes:</span>
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
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="action-button accept">✓ Accept Booking</a>
              <a href="#" class="action-button">📞 Contact Customer</a>
              <a href="#" class="action-button decline">✗ Decline Booking</a>
            </div>
            
            <div style="background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>💡 Quick Actions:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Confirm the booking to send automatic confirmation to the customer</li>
                <li>Update your calendar to block this time slot</li>
                <li>Prepare any special requirements mentioned in notes</li>
              </ul>
            </div>
            
            <p style="text-align: center; color: #666;">
              This booking was made through ${this.APP_NAME}. Please respond promptly to maintain good customer service.
            </p>
          </div>
          
          <div class="footer">
            <p>Manage your bookings on ${this.APP_NAME} Business Portal</p>
            <p style="margin: 5px 0;">© 2025 ${this.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate reminder HTML template
   */
  private generateReminderTemplate(data: ReminderEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Reminder - ${this.APP_NAME}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
            background: linear-gradient(135deg, #F97316 0%, #F59E0B 100%);
            color: white; 
            padding: 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 1px;
          }
          .content { 
            padding: 30px;
          }
          .reminder-box {
            background: #FFF3CD;
            border: 2px solid #FFC107;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .time-remaining {
            font-size: 36px;
            font-weight: bold;
            color: #F97316;
            margin: 10px 0;
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
          .detail-label {
            color: #666;
            font-weight: 500;
          }
          .detail-value {
            color: #333;
            font-weight: 600;
          }
          .action-button {
            display: inline-block;
            background: #9B79D9;
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin: 10px 5px;
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
            <h1>⏰ Appointment Reminder</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${this.APP_NAME}</p>
          </div>
          
          <div class="content">
            <h2>Hi ${data.customer_name}!</h2>
            
            <div class="reminder-box">
              <p style="margin: 0; font-size: 18px;">Your appointment is coming up in</p>
              <div class="time-remaining">${data.hours_before} HOURS</div>
              <p style="margin: 0;">Don't forget!</p>
            </div>
            
            <div class="booking-details">
              <h3 style="margin-top: 0; color: #F97316;">Appointment Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${data.service_name}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Provider:</span>
                <span class="detail-value">${data.shop_name}</span>
              </div>
              
              ${data.staff_name ? `
              <div class="detail-row">
                <span class="detail-label">Staff:</span>
                <span class="detail-value">${data.staff_name}</span>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${data.booking_time}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${data.duration} minutes</span>
              </div>
            </div>
            
            ${data.shop_address ? `
            <div class="booking-details">
              <h3 style="margin-top: 0; color: #F97316;">📍 Location</h3>
              <p style="margin: 0;">${data.shop_address}</p>
              ${data.shop_phone ? `<p style="margin: 5px 0;">Phone: ${data.shop_phone}</p>` : ''}
              <div style="text-align: center; margin-top: 15px;">
                <a href="https://maps.google.com/?q=${encodeURIComponent(data.shop_address)}" class="action-button">Get Directions</a>
              </div>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="action-button">View Booking</a>
              <a href="#" class="action-button" style="background: #EF4444;">Need to Reschedule?</a>
            </div>
            
            <p style="text-align: center; color: #666;">
              We look forward to seeing you soon! If you need to cancel or reschedule, 
              please let us know as soon as possible.
            </p>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing ${this.APP_NAME}!</p>
            <p style="margin: 5px 0;">© 2025 ${this.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text confirmation
   */
  private generatePlainTextConfirmation(data: BookingEmailData): string {
    return `
Booking Confirmation - ${this.APP_NAME}

Hello ${data.customer_name}!

Your booking has been confirmed. We look forward to seeing you!

BOOKING DETAILS:
----------------
Service: ${data.service_name}
Provider: ${data.shop_name}
${data.staff_name ? `Staff: ${data.staff_name}` : ''}
Date: ${new Date(data.booking_date).toLocaleDateString()}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Total Price: $${data.price.toFixed(2)}
${data.notes ? `Notes: ${data.notes}` : ''}

${data.shop_address ? `
LOCATION:
---------
${data.shop_address}
${data.shop_phone ? `Phone: ${data.shop_phone}` : ''}
` : ''}

We'll send you a reminder 6 hours before your appointment.

If you need to reschedule or have any questions, please don't hesitate to contact us.

Thank you for choosing ${this.APP_NAME}!
    `.trim();
  }

  /**
   * Generate plain text business notification
   */
  private generatePlainTextBusinessNotification(data: BusinessNotificationData): string {
    return `
New Booking Notification - ${this.APP_NAME}

Hello ${data.business_name}!

You have received a new booking through ${this.APP_NAME}.

CUSTOMER INFORMATION:
--------------------
Name: ${data.customer_name}
${data.customer_phone ? `Phone: ${data.customer_phone}` : ''}
${data.customer_email ? `Email: ${data.customer_email}` : ''}

BOOKING DETAILS:
----------------
Service: ${data.service_name}
${data.staff_name ? `Assigned Staff: ${data.staff_name}` : ''}
Date: ${new Date(data.booking_date).toLocaleDateString()}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Revenue: $${data.price.toFixed(2)}
${data.notes ? `Customer Notes: ${data.notes}` : ''}
${data.booking_id ? `Booking ID: #${data.booking_id}` : ''}

QUICK ACTIONS:
--------------
- Confirm the booking to send automatic confirmation to the customer
- Update your calendar to block this time slot
- Prepare any special requirements mentioned in notes

Please respond promptly to maintain good customer service.

Manage your bookings on ${this.APP_NAME} Business Portal.

© 2025 ${this.APP_NAME}. All rights reserved.
    `.trim();
  }

  /**
   * Generate plain text reminder
   */
  private generatePlainTextReminder(data: ReminderEmailData): string {
    return `
Appointment Reminder - ${this.APP_NAME}

Hi ${data.customer_name}!

This is a friendly reminder that your appointment is coming up in ${data.hours_before} HOURS!

APPOINTMENT DETAILS:
-------------------
Service: ${data.service_name}
Provider: ${data.shop_name}
${data.staff_name ? `Staff: ${data.staff_name}` : ''}
Time: ${data.booking_time}
Duration: ${data.duration} minutes

${data.shop_address ? `
LOCATION:
---------
${data.shop_address}
${data.shop_phone ? `Phone: ${data.shop_phone}` : ''}
` : ''}

We look forward to seeing you soon!

If you need to cancel or reschedule, please let us know as soon as possible.

Thank you for choosing ${this.APP_NAME}!
    `.trim();
  }

  /**
   * Send business notification directly via enhanced Edge Function
   */
  private async sendCustomerConfirmationDirect(emailData: BookingEmailData): Promise<EmailResult> {
    try {
      const SUPABASE_URL = supabase.supabaseUrl;
      const SUPABASE_ANON_KEY = supabase.supabaseKey;
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing');
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/send-booking-email-enhanced`;
      
      console.log('📧 Calling enhanced Edge Function for customer confirmation:', functionUrl);
      console.log('📧 Customer confirmation data:', emailData);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'booking_confirmation',
          ...emailData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Enhanced customer confirmation response:', result);
        return { 
          success: true, 
          messageId: result.messageId,
          message: result.message 
        };
      } else {
        const errorText = await response.text();
        console.error('❌ Enhanced customer confirmation error:', errorText);
        throw new Error(`Enhanced Edge Function error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Customer confirmation direct call error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send customer confirmation' 
      };
    }
  }

  private async sendBusinessNotificationDirect(notificationData: BusinessNotificationData): Promise<EmailResult> {
    try {
      const SUPABASE_URL = supabase.supabaseUrl;
      const SUPABASE_ANON_KEY = supabase.supabaseKey;
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing');
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/send-booking-email-enhanced`;
      
      console.log('🏪 Calling enhanced Edge Function for business notification:', functionUrl);
      console.log('🏪 Business notification data:', notificationData);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'business_notification',
          ...notificationData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Enhanced business notification response:', result);
        return { 
          success: true, 
          messageId: result.messageId || result.id || 'business-email-sent'
        };
      } else {
        const error = await response.text();
        console.error('❌ Enhanced business notification error:', error);
        console.error('❌ Response status:', response.status);
        return { success: false, error: error, messageId: 'enhanced-function-error-' + Date.now() };
      }
    } catch (error) {
      console.error('❌ Error sending enhanced business notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error', messageId: 'network-error-' + Date.now() };
    }
  }

  /**
   * Send booking confirmation email via enhanced Edge Function
   */
  private async sendBookingEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: string;
    emailData: BookingEmailData;
  }): Promise<EmailResult> {
    try {
      const SUPABASE_URL = supabase.supabaseUrl;
      const SUPABASE_ANON_KEY = supabase.supabaseKey;
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing');
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/send-booking-email-enhanced`;
      
      console.log('📧 Calling enhanced Edge Function for booking confirmation:', functionUrl);
      console.log('📧 Sending to customer email:', params.to);
      console.log('📧 Booking confirmation data:', params.emailData);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'booking_confirmation',
          ...params.emailData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Booking confirmation Edge Function response:', result);
        return { 
          success: true, 
          messageId: result.messageId || result.id || 'booking-email-sent'
        };
      } else {
        const error = await response.text();
        console.error('❌ Booking confirmation Edge Function error:', error);
        console.error('❌ Response status:', response.status);
        return { success: false, error: error, messageId: 'booking-edge-function-error-' + Date.now() };
      }
    } catch (error) {
      console.error('❌ Error sending booking confirmation email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error', messageId: 'booking-network-error-' + Date.now() };
    }
  }

  /**
   * Send business notification email via enhanced Edge Function
   */
  private async sendBusinessEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: string;
    notificationData: BusinessNotificationData;
  }): Promise<EmailResult> {
    try {
      const SUPABASE_URL = supabase.supabaseUrl;
      const SUPABASE_ANON_KEY = supabase.supabaseKey;
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing');
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/send-booking-email-enhanced`;
      
      console.log('🏪 Calling enhanced Edge Function for business notification:', functionUrl);
      console.log('🏪 Sending to business email:', params.to);
      console.log('🏪 Business notification data:', params.notificationData);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'business_notification',
          ...params.notificationData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Business notification Edge Function response:', result);
        return { 
          success: true, 
          messageId: result.messageId || result.id || 'business-email-sent'
        };
      } else {
        const error = await response.text();
        console.error('❌ Business notification Edge Function error:', error);
        console.error('❌ Response status:', response.status);
        return { success: false, error: error, messageId: 'business-edge-function-error-' + Date.now() };
      }
    } catch (error) {
      console.error('❌ Error sending business notification email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error', messageId: 'business-network-error-' + Date.now() };
    }
  }

  /**
   * Send email via Supabase Edge Function
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type?: string;
  }): Promise<EmailResult> {
    try {
      const SUPABASE_URL = supabase.supabaseUrl;
      const SUPABASE_ANON_KEY = supabase.supabaseKey;
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing');
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/send-email`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          type: params.type || 'general',
          from_email: this.FROM_EMAIL,
          from_name: this.FROM_NAME
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return { 
          success: true, 
          messageId: result.messageId || result.id || 'email-sent'
        };
      } else {
        const error = await response.text();
        console.error('Email function error:', error);
        
        // Check if function doesn't exist
        if (response.status === 404) {
          console.warn('⚠️ Email function not deployed - will trigger fallback');
          console.log('📧 Fallback needed for:', params.to);
          return { success: false, error: 'Function not deployed', messageId: 'function-not-deployed-' + Date.now() };
        }
        
        // Other errors - trigger fallback
        console.log('📧 Edge Function error - will trigger fallback');
        console.log('To:', params.to);
        console.log('Subject:', params.subject);
        
        return { success: false, error: error, messageId: 'edge-function-error-' + Date.now() };
      }
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Network/connection error - trigger fallback
      console.log('📧 Network error - will trigger fallback');
      console.log('To:', params.to);
      console.log('Subject:', params.subject);
      
      return { success: false, error: error instanceof Error ? error.message : 'Network error', messageId: 'network-error-' + Date.now() };
    }
  }

  /**
   * Log email sent for tracking
   */
  private async logEmailSent(data: {
    type: string;
    recipient: string;
    booking_id?: string;
    sent_at: string;
  }): Promise<void> {
    try {
      await supabase
        .from('email_logs')
        .insert({
          type: data.type,
          recipient: data.recipient,
          booking_id: data.booking_id,
          sent_at: data.sent_at,
          status: 'sent'
        });
    } catch (error) {
      console.warn('Failed to log email:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Schedule reminder email for 6 hours before appointment
   */
  async scheduleReminder(bookingData: BookingEmailData): Promise<EmailResult> {
    try {
      const bookingDateTime = new Date(`${bookingData.booking_date} ${bookingData.booking_time}`);
      const reminderTime = new Date(bookingDateTime.getTime() - 6 * 60 * 60 * 1000); // 6 hours before
      
      // Store scheduled reminder in database
      const { error } = await supabase
        .from('scheduled_reminders')
        .insert({
          booking_id: bookingData.booking_id,
          recipient_email: bookingData.to_email,
          scheduled_time: reminderTime.toISOString(),
          reminder_type: '6_hour',
          status: 'pending',
          booking_data: bookingData
        });

      if (error) {
        console.error('Failed to schedule reminder:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Reminder scheduled for:', reminderTime.toISOString());
      return { success: true };
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to schedule reminder' 
      };
    }
  }
}

export const bookingEmailService = new BookingEmailService();
export default bookingEmailService;