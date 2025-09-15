#!/usr/bin/env node

/**
 * Script to apply the enhanced booking schema migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Applying enhanced booking schema migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0007_enhanced_shop_bookings_schema_fixed.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded, size:', migrationSQL.length, 'characters');
    
    // Apply the migration using RPC
    console.log('🔧 Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('Error details:', error);
      
      // If RPC method doesn't exist, try direct execution (won't work with anon key but let's see)
      console.log('⚠️ Trying alternative approach...');
      console.log('📝 The migration needs to be applied manually in Supabase SQL Editor');
      console.log('📝 Copy the contents of:', migrationPath);
      console.log('📝 And paste into: https://app.supabase.com/project/fezdmxvqurczeqmqvgzm/sql');
      return;
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('Result:', data);
    
    // Test the new schema
    await testNewSchema();
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.log('📝 Manual migration required:');
    console.log('1. Go to: https://app.supabase.com/project/fezdmxvqurczeqmqvgzm/sql');
    console.log('2. Copy and paste the migration from: supabase/migrations/0007_enhanced_shop_bookings_schema_fixed.sql');
    console.log('3. Click "Run" to apply the migration');
  }
}

async function testNewSchema() {
  console.log('\n🧪 Testing enhanced schema...');
  
  try {
    // Try to select with enhanced columns
    const { data, error } = await supabase
      .from('shop_bookings')
      .select('id, provider_id, service_option_ids, discount_id, booking_reference, payment_status')
      .limit(1);
      
    if (error) {
      console.log('⚠️ Enhanced columns not yet available:', error.message);
    } else {
      console.log('✅ Enhanced schema is working!');
      if (data && data.length > 0) {
        console.log('📊 Sample record with enhanced fields:', data[0]);
      } else {
        console.log('📊 No existing records to test with, but schema is ready');
      }
    }
  } catch (error) {
    console.log('⚠️ Schema test failed:', error.message);
  }
}

async function main() {
  console.log('🔧 Enhanced Booking Schema Migration Tool');
  console.log('=========================================');
  
  await applyMigration();
}

main().catch(console.error);