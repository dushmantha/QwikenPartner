#!/usr/bin/env node

/**
 * Test the updated send-email function with booking format
 */

const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

async function testUpdatedEmailFunction() {
  console.log('🧪 Testing updated send-email function with booking format...');
  
  try {
    // Test booking email data (new format)
    const bookingEmailData = {
      to: 'test@example.com', // Replace with your email for testing
      subject: 'Test Booking Confirmation - Qwiken',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9B79D9;">Test Booking Confirmation</h2>
          <p>This is a test of the updated email function with booking format.</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Test Booking Details</h3>
            <p><strong>Service:</strong> Test Service</p>
            <p><strong>Date:</strong> 2025-01-16</p>
            <p><strong>Time:</strong> 10:00 AM</p>
            <p><strong>Duration:</strong> 60 minutes</p>
            <p><strong>Price:</strong> $100.00</p>
          </div>
          <p>If you receive this email, the updated booking email system is working!</p>
        </div>
      `,
      text: 'Test Booking Confirmation - Updated email function test',
      from_email: 'bookings@qwiken.com',
      from_name: 'Qwiken Bookings'
    };

    console.log('📧 Sending test booking email to:', bookingEmailData.to);

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingEmailData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Updated email function test successful!');
      console.log('📧 Result:', result);
      
      if (result.messageId && result.messageId.startsWith('dev-')) {
        console.log('💡 Function is working but in development mode (no RESEND_API_KEY)');
      } else if (result.messageId) {
        console.log('🎉 Email actually sent via Resend API!');
      }
    } else {
      console.log('❌ Updated email function test failed');
      console.log('📧 Error:', result);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function main() {
  console.log('📧 Updated Email Function Test');
  console.log('==============================');
  
  await testUpdatedEmailFunction();
  
  console.log('\n📝 Next steps:');
  console.log('1. If test succeeds, the booking emails should work');
  console.log('2. Check React Native logs when creating a booking to see email debug info');
  console.log('3. Make sure user is signed in with a valid email address');
}

main().catch(console.error);