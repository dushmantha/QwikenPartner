-- COMPREHENSIVE BOOKING SYSTEM SCHEMA
-- This schema handles services, service options, bookings, and all related functionality
-- Run this to replace existing booking tables with a complete system

-- =============================================================================
-- DROP EXISTING TABLES (if they exist) to start fresh
-- =============================================================================

DROP TABLE IF EXISTS booking_service_options CASCADE;
DROP TABLE IF EXISTS shop_bookings CASCADE;
DROP TABLE IF EXISTS service_options CASCADE;
DROP TABLE IF EXISTS shop_staff CASCADE;
DROP TABLE IF EXISTS shop_services CASCADE;

-- =============================================================================
-- 1. SHOP SERVICES TABLE
-- =============================================================================

CREATE TABLE shop_services (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    
    -- Basic Service Information
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- Pricing and Duration
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    
    -- Service Type and Location
    service_type VARCHAR(20) DEFAULT 'appointment' CHECK (service_type IN ('appointment', 'walk_in', 'both')),
    location_type VARCHAR(20) DEFAULT 'in_house' CHECK (location_type IN ('in_house', 'on_location', 'both')),
    
    -- Staff Assignment
    assigned_staff UUID[] DEFAULT ARRAY[]::UUID[], -- Array of staff IDs
    
    -- Service Media
    image_url TEXT,
    images TEXT[], -- Array of image URLs
    
    -- Availability Settings
    is_active BOOLEAN DEFAULT true,
    min_advance_booking INTEGER DEFAULT 0, -- Minutes required in advance
    max_advance_booking INTEGER DEFAULT 10080, -- Minutes (default 7 days)
    buffer_time_before INTEGER DEFAULT 0, -- Minutes before appointment
    buffer_time_after INTEGER DEFAULT 0, -- Minutes after appointment
    
    -- Cancellation Policy
    cancellation_window INTEGER DEFAULT 1440, -- Minutes (default 24 hours)
    cancellation_fee DECIMAL(10,2) DEFAULT 0.00,
    
    -- System Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. SERVICE OPTIONS TABLE
-- =============================================================================

CREATE TABLE service_options (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES shop_services(id) ON DELETE CASCADE,
    
    -- Option Details
    name TEXT NOT NULL,
    description TEXT,
    option_type VARCHAR(20) DEFAULT 'addon' CHECK (option_type IN ('addon', 'upgrade', 'variant', 'required')),
    
    -- Pricing
    price_adjustment DECIMAL(10,2) DEFAULT 0.00, -- Additional cost (can be negative for discounts)
    price_type VARCHAR(10) DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'percentage')),
    
    -- Duration Impact
    duration_adjustment INTEGER DEFAULT 0, -- Additional minutes (can be negative)
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    max_quantity INTEGER DEFAULT 1, -- How many times this option can be selected
    
    -- Display Order
    sort_order INTEGER DEFAULT 0,
    
    -- System Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. SHOP STAFF TABLE
-- =============================================================================

CREATE TABLE shop_staff (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    
    -- Basic Information
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT,
    
    -- Professional Details
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    avatar_url TEXT,
    
    -- Work Schedule
    work_schedule JSONB DEFAULT '{
        "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    
    -- Leave Management
    leave_dates JSONB DEFAULT '[]'::jsonb,
    
    -- System Fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. COMPREHENSIVE BOOKINGS TABLE
-- =============================================================================

CREATE TABLE shop_bookings (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL, -- Human-readable booking reference
    
    -- Relationships
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES shop_services(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL,
    assigned_staff_id UUID REFERENCES shop_staff(id) ON DELETE SET NULL, -- Can be null for "any staff"
    
    -- Customer Information
    customer_id UUID, -- Link to customers table if exists
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    
    -- Booking Date and Time
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Service Details
    service_name TEXT NOT NULL, -- Snapshot of service name at booking time
    base_duration_minutes INTEGER NOT NULL,
    total_duration_minutes INTEGER NOT NULL, -- Including options
    
    -- Pricing
    base_price DECIMAL(10,2) NOT NULL,
    options_price DECIMAL(10,2) DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Booking Type and Status
    booking_type VARCHAR(20) DEFAULT 'standard' CHECK (booking_type IN ('standard', 'quick', 'recurring', 'walk_in')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    
    -- Payment Information
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'refunded', 'failed')),
    payment_method VARCHAR(20),
    payment_reference TEXT,
    
    -- Communication
    notification_sent BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    confirmation_sent BOOLEAN DEFAULT false,
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,
    
    -- Timestamps
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- System Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. BOOKING SERVICE OPTIONS (Junction Table)
-- =============================================================================

CREATE TABLE booking_service_options (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES shop_bookings(id) ON DELETE CASCADE,
    service_option_id UUID NOT NULL REFERENCES service_options(id) ON DELETE RESTRICT,
    
    -- Option Details (snapshot at booking time)
    option_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    
    -- System Fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Shop Services Indexes
CREATE INDEX idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX idx_shop_services_provider_id ON shop_services(provider_id);
CREATE INDEX idx_shop_services_category ON shop_services(category);
CREATE INDEX idx_shop_services_is_active ON shop_services(is_active);
CREATE INDEX idx_shop_services_location_type ON shop_services(location_type);
CREATE INDEX idx_shop_services_assigned_staff ON shop_services USING GIN(assigned_staff);

-- Shop Staff Indexes
CREATE INDEX idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX idx_shop_staff_email ON shop_staff(email);
CREATE INDEX idx_shop_staff_is_active ON shop_staff(is_active);
CREATE INDEX idx_shop_staff_specialties ON shop_staff USING GIN(specialties);

-- Service Options Indexes
CREATE INDEX idx_service_options_service_id ON service_options(service_id);
CREATE INDEX idx_service_options_is_active ON service_options(is_active);
CREATE INDEX idx_service_options_sort_order ON service_options(sort_order);

-- Bookings Indexes
CREATE INDEX idx_shop_bookings_shop_id ON shop_bookings(shop_id);
CREATE INDEX idx_shop_bookings_service_id ON shop_bookings(service_id);
CREATE INDEX idx_shop_bookings_provider_id ON shop_bookings(provider_id);
CREATE INDEX idx_shop_bookings_assigned_staff_id ON shop_bookings(assigned_staff_id);
CREATE INDEX idx_shop_bookings_customer_phone ON shop_bookings(customer_phone);
CREATE INDEX idx_shop_bookings_customer_email ON shop_bookings(customer_email);
CREATE INDEX idx_shop_bookings_booking_date ON shop_bookings(booking_date);
CREATE INDEX idx_shop_bookings_start_time ON shop_bookings(start_time);
CREATE INDEX idx_shop_bookings_status ON shop_bookings(status);
CREATE INDEX idx_shop_bookings_payment_status ON shop_bookings(payment_status);
CREATE INDEX idx_shop_bookings_booking_reference ON shop_bookings(booking_reference);
CREATE INDEX idx_shop_bookings_date_time ON shop_bookings(booking_date, start_time);
CREATE INDEX idx_shop_bookings_staff_date ON shop_bookings(assigned_staff_id, booking_date);

-- Booking Options Indexes
CREATE INDEX idx_booking_service_options_booking_id ON booking_service_options(booking_id);
CREATE INDEX idx_booking_service_options_service_option_id ON booking_service_options(service_option_id);

-- =============================================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================================================

-- Services update trigger
CREATE OR REPLACE FUNCTION update_shop_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_services_updated_at
    BEFORE UPDATE ON shop_services
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_services_updated_at();

-- Shop staff update trigger
CREATE OR REPLACE FUNCTION update_shop_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_staff_updated_at
    BEFORE UPDATE ON shop_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_staff_updated_at();

-- Service options update trigger
CREATE OR REPLACE FUNCTION update_service_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_options_updated_at
    BEFORE UPDATE ON service_options
    FOR EACH ROW
    EXECUTE FUNCTION update_service_options_updated_at();

-- Bookings update trigger
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

-- =============================================================================
-- AUTO-GENERATE BOOKING REFERENCE
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_reference IS NULL OR NEW.booking_reference = '' THEN
        -- Generate format: BB-YYYYMMDD-XXXX (where XXXX is random 4-digit number)
        NEW.booking_reference = 'BB-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Ensure uniqueness (retry if collision)
        WHILE EXISTS (SELECT 1 FROM shop_bookings WHERE booking_reference = NEW.booking_reference AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
            NEW.booking_reference = 'BB-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_reference_trigger
    BEFORE INSERT ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_reference();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_service_options ENABLE ROW LEVEL SECURITY;

-- Services policies
DROP POLICY IF EXISTS "Services are viewable by everyone" ON shop_services;
CREATE POLICY "Services are viewable by everyone" ON shop_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Services are manageable by provider" ON shop_services;
CREATE POLICY "Services are manageable by provider" ON shop_services FOR ALL USING (true) WITH CHECK (true);

-- Shop staff policies
DROP POLICY IF EXISTS "Staff are viewable by everyone" ON shop_staff;
CREATE POLICY "Staff are viewable by everyone" ON shop_staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff are manageable by provider" ON shop_staff;
CREATE POLICY "Staff are manageable by provider" ON shop_staff FOR ALL USING (true) WITH CHECK (true);

-- Service options policies
DROP POLICY IF EXISTS "Service options are viewable by everyone" ON service_options;
CREATE POLICY "Service options are viewable by everyone" ON service_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service options are manageable by provider" ON service_options;
CREATE POLICY "Service options are manageable by provider" ON service_options FOR ALL USING (true) WITH CHECK (true);

-- Bookings policies
DROP POLICY IF EXISTS "Bookings are viewable by everyone" ON shop_bookings;
CREATE POLICY "Bookings are viewable by everyone" ON shop_bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Bookings are manageable by provider" ON shop_bookings;
CREATE POLICY "Bookings are manageable by provider" ON shop_bookings FOR ALL USING (true) WITH CHECK (true);

-- Booking options policies
DROP POLICY IF EXISTS "Booking options are viewable by everyone" ON booking_service_options;
CREATE POLICY "Booking options are viewable by everyone" ON booking_service_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Booking options are manageable by provider" ON booking_service_options;
CREATE POLICY "Booking options are manageable by provider" ON booking_service_options FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions for all tables
GRANT ALL ON shop_services TO postgres, authenticated, anon, service_role;
GRANT ALL ON shop_staff TO postgres, authenticated, anon, service_role;
GRANT ALL ON service_options TO postgres, authenticated, anon, service_role;
GRANT ALL ON shop_bookings TO postgres, authenticated, anon, service_role;
GRANT ALL ON booking_service_options TO postgres, authenticated, anon, service_role;

-- =============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =============================================================================

-- Uncomment the following lines to insert sample data after you have real shop/provider data

-- INSERT INTO shop_services (
--     shop_id, provider_id, name, description, category, 
--     base_price, duration_minutes, location_type, is_active
-- ) VALUES (
--     'your-real-shop-id'::UUID,
--     'your-real-provider-id'::UUID,
--     'Premium Haircut',
--     'Professional haircut with wash and styling',
--     'Hair Services',
--     45.00,
--     60,
--     'in_house',
--     true
-- );

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get available time slots for a service
CREATE OR REPLACE FUNCTION get_available_slots(
    p_service_id UUID,
    p_date DATE,
    p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
    slot_time TIME,
    is_available BOOLEAN,
    booking_id UUID
) AS $$
BEGIN
    -- This is a simplified version - in production you'd want more sophisticated logic
    RETURN QUERY
    WITH time_slots AS (
        SELECT generate_series(
            '09:00'::TIME,
            '17:00'::TIME,
            '30 minutes'::INTERVAL
        )::TIME as slot_time
    ),
    existing_bookings AS (
        SELECT start_time, end_time, id as booking_id
        FROM shop_bookings 
        WHERE service_id = p_service_id 
        AND booking_date = p_date
        AND status IN ('confirmed', 'in_progress')
        AND (p_staff_id IS NULL OR assigned_staff_id = p_staff_id OR assigned_staff_id IS NULL)
    )
    SELECT 
        ts.slot_time,
        (eb.start_time IS NULL) as is_available,
        eb.booking_id
    FROM time_slots ts
    LEFT JOIN existing_bookings eb ON (
        ts.slot_time >= eb.start_time AND 
        ts.slot_time < eb.end_time
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 'Comprehensive booking system schema created successfully!' as result;

-- Show table information
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('shop_services', 'shop_staff', 'service_options', 'shop_bookings', 'booking_service_options')
AND schemaname = 'public'
ORDER BY tablename;