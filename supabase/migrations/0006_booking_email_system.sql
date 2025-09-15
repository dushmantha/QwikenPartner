-- Migration: Create booking email notification system tables
-- 0006_booking_email_system.sql

-- Create email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- booking_confirmation, booking_reminder_6h, etc.
    recipient VARCHAR(255) NOT NULL,
    booking_id UUID REFERENCES shop_bookings(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent', -- sent, failed, bounced
    error_message TEXT,
    message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scheduled_reminders table for managing reminder emails
CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES shop_bookings(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(20) NOT NULL, -- 6_hour, 24_hour, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
    booking_data JSONB NOT NULL, -- Store booking details for email generation
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_booking_id ON scheduled_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON scheduled_reminders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_time ON scheduled_reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_reminder_type ON scheduled_reminders(reminder_type);

-- Enable Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_logs
CREATE POLICY "Service role can manage email_logs" ON email_logs
    FOR ALL USING (true);

CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR SELECT USING (
        recipient = auth.jwt() ->> 'email'
        OR booking_id IN (
            SELECT id FROM shop_bookings WHERE customer_id = auth.uid()
        )
    );

-- Create RLS policies for scheduled_reminders
CREATE POLICY "Service role can manage scheduled_reminders" ON scheduled_reminders
    FOR ALL USING (true);

CREATE POLICY "Users can view their own scheduled reminders" ON scheduled_reminders
    FOR SELECT USING (
        recipient_email = auth.jwt() ->> 'email'
        OR booking_id IN (
            SELECT id FROM shop_bookings WHERE customer_id = auth.uid()
        )
    );

-- Function to automatically schedule reminder when booking is created
CREATE OR REPLACE FUNCTION schedule_booking_reminder()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule 6-hour reminder for new bookings
    IF NEW.status = 'confirmed' THEN
        -- Calculate reminder time (6 hours before appointment)
        DECLARE
            reminder_time TIMESTAMP WITH TIME ZONE;
            booking_datetime TIMESTAMP WITH TIME ZONE;
        BEGIN
            -- Combine booking date and start time
            booking_datetime := (NEW.booking_date::DATE + NEW.start_time::TIME)::TIMESTAMP WITH TIME ZONE;
            reminder_time := booking_datetime - INTERVAL '6 hours';
            
            -- Only schedule if reminder time is in the future
            IF reminder_time > NOW() THEN
                INSERT INTO scheduled_reminders (
                    booking_id,
                    recipient_email,
                    scheduled_time,
                    reminder_type,
                    status,
                    booking_data
                ) VALUES (
                    NEW.id,
                    COALESCE(NEW.customer_email, (SELECT email FROM users WHERE id = NEW.customer_id)),
                    reminder_time,
                    '6_hour',
                    'pending',
                    jsonb_build_object(
                        'customer_name', NEW.customer_name,
                        'shop_name', (SELECT name FROM provider_businesses WHERE id = NEW.shop_id),
                        'service_name', NEW.service_name,
                        'booking_date', NEW.booking_date,
                        'booking_time', NEW.start_time,
                        'duration', NEW.duration,
                        'price', NEW.total_price,
                        'booking_id', NEW.id
                    )
                );
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically schedule reminders
CREATE TRIGGER schedule_reminder_on_booking_create
    AFTER INSERT ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION schedule_booking_reminder();

-- Create trigger to handle booking status changes
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If booking is cancelled, cancel the reminder
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE scheduled_reminders
        SET status = 'cancelled'
        WHERE booking_id = NEW.id
        AND status = 'pending';
    END IF;
    
    -- If booking is confirmed after being pending, schedule reminder
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        PERFORM schedule_booking_reminder();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status changes
CREATE TRIGGER handle_booking_status_change_trigger
    AFTER UPDATE ON shop_bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_booking_status_change();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_reminders_updated_at
    BEFORE UPDATE ON scheduled_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON scheduled_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_reminders TO service_role;

-- Add comments for documentation
COMMENT ON TABLE email_logs IS 'Tracks all emails sent by the system for auditing and debugging';
COMMENT ON TABLE scheduled_reminders IS 'Manages scheduled reminder emails for bookings';
COMMENT ON COLUMN scheduled_reminders.reminder_type IS 'Type of reminder: 6_hour (6 hours before), 24_hour (24 hours before), etc.';
COMMENT ON COLUMN scheduled_reminders.status IS 'Status of the reminder: pending, sent, failed, cancelled';
COMMENT ON COLUMN scheduled_reminders.booking_data IS 'JSON data containing booking details for email generation';