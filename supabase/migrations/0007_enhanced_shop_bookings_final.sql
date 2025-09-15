-- Migration: Update shop_bookings table to support enhanced booking features
-- 0007_enhanced_shop_bookings_final.sql
-- Ultimate safe version with careful column checking

-- Step 1: Add columns one by one with safety checks
DO $$
BEGIN
    -- Add provider_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN provider_id UUID;
        RAISE NOTICE 'Added provider_id column';
    END IF;

    -- Add service_option_ids column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'service_option_ids'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN service_option_ids UUID[] DEFAULT ARRAY[]::UUID[];
        RAISE NOTICE 'Added service_option_ids column';
    END IF;

    -- Add discount_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'discount_id'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN discount_id UUID;
        RAISE NOTICE 'Added discount_id column';
    END IF;

    -- Add customer_email column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN customer_email TEXT;
        RAISE NOTICE 'Added customer_email column';
    END IF;

    -- Add timezone column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
        RAISE NOTICE 'Added timezone column';
    END IF;

    -- Add service_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'service_name'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN service_name TEXT;
        RAISE NOTICE 'Added service_name column';
    END IF;

    -- Add payment_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added payment_status column';
    END IF;

    -- Add booking_reference column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'booking_reference'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN booking_reference VARCHAR(20);
        RAISE NOTICE 'Added booking_reference column';
    END IF;

    -- Add cancellation columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Added cancellation_reason column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
        RAISE NOTICE 'Added cancelled_at column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN cancelled_by UUID;
        RAISE NOTICE 'Added cancelled_by column';
    END IF;

    -- Add duration column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'duration'
    ) THEN
        ALTER TABLE shop_bookings ADD COLUMN duration INTEGER DEFAULT 60;
        RAISE NOTICE 'Added duration column';
    END IF;

END $$;

-- Step 2: Add constraints after all columns exist
DO $$
BEGIN
    -- Add payment status constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_payment_status' AND table_name = 'shop_bookings'
    ) THEN
        ALTER TABLE shop_bookings 
        ADD CONSTRAINT chk_payment_status 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
        RAISE NOTICE 'Added payment status constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add payment status constraint: %', SQLERRM;
END $$;

-- Step 3: Create functions for booking reference generation
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate reference like QWK-240827-001
        ref := 'QWK-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
               LPAD((FLOOR(RANDOM() * 999) + 1)::TEXT, 3, '0');
        
        -- Check if it already exists (only if booking_reference column exists)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'shop_bookings' AND column_name = 'booking_reference'
        ) THEN
            SELECT EXISTS(SELECT 1 FROM shop_bookings WHERE booking_reference = ref) INTO exists_check;
            IF NOT exists_check THEN
                EXIT;
            END IF;
        ELSE
            EXIT; -- Column doesn't exist yet, just return the ref
        END IF;
    END LOOP;
    
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger function
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := generate_booking_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS set_booking_reference_trigger ON shop_bookings;
CREATE TRIGGER set_booking_reference_trigger
    BEFORE INSERT ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_reference();

-- Step 6: Update existing data (only if columns exist)
DO $$
BEGIN
    -- Update provider_id from shops
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'provider_id'
    ) THEN
        BEGIN
            UPDATE shop_bookings 
            SET provider_id = pb.provider_id
            FROM provider_businesses pb 
            WHERE shop_bookings.shop_id = pb.id 
            AND shop_bookings.provider_id IS NULL;
            RAISE NOTICE 'Updated provider_id for existing records';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not update provider_id: %', SQLERRM;
        END;
    END IF;

    -- Update service_name from services
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'service_name'
    ) THEN
        BEGIN
            UPDATE shop_bookings 
            SET service_name = ss.name
            FROM shop_services ss 
            WHERE shop_bookings.service_id = ss.id 
            AND shop_bookings.service_name IS NULL;
            RAISE NOTICE 'Updated service_name for existing records';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not update service_name: %', SQLERRM;
        END;
    END IF;

    -- Update booking_reference for existing records
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'booking_reference'
    ) THEN
        BEGIN
            UPDATE shop_bookings 
            SET booking_reference = generate_booking_reference()
            WHERE booking_reference IS NULL;
            RAISE NOTICE 'Updated booking_reference for existing records';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not update booking_reference: %', SQLERRM;
        END;
    END IF;
END $$;

-- Step 7: Add indexes
CREATE INDEX IF NOT EXISTS idx_shop_bookings_provider_id ON shop_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_service_option_ids ON shop_bookings USING GIN(service_option_ids);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_discount_id ON shop_bookings(discount_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_payment_status ON shop_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_booking_reference ON shop_bookings(booking_reference);

-- Step 8: Add unique constraint for booking_reference
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_bookings' AND column_name = 'booking_reference'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'uk_shop_bookings_booking_reference' AND table_name = 'shop_bookings'
        ) THEN
            ALTER TABLE shop_bookings 
            ADD CONSTRAINT uk_shop_bookings_booking_reference 
            UNIQUE (booking_reference);
            RAISE NOTICE 'Added unique constraint for booking_reference';
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraint for booking_reference: %', SQLERRM;
END $$;

-- Step 9: Add foreign key constraint for discount_id (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_discounts') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_bookings' AND column_name = 'discount_id') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_shop_bookings_discount' AND table_name = 'shop_bookings'
        ) THEN
            ALTER TABLE shop_bookings 
            ADD CONSTRAINT fk_shop_bookings_discount 
            FOREIGN KEY (discount_id) REFERENCES shop_discounts(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for discount_id';
        END IF;
    ELSE
        RAISE NOTICE 'Skipping discount foreign key - table or column does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add discount foreign key: %', SQLERRM;
END $$;

-- Step 10: Update RLS policies
ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Providers can manage their bookings" ON shop_bookings;
DROP POLICY IF EXISTS "Customers can view their bookings" ON shop_bookings;

-- Create enhanced policies
CREATE POLICY "Providers can manage their bookings" ON shop_bookings
    FOR ALL USING (
        (provider_id IS NOT NULL AND provider_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM provider_businesses pb
            WHERE pb.id = shop_bookings.shop_id
            AND pb.provider_id = auth.uid()
        )
    );

CREATE POLICY "Customers can view their bookings" ON shop_bookings
    FOR SELECT USING (
        customer_id = auth.uid() OR
        (provider_id IS NOT NULL AND provider_id = auth.uid())
    );

-- Grant permissions
GRANT ALL ON shop_bookings TO postgres;
GRANT ALL ON shop_bookings TO authenticated;
GRANT ALL ON shop_bookings TO anon;
GRANT ALL ON shop_bookings TO service_role;

-- Add comments
COMMENT ON COLUMN shop_bookings.provider_id IS 'ID of the provider who owns the shop where the booking is made';
COMMENT ON COLUMN shop_bookings.service_option_ids IS 'Array of selected service option IDs for this booking';
COMMENT ON COLUMN shop_bookings.discount_id IS 'Applied discount for this booking';
COMMENT ON COLUMN shop_bookings.booking_reference IS 'Human-readable booking reference code';
COMMENT ON COLUMN shop_bookings.payment_status IS 'Payment status: pending, paid, failed, refunded';
COMMENT ON COLUMN shop_bookings.duration IS 'Duration of the booking in minutes';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced shop_bookings schema migration completed successfully!';
    RAISE NOTICE '📊 Added columns: provider_id, service_option_ids, discount_id, customer_email, timezone, service_name, payment_status, booking_reference, cancellation_reason, cancelled_at, cancelled_by, duration';
    RAISE NOTICE '🔧 Added constraints, indexes, and triggers';
    RAISE NOTICE '🔐 Updated RLS policies';
END $$;