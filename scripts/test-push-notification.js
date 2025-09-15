#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration - Update these values
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const USER_ID = process.env.USER_ID || '4e4da279-7195-4663-a4ce-4164057ece65'; // Default to your test user

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testPushNotification() {
  console.log(`${colors.cyan}${colors.bright}📱 Push Notification Test${colors.reset}\n`);

  // Validate configuration
  if (!SUPABASE_URL || SUPABASE_URL === 'https://your-project.supabase.co') {
    console.error(`${colors.red}❌ Please set SUPABASE_URL environment variable${colors.reset}`);
    console.log(`${colors.yellow}Example: SUPABASE_URL=https://your-project.supabase.co node scripts/test-push-notification.js${colors.reset}`);
    return;
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your-anon-key') {
    console.error(`${colors.red}❌ Please set SUPABASE_ANON_KEY environment variable${colors.reset}`);
    console.log(`${colors.yellow}Example: SUPABASE_ANON_KEY=your-key node scripts/test-push-notification.js${colors.reset}`);
    return;
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Different test notifications
  const testNotifications = [
    {
      title: '🎉 Test Notification',
      message: 'This is a test push notification from Qwiken!',
      data: { test: true, timestamp: new Date().toISOString() },
      type: 'test'
    },
    {
      title: '📅 Booking Reminder',
      message: 'Your appointment is tomorrow at 2:00 PM',
      data: { bookingId: 'test-123', reminderType: '24h' },
      type: 'booking_reminder'
    },
    {
      title: '✅ Booking Confirmed',
      message: 'Your booking has been confirmed!',
      data: { bookingId: 'test-456' },
      type: 'booking_confirmed'
    },
    {
      title: '🎁 Special Offer',
      message: 'Get 20% off your next booking!',
      data: { offerId: 'promo-789', discount: 20 },
      type: 'promotion'
    }
  ];

  console.log(`${colors.blue}Target User ID: ${USER_ID}${colors.reset}\n`);

  // Check if user has device tokens
  console.log(`${colors.yellow}🔍 Checking device tokens...${colors.reset}`);
  const { data: tokens, error: tokenError } = await supabase
    .from('device_tokens')
    .select('device_token, device_type, is_active')
    .eq('user_id', USER_ID)
    .eq('is_active', true);

  if (tokenError) {
    console.error(`${colors.red}❌ Error fetching device tokens:${colors.reset}`, tokenError);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.warn(`${colors.yellow}⚠️  No active device tokens found for user${colors.reset}`);
    console.log(`${colors.yellow}Please ensure:${colors.reset}`);
    console.log('1. The app is installed and running on a device');
    console.log('2. Push notifications are enabled');
    console.log('3. The user is signed in');
    return;
  }

  console.log(`${colors.green}✅ Found ${tokens.length} active device token(s)${colors.reset}`);
  tokens.forEach(token => {
    console.log(`   - ${token.device_type}: ${token.device_token.substring(0, 20)}...`);
  });
  console.log();

  // Select notification to send
  console.log(`${colors.blue}Select a notification to send:${colors.reset}`);
  testNotifications.forEach((notif, index) => {
    console.log(`${index + 1}. ${notif.title} - ${notif.message}`);
  });
  console.log('0. Send all notifications (with 3 second delay between each)');
  
  // For command line argument or default to first notification
  const selection = process.argv[2] ? parseInt(process.argv[2]) : 1;
  
  if (selection === 0) {
    // Send all notifications
    console.log(`\n${colors.cyan}📤 Sending all test notifications...${colors.reset}\n`);
    
    for (let i = 0; i < testNotifications.length; i++) {
      const notification = testNotifications[i];
      await sendNotification(supabase, USER_ID, notification);
      
      if (i < testNotifications.length - 1) {
        console.log(`${colors.yellow}⏳ Waiting 3 seconds...${colors.reset}\n`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } else if (selection >= 1 && selection <= testNotifications.length) {
    // Send selected notification
    const notification = testNotifications[selection - 1];
    console.log(`\n${colors.cyan}📤 Sending notification ${selection}...${colors.reset}\n`);
    await sendNotification(supabase, USER_ID, notification);
  } else {
    console.error(`${colors.red}Invalid selection. Please run with a number 0-${testNotifications.length}${colors.reset}`);
  }

  console.log(`\n${colors.green}${colors.bright}✅ Push notification test complete!${colors.reset}`);
}

async function sendNotification(supabase, userId, notification) {
  console.log(`${colors.blue}📱 Sending: ${notification.title}${colors.reset}`);
  console.log(`   Message: ${notification.message}`);
  console.log(`   Type: ${notification.type}`);
  console.log(`   Data:`, notification.data);

  try {
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: userId,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        type: notification.type
      }
    });

    if (error) {
      console.error(`${colors.red}❌ Error sending notification:${colors.reset}`, error);
      return;
    }

    if (data) {
      console.log(`${colors.green}✅ Notification sent successfully!${colors.reset}`);
      console.log(`   Sent: ${data.sent || 0}`);
      console.log(`   Failed: ${data.failed || 0}`);
      console.log(`   Total: ${data.total || 0}`);
      
      if (data.details && Array.isArray(data.details)) {
        data.details.forEach(detail => {
          if (detail.success) {
            console.log(`   ${colors.green}✓ ${detail.platform || 'unknown'}: Success${colors.reset}`);
          } else {
            console.log(`   ${colors.red}✗ ${detail.platform || 'unknown'}: ${detail.error || 'Failed'}${colors.reset}`);
          }
        });
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Unexpected error:${colors.reset}`, error);
  }
}

// Run the test with error handling
testPushNotification().catch(error => {
  console.error(`${colors.red}❌ Test failed:${colors.reset}`, error);
  process.exit(1);
});

// Instructions for users
if (process.argv.length < 3) {
  console.log(`\n${colors.yellow}Usage:${colors.reset}`);
  console.log('  node scripts/test-push-notification.js [selection]');
  console.log('  selection: 0 = all, 1-4 = specific notification\n');
  console.log(`${colors.yellow}Environment variables:${colors.reset}`);
  console.log('  SUPABASE_URL=https://your-project.supabase.co');
  console.log('  SUPABASE_ANON_KEY=your-anon-key');
  console.log('  USER_ID=target-user-id (optional)\n');
}