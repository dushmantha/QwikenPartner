/**
 * Test Favorites Database Connection
 * This file tests if the Supabase user_favorites table exists and works
 */

console.log('🗄️ Testing Favorites Database Connection');
console.log('========================================');

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (same as in the app)
const supabaseUrl = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('1️⃣ Testing table existence...');
  
  try {
    // Test if user_favorites table exists
    const { data, error } = await supabase
      .from('user_favorites')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Table test failed:', error.message);
      console.error('   Details:', error);
      
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('\n🔧 SOLUTION: Create the user_favorites table:');
        console.log(`
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

-- Add RLS policies
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites" ON user_favorites
  USING (auth.uid() = user_id OR auth.uid() IS NULL);
        `);
      }
      return;
    }
    
    console.log('✅ user_favorites table exists!');
    console.log('   Result:', data);
    
    // Test insert/delete cycle
    console.log('\n2️⃣ Testing insert/delete cycle...');
    
    const testUserId = '12345678-1234-1234-1234-123456789012';
    const testShopId = 'test-shop-id-123';
    
    // Try to insert
    console.log('   Inserting test favorite...');
    const { data: insertData, error: insertError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: testUserId,
        shop_id: testShopId
      })
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      return;
    }
    
    console.log('✅ Insert successful:', insertData);
    
    // Try to delete
    console.log('   Deleting test favorite...');
    const { error: deleteError } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', testUserId)
      .eq('shop_id', testShopId);
    
    if (deleteError) {
      console.error('❌ Delete failed:', deleteError.message);
      return;
    }
    
    console.log('✅ Delete successful');
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('   The user_favorites table is working correctly.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabase();