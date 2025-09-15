#!/bin/bash

echo "🐝 Deploying fixed BuzyBees email function..."

# Remove problematic .env directory
rm -rf supabase/.env

# Deploy without .env loading
supabase functions deploy send-otp-email --project-ref fezdmxvqurczeqmqvgzm --no-verify-jwt --ignore-health-check

echo "✅ Deployment complete!"
echo "🌐 Function URL: https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/send-otp-email"