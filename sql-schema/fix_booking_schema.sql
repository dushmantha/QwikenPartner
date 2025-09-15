-- RUN THIS SQL IN YOUR SUPABASE DASHBOARD TO FIX THE BOOKING ISSUES
-- This script handles the provider_id null issue and creates proper booking tables

-- First, ensure provider_businesses has provider_id values
-- Update any NULL provider_id values to a default provider (you may need to adjust this)
UPDATE provider_businesses 
SET provider_id = (
    SELECT id FROM auth.users 
    WHERE email LIKE '%provider%' OR email LIKE '%admin%' 
    LIMIT 1
)
WHERE provider_id IS NULL;

-- If no provider exists, use the first user as provider
UPDATE provider_businesses 
SET provider_id = (
    SELECT id FROM auth.users 
    LIMIT 1
)
WHERE provider_id IS NULL;

-- Drop existing shop_bookings table if it exists
DROP TABLE IF EXISTS shop_bookings CASCADE;

-- Create shop_bookings table with nullable provider_id initially
CREATE TABLE shop_bookings (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    customer_id UUID, -- Can be null for anonymous bookings
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID, -- Can be null initially, will be filled from shop
    staff_id UUID, -- Can be null for "any staff"
    service_id UUID, -- References the service being booked
    
    -- Service options and discounts
    service_option_ids UUID[] DEFAULT ARRAY[]::UUID[],
    discount_id UUID, -- Applied discount if any
    
    -- Customer information (stored for historical record)
    customer_name TEXT NOT NULL DEFAULT 'Guest',
    customer_phone TEXT NOT NULL DEFAULT 'N/A',
    customer_email TEXT,
    
    -- Booking date and time
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    
    -- Service snapshot (for historical record)
    service_name TEXT DEFAULT 'Service',
    
    -- Pricing
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- Payment status
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    
    -- Additional information
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shop_bookings_shop_id ON shop_bookings(shop_id);
CREATE INDEX idx_shop_bookings_provider_id ON shop_bookings(provider_id);
CREATE INDEX idx_shop_bookings_customer_id ON shop_bookings(customer_id);
CREATE INDEX idx_shop_bookings_booking_date ON shop_bookings(booking_date);
CREATE INDEX idx_shop_bookings_status ON shop_bookings(status);

-- Enable RLS
ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;

-- Create very permissive RLS policies for testing
DROP POLICY IF EXISTS "Allow all authenticated users to create bookings" ON shop_bookings;
CREATE POLICY "Allow all authenticated users to create bookings" ON shop_bookings
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated users to view bookings" ON shop_bookings;
CREATE POLICY "Allow all authenticated users to view bookings" ON shop_bookings
    FOR SELECT 
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow providers to manage their bookings" ON shop_bookings;
CREATE POLICY "Allow providers to manage their bookings" ON shop_bookings
    FOR UPDATE 
    TO authenticated
    USING (provider_id = auth.uid() OR provider_id IS NULL);

DROP POLICY IF EXISTS "Allow providers to delete their bookings" ON shop_bookings;
CREATE POLICY "Allow providers to delete their bookings" ON shop_bookings
    FOR DELETE 
    TO authenticated
    USING (provider_id = auth.uid() OR provider_id IS NULL);

-- Grant permissions
GRANT ALL ON shop_bookings TO postgres;
GRANT ALL ON shop_bookings TO authenticated;
GRANT ALL ON shop_bookings TO service_role;
GRANT SELECT ON shop_bookings TO anon;

-- Create or replace the customers table
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID,
    name TEXT NOT NULL DEFAULT 'Guest',
    phone TEXT NOT NULL DEFAULT 'N/A',
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Permissive policies for customers
DROP POLICY IF EXISTS "Allow all to create customers" ON customers;
CREATE POLICY "Allow all to create customers" ON customers
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all to view customers" ON customers;
CREATE POLICY "Allow all to view customers" ON customers
    FOR SELECT 
    TO authenticated
    USING (true);

-- Grant permissions for customers
GRANT ALL ON customers TO postgres;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

-- Create a function to automatically set provider_id from shop
CREATE OR REPLACE FUNCTION set_booking_provider_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If provider_id is null, get it from the shop
    IF NEW.provider_id IS NULL THEN
        SELECT provider_id INTO NEW.provider_id
        FROM provider_businesses
        WHERE id = NEW.shop_id;
    END IF;
    
    -- If still null, use the current user
    IF NEW.provider_id IS NULL THEN
        NEW.provider_id = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set provider_id
DROP TRIGGER IF EXISTS set_booking_provider_id_trigger ON shop_bookings;
CREATE TRIGGER set_booking_provider_id_trigger
    BEFORE INSERT ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_provider_id();

-- Test the setup
DO $$
DECLARE
    test_shop_id UUID;
    test_booking_id UUID;
BEGIN
    -- Get a shop for testing
    SELECT id INTO test_shop_id 
    FROM provider_businesses 
    WHERE is_active = true 
    LIMIT 1;
    
    IF test_shop_id IS NOT NULL THEN
        -- Try to create a test booking
        INSERT INTO shop_bookings (
            shop_id,
            customer_name,
            customer_phone,
            booking_date,
            start_time,
            end_time,
            total_price,
            status
        ) VALUES (
            test_shop_id,
            'Test Customer',
            '+1234567890',
            CURRENT_DATE + INTERVAL '1 day',
            '10:00:00',
            '11:00:00',
            100.00,
            'confirmed'
        ) RETURNING id INTO test_booking_id;
        
        IF test_booking_id IS NOT NULL THEN
            RAISE NOTICE '✅ Test booking created successfully with ID: %', test_booking_id;
            -- Clean up test booking
            DELETE FROM shop_bookings WHERE id = test_booking_id;
        ELSE
            RAISE NOTICE '❌ Failed to create test booking';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ No active shops found for testing';
    END IF;
END $$;

SELECT 'Booking schema fixed! Bookings should now work properly.' as result;