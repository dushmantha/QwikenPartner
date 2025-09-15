# APNs Automatic Environment Detection

## Overview
The push notification system now automatically detects whether to use APNs Production or Development environment based on your build configuration.

## How It Works

### 1. Edge Function (Supabase)
The `send-push-notification-v2` function automatically determines the environment by checking:

1. **Explicit Setting**: If `APNS_PRODUCTION` env var is set
2. **Environment Variable**: If `ENVIRONMENT` or `NODE_ENV` is "production"
3. **Supabase URL**: If using a production Supabase instance (not localhost)

```typescript
const isProduction = 
  Deno.env.get('APNS_PRODUCTION') === 'true' ||
  environment === 'production' ||
  (!supabaseUrl.includes('localhost') && supabaseUrl.includes('supabase'))
```

### 2. iOS App Configuration
The iOS app automatically uses the correct APNs environment based on build configuration:

- **Debug builds** → APNs Development/Sandbox
- **Release builds** → APNs Production

This is handled in `PushNotificationConfig.swift`:

```swift
var isProduction: Bool {
    #if DEBUG
        return false  // Development
    #else
        return true   // Production
    #endif
}
```

## Build Configurations

### Development Build
```bash
# Debug build for testing
npx react-native run-ios --configuration Debug

# Uses:
# - APNs Development/Sandbox environment
# - Development push certificates
# - api.development.push.apple.com
```

### Production Build
```bash
# Release build for App Store
npx react-native run-ios --configuration Release

# Or in Xcode:
# Product → Scheme → Edit Scheme → Run → Build Configuration → Release

# Uses:
# - APNs Production environment  
# - Production push certificates
# - api.push.apple.com
```

## Environment Variables (Supabase)

### Required for Both Environments
```bash
APNS_AUTH_KEY=<your_p8_key_content>
APNS_KEY_ID=<your_key_id>
APNS_TEAM_ID=<your_team_id>
IOS_BUNDLE_ID=org.app.qwiken
```

### Optional Override
```bash
# Only set if you need to force a specific environment
APNS_PRODUCTION=true  # Forces production
APNS_PRODUCTION=false # Forces development
```

## Testing

### Test Development Environment
1. Build app in Debug mode
2. Check Xcode console for: `📱 APNs Environment: development`
3. Edge function logs: `📱 Using APNs DEVELOPMENT environment`

### Test Production Environment
1. Build app in Release mode or TestFlight
2. Check logs for: `📱 APNs Environment: production`
3. Edge function logs: `📱 Using APNs PRODUCTION environment`

## Troubleshooting

### Common Issues

1. **Wrong Environment Used**
   - Check build configuration in Xcode
   - Verify Supabase environment variables
   - Look at edge function logs

2. **Tokens Not Working**
   - Development tokens only work with development APNs
   - Production tokens only work with production APNs
   - Ensure certificates match the environment

3. **Auto-Detection Not Working**
   - Explicitly set `APNS_PRODUCTION` in Supabase
   - Check `ENVIRONMENT` or `NODE_ENV` variables
   - Verify Supabase URL format

## Benefits

✅ **No Manual Configuration**: Environment auto-detected based on build
✅ **Prevents Mistakes**: Can't accidentally use wrong environment
✅ **Seamless Deployment**: Same code works for dev and production
✅ **Clear Logging**: Always shows which environment is being used

## Summary

The system now intelligently handles APNs environments:
- **Development builds** → Automatically use APNs Sandbox
- **Production builds** → Automatically use APNs Production
- **No manual switching required** when deploying to App Store

This ensures push notifications work correctly in all environments without manual configuration changes!