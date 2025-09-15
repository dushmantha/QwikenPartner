-- Migration: Add only the missing columns to shop_bookings
-- 0008_add_missing_booking_columns.sql
-- Minimal migration for remaining columns

DO $$
BEGIN
    RAISE NOTICE 'Adding missing columns to shop_bookings table...';
    
    -- Add booking_reference column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'booking_reference'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN booking_reference VARCHAR(20);
        RAISE NOTICE 'Added booking_reference column';
    ELSE
        RAISE NOTICE 'booking_reference column already exists';
    END IF;

    -- Add duration column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'duration'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN duration INTEGER DEFAULT 60;
        RAISE NOTICE 'Added duration column';
    ELSE
        RAISE NOTICE 'duration column already exists';
    END IF;

    -- Add cancellation columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Added cancellation_reason column';
    ELSE
        RAISE NOTICE 'cancellation_reason column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
        RAISE NOTICE 'Added cancelled_at column';
    ELSE
        RAISE NOTICE 'cancelled_at column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN cancelled_by UUID;
        RAISE NOTICE 'Added cancelled_by column';
    ELSE
        RAISE NOTICE 'cancelled_by column already exists';
    END IF;

END $$;

-- Create booking reference generation function
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate reference like QWK-250116-001
        ref := 'QWK-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
               LPAD((FLOOR(RANDOM() * 999) + 1)::TEXT, 3, '0');
        
        -- Check if it already exists
        SELECT EXISTS(SELECT 1 FROM shop_bookings WHERE booking_reference = ref) INTO exists_check;
        
        -- Exit loop if unique
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for auto-generating booking reference
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := generate_booking_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new bookings
DROP TRIGGER IF EXISTS set_booking_reference_trigger ON shop_bookings;
CREATE TRIGGER set_booking_reference_trigger
    BEFORE INSERT ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_reference();

-- Update existing records to have booking references
UPDATE shop_bookings 
SET booking_reference = generate_booking_reference()
WHERE booking_reference IS NULL;

-- Add unique constraint for booking_reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uk_shop_bookings_booking_reference' AND table_name = 'shop_bookings'
    ) THEN
        ALTER TABLE shop_bookings 
        ADD CONSTRAINT uk_shop_bookings_booking_reference 
        UNIQUE (booking_reference);
        RAISE NOTICE 'Added unique constraint for booking_reference';
    ELSE
        RAISE NOTICE 'Unique constraint for booking_reference already exists';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraint for booking_reference: %', SQLERRM;
END $$;

-- Add index for booking_reference
CREATE INDEX IF NOT EXISTS idx_shop_bookings_booking_reference ON shop_bookings(booking_reference);

-- Final message
DO $$
BEGIN
    RAISE NOTICE '✅ Missing columns migration completed successfully!';
    RAISE NOTICE '📊 Added: booking_reference, duration, cancellation_reason, cancelled_at, cancelled_by';
    RAISE NOTICE '🔧 Added booking reference generation and unique constraint';
END $$;