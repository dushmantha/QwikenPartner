#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZUI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

const TEST_USER_ID = '4e4da279-7195-4663-a4ce-4164057ece65'; // Known user ID

async function testCompleteTokenFlow() {
  console.log('🔄 Testing Complete Device Token Registration Flow...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Step 1: Clear any existing tokens for this user
  console.log('1. Checking for existing device tokens...');
  const { data: existingTokens, count } = await supabase
    .from('device_tokens')
    .select('*', { count: 'exact' })
    .eq('user_id', TEST_USER_ID);
    
  console.log(`   Found ${count || 0} existing tokens for user ${TEST_USER_ID}`);
  
  // Step 2: Test with authenticated session (simulate successful login)
  console.log('\n2. Testing with mock authenticated session...');
  console.log('   Note: This simulates what should happen after user logs in');
  
  // This won't actually authenticate in Node.js, but shows what should happen
  const mockToken = `ios_device_token_${Date.now()}`;
  const deviceTokenData = {
    user_id: TEST_USER_ID,
    device_token: mockToken,
    device_type: 'ios',
    app_version: '1.0.0',
    device_info: {
      platform: 'ios',
      version: '17.0'
    },
    is_active: true
  };
  
  console.log('   Mock device token data:', {
    user_id: deviceTokenData.user_id,
    device_type: deviceTokenData.device_type,
    token_preview: deviceTokenData.device_token.substring(0, 20) + '...'
  });
  
  // Test inserting with anon key (will fail due to RLS)
  console.log('   Testing insert with unauthenticated client...');
  const { data: insertData, error: insertError } = await supabase
    .from('device_tokens')
    .insert([deviceTokenData])
    .select();
    
  if (insertError) {
    console.log('   ❌ Insert failed as expected:', insertError.message);
    if (insertError.message.includes('row-level security')) {
      console.log('   🔐 RLS is properly configured and blocking unauthenticated inserts');
    }
  } else {
    console.log('   ⚠️ Insert succeeded unexpectedly - RLS might be disabled');
    // Clean up if it somehow worked
    if (insertData && insertData[0]) {
      await supabase.from('device_tokens').delete().eq('id', insertData[0].id);
    }
  }
  
  // Step 3: Test the actual push notification registration flow
  console.log('\n3. Analyzing the actual push notification flow...');
  console.log('   The complete flow should be:');
  console.log('   1. 📱 App starts -> Push service configures');
  console.log('   2. 🔔 iOS requests permissions -> User grants/denies');
  console.log('   3. 📝 iOS generates device token -> onRegister callback fires');
  console.log('   4. 💾 saveDeviceToken called -> checks authentication');
  console.log('   5a. ✅ If authenticated -> save to database');
  console.log('   5b. 💤 If not authenticated -> store as pending_device_token');
  console.log('   6. 🔐 User logs in -> handlePendingToken processes stored token');
  console.log('');
  
  // Step 4: Check if there might be issues with the callback registration
  console.log('4. Common issues that prevent device token registration:');
  console.log('   ❌ Push service onRegister callback not firing');
  console.log('   ❌ iOS permissions denied');
  console.log('   ❌ Native module not properly linked');
  console.log('   ❌ APNs environment misconfigured');
  console.log('   ❌ Device token generated but saveDeviceToken has error');
  console.log('   ❌ User logs in but handlePendingToken not called');
  console.log('   ❌ handlePendingToken called but no pending token stored');
  console.log('');
  
  // Step 5: Provide debugging steps for the app
  console.log('5. 🔍 How to debug this in the React Native app:');
  console.log('');
  console.log('   A. Check if device token is being generated:');
  console.log('      - Look for log: "📱 Device token received: ..."');
  console.log('      - Look for log: "📱 iOS Device Token received: ..."');
  console.log('      - If no token logs -> iOS permissions or native module issue');
  console.log('');
  console.log('   B. Check if saveDeviceToken is being called:');
  console.log('      - Look for log: "💾 Attempting to save device token: ..."');
  console.log('      - If no save logs -> onRegister callback not firing');
  console.log('');
  console.log('   C. Check authentication state during save:');
  console.log('      - Look for log: "🔐 Current session: ..."');
  console.log('      - Look for log: "👤 Current user: ..."');
  console.log('      - If hasUser: false -> storing as pending (expected)');
  console.log('');
  console.log('   D. Check if pending token is stored:');
  console.log('      - Look for log: "⚠️ No authenticated user, storing token locally"');
  console.log('      - Tokens should be stored until user logs in');
  console.log('');
  console.log('   E. Check if handlePendingToken processes stored tokens:');
  console.log('      - Look for log: "✅ Pending device token processed"');
  console.log('      - This should happen after successful login');
  console.log('');
  console.log('   F. Check final database insertion:');
  console.log('      - Look for log: "✅ Device token saved to Supabase"');
  console.log('      - Look for log: "❌ Error saving device token: ..."');
  console.log('');
  
  console.log('🎯 Most Likely Issues Based on "send notification but still not save token":');
  console.log('');
  console.log('1. 📱 iOS generates tokens successfully (proven by notifications working)');
  console.log('2. 🔔 Push notifications can be sent (proven by user feedback)');
  console.log('3. ❌ But tokens are not being saved to database');
  console.log('');
  console.log('This suggests one of these scenarios:');
  console.log('');
  console.log('Scenario A: Token generation works, but saveDeviceToken fails silently');
  console.log('  - onRegister fires -> saveDeviceToken called');
  console.log('  - Authentication check fails -> token stored as pending');  
  console.log('  - handlePendingToken never called OR fails');
  console.log('  - Result: Token works locally but not saved to DB');
  console.log('');
  console.log('Scenario B: Multiple supabase client instances');
  console.log('  - Push service uses different supabase instance');
  console.log('  - Auth state not shared between instances');
  console.log('  - Result: Push service never sees authenticated state');
  console.log('');
  console.log('Scenario C: Timing issue with authentication');
  console.log('  - Token generated before user fully authenticated');
  console.log('  - Stored as pending, but handlePendingToken has bug');
  console.log('  - Result: Token never processed after login');
  console.log('');
  
  console.log('🔧 Recommended Fix:');
  console.log('1. Add extensive debugging logs to the React Native app');
  console.log('2. Run the app and check which logs appear during token registration');
  console.log('3. Focus on the missing step in the token save flow');
  console.log('4. Ensure handlePendingToken is called and working correctly');
}

testCompleteTokenFlow().catch(console.error);