#!/bin/bash

# Deploy Supabase Edge Functions
# Make sure you have Supabase CLI installed: https://supabase.com/docs/guides/cli

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Please install it first: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "supabase/functions" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Get project ID from user or environment
PROJECT_ID="${SUPABASE_PROJECT_ID}"
if [ -z "$PROJECT_ID" ]; then
    echo "Enter your Supabase project ID:"
    read PROJECT_ID
fi

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

echo "📦 Deploying send-email function..."

# Deploy the send-email function
supabase functions deploy send-email \
    --project-ref "$PROJECT_ID" \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ send-email function deployed successfully!"
else
    echo "❌ Failed to deploy send-email function"
    exit 1
fi

# Set environment variables (optional - can be done in Supabase dashboard)
echo ""
echo "📝 Setting environment variables..."
echo "Note: You should set RESEND_API_KEY in your Supabase dashboard"
echo "Go to: https://app.supabase.com/project/$PROJECT_ID/settings/vault"

# Instructions for setting up the function
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set RESEND_API_KEY in Supabase dashboard (Settings > Vault)"
echo "2. For production, update isTestMode to false in the function"
echo "3. Verify your domain with Resend for production emails"
echo ""
echo "🔗 Function URL: https://$PROJECT_ID.supabase.co/functions/v1/send-email"
echo ""
echo "Test with:"
echo "curl -L -X POST 'https://$PROJECT_ID.supabase.co/functions/v1/send-email' \\"
echo "  -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  --data '{"
echo '    "to": "test@example.com",'
echo '    "subject": "Test Email",'
echo '    "html": "<h1>Hello World</h1>"'
echo "  }'"