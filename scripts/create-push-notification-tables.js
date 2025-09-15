#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configure your Supabase connection here
const SUPABASE_URL = process.env.SUPABASE_URL || 'your_supabase_url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_role_key';

async function createPushNotificationTables() {
  if (!SUPABASE_URL || SUPABASE_URL === 'your_supabase_url') {
    console.error('❌ Please set SUPABASE_URL environment variable or update the script');
    console.log('Example: SUPABASE_URL=https://your-project.supabase.co node scripts/create-push-notification-tables.js');
    return;
  }

  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'your_service_role_key') {
    console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable or update the script');
    console.log('Example: SUPABASE_SERVICE_ROLE_KEY=your_service_key node scripts/create-push-notification-tables.js');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔄 Creating push notification tables...');

  // SQL to create the required tables
  const createTablesSQL = `
    -- Create device_tokens table for storing user device tokens
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
      
      -- Ensure one active token per device per user
      UNIQUE(user_id, device_token)
    );

    -- Create notification_subscriptions table for topic-based notifications
    CREATE TABLE IF NOT EXISTS notification_subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      topic TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      -- Ensure one subscription per topic per user
      UNIQUE(user_id, topic)
    );

    -- Create notifications table for storing notification history
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      type TEXT, -- booking_confirmed, booking_reminder, new_message, etc.
      status TEXT CHECK (status IN ('sent', 'delivered', 'failed')) DEFAULT 'sent',
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create notification_settings table for user preferences
    CREATE TABLE IF NOT EXISTS notification_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      push_notifications BOOLEAN DEFAULT true,
      email_notifications BOOLEAN DEFAULT true,
      sms_notifications BOOLEAN DEFAULT false,
      booking_reminders BOOLEAN DEFAULT true,
      promotional_notifications BOOLEAN DEFAULT true,
      marketing_notifications BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  try {
    const { error: tablesError } = await supabase.rpc('exec', { query: createTablesSQL });
    if (tablesError) {
      console.error('❌ Error creating tables:', tablesError);
      return;
    }
    console.log('✅ Tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    return;
  }

  // Create indexes
  console.log('🔄 Creating indexes...');
  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_topic ON notification_subscriptions(topic);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
  `;

  try {
    const { error: indexError } = await supabase.rpc('exec', { query: createIndexesSQL });
    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
      return;
    }
    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    return;
  }

  // Enable RLS and create policies
  console.log('🔄 Setting up Row Level Security...');
  const rlsSQL = `
    -- Enable Row Level Security (RLS)
    ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    -- Device tokens policies
    CREATE POLICY IF NOT EXISTS "Users can view their own device tokens" ON device_tokens
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert their own device tokens" ON device_tokens
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update their own device tokens" ON device_tokens
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can delete their own device tokens" ON device_tokens
      FOR DELETE USING (auth.uid() = user_id);

    -- Notification subscriptions policies
    CREATE POLICY IF NOT EXISTS "Users can view their own subscriptions" ON notification_subscriptions
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert their own subscriptions" ON notification_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update their own subscriptions" ON notification_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can delete their own subscriptions" ON notification_subscriptions
      FOR DELETE USING (auth.uid() = user_id);

    -- Notifications policies
    CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON notifications
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "System can insert notifications for users" ON notifications
      FOR INSERT WITH CHECK (true); -- Edge functions will handle this

    CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON notifications
      FOR UPDATE USING (auth.uid() = user_id);

    -- Notification settings policies
    CREATE POLICY IF NOT EXISTS "Users can view their own notification settings" ON notification_settings
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert their own notification settings" ON notification_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update their own notification settings" ON notification_settings
      FOR UPDATE USING (auth.uid() = user_id);
  `;

  try {
    const { error: rlsError } = await supabase.rpc('exec', { query: rlsSQL });
    if (rlsError) {
      console.error('❌ Error setting up RLS:', rlsError);
      return;
    }
    console.log('✅ Row Level Security configured successfully');
  } catch (error) {
    console.error('❌ Error setting up RLS:', error);
    return;
  }

  console.log('🎉 Push notification tables created successfully!');
  console.log('');
  console.log('The following tables have been created:');
  console.log('- device_tokens (stores user device tokens)');
  console.log('- notification_subscriptions (topic-based subscriptions)');
  console.log('- notifications (notification history)');  
  console.log('- notification_settings (user notification preferences)');
}

// Run the script
createPushNotificationTables().catch(console.error);