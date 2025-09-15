# Setting Up APNs Keys for Push Notifications

## Required Keys

1. **APNS_AUTH_KEY**: The contents of your .p8 file
2. **APNS_KEY_ID**: The 10-character Key ID (e.g., "ABC123DEFG")
3. **APNS_TEAM_ID**: Your 10-character Team ID (e.g., "1234567890")

## Step 1: Get Keys from Apple Developer

### Generate APNs Auth Key:
1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Click "+" to create a new key
3. Name it (e.g., "BuzyBees Push Key")
4. Check "Apple Push Notifications service (APNs)"
5. Click Continue → Register
6. Download the .p8 file (⚠️ SAVE IT - you can't download again!)
7. Note the Key ID displayed

### Get Team ID:
1. Go to https://developer.apple.com/account
2. Find your Team ID in the membership section

## Step 2: Prepare the Auth Key

Open your downloaded .p8 file in a text editor. It should look like:
```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...multiple lines of base64 encoded text...
...more base64...
-----END PRIVATE KEY-----
```

## Step 3: Set Supabase Edge Function Secrets

### Option A: Using Supabase CLI (Recommended)

```bash
# Set the auth key (paste the entire .p8 file content including BEGIN/END lines)
npx supabase secrets set APNS_AUTH_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...your key content...
-----END PRIVATE KEY-----"

# Set the key ID (10 characters, e.g., "ABC123DEFG")
npx supabase secrets set APNS_KEY_ID="YOUR_KEY_ID"

# Set the team ID (10 characters, e.g., "1234567890")
npx supabase secrets set APNS_TEAM_ID="YOUR_TEAM_ID"

# Set your app bundle ID
npx supabase secrets set BUNDLE_ID="com.yourcompany.BuzyBees"
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Add secrets:
   - Name: `APNS_AUTH_KEY`, Value: (paste entire .p8 file content)
   - Name: `APNS_KEY_ID`, Value: (your Key ID)
   - Name: `APNS_TEAM_ID`, Value: (your Team ID)
   - Name: `BUNDLE_ID`, Value: (your app bundle ID)

## Step 4: Verify Your Setup

List your secrets to confirm they're set:
```bash
npx supabase secrets list
```

## Step 5: Deploy Edge Functions

Deploy your push notification functions:
```bash
npx supabase functions deploy send-push-notification-v2
```

## Important Notes

⚠️ **Security**: Never commit these keys to your repository
⚠️ **Key Storage**: Store your .p8 file securely - you can't re-download it
⚠️ **Key Reuse**: You can use the same APNs key for multiple apps
⚠️ **Key Limit**: Apple allows maximum 2 active APNs auth keys

## Troubleshooting

If push notifications aren't working after setting up keys:

1. **Verify Bundle ID**: Make sure BUNDLE_ID matches your app's bundle identifier
2. **Check Key Permissions**: Ensure the key has APNs enabled
3. **Test Environment**: Use correct APNs environment (development/production)
4. **Key Format**: Ensure the entire .p8 file content is included (with BEGIN/END lines)

## Example Values (DO NOT USE - For Reference Only)

```bash
# Example APNS_KEY_ID
APNS_KEY_ID="ABC123DEFG"

# Example APNS_TEAM_ID  
APNS_TEAM_ID="1234567890"

# Example BUNDLE_ID
BUNDLE_ID="com.qwiken.BuzyBees"

# Example APNS_AUTH_KEY (truncated)
APNS_AUTH_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----"
```