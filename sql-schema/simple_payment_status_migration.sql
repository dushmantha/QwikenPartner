-- Add payment_status column to shop_bookings table
-- This is the simplest approach

ALTER TABLE shop_bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- Add constraint
ALTER TABLE shop_bookings 
DROP CONSTRAINT IF EXISTS check_payment_status;

ALTER TABLE shop_bookings 
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create index
DROP INDEX IF EXISTS idx_shop_bookings_payment_status;
CREATE INDEX idx_shop_bookings_payment_status ON shop_bookings(payment_status);

-- Reload schema
NOTIFY pgrst, 'reload schema';

SELECT 'Payment status column added successfully' as message;