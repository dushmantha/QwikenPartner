/**
 * Test booking emails with specific addresses:
 * Shop Owner: tdmihiran@gmail.com
 * Customer: sathyamalji@gmail.com
 */

const RESEND_API_KEY = 're_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt';
const API_URL = 'https://api.resend.com/emails';

// Email addresses
const SHOP_OWNER_EMAIL = 'tdmihiran@gmail.com';
const CUSTOMER_EMAIL = 'sathyamalji@gmail.com';

class TestEmailService {
  constructor() {
    this.RESEND_API_KEY = RESEND_API_KEY;
    this.API_URL = API_URL;
    this.FROM_EMAIL_CUSTOMER = 'Qwiken Bookings <onboarding@resend.dev>';
    this.FROM_EMAIL_BUSINESS = 'Qwiken Business Portal <onboarding@resend.dev>';
  }

  async sendEmail(payload) {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, messageId: result.id };
      } else {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendCustomerConfirmation(bookingData) {
    console.log(`📧 Sending CUSTOMER confirmation to: ${CUSTOMER_EMAIL}`);
    
    const emailPayload = {
      from: this.FROM_EMAIL_CUSTOMER,
      to: [CUSTOMER_EMAIL],
      subject: `✅ Booking Confirmed - ${bookingData.service_name} at ${bookingData.shop_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #9B79D9 0%, #7B59B9 100%); color: white; padding: 20px; border-radius: 8px;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your appointment is all set</p>
              </div>
            </div>
            
            <h2 style="color: #333;">Hello ${bookingData.customer_name}!</h2>
            
            <p style="font-size: 16px; color: #555;">Great news! Your booking has been confirmed. We look forward to seeing you!</p>
            
            <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #9B79D9;">📋 Booking Details</h3>
              
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Service:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.service_name}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Provider:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.shop_name}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Date:</span>
                  <span style="color: #333; font-weight: 600;">${new Date(bookingData.booking_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Time:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.booking_time}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Duration:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.duration} minutes</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="color: #666; font-weight: 500;">Total Price:</span>
                  <span style="color: #10B981; font-weight: 600; font-size: 18px;">$${bookingData.price.toFixed(2)} NZD</span>
                </div>
              </div>
            </div>
            
            <div style="background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>⏰ Reminder:</strong> We'll send you a reminder 6 hours before your appointment.
            </div>
            
            <p style="color: #666; text-align: center;">If you need to reschedule or have any questions, please don't hesitate to contact us.</p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 14px;">Thank you for choosing Qwiken!</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Booking Confirmed!

Hello ${bookingData.customer_name}!

Your booking has been confirmed:

Service: ${bookingData.service_name}
Provider: ${bookingData.shop_name}
Date: ${bookingData.booking_date}
Time: ${bookingData.booking_time}
Duration: ${bookingData.duration} minutes
Total Price: $${bookingData.price.toFixed(2)} NZD

We'll send you a reminder 6 hours before your appointment.

If you need to reschedule or have any questions, please don't hesitate to contact us.

Thank you for choosing Qwiken!`
    };

    const result = await this.sendEmail(emailPayload);
    console.log(`   ${result.success ? '✅' : '❌'} Customer email result:`, result.success ? `Success (${result.messageId})` : result.error);
    return result;
  }

  async sendBusinessNotification(bookingData) {
    console.log(`🏪 Sending BUSINESS notification to: ${SHOP_OWNER_EMAIL}`);
    
    const emailPayload = {
      from: this.FROM_EMAIL_BUSINESS,
      to: [SHOP_OWNER_EMAIL],
      subject: `🔔 New Booking: ${bookingData.service_name} - ${bookingData.customer_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #1A2533 0%, #0F1419 100%); color: white; padding: 20px; border-radius: 8px;">
                <h1 style="margin: 0; font-size: 28px;">🔔 New Booking Alert</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Qwiken Business Portal</p>
              </div>
            </div>
            
            <h2 style="color: #333;">Hello ${bookingData.business_name}!</h2>
            
            <p style="font-size: 16px; color: #555;">You have received a new booking through Qwiken. Here are the details:</p>
            
            <div style="background: #E3F2FD; border-left: 4px solid #2196F3; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin-top: 0; color: #2196F3;">👤 Customer Information</h3>
              
              <div style="display: grid; gap: 8px;">
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                  <span style="color: #666; font-weight: 500;">Name:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.customer_name}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                  <span style="color: #666; font-weight: 500;">Email:</span>
                  <span style="color: #333; font-weight: 600;">${CUSTOMER_EMAIL}</span>
                </div>
              </div>
            </div>
            
            <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #1A2533;">📋 Booking Details</h3>
              
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Service:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.service_name}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Date:</span>
                  <span style="color: #333; font-weight: 600;">${new Date(bookingData.booking_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Time:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.booking_time}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                  <span style="color: #666; font-weight: 500;">Duration:</span>
                  <span style="color: #333; font-weight: 600;">${bookingData.duration} minutes</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="color: #666; font-weight: 500;">Revenue:</span>
                  <span style="color: #00C9A7; font-weight: 600; font-size: 18px;">$${bookingData.price.toFixed(2)} NZD</span>
                </div>
              </div>
            </div>
            
            <div style="background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <strong>💡 Quick Actions:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Confirm the booking to send automatic confirmation to the customer</li>
                <li>Update your calendar to block this time slot</li>
                <li>Prepare any special requirements mentioned</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 14px;">Manage your bookings on Qwiken Business Portal</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New Booking Alert!

Hello ${bookingData.business_name}!

You have received a new booking through Qwiken.

Customer Information:
Name: ${bookingData.customer_name}
Email: ${CUSTOMER_EMAIL}

Booking Details:
Service: ${bookingData.service_name}
Date: ${bookingData.booking_date}
Time: ${bookingData.booking_time}
Duration: ${bookingData.duration} minutes
Revenue: $${bookingData.price.toFixed(2)} NZD

Quick Actions:
- Confirm the booking to send automatic confirmation to the customer
- Update your calendar to block this time slot
- Prepare any special requirements mentioned

Please respond promptly to maintain good customer service.

Manage your bookings on Qwiken Business Portal.`
    };

    const result = await this.sendEmail(emailPayload);
    console.log(`   ${result.success ? '✅' : '❌'} Business email result:`, result.success ? `Success (${result.messageId})` : result.error);
    return result;
  }
}

// Test with specific emails
async function testSpecificEmails() {
  console.log('📧 Testing Booking Emails with Specific Addresses');
  console.log('===============================================');
  console.log('👤 Customer Email: sathyamalji@gmail.com');
  console.log('🏪 Shop Owner Email: tdmihiran@gmail.com');
  console.log('');

  const testService = new TestEmailService();

  // Test booking data
  const bookingData = {
    customer_name: 'Sathya Malji',
    shop_name: 'Elite Hair Studio',
    business_name: 'Elite Hair Studio',
    service_name: 'Premium Hair Cut & Style',
    booking_date: '2025-01-15',
    booking_time: '10:30 AM',
    duration: 90,
    price: 125.00
  };

  console.log('📋 Booking Details:');
  console.log('   Service:', bookingData.service_name);
  console.log('   Date:', bookingData.booking_date);
  console.log('   Time:', bookingData.booking_time);
  console.log('   Price: $' + bookingData.price.toFixed(2) + ' NZD');
  console.log('');

  console.log('🚀 Sending emails...');
  console.log('');

  // Send customer confirmation
  const customerResult = await testService.sendCustomerConfirmation(bookingData);
  
  console.log('');
  
  // Send business notification
  const businessResult = await testService.sendBusinessNotification(bookingData);

  console.log('');
  console.log('📊 FINAL RESULTS:');
  console.log('=================');
  console.log(`📧 Customer confirmation sent to sathyamalji@gmail.com: ${customerResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`🏪 Business notification sent to tdmihiran@gmail.com: ${businessResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log('');
  
  if (customerResult.success && businessResult.success) {
    console.log('🎉 BOTH EMAILS SENT SUCCESSFULLY!');
    console.log('');
    console.log('📬 Expected Results:');
    console.log('   • sathyamalji@gmail.com should receive: "Booking Confirmed" email');
    console.log('   • tdmihiran@gmail.com should receive: "New Booking Alert" email');
    console.log('');
    console.log('⏰ Check both inboxes (including spam folders) within the next few minutes!');
  } else {
    console.log('❌ Some emails failed to send. Check the errors above.');
  }
}

// Run the test
testSpecificEmails().catch(console.error);