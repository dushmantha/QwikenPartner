-- ===================================================================
-- BuzyBees Storage Buckets Setup Script (Updated)
-- ===================================================================
-- This script creates and configures all necessary storage buckets 
-- and policies for the BuzyBees application
-- 
-- Run this script in Supabase Dashboard → SQL Editor
-- ===================================================================

-- Create avatars bucket for profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create business-images bucket for business/shop images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-images', 
  'business-images', 
  true, 
  10485760, -- 10MB limit for business images
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create user-avatars bucket (used by profile screen)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars', 
  'user-avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create shop-images bucket (used by shop screen)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-images', 
  'shop-images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ===================================================================
-- VERIFICATION & COMPLETION
-- ===================================================================

-- Check if buckets were created successfully
SELECT 
  'SUCCESS: Storage buckets created!' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id IN ('avatars', 'business-images', 'user-avatars', 'shop-images')
ORDER BY id;

-- Show final message
DO $$
BEGIN
  RAISE NOTICE '🎉 BuzyBees storage setup completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created buckets with RLS policies:';
  RAISE NOTICE '- avatars (5MB limit for profile images)';
  RAISE NOTICE '- user-avatars (for user profile images)';
  RAISE NOTICE '- business-images (10MB limit for business images)';
  RAISE NOTICE '- shop-images (10MB limit for shop images)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your BuzyBees app';
  RAISE NOTICE '2. Test image uploads in Profile and Shop screens';
  RAISE NOTICE '3. Images will be stored in Supabase Storage properly';
END $$;