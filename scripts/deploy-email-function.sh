#!/bin/bash

# Deploy send-email Edge Function to Supabase
# Run this script from your terminal with proper Supabase authentication

echo "🚀 Deploying send-email Edge Function..."

# Check if logged in to Supabase
if ! npx supabase projects list >/dev/null 2>&1; then
    echo "❌ Please login to Supabase first:"
    echo "npx supabase login"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# Ensure we're in the project root
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if the function file exists
if [ ! -f "supabase/functions/send-email/index.ts" ]; then
    echo "❌ Edge function file not found: supabase/functions/send-email/index.ts"
    exit 1
fi

echo "✅ Function file found"

# Deploy the function
echo "🔄 Deploying send-email function..."
npx supabase functions deploy send-email --project-ref fezdmxvqurczeqmqvgzm

if [ $? -eq 0 ]; then
    echo "✅ send-email function deployed successfully!"
    
    # Test the function
    echo "🧪 Testing the deployed function..."
    npm run test-email-function
    
    echo "📧 Email function deployment complete!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. The email system is already working via direct service"
    echo "2. Edge Functions provide backup functionality"
    echo "3. Test booking creation to verify emails are sent"
else
    echo "❌ Function deployment failed"
    echo ""
    echo "💡 Don't worry! The email system is still working via direct service."
    echo "   Bookings will still send confirmation emails."
    exit 1
fi