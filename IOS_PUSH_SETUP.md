# iOS Push Notification Setup Guide

## 🚨 Current Issue: "No development APNs certificate"

This error means your iOS app needs proper Apple Push Notification certificates configured in Firebase.

## 🔧 Solution: Choose One Method

### Method 1: APNs Authentication Key (RECOMMENDED - Easier)

#### ✅ Advantages:
- One key works for both development and production
- Never expires (unless revoked)
- Easier to manage
- No need to regenerate for new apps

#### Step-by-Step:

1. **Create APNs Key**:
   - Go to [Apple Developer Console → Keys](https://developer.apple.com/account/resources/authkeys/list)
   - Click **+** → Name: "Qwiken Push Notifications"
   - Check **Apple Push Notifications service (APNs)**
   - Click **Continue** → **Register**
   - **Download .p8 file** (IMPORTANT: You can only download once!)
   - **Note the Key ID** (10-character string)

2. **Get Team ID**:
   - In Apple Developer Console, go to **Membership** tab
   - Copy your **Team ID** (10-character string)

3. **Upload to Firebase**:
   - [Firebase Console](https://console.firebase.google.com/) → **qwiken-978a2**
   - **Project Settings** → **Cloud Messaging** → **iOS app configuration**
   - Click **Upload** next to "APNs authentication key"
   - Upload .p8 file, enter Key ID and Team ID
   - Click **Upload**

### Method 2: APNs Certificates (Alternative)

#### Step 1: Create Certificate Signing Request
```
1. Open Keychain Access on Mac
2. Keychain Access → Certificate Assistant → Request Certificate from CA
3. Email: your-email@domain.com
4. Common Name: Qwiken Push Certificate
5. Select "Saved to disk" → Continue → Save CSR file
```

#### Step 2: Create APNs Certificate
```
1. Apple Developer Console → Certificates → +
2. Select: Apple Push Notification service SSL (Sandbox & Production)
3. Choose App ID: org.app.qwiken
4. Upload CSR file → Continue
5. Download certificate (.cer file)
6. Double-click to install in Keychain Access
```

#### Step 3: Export for Firebase
```
1. Keychain Access → Find your push certificate
2. Right-click → Export → Personal Information Exchange (.p12)
3. Set password → Save .p12 file
4. Firebase Console → Upload .p12 file with password
```

## 🛠 Additional iOS Project Configuration

### 1. Enable Push Notifications in Xcode
```
1. Open ios/BuzyBees.xcworkspace in Xcode
2. Select BuzyBees target
3. Signing & Capabilities tab
4. Click + Capability → Add "Push Notifications"
5. Add "Background Modes" (if not present)
6. Check "Remote notifications" under Background Modes
```

### 2. Verify Bundle ID
```
Ensure your bundle ID in Xcode matches:
- Firebase iOS app: org.app.qwiken  
- Apple Developer Console: org.app.qwiken
```

### 3. Code Signing
```
1. Select valid Development Team
2. Ensure provisioning profile includes Push Notifications
3. Build on physical device (push doesn't work on simulator)
```

## ✅ Verification Steps

### 1. Check Firebase Configuration
- Firebase Console → Cloud Messaging → iOS app configuration
- Should show "APNs authentication key" or "APNs certificates" as configured ✅

### 2. Test on Device
```javascript
// Use the PushNotificationTest component
import PushNotificationTest from '../components/PushNotificationTest';

// Should show device token when "Check Device Token" is pressed
```

### 3. Check iOS Settings
```
Device Settings → Notifications → Qwiken → Allow Notifications = ON
```

## 🚨 Common Issues

### Issue: "No development APNs certificate"
**Solution**: Complete Method 1 or Method 2 above

### Issue: "Invalid bundle ID"  
**Solution**: Ensure bundle ID matches across Xcode, Firebase, and Apple Developer Console

### Issue: "Push notifications not working on simulator"
**Solution**: Push notifications only work on physical devices, not simulators

### Issue: "Token registration failed"
**Solution**: Check provisioning profile includes Push Notifications capability

## 📱 Testing Checklist

- [ ] APNs key/certificate uploaded to Firebase ✅
- [ ] Push Notifications capability added in Xcode
- [ ] Background Modes → Remote notifications enabled
- [ ] App built and installed on physical device
- [ ] Device token appears in app
- [ ] Notifications permission granted in iOS Settings
- [ ] Test notification received successfully

## 🔗 Useful Links

- [Apple Developer Console](https://developer.apple.com/account/)
- [Firebase Console](https://console.firebase.google.com/)
- [Apple Push Notification Guide](https://developer.apple.com/documentation/usernotifications)

## ⚡ Quick Fix Commands

```bash
# Clean and rebuild iOS
cd ios && rm -rf build && cd ..
npx react-native clean --include ios
cd ios && pod install && cd ..
npx react-native run-ios --device
```