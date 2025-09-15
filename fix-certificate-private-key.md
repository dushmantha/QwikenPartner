# Fix Certificate Private Key Association

## 🔍 Problem Identified
- Certificate exists: ✅ "Apple Push Services: org.app.qwiken"  
- Private key exists: ✅ Found in keychain identities
- SSL association: ❌ Not properly linked for SSL client use
- Result: .p12 export disabled

## 🛠 Solution Methods

### Method 1: Trust and Re-associate in Keychain Access

1. **Open Keychain Access**
2. **View Menu** → **Show Expired Certificates** (enable)
3. **Find "Apple Push Services: org.app.qwiken"** in System keychain
4. **Look for the private key** (should be right below or above the certificate)
   - Look for a key icon 🔑 with same name
5. **Select BOTH certificate and private key** (Cmd+click)
6. **Right-click** → **Get Info** on certificate
7. **Trust section** → Set **"Secure Sockets Layer (SSL)"** to **"Always Trust"**
8. **Close and enter password**

### Method 2: Export Both Certificate and Private Key

1. **Keychain Access** → **System keychain**
2. **Find the certificate** "Apple Push Services: org.app.qwiken"
3. **Look for the private key** (🔑 icon) - should be nearby
4. **Select the private key** (not the certificate)
5. **Right-click on private key** → **Export**
6. **Save as .p12** format
7. **Set a strong password**
8. **Delete both certificate and private key** from keychain
9. **Double-click the .p12 file** to re-import
10. **Enter the password** → Should import both cert and key together

### Method 3: Manual Export Command

Try exporting using security command:

```bash
# Export certificate and private key as .p12
security export -k /Library/Keychains/System.keychain \
  -t identities \
  -f pkcs12 \
  -o ~/Desktop/apple_push_qwiken.p12 \
  -P "YOUR_PASSWORD_HERE"
```

### Method 4: Re-download from Apple Developer Console

If above methods fail:

1. **Apple Developer Console** → [Certificates](https://developer.apple.com/account/resources/certificates/list)
2. **Find your push certificate** for org.app.qwiken
3. **Revoke the current certificate**
4. **Create Certificate Signing Request (CSR)**:
   - Keychain Access → Certificate Assistant → Request Certificate from CA
   - Email: your Apple ID
   - Common Name: "Qwiken Push New"
   - Save to disk: ✅
5. **Create new certificate** with the CSR
6. **Download and install** new certificate
7. **Export as .p12** (should work now with new private key)

## 🧪 Test Commands

### Check if private key is properly associated:
```bash
# Should show the identity with private key
security find-identity -v -p ssl-client | grep qwiken

# Export test (replace PASSWORD with your choice)
security export -k login.keychain-db \
  -t identities \
  -f pkcs12 \
  -o ~/Desktop/test_export.p12 \
  -P "PASSWORD" \
  -c "Apple Push Services: org.app.qwiken"
```

### Verify certificate details:
```bash
# Check certificate validity
security find-certificate -c "Apple Push Services: org.app.qwiken" -p | \
openssl x509 -text -noout | grep -E "(Subject|Issuer|Not Before|Not After)"
```

## ✅ Success Indicators

After fixing:
- [ ] .p12 export option enabled in Keychain Access
- [ ] `security find-identity -v -p ssl-client` shows your certificate
- [ ] Can export .p12 file with password
- [ ] Firebase accepts the .p12 upload
- [ ] Push notifications work on device

## 🚀 Upload to Firebase

Once you have the .p12 file:

1. **Firebase Console** → qwiken-978a2 → **Cloud Messaging**
2. **iOS app configuration** → **Upload certificate**
3. **Select your .p12 file**
4. **Enter the password** you set during export
5. **Upload** → Should show ✅ configured

## 🆘 If All Else Fails

**Switch to APNs Authentication Key** (recommended):
- Easier setup, no private key issues
- One key works for dev and production
- Never expires unless revoked
- More reliable than certificates