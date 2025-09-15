/**
 * Test Email Edge Functions
 * Tests both customer confirmation and business notification emails
 */

const PROJECT_ID = 'fezdmxvqurczeqmqvgzm';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

console.log('🧪 Testing Email Edge Functions');
console.log('================================');

async function testCustomerConfirmationEmail() {
  console.log('\n1️⃣ Testing Customer Confirmation Email...');
  
  const customerEmailData = {
    to_email: 'customer@test.com',
    customer_name: 'John Doe',
    shop_name: 'Beauty Salon Plus',
    service_name: 'Hair Cut & Styling',
    booking_date: '2025-01-15',
    booking_time: '14:30',
    duration: 60,
    price: 75.00,
    staff_name: 'Sarah Johnson',
    shop_address: '123 Main St, New York, NY 10001',
    shop_phone: '+1 (555) 123-4567',
    booking_id: 'BK-2025-001',
    notes: 'Please bring your own hair products'
  };

  try {
    const response = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/send-booking-email-enhanced`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'booking_confirmation',
        ...customerEmailData
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Customer confirmation email test PASSED');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Recipient: ${result.to}`);
    } else {
      console.log('❌ Customer confirmation email test FAILED');
      console.log('   Error:', result.error || result.message);
    }
  } catch (error) {
    console.log('❌ Customer confirmation email test ERROR');
    console.log('   Network error:', error.message);
  }
}

async function testBusinessNotificationEmail() {
  console.log('\n2️⃣ Testing Business Notification Email...');
  
  const businessEmailData = {
    business_email: 'owner@beautysalonplus.com',
    business_name: 'Beauty Salon Plus',
    customer_name: 'John Doe',
    customer_phone: '+1 (555) 987-6543',
    customer_email: 'customer@test.com',
    service_name: 'Hair Cut & Styling',
    booking_date: '2025-01-15',
    booking_time: '14:30',
    duration: 60,
    price: 75.00,
    staff_name: 'Sarah Johnson',
    booking_id: 'BK-2025-001',
    notes: 'Please bring your own hair products'
  };

  try {
    const response = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/send-booking-email-enhanced`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'business_notification',
        ...businessEmailData
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Business notification email test PASSED');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Recipient: ${result.to}`);
    } else {
      console.log('❌ Business notification email test FAILED');
      console.log('   Error:', result.error || result.message);
    }
  } catch (error) {
    console.log('❌ Business notification email test ERROR');
    console.log('   Network error:', error.message);
  }
}

async function testLegacySendEmailFunction() {
  console.log('\n3️⃣ Testing Legacy Send-Email Function...');
  
  const emailData = {
    to: 'test@example.com',
    subject: 'Test Booking Confirmation',
    html: '<h1>Test Email</h1><p>This is a test booking confirmation email.</p>',
    type: 'booking_confirmation'
  };

  try {
    const response = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Legacy send-email function test PASSED');
      console.log(`   Message ID: ${result.messageId}`);
    } else {
      console.log('❌ Legacy send-email function test FAILED');
      console.log('   Error:', result.error || result.message);
    }
  } catch (error) {
    console.log('❌ Legacy send-email function test ERROR');
    console.log('   Network error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Email Edge Function Tests...\n');
  
  await testCustomerConfirmationEmail();
  await testBusinessNotificationEmail(); 
  await testLegacySendEmailFunction();
  
  console.log('\n🏁 Email Edge Function Tests Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy the Edge Functions if tests fail');
  console.log('2. Set RESEND_API_KEY in Supabase environment variables');
  console.log('3. Test actual booking flow in the app');
  console.log('4. Verify both customer and business owner receive emails');
}

// Run the tests
runAllTests().catch(console.error);