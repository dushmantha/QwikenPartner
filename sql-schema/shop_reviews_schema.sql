-- Shop Reviews Table Schema - Linked to Provider Businesses
-- This creates reviews for shops/providers that display on business profiles

-- Create shop_reviews table (linked to provider_businesses)
CREATE TABLE IF NOT EXISTS shop_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_business_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES auth.users(id),
    booking_id TEXT, -- Optional reference to booking
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    service_quality_rating INTEGER CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate reviews for the same booking
    CONSTRAINT unique_booking_review UNIQUE (booking_id, customer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shop_reviews_provider_business_id ON shop_reviews(provider_business_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_customer_id ON shop_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_booking_id ON shop_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_overall_rating ON shop_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_created_at ON shop_reviews(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_reviews
DROP POLICY IF EXISTS "Authenticated users can insert their own reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Anyone can view shop reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON shop_reviews;

-- Policy: Authenticated users can insert their own reviews
CREATE POLICY "Authenticated users can insert their own reviews" ON shop_reviews
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = customer_id);

-- Policy: Anyone can view shop reviews (public reviews for business listings)
CREATE POLICY "Anyone can view shop reviews" ON shop_reviews
    FOR SELECT 
    USING (true);

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON shop_reviews
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- Policy: Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON shop_reviews
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = customer_id);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_shop_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_shop_reviews_updated_at_trigger ON shop_reviews;
CREATE TRIGGER update_shop_reviews_updated_at_trigger
    BEFORE UPDATE ON shop_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_reviews_updated_at();

-- Grant permissions
GRANT SELECT ON shop_reviews TO anon;
GRANT ALL ON shop_reviews TO authenticated;

-- Add helpful view for shop review statistics
CREATE OR REPLACE VIEW shop_review_stats AS
SELECT 
    pb.id as provider_business_id,
    pb.name as business_name,
    COUNT(sr.id) as total_reviews,
    ROUND(AVG(sr.overall_rating)::numeric, 2) as average_rating,
    ROUND(AVG(sr.service_quality_rating)::numeric, 2) as avg_service_quality,
    ROUND(AVG(sr.punctuality_rating)::numeric, 2) as avg_punctuality,
    ROUND(AVG(sr.cleanliness_rating)::numeric, 2) as avg_cleanliness,
    ROUND(AVG(sr.value_rating)::numeric, 2) as avg_value,
    COUNT(CASE WHEN sr.overall_rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN sr.overall_rating = 4 THEN 1 END) as four_star_count,
    COUNT(CASE WHEN sr.overall_rating = 3 THEN 1 END) as three_star_count,
    COUNT(CASE WHEN sr.overall_rating = 2 THEN 1 END) as two_star_count,
    COUNT(CASE WHEN sr.overall_rating = 1 THEN 1 END) as one_star_count,
    MAX(sr.created_at) as latest_review_date
FROM provider_businesses pb
LEFT JOIN shop_reviews sr ON pb.id = sr.provider_business_id
GROUP BY pb.id, pb.name;

-- Grant access to the view
GRANT SELECT ON shop_review_stats TO anon;
GRANT SELECT ON shop_review_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE shop_reviews IS 'Customer reviews for provider businesses/shops';
COMMENT ON COLUMN shop_reviews.provider_business_id IS 'Links to provider_businesses table';
COMMENT ON COLUMN shop_reviews.customer_id IS 'Customer who wrote the review';
COMMENT ON COLUMN shop_reviews.booking_id IS 'Optional reference to the booking being reviewed';
COMMENT ON COLUMN shop_reviews.overall_rating IS 'Overall rating 1-5 stars';
COMMENT ON COLUMN shop_reviews.service_quality_rating IS 'Service quality rating 1-5 stars';
COMMENT ON COLUMN shop_reviews.punctuality_rating IS 'Punctuality rating 1-5 stars';
COMMENT ON COLUMN shop_reviews.cleanliness_rating IS 'Cleanliness rating 1-5 stars';
COMMENT ON COLUMN shop_reviews.value_rating IS 'Value for money rating 1-5 stars';
COMMENT ON VIEW shop_review_stats IS 'Aggregated review statistics for each provider business';