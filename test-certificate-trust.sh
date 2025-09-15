#!/bin/bash

echo "🔍 Testing Apple Push Services certificate trust..."

# Check if certificate exists and is trusted
cert_info=$(security find-certificate -c "Apple Push Services: org.app.qwiken" -p 2>/dev/null)

if [ -n "$cert_info" ]; then
    echo "✅ Certificate found"
    
    # Check trust settings
    trust_settings=$(security dump-trust-settings -d 2>/dev/null | grep -A 5 "org.app.qwiken" || echo "No specific trust settings")
    echo "🔒 Trust settings: $trust_settings"
    
    # Test SSL connection to Apple's push service
    echo "🧪 Testing connection to Apple Push Service..."
    timeout 10s openssl s_client -connect gateway.push.apple.com:2195 -cert /dev/null 2>/dev/null | grep -q "Verification: OK" && echo "✅ SSL connection successful" || echo "❌ SSL connection failed"
    
else
    echo "❌ Certificate not found in keychains"
    echo "💡 Suggestion: Re-download certificate from Apple Developer Console"
fi

echo "🔧 Quick fixes to try:"
echo "1. Open Keychain Access → System → Double-click certificate → Trust → Always Trust"
echo "2. Or re-download certificate from Apple Developer Console"
echo "3. Or switch to APNs Authentication Key (recommended)"