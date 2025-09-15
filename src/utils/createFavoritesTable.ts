import { supabase } from '../lib/supabase/normalized';

export const createFavoritesTable = async () => {
  try {
    console.log('🔧 Creating user_favorites table...');
    
    // Check if table already exists
    const { data: tableExists, error: checkError } = await supabase
      .from('user_favorites')
      .select('id')
      .limit(1);
      
    if (!checkError) {
      console.log('✅ user_favorites table already exists');
      return { success: true, message: 'Table already exists' };
    }
    
    if (!checkError.message?.includes('does not exist')) {
      console.error('❌ Unexpected error checking table:', checkError);
      return { success: false, error: checkError.message };
    }
    
    console.log('📝 Table does not exist, creating it...');
    
    // Execute the table creation SQL
    const createTableSQL = `
      -- Create user_favorites table
      CREATE TABLE user_favorites (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create unique index to prevent duplicate favorites
      CREATE UNIQUE INDEX idx_user_favorites_unique ON user_favorites(user_id, shop_id);

      -- Create index for faster queries by user_id
      CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);

      -- Create index for faster queries by shop_id
      CREATE INDEX idx_user_favorites_shop_id ON user_favorites(shop_id);

      -- Enable Row Level Security
      ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

      -- Create development-friendly policies
      CREATE POLICY "Allow view favorites" ON user_favorites FOR SELECT USING (true);
      CREATE POLICY "Allow insert favorites" ON user_favorites FOR INSERT WITH CHECK (true);
      CREATE POLICY "Allow delete favorites" ON user_favorites FOR DELETE USING (true);

      -- Grant permissions
      GRANT SELECT, INSERT, DELETE ON user_favorites TO authenticated;
      GRANT SELECT, INSERT, DELETE ON user_favorites TO anon;
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });
    
    if (createError) {
      console.error('❌ Error creating table:', createError);
      
      // Try alternative method - create table step by step
      console.log('🔄 Trying alternative table creation method...');
      
      // This won't work with standard Supabase client, but let's provide instructions
      return { 
        success: false, 
        error: 'Cannot create table via client. Please run the SQL migration manually.',
        sql: createTableSQL
      };
    }
    
    console.log('✅ user_favorites table created successfully');
    return { success: true, message: 'Table created successfully' };
    
  } catch (error) {
    console.error('❌ Error in createFavoritesTable:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please run the SQL migration manually in Supabase dashboard'
    };
  }
};