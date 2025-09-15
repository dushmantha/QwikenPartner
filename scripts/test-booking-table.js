#!/usr/bin/env node

/**
 * Simple script to test the shop_bookings table structure
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTable() {
  console.log('🔍 Testing shop_bookings table structure...');
  
  try {
    // Try to select from table with LIMIT 0 to get column structure without data
    const { data, error } = await supabase
      .from('shop_bookings')
      .select('*')
      .limit(0);
      
    if (error) {
      console.error('❌ Error accessing table:', error.message);
      if (error.code) {
        console.error('   Error code:', error.code);
      }
      return;
    }
    
    console.log('✅ Table exists and is accessible');
    
    // Try a simple test insert to see what columns are required/missing
    console.log('🧪 Testing minimal insert...');
    
    const minimalBooking = {
      shop_id: '12345678-1234-1234-1234-123456789000', // Test UUID
      customer_name: 'Test Customer',
      customer_phone: '+1234567890',
      booking_date: '2025-01-01',
      start_time: '10:00:00',
      end_time: '11:00:00'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('shop_bookings')
      .insert(minimalBooking)
      .select();
      
    if (insertError) {
      console.log('📊 Insert failed (expected):', insertError.message);
      console.log('📊 Error code:', insertError.code);
      
      if (insertError.code === '42703') {
        console.log('🔍 Column does not exist - checking which columns are missing...');
        
        // Try with even fewer columns
        const ultraMinimal = {
          customer_name: 'Test Customer',
          customer_phone: '+1234567890'
        };
        
        const { error: ultraError } = await supabase
          .from('shop_bookings')
          .insert(ultraMinimal)
          .select();
          
        if (ultraError) {
          console.log('📊 Ultra minimal also failed:', ultraError.message);
        }
      }
    } else {
      console.log('✅ Insert successful (unexpected):', insertData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function checkCurrentSchema() {
  console.log('\n🔍 Attempting to determine current schema...');
  
  // Try to get one existing record to see the structure
  const { data, error } = await supabase
    .from('shop_bookings')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('❌ Cannot read existing records:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ Found existing record, columns are:');
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log('📋 Table is empty, cannot determine structure from existing data');
  }
}

async function main() {
  console.log('🚀 Shop Bookings Table Tester');
  console.log('=============================');
  
  await testTable();
  await checkCurrentSchema();
}

main().catch(console.error);