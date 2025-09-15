-- COMPLETE FAVORITES SCHEMA WITH RLS FIX
-- This script creates the favorites table, functions, and fixes RLS policies
-- Safe to run multiple times - handles existing objects gracefully

-- ==============================================
-- 1. DROP EXISTING OBJECTS (SAFE CLEANUP)
-- ==============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS toggle_user_favorite(uuid,uuid);
DROP FUNCTION IF EXISTS is_shop_favorite(uuid,uuid);
DROP FUNCTION IF EXISTS get_user_favorites(uuid);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Allow view favorites" ON user_favorites;
DROP POLICY IF EXISTS "Allow insert favorites" ON user_favorites;
DROP POLICY IF EXISTS "Allow delete favorites" ON user_favorites;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_favorites_updated_at ON user_favorites;

-- ==============================================
-- 2. CREATE FAVORITES TABLE
-- ==============================================

-- Create favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. CREATE INDEXES
-- ==============================================

-- Create unique index to prevent duplicate favorites
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_unique 
ON user_favorites(user_id, shop_id);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id 
ON user_favorites(user_id);

-- Create index for faster queries by shop_id
CREATE INDEX IF NOT EXISTS idx_user_favorites_shop_id 
ON user_favorites(shop_id);

-- ==============================================
-- 4. CONFIGURE ROW LEVEL SECURITY
-- ==============================================

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create development-friendly policies (can be updated later for production)
-- These policies allow operations for development without strict auth requirements

-- Policy: Allow viewing favorites (permissive for development)
CREATE POLICY "Allow view favorites" ON user_favorites
    FOR SELECT USING (true);

-- Policy: Allow inserting favorites (permissive for development)  
CREATE POLICY "Allow insert favorites" ON user_favorites
    FOR INSERT WITH CHECK (true);

-- Policy: Allow deleting favorites (permissive for development)
CREATE POLICY "Allow delete favorites" ON user_favorites
    FOR DELETE USING (true);

-- ==============================================
-- 5. CREATE HELPER FUNCTIONS
-- ==============================================

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_user_favorite(
    p_user_id UUID,
    p_shop_id UUID
)
RETURNS TABLE(
    is_favorite BOOLEAN,
    message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    favorite_exists BOOLEAN;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_shop_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid user_id or shop_id'::TEXT;
        RETURN;
    END IF;
    
    -- Check if favorite already exists
    SELECT EXISTS(
        SELECT 1 FROM user_favorites 
        WHERE user_id = p_user_id AND shop_id = p_shop_id
    ) INTO favorite_exists;
    
    IF favorite_exists THEN
        -- Remove from favorites
        DELETE FROM user_favorites 
        WHERE user_id = p_user_id AND shop_id = p_shop_id;
        
        RETURN QUERY SELECT false, 'Removed from favorites'::TEXT;
    ELSE
        -- Check if shop exists before adding
        IF NOT EXISTS(SELECT 1 FROM provider_businesses WHERE id = p_shop_id) THEN
            RETURN QUERY SELECT false, 'Shop does not exist'::TEXT;
            RETURN;
        END IF;
        
        -- Add to favorites
        INSERT INTO user_favorites (user_id, shop_id)
        VALUES (p_user_id, p_shop_id);
        
        RETURN QUERY SELECT true, 'Added to favorites'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END $$;

-- Function to check if shop is favorited by user
CREATE OR REPLACE FUNCTION is_shop_favorite(
    p_user_id UUID,
    p_shop_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    is_fav BOOLEAN;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_shop_id IS NULL THEN
        RETURN false;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM user_favorites 
        WHERE user_id = p_user_id AND shop_id = p_shop_id
    ) INTO is_fav;
    
    RETURN is_fav;
    
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END $$;

-- Function to get user's favorite shops
CREATE OR REPLACE FUNCTION get_user_favorites(
    p_user_id UUID
)
RETURNS TABLE(
    shop_id UUID,
    shop_name TEXT,
    shop_category TEXT,
    shop_rating NUMERIC,
    shop_image_url TEXT,
    shop_logo_url TEXT,
    shop_location TEXT,
    favorited_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        pb.id,
        pb.name,
        pb.category,
        pb.rating,
        pb.image_url,
        pb.logo_url,
        CONCAT(COALESCE(pb.city, 'Unknown'), ', ', COALESCE(pb.country, 'Unknown')) as location,
        uf.created_at
    FROM user_favorites uf
    JOIN provider_businesses pb ON uf.shop_id = pb.id
    WHERE uf.user_id = p_user_id AND pb.is_active = true
    ORDER BY uf.created_at DESC;
    
EXCEPTION WHEN OTHERS THEN
    RETURN;
END $$;

-- ==============================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_user_favorites_updated_at 
    BEFORE UPDATE ON user_favorites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 7. GRANT PERMISSIONS
-- ==============================================

-- Grant table permissions
GRANT SELECT, INSERT, DELETE ON user_favorites TO authenticated;
GRANT SELECT, INSERT, DELETE ON user_favorites TO anon;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION toggle_user_favorite TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_user_favorite TO anon;
GRANT EXECUTE ON FUNCTION is_shop_favorite TO authenticated;
GRANT EXECUTE ON FUNCTION is_shop_favorite TO anon;
GRANT EXECUTE ON FUNCTION get_user_favorites TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorites TO anon;

-- ==============================================
-- 8. ADD COMMENTS AND DOCUMENTATION
-- ==============================================

COMMENT ON TABLE user_favorites IS 'Stores user favorite shops/services - Development policies active (update for production)';
COMMENT ON COLUMN user_favorites.user_id IS 'References the user who favorited the shop';
COMMENT ON COLUMN user_favorites.shop_id IS 'References the favorited shop from provider_businesses';
COMMENT ON COLUMN user_favorites.created_at IS 'When the shop was added to favorites';
COMMENT ON COLUMN user_favorites.updated_at IS 'Last time the favorite was updated';

COMMENT ON FUNCTION toggle_user_favorite IS 'Toggle favorite status for a shop - returns new state';
COMMENT ON FUNCTION is_shop_favorite IS 'Check if a shop is favorited by user - returns boolean';
COMMENT ON FUNCTION get_user_favorites IS 'Get all favorite shops for a user with shop details';

-- ==============================================
-- 9. VERIFICATION AND SUCCESS MESSAGE
-- ==============================================

-- Verify table exists and show basic info
DO $$
DECLARE
    table_exists BOOLEAN;
    policy_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_favorites'
    ) INTO table_exists;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'user_favorites';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN ('toggle_user_favorite', 'is_shop_favorite', 'get_user_favorites');
    
    RAISE NOTICE '=== FAVORITES SCHEMA DEPLOYMENT COMPLETE ===';
    RAISE NOTICE 'Table exists: %', table_exists;
    RAISE NOTICE 'Policies created: %', policy_count;
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE '=== READY FOR USE ===';
END $$;

-- Final success message
SELECT 
    'Favorites schema deployed successfully!' as status,
    'Table: user_favorites' as table_created,
    'Policies: Permissive (development)' as security_status,
    'Functions: 3 helper functions' as functions_created,
    'Ready to use with FavoritesAPI' as next_step;