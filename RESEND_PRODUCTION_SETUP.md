# 🚀 **Resend Production Domain Setup**

## ✅ **Code Updated for Production**

I've updated all the email functions to use production configuration:
- ✅ **Edge Functions**: Now use `@qwiken.org` domain
- ✅ **Booking API**: Set `USE_TEST_EMAILS_ONLY = false`
- ✅ **Professional Email Addresses**:
  - Customer emails from: `bookings@qwiken.org`
  - Business notifications from: `notifications@qwiken.org`
  - Support emails from: `support@qwiken.org`

## 🔧 **Required: Verify Domain with Resend**

### **Step 1: Add Domain to Resend**

1. **Go to Resend Dashboard**: https://resend.com/domains
2. **Click "Add Domain"**
3. **Enter**: `qwiken.org`
4. **Click "Add Domain"**

### **Step 2: Configure DNS Records**

Resend will provide DNS records to add to your domain. Add these to your DNS provider:

#### **Required DNS Records:**
```bash
# MX Record (for receiving bounces)
qwiken.org.     MX    10    feedback-smtp.us-east-1.amazonses.com

# TXT Record (for domain verification)  
qwiken.org.     TXT   "resend-verification=[RESEND_VERIFICATION_CODE]"

# CNAME Records (for DKIM authentication)
resend._domainkey.qwiken.org.    CNAME    [RESEND_DKIM_VALUE]
resend2._domainkey.qwiken.org.   CNAME    [RESEND_DKIM_VALUE]

# TXT Record (for SPF - sender authentication)
qwiken.org.     TXT   "v=spf1 include:amazonses.com ~all"

# TXT Record (for DMARC - email authentication)
_dmarc.qwiken.org.    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc@qwiken.org"
```

### **Step 3: Wait for Verification**

- **Verification Time**: Usually 5-10 minutes
- **Check Status**: In Resend dashboard
- **Status**: Should show "Verified" ✅

## 🚀 **Deploy Updated Edge Functions**

Once domain is verified, deploy the updated functions:

```bash
# Set project ID
export SUPABASE_PROJECT_ID=fezdmxvqurczeqmqvgzm

# Deploy updated functions
supabase functions deploy send-email --project-ref fezdmxvqurczeqmqvgzm
supabase functions deploy send-booking-email-enhanced --project-ref fezdmxvqurczeqmqvgzm

# Or use the deploy script
./supabase/deploy-functions.sh
```

## 🧪 **Test Production Setup**

### **Test Script for Production**
```bash
node test-email-edge-functions.js
```

### **Manual Testing**
1. **Register a real user** with a real email address
2. **Register a business** with a real business email
3. **Make a booking**
4. **Verify emails**:
   - Customer gets confirmation at their real email
   - Business owner gets notification at business email

## 🎯 **Expected Results (Production)**

### **Customer Email**:
- **To**: Customer's actual registered email
- **From**: `Qwiken Bookings <bookings@qwiken.org>`
- **Subject**: "Booking Confirmed - [Service] at [Shop]"
- **Content**: Professional booking confirmation

### **Business Email**:
- **To**: Business owner's actual email
- **From**: `Qwiken Business Portal <notifications@qwiken.org>`
- **Subject**: "New Booking: [Service] - [Customer Name]"
- **Content**: New booking notification with customer details

## 🔒 **Security & Deliverability Benefits**

### **With Verified Domain**:
- ✅ **Higher deliverability**: Emails less likely to go to spam
- ✅ **Professional appearance**: Branded email addresses
- ✅ **Authentication**: SPF, DKIM, DMARC protection
- ✅ **Unlimited recipients**: No sandbox restrictions
- ✅ **Analytics**: Better email tracking and metrics

## 🚨 **Troubleshooting**

### **If Domain Verification Fails**:
1. **Check DNS propagation**: Use https://dnschecker.org
2. **Wait longer**: DNS can take up to 48 hours
3. **Double-check records**: Ensure exact match with Resend requirements
4. **Contact Resend support**: They're very helpful

### **If Emails Still Not Sending**:
1. **Check Resend logs**: In dashboard under "Logs"
2. **Verify API key**: Should be production key, not test key
3. **Check Edge Function logs**: In Supabase dashboard
4. **Test with curl**: Use the test script to isolate issues

## 📊 **Monitoring & Analytics**

After setup, monitor in Resend dashboard:
- **Email delivery rates**
- **Open rates**  
- **Bounce rates**
- **Spam complaints**

## 💡 **Alternative Quick Fix**

If domain verification takes too long, you can temporarily:

1. **Use resend.dev domain**: Keep current `onboarding@resend.dev`
2. **Add individual emails**: In Resend → "Audience" → Add verified emails
3. **Whitelist recipients**: Add your test emails to verified list

But **domain verification is recommended** for production.

---

## 🎉 **Summary**

1. ✅ **Code updated** for production
2. 🔧 **Need to verify** `qwiken.org` domain in Resend
3. 🚀 **Deploy updated** Edge Functions
4. 📧 **Test with real emails**

Once the domain is verified, your booking email system will work perfectly in production with real customer and business owner emails! 🚀