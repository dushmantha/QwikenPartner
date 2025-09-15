import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string
  title: string
  message: string
  data?: Record<string, any>
  type?: string
}

interface FCMv1Message {
  message: {
    token?: string
    notification: {
      title: string
      body: string
    }
    data?: Record<string, string>
    android?: {
      notification: {
        channel_id: string
      }
    }
    apns?: {
      payload: {
        aps: {
          badge?: number
          sound?: string
        }
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Firebase service account from environment
    const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'qwiken-978a2'
    
    if (!firebaseServiceAccount) {
      console.error('FIREBASE_SERVICE_ACCOUNT not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Firebase service account not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { userId, title, message, data, type }: NotificationRequest = await req.json()

    if (!userId || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, message' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's active device tokens
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, device_type')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (tokenError) {
      console.error('Error fetching device tokens:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch device tokens' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log(`No active device tokens found for user: ${userId}`)
      return new Response(
        JSON.stringify({ message: 'No active device tokens found', sent: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check user's notification settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('push_notifications')
      .eq('user_id', userId)
      .single()

    if (settings && !settings.push_notifications) {
      console.log(`Push notifications disabled for user: ${userId}`)
      return new Response(
        JSON.stringify({ message: 'Push notifications disabled for user', sent: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Function to get OAuth access token
    const getAccessToken = async () => {
      try {
        const serviceAccount = JSON.parse(firebaseServiceAccount)
        const now = Math.floor(Date.now() / 1000)
        
        // Create JWT payload
        const payload = {
          iss: serviceAccount.client_email,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
          aud: 'https://oauth2.googleapis.com/token',
          exp: now + 3600,
          iat: now
        }

        // Import JWT signing library
        const jwt = await import('https://deno.land/x/djwt@v3.0.2/mod.ts')
        
        // Create and sign JWT
        const key = await jwt.create(
          { alg: 'RS256', typ: 'JWT' },
          payload,
          serviceAccount.private_key
        )

        // Exchange JWT for access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: key
          })
        })

        const tokenData = await response.json()
        return tokenData.access_token
      } catch (error) {
        console.error('Error getting access token:', error)
        throw error
      }
    }

    // Get OAuth access token
    const accessToken = await getAccessToken()
    
    // Send notifications to each device token
    const results = []
    let successCount = 0
    let failureCount = 0

    for (const deviceToken of deviceTokens) {
      try {
        // Prepare FCM v1 message
        const fcmMessage: FCMv1Message = {
          message: {
            token: deviceToken.device_token,
            notification: {
              title: title,
              body: message,
            },
            data: {
              ...Object.fromEntries(
                Object.entries(data || {}).map(([k, v]) => [k, String(v)])
              ),
              type: type || 'general',
            },
            android: {
              notification: {
                channel_id: 'qwiken-default'
              }
            },
            apns: {
              payload: {
                aps: {
                  badge: 1,
                  sound: 'default'
                }
              }
            }
          }
        }

        // Send notification via FCM v1 API
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmMessage),
          }
        )

        const result = await fcmResponse.json()
        
        if (fcmResponse.ok) {
          successCount++
          results.push({ token: deviceToken.device_token, success: true, result })
        } else {
          failureCount++
          results.push({ token: deviceToken.device_token, success: false, error: result })
          
          // Handle invalid tokens
          if (result.error?.code === 'INVALID_ARGUMENT' || 
              result.error?.status === 'UNREGISTERED') {
            console.log(`Removing invalid token: ${deviceToken.device_token}`)
            await supabase
              .from('device_tokens')
              .update({ is_active: false })
              .eq('device_token', deviceToken.device_token)
          }
        }
      } catch (error) {
        failureCount++
        results.push({ token: deviceToken.device_token, success: false, error: error.message })
      }
    }

    const fcmResult = { success: successCount, failure: failureCount, results }

    // Log notification in database
    const { error: logError } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title: title,
        message: message,
        data: data,
        type: type || 'general',
        status: successCount > 0 ? 'sent' : 'failed',
      }])

    if (logError) {
      console.error('Error logging notification:', logError)
    }

    console.log(`Notification sent to ${successCount}/${deviceTokens.length} devices for user: ${userId}`)

    return new Response(
      JSON.stringify({
        message: 'Notification processed',
        sent: successCount,
        failed: failureCount,
        total: deviceTokens.length,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error sending push notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})