# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Qwiken app.

## Functions

### send-email
Handles sending emails for booking confirmations, reminders, and business notifications.

## Setup

### Prerequisites
1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Have your Supabase project ID ready
3. Get a Resend API key from https://resend.com

### Environment Variables
Set these in your Supabase dashboard (Settings > Vault):
- `RESEND_API_KEY`: Your Resend API key

### Deployment

1. From the project root directory, run:
```bash
./deploy-edge-functions.sh
```

2. Enter your Supabase project ID when prompted

3. Set the RESEND_API_KEY in your Supabase dashboard

### Testing

Test the function with curl:
```bash
curl -L -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello World</h1>"
  }'
```

## Important Notes

### Production Mode
The function is now in PRODUCTION MODE:
- Emails are sent to actual recipients
- Using Resend API with onboarding@resend.dev (testing domain)

### Custom Domain Setup (Optional)
To use your own domain for emails:
1. Verify your domain at https://resend.com/domains
2. Update the FROM_EMAIL to use your verified domain
3. Redeploy the function

### Email Types Supported
1. **Booking Confirmation** - Sent to customers when booking is created
2. **Business Notification** - Sent to businesses when they receive a booking
3. **Reminder Emails** - Sent 6 hours before appointment

## Troubleshooting

### Common Issues

1. **"You can only send testing emails to your own email address"**
   - This is a Resend API restriction for unverified domains
   - Solution: Verify your domain or use test mode

2. **Function not found (404)**
   - Make sure the function is deployed
   - Check your project ID is correct
   - Verify the function name in the URL

3. **Authentication error**
   - Check your anon key is correct
   - Ensure the function has proper RLS policies

## Development

To test locally:
```bash
supabase functions serve send-email --env-file .env.local
```

Create `.env.local` with:
```
RESEND_API_KEY=your_api_key_here
```