/**
 * Test the full booking email flow
 */

// Import the DirectResend service logic
const RESEND_API_KEY = 're_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt';
const API_URL = 'https://api.resend.com/emails';

class TestDirectResendService {
  constructor() {
    this.RESEND_API_KEY = RESEND_API_KEY;
    this.API_URL = API_URL;
    this.VERIFIED_EMAIL = 'tdmihiran@gmail.com';
    this.FROM_EMAIL_CUSTOMER = 'Qwiken Bookings <onboarding@resend.dev>';
    this.FROM_EMAIL_BUSINESS = 'Qwiken Business Portal <onboarding@resend.dev>';
  }

  async sendBookingConfirmation(emailData) {
    const customerEmail = emailData.to_email;
    console.log('📧 [Test] Sending booking confirmation to customer and monitoring');
    console.log('   👤 Customer Email:', customerEmail);
    console.log('   📋 Verified Email:', this.VERIFIED_EMAIL);

    const results = [];

    // Customer email payload
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
        console.log('✅ Customer email sent successfully:', customerResult.id);
        results.push({ recipient: customerEmail, success: true, messageId: customerResult.id });
      } else {
        const errorText = await customerResponse.text();
        console.error('❌ Customer email failed:', errorText);
        results.push({ recipient: customerEmail, success: false, error: errorText });
      }
    } catch (error) {
      console.error('❌ Customer email error:', error);
      results.push({ recipient: customerEmail, success: false, error: error.message });
    }

    // Monitoring email (always send to verified email)
    if (customerEmail !== this.VERIFIED_EMAIL) {
      const monitoringEmailPayload = {
        from: this.FROM_EMAIL_CUSTOMER,
        to: [this.VERIFIED_EMAIL],
        subject: `[COPY for ${customerEmail}] ✅ Booking Confirmed - ${emailData.service_name} at ${emailData.shop_name}`,
        html: this.generateBookingConfirmationHTML(emailData, true),
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
          console.log('✅ Monitoring email sent successfully:', monitoringResult.id);
          results.push({ recipient: this.VERIFIED_EMAIL, success: true, messageId: monitoringResult.id, type: 'monitoring' });
        } else {
          const errorText = await monitoringResponse.text();
          console.error('❌ Monitoring email failed:', errorText);
          results.push({ recipient: this.VERIFIED_EMAIL, success: false, error: errorText, type: 'monitoring' });
        }
      } catch (error) {
        console.error('❌ Monitoring email error:', error);
        results.push({ recipient: this.VERIFIED_EMAIL, success: false, error: error.message, type: 'monitoring' });
      }
    }

    console.log('📧 Email sending completed. Results:', results);
    return {
      success: true,
      results: results,
      customerEmailSent: results.find(r => r.recipient === customerEmail)?.success || false,
      monitoringEmailSent: results.find(r => r.type === 'monitoring')?.success || false
    };
  }

  async sendBusinessNotification(notificationData) {
    const businessEmail = notificationData.business_email;
    console.log('🏪 [Test] Sending business notification');
    console.log('   🏪 Business Email:', businessEmail);

    const businessEmailPayload = {
      from: this.FROM_EMAIL_BUSINESS,
      to: [businessEmail],
      subject: `🔔 New Booking: ${notificationData.service_name} - ${notificationData.customer_name}`,
      html: this.generateBusinessNotificationHTML(notificationData),
      text: this.generateBusinessNotificationText(notificationData)
    };

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessEmailPayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Business email sent successfully:', result.id);
        return { success: true, messageId: result.id };
      } else {
        const errorText = await response.text();
        console.error('❌ Business email failed:', errorText);
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error('❌ Business email error:', error);
      return { success: false, error: error.message };
    }
  }

  generateBookingConfirmationHTML(data, isMonitoring = false) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        ${isMonitoring ? '<div style="background: #ff9800; color: white; padding: 10px; text-align: center; margin-bottom: 20px;"><strong>MONITORING COPY - Original sent to: ' + data.to_email + '</strong></div>' : ''}
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
          <h1 style="color: #2196F3; text-align: center;">Booking Confirmed! ✅</h1>
          
          <h2>Hello ${data.customer_name}!</h2>
          
          <p>Great news! Your booking has been confirmed.</p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details</h3>
            <p><strong>Service:</strong> ${data.service_name}</p>
            <p><strong>Provider:</strong> ${data.shop_name}</p>
            <p><strong>Date:</strong> ${data.booking_date}</p>
            <p><strong>Time:</strong> ${data.booking_time}</p>
            <p><strong>Duration:</strong> ${data.duration} minutes</p>
            <p><strong>Total Price:</strong> $${data.price.toFixed(2)}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <p>We look forward to seeing you!</p>
        </div>
      </body>
      </html>
    `;
  }

  generateBookingConfirmationText(data) {
    return `Booking Confirmed!
    
Hello ${data.customer_name}!

Your booking has been confirmed:

Service: ${data.service_name}
Provider: ${data.shop_name}
Date: ${data.booking_date}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Total Price: $${data.price.toFixed(2)}
${data.notes ? `Notes: ${data.notes}` : ''}

We look forward to seeing you!`;
  }

  generateBusinessNotificationHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
          <h1 style="color: #4CAF50; text-align: center;">New Booking Alert! 🔔</h1>
          
          <h2>Hello ${data.business_name}!</h2>
          
          <p>You have received a new booking.</p>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${data.customer_name}</p>
            ${data.customer_email ? `<p><strong>Email:</strong> ${data.customer_email}</p>` : ''}
            ${data.customer_phone ? `<p><strong>Phone:</strong> ${data.customer_phone}</p>` : ''}
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details</h3>
            <p><strong>Service:</strong> ${data.service_name}</p>
            <p><strong>Date:</strong> ${data.booking_date}</p>
            <p><strong>Time:</strong> ${data.booking_time}</p>
            <p><strong>Duration:</strong> ${data.duration} minutes</p>
            <p><strong>Revenue:</strong> $${data.price.toFixed(2)}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <p>Please confirm this booking as soon as possible.</p>
        </div>
      </body>
      </html>
    `;
  }

  generateBusinessNotificationText(data) {
    return `New Booking Alert!

Hello ${data.business_name}!

Customer Information:
Name: ${data.customer_name}
${data.customer_email ? `Email: ${data.customer_email}` : ''}
${data.customer_phone ? `Phone: ${data.customer_phone}` : ''}

Booking Details:
Service: ${data.service_name}
Date: ${data.booking_date}
Time: ${data.booking_time}
Duration: ${data.duration} minutes
Revenue: $${data.price.toFixed(2)}
${data.notes ? `Notes: ${data.notes}` : ''}

Please confirm this booking as soon as possible.`;
  }
}

// Test the full email flow
async function testBookingEmailFlow() {
  console.log('📧 Testing Full Booking Email Flow');
  console.log('==================================');
  console.log('');

  const testService = new TestDirectResendService();

  // Test data
  const customerEmailData = {
    to_email: 'tdmihiran@gmail.com',
    customer_name: 'John Doe',
    shop_name: 'Hair Studio Pro',
    service_name: 'Hair Cut & Style',
    booking_date: '2025-01-10',
    booking_time: '14:00',
    duration: 90,
    price: 85.00,
    notes: 'Test booking to verify email notifications'
  };

  const businessNotificationData = {
    business_email: 'tdmihiran@gmail.com',
    business_name: 'Hair Studio Pro',
    customer_name: 'John Doe',
    customer_email: 'tdmihiran@gmail.com',
    service_name: 'Hair Cut & Style',
    booking_date: '2025-01-10',
    booking_time: '14:00',
    duration: 90,
    price: 85.00,
    notes: 'Test booking to verify email notifications'
  };

  console.log('1️⃣ Sending customer confirmation email...');
  const customerResult = await testService.sendBookingConfirmation(customerEmailData);
  
  console.log('');
  console.log('2️⃣ Sending business notification email...');
  const businessResult = await testService.sendBusinessNotification(businessNotificationData);

  console.log('');
  console.log('📊 RESULTS:');
  console.log('===========');
  console.log('Customer Email Success:', customerResult.customerEmailSent);
  console.log('Monitoring Email Success:', customerResult.monitoringEmailSent);
  console.log('Business Email Success:', businessResult.success);
  console.log('');
  console.log('🎯 Both customer and business should have received emails at: tdmihiran@gmail.com');
  console.log('📧 Check your inbox for:');
  console.log('   1. Customer booking confirmation');
  console.log('   2. Monitoring copy of customer email');
  console.log('   3. Business notification email');
}

// Run the test
testBookingEmailFlow().catch(console.error);