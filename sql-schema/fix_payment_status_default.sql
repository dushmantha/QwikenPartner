-- Fix payment_status default value issue
-- Remove the DEFAULT 'pending' from payment_status column
-- This allows bookings to have NULL payment_status until they are completed

-- Alter the payment_status column to remove the DEFAULT value
ALTER TABLE shop_bookings 
ALTER COLUMN payment_status DROP DEFAULT;

-- Update existing bookings that are not completed but have payment_status = 'pending'
-- These should have NULL payment_status to appear in Service Queue
UPDATE shop_bookings 
SET payment_status = NULL 
WHERE status NOT IN ('completed', 'cancelled', 'no_show') 
AND payment_status = 'pending';

-- Verify the changes
SELECT 
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN payment_status IS NOT NULL THEN 1 END) as with_payment_status,
    COUNT(CASE WHEN payment_status IS NULL AND status NOT IN ('completed', 'cancelled', 'no_show') THEN 1 END) as in_service_queue
FROM shop_bookings;

-- Final check message
SELECT 'Migration complete! Bookings will now stay in Service Queue until marked as completed.' as message;