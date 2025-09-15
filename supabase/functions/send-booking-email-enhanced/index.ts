import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const emailType = requestBody.type || 'booking_confirmation';
    
    console.log(`📧 Processing ${emailType} email request`);
    console.log('Request keys:', Object.keys(requestBody));

    // Validate request based on email type
    if (emailType === 'business_notification') {
      return await handleBusinessNotification(requestBody);
    } else {
      return await handleBookingConfirmation(requestBody);
    }

  } catch (error) {
    console.error('❌ Email function error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to process email request'
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function handleBookingConfirmation(data: BookingEmailData) {
  console.log('📧 Handling booking confirmation for:', data.to_email);
  console.log('📅 CUSTOMER EMAIL - booking_date received:', data.booking_date);
  console.log('📅 CUSTOMER EMAIL - booking_date type:', typeof data.booking_date);
  
  // Validate required fields
  if (!data.to_email || !data.customer_name || !data.shop_name || !data.service_name) {
    throw new Error('Missing required fields for booking confirmation');
  }

  const html = generateBookingConfirmationHTML(data);
  const subject = `Booking Confirmed - ${data.service_name} at ${data.shop_name}`;
  
  return await sendEmailViaResend({
    to: data.to_email,
    subject,
    html,
    type: 'booking_confirmation'
  });
}

async function handleBusinessNotification(data: BusinessNotificationData) {
  console.log('🏪 Handling business notification for:', data.business_email);
  console.log('📅 BUSINESS EMAIL - booking_date received:', data.booking_date);
  console.log('📅 BUSINESS EMAIL - booking_date type:', typeof data.booking_date);
  
  // Validate required fields
  if (!data.business_email || !data.customer_name || !data.service_name) {
    throw new Error('Missing required fields for business notification');
  }

  const html = generateBusinessNotificationHTML(data);
  const subject = `New Booking: ${data.service_name} - ${data.customer_name}`;
  
  return await sendEmailViaResend({
    to: data.business_email,
    subject,
    html,
    type: 'business_notification'
  });
}

async function sendEmailViaResend({ to, subject, html, type }: { 
  to: string; 
  subject: string; 
  html: string; 
  type: string; 
}) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured');
    // Return success in development mode for testing
    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: 'dev-' + Date.now(),
        message: `${type} email would be sent (development mode)`,
        to: to,
        subject: subject
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Determine sender based on type - using verified Resend emails
  const fromAddress = type === 'business_notification' 
    ? 'Qwiken Business <admin@qwiken.org>'
    : 'Qwiken <noreply@qwiken.org>';

  const emailData = {
    from: fromAddress,
    to: [to],
    subject: subject,
    html: html
  };

  console.log(`📧 Sending ${type} email via Resend...`);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resend API error:', errorText);
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ ${type} email sent successfully:`, result.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: `${type} email sent successfully`,
        to: to,
        subject: subject
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ ${type} email error:`, error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: `Failed to send ${type} email`
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

function formatBookingDate(dateString: string): string {
  try {
    console.log('📅 Formatting date string:', dateString);
    
    // Handle various date formats
    let dateObj: Date;
    
    // If it's already a valid date string, parse it
    if (dateString) {
      dateObj = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('⚠️ Invalid date, using current date:', dateString);
        dateObj = new Date();
      }
    } else {
      console.warn('⚠️ No date provided, using current date');
      dateObj = new Date();
    }
    
    const formatted = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    console.log('📅 Formatted date result:', formatted);
    return formatted;
  } catch (error) {
    console.error('❌ Date formatting error:', error);
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

function generateBookingConfirmationHTML(data: BookingEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmation - Qwiken</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #2c3e50; 
          margin: 0; 
          padding: 0; 
          background: #f0f2f5;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #1A2533 0%, #2D3748 100%);
          color: white; 
          padding: 50px 30px 40px;
          text-align: center; 
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 15s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
        .logo-container {
          display: inline-block;
          background: white;
          width: 80px;
          height: 80px;
          border-radius: 20px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          position: relative;
          z-index: 1;
        }
        .logo-text {
          font-size: 36px;
          font-weight: bold;
          line-height: 80px;
          background: linear-gradient(135deg, #1A2533 0%, #2D3748 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header h1 { 
          font-size: 28px; 
          font-weight: 300;
          letter-spacing: 1px;
          margin-bottom: 10px;
          position: relative;
          z-index: 1;
        }
        .header p { 
          opacity: 0.95; 
          font-size: 16px;
          font-weight: 400;
          position: relative;
          z-index: 1;
        }
        .content { 
          padding: 40px 30px; 
          background: white;
        }
        .success-container {
          text-align: center;
          margin-bottom: 35px;
        }
        .success-icon {
          display: inline-block;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 50%;
          line-height: 60px;
          font-size: 28px;
          margin-bottom: 15px;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }
        .success-text {
          color: #059669;
          font-size: 18px;
          font-weight: 600;
        }
        .greeting { 
          font-size: 26px; 
          font-weight: 700; 
          color: #1a202c;
          margin-bottom: 12px;
          text-align: center;
        }
        .message { 
          font-size: 16px; 
          color: #64748b; 
          margin-bottom: 35px;
          text-align: center;
          line-height: 1.6;
        }
        .booking-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          margin: 30px 0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .booking-header {
          background: linear-gradient(135deg, #f6f8fb 0%, #e5e7eb 100%);
          padding: 20px 25px;
          border-bottom: 2px solid #e5e7eb;
        }
        .booking-header h3 {
          color: #374151;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .booking-body {
          padding: 25px;
        }
        .detail-grid {
          display: grid;
          gap: 20px;
        }
        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 8px;
          min-height: 50px;
        }
        .detail-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 8px;
        }
        .detail-content {
          flex: 1;
          padding-top: 4px;
        }
        .detail-label {
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
          line-height: 1.2;
        }
        .detail-value {
          color: #1f2937;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1px;
        }
        .price-item {
          background: linear-gradient(135deg, #FFF3CD 0%, #FFC107 100%);
          padding: 20px;
          border-radius: 12px;
          margin-top: 20px;
        }
        .price-item .detail-item {
          margin-bottom: 0;
          min-height: auto;
        }
        .price-item .detail-icon {
          background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%);
          margin-top: 4px;
        }
        .price-item .detail-content {
          padding-top: 2px;
        }
        .price-item .detail-value {
          color: #1A2533;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }
        .location-card {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 16px;
          padding: 25px;
          margin: 30px 0;
          border: 2px solid #93c5fd;
        }
        .location-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        .location-header h3 {
          color: #1e40af;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .location-details {
          color: #1e3a8a;
          font-size: 15px;
          line-height: 1.6;
        }
        .location-details p {
          margin: 8px 0;
        }
        .help-section {
          background: linear-gradient(135deg, #FEF3E2 0%, #FED7AA 100%);
          border-radius: 12px;
          padding: 20px;
          margin: 30px 0;
          text-align: center;
          border: 1px solid #FF3B30;
        }
        .help-section p {
          color: #1A2533;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.6;
        }
        .footer { 
          background: linear-gradient(135deg, #1A2533 0%, #2D3748 100%);
          color: white; 
          padding: 40px 30px;
          text-align: center; 
        }
        .social-links {
          margin: 20px 0;
        }
        .social-link {
          display: inline-block;
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          margin: 0 8px;
          line-height: 36px;
          font-size: 18px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
        }
        .social-link:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .footer-text {
          margin: 10px 0;
          opacity: 0.9;
          font-size: 14px;
        }
        .footer-brand {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            <div class="logo-text">Q</div>
          </div>
          <h1>Booking Confirmation</h1>
          <p>Your appointment is confirmed!</p>
        </div>
        
        <div class="content">
          <div class="success-container">
            <div class="success-icon">✓</div>
            <div class="success-text">Booking Successfully Confirmed</div>
          </div>
          
          <h2 class="greeting">Hello ${data.customer_name}! 👋</h2>
          <p class="message">Your appointment has been secured. We're excited to see you!</p>
          
          <div class="booking-card">
            <div class="booking-header">
              <h3>📋 Appointment Details</h3>
            </div>
            <div class="booking-body">
              <div class="detail-grid">
            
                <div class="detail-item">
                  <div class="detail-icon">✂️</div>
                  <div class="detail-content">
                    <div class="detail-label">Service</div>
                    <div class="detail-value">${data.service_name}</div>
                  </div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-icon">🏪</div>
                  <div class="detail-content">
                    <div class="detail-label">Provider</div>
                    <div class="detail-value">${data.shop_name}</div>
                  </div>
                </div>
                
                ${data.staff_name ? `
                <div class="detail-item">
                  <div class="detail-icon">👤</div>
                  <div class="detail-content">
                    <div class="detail-label">Staff Member</div>
                    <div class="detail-value">${data.staff_name}</div>
                  </div>
                </div>` : ''}
                
                <div class="detail-item">
                  <div class="detail-icon">📅</div>
                  <div class="detail-content">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${formatBookingDate(data.booking_date)}</div>
                  </div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-icon">🕐</div>
                  <div class="detail-content">
                    <div class="detail-label">Time</div>
                    <div class="detail-value">${data.booking_time}</div>
                  </div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-icon">⏱️</div>
                  <div class="detail-content">
                    <div class="detail-label">Duration</div>
                    <div class="detail-value">${data.duration} minutes</div>
                  </div>
                </div>
                
                ${data.notes ? `
                <div class="detail-item">
                  <div class="detail-icon">📝</div>
                  <div class="detail-content">
                    <div class="detail-label">Special Notes</div>
                    <div class="detail-value">${data.notes}</div>
                  </div>
                </div>` : ''}
                
                <div class="price-item">
                  <div class="detail-item">
                    <div class="detail-icon">💰</div>
                    <div class="detail-content">
                      <div class="detail-label">Total Amount</div>
                      <div class="detail-value">$${data.price.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          ${data.shop_address ? `
          <div class="location-card">
            <div class="location-header">
              <span style="font-size: 24px;">📍</span>
              <h3>Location Details</h3>
            </div>
            <div class="location-details">
              <p><strong>${data.shop_address}</strong></p>
              ${data.shop_phone ? `<p>📞 Contact: ${data.shop_phone}</p>` : ''}
            </div>
          </div>` : ''}
          
          <div class="help-section">
            <p>💬 <strong>Need Help?</strong><br>
            If you need to reschedule or have any questions,<br>
            please don't hesitate to contact us!</p>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-brand">Qwiken</div>
          <div class="footer-text">Making appointments simple and convenient</div>
          <div class="social-links">
            <a href="#" class="social-link">📧</a>
            <a href="#" class="social-link">📱</a>
            <a href="#" class="social-link">🌐</a>
          </div>
          <div class="footer-text">© 2025 Qwiken. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateBusinessNotificationHTML(data: BusinessNotificationData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Booking Notification - Qwiken</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1A2533 0%, #0F1419 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px; }
        .alert-badge { display: inline-block; background: #00C9A7; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 20px 0; }
        .booking-details { background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .customer-info { background: #E3F2FD; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; font-weight: 500; }
        .detail-value { color: #333; font-weight: 600; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Booking</h1>
          <p>Qwiken Business Portal</p>
        </div>
        
        <div class="content">
          <div style="text-align: center;">
            <span class="alert-badge">🔔 New Booking Alert</span>
          </div>
          
          <h2>Hello ${data.business_name}!</h2>
          <p>You have received a new booking through Qwiken. Here are the details:</p>
          
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
            </div>` : ''}
            ${data.customer_email ? `
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${data.customer_email}</span>
            </div>` : ''}
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
            </div>` : ''}
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${formatBookingDate(data.booking_date)}</span>
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
            </div>` : ''}
            
            ${data.booking_id ? `
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span class="detail-value">#${data.booking_id}</span>
            </div>` : ''}
          </div>
          
          <p style="text-align: center; color: #666;">
            This booking was made through Qwiken. Please respond promptly to maintain good customer service.
          </p>
        </div>
        
        <div class="footer">
          <p>Manage your bookings on Qwiken Business Portal</p>
          <p>© 2025 Qwiken. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}