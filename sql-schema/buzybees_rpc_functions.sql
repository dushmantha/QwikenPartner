-- RPC FUNCTIONS FOR COMPLETE SHOP MANAGEMENT
-- These functions handle complex shop operations with related data

-- Function to create a complete shop with all related data
CREATE OR REPLACE FUNCTION buzybees_create_complete_shop(
    p_provider_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT '',
    p_category TEXT DEFAULT 'Beauty & Wellness',
    p_phone TEXT DEFAULT '',
    p_email TEXT DEFAULT '',
    p_website_url TEXT DEFAULT NULL,
    p_address TEXT DEFAULT '',
    p_city TEXT DEFAULT '',
    p_state TEXT DEFAULT '',
    p_country TEXT DEFAULT 'Sweden',
    p_image_url TEXT DEFAULT NULL,
    p_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_logo_url TEXT DEFAULT NULL,
    p_business_hours JSONB DEFAULT NULL,
    p_special_days JSONB DEFAULT '[]'::JSONB,
    p_timezone TEXT DEFAULT 'Europe/Stockholm',
    p_advance_booking_days INTEGER DEFAULT 30,
    p_slot_duration INTEGER DEFAULT 60,
    p_buffer_time INTEGER DEFAULT 15,
    p_auto_approval BOOLEAN DEFAULT TRUE,
    p_first_time_discount_active BOOLEAN DEFAULT TRUE,
    p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    shop_id UUID,
    shop_data JSONB,
    staff_created INTEGER,
    services_created INTEGER,
    discounts_created INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    new_shop_id UUID;
    shop_record provider_businesses%ROWTYPE;
    staff_count INTEGER := 0;
    services_count INTEGER := 0;
    discounts_count INTEGER := 0;
BEGIN
    -- Insert the shop record
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
        p_provider_id,
        p_name,
        p_description,
        p_category,
        p_phone,
        p_email,
        p_website_url,
        p_address,
        p_city,
        p_state,
        p_country,
        p_image_url,
        p_images,
        p_logo_url,
        COALESCE(p_business_hours, '[
            {"day": "Monday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
            {"day": "Tuesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
            {"day": "Wednesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
            {"day": "Thursday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
            {"day": "Friday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
            {"day": "Saturday", "isOpen": true, "openTime": "10:00", "closeTime": "16:00"},
            {"day": "Sunday", "isOpen": false, "openTime": "10:00", "closeTime": "16:00"}
        ]'::jsonb),
        p_special_days,
        p_timezone,
        p_advance_booking_days,
        p_slot_duration,
        p_buffer_time,
        p_auto_approval,
        p_first_time_discount_active,
        p_is_active
    ) RETURNING * INTO shop_record;
    
    new_shop_id := shop_record.id;
    
    -- Count discounts created by trigger (should be 1 welcome discount)
    SELECT COUNT(*) INTO discounts_count 
    FROM shop_discounts 
    WHERE shop_id = new_shop_id;
    
    -- Return the created shop data
    RETURN QUERY SELECT 
        TRUE as success,
        'Shop created successfully with all related data' as message,
        new_shop_id as shop_id,
        row_to_json(shop_record)::jsonb as shop_data,
        staff_count as staff_created,
        services_count as services_created,
        discounts_count as discounts_created;
        
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        FALSE as success,
        'Error creating shop: ' || SQLERRM as message,
        NULL::UUID as shop_id,
        NULL::JSONB as shop_data,
        0 as staff_created,
        0 as services_created,
        0 as discounts_created;
END;
$$;

-- Function to get complete shop data with all related records
CREATE OR REPLACE FUNCTION buzybees_get_complete_shop_data(
    p_shop_id UUID,
    p_provider_id UUID DEFAULT NULL
)
RETURNS TABLE(
    shop_data JSONB,
    staff_data JSONB,
    services_data JSONB,
    discounts_data JSONB,
    service_options_data JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Return complete shop data with all related records
    RETURN QUERY 
    SELECT 
        (SELECT row_to_json(pb)::jsonb 
         FROM provider_businesses pb 
         WHERE pb.id = p_shop_id 
         AND (p_provider_id IS NULL OR pb.provider_id = p_provider_id)
        ) as shop_data,
        
        (SELECT COALESCE(json_agg(row_to_json(staff)), '[]'::json)::jsonb
         FROM shop_staff staff 
         WHERE staff.shop_id = p_shop_id
         AND staff.is_active = true
        ) as staff_data,
        
        (SELECT COALESCE(json_agg(row_to_json(services)), '[]'::json)::jsonb
         FROM shop_services services 
         WHERE services.shop_id = p_shop_id
         AND services.is_active = true
        ) as services_data,
        
        (SELECT COALESCE(json_agg(row_to_json(discounts)), '[]'::json)::jsonb
         FROM shop_discounts discounts 
         WHERE discounts.shop_id = p_shop_id
         AND discounts.is_active = true
        ) as discounts_data,
        
        ('[]'::json)::jsonb as service_options_data;
END;
$$;

-- Function to update complete shop data
CREATE OR REPLACE FUNCTION buzybees_update_complete_shop(
    p_shop_id UUID,
    p_provider_id UUID,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_website_url TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_images TEXT[] DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL,
    p_business_hours JSONB DEFAULT NULL,
    p_special_days JSONB DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL,
    p_advance_booking_days INTEGER DEFAULT NULL,
    p_slot_duration INTEGER DEFAULT NULL,
    p_buffer_time INTEGER DEFAULT NULL,
    p_auto_approval BOOLEAN DEFAULT NULL,
    p_first_time_discount_active BOOLEAN DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    shop_data JSONB,
    updated_fields TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    updated_shop provider_businesses%ROWTYPE;
    fields_updated TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Update the shop record with only non-null values
    UPDATE provider_businesses SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        category = COALESCE(p_category, category),
        phone = COALESCE(p_phone, phone),
        email = COALESCE(p_email, email),
        website_url = COALESCE(p_website_url, website_url),
        address = COALESCE(p_address, address),
        city = COALESCE(p_city, city),
        state = COALESCE(p_state, state),
        country = COALESCE(p_country, country),
        image_url = COALESCE(p_image_url, image_url),
        images = COALESCE(p_images, images),
        logo_url = COALESCE(p_logo_url, logo_url),
        business_hours = COALESCE(p_business_hours, business_hours),
        special_days = COALESCE(p_special_days, special_days),
        timezone = COALESCE(p_timezone, timezone),
        advance_booking_days = COALESCE(p_advance_booking_days, advance_booking_days),
        slot_duration = COALESCE(p_slot_duration, slot_duration),
        buffer_time = COALESCE(p_buffer_time, buffer_time),
        auto_approval = COALESCE(p_auto_approval, auto_approval),
        first_time_discount_active = COALESCE(p_first_time_discount_active, first_time_discount_active),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = NOW()
    WHERE id = p_shop_id 
    AND provider_id = p_provider_id
    RETURNING * INTO updated_shop;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Shop not found or access denied' as message,
            NULL::JSONB as shop_data,
            ARRAY[]::TEXT[] as updated_fields;
        RETURN;
    END IF;
    
    -- Track which fields were updated
    IF p_name IS NOT NULL THEN fields_updated := array_append(fields_updated, 'name'); END IF;
    IF p_description IS NOT NULL THEN fields_updated := array_append(fields_updated, 'description'); END IF;
    IF p_category IS NOT NULL THEN fields_updated := array_append(fields_updated, 'category'); END IF;
    IF p_business_hours IS NOT NULL THEN fields_updated := array_append(fields_updated, 'business_hours'); END IF;
    
    RETURN QUERY SELECT 
        TRUE as success,
        'Shop updated successfully' as message,
        row_to_json(updated_shop)::jsonb as shop_data,
        fields_updated as updated_fields;
        
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        FALSE as success,
        'Error updating shop: ' || SQLERRM as message,
        NULL::JSONB as shop_data,
        ARRAY[]::TEXT[] as updated_fields;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION buzybees_create_complete_shop TO authenticated;
GRANT EXECUTE ON FUNCTION buzybees_get_complete_shop_data TO authenticated;
GRANT EXECUTE ON FUNCTION buzybees_update_complete_shop TO authenticated;
GRANT EXECUTE ON FUNCTION buzybees_create_complete_shop TO service_role;
GRANT EXECUTE ON FUNCTION buzybees_get_complete_shop_data TO service_role;
GRANT EXECUTE ON FUNCTION buzybees_update_complete_shop TO service_role;

-- Test the functions
DO $$
DECLARE
    test_provider_id UUID := gen_random_uuid();
    test_result RECORD;
BEGIN
    -- Test shop creation
    SELECT * INTO test_result FROM buzybees_create_complete_shop(
        test_provider_id,
        'TEST_Complete Shop',
        'Test shop for RPC function',
        'Beauty & Wellness',
        '+46 70 123 4567',
        'test@example.com'
    );
    
    IF test_result.success THEN
        RAISE NOTICE 'SUCCESS: RPC shop creation working!';
        RAISE NOTICE '  - Shop ID: %', test_result.shop_id;
        RAISE NOTICE '  - Discounts created: %', test_result.discounts_created;
        
        -- Clean up test data
        DELETE FROM shop_discounts WHERE shop_id = test_result.shop_id;
        DELETE FROM provider_businesses WHERE id = test_result.shop_id;
        
        RAISE NOTICE 'Test data cleaned up';
    ELSE
        RAISE EXCEPTION 'RPC function test failed: %', test_result.message;
    END IF;
END $$;

SELECT 'RPC functions created successfully!' as result;