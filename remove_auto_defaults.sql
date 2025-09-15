-- Remove automatic staff and service creation from shop creation trigger
-- This allows shop owners to have full control over their staff and services

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS create_shop_related_records_trigger ON provider_businesses;

-- Create updated function without automatic staff and service creation
CREATE OR REPLACE FUNCTION create_shop_related_records()
RETURNS TRIGGER AS $$
DECLARE
    new_discount_id UUID;
BEGIN
    -- REMOVED: Automatic staff creation
    -- Shop owners should add their own staff members
    
    -- REMOVED: Automatic service creation  
    -- Shop owners should add their own services
    
    -- Keep welcome discount creation - this is actually useful
    IF NOT EXISTS (SELECT 1 FROM shop_discounts WHERE shop_discounts.shop_id = NEW.id) THEN
        INSERT INTO shop_discounts (
            shop_id,
            code,
            name,
            description,
            discount_type,
            discount_value,
            start_date,
            end_date,
            minimum_amount,
            maximum_discount,
            usage_limit,
            used_count,
            is_active
        ) VALUES (
            NEW.id,
            'WELCOME' || EXTRACT(EPOCH FROM NOW())::text,
            'Welcome Discount',
            'Welcome bonus for new customers! Limited time offer.',
            'percentage',
            15.0,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days',
            0,
            50,
            100,
            0,
            true
        ) RETURNING id INTO new_discount_id;
        
        -- Add discount ID to provider_businesses.discount_ids array
        UPDATE provider_businesses 
        SET discount_ids = array_append(discount_ids, new_discount_id)
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger with the updated function
CREATE TRIGGER create_shop_related_records_trigger
    AFTER INSERT ON provider_businesses
    FOR EACH ROW
    EXECUTE FUNCTION create_shop_related_records();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Automatic staff and service creation has been removed!';
    RAISE NOTICE '✅ Shop owners now have full control over their staff and services.';
    RAISE NOTICE '✅ Welcome discount creation is still active (this is useful).';
END $$;