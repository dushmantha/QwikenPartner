#!/bin/bash

echo "🔐 APNs Secret Setup for Supabase Edge Functions"
echo "================================================"
echo ""
echo "This script will help you set up APNs authentication secrets"
echo "Make sure you have:"
echo "1. Your .p8 file from Apple Developer"
echo "2. Your Key ID (10 characters)"
echo "3. Your Team ID (10 characters)"
echo "4. Your app Bundle ID"
echo ""

# Function to read multiline input
read_multiline() {
    local prompt=$1
    local varname=$2
    echo "$prompt"
    echo "(Paste the content, then press Enter twice to finish):"
    local content=""
    while IFS= read -r line; do
        if [[ -z "$line" ]]; then
            break
        fi
        if [[ -z "$content" ]]; then
            content="$line"
        else
            content="$content
$line"
        fi
    done
    eval "$varname='$content'"
}

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Get the bundle ID
echo "Enter your app Bundle ID (e.g., com.yourcompany.BuzyBees):"
read -r BUNDLE_ID

# Get the Key ID
echo ""
echo "Enter your APNs Key ID (10 characters, e.g., ABC123DEFG):"
read -r APNS_KEY_ID

# Get the Team ID
echo ""
echo "Enter your Apple Team ID (10 characters, e.g., 1234567890):"
read -r APNS_TEAM_ID

# Get the .p8 file content
echo ""
read_multiline "Paste your .p8 file content (including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----)" APNS_AUTH_KEY

# Confirm before setting
echo ""
echo "Ready to set the following secrets:"
echo "-----------------------------------"
echo "BUNDLE_ID: $BUNDLE_ID"
echo "APNS_KEY_ID: $APNS_KEY_ID"
echo "APNS_TEAM_ID: $APNS_TEAM_ID"
echo "APNS_AUTH_KEY: [PRIVATE KEY CONTENT]"
echo ""
echo "Continue? (y/n)"
read -r CONFIRM

if [[ "$CONFIRM" != "y" ]]; then
    echo "❌ Cancelled"
    exit 0
fi

# Set the secrets
echo ""
echo "🔄 Setting secrets..."

# Set each secret
npx supabase secrets set BUNDLE_ID="$BUNDLE_ID"
if [ $? -eq 0 ]; then
    echo "✅ BUNDLE_ID set successfully"
else
    echo "❌ Failed to set BUNDLE_ID"
fi

npx supabase secrets set APNS_KEY_ID="$APNS_KEY_ID"
if [ $? -eq 0 ]; then
    echo "✅ APNS_KEY_ID set successfully"
else
    echo "❌ Failed to set APNS_KEY_ID"
fi

npx supabase secrets set APNS_TEAM_ID="$APNS_TEAM_ID"
if [ $? -eq 0 ]; then
    echo "✅ APNS_TEAM_ID set successfully"
else
    echo "❌ Failed to set APNS_TEAM_ID"
fi

# Set the auth key (most complex due to multiline)
echo "$APNS_AUTH_KEY" | npx supabase secrets set APNS_AUTH_KEY
if [ $? -eq 0 ]; then
    echo "✅ APNS_AUTH_KEY set successfully"
else
    echo "❌ Failed to set APNS_AUTH_KEY"
fi

echo ""
echo "🔍 Verifying secrets..."
npx supabase secrets list

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your edge functions: npx supabase functions deploy send-push-notification-v2"
echo "2. Test push notifications with: node scripts/send-test-push.js"