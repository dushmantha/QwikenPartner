import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId?: string
  userIds?: string[]
  title: string
  message: string
  data?: Record<string, any>
  type?: string
  badge?: number
  sound?: string
}

interface DeviceToken {
  device_token: string
  device_type: 'ios' | 'android'
  user_id: string
}

// APNs configuration interface
interface APNsConfig {
  teamId: string
  keyId: string
  privateKey: string
  bundleId: string
  production: boolean
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

    // Parse request body
    const { userId, userIds, title, message, data, type, badge, sound }: NotificationRequest = await req.json()

    // Validate request
    if ((!userId && !userIds) || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId/userIds, title, message' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine target user IDs
    const targetUserIds = userIds || [userId!]

    // Get all active device tokens for target users
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, device_type, user_id')
      .in('user_id', targetUserIds)
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
      console.log(`No active device tokens found for users: ${targetUserIds.join(', ')}`)
      return new Response(
        JSON.stringify({ message: 'No active device tokens found', sent: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check notification settings for each user
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('user_id, push_notifications')
      .in('user_id', targetUserIds)

    const enabledUsers = new Set(
      settings?.filter(s => s.push_notifications).map(s => s.user_id) || []
    )

    // If no settings found, assume enabled
    if (!settings || settings.length === 0) {
      targetUserIds.forEach(id => enabledUsers.add(id))
    }

    // Filter tokens by enabled users
    const activeTokens = deviceTokens.filter(token => enabledUsers.has(token.user_id))

    if (activeTokens.length === 0) {
      console.log('All users have push notifications disabled')
      return new Response(
        JSON.stringify({ message: 'Push notifications disabled for all users', sent: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Separate iOS and Android tokens
    const iosTokens = activeTokens.filter(t => t.device_type === 'ios')
    const androidTokens = activeTokens.filter(t => t.device_type === 'android')

    const results = []
    let successCount = 0
    let failureCount = 0

    // Send to iOS devices using APNs
    if (iosTokens.length > 0) {
      const apnsResults = await sendAPNsNotifications(iosTokens, title, message, data, badge, sound)
      results.push(...apnsResults.results)
      successCount += apnsResults.success
      failureCount += apnsResults.failure
    }

    // Send to Android devices using FCM
    if (androidTokens.length > 0) {
      const fcmResults = await sendFCMNotifications(androidTokens, title, message, data, type)
      results.push(...fcmResults.results)
      successCount += fcmResults.success
      failureCount += fcmResults.failure
    }

    // Log notifications in database
    const notificationPromises = targetUserIds.map(userId => {
      return supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title: title,
          message: message,
          data: data,
          type: type || 'general',
          status: successCount > 0 ? 'sent' : 'failed',
        }])
    })

    await Promise.all(notificationPromises)

    console.log(`Notifications sent: ${successCount} success, ${failureCount} failed`)

    return new Response(
      JSON.stringify({
        message: 'Notifications processed',
        sent: successCount,
        failed: failureCount,
        total: activeTokens.length,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in push notification handler:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Function to send APNs notifications
async function sendAPNsNotifications(
  tokens: DeviceToken[],
  title: string,
  message: string,
  data?: Record<string, any>,
  badge?: number,
  sound?: string
) {
  const results = []
  let successCount = 0
  let failureCount = 0

  // Get APNs configuration from environment
  const apnsKey = Deno.env.get('APNS_AUTH_KEY')
  const apnsKeyId = Deno.env.get('APNS_KEY_ID')
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID')
  const bundleId = Deno.env.get('IOS_BUNDLE_ID') || 'org.app.qwiken'
  
  // Auto-detect production based on environment
  // Check multiple indicators to determine if we're in production
  const environment = Deno.env.get('ENVIRONMENT') || Deno.env.get('NODE_ENV') || 'development'
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  
  // Automatically determine if production:
  // 1. If APNS_PRODUCTION is explicitly set, use it
  // 2. Otherwise, check if environment is production
  // 3. Or check if Supabase URL is not localhost/local
  const isProduction = 
    Deno.env.get('APNS_PRODUCTION') === 'true' ||
    environment === 'production' ||
    (!supabaseUrl.includes('localhost') && !supabaseUrl.includes('127.0.0.1') && supabaseUrl.includes('supabase'))

  if (!apnsKey || !apnsKeyId || !apnsTeamId) {
    console.log('APNs not configured, skipping iOS notifications')
    return { success: 0, failure: tokens.length, results: tokens.map(t => ({
      token: t.device_token,
      success: false,
      error: 'APNs not configured'
    }))}
  }

  // Create JWT for APNs authentication
  const jwt = await createAPNsJWT(apnsTeamId, apnsKeyId, apnsKey)
  
  // Log which APNs environment is being used
  console.log(`📱 Using APNs ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} environment`)
  console.log(`   Environment: ${environment}, Supabase URL: ${supabaseUrl.substring(0, 30)}...`)
  
  const apnsUrl = isProduction 
    ? 'https://api.push.apple.com/3/device/'
    : 'https://api.development.push.apple.com/3/device/'

  for (const token of tokens) {
    try {
      const payload = {
        aps: {
          alert: {
            title: title,
            body: message,
          },
          badge: badge || 0,
          sound: sound || 'default',
        },
        ...(data || {})
      }

      const response = await fetch(`${apnsUrl}${token.device_token}`, {
        method: 'POST',
        headers: {
          'authorization': `bearer ${jwt}`,
          'apns-topic': bundleId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 200) {
        successCount++
        results.push({ token: token.device_token, success: true, platform: 'ios' })
      } else {
        failureCount++
        const error = await response.text()
        results.push({ token: token.device_token, success: false, platform: 'ios', error })
        
        // Handle invalid tokens (410 = unregistered)
        if (response.status === 410) {
          await deactivateToken(token.device_token)
        }
      }
    } catch (error) {
      failureCount++
      results.push({ token: token.device_token, success: false, platform: 'ios', error: error.message })
    }
  }

  return { success: successCount, failure: failureCount, results }
}

// Function to send FCM notifications
async function sendFCMNotifications(
  tokens: DeviceToken[],
  title: string,
  message: string,
  data?: Record<string, any>,
  type?: string
) {
  const results = []
  let successCount = 0
  let failureCount = 0

  // Get Firebase configuration
  const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'qwiken-978a2'

  if (!firebaseServiceAccount) {
    console.log('Firebase not configured, skipping Android notifications')
    return { success: 0, failure: tokens.length, results: tokens.map(t => ({
      token: t.device_token,
      success: false,
      error: 'Firebase not configured'
    }))}
  }

  // Get OAuth access token for FCM
  const accessToken = await getFCMAccessToken(firebaseServiceAccount)

  for (const token of tokens) {
    try {
      const fcmMessage = {
        message: {
          token: token.device_token,
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
              channel_id: 'qwiken-default',
              priority: 'HIGH',
            }
          }
        }
      }

      const response = await fetch(
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

      const result = await response.json()

      if (response.ok) {
        successCount++
        results.push({ token: token.device_token, success: true, platform: 'android' })
      } else {
        failureCount++
        results.push({ token: token.device_token, success: false, platform: 'android', error: result })
        
        // Handle invalid tokens
        if (result.error?.code === 'INVALID_ARGUMENT' || 
            result.error?.status === 'UNREGISTERED') {
          await deactivateToken(token.device_token)
        }
      }
    } catch (error) {
      failureCount++
      results.push({ token: token.device_token, success: false, platform: 'android', error: error.message })
    }
  }

  return { success: successCount, failure: failureCount, results }
}

// Create JWT for APNs
async function createAPNsJWT(teamId: string, keyId: string, privateKey: string): Promise<string> {
  const jwt = await import('https://deno.land/x/djwt@v3.0.2/mod.ts')
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: teamId,
    iat: now
  }

  const header = {
    alg: 'ES256',
    kid: keyId
  }

  return await jwt.create(header, payload, privateKey)
}

// Get FCM access token
async function getFCMAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)
  
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  const jwt = await import('https://deno.land/x/djwt@v3.0.2/mod.ts')
  
  const key = await jwt.create(
    { alg: 'RS256', typ: 'JWT' },
    payload,
    serviceAccount.private_key
  )

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
}

// Deactivate invalid token
async function deactivateToken(deviceToken: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log(`Deactivating invalid token: ${deviceToken}`)
  await supabase
    .from('device_tokens')
    .update({ is_active: false })
    .eq('device_token', deviceToken)
}