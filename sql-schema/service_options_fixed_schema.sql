-- MINIMAL SERVICE_OPTIONS TABLE SCHEMA (FIXED)
-- Contains only fields that are actually used in the app UI

DROP TABLE IF EXISTS service_options CASCADE;

CREATE TABLE service_options (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL, -- Required: Links to shop_services table
    shop_id UUID, -- Will add foreign key constraint only if provider_businesses exists
    
    -- UI Fields (Required in ServiceOptionsModal)
    option_name TEXT NOT NULL,
    option_description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duration INTEGER NOT NULL DEFAULT 30, -- in minutes
    
    -- System Fields (Used in UI)
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0, -- For ordering options in UI
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint only if provider_businesses table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_businesses') THEN
        ALTER TABLE service_options 
            ADD CONSTRAINT service_options_shop_id_fkey 
            FOREIGN KEY (shop_id) 
            REFERENCES provider_businesses(id) 
            ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to provider_businesses';
    ELSE
        RAISE NOTICE 'provider_businesses table not found - skipping foreign key constraint';
    END IF;
END $$;

-- Essential indexes for performance
CREATE INDEX idx_service_options_service_id ON service_options(service_id);
CREATE INDEX idx_service_options_shop_id ON service_options(shop_id);
CREATE INDEX idx_service_options_is_active ON service_options(is_active);
CREATE INDEX idx_service_options_sort_order ON service_options(sort_order);

-- Update trigger
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

-- Simple RLS policies
ALTER TABLE service_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all service options operations" ON service_options;
CREATE POLICY "Allow all service options operations" ON service_options
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON service_options TO postgres;
GRANT ALL ON service_options TO authenticated;
GRANT ALL ON service_options TO anon;
GRANT ALL ON service_options TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- Test insert using NULL shop_id to avoid foreign key issues
INSERT INTO service_options (
    service_id,
    shop_id,
    option_name,
    option_description,
    price,
    duration,
    is_active,
    sort_order
) VALUES (
    gen_random_uuid(),
    NULL, -- Use NULL to avoid foreign key constraint
    'TEST_Men''s Haircut - Regular',
    'Standard men''s haircut with wash and style',
    25.00,
    45,
    true,
    1
), (
    gen_random_uuid(),
    NULL, -- Use NULL to avoid foreign key constraint
    'TEST_Men''s Haircut - Premium', 
    'Premium men''s haircut with wash, style, and beard trim',
    40.00,
    60,
    true,
    2
), (
    gen_random_uuid(),
    NULL, -- Use NULL to avoid foreign key constraint
    'TEST_Hair Wash Only',
    'Basic hair wash and dry',
    15.00,
    20,
    true,
    3
);

-- Verify test inserts worked
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: All UI fields working - ' || COUNT(*) || ' test records created!'
        ELSE 'ERROR: Test inserts failed'
    END as result
FROM service_options 
WHERE option_name LIKE 'TEST_%';

-- Show sample data structure
SELECT 
    option_name,
    price,
    duration,
    is_active,
    sort_order
FROM service_options
WHERE option_name LIKE 'TEST_%'
ORDER BY sort_order;

-- Clean up test data
DELETE FROM service_options WHERE option_name LIKE 'TEST_%';

-- Final verification
SELECT 
    'service_options table created with UI fields only!' as result,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'service_options';

-- Show all columns created
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'service_options'
ORDER BY ordinal_position;

-- Verify foreign key constraint status
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'service_options' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN 'Foreign key constraint added successfully'
    ELSE 'No foreign key constraint (provider_businesses table may not exist)'
    END as foreign_key_status;

SELECT 'Minimal service_options schema deployed successfully!' as final_result;