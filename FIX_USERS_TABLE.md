# Fix User Registration Data Storage

Your app already has a proper 'users' table structure. I've updated the code to work with your existing table and save all registration data properly.

## Step 1: Run the Users Table Fix

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/fezdmxvqurczeqmqvgzm

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Users Table Fix**
   - Copy the entire contents of `supabase/fix_users_table.sql`
   - Paste into the SQL Editor
   - Click "Run"
   - Wait for "Users table trigger updated successfully!" message

## What This Does

✅ **Updates the database trigger** to save registration data to your existing `users` table

✅ **Maps all registration fields** to your table structure:
- `first_name`, `last_name` → from registration form
- `phone` → from registration form  
- `address` → from location picker
- `gender` → from gender selection
- `birth_date` → from date picker
- `account_type` → consumer/provider
- `user_type` → customer/provider (mapped from account_type)
- `full_name` → automatically generated
- `email_verified`, `is_premium`, etc. → proper defaults

✅ **Uses your existing table structure** - no schema changes needed

✅ **Handles both new users and updates** with UPSERT logic

## Step 2: Test Registration

1. **Register a new user** with complete data:
   - First name: "John"
   - Last name: "Doe"  
   - Phone: "1234567890"
   - Select address from location picker
   - Choose gender
   - Set birth date

2. **Check the profile** - You should see all data populated

## Step 3: Verify in Database (Optional)

Check that the data was saved:
```sql
SELECT first_name, last_name, phone, address, gender, birth_date, account_type 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
```

## Code Changes Made

✅ **Updated signup process** to save to `users` table with correct structure
✅ **Reverted profile queries** back to `users` table  
✅ **Fixed premium service** to use `users` table
✅ **Added proper field mapping** for your existing schema

The registration form data will now flow directly into your existing users table structure and display correctly in the profile screen!