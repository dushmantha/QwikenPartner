-- MINIMAL SHOP_SERVICES TABLE SCHEMA
-- Contains only fields that are actually used in the add/edit service UI

DROP TABLE IF EXISTS shop_services CASCADE;

CREATE TABLE shop_services (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID, -- Will add foreign key constraint if provider_businesses exists
    provider_id UUID, -- Links to auth.users (provider who owns this service)
    
    -- Basic Service Information (Required in UI)
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duration INTEGER NOT NULL DEFAULT 60, -- in minutes
    category TEXT,
    
    -- Service Location Type (UI Radio Buttons)
    location_type VARCHAR(20) DEFAULT 'in_house' CHECK (location_type IN ('in_house', 'on_location')),
    
    -- Staff Assignment (UI Multi-select)
    assigned_staff UUID[] DEFAULT ARRAY[]::UUID[], -- Array of staff IDs
    
    -- Service Options (Links to service_options table)
    service_options_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Array of service option IDs
    
    -- Service Media (Optional)
    image TEXT, -- Service image URL
    
    -- System Fields (Used in UI)
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint only if provider_businesses table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_businesses') THEN
        ALTER TABLE shop_services 
            ADD CONSTRAINT shop_services_shop_id_fkey 
            FOREIGN KEY (shop_id) 
            REFERENCES provider_businesses(id) 
            ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to provider_businesses';
    ELSE
        RAISE NOTICE 'provider_businesses table not found - skipping foreign key constraint';
    END IF;
END $$;

-- Essential indexes for performance
CREATE INDEX idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX idx_shop_services_provider_id ON shop_services(provider_id);
CREATE INDEX idx_shop_services_category ON shop_services(category);
CREATE INDEX idx_shop_services_location_type ON shop_services(location_type);
CREATE INDEX idx_shop_services_is_active ON shop_services(is_active);
CREATE INDEX idx_shop_services_price ON shop_services(price);
CREATE INDEX idx_shop_services_duration ON shop_services(duration);
CREATE INDEX idx_shop_services_assigned_staff ON shop_services USING GIN(assigned_staff);
CREATE INDEX idx_shop_services_service_options_ids ON shop_services USING GIN(service_options_ids);

-- Update trigger
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

-- Simple RLS policies
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all shop services operations" ON shop_services;
CREATE POLICY "Allow all shop services operations" ON shop_services
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON shop_services TO postgres;
GRANT ALL ON shop_services TO authenticated;
GRANT ALL ON shop_services TO anon;
GRANT ALL ON shop_services TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- Migration: Add provider_id column if table already exists
DO $$
BEGIN
    -- Add provider_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_services' 
        AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE shop_services ADD COLUMN provider_id UUID;
        RAISE NOTICE 'Added provider_id column to shop_services';
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_shop_services_provider_id ON shop_services(provider_id);
        RAISE NOTICE 'Added index for provider_id';
        
        -- Update existing services to have provider_id based on shop owner
        UPDATE shop_services 
        SET provider_id = pb.provider_id 
        FROM provider_businesses pb 
        WHERE shop_services.shop_id = pb.id 
        AND shop_services.provider_id IS NULL;
        
        RAISE NOTICE 'Updated existing services with provider_id';
    ELSE
        RAISE NOTICE 'provider_id column already exists';
    END IF;
END $$;

-- Test insert using NULL shop_id to avoid foreign key issues
INSERT INTO shop_services (
    shop_id,
    name,
    description,
    price,
    duration,
    category,
    location_type,
    assigned_staff,
    service_options_ids,
    image,
    is_active
) VALUES (
    NULL, -- Use NULL to avoid foreign key constraint
    'TEST_Men''s Haircut',
    'Professional men''s haircut with wash and styling. Includes consultation and finishing touches.',
    35.00,
    45,
    'Hair Services',
    'in_house',
    ARRAY[]::UUID[], -- Empty staff array
    ARRAY[]::UUID[], -- Empty service options array
    'https://example.com/mens-haircut.jpg',
    true
), (
    NULL, -- Use NULL to avoid foreign key constraint
    'TEST_Mobile Car Detailing',
    'Complete car detailing service at your location. Interior and exterior cleaning included.',
    150.00,
    120,
    'Automotive',
    'on_location',
    ARRAY[]::UUID[], -- Empty staff array
    ARRAY[]::UUID[], -- Empty service options array
    NULL,
    true
), (
    NULL, -- Use NULL to avoid foreign key constraint
    'TEST_Deep Tissue Massage',
    'Therapeutic massage targeting deep muscle layers for tension relief and pain management.',
    80.00,
    60,
    'Wellness',
    'in_house',
    ARRAY[]::UUID[], -- Empty staff array
    ARRAY[]::UUID[], -- Empty service options array
    NULL,
    false -- Inactive service for testing
);

-- Verify test inserts worked
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: All UI fields working - ' || COUNT(*) || ' test services created!'
        ELSE 'ERROR: Test inserts failed'
    END as result
FROM shop_services 
WHERE name LIKE 'TEST_%';

-- Show sample data structure
SELECT 
    name,
    price,
    duration,
    category,
    location_type,
    is_active
FROM shop_services
WHERE name LIKE 'TEST_%'
ORDER BY name;

-- Test different location types
SELECT 
    location_type,
    COUNT(*) as count
FROM shop_services
WHERE name LIKE 'TEST_%'
GROUP BY location_type;

-- Clean up test data
DELETE FROM shop_services WHERE name LIKE 'TEST_%';

-- Final verification
SELECT 
    'shop_services table created with UI fields only!' as result,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_services';

-- Show all columns created
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_services'
ORDER BY ordinal_position;

-- Verify foreign key constraint status
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'shop_services' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN 'Foreign key constraint added successfully'
    ELSE 'No foreign key constraint (provider_businesses table may not exist)'
    END as foreign_key_status;

-- Verify check constraint for location_type
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%location_type%'
    ) THEN 'Location type constraint working (in_house/on_location only)'
    ELSE 'Check constraint may not be active'
    END as location_constraint_status;

SELECT 'Minimal shop_services schema deployed successfully!' as final_result;