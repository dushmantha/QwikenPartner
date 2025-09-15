-- ENHANCED SHOP_BOOKINGS TABLE SCHEMA
-- Adds provider_id, service_option_ids, and discount_id

-- Drop existing table if exists
DROP TABLE IF EXISTS shop_bookings CASCADE;

CREATE TABLE shop_bookings (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) UNIQUE, -- Human-readable booking reference
    
    -- Relationships
    customer_id UUID, -- Can be NULL for anonymous customers
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL, -- Owner of the shop
    staff_id UUID REFERENCES shop_staff(id) ON DELETE SET NULL, -- Can be NULL for "any staff"
    service_id UUID NOT NULL REFERENCES shop_services(id) ON DELETE RESTRICT,
    
    -- Service Options and Discounts
    service_option_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Array of selected service option IDs
    discount_id UUID REFERENCES shop_discounts(id) ON DELETE SET NULL, -- Applied discount
    
    -- Customer Information
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    
    -- Booking Date and Time
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Service Details (snapshot at booking time)
    service_name TEXT NOT NULL,
    
    -- Pricing
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    
    -- Booking Status
    status VARCHAR(20) DEFAULT 'confirmed' 
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- Payment Status
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    
    -- Additional Details
    notes TEXT,
    
    -- Cancellation
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT valid_booking_date CHECK (booking_date >= CURRENT_DATE - INTERVAL '1 year')
);

-- Indexes for performance
CREATE INDEX idx_shop_bookings_shop_id ON shop_bookings(shop_id);
CREATE INDEX idx_shop_bookings_provider_id ON shop_bookings(provider_id);
CREATE INDEX idx_shop_bookings_service_id ON shop_bookings(service_id);
CREATE INDEX idx_shop_bookings_staff_id ON shop_bookings(staff_id);
CREATE INDEX idx_shop_bookings_discount_id ON shop_bookings(discount_id);
CREATE INDEX idx_shop_bookings_customer_phone ON shop_bookings(customer_phone);
CREATE INDEX idx_shop_bookings_booking_date ON shop_bookings(booking_date);
CREATE INDEX idx_shop_bookings_status ON shop_bookings(status);
CREATE INDEX idx_shop_bookings_payment_status ON shop_bookings(payment_status);
CREATE INDEX idx_shop_bookings_service_option_ids ON shop_bookings USING GIN(service_option_ids);
CREATE INDEX idx_shop_bookings_booking_reference ON shop_bookings(booking_reference);

-- Drop existing functions and triggers first
DROP TRIGGER IF EXISTS update_shop_bookings_updated_at ON shop_bookings;
DROP TRIGGER IF EXISTS set_booking_reference_trigger ON shop_bookings;
DROP FUNCTION IF EXISTS update_shop_bookings_updated_at();
DROP FUNCTION IF EXISTS set_booking_reference();

-- Update trigger
CREATE OR REPLACE FUNCTION update_shop_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_bookings_updated_at
    BEFORE UPDATE ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_bookings_updated_at();

-- Drop existing function first
DROP FUNCTION IF EXISTS generate_booking_reference();

-- Generate booking reference function
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate reference like BUZ-240827-001
        ref := 'BUZ-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
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

-- Trigger to auto-generate booking reference
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := generate_booking_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_reference_trigger
    BEFORE INSERT ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_reference();

-- RLS policies
ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can manage their bookings" ON shop_bookings;
CREATE POLICY "Providers can manage their bookings" ON shop_bookings
    FOR ALL USING (
        provider_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM provider_businesses pb
            WHERE pb.id = shop_bookings.shop_id
            AND pb.provider_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON shop_bookings TO postgres;
GRANT ALL ON shop_bookings TO authenticated;
GRANT ALL ON shop_bookings TO anon;
GRANT ALL ON shop_bookings TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Enhanced shop_bookings table created successfully!' as result;