/**
 * Test Resend Email Service
 */

const RESEND_API_KEY = 're_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt';
const API_URL = 'https://api.resend.com/emails';
const TEST_EMAIL = 'tdmihiran@gmail.com';

async function testResendEmail() {
  console.log('📧 Testing Resend Email Service...');
  console.log('🔑 API Key:', RESEND_API_KEY ? 'Present' : 'Missing');
  console.log('📬 Test Email:', TEST_EMAIL);
  console.log('');

  const emailPayload = {
    from: 'Qwiken Test <onboarding@resend.dev>',
    to: [TEST_EMAIL],
    subject: '✅ Test Email - Booking System',
    html: `
      <h1>Test Email</h1>
      <p>This is a test email to verify the Resend email service is working.</p>
      <p>If you receive this email, the service is configured correctly.</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `,
    text: `Test Email - This is a test to verify the Resend service. Timestamp: ${new Date().toISOString()}`
  };

  try {
    console.log('📤 Sending test email...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response OK:', response.ok);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Email sent successfully');
      console.log('📧 Message ID:', result.id);
      console.log('📧 Full result:', result);
      return { success: true, messageId: result.id };
    } else {
      const errorText = await response.text();
      console.error('❌ FAILED! Email sending failed');
      console.error('📧 Status:', response.status);
      console.error('📧 Error:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR!', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testResendEmail()
  .then(result => {
    console.log('');
    console.log('🎯 Final Result:', result);
    console.log('');
    if (result.success) {
      console.log('🎉 Email service is working! Check tdmihiran@gmail.com for the test email.');
    } else {
      console.log('💥 Email service has issues. Check the error above.');
    }
  })
  .catch(err => {
    console.error('💥 Test failed:', err);
  });