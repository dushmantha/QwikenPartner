// Test Booking Email Function
// Run this after setting up the RESEND_API_KEY in Supabase

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

async function testBookingEmail() {
  console.log('📧 Testing booking email function...');
  
  const emailData = {
    to: 'tdmihiran@gmail.com', // Your verified email
    subject: 'Test Booking Confirmation - Qwiken',
    html: `
      <h2>🎉 Booking Confirmed!</h2>
      <p><strong>Dear Test Customer,</strong></p>
      <p>Your booking has been confirmed!</p>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📅 Booking Details:</h3>
        <p><strong>Service:</strong> Test Service</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Time:</strong> 2:00 PM</p>
        <p><strong>Duration:</strong> 60 minutes</p>
        <p><strong>Price:</strong> $50.00</p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>🏢 Shop Information:</h3>
        <p><strong>Shop:</strong> Test Business</p>
        <p><strong>Address:</strong> 123 Main Street, Test City</p>
        <p><strong>Phone:</strong> (555) 123-4567</p>
      </div>
      
      <p>We look forward to seeing you soon!</p>
      <p>If you need to cancel or reschedule, please let us know as soon as possible.</p>
      <p><strong>Thank you for choosing Qwiken! 🚀</strong></p>
    `,
    text: 'Booking Confirmed! Your test booking has been confirmed for Test Service on ' + new Date().toLocaleDateString() + ' at 2:00 PM. Price: $50.00. Thank you for choosing Qwiken!',
    type: 'booking_confirmation'
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('📬 Sent to:', result.to);
      console.log('📝 Subject:', result.subject);
      console.log('');
      console.log('🎉 Check your email (tdmihiran@gmail.com) for the test booking confirmation!');
      console.log('📱 If you don\'t see it, check your spam folder.');
    } else {
      console.log('❌ Email failed:');
      console.log('Error:', result.error || result.message);
      
      if (result.error && result.error.includes('403')) {
        console.log('');
        console.log('💡 This error means:');
        console.log('   - Your API key is working! ✅');
        console.log('   - You need to verify a domain in Resend to send to other emails');
        console.log('   - For now, emails will only work with tdmihiran@gmail.com');
        console.log('');
        console.log('🔧 To fix: Add your domain at https://resend.com/domains');
      } else if (result.error && result.error.includes('RESEND_API_KEY')) {
        console.log('');
        console.log('💡 Next steps:');
        console.log('   1. Go to Supabase Dashboard → Edge Functions → Secrets');
        console.log('   2. Add RESEND_API_KEY = re_PKmy3ee7_MeeTA3fmRfm7qToco9fHraXg');
        console.log('   3. Run this test again');
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('');
    console.log('💡 Make sure:');
    console.log('   1. RESEND_API_KEY is set in Supabase Edge Functions');
    console.log('   2. The send-email function is deployed');
  }
}

testBookingEmail();