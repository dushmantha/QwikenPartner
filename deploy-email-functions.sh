#!/bin/bash

# Deploy Email Edge Functions to Supabase
echo "🚀 Deploying Email Edge Functions..."

PROJECT_ID="fezdmxvqurczeqmqvgzm"

# First, login to Supabase (if not already logged in)
echo "📝 Please make sure you're logged in to Supabase CLI"
echo "If not, run: supabase login"
echo ""

# Deploy send-email function
echo "1️⃣ Deploying send-email function..."
supabase functions deploy send-email \
    --project-ref $PROJECT_ID \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ send-email deployed successfully"
else
    echo "❌ Failed to deploy send-email"
fi

echo ""

# Deploy send-booking-email function
echo "2️⃣ Deploying send-booking-email function..."
supabase functions deploy send-booking-email \
    --project-ref $PROJECT_ID \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ send-booking-email deployed successfully"
else
    echo "❌ Failed to deploy send-booking-email"
fi

echo ""

# Deploy send-booking-email-enhanced function
echo "3️⃣ Deploying send-booking-email-enhanced function..."
supabase functions deploy send-booking-email-enhanced \
    --project-ref $PROJECT_ID \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ send-booking-email-enhanced deployed successfully"
else
    echo "❌ Failed to deploy send-booking-email-enhanced"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📧 Your email functions are now using:"
echo "   - noreply@qwiken.org (for booking confirmations)"
echo "   - admin@qwiken.org (for business notifications)"
echo "   - support@qwiken.org (for support emails)"
echo ""
echo "🧪 Test your booking flow now - emails should work!"
