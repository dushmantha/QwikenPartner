import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Resend with API key
const resend = new Resend('re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'All fields are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email address' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Qwiken Contact Form Submission</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center;">
          <div style="font-size: 40px;">🐝</div>
          <h1 style="color: #1a2533; margin: 10px 0; font-size: 28px;">Qwiken Contact Form</h1>
          <p style="color: #1a2533; margin: 0; font-size: 16px;">New Message Received</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1a2533; margin-top: 0; font-size: 20px;">Contact Details</h2>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #666; display: inline-block; width: 80px;">Name:</strong>
              <span style="color: #1a2533;">${name}</span>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #666; display: inline-block; width: 80px;">Email:</strong>
              <a href="mailto:${email}" style="color: #FFA500; text-decoration: none;">${email}</a>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #666; display: inline-block; width: 80px;">Subject:</strong>
              <span style="color: #1a2533;">${subject}</span>
            </div>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1a2533; margin-top: 0; font-size: 18px;">Message</h3>
            <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="background: #e3f2fd; border-radius: 8px; padding: 15px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 14px;">
              📅 Received: ${new Date().toLocaleString('en-NZ', { 
                timeZone: 'Pacific/Auckland',
                dateStyle: 'full',
                timeStyle: 'short'
              })}
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This email was sent from the Qwiken website contact form.
          </p>
        </div>
      </div>
    </body>
    </html>`;

    // Send email to admin
    const { data: adminEmail, error: adminError } = await resend.emails.send({
      from: 'Qwiken Contact <onboarding@resend.dev>',
      to: ['admin@qwiken.org'],
      cc: ['support@qwiken.org'],
      reply_to: email,
      subject: `[Contact Form] ${subject} - from ${name}`,
      html: htmlContent,
    });

    if (adminError) {
      console.error('Failed to send admin email:', adminError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send message. Please try again.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send confirmation email to user
    const userConfirmationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for contacting Qwiken</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center;">
          <div style="font-size: 40px;">🐝</div>
          <h1 style="color: #1a2533; margin: 10px 0; font-size: 28px;">Thank You!</h1>
          <p style="color: #1a2533; margin: 0; font-size: 16px;">We've received your message</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hi ${name},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Thank you for contacting Qwiken! We've received your message and our team will get back to you as soon as possible.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1a2533; margin-top: 0;">Your Message Summary:</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Message:</strong></p>
            <p style="color: #666; margin: 10px 0; padding: 10px; background: white; border-radius: 4px; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            We typically respond within 24-48 hours during business days.
          </p>
          
          <div style="background: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
            <p style="color: #2e7d32; margin: 0; font-size: 14px;">
              📧 If you have any urgent inquiries, please email us directly at<br>
              <a href="mailto:support@qwiken.org" style="color: #FFA500; text-decoration: none; font-weight: bold;">support@qwiken.org</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            Download the Qwiken App
          </p>
          <p style="color: #999; font-size: 12px; margin: 0;">
            Available on iOS and Android
          </p>
          <div style="margin-top: 15px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 Qwiken. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`;

    // Send confirmation to user
    const { data: userEmail, error: userError } = await resend.emails.send({
      from: 'Qwiken Support <onboarding@resend.dev>',
      to: [email],
      subject: 'Thank you for contacting Qwiken',
      html: userConfirmationHtml,
    });

    if (userError) {
      console.error('Failed to send user confirmation:', userError);
      // Don't fail the whole request if confirmation fails
    }

    console.log('✅ Contact form emails sent successfully');
    console.log('Admin email ID:', adminEmail?.id);
    console.log('User confirmation ID:', userEmail?.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
        emailId: adminEmail?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'An error occurred. Please try again later.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});