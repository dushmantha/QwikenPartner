# Push Notification Setup Instructions

## ✅ What's Already Done
- Firebase configuration files (google-services.json, GoogleService-Info.plist)
- Safe push notification service with error handling
- Supabase edge function for sending notifications
- Database tables for device tokens and notification history
- iOS and Android platform configurations

## 🔧 Remaining Setup Steps

### 1. Set Firebase Service Account in Supabase

#### Enable Firebase Cloud Messaging API:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **qwiken-978a2**
3. Go to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API"
5. Click and **Enable** it

#### Create Service Account:
1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: "fcm-push-notifications"
4. Role: **Firebase Cloud Messaging Admin**
5. Click **Create and Continue** → **Done**
6. Click on the created service account
7. Go to **Keys** tab → **Add Key** → **Create New Key**
8. Choose **JSON** format and download

#### Add to Supabase:
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. **Settings** → **Edge Functions** → **Environment Variables**
4. Add these variables:
   - `FIREBASE_SERVICE_ACCOUNT` = paste the entire JSON content from downloaded file
   - `FIREBASE_PROJECT_ID` = qwiken-978a2
5. Save

### 2. iOS Push Notification Certificates

#### Create APNs Key (Recommended):
1. [Apple Developer Console](https://developer.apple.com/account/resources/authkeys/list)
2. Create new key → Name: "Qwiken Push" → Enable APNs
3. Download .p8 file and note Key ID

#### Configure in Firebase:
1. Firebase → Project Settings → Cloud Messaging
2. iOS app configuration → Upload APNs Authentication Key
3. Upload .p8 file, enter Key ID and Team ID

#### Enable in Xcode:
1. Open `ios/BuzyBees.xcworkspace`
2. Target → Signing & Capabilities
3. Add **Push Notifications** capability
4. Add **Background Modes** → Check "Remote notifications"

### 3. Testing

#### Method 1: In-App Test Component
```tsx
// Add to any screen temporarily
import PushNotificationTest from '../components/PushNotificationTest';

// In your render:
<PushNotificationTest />
```

#### Method 2: Node.js Test Script
```bash
# Update test-push-notification.js with your values:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY  
# - TEST_USER_ID

node test-push-notification.js
```

#### Method 3: Manual cURL Test
```bash
curl -L -X POST 'https://your-project.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  --data '{
    "userId": "user-uuid-here",
    "title": "Test Notification",
    "message": "Hello from push notifications! 🎉",
    "data": {"type": "test"}
  }'
```

## 🚨 Important Notes

### iOS Testing:
- **Must test on physical device** (not simulator)
- Ensure app is signed with valid provisioning profile
- Check device settings: Settings → Notifications → Qwiken

### Android Testing:
- Works on emulator and physical device
- Check device settings: Settings → Apps → Qwiken → Notifications

### Troubleshooting:
1. **No device token**: Restart app, check permissions
2. **FCM error**: Verify server key in Supabase
3. **iOS not working**: Check APNs certificate, device settings
4. **Android not working**: Verify google-services.json is correct

## 📱 Test Checklist

- [ ] FCM_SERVER_KEY added to Supabase
- [ ] APNs key uploaded to Firebase
- [ ] iOS capabilities enabled in Xcode
- [ ] App builds without errors
- [ ] Device token appears in database
- [ ] Local notifications work
- [ ] Remote notifications work
- [ ] Notification tap navigation works
- [ ] Tested on both iOS and Android

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com/)
- [Apple Developer Console](https://developer.apple.com/account/)
- [Supabase Dashboard](https://app.supabase.com/)
- [React Native Push Notifications Guide](https://react-native-push-notification.github.io/react-native-push-notification/)