#!/usr/bin/env node

/**
 * Test the booking email function
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailFunction() {
  console.log('🧪 Testing booking email function...');
  
  try {
    // Test email data
    const testEmailData = {
      to: 'test@example.com', // Replace with your email for testing
      subject: 'Test Booking Confirmation - Qwiken',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9B79D9;">Test Booking Confirmation</h2>
          <p>This is a test email to verify the booking email system is working.</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Test Booking Details</h3>
            <p><strong>Service:</strong> Test Service</p>
            <p><strong>Date:</strong> 2025-01-16</p>
            <p><strong>Time:</strong> 10:00 AM</p>
            <p><strong>Duration:</strong> 60 minutes</p>
            <p><strong>Price:</strong> $100.00</p>
          </div>
          <p>If you receive this email, the booking email system is working correctly!</p>
        </div>
      `,
      text: 'Test Booking Confirmation - This is a test email to verify the booking email system is working.',
      from_email: 'bookings@qwiken.com',
      from_name: 'Qwiken Bookings'
    };

    console.log('📧 Sending test email to:', testEmailData.to);

    // Call the Supabase Edge Function
    const functionUrl = `${supabaseUrl}/functions/v1/send-booking-email`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email function test successful!');
      console.log('📧 Result:', result);
    } else {
      console.log('❌ Email function test failed');
      console.log('📧 Error:', result);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testDirectEdgeFunction() {
  console.log('\n🔍 Testing if send-booking-email function exists...');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (response.ok) {
      console.log('✅ send-booking-email function exists and responds to CORS');
    } else {
      console.log('❌ send-booking-email function not accessible:', response.status);
    }
  } catch (error) {
    console.error('❌ Function test failed:', error.message);
  }
}

async function main() {
  console.log('📧 Email Function Test Tool');
  console.log('===========================');
  
  await testDirectEdgeFunction();
  await testEmailFunction();
  
  console.log('\n📝 Notes:');
  console.log('- If the function doesn\'t exist, deploy it using: npx supabase functions deploy send-booking-email');
  console.log('- Make sure RESEND_API_KEY is set in Supabase environment variables');
  console.log('- Check the logs in Supabase dashboard for detailed error information');
}

main().catch(console.error);