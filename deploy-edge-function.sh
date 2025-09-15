#!/bin/bash

echo "🚀 Deploying Qwiken Email Edge Function"
echo "========================================"

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "📧 Setting Resend API Key..."
npx supabase secrets set RESEND_API_KEY=re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt

echo "🔧 Deploying Edge Function..."
npx supabase functions deploy send-email

echo "✅ Testing Edge Function..."
curl -L -X POST 'https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0' \
  -H 'Content-Type: application/json' \
  --data '{
    "to": "tdmihiran@gmail.com",
    "subject": "✅ Deployment Test",
    "html": "<h1>🎉 Edge Function Deployed!</h1><p>Your email system is working!</p>",
    "text": "Edge Function Deployed! Your email system is working!",
    "type": "booking_confirmation"
  }'

echo ""
echo "🎉 Deployment complete!"
echo "📧 Edge Function URL: https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/send-email"