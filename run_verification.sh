#!/bin/bash

# 🔍 Verification Script for Supabase Deployment
# This script verifies that the database was deployed correctly

set -e

echo "🔍 Verifying BuzyBees Database Deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found"
    exit 1
fi

# Check required environment variables
if [ -z "$SUPABASE_PROJECT_ID" ] || [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Missing SUPABASE_PROJECT_ID or SUPABASE_ACCESS_TOKEN in .env"
    exit 1
fi

# Supabase API endpoint
API_URL="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query"

echo "📡 Verifying deployment for project: $SUPABASE_PROJECT_ID"

# Function to execute SQL via Supabase API
execute_verification() {
    echo "🔍 Running deployment verification..."
    
    # Read SQL file content and escape it for JSON
    local sql_content=$(cat "verify_deployment.sql" | jq -R -s '.')
    
    # Create JSON payload
    local payload=$(cat <<EOF
{
    "query": $sql_content
}
EOF
)
    
    # Execute via API
    local response=$(curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -H "apikey: $SUPABASE_ACCESS_TOKEN" \
        -d "$payload")
    
    # Check for errors
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo "❌ Verification failed:"
        echo "$response" | jq '.error'
        return 1
    else
        echo "✅ Verification results:"
        echo "$response" | jq -r '.result[0].rows[] | @tsv'
        return 0
    fi
}

# Run verification
if execute_verification; then
    echo ""
    echo "🎉 VERIFICATION COMPLETED!"
    echo ""
    echo "✅ Database structure verified"
    echo "🔗 Dashboard: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
    echo ""
else
    echo ""
    echo "❌ VERIFICATION FAILED!"
    echo "The database may not have been deployed correctly"
    exit 1
fi