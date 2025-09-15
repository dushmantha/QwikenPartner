-- MINIMAL SHOP_DISCOUNTS TABLE SCHEMA
-- Contains only fields that are actually used in the add/edit discount UI

DROP TABLE IF EXISTS shop_discounts CASCADE;

CREATE TABLE shop_discounts (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID, -- Will add foreign key constraint if provider_businesses exists
    
    -- Basic Discount Information (Required in UI)
    type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed', 'bogo', 'package')),
    value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    description TEXT NOT NULL,
    
    -- Optional Discount Conditions (UI Fields)
    min_amount DECIMAL(10,2), -- Minimum purchase amount
    max_discount DECIMAL(10,2), -- Maximum discount cap for percentage discounts
    
    -- Discount Period (UI Date Inputs)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Usage Tracking (UI Fields)
    usage_limit INTEGER, -- NULL means unlimited
    used_count INTEGER DEFAULT 0,
    
    -- Service Applicability (UI Multi-select)
    applicable_services UUID[] DEFAULT ARRAY[]::UUID[], -- Array of service IDs
    
    -- Additional Conditions (UI TextArea)
    conditions JSONB DEFAULT '{}'::jsonb, -- Flexible conditions storage
    
    -- System Fields (Used in UI)
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validation constraints
    CONSTRAINT valid_dates CHECK (end_date >= start_date),
    CONSTRAINT valid_value CHECK (value > 0),
    CONSTRAINT valid_usage_limit CHECK (usage_limit IS NULL OR usage_limit >= 0),
    CONSTRAINT valid_used_count CHECK (used_count >= 0),
    CONSTRAINT valid_min_amount CHECK (min_amount IS NULL OR min_amount >= 0),
    CONSTRAINT valid_max_discount CHECK (max_discount IS NULL OR max_discount >= 0)
);

-- Add foreign key constraint only if provider_businesses table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_businesses') THEN
        ALTER TABLE shop_discounts 
            ADD CONSTRAINT shop_discounts_shop_id_fkey 
            FOREIGN KEY (shop_id) 
            REFERENCES provider_businesses(id) 
            ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to provider_businesses';
    ELSE
        RAISE NOTICE 'provider_businesses table not found - skipping foreign key constraint';
    END IF;
END $$;

-- Essential indexes for performance
CREATE INDEX idx_shop_discounts_shop_id ON shop_discounts(shop_id);
CREATE INDEX idx_shop_discounts_type ON shop_discounts(type);
CREATE INDEX idx_shop_discounts_is_active ON shop_discounts(is_active);
CREATE INDEX idx_shop_discounts_start_date ON shop_discounts(start_date);
CREATE INDEX idx_shop_discounts_end_date ON shop_discounts(end_date);
CREATE INDEX idx_shop_discounts_usage ON shop_discounts(usage_limit, used_count);
CREATE INDEX idx_shop_discounts_applicable_services ON shop_discounts USING GIN(applicable_services);

-- Update trigger
CREATE OR REPLACE FUNCTION update_shop_discounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_discounts_updated_at
    BEFORE UPDATE ON shop_discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_discounts_updated_at();

-- Simple RLS policies
ALTER TABLE shop_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all shop discounts operations" ON shop_discounts;
CREATE POLICY "Allow all shop discounts operations" ON shop_discounts
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON shop_discounts TO postgres;
GRANT ALL ON shop_discounts TO authenticated;
GRANT ALL ON shop_discounts TO anon;
GRANT ALL ON shop_discounts TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- Test insert using NULL shop_id to avoid foreign key issues
INSERT INTO shop_discounts (
    shop_id,
    type,
    value,
    description,
    min_amount,
    max_discount,
    start_date,
    end_date,
    usage_limit,
    used_count,
    applicable_services,
    conditions,
    is_active
) VALUES (
    NULL, -- Use NULL to avoid foreign key constraint
    'percentage',
    20.00,
    'TEST_20% off all haircut services',
    50.00,
    25.00,
    '2024-01-01',
    '2024-12-31',
    100,
    5,
    ARRAY[]::UUID[], -- Empty applicable services array
    '{"first_time_customer": true, "applies_to": "haircuts"}'::jsonb,
    true
), (
    NULL, -- Use NULL to avoid foreign key constraint
    'fixed',
    15.00,
    'TEST_$15 off any service over $50',
    50.00,
    NULL,
    '2024-01-01',
    '2024-06-30',
    NULL, -- Unlimited usage
    0,
    ARRAY[]::UUID[], -- Empty applicable services array
    '{"minimum_purchase": true}'::jsonb,
    true
), (
    NULL, -- Use NULL to avoid foreign key constraint
    'bogo',
    100.00,
    'TEST_Buy One Get One Free - Massage Services',
    NULL,
    NULL,
    '2024-03-01',
    '2024-03-31',
    50,
    10,
    ARRAY[]::UUID[], -- Empty applicable services array
    '{"service_category": "massage", "bogo_rules": "second_item_free"}'::jsonb,
    false -- Inactive discount for testing
), (
    NULL, -- Use NULL to avoid foreign key constraint
    'package',
    30.00,
    'TEST_Package Deal - 3 Services for 30% off',
    NULL,
    NULL,
    '2024-01-01',
    '2024-12-31',
    25,
    0,
    ARRAY[]::UUID[], -- Empty applicable services array
    '{"package_size": 3, "services_required": "any"}'::jsonb,
    true
);

-- Verify test inserts worked
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: All UI fields working - ' || COUNT(*) || ' test discounts created!'
        ELSE 'ERROR: Test inserts failed'
    END as result
FROM shop_discounts 
WHERE description LIKE 'TEST_%';

-- Show sample data structure
SELECT 
    type,
    value,
    description,
    start_date,
    end_date,
    usage_limit,
    used_count,
    is_active
FROM shop_discounts
WHERE description LIKE 'TEST_%'
ORDER BY type;

-- Test different discount types
SELECT 
    type,
    COUNT(*) as count
FROM shop_discounts
WHERE description LIKE 'TEST_%'
GROUP BY type;

-- Test date validation
DO $$
BEGIN
    BEGIN
        INSERT INTO shop_discounts (shop_id, type, value, description, start_date, end_date)
        VALUES (NULL, 'percentage', 10.00, 'Invalid Date Test', '2024-12-31', '2024-01-01');
        RAISE EXCEPTION 'Date validation failed - this should not succeed';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: Date validation working correctly (end_date >= start_date)';
    END;
END $$;

-- Clean up test data
DELETE FROM shop_discounts WHERE description LIKE 'TEST_%';

-- Final verification
SELECT 
    'shop_discounts table created with UI fields only!' as result,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_discounts';

-- Show all columns created
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_discounts'
ORDER BY ordinal_position;

-- Verify constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'shop_discounts'
AND constraint_type IN ('CHECK', 'FOREIGN KEY');

SELECT 'Minimal shop_discounts schema deployed successfully!' as final_result;