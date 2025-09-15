#!/usr/bin/env node

/**
 * Script to manually update the shop_bookings table schema
 * Run with: node scripts/update-booking-schema.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load Supabase configuration from your project
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBookingSchema() {
  console.log('🔧 Starting shop_bookings schema update...');
  
  try {
    // Check current table structure
    console.log('📋 Checking current table structure...');
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'shop_bookings');
      
    if (columnsError) {
      console.error('❌ Failed to check table structure:', columnsError);
      return;
    }
    
    const existingColumns = columns?.map(col => col.column_name) || [];
    console.log('📋 Existing columns:', existingColumns);
    
    // Check if enhanced columns exist
    const requiredColumns = [
      'provider_id', 'service_option_ids', 'discount_id', 
      'customer_email', 'timezone', 'service_name', 
      'payment_status', 'booking_reference'
    ];
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ Enhanced schema already exists, no update needed');
      return;
    }
    
    console.log('🔧 Missing columns found:', missingColumns);
    console.log('⚠️ Note: This script checks the schema but cannot modify it directly due to RLS policies.');
    console.log('📝 To update the schema, you need to:');
    console.log('   1. Apply the migration in supabase/migrations/0007_enhanced_shop_bookings_schema.sql');
    console.log('   2. Or use Supabase dashboard SQL editor to run the migration');
    console.log('   3. Or deploy the migration using: npx supabase db push (after linking project)');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  }
}

// Test basic booking creation with current schema
async function testBookingCreation() {
  console.log('🧪 Testing booking creation with current schema...');
  
  try {
    // Try to create a very minimal test booking to see what columns exist
    const testBooking = {
      shop_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      customer_name: 'Test Customer',
      customer_phone: '+1234567890',
      booking_date: '2025-01-01',
      start_time: '10:00:00',
      end_time: '11:00:00',
      total_price: 100.00,
      status: 'confirmed'
    };
    
    const { data, error } = await supabase
      .from('shop_bookings')
      .insert(testBooking)
      .select()
      .single();
      
    if (error) {
      console.log('📊 Test booking creation failed (expected):', error.message);
      
      if (error.code === '42703') {
        console.log('❌ Column does not exist error - schema needs updating');
      } else if (error.code === '23503') {
        console.log('⚠️ Foreign key constraint error - test shop_id does not exist (this is normal)');
      } else {
        console.log('📊 Other error:', error.code, error.message);
      }
    } else {
      console.log('✅ Test booking created successfully (unexpected)');
      
      // Clean up test booking
      await supabase
        .from('shop_bookings')
        .delete()
        .eq('id', data.id);
      console.log('🧹 Cleaned up test booking');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function main() {
  console.log('🚀 Shop Bookings Schema Updater');
  console.log('================================');
  
  await updateBookingSchema();
  console.log('');
  await testBookingCreation();
  
  console.log('');
  console.log('📚 For more information:');
  console.log('   - Migration file: supabase/migrations/0007_enhanced_shop_bookings_schema.sql');
  console.log('   - Documentation: Check your Supabase dashboard');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateBookingSchema, testBookingCreation };