#!/usr/bin/env node

/**
 * Get User Information Script
 * 
 * This script helps you find user IDs and device tokens for testing push notifications.
 * 
 * Usage:
 *   node scripts/get-user-info.js --email="user@example.com"
 *   node scripts/get-user-info.js --list-recent
 */

const https = require('https');

// Configuration
const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    email: null,
    listRecent: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--email=')) {
      config.email = arg.split('=')[1].replace(/"/g, '');
    } else if (arg === '--list-recent') {
      config.listRecent = true;
    }
  });

  return config;
}

// Make HTTP request
function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      port: 443,
      path: path,
      method: method,
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
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Find user by email
async function findUserByEmail(email) {
  console.log(`🔍 Searching for user with email: ${email}`);
  
  // Note: In a real app, you might need to use the Supabase service key
  // for admin operations to query auth.users table
  console.log('⚠️  Note: This script can only access public tables.');
  console.log('   To find users by email, you might need admin access or');
  console.log('   check your user_profiles table if you have one.');
  
  // Try to find in user_profiles if it exists
  try {
    const response = await makeRequest(`/rest/v1/user_profiles?email=eq.${encodeURIComponent(email)}`);
    
    if (response.status === 200 && response.data.length > 0) {
      const user = response.data[0];
      console.log('✅ Found user in profiles:');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      return user.id;
    } else {
      console.log('❌ User not found in user_profiles table');
    }
  } catch (error) {
    console.log('❌ Could not search user_profiles table');
  }
  
  return null;
}

// List recent device tokens
async function listRecentDeviceTokens() {
  console.log('📱 Fetching recent device tokens...');
  
  try {
    const response = await makeRequest('/rest/v1/device_tokens?order=created_at.desc&limit=10');
    
    if (response.status === 200) {
      const tokens = response.data;
      
      if (tokens.length === 0) {
        console.log('❌ No device tokens found');
        return [];
      }
      
      console.log(`✅ Found ${tokens.length} recent device tokens:`);
      console.log();
      
      tokens.forEach((token, index) => {
        console.log(`${index + 1}. User ID: ${token.user_id}`);
        console.log(`   Device: ${token.device_type.toUpperCase()}`);
        console.log(`   Token: ${token.device_token.substring(0, 30)}...`);
        console.log(`   Active: ${token.is_active ? '✅' : '❌'}`);
        console.log(`   Created: ${new Date(token.created_at).toLocaleString()}`);
        console.log();
      });
      
      return tokens;
    } else {
      console.error('❌ Failed to fetch device tokens:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching device tokens:', error.message);
    return [];
  }
}

// Get device tokens for a specific user
async function getUserDeviceTokens(userId) {
  console.log(`📱 Fetching device tokens for user: ${userId}`);
  
  try {
    const response = await makeRequest(`/rest/v1/device_tokens?user_id=eq.${userId}&order=created_at.desc`);
    
    if (response.status === 200) {
      const tokens = response.data;
      
      if (tokens.length === 0) {
        console.log('❌ No device tokens found for this user');
        return;
      }
      
      console.log(`✅ Found ${tokens.length} device token(s):`);
      console.log();
      
      tokens.forEach((token, index) => {
        console.log(`${index + 1}. Device: ${token.device_type.toUpperCase()}`);
        console.log(`   Token: ${token.device_token.substring(0, 30)}...`);
        console.log(`   Active: ${token.is_active ? '✅' : '❌'}`);
        console.log(`   Version: ${token.app_version || 'Unknown'}`);
        console.log(`   Created: ${new Date(token.created_at).toLocaleString()}`);
        console.log(`   Updated: ${new Date(token.updated_at).toLocaleString()}`);
        console.log();
      });
      
      return tokens;
    } else {
      console.error('❌ Failed to fetch device tokens:', response.data);
    }
  } catch (error) {
    console.error('❌ Error fetching device tokens:', error.message);
  }
}

// Main function
async function main() {
  console.log('👤 User Information Lookup');
  console.log('==========================\n');

  const config = parseArgs();

  if (!config.email && !config.listRecent) {
    console.log('Usage:');
    console.log('  node scripts/get-user-info.js --email="user@example.com"');
    console.log('  node scripts/get-user-info.js --list-recent');
    console.log();
    console.log('Examples:');
    console.log('  node scripts/get-user-info.js --email="tdmihiran@gmail.com"');
    console.log('  node scripts/get-user-info.js --list-recent');
    process.exit(1);
  }

  try {
    if (config.listRecent) {
      const tokens = await listRecentDeviceTokens();
      
      if (tokens.length > 0) {
        console.log('💡 To test push notifications, use one of these user IDs:');
        const uniqueUsers = [...new Set(tokens.map(t => t.user_id))];
        uniqueUsers.forEach((userId, index) => {
          console.log(`   node scripts/test-push.js --user-id="${userId}"`);
        });
      }
    }

    if (config.email) {
      const userId = await findUserByEmail(config.email);
      
      if (userId) {
        console.log();
        await getUserDeviceTokens(userId);
        
        console.log('💡 To test push notifications for this user:');
        console.log(`   node scripts/test-push.js --user-id="${userId}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}