#!/usr/bin/env node

/**
 * Push Notification Test Script
 * 
 * This script sends push notifications through Supabase Edge Functions
 * which use Firebase Cloud Messaging to deliver notifications to iOS/Android devices.
 * 
 * Usage:
 *   node scripts/test-push.js --user-id="your-user-id"
 *   node scripts/test-push.js --user-id="your-user-id" --title="Custom Title" --message="Custom Message"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    userId: null,
    title: '🧪 Test Notification',
    message: `Test push notification sent at ${new Date().toLocaleTimeString()}`,
    data: {
      type: 'test',
      timestamp: new Date().toISOString(),
      source: 'local-script'
    }
  };

  args.forEach(arg => {
    if (arg.startsWith('--user-id=')) {
      config.userId = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--title=')) {
      config.title = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--message=')) {
      config.message = arg.split('=')[1].replace(/"/g, '');
    }
  });

  return config;
}

// Send push notification via Supabase Edge Function
function sendPushNotification(config) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      userId: config.userId,
      title: config.title,
      message: config.message,
      data: config.data
    });

    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      port: 443,
      path: '/functions/v1/send-push-notification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Get user device tokens for verification
function getUserDeviceTokens(userId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      port: 443,
      path: `/rest/v1/device_tokens?user_id=eq.${userId}&is_active=eq.true`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Main function
async function main() {
  console.log('🚀 Push Notification Test Script');
  console.log('================================\n');

  const config = parseArgs();

  // Validate required arguments
  if (!config.userId) {
    console.error('❌ Error: --user-id is required');
    console.log('\nUsage:');
    console.log('  node scripts/test-push.js --user-id="your-user-id"');
    console.log('  node scripts/test-push.js --user-id="your-user-id" --title="Custom Title"');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   User ID: ${config.userId}`);
  console.log(`   Title: ${config.title}`);
  console.log(`   Message: ${config.message}\n`);

  try {
    // Step 1: Check user's device tokens
    console.log('🔍 Checking user device tokens...');
    const tokensResponse = await getUserDeviceTokens(config.userId);
    
    if (tokensResponse.status !== 200) {
      console.error('❌ Failed to fetch device tokens:', tokensResponse.data);
      process.exit(1);
    }

    const tokens = tokensResponse.data;
    console.log(`📱 Found ${tokens.length} active device token(s)`);
    
    if (tokens.length === 0) {
      console.log('⚠️  No device tokens found for this user.');
      console.log('   Make sure the user has:');
      console.log('   1. Logged into the app');
      console.log('   2. Granted push notification permissions');
      console.log('   3. The app has registered a device token');
      process.exit(0);
    }

    tokens.forEach((token, index) => {
      console.log(`   ${index + 1}. ${token.device_type.toUpperCase()}: ${token.device_token.substring(0, 20)}...`);
    });

    // Step 2: Send push notification
    console.log('\n📤 Sending push notification...');
    const response = await sendPushNotification(config);

    if (response.status === 200) {
      console.log('✅ Push notification sent successfully!');
      console.log(`   Response:`, response.data);
      
      if (response.data.sent) {
        console.log(`   📊 Sent to ${response.data.sent} device(s)`);
      }
      
      if (response.data.failed && response.data.failed > 0) {
        console.log(`   ⚠️  Failed to send to ${response.data.failed} device(s)`);
      }

      console.log('\n🎯 Next steps:');
      console.log('   1. Check your device for the notification');
      console.log('   2. If not received, check:');
      console.log('      - iOS Settings > Notifications > Qwiken');
      console.log('      - Device is not in Do Not Disturb mode');
      console.log('      - App is not currently open (for background notifications)');
      
    } else {
      console.error('❌ Failed to send push notification');
      console.error(`   Status: ${response.status}`);
      console.error(`   Response:`, response.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n👋 Script interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}