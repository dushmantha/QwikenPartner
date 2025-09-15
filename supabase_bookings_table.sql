-- Create bookings table with proper structure
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID,
  staff_id UUID,
  service_id UUID,
  booking_date DATE NOT NULL,
  booking_time TIME,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  service_name VARCHAR(255),
  total_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date ON bookings(staff_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_shop ON bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(booking_date, start_time);

-- Create a function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_staff_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE staff_id = p_staff_id
    AND booking_date = p_booking_date
    AND status IN ('confirmed', 'pending')
    AND (
      -- Check for time overlap
      (start_time < p_end_time AND end_time > p_start_time)
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON bookings TO service_role;

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = customer_id);

-- Users can create their own bookings
CREATE POLICY "Users can create own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = customer_id);

-- Staff can view bookings assigned to them
CREATE POLICY "Staff can view assigned bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = staff_id 
    OR 
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.user_id = auth.uid() 
      AND staff.id = bookings.staff_id
    )
  );

-- Service role has full access (for backend operations)
CREATE POLICY "Service role has full access" ON bookings
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');