-- Response Time Tracking System
-- Adds comprehensive response time tracking to bookings and provider businesses

-- Add response time columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_during_business_hours BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_response_time ON bookings(provider_business_id, requested_at, responded_at);
CREATE INDEX IF NOT EXISTS idx_bookings_pending ON bookings(status, requested_at) WHERE status = 'pending';

-- Function to calculate response time statistics
CREATE OR REPLACE FUNCTION calculate_response_time_stats(p_provider_id UUID)
RETURNS TABLE(
  avg_response_time_minutes NUMERIC,
  response_rate NUMERIC,
  min_response_time INTEGER,
  max_response_time INTEGER,
  total_bookings INTEGER,
  responded_bookings INTEGER,
  avg_business_hours_response NUMERIC,
  excellent_responses INTEGER,
  good_responses INTEGER,
  fair_responses INTEGER,
  poor_responses INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Average response time in minutes
    COALESCE(ROUND(AVG(b.response_time_minutes), 1), 0)::NUMERIC as avg_response_time_minutes,
    
    -- Response rate percentage
    CASE 
      WHEN COUNT(*) = 0 THEN 0::NUMERIC
      ELSE ROUND((COUNT(CASE WHEN b.responded_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 1)::NUMERIC
    END as response_rate,
    
    -- Fastest response time
    COALESCE(MIN(b.response_time_minutes), 0) as min_response_time,
    
    -- Slowest response time
    COALESCE(MAX(b.response_time_minutes), 0) as max_response_time,
    
    -- Total bookings in last 30 days
    COUNT(*)::INTEGER as total_bookings,
    
    -- Responded bookings
    COUNT(CASE WHEN b.responded_at IS NOT NULL THEN 1 END)::INTEGER as responded_bookings,
    
    -- Average response time during business hours only
    COALESCE(ROUND(AVG(CASE WHEN b.is_during_business_hours THEN b.response_time_minutes END), 1), 0)::NUMERIC as avg_business_hours_response,
    
    -- Response time categories (excellent: ≤15min, good: ≤60min, fair: ≤240min, poor: >240min)
    COUNT(CASE WHEN b.response_time_minutes <= 15 THEN 1 END)::INTEGER as excellent_responses,
    COUNT(CASE WHEN b.response_time_minutes > 15 AND b.response_time_minutes <= 60 THEN 1 END)::INTEGER as good_responses,
    COUNT(CASE WHEN b.response_time_minutes > 60 AND b.response_time_minutes <= 240 THEN 1 END)::INTEGER as fair_responses,
    COUNT(CASE WHEN b.response_time_minutes > 240 THEN 1 END)::INTEGER as poor_responses
    
  FROM bookings b
  JOIN provider_businesses pb ON b.provider_business_id = pb.id
  WHERE pb.provider_id = p_provider_id
    AND b.requested_at >= NOW() - INTERVAL '30 days'
    AND b.requested_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if time is during business hours
CREATE OR REPLACE FUNCTION is_during_business_hours(
  check_time TIMESTAMP WITH TIME ZONE,
  business_hours JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  day_name TEXT;
  day_hours JSONB;
  open_time TIME;
  close_time TIME;
  check_time_local TIME;
BEGIN
  -- Get day of week (0 = Sunday, 1 = Monday, etc.)
  day_name = CASE EXTRACT(DOW FROM check_time)
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'  
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END;
  
  -- Get business hours for this day
  day_hours = business_hours->day_name;
  
  -- If no hours defined for this day or closed, return false
  IF day_hours IS NULL OR (day_hours->>'isOpen')::BOOLEAN = false THEN
    RETURN false;
  END IF;
  
  -- Get open and close times
  open_time = (day_hours->>'openTime')::TIME;
  close_time = (day_hours->>'closeTime')::TIME;
  check_time_local = check_time::TIME;
  
  -- Check if time is within business hours
  RETURN check_time_local >= open_time AND check_time_local <= close_time;
  
EXCEPTION WHEN others THEN
  -- If any error in parsing, assume it's during business hours
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to update response time when booking status changes
CREATE OR REPLACE FUNCTION update_booking_response_time()
RETURNS TRIGGER AS $$
DECLARE
  pb_business_hours JSONB;
BEGIN
  -- When booking status changes from 'pending' to any responded status
  IF OLD.status = 'pending' AND NEW.status IN ('confirmed', 'declined', 'cancelled_by_provider') THEN
    
    -- Set responded_at to current time
    NEW.responded_at = NOW();
    
    -- Calculate response time in minutes
    NEW.response_time_minutes = EXTRACT(EPOCH FROM (NOW() - COALESCE(NEW.requested_at, NEW.created_at)))/60;
    
    -- Get business hours for the provider business
    SELECT COALESCE(business_hours, '{}') INTO pb_business_hours
    FROM provider_businesses 
    WHERE id = NEW.provider_business_id;
    
    -- Check if the response was during business hours
    NEW.is_during_business_hours = is_during_business_hours(NEW.responded_at, pb_business_hours);
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic response time updates
DROP TRIGGER IF EXISTS booking_response_time_trigger ON bookings;
CREATE TRIGGER booking_response_time_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_response_time();

-- Update existing bookings that already have responses but no response time
UPDATE bookings 
SET 
  response_time_minutes = EXTRACT(EPOCH FROM (updated_at - COALESCE(requested_at, created_at)))/60,
  responded_at = updated_at
WHERE status IN ('confirmed', 'declined', 'cancelled_by_provider') 
  AND response_time_minutes IS NULL
  AND updated_at > COALESCE(requested_at, created_at);

-- Create view for response time analytics
CREATE OR REPLACE VIEW provider_response_analytics AS
SELECT 
  pb.id as provider_business_id,
  pb.name as business_name,
  pb.provider_id,
  COUNT(b.id) as total_bookings_30d,
  COUNT(CASE WHEN b.responded_at IS NOT NULL THEN 1 END) as responded_bookings,
  ROUND(AVG(b.response_time_minutes), 1) as avg_response_minutes,
  ROUND(
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE COUNT(CASE WHEN b.responded_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)
    END, 1
  ) as response_rate_percent,
  MIN(b.response_time_minutes) as fastest_response_minutes,
  MAX(b.response_time_minutes) as slowest_response_minutes,
  COUNT(CASE WHEN b.response_time_minutes <= 15 THEN 1 END) as excellent_responses,
  COUNT(CASE WHEN b.response_time_minutes > 15 AND b.response_time_minutes <= 60 THEN 1 END) as good_responses,
  COUNT(CASE WHEN b.response_time_minutes > 60 AND b.response_time_minutes <= 240 THEN 1 END) as fair_responses,
  COUNT(CASE WHEN b.response_time_minutes > 240 THEN 1 END) as poor_responses
FROM provider_businesses pb
LEFT JOIN bookings b ON pb.id = b.provider_business_id 
  AND b.requested_at >= NOW() - INTERVAL '30 days'
  AND b.requested_at IS NOT NULL
GROUP BY pb.id, pb.name, pb.provider_id;

-- Grant permissions
GRANT SELECT ON provider_response_analytics TO anon;
GRANT SELECT ON provider_response_analytics TO authenticated;

-- Function to manually update booking response time (for testing/corrections)
CREATE OR REPLACE FUNCTION update_booking_response_time_manual(p_booking_id UUID)
RETURNS VOID AS $$
DECLARE
  booking_record RECORD;
  pb_business_hours JSONB;
BEGIN
  -- Get booking record
  SELECT * INTO booking_record FROM bookings WHERE id = p_booking_id;
  
  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;
  
  -- Only update if booking has been responded to
  IF booking_record.status IN ('confirmed', 'declined', 'cancelled_by_provider') THEN
    
    -- Get business hours for the provider business
    SELECT COALESCE(business_hours, '{}') INTO pb_business_hours
    FROM provider_businesses 
    WHERE id = booking_record.provider_business_id;
    
    -- Update the booking
    UPDATE bookings SET
      responded_at = COALESCE(responded_at, updated_at),
      response_time_minutes = EXTRACT(EPOCH FROM (COALESCE(responded_at, updated_at) - COALESCE(requested_at, created_at)))/60,
      is_during_business_hours = is_during_business_hours(COALESCE(responded_at, updated_at), pb_business_hours)
    WHERE id = p_booking_id;
    
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON COLUMN bookings.requested_at IS 'When the booking request was made by customer';
COMMENT ON COLUMN bookings.responded_at IS 'When the provider responded to the booking request';
COMMENT ON COLUMN bookings.response_time_minutes IS 'Time taken to respond to booking in minutes';
COMMENT ON COLUMN bookings.is_during_business_hours IS 'Whether the response was made during business hours';
COMMENT ON FUNCTION calculate_response_time_stats(UUID) IS 'Calculates comprehensive response time statistics for a provider';
COMMENT ON FUNCTION update_booking_response_time_manual(UUID) IS 'Manually updates response time for a booking (for corrections)';
COMMENT ON VIEW provider_response_analytics IS 'Analytics view for provider response time metrics';