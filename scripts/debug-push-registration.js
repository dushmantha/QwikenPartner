#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

async function debugPushRegistration() {
  console.log('🔍 Debugging push notification registration...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const USER_ID = '4e4da279-7195-4663-a4ce-4164057ece65';
  
  // Check 1: Verify user exists and is authenticated
  console.log('1. Checking if user exists in auth.users...');
  try {
    // This won't work with anon key, but let's check the table structure
    const { data: deviceTokens, error: tableError } = await supabase
      .from('device_tokens')
      .select('*')
      .limit(1);
      
    if (tableError) {
      if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
        console.error('❌ device_tokens table does not exist!');
        console.log('   Please run the database migration first.');
        return;
      } else if (tableError.message.includes('row-level security')) {
        console.log('✅ Table exists but RLS is blocking (expected)');
      } else {
        console.error('❌ Table error:', tableError.message);
        return;
      }
    } else {
      console.log('✅ device_tokens table is accessible');
    }
  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    return;
  }
  
  // Check 2: Test if we can query the table structure
  console.log('\n2. Checking table structure...');
  try {
    const { data, error } = await supabase
      .from('device_tokens')
      .select('user_id, device_token, device_type, is_active')
      .eq('user_id', USER_ID)
      .limit(1);
      
    if (error) {
      console.log('⚠️  RLS blocking query (expected):', error.message);
    } else {
      console.log('✅ Query successful, tokens found:', data?.length || 0);
    }
  } catch (error) {
    console.error('❌ Query error:', error.message);
  }
  
  // Check 3: Create a test token to see what happens
  console.log('\n3. Attempting to create test token...');
  
  const testToken = {
    user_id: USER_ID,
    device_token: `test_token_${Date.now()}`,
    device_type: 'ios',
    app_version: '1.0.0',
    device_info: {
      platform: 'ios',
      version: '17.0',
      test: true
    },
    is_active: true
  };
  
  try {
    const { data, error } = await supabase
      .from('device_tokens')
      .insert([testToken])
      .select();
      
    if (error) {
      console.log('❌ Insert failed:', error.message);
      
      if (error.message.includes('row-level security')) {
        console.log('\n💡 RLS Policy Issue Detected!');
        console.log('   The device_tokens table has Row Level Security enabled.');
        console.log('   Only authenticated users can insert their own tokens.');
        console.log('\n🔧 Solutions:');
        console.log('   1. The app must be signed in with a valid Supabase session');
        console.log('   2. The RLS policies must allow authenticated users to insert');
        console.log('   3. The user_id must match auth.uid()');
        console.log('\n📱 In the app:');
        console.log('   - User must be signed in (✅ Done - you showed user is logged in)');
        console.log('   - Push notification service must use authenticated supabase client');
        console.log('   - The saveDeviceToken function must run with user session');
      }
    } else {
      console.log('✅ Test token created successfully!');
      console.log('   This means the table and permissions are working.');
      
      // Clean up test token
      if (data && data[0]) {
        await supabase.from('device_tokens').delete().eq('id', data[0].id);
        console.log('🧹 Cleaned up test token');
      }
    }
  } catch (error) {
    console.error('❌ Insert error:', error.message);
  }
  
  console.log('\n🎯 Debugging Summary:');
  console.log('The issue is likely one of these:');
  console.log('1. 🔐 App is not using authenticated Supabase session when saving tokens');
  console.log('2. 📱 Push notification permission was denied, so no token was generated');
  console.log('3. ⚠️  Error in saveDeviceToken function preventing database insert');
  console.log('4. 🔄 App needs to be restarted after the push service fixes');
  
  console.log('\n✅ Next Steps:');
  console.log('1. Restart the app to pick up the fixed push notification service');
  console.log('2. Accept push notification permissions when prompted');
  console.log('3. Check console logs for "📱 Device token received" and "✅ Device token saved"');
  console.log('4. If still no tokens, check if the supabase client in push service is authenticated');
}

debugPushRegistration().catch(console.error);