-- MINIMAL SHOP_STAFF TABLE SCHEMA
-- Contains only fields that are actually used in the app UI

DROP TABLE IF EXISTS shop_staff CASCADE;

CREATE TABLE shop_staff (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    
    -- Basic Information (Required in UI)
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT,
    
    -- Professional Details (Used in UI)
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    avatar_url TEXT,
    
    -- Work Schedule (Complex UI component)
    work_schedule JSONB DEFAULT '{
        "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    
    -- Leave Management (Calendar UI component)
    leave_dates JSONB DEFAULT '[]'::jsonb,
    
    -- System Fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential indexes only
CREATE INDEX idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX idx_shop_staff_email ON shop_staff(email);
CREATE INDEX idx_shop_staff_is_active ON shop_staff(is_active);
CREATE INDEX idx_shop_staff_specialties ON shop_staff USING GIN(specialties);

-- Update trigger
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

-- Simple RLS policies
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all staff operations" ON shop_staff;
CREATE POLICY "Allow all staff operations" ON shop_staff
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON shop_staff TO postgres;
GRANT ALL ON shop_staff TO authenticated;
GRANT ALL ON shop_staff TO anon;
GRANT ALL ON shop_staff TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- Test insert to verify all UI fields work
INSERT INTO shop_staff (
    provider_id,
    name,
    email,
    phone,
    role,
    specialties,
    bio,
    experience_years,
    work_schedule,
    leave_dates,
    is_active
) VALUES (
    gen_random_uuid(),
    'UI_TEST_STAFF',
    'test@example.com',
    '+1234567890',
    'Barber',
    ARRAY['hair_cutting', 'beard_trimming'],
    'Experienced barber specializing in modern cuts',
    5,
    '{
        "monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    '[
        {"startDate": "2024-12-25", "endDate": "2024-12-25", "reason": "Christmas", "type": "holiday"},
        {"startDate": "2024-01-01", "endDate": "2024-01-01", "reason": "New Year", "type": "holiday"}
    ]'::jsonb,
    true
);

-- Verify test insert
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: All UI fields working!'
        ELSE 'ERROR: Test insert failed'
    END as result
FROM shop_staff 
WHERE name = 'UI_TEST_STAFF';

-- Clean up test data
DELETE FROM shop_staff WHERE name = 'UI_TEST_STAFF';

-- Final verification
SELECT 
    'shop_staff table created with UI fields only!' as result,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_staff';

SELECT 'Minimal shop_staff schema deployed successfully!' as final_result;