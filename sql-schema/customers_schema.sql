-- CUSTOMERS TABLE SCHEMA
-- This table stores customer information for bookings

DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider relationship
    provider_id UUID NOT NULL, -- Which provider this customer belongs to
    
    -- Customer information
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    
    -- Customer preferences
    preferred_staff_id UUID, -- Preferred staff member
    notes TEXT, -- Special notes about customer
    
    -- Customer status
    is_active BOOLEAN DEFAULT true,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_provider_id ON customers(provider_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- Unique constraint for phone per provider
CREATE UNIQUE INDEX idx_customers_provider_phone ON customers(provider_id, phone);

-- Update trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy for providers to manage their customers
DROP POLICY IF EXISTS "Providers can manage their customers" ON customers;
CREATE POLICY "Providers can manage their customers" ON customers
    FOR ALL USING (
        provider_id = auth.uid()
    );

-- Grant permissions
GRANT ALL ON customers TO postgres;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

SELECT 'customers table schema ready!' as result;