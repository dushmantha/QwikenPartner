/**
 * Test script to verify push notification setup with FCM v1 API
 * Run this after setting up your Firebase Service Account in Supabase
 * 
 * Usage:
 * 1. Get your Supabase project URL and service role key
 * 2. Replace the values below
 * 3. Run: node test-push-notification.js
 */

const SUPABASE_URL = 'your-project-url.supabase.co';
const SUPABASE_SERVICE_KEY = 'your-service-role-key';
const TEST_USER_ID = 'user-uuid-here';

async function testPushNotification() {
  try {
    console.log('🧪 Testing push notification setup...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        title: 'Test Notification',
        message: 'Push notifications are working! 🎉',
        data: {
          type: 'test',
          screen: 'home'
        }
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Push notification test successful!');
      console.log('📊 Result:', result);
    } else {
      console.log('❌ Push notification test failed:');
      console.log('🔍 Error:', result);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run test
testPushNotification();