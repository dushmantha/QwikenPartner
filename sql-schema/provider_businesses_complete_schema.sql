-- COMPREHENSIVE PROVIDER_BUSINESSES TABLE SCHEMA
-- Main shop table that creates related data in other tables when shop is created
-- Based on UI fields from ShopDetailsScreen and related table schemas

DROP TABLE IF EXISTS provider_businesses CASCADE;

CREATE TABLE provider_businesses (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL, -- Links to auth.users table
    
    -- Basic Business Information (Required in UI)
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Beauty & Wellness',
    
    -- Contact Information (UI Fields)
    phone TEXT,
    email TEXT,
    website_url TEXT,
    
    -- Address Information (UI Fields)
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Sweden',
    
    -- Business Media (UI Image Pickers)
    image_url TEXT, -- Main business image (first shop photo or logo)
    images TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of shop photos
    logo_url TEXT, -- Business logo
    
    -- Business Hours (UI Component - Complex)
    business_hours JSONB DEFAULT '[
        {"day": "Monday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Tuesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Wednesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Thursday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Friday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Saturday", "isOpen": true, "openTime": "10:00", "closeTime": "16:00"},
        {"day": "Sunday", "isOpen": false, "openTime": "10:00", "closeTime": "16:00"}
    ]'::jsonb,
    
    -- Special Days/Holidays (UI Calendar Component)
    special_days JSONB DEFAULT '[]'::jsonb,
    
    -- Business Settings (UI Form Fields)
    timezone TEXT DEFAULT 'Europe/Stockholm',
    advance_booking_days INTEGER DEFAULT 30,
    slot_duration INTEGER DEFAULT 60,
    buffer_time INTEGER DEFAULT 15,
    auto_approval BOOLEAN DEFAULT true,
    first_time_discount_active BOOLEAN DEFAULT true,
    
    -- Legacy Business Hours (For backward compatibility)
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '17:00',
    
    -- Related Records ID Lists (Links to other tables)
    staff_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Links to shop_staff table
    service_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Links to shop_services table
    discount_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Links to shop_discounts table
    
    -- System Fields (Used in UI)
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential indexes for performance
CREATE INDEX idx_provider_businesses_provider_id ON provider_businesses(provider_id);
CREATE INDEX idx_provider_businesses_category ON provider_businesses(category);
CREATE INDEX idx_provider_businesses_city ON provider_businesses(city);
CREATE INDEX idx_provider_businesses_state ON provider_businesses(state);
CREATE INDEX idx_provider_businesses_country ON provider_businesses(country);
CREATE INDEX idx_provider_businesses_is_active ON provider_businesses(is_active);
CREATE INDEX idx_provider_businesses_name ON provider_businesses(name);
CREATE INDEX idx_provider_businesses_images ON provider_businesses USING GIN(images);
CREATE INDEX idx_provider_businesses_staff_ids ON provider_businesses USING GIN(staff_ids);
CREATE INDEX idx_provider_businesses_service_ids ON provider_businesses USING GIN(service_ids);
CREATE INDEX idx_provider_businesses_discount_ids ON provider_businesses USING GIN(discount_ids);

-- Full-text search index for business discovery
CREATE INDEX idx_provider_businesses_search ON provider_businesses USING GIN(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(category, '') || ' ' ||
        COALESCE(city, '') || ' ' ||
        COALESCE(state, '')
    )
);

-- Update trigger
CREATE OR REPLACE FUNCTION update_provider_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_businesses_updated_at
    BEFORE UPDATE ON provider_businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_businesses_updated_at();

-- Function to create related table records when a shop is created
CREATE OR REPLACE FUNCTION create_shop_related_records()
RETURNS TRIGGER AS $$
DECLARE
    new_discount_id UUID;
BEGIN
    -- NOTE: Removed automatic staff creation - shop owners should add their own staff
    -- NOTE: Removed automatic service creation - shop owners should add their own services
    -- This gives shop owners full control over their business setup
    
    -- Create welcome discount for new shops
    IF NOT EXISTS (SELECT 1 FROM shop_discounts WHERE shop_discounts.shop_id = NEW.id) THEN
        INSERT INTO shop_discounts (
            shop_id,
            type,
            value,
            description,
            start_date,
            end_date,
            usage_limit,
            used_count,
            applicable_services,
            conditions,
            is_active
        ) VALUES (
            NEW.id,
            'percentage',
            10.00,
            'Welcome Discount - 10% off your first visit!',
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '90 days',
            100,
            0,
            ARRAY[]::UUID[],
            '{"first_time_customer": true, "welcome_offer": true}'::jsonb,
            NEW.first_time_discount_active
        ) RETURNING id INTO new_discount_id;
        
        -- Add discount ID to provider_businesses.discount_ids array
        UPDATE provider_businesses 
        SET discount_ids = array_append(discount_ids, new_discount_id)
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create related records when shop is created
CREATE TRIGGER create_shop_related_records_trigger
    AFTER INSERT ON provider_businesses
    FOR EACH ROW
    EXECUTE FUNCTION create_shop_related_records();

-- Simple RLS policies
ALTER TABLE provider_businesses ENABLE ROW LEVEL SECURITY;

-- Policy for shop owners to manage their own businesses
DROP POLICY IF EXISTS "Shop owners can manage their businesses" ON provider_businesses;
CREATE POLICY "Shop owners can manage their businesses" ON provider_businesses
    FOR ALL USING (
        provider_id = auth.uid()
    );

-- Policy for public to view active businesses
DROP POLICY IF EXISTS "Public can view active businesses" ON provider_businesses;
CREATE POLICY "Public can view active businesses" ON provider_businesses
    FOR SELECT USING (
        is_active = true
    );

-- Grant permissions
GRANT ALL ON provider_businesses TO postgres;
GRANT ALL ON provider_businesses TO authenticated;
GRANT SELECT ON provider_businesses TO anon;
GRANT ALL ON provider_businesses TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- Test insert to verify shop creation and related records
DO $$
DECLARE
    test_provider_id UUID := gen_random_uuid();
    test_shop_id UUID;
    staff_count INTEGER;
    services_count INTEGER;
    discounts_count INTEGER;
BEGIN
    -- Insert test shop
    INSERT INTO provider_businesses (
        provider_id,
        name,
        description,
        category,
        phone,
        email,
        website_url,
        address,
        city,
        state,
        country,
        image_url,
        images,
        logo_url,
        business_hours,
        special_days,
        timezone,
        advance_booking_days,
        slot_duration,
        buffer_time,
        auto_approval,
        first_time_discount_active,
        is_active
    ) VALUES (
        test_provider_id,
        'TEST_Modern Hair Salon',
        'A premium hair salon offering cutting-edge styles and treatments in a relaxing atmosphere.',
        'Beauty & Wellness',
        '+46 70 123 4567',
        'info@modernhairsalon.se',
        'https://www.modernhairsalon.se',
        'Kungsgatan 45',
        'Stockholm',
        'Stockholm',
        'Sweden',
        'https://example.com/salon-main.jpg',
        ARRAY['https://example.com/salon1.jpg', 'https://example.com/salon2.jpg', 'https://example.com/salon3.jpg'],
        'https://example.com/salon-logo.png',
        '[
            {"day": "Monday", "isOpen": true, "openTime": "10:00", "closeTime": "19:00"},
            {"day": "Tuesday", "isOpen": true, "openTime": "10:00", "closeTime": "19:00"},
            {"day": "Wednesday", "isOpen": true, "openTime": "10:00", "closeTime": "19:00"},
            {"day": "Thursday", "isOpen": true, "openTime": "10:00", "closeTime": "20:00"},
            {"day": "Friday", "isOpen": true, "openTime": "10:00", "closeTime": "20:00"},
            {"day": "Saturday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
            {"day": "Sunday", "isOpen": false, "openTime": "11:00", "closeTime": "16:00"}
        ]'::jsonb,
        '[
            {"date": "2024-12-25", "name": "Christmas Day", "isOpen": false, "description": "Closed for Christmas"},
            {"date": "2024-01-01", "name": "New Year Day", "isOpen": false, "description": "Closed for New Year"}
        ]'::jsonb,
        'Europe/Stockholm',
        14,
        30,
        10,
        false,
        true,
        true
    ) RETURNING id INTO test_shop_id;
    
    -- Verify related records were created
    SELECT COUNT(*) INTO staff_count FROM shop_staff WHERE shop_id = test_shop_id;
    SELECT COUNT(*) INTO services_count FROM shop_services WHERE shop_id = test_shop_id;
    SELECT COUNT(*) INTO discounts_count FROM shop_discounts WHERE shop_id = test_shop_id;
    
    -- Report results (Note: Only discounts are auto-created now, staff and services are added manually)
    IF discounts_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Shop created successfully!';
        RAISE NOTICE '  - Welcome discount created: %', discounts_count;
        RAISE NOTICE '  - Staff to be added manually by owner: %', staff_count;
        RAISE NOTICE '  - Services to be added manually by owner: %', services_count;
        RAISE NOTICE 'NOTE: Shop owners now have full control to add their own staff and services.';
    ELSE
        RAISE EXCEPTION 'ERROR: Shop creation may have failed - Discounts: %', discounts_count;
    END IF;
    
    -- Clean up test data
    DELETE FROM shop_discounts WHERE shop_id = test_shop_id;
    DELETE FROM shop_services WHERE shop_id = test_shop_id;
    DELETE FROM shop_staff WHERE shop_id = test_shop_id;
    DELETE FROM provider_businesses WHERE id = test_shop_id;
    
    RAISE NOTICE 'Test data cleaned up successfully';
END $$;

-- Final verification
SELECT 
    'provider_businesses table created with all UI fields!' as result,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'provider_businesses';

-- Show all columns created
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'provider_businesses'
ORDER BY ordinal_position;

-- Verify triggers and functions
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'provider_businesses';

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'provider_businesses'
ORDER BY indexname;

SELECT 'Comprehensive provider_businesses schema deployed successfully!' as final_result;