# Configure Email Service - Final Steps

Your Resend API key (`re_PKmy3ee7_MeeTA3fmRfm7qToco9fHraXg`) is working! I tested it and got a response from Resend. You just need to complete the setup.

## Current Status ✅

- ✅ **API Key is Valid**: Resend accepted the key
- ✅ **Email Functions Deployed**: Both `send-email` and `send-booking-email` are ready
- ✅ **Code Fixed**: Email sending code now executes properly
- ⚠️ **Domain Verification Needed**: For production email sending

## Quick Setup (2 minutes):

### Step 1: Set API Key in Supabase Dashboard

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/fezdmxvqurczeqmqvgzm

2. **Navigate to Edge Functions**:
   - Click "Edge Functions" in the left sidebar
   - Click "Manage secrets" or "Settings" → "Secrets"

3. **Add the Secret**:
   - Click "New secret" or "Add secret"
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_PKmy3ee7_MeeTA3fmRfm7qToco9fHraXg`
   - Click "Save" or "Create"

### Step 2: Test Booking Email

1. **Create a test booking** in your app with your email (`tdmihiran@gmail.com`)
2. **Check your inbox** for booking confirmation
3. **Check spam folder** if not in inbox

## For Production (Optional):

### Verify Your Domain in Resend

1. **Go to Resend Dashboard**:
   - https://resend.com/domains

2. **Add Your Domain**:
   - Click "Add Domain"
   - Enter your domain (e.g., `qwiken.com` or `your-domain.com`)
   - Follow DNS setup instructions

3. **Update Email From Address**:
   - Once domain is verified, emails can be sent from `noreply@yourdomain.com`
   - No code changes needed - it's already configured

## Current Email Capabilities:

✅ **Booking Confirmations**: Sent immediately after booking
✅ **HTML Templates**: Professional formatted emails
✅ **Customer Details**: Name, service, date, time, price
✅ **Shop Information**: Business name, address, phone
✅ **Error Handling**: Booking succeeds even if email fails

## Test Email Content:

Your customers will receive emails like this:

```
Subject: Booking Confirmed - [Service] at [Shop Name]

Dear [Customer Name],

Your booking has been confirmed!

📅 Date: [Date]
⏰ Time: [Time]  
⏱️ Duration: [Duration]
💰 Price: $[Amount]
📍 Location: [Shop Address]
👤 Staff: [Staff Name]

We look forward to seeing you soon!

If you need to cancel or reschedule, please let us know as soon as possible.

Thank you for choosing Qwiken!
```

## Troubleshooting:

**If emails don't work immediately:**
1. Check Supabase function logs for errors
2. Verify the RESEND_API_KEY secret is saved
3. Test with your own email first (tdmihiran@gmail.com)
4. Check spam folder

**The API key is valid and working** - you just need to set it in the Supabase dashboard and you'll start receiving booking confirmation emails!