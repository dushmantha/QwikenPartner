#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

// Mock AsyncStorage for Node.js environment
const mockStorage = {
  setItem: async (key, value) => {
    console.log(`🔐 AsyncStorage.setItem('${key}', '${value.substring(0, 50)}...')`);
  },
  getItem: async (key) => {
    console.log(`🔐 AsyncStorage.getItem('${key}') - returning null (Node.js environment)`);
    return null;
  },
  removeItem: async (key) => {
    console.log(`🔐 AsyncStorage.removeItem('${key}')`);
  }
};

async function testAuthenticationState() {
  console.log('🔐 Testing Authentication State in Push Service Context...\n');
  
  // Create supabase client similar to how the app does it
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: mockStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'password',
    },
  });
  
  console.log('1. Testing current authentication state...');
  
  // Test current session
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('   Session result:', {
      hasSession: !!sessionData.session,
      hasUser: !!sessionData.session?.user,
      userId: sessionData.session?.user?.id,
      error: sessionError?.message
    });
    
    if (!sessionData.session) {
      console.log('   ❌ No active session found');
    } else {
      console.log('   ✅ Active session found');
    }
  } catch (error) {
    console.log('   ❌ Session check error:', error.message);
  }
  
  // Test getUser method
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('   User result:', {
      hasUser: !!userData.user,
      userId: userData.user?.id,
      email: userData.user?.email,
      error: userError?.message
    });
    
    if (!userData.user) {
      console.log('   ❌ No authenticated user found');
    } else {
      console.log('   ✅ Authenticated user found');
    }
  } catch (error) {
    console.log('   ❌ User check error:', error.message);
  }
  
  console.log('\n2. Simulating device token save with no authentication...');
  
  // Simulate what happens when push service tries to save a token without auth
  const testToken = `test_token_${Date.now()}`;
  const deviceTokenData = {
    user_id: '4e4da279-7195-4663-a4ce-4164057ece65', // Known test user ID
    device_token: testToken,
    device_type: 'ios',
    app_version: '1.0.0',
    device_info: { test: true },
    is_active: true
  };
  
  console.log('   Attempting to insert device token without authentication...');
  try {
    const { data, error } = await supabase
      .from('device_tokens')
      .insert([deviceTokenData])
      .select();
      
    if (error) {
      console.log('   ❌ Insert failed (expected):', error.message);
      if (error.message.includes('row-level security')) {
        console.log('   🔧 Confirmed: RLS is blocking unauthenticated inserts');
      }
    } else {
      console.log('   ⚠️ Insert succeeded (unexpected - RLS might be disabled)');
    }
  } catch (error) {
    console.log('   ❌ Insert error:', error.message);
  }
  
  console.log('\n🎯 Analysis & Solutions:');
  console.log('');
  console.log('The push notification service is failing because:');
  console.log('1. 📱 iOS generates device tokens successfully (proven by "can send notifications")');
  console.log('2. 🔐 The saveDeviceToken function tries to check authentication');
  console.log('3. ❌ But the supabase client in push service has no active session');
  console.log('4. 🚫 RLS blocks unauthenticated inserts to device_tokens table');
  console.log('');
  console.log('💡 The root cause is likely that:');
  console.log('   - Push service initializes before user logs in');
  console.log('   - Token generation happens but session is not available');
  console.log('   - Need to ensure push service uses the SAME authenticated client');
  console.log('');
  console.log('🔧 Solutions:');
  console.log('1. ✅ Ensure push service imports from src/lib/supabase (shared auth state)');
  console.log('2. ✅ Call handlePendingToken() after user login');
  console.log('3. ✅ Add retry logic in saveDeviceToken when no session');
  console.log('4. ✅ Store tokens locally until user authenticates');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Check if push service imports are correct');
  console.log('2. Ensure handlePendingToken is called after login');
  console.log('3. Add session validation in saveDeviceToken');
  console.log('4. Test the complete auth flow: login -> token generation -> save');
}

testAuthenticationState().catch(console.error);