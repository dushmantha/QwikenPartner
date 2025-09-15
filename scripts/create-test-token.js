#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

async function createTestToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  console.log('🧪 Creating test device token for testing...\n');
  
  const USER_ID = process.env.USER_ID || '4e4da279-7195-4663-a4ce-4164057ece65';
  
  // Create a mock iOS device token (this won't work for real notifications but will test the flow)
  const mockToken = {
    user_id: USER_ID,
    device_token: 'mock_ios_token_for_testing_' + Date.now(),
    device_type: 'ios',
    app_version: '1.0.0',
    device_info: {
      platform: 'ios',
      version: '17.0',
      model: 'iPhone 15 Pro',
      isSimulator: false
    },
    is_active: true
  };
  
  try {
    const { data, error } = await supabase
      .from('device_tokens')
      .insert([mockToken])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test token:', error);
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('\n💡 The device_tokens table does not exist yet.');
        console.log('Please run the database migration first:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Run the SQL from: sql-schema/push_notifications_safe.sql');
        return;
      }
      
      return;
    }
    
    console.log('✅ Test device token created successfully!');
    console.log(`   User ID: ${data.user_id}`);
    console.log(`   Device Type: ${data.device_type}`);
    console.log(`   Token: ${data.device_token}`);
    console.log(`   Created: ${new Date(data.created_at).toLocaleString()}\n`);
    
    console.log('🚀 You can now test push notifications with:');
    console.log(`   SUPABASE_URL=${SUPABASE_URL} \\`);
    console.log(`   SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY} \\`);
    console.log(`   USER_ID=${USER_ID} \\`);
    console.log('   node scripts/test-push-notification.js 1\n');
    
    console.log('📝 Note: This is a mock token for testing the system flow.');
    console.log('   Real notifications require actual device tokens from APNs/FCM.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestToken().catch(console.error);