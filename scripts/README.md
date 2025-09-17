# Push Notification Testing Scripts

This directory contains scripts to test push notifications locally without using the mobile app.

## Scripts Overview

### 1. `get-user-info.js` - Find User IDs and Device Tokens
```bash
# List recent device tokens from all users
node scripts/get-user-info.js --list-recent

# Find a specific user by email
node scripts/get-user-info.js --email="tdmihiran@gmail.com"
```

### 2. `test-push.js` - Send Push Notifications
```bash
# Send a test notification to a specific user
node scripts/test-push.js --user-id="4e4da279-7195-4663-a4ce-4164057ece65"

# Send a custom notification
node scripts/test-push.js --user-id="4e4da279-7195-4663-a4ce-4164057ece65" --title="Custom Title" --message="Your custom message here"
```

## Quick Start Guide

### Step 1: Find a User ID
First, find a user ID to send notifications to:

```bash
# List recent users who have device tokens registered
node scripts/get-user-info.js --list-recent
```

This will show you:
- User IDs
- Device types (iOS/Android)  
- Device tokens (abbreviated)
- When they were registered

### Step 2: Send a Test Notification
Copy a user ID from step 1 and send a test notification:

```bash
node scripts/test-push.js --user-id="your-user-id-here"
```

### Step 3: Check Your Device
- Look for the notification on the target device
- Check notification settings if not received
- Verify the app has push permissions enabled

## How It Works

### Architecture
```
Local Script → Supabase Edge Function → Firebase Cloud Messaging → iOS/Android Device
```

1. **Local Script**: Calls your Supabase Edge Function
2. **Supabase Edge Function**: Authenticates with Firebase and sends notifications
3. **Firebase Cloud Messaging**: Delivers to Apple/Google push services
4. **Device**: Receives and displays the notification

### Configuration
The scripts use these configurations:
- **Supabase URL**: `https://fezdmxvqurczeqmqvgzm.supabase.co`
- **Edge Function**: `/functions/v1/send-push-notification`
- **Database Tables**: `device_tokens`, `user_profiles`

### Requirements
- Node.js (built-in modules only, no dependencies)
- Active internet connection
- Supabase project with push notification Edge Function deployed
- Firebase project configured with APNs/FCM
- Target device with app installed and push permissions granted

## Troubleshooting

### Common Issues

#### "No device tokens found"
**Cause**: User hasn't registered for push notifications
**Solution**: 
1. Open the app on the target device
2. Grant push notification permissions
3. Ensure the app successfully registers a device token

#### "Failed to send push notification"
**Cause**: Configuration or Firebase issues
**Solutions**:
1. Check Supabase Edge Function logs
2. Verify Firebase service account configuration
3. Ensure APNs certificates/keys are properly set up

#### "Notification sent but not received"
**Cause**: Device-specific issues
**Solutions**:
1. Check device notification settings: Settings > Notifications > Qwiken Partner
2. Ensure device isn't in Do Not Disturb mode
3. Try with app closed (iOS shows notifications differently when app is open)
4. Restart the app and try again

### Debug Mode
Add debug logging by modifying the scripts:
```javascript
// Add this to see full responses
console.log('Full response:', JSON.stringify(response, null, 2));
```

## Security Notes

⚠️ **Important**: These scripts use the Supabase anonymous key, which has limited permissions. In production:

1. **Use Row Level Security (RLS)** on your database tables
2. **Limit anonymous access** to only necessary operations  
3. **Consider using service keys** for admin operations
4. **Never expose service keys** in client-side code

## Example Usage Session

```bash
# 1. Find available users
$ node scripts/get-user-info.js --list-recent
👤 User Information Lookup
==========================

📱 Fetching recent device tokens...
✅ Found 2 recent device tokens:

1. User ID: 4e4da279-7195-4663-a4ce-4164057ece65
   Device: IOS
   Token: 1a2b3c4d5e6f7g8h9i0j...
   Active: ✅
   Created: 8/25/2025, 3:45:23 PM

2. User ID: 7f8e9d0c1b2a3948576e
   Device: ANDROID  
   Token: 9z8y7x6w5v4u3t2s1r0q...
   Active: ✅
   Created: 8/24/2025, 1:22:11 PM

# 2. Send test notification
$ node scripts/test-push.js --user-id="4e4da279-7195-4663-a4ce-4164057ece65"
🚀 Push Notification Test Script
================================

📋 Configuration:
   User ID: 4e4da279-7195-4663-a4ce-4164057ece65
   Title: 🧪 Test Notification
   Message: Test push notification sent at 3:52:14 PM

🔍 Checking user device tokens...
📱 Found 1 active device token(s)
   1. IOS: 1a2b3c4d5e6f7g8h9i0j...

📤 Sending push notification...
✅ Push notification sent successfully!
   Response: { sent: 1, failed: 0 }
   📊 Sent to 1 device(s)

🎯 Next steps:
   1. Check your device for the notification
   2. If not received, check:
      - iOS Settings > Notifications > Qwiken Partner
      - Device is not in Do Not Disturb mode
      - App is not currently open (for background notifications)
```

## Advanced Usage

### Custom Notification Data
```bash
node scripts/test-push.js \
  --user-id="4e4da279-7195-4663-a4ce-4164057ece65" \
  --title="New Booking!" \
  --message="You have a new appointment scheduled for tomorrow at 2 PM"
```

### Batch Testing
```bash
# Test multiple users (create a batch script)
for user in user1 user2 user3; do
  node scripts/test-push.js --user-id="$user"
  sleep 2
done
```