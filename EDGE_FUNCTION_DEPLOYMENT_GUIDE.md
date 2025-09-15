# 📧 Email Edge Functions Deployment Guide

## Overview
This guide will help you deploy the email Edge Functions to fix the booking confirmation email issue where both customers and business owners need to receive emails.

## ✅ What's Been Fixed

### 1. **Booking API Logic Fixed**
- **Before**: Only shop owners received emails (customer emails redirected to test address)
- **After**: Both customer AND business owner receive their respective emails
- **File**: `src/services/api/bookings/bookingsAPI.ts`

### 2. **Email Routing Logic**
- Customer gets **booking confirmation** email
- Business owner gets **new booking notification** email  
- Proper fallback mechanisms for missing emails
- Development vs production email handling

## 🚀 Deployment Steps

### Step 1: Login to Supabase CLI
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to your account
supabase login
```

### Step 2: Deploy Edge Functions
```bash
# Set your project ID
export SUPABASE_PROJECT_ID=fezdmxvqurczeqmqvgzm

# Deploy both email functions
supabase functions deploy send-email --project-ref fezdmxvqurczeqmqvgzm
supabase functions deploy send-booking-email --project-ref fezdmxvqurczeqmqvgzm
```

### Step 3: Set Environment Variables
Go to your [Supabase Dashboard](https://app.supabase.com/project/fezdmxvqurczeqmqvgzm/settings/vault) and add:

```
RESEND_API_KEY = re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt
```

## 🔧 Configuration Options

### Development vs Production Mode
In `bookingsAPI.ts`, line 208:
```typescript
const USE_TEST_EMAILS_ONLY = false; // Set to true for development with Resend sandbox
```

- **`false`** (Production): Uses actual customer/business emails
- **`true`** (Development): Redirects all emails to test address

### Resend API Configuration
The system uses Resend API for reliable email delivery:
- **API Key**: Already configured in the Edge Functions
- **Domain**: Uses `noreply@qwiken.org` (verified domain)
- **Templates**: Professional HTML templates with company branding

## 📧 Email Types

### 1. Customer Confirmation Email
- **Recipient**: Customer's registered email
- **Subject**: "Booking Confirmed - [Service] at [Shop]"
- **Content**: Booking details, location, reminders
- **Template**: Professional Qwiken branding

### 2. Business Notification Email  
- **Recipient**: Business owner's email (from `provider_businesses.email`)
- **Subject**: "New Booking: [Service] - [Customer Name]"
- **Content**: Customer info, booking details, action buttons
- **Template**: Business portal styling

## 🔍 Testing the Fix

### 1. Make a Test Booking
1. Register a user with a real email address
2. Make a booking through the app
3. Check both the customer AND business owner receive emails

### 2. Check Logs
Monitor the console logs for:
```
📧 Sending confirmation to customer email: [actual-email]
🏪 Sending notification to business email: [business-email]
✅ Email sent successfully via Resend
```

### 3. Verify Email Content
- Customer email shows booking confirmation
- Business email shows new booking notification
- Both emails have proper details and branding

## 🛠️ Edge Function URLs

Once deployed, your functions will be available at:
- **Customer Emails**: `https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/send-email`
- **Business Emails**: `https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/send-booking-email`

## 🚨 Troubleshooting

### Issue: "Function not deployed" error
**Solution**: Deploy the Edge Functions using the commands above

### Issue: "RESEND_API_KEY not configured" 
**Solution**: Add the API key to Supabase environment variables

### Issue: Emails going to spam
**Solution**: 
1. Verify your domain with Resend
2. Set up SPF/DKIM records
3. Use a custom verified domain instead of resend.dev

### Issue: Customer email not found
**Solution**: 
- Check user authentication 
- Verify user profile has email
- Check the fallback logic in booking API

## ✅ Success Indicators

When working correctly, you should see:
1. **Customer receives**: Professional booking confirmation email
2. **Business owner receives**: New booking notification with customer details
3. **Console logs**: Successful email sending messages  
4. **No fallbacks**: Emails use actual addresses, not test addresses
5. **Both parties**: Get appropriate email content for their role

## 📞 Support

If you encounter issues:
1. Check Supabase function logs in the dashboard
2. Verify Resend API key is valid
3. Confirm both Edge Functions are deployed
4. Test with different email addresses

---

**🎉 Once deployed, both customers and business owners will receive proper email notifications for all bookings!**