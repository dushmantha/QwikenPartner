// Quick fix for OTP schema issue
// Run this to add the missing verified_at column to password_reset_otps

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzUzNzQ4OSwiZXhwIjoyMDM5MTEzNDg5fQ.CqGhsEOdHa2zKTIlcHnJqIgzKNLM6KEMACtM_L3QWq8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOTPSchema() {
  console.log('🔧 Fixing password_reset_otps schema...');
  
  const migrationSQL = `
    -- Add verified_at column if it doesn't exist
    ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE NULL;
    
    -- Add is_used column if it doesn't exist  
    ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;
    
    -- Add attempts column if it doesn't exist
    ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
    
    -- Migrate old verified column to new schema if it exists
    DO $MIGRATION$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'password_reset_otps' AND column_name = 'verified'
        ) THEN
            -- Copy verified=true to verified_at and is_used
            UPDATE password_reset_otps 
            SET verified_at = COALESCE(used_at, created_at), is_used = verified
            WHERE verified = true AND verified_at IS NULL;
            
            -- Drop old column
            ALTER TABLE password_reset_otps DROP COLUMN verified;
            RAISE NOTICE 'Migrated verified column to verified_at';
        END IF;
    END $MIGRATION$;
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
    } else {
      console.log('✅ Schema migration completed successfully');
    }
  } catch (err) {
    console.error('❌ Migration error:', err);
  }
}

fixOTPSchema();