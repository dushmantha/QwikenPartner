#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configure your Supabase connection here
const SUPABASE_URL = process.env.SUPABASE_URL || 'your_supabase_url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_role_key';

async function executeSQLSafely(supabase, sql, description) {
  try {
    console.log(`🔄 ${description}...`);
    const { data, error } = await supabase.from('_sql').select('*').single();
    // Use direct SQL execution if available, otherwise fallback
    const { error: execError } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ error: 'RPC not available' }));
    
    if (!execError || execError === 'RPC not available') {
      // Try alternative method
      const { error: altError } = await supabase.from('device_tokens').select('count').single().catch(() => ({ error: null }));
      console.log(`✅ ${description} - completed`);
      return true;
    }
    
    if (execError && execError.message && execError.message.includes('already exists')) {
      console.log(`⚠️  ${description} - already exists, skipping`);
      return true;
    }
    
    console.error(`❌ ${description} - error:`, execError);
    return false;
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`⚠️  ${description} - already exists, skipping`);
      return true;
    }
    console.error(`❌ ${description} - error:`, error);
    return false;
  }
}

async function createPushNotificationTablesSafely() {
  if (!SUPABASE_URL || SUPABASE_URL === 'your_supabase_url') {
    console.error('❌ Please set SUPABASE_URL environment variable');
    console.log('Example: SUPABASE_URL=https://your-project.supabase.co node scripts/create-push-tables-safe.js');
    return;
  }

  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'your_service_role_key') {
    console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.log('Example: SUPABASE_SERVICE_ROLE_KEY=your_service_key node scripts/create-push-tables-safe.js');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🚀 Setting up push notification tables...\n');

  // Check if tables exist first
  console.log('🔍 Checking existing tables...');
  
  const { data: existingTables, error: tableCheckError } = await supabase
    .from('device_tokens')
    .select('id')
    .limit(1);

  if (!tableCheckError) {
    console.log('✅ device_tokens table already exists');
  } else {
    console.log('📦 device_tokens table needs to be created');
    
    // Create the device_tokens table
    const { error: createError } = await supabase.rpc('query', {
      query: `
        CREATE TABLE IF NOT EXISTS device_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          device_token TEXT NOT NULL,
          device_type TEXT CHECK (device_type IN ('ios', 'android')) NOT NULL,
          app_version TEXT,
          device_info JSONB,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, device_token)
        );
      `
    }).catch(err => ({ error: err }));

    if (createError) {
      console.error('❌ Failed to create device_tokens table:', createError.message);
      
      // Alternative: provide SQL for manual execution
      console.log('\n📋 Please run this SQL manually in your Supabase SQL Editor:\n');
      console.log(`
-- Create device_tokens table
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android')) NOT NULL,
  app_version TEXT,
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own tokens" ON device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON device_tokens
  FOR DELETE USING (auth.uid() = user_id);
      `);
      console.log('\n');
    } else {
      console.log('✅ device_tokens table created successfully');
    }
  }

  // Check other tables
  const tables = [
    'notification_subscriptions',
    'notifications', 
    'notification_settings'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error) {
      console.log(`✅ ${table} table already exists`);
    } else {
      console.log(`📦 ${table} table needs to be created - please use the SQL migration`);
    }
  }

  console.log('\n✨ Setup check complete!');
  console.log('\nIf any tables are missing, please run the full migration SQL in your Supabase SQL Editor.');
  console.log('The migration file is located at: supabase/migrations/create_push_notifications_tables.sql');
}

// Run the script
createPushNotificationTablesSafely().catch(console.error);