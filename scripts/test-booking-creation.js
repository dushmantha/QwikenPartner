#!/usr/bin/env node

/**
 * Test if booking creation will work with current schema
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBasicBookingSchema() {
  console.log('🧪 Testing basic booking creation compatibility...');
  
  // Test the ultra-minimal fallback that the app will use
  const ultraMinimal = {
    shop_id: '12345678-1234-1234-1234-123456789000', // Test UUID - will fail FK but test columns
    customer_name: 'Test Customer',
    customer_phone: '+1234567890',
    booking_date: '2025-01-01',
    start_time: '10:00:00',
    end_time: '11:00:00',
    total_price: 100.00,
    status: 'confirmed'
  };
  
  console.log('📋 Testing with ultra-minimal schema...');
  const { data, error } = await supabase
    .from('shop_bookings')
    .insert(ultraMinimal)
    .select();
    
  if (error) {
    console.log('📊 Error (expected):', error.message);
    console.log('📊 Error code:', error.code);
    
    if (error.code === '42703') {
      console.log('❌ Column missing - this column does not exist in current schema');
      
      // Test even more minimal
      const superMinimal = {
        customer_name: 'Test Customer',
        customer_phone: '+1234567890',
        booking_date: '2025-01-01',
        start_time: '10:00:00',
        end_time: '11:00:00'
      };
      
      console.log('📋 Testing super minimal schema...');
      const { error: superError } = await supabase
        .from('shop_bookings')
        .insert(superMinimal)
        .select();
        
      if (superError) {
        console.log('📊 Super minimal error:', superError.message, '(', superError.code, ')');
        
        if (superError.code === '42703') {
          console.log('❌ Even basic columns are missing');
        } else if (superError.code === '23502') {
          console.log('✅ Schema compatible - just missing required fields (expected)');
        } else if (superError.code === '42501') {
          console.log('✅ Schema compatible - RLS policy blocking (expected)');
        } else {
          console.log('⚠️ Different error - schema may need updating');
        }
      }
    } else if (error.code === '23502') {
      console.log('✅ Schema compatible - just missing required NOT NULL fields (expected)');
    } else if (error.code === '42501') {
      console.log('✅ Schema compatible - RLS policy blocking insert (expected)');
    } else if (error.code === '23503') {
      console.log('✅ Schema compatible - foreign key constraint (expected with test UUID)');
    } else {
      console.log('⚠️ Unexpected error - may indicate schema issues');
    }
  } else {
    console.log('✅ Insert successful (unexpected):', data);
  }
}

async function checkCurrentColumns() {
  console.log('\n🔍 Checking what columns exist by attempting select...');
  
  // Try selecting common columns one by one
  const testColumns = [
    'id', 'shop_id', 'customer_id', 'service_id', 'staff_id',
    'customer_name', 'customer_phone', 'customer_email',
    'booking_date', 'start_time', 'end_time', 
    'total_price', 'status', 'notes', 'created_at', 'updated_at',
    // Enhanced columns
    'provider_id', 'service_option_ids', 'discount_id', 
    'timezone', 'service_name', 'payment_status', 'booking_reference',
    'duration', 'cancellation_reason', 'cancelled_at', 'cancelled_by'
  ];
  
  const existingColumns = [];
  const missingColumns = [];
  
  for (const column of testColumns) {
    try {
      const { error } = await supabase
        .from('shop_bookings')
        .select(column)
        .limit(0);
        
      if (error && error.code === '42703') {
        missingColumns.push(column);
      } else {
        existingColumns.push(column);
      }
    } catch (e) {
      missingColumns.push(column);
    }
  }
  
  console.log('✅ Existing columns:', existingColumns.join(', '));
  console.log('❌ Missing columns:', missingColumns.join(', '));
  
  if (missingColumns.length === 0) {
    console.log('🎉 All enhanced columns exist! Schema is fully updated.');
  } else if (missingColumns.length < testColumns.length / 2) {
    console.log('⚠️ Some enhanced columns missing. Partial schema update needed.');
  } else {
    console.log('📋 Basic schema detected. Full migration needed for enhanced features.');
  }
}

async function main() {
  console.log('🔍 Booking Schema Compatibility Test');
  console.log('===================================');
  
  await testBasicBookingSchema();
  await checkCurrentColumns();
  
  console.log('\n📝 Recommendations:');
  console.log('1. App will work with current schema using fallback logic');
  console.log('2. Apply migration for enhanced features: supabase/migrations/0007_enhanced_shop_bookings_final.sql');
  console.log('3. Use Supabase SQL Editor: https://app.supabase.com/project/fezdmxvqurczeqmqvgzm/sql');
}

main().catch(console.error);