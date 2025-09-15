#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

async function checkDeviceTokens() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  console.log('📱 Checking device tokens in database...\n');
  
  try {
    // Check if table exists and get all tokens
    const { data: allTokens, error } = await supabase
      .from('device_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('❌ device_tokens table does not exist!');
        console.log('\nPlease run the SQL migration first:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Run the SQL from: sql-schema/push_notifications_safe.sql');
        return;
      }
      console.error('❌ Error fetching tokens:', error);
      return;
    }
    
    if (!allTokens || allTokens.length === 0) {
      console.log('📭 No device tokens found in database');
      console.log('\nTo register a device token:');
      console.log('1. Make sure push notifications are configured in the app');
      console.log('2. Sign in on a real device (not simulator)');
      console.log('3. Accept push notification permissions when prompted');
      return;
    }
    
    console.log(`✅ Found ${allTokens.length} device token(s):\n`);
    
    allTokens.forEach((token, index) => {
      console.log(`Token ${index + 1}:`);
      console.log(`  User ID: ${token.user_id}`);
      console.log(`  Device: ${token.device_type}`);
      console.log(`  Token: ${token.device_token.substring(0, 30)}...`);
      console.log(`  Active: ${token.is_active}`);
      console.log(`  Created: ${new Date(token.created_at).toLocaleString()}`);
      console.log();
    });
    
    // Check for specific user
    const USER_ID = process.env.USER_ID || '4e4da279-7195-4663-a4ce-4164057ece65';
    const { data: userTokens } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('is_active', true);
    
    if (userTokens && userTokens.length > 0) {
      console.log(`✅ User ${USER_ID} has ${userTokens.length} active token(s)`);
    } else {
      console.log(`⚠️  User ${USER_ID} has no active tokens`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDeviceTokens().catch(console.error);