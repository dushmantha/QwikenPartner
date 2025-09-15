#!/bin/bash

# Deploy all Supabase Edge Functions with authentication token

echo "🚀 Deploying all Qwiken Supabase Edge Functions..."
echo "================================================"

# Check if token is provided
if [ -z "$1" ]; then
    echo "❌ Error: Supabase access token required!"
    echo ""
    echo "Usage: ./deploy-with-token.sh YOUR_ACCESS_TOKEN"
    echo ""
    echo "To get your access token:"
    echo "1. Go to https://app.supabase.com/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Copy the token and run this script again"
    exit 1
fi

ACCESS_TOKEN=$1
export SUPABASE_ACCESS_TOKEN=$ACCESS_TOKEN

# Supabase project configuration
PROJECT_ID="fezdmxvqurczeqmqvgzm"

# List of functions to deploy
FUNCTIONS=(
    "forgot-password-complete"
    "send-otp-email"
    "send-email"
    "send-booking-email"
    "send-sms"
    "send-push-notification"
    "send-push-notification-v2"
    "process-booking-reminders"
    "stripe-create-payment-session"
    "stripe-check-payment-status"
    "stripe-get-subscription"
    "stripe-update-subscription"
    "stripe-cancel-subscription"
    "stripe-reactivate-subscription"
    "stripe-webhook"
)

# Counter for tracking deployment status
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_FUNCTIONS=""

echo "📝 Using project: $PROJECT_ID"
echo ""

# Deploy each function
for FUNCTION in "${FUNCTIONS[@]}"; do
    echo "📦 Deploying: $FUNCTION..."
    echo "----------------------------"
    
    if supabase functions deploy "$FUNCTION" \
        --project-ref "$PROJECT_ID" \
        --no-verify-jwt 2>&1; then
        echo "✅ $FUNCTION deployed successfully!"
        ((SUCCESS_COUNT++))
    else
        echo "❌ Failed to deploy $FUNCTION"
        ((FAILED_COUNT++))
        FAILED_FUNCTIONS="$FAILED_FUNCTIONS $FUNCTION"
    fi
    echo ""
done

# Summary
echo "================================================"
echo "📊 Deployment Summary:"
echo "================================================"
echo "✅ Successfully deployed: $SUCCESS_COUNT functions"
echo "❌ Failed to deploy: $FAILED_COUNT functions"

if [ $FAILED_COUNT -gt 0 ]; then
    echo ""
    echo "Failed functions:$FAILED_FUNCTIONS"
fi

echo ""
echo "🔗 Project URL: https://$PROJECT_ID.supabase.co"
echo ""

# Environment variables reminder
if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "📝 Important: Set these environment variables in Supabase Dashboard:"
    echo "   - RESEND_API_KEY (for email functions)"
    echo "   - TWILIO_ACCOUNT_SID (for SMS)"
    echo "   - TWILIO_AUTH_TOKEN (for SMS)"
    echo "   - TWILIO_PHONE_NUMBER (for SMS)"
    echo "   - STRIPE_SECRET_KEY (for payment functions)"
    echo "   - STRIPE_WEBHOOK_SECRET (for webhook)"
    echo "   - EXPO_PUSH_TOKEN (for push notifications)"
    echo ""
    echo "   Go to: https://app.supabase.com/project/$PROJECT_ID/settings/vault"
fi

echo ""
echo "✨ Deployment process complete!"