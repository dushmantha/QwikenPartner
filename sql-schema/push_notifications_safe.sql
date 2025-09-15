-- Safe Push Notifications Schema Migration
-- This script checks for existing objects before creating them

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_topic ON notification_subscriptions(topic);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  -- Device tokens policies
  DROP POLICY IF EXISTS "Users can view their own device tokens" ON device_tokens;
  DROP POLICY IF EXISTS "Users can insert their own device tokens" ON device_tokens;
  DROP POLICY IF EXISTS "Users can update their own device tokens" ON device_tokens;
  DROP POLICY IF EXISTS "Users can delete their own device tokens" ON device_tokens;
  
  -- Notification subscriptions policies  
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON notification_subscriptions;
  DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON notification_subscriptions;
  DROP POLICY IF EXISTS "Users can update their own subscriptions" ON notification_subscriptions;
  DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON notification_subscriptions;
  
  -- Notifications policies
  DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
  DROP POLICY IF EXISTS "System can insert notifications for users" ON notifications;
  DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
  
  -- Notification settings policies
  DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
  DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
  DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
END $$;

-- Create RLS policies
-- Device tokens policies
CREATE POLICY "Users can view their own device tokens" ON device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens" ON device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens" ON device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens" ON device_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Notification subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON notification_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON notification_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON notification_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON notification_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for users" ON notifications
  FOR INSERT WITH CHECK (true); -- Edge functions will handle this

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view their own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS create_user_notification_settings ON auth.users;

-- Drop function if exists before creating  
DROP FUNCTION IF EXISTS create_notification_settings_for_user();

-- Create function to automatically create notification settings for new users
CREATE OR REPLACE FUNCTION create_notification_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create notification settings
CREATE TRIGGER create_user_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_settings_for_user();

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_tokens;
DROP TRIGGER IF EXISTS update_notification_subscriptions_updated_at ON notification_subscriptions;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;

-- Add updated_at triggers
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_subscriptions_updated_at
  BEFORE UPDATE ON notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON device_tokens TO authenticated;
GRANT ALL ON notification_subscriptions TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_settings TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Push notification tables setup completed successfully!';
END $$;