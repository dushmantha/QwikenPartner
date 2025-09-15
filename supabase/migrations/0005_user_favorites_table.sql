-- Create user_favorites table and related functions
-- Migration: 0005_user_favorites_table.sql

-- Create favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to prevent duplicate favorites
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_unique 
ON user_favorites(user_id, shop_id);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id 
ON user_favorites(user_id);

-- Create index for faster queries by shop_id
CREATE INDEX IF NOT EXISTS idx_user_favorites_shop_id 
ON user_favorites(shop_id);

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create development-friendly policies
CREATE POLICY "Allow view favorites" ON user_favorites
    FOR SELECT USING (true);

CREATE POLICY "Allow insert favorites" ON user_favorites
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete favorites" ON user_favorites
    FOR DELETE USING (true);

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

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON user_favorites TO authenticated;
GRANT SELECT, INSERT, DELETE ON user_favorites TO anon;