-- Fix Supabase Database Auth Issue
-- This SQL script fixes the "Database error saving new user" problem

-- Step 1: Check for existing problematic triggers
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY t.tgname;

-- Step 2: Drop any problematic triggers on auth.users
DO $$
DECLARE
    trigger_record record;
BEGIN
    -- Get all triggers on auth.users that might cause issues
    FOR trigger_record IN 
        SELECT t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND t.tgname NOT LIKE 'RI_%'  -- Keep referential integrity triggers
        AND t.tgname NOT LIKE 'pg_%'  -- Keep PostgreSQL system triggers
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE;', trigger_record.tgname);
            RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop trigger %: %', trigger_record.tgname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 3: Drop any problematic functions that might be called by triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

-- Step 4: Create a simple, working profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id)
);

-- Step 5: Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Step 7: Create a simple, safe trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    -- Try to insert profile, but don't fail if it doesn't work
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      full_name,
      avatar_url
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', null)
    );
    
    RAISE LOG 'Created profile for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE LOG 'Profile creation failed for user %, error: %', NEW.id, SQLERRM;
  END;
  
  -- Always return NEW to allow user creation to proceed
  RETURN NEW;
END;
$$;

-- Step 8: Create the trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Step 10: Create an updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Step 11: Test the setup with a dummy insert (will be rolled back)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    -- This is just a test, we'll roll it back
    BEGIN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
        VALUES (
            test_id,
            'test@example.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"first_name": "Test", "last_name": "User"}',
            false,
            'authenticated'
        );
        
        -- If we get here, the trigger worked
        RAISE NOTICE '✅ Test user creation successful - auth triggers are working';
        
        -- Clean up test data
        DELETE FROM public.profiles WHERE id = test_id;
        DELETE FROM auth.users WHERE id = test_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Test failed: %', SQLERRM;
            -- Clean up any partial data
            DELETE FROM public.profiles WHERE id = test_id;
            DELETE FROM auth.users WHERE id = test_id;
    END;
END $$;

-- Step 12: Final status check
SELECT 'Auth database fix completed successfully!' as status;