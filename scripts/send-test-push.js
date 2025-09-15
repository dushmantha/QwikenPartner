#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

async function sendTestPush() {
  console.log('🚀 Sending Test Push Notification...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test notification payload
  const notificationData = {
    title: '🔧 Push Notification Test',
    message: 'This is a test notification to verify push notifications are working after the token save fix.',
    data: {
      type: 'test',
      timestamp: new Date().toISOString(),
      source: 'debug-script'
    }
  };
  
  console.log('📱 Notification payload:', notificationData);
  
  // Try to send via edge function
  try {
    console.log('📤 Calling send-push-notification edge function...');
    
    const { data, error } = await supabase.functions.invoke('send-push-notification-v2', {
      body: {
        userId: '4e4da279-7195-4663-a4ce-4164057ece65', // Your test user ID
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data
      }
    });
    
    if (error) {
      console.error('❌ Edge function error:', error);
      
      if (error.message && error.message.includes('No active device tokens')) {
        console.log('\n💡 This confirms the issue - no tokens in database!');
        console.log('✅ The enhanced push service should fix this by:');
        console.log('   1. Providing detailed logging during token registration');
        console.log('   2. Storing tokens as pending when authentication fails');
        console.log('   3. Processing pending tokens after login');
        console.log('   4. Adding debug methods to check current state');
        console.log('\n🔍 Next steps:');
        console.log('   1. Run the app with the enhanced push service');
        console.log('   2. Check console logs for detailed token registration info');
        console.log('   3. Use pushNotificationService.debugTokenState() to check state');
        console.log('   4. Login/logout to test the pending token flow');
      }
    } else {
      console.log('✅ Push notification sent successfully!');
      console.log('📊 Response data:', data);
    }
    
  } catch (error) {
    console.error('❌ Failed to send push notification:', error);
  }
}

sendTestPush().catch(console.error);