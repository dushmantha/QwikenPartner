#!/bin/bash

# Deploy only forgot password related Supabase Edge Functions

echo "🚀 Deploying Qwiken Forgot Password Functions..."
echo "================================================"

# Check if token is provided
if [ -z "$1" ]; then
    ACCESS_TOKEN="sb_publishable_nZsO2OHyMXg-Kz4hNeC_cA_f2iYWamu"
    echo "📝 Using default token"
else
    ACCESS_TOKEN=$1
    echo "📝 Using provided token"
fi

export SUPABASE_ACCESS_TOKEN=$ACCESS_TOKEN

# Supabase project configuration
PROJECT_ID="fezdmxvqurczeqmqvgzm"

# List of forgot password related functions
FUNCTIONS=(
    "forgot-password-complete"
    "send-otp-email"
)

# Counter for tracking deployment status
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_FUNCTIONS=""

echo "📝 Project: $PROJECT_ID"
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
echo "🔗 Function URLs:"
echo "  - Forgot Password: https://$PROJECT_ID.supabase.co/functions/v1/forgot-password-complete"
echo "  - Send OTP Email: https://$PROJECT_ID.supabase.co/functions/v1/send-otp-email"
echo ""

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "📝 Important: Set RESEND_API_KEY in Supabase Dashboard:"
    echo "   Go to: https://app.supabase.com/project/$PROJECT_ID/settings/vault"
    echo ""
    echo "✅ The functions have been updated with Qwiken branding:"
    echo "   - Email templates show 'Qwiken' logo"
    echo "   - All 'BuzyBees' references replaced with 'Qwiken'"
fi

echo ""
echo "✨ Deployment process complete!"