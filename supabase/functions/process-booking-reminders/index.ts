import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and 6 hours from now window (with 5 minute buffer)
    const now = new Date();
    const checkTime = new Date(now.getTime() + 6 * 60 * 60 * 1000 + 5 * 60 * 1000); // 6 hours 5 minutes from now
    
    console.log('🔍 Checking for reminders to send...');
    console.log('Current time:', now.toISOString());
    console.log('Checking for reminders scheduled before:', checkTime.toISOString());

    // Fetch pending reminders that should be sent now
    const { data: reminders, error: fetchError } = await supabase
      .from('scheduled_reminders')
      .select('*')
      .eq('status', 'pending')
      .eq('reminder_type', '6_hour')
      .lte('scheduled_time', checkTime.toISOString())
      .gte('scheduled_time', now.toISOString());

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      throw fetchError;
    }

    if (!reminders || reminders.length === 0) {
      console.log('No reminders to send at this time');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No reminders to process',
          checked_at: now.toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`📧 Found ${reminders.length} reminders to send`);

    const results = [];
    
    // Process each reminder
    for (const reminder of reminders) {
      try {
        const bookingData = reminder.booking_data;
        
        // Send reminder email
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: reminder.recipient_email,
            subject: `Reminder: Your appointment at ${bookingData.shop_name} is coming up!`,
            html: generateReminderEmailHTML(bookingData),
            text: generateReminderEmailText(bookingData),
            from_email: 'reminders@qwiken.com',
            from_name: 'Qwiken Reminders'
          }),
        });

        if (emailResponse.ok) {
          // Mark reminder as sent
          await supabase
            .from('scheduled_reminders')
            .update({ 
              status: 'sent',
              sent_at: now.toISOString()
            })
            .eq('id', reminder.id);

          // Log email sent
          await supabase
            .from('email_logs')
            .insert({
              type: 'booking_reminder_6h',
              recipient: reminder.recipient_email,
              booking_id: reminder.booking_id,
              sent_at: now.toISOString(),
              status: 'sent'
            });

          results.push({
            id: reminder.id,
            status: 'sent',
            email: reminder.recipient_email
          });

          console.log(`✅ Reminder sent to ${reminder.recipient_email}`);
        } else {
          throw new Error(`Failed to send email: ${await emailResponse.text()}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('scheduled_reminders')
          .update({ 
            status: 'failed',
            error_message: error.message,
            failed_at: now.toISOString()
          })
          .eq('id', reminder.id);

        results.push({
          id: reminder.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in process-booking-reminders:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function generateReminderEmailHTML(bookingData: any): string {
  const hoursRemaining = 6;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Appointment Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #F97316 0%, #F59E0B 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .reminder-box { background: #FFF3CD; border: 2px solid #FFC107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .time-remaining { font-size: 36px; font-weight: bold; color: #F97316; margin: 10px 0; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-row:last-child { border-bottom: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Appointment Reminder</h1>
          <p>Qwiken</p>
        </div>
        
        <div class="content">
          <h2>Hi ${bookingData.customer_name}!</h2>
          
          <div class="reminder-box">
            <p>Your appointment is coming up in</p>
            <div class="time-remaining">${hoursRemaining} HOURS</div>
            <p>Don't forget!</p>
          </div>
          
          <div class="details">
            <h3>Appointment Details</h3>
            <div class="detail-row">
              <span>Service:</span>
              <strong>${bookingData.service_name}</strong>
            </div>
            <div class="detail-row">
              <span>Provider:</span>
              <strong>${bookingData.shop_name}</strong>
            </div>
            <div class="detail-row">
              <span>Date & Time:</span>
              <strong>${bookingData.booking_date} at ${bookingData.booking_time}</strong>
            </div>
            <div class="detail-row">
              <span>Duration:</span>
              <strong>${bookingData.duration} minutes</strong>
            </div>
            ${bookingData.shop_address ? `
            <div class="detail-row">
              <span>Location:</span>
              <strong>${bookingData.shop_address}</strong>
            </div>
            ` : ''}
          </div>
          
          <p style="text-align: center; color: #666;">
            We look forward to seeing you soon! If you need to cancel or reschedule, 
            please let us know as soon as possible.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReminderEmailText(bookingData: any): string {
  return `
Appointment Reminder - Qwiken

Hi ${bookingData.customer_name}!

This is a friendly reminder that your appointment is coming up in 6 HOURS!

APPOINTMENT DETAILS:
-------------------
Service: ${bookingData.service_name}
Provider: ${bookingData.shop_name}
Date & Time: ${bookingData.booking_date} at ${bookingData.booking_time}
Duration: ${bookingData.duration} minutes
${bookingData.shop_address ? `Location: ${bookingData.shop_address}` : ''}

We look forward to seeing you soon!

If you need to cancel or reschedule, please let us know as soon as possible.

Thank you for choosing Qwiken!
  `.trim();
}