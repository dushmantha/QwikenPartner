-- Fix Users Table Trigger to Save Registration Data
-- This works with your existing users table structure

-- Step 1: Create or replace the trigger function for existing users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_metadata jsonb;
BEGIN
    -- Get metadata from auth user
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Insert or update user profile in existing users table
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        full_name,
        phone,
        address,
        gender,
        birth_date,
        account_type,
        user_type,
        is_active,
        email_verified,
        phone_verified,
        is_premium,
        subscription_status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_metadata->>'first_name',
        user_metadata->>'last_name',
        COALESCE(user_metadata->>'first_name', '') || ' ' || COALESCE(user_metadata->>'last_name', ''),
        user_metadata->>'phone',
        user_metadata->>'address',
        user_metadata->>'gender',
        (user_metadata->>'birth_date')::date,
        COALESCE(user_metadata->>'account_type', 'consumer'),
        CASE 
            WHEN user_metadata->>'account_type' = 'provider' THEN 'provider'
            ELSE 'customer'
        END,
        true,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        false,
        false,
        'inactive',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.users.phone),
        address = COALESCE(EXCLUDED.address, public.users.address),
        gender = COALESCE(EXCLUDED.gender, public.users.gender),
        birth_date = COALESCE(EXCLUDED.birth_date, public.users.birth_date),
        account_type = COALESCE(EXCLUDED.account_type, public.users.account_type),
        user_type = EXCLUDED.user_type,
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 2: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Create updated_at trigger for users table
CREATE OR REPLACE FUNCTION public.handle_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_users_updated_at ON public.users;

CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_users_updated_at();

-- Step 4: Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT INSERT, UPDATE ON public.users TO authenticated;

-- Success message
SELECT 'Users table trigger updated successfully!' as message;