# 🔐 Google Sign-In Setup Guide - Complete Instructions

## 📋 **Prerequisites**
- Google account
- React Native development environment
- Android Studio (for Android)
- Xcode (for iOS)

---

## 🚀 **Step 1: Create Google Cloud Project & OAuth Credentials**

### **1.1 Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `Qwiken-Auth` (or your app name)
4. Click **"Create"**

### **1.2 Enable Google+ API**
1. In Google Cloud Console, go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for **"Google+ API"** 
3. Click **"Enable"**

### **1.3 Configure OAuth Consent Screen**
1. Go to [APIs & Services > OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Choose **"External"** → Click **"Create"**
3. Fill required fields:
   - **App name**: `Qwiken` (your app name)
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **"Save and Continue"** through all steps

### **1.4 Create OAuth 2.0 Credentials**
1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"+ Create Credentials"** → **"OAuth 2.0 Client IDs"**

**Create 3 OAuth clients:**

#### **A) Web Application (for Supabase)**
- **Application type**: Web application
- **Name**: `Qwiken Web Client`
- **Authorized JavaScript origins**: 
  ```
  https://fezdmxvqurczeqmqvgzm.supabase.co
  ```
- **Authorized redirect URIs**:
  ```
  https://fezdmxvqurczeqmqvgzm.supabase.co/auth/v1/callback
  ```
- Click **"Create"** → **Save the Web Client ID** 📝

#### **B) Android Application**
- **Application type**: Android
- **Name**: `Qwiken Android`
- **Package name**: `com.buzybees` (from your AndroidManifest.xml)
- **SHA-1 certificate fingerprint**: Get with command below 👇

**Get SHA-1 Fingerprint:**
```bash
# For debug keystore
keytool -list -v -alias androiddebugkey -keystore android/app/debug.keystore -storepass android -keypass android

# Look for SHA1 fingerprint like: A1:B2:C3:D4:E5:F6...
```

#### **C) iOS Application**
- **Application type**: iOS
- **Name**: `Qwiken iOS`
- **Bundle ID**: `com.buzybees` (from your iOS project)

---

## 🔥 **Step 2: Create Firebase Project**

### **2.1 Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. **Project name**: Use the same Google Cloud project created above
4. Enable Google Analytics (optional)
5. Click **"Create project"**

### **2.2 Add Android App to Firebase**
1. In Firebase Console, click **"Add app"** → Android icon
2. **Android package name**: `com.buzybees`
3. **App nickname**: `Qwiken Android`
4. **SHA-1**: Use the same SHA-1 from Step 1.4B
5. Click **"Register app"**
6. **Download `google-services.json`** 📥
7. Place file in `android/app/google-services.json`

### **2.3 Add iOS App to Firebase**
1. Click **"Add app"** → iOS icon  
2. **iOS bundle ID**: `com.buzybees`
3. **App nickname**: `Qwiken iOS`
4. Click **"Register app"**
5. **Download `GoogleService-Info.plist`** 📥
6. Add to iOS project in Xcode

### **2.4 Enable Google Sign-In in Firebase**
1. Go to **Authentication** → **Sign-in method**
2. Click **"Google"** → **"Enable"**
3. **Web SDK configuration**: Paste your **Web Client ID** from Step 1.4A
4. Click **"Save"**

---

## 📱 **Step 3: Install Dependencies**

```bash
npm install @react-native-google-signin/google-signin
cd ios && pod install
```

---

## 🤖 **Step 4: Android Configuration**

### **4.1 Add google-services.json**
Place the downloaded `google-services.json` in:
```
android/app/google-services.json
```

### **4.2 Update Android Gradle Files**

**android/build.gradle** (project level):
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
    // ... other dependencies
}
```

**android/app/build.gradle** (app level):
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
    // ... other dependencies
}
```

---

## 🍎 **Step 5: iOS Configuration**

### **5.1 Add GoogleService-Info.plist**
1. Open your project in Xcode
2. Drag `GoogleService-Info.plist` to your project
3. Make sure **"Add to target"** is checked

### **5.2 Update Info.plist**
Add URL scheme to `ios/BuzyBees/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>REVERSED_CLIENT_ID</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID</string>
        </array>
    </dict>
</array>
```

**Replace `YOUR_REVERSED_CLIENT_ID`** with the actual value from `GoogleService-Info.plist`

---

## ⚙️ **Step 6: Environment Configuration**

Create/update `.env` file:
```env
GOOGLE_WEB_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

**Replace with your actual Web Client ID from Step 1.4A**

---

## 🔗 **Step 7: Supabase Configuration**

### **7.1 Configure Google Provider in Supabase**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Authentication** → **Providers**
3. Find **Google** and click **"Enable"**
4. **Client ID**: Your Web Client ID from Step 1.4A
5. **Client Secret**: Your Web Client Secret from Step 1.4A
6. **Redirect URL**: 
   ```
   https://fezdmxvqurczeqmqvgzm.supabase.co/auth/v1/callback
   ```
7. Click **"Save"**

---

## ✅ **Step 8: Test Your Setup**

### **8.1 Test Google Sign-In**
1. Run your app: `npx react-native run-android` or `npx react-native run-ios`
2. Navigate to Login/Register screen
3. Tap **"Sign in with Google"** button
4. Complete Google authentication flow
5. Verify user appears in Supabase Dashboard → Authentication → Users

### **8.2 Troubleshooting Common Issues**

**Android:**
- **Error 10**: Wrong SHA-1 fingerprint → Regenerate and update in Google Console
- **Error 12501**: Wrong package name → Check `com.buzybees` matches everywhere

**iOS:**
- **Missing URL scheme**: Check Info.plist has correct REVERSED_CLIENT_ID
- **GoogleService-Info.plist not found**: Ensure file is added to Xcode project

**General:**
- **Web Client ID error**: Ensure you're using Web Client ID, not Android/iOS client ID
- **Supabase error**: Check Google provider is enabled with correct credentials

---

## 📚 **Additional Resources**

- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase Console](https://console.firebase.google.com/)
- [React Native Google Sign-In Docs](https://github.com/react-native-google-signin/google-signin)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## 🎯 **Current Status**

✅ **Google Sign-In has been integrated into:**
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/RegisterScreen.tsx`
- `src/services/auth/googleSignIn.ts`

✅ **Features:**
- Proper error handling
- Loading states
- Supabase integration
- Cross-platform support (Android & iOS)

---

**🎉 Your Google Sign-In should now be fully functional!**