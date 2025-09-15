#!/bin/bash

# Deploy all Supabase Edge Functions with Qwiken branding
# Make sure you have Supabase CLI installed

echo "🚀 Deploying all Qwiken Supabase Edge Functions..."
echo "================================================"

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

# Deploy each function
for FUNCTION in "${FUNCTIONS[@]}"; do
    echo ""
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
done

# Summary
echo ""
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
    echo ""
    echo "   Go to: https://app.supabase.com/project/$PROJECT_ID/settings/vault"
fi

echo ""
echo "✨ Deployment process complete!"