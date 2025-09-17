import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface NotificationPayload {
  title: string;
  message: string;
  data?: any;
  userId?: string;
}

export interface DeviceToken {
  id?: string;
  user_id: string;
  device_token: string;
  device_type: 'ios' | 'android';
  app_version?: string;
  device_info?: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

class SafePushNotificationService {
  private isInitialized = false;
  private deviceToken: string | null = null;
  private PushNotification: any = null;
  private PushNotificationIOS: any = null;
  private hasNativeModule = false;

  constructor() {
    // Don't initialize anything in constructor
  }

  // Safely check if native modules are available
  private async checkNativeModules(): Promise<boolean> {
    try {
      // Check if the native module actually exists first
      const { NativeModules } = require('react-native');
      
      if (Platform.OS === 'ios') {
        this.hasNativeModule = !!NativeModules.RNCPushNotificationIOS;
      } else {
        this.hasNativeModule = !!NativeModules.RNPushNotification;
      }
      
      if (!this.hasNativeModule) {
        console.warn('⚠️ Push notification native module not found. Please rebuild the app.');
        return false;
      }

      // Only require modules if native modules exist - with defensive requiring
      if (Platform.OS === 'ios') {
        try {
          const pushNotificationIOSModule = require('@react-native-community/push-notification-ios');
          this.PushNotificationIOS = pushNotificationIOSModule.default || pushNotificationIOSModule;
        } catch (iosError) {
          console.warn('⚠️ Failed to require iOS push notification module:', iosError.message);
          return false;
        }
      }
      
      try {
        const pushNotificationModule = require('react-native-push-notification');
        this.PushNotification = pushNotificationModule.default || pushNotificationModule;
      } catch (mainError) {
        console.warn('⚠️ Failed to require main push notification module:', mainError.message);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ Push notification modules not available:', error);
      return false;
    }
  }

  configure = async () => {
    if (this.isInitialized) return true;

    try {
      console.log('🔔 Checking push notification availability...');
      
      // Check if native modules are available
      const modulesAvailable = await this.checkNativeModules();
      if (!modulesAvailable) {
        console.warn('⚠️ Push notifications not available on this device');
        return false;
      }

      console.log('🔔 Configuring push notifications...');
      
      // Don't register here - will be done after permission request
      
      // Import Importance only when needed for Android
      let Importance: any;
      if (Platform.OS === 'android') {
        const pushModule = require('react-native-push-notification');
        Importance = pushModule.Importance;
      }

      // Configure push notifications
      this.PushNotification.configure({
        onRegister: async (token: any) => {
          console.log('🎉 === DEVICE TOKEN RECEIVED ===');
          console.log('📱 Token object:', token);
          console.log('📱 Token value:', token.token);
          console.log('📱 Token OS:', token.os);
          console.log('=================================');
          this.deviceToken = token.token;
          
          // Always try to save the token when received
          await this.saveDeviceToken(token.token);
        },

        onNotification: (notification: any) => {
          console.log('🔔 Notification received:', notification);
          
          // Handle notification tap
          if (notification.userInteraction) {
            this.handleNotificationTap(notification);
          }

          // Required on iOS only
          if (Platform.OS === 'ios' && this.PushNotificationIOS) {
            notification.finish(this.PushNotificationIOS.FetchResult.NoData);
          }
        },

        onAction: (notification: any) => {
          console.log('🔔 Notification action:', notification.action);
        },

        onRegistrationError: (err: Error) => {
          console.error('❌ Push notification registration error:', err);
        },

        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        popInitialNotification: true,
        requestPermissions: false, // We'll handle this manually
      });
      
      // For iOS, we need to explicitly register for remote notifications after configuration
      // This is crucial for getting the device token
      if (Platform.OS === 'ios' && this.PushNotificationIOS) {
        console.log('📱 iOS detected, checking if we should auto-register for remote notifications...');
        
        // Check if permissions are already granted
        this.PushNotificationIOS.checkPermissions((permissions: any) => {
          const hasPermission = !!(permissions.alert || permissions.badge || permissions.sound);
          console.log('📱 iOS permissions check during configure:', {
            hasPermission,
            alert: permissions.alert,
            badge: permissions.badge,
            sound: permissions.sound
          });
          
          if (hasPermission) {
            console.log('✅ iOS permissions already granted');
            console.log('📱 Native AppDelegate should handle device token registration');
          } else {
            console.log('⚠️ iOS permissions not granted yet, will register after permission request');
          }
        });
      }

      // Create notification channel for Android
      if (Platform.OS === 'android' && Importance) {
        this.PushNotification.createChannel(
          {
            channelId: 'qwiken-default',
            channelName: 'Qwiken Partner Notifications',
            channelDescription: 'Default notification channel for Qwiken Partner app',
            playSound: true,
            soundName: 'default',
            importance: Importance.HIGH,
            vibrate: true,
          },
          (created: boolean) => console.log(`🔔 Created channel returned '${created}'`)
        );
      }

      this.isInitialized = true;
      console.log('✅ Push notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize push notification service:', error);
      this.isInitialized = false;
      return false;
    }
  };

  // Check current notification permission status
  checkPermissions = async (): Promise<{ granted: boolean; alert?: boolean; badge?: boolean; sound?: boolean }> => {
    try {
      if (!this.isInitialized || !this.hasNativeModule) {
        console.warn('⚠️ Push notification service not properly initialized for permission check');
        return { granted: false };
      }

      if (Platform.OS === 'ios' && this.PushNotificationIOS) {
        return new Promise((resolve) => {
          try {
            // Try callback-based approach first
            this.PushNotificationIOS.checkPermissions((permissions: any) => {
              console.log('📱 iOS Permissions (callback):', permissions);
              resolve({
                granted: !!(permissions.alert || permissions.badge || permissions.sound),
                alert: permissions.alert,
                badge: permissions.badge,
                sound: permissions.sound
              });
            });
          } catch (callbackError) {
            // Fallback to Promise-based approach
            console.log('📱 Using Promise-based checkPermissions...');
            this.PushNotificationIOS.checkPermissions()
              .then((permissions: any) => {
                console.log('📱 iOS Permissions (promise):', permissions);
                resolve({
                  granted: !!(permissions.alert || permissions.badge || permissions.sound),
                  alert: permissions.alert,
                  badge: permissions.badge,
                  sound: permissions.sound
                });
              })
              .catch((promiseError: any) => {
                console.error('❌ Error with promise checkPermissions:', promiseError);
                resolve({ granted: false });
              });
          }
        });
      } else if (Platform.OS === 'android') {
        // Android permissions are handled automatically
        return { granted: true };
      }
      
      return { granted: false };
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return { granted: false };
    }
  };

  // Request notification permissions
  requestPermissions = async (): Promise<boolean> => {
    try {
      if (!this.isInitialized) {
        const configured = await this.configure();
        if (!configured) return false;
      }

      if (Platform.OS === 'ios' && this.PushNotificationIOS) {
        return new Promise((resolve) => {
          console.log('📱 Requesting iOS push permissions...');
          
          // Remove any existing listeners first
          try {
            this.PushNotificationIOS.removeAllListeners('register');
            this.PushNotificationIOS.removeAllListeners('registrationError');
          } catch (e) {
            console.log('📱 No existing listeners to remove');
          }
          
          // Set up listeners for iOS token registration
          this.PushNotificationIOS.addEventListener('register', (token: string) => {
            console.log('🎉 === iOS NATIVE TOKEN RECEIVED ===');
            console.log('📱 iOS Device Token via addEventListener:', token);
            console.log('=====================================');
            this.deviceToken = token;
            // Save the token immediately
            this.saveDeviceToken(token);
          });
          
          this.PushNotificationIOS.addEventListener('registrationError', (error: any) => {
            console.error('📱 iOS Registration Error:', error);
            console.error('   Error details:', JSON.stringify(error, null, 2));
          });
          
          // Request permissions with proper callback structure
          const permissionOptions = {
            alert: true,
            badge: true,
            sound: true,
          };
          
          // Use the callback-based approach for iOS
          try {
            this.PushNotificationIOS.requestPermissions(permissionOptions, (permissions: any) => {
              console.log('📱 iOS Permissions response:', permissions);
              
              const granted = !!(permissions.alert || permissions.badge || permissions.sound);
              
              if (granted) {
                console.log('✅ iOS Permissions granted');
                console.log('📱 Native AppDelegate will handle device token registration');
                resolve(true);
              } else {
                console.log('❌ iOS Permissions denied');
                console.warn('⚠️ Push notification permissions denied');
                resolve(false);
              }
            });
          } catch (callbackError) {
            console.log('📱 Trying Promise-based approach...');
            // Fallback to Promise-based approach
            this.PushNotificationIOS.requestPermissions(permissionOptions)
              .then((permissions: any) => {
                console.log('📱 iOS Permissions response:', permissions);
                
                const granted = !!(permissions.alert || permissions.badge || permissions.sound);
                
                if (granted) {
                  console.log('✅ iOS Permissions granted (Promise-based)');
                  console.log('📱 Native AppDelegate will handle device token registration');
                  resolve(true);
                } else {
                  console.log('❌ iOS Permissions denied');
                  console.warn('⚠️ Push notification permissions denied');
                  resolve(false);
                }
              })
              .catch((error: any) => {
                console.error('❌ Error requesting iOS permissions:', error);
                resolve(false);
              });
          }
        });
      } else if (Platform.OS === 'android') {
        // Android permissions are handled automatically
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  };

  // Save device token to Supabase - ENHANCED VERSION
  saveDeviceToken = async (token: string) => {
    try {
      console.log('💾 [ENHANCED] Attempting to save device token:', token.substring(0, 20) + '...');
      console.log('💾 Current timestamp:', new Date().toISOString());
      
      // Check session first
      const session = await supabase.auth.getSession();
      console.log('🔐 Session check result:', {
        hasSession: !!session.data.session,
        hasUser: !!session.data.session?.user,
        userId: session.data.session?.user?.id,
        sessionError: session.error?.message,
        accessToken: session.data.session?.access_token ? 'present' : 'missing'
      });
      
      const user = await supabase.auth.getUser();
      console.log('👤 User check result:', {
        hasUser: !!user.data.user,
        userId: user.data.user?.id,
        email: user.data.user?.email,
        userError: user.error?.message,
        createdAt: user.data.user?.created_at
      });
      
      if (!user.data.user) {
        console.warn('⚠️ No authenticated user found');
        console.log('💤 Storing device token as pending for later processing');
        await AsyncStorage.setItem('pending_device_token', token);
        console.log('✅ Device token stored locally as pending');
        return;
      }
      
      console.log('✅ User authenticated, proceeding with database save');

      const deviceTokenData: Omit<DeviceToken, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.data.user.id,
        device_token: token,
        device_type: Platform.OS as 'ios' | 'android',
        app_version: '1.0.0',
        device_info: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        is_active: true,
      };

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('device_token', token)
        .single();

      if (existingToken) {
        // Update existing token
        console.log('📝 Updating existing device token:', existingToken.id);
        const { data: updateData, error } = await supabase
          .from('device_tokens')
          .update({ 
            is_active: true, 
            updated_at: new Date().toISOString(),
            app_version: deviceTokenData.app_version,
          })
          .eq('id', existingToken.id)
          .select();

        if (error) {
          console.error('❌ Error updating device token:', error);
          console.error('   Update error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Store as pending if update fails
          console.log('💤 Update failed, storing token as pending');
          await AsyncStorage.setItem('pending_device_token', token);
        } else {
          console.log('✅ Device token updated in Supabase successfully');
          console.log('   Updated token data:', updateData);
        }
      } else {
        // Insert new token
        console.log('📤 Inserting new device token into database');
        console.log('   Insert data:', {
          user_id: deviceTokenData.user_id,
          device_type: deviceTokenData.device_type,
          token_preview: deviceTokenData.device_token.substring(0, 20) + '...',
          app_version: deviceTokenData.app_version,
          platform: deviceTokenData.device_info.platform
        });
        
        const { data, error } = await supabase
          .from('device_tokens')
          .insert([deviceTokenData])
          .select();

        if (error) {
          console.error('❌ Error saving device token to database:', error);
          console.error('   Insert error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Store as pending if insert fails
          console.log('💤 Insert failed, storing token as pending for retry');
          await AsyncStorage.setItem('pending_device_token', token);
        } else {
          console.log('✅ Device token saved to Supabase successfully!');
          console.log('   Inserted token data:', data);
          
          // Verify the token was actually saved
          if (data && data[0] && data[0].id) {
            console.log('✅ Database insertion confirmed with ID:', data[0].id);
          } else {
            console.warn('⚠️ Database insertion succeeded but no ID returned');
          }
        }
      }

      // Store token locally as well for backup
      await AsyncStorage.setItem('device_token', token);
      console.log('💾 Device token also stored locally as backup');

    } catch (error) {
      console.error('❌ Unexpected error in saveDeviceToken:', error);
      console.error('   Error stack:', error.stack);
      
      // On any unexpected error, store as pending
      try {
        await AsyncStorage.setItem('pending_device_token', token);
        console.log('💤 Due to error, token stored as pending for later retry');
      } catch (storageError) {
        console.error('❌ Failed to store token as pending:', storageError);
      }
    }
  };

  // Handle pending token when user logs in - ENHANCED VERSION
  handlePendingToken = async () => {
    try {
      console.log('🔄 Processing pending device token...');
      
      const pendingToken = await AsyncStorage.getItem('pending_device_token');
      console.log('📱 Pending token found:', !!pendingToken);
      
      if (pendingToken) {
        console.log('💾 Processing pending token:', pendingToken.substring(0, 20) + '...');
        
        // Verify user is authenticated before processing
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
          console.warn('⚠️ User not authenticated, keeping token as pending');
          return;
        }
        
        console.log('✅ User authenticated, processing pending token for:', user.data.user.id);
        
        // Process the pending token
        await this.saveDeviceToken(pendingToken);
        await AsyncStorage.removeItem('pending_device_token');
        console.log('✅ Pending device token processed successfully');
      } else {
        console.log('ℹ️ No pending device token found');
        
        // If no pending token but user is authenticated, try to re-register
        const user = await supabase.auth.getUser();
        if (user.data.user && this.deviceToken) {
          console.log('🔄 Re-processing current device token for authenticated user');
          await this.saveDeviceToken(this.deviceToken);
        }
      }
    } catch (error) {
      console.error('❌ Error handling pending token:', error);
    }
  };

  // Handle notification tap
  handleNotificationTap = (notification: any) => {
    console.log('👆 User tapped notification:', notification);
    
    // You can navigate to specific screens based on notification data
    if (notification.data) {
      const { type, id, screen } = notification.data;
      
      switch (type) {
        case 'booking_confirmed':
          // Navigate to booking details
          break;
        case 'booking_reminder':
          // Navigate to upcoming bookings
          break;
        case 'new_message':
          // Navigate to messages
          break;
        default:
          // Navigate to home or default screen
          break;
      }
    }
  };

  // Show local notification
  showLocalNotification = (payload: NotificationPayload) => {
    if (!this.isInitialized || !this.PushNotification) {
      console.warn('⚠️ Push notifications not initialized');
      return;
    }

    this.PushNotification.localNotification({
      title: payload.title,
      message: payload.message,
      playSound: true,
      soundName: 'default',
      userInfo: payload.data || {},
      channelId: Platform.OS === 'android' ? 'qwiken-default' : undefined,
    });
  };

  // Send notification via Supabase Edge Function
  sendNotification = async (payload: NotificationPayload & { targetUserId: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: payload.targetUserId,
          title: payload.title,
          message: payload.message,
          data: payload.data || {},
        },
      });

      if (error) {
        console.error('❌ Error sending notification:', error);
        return { success: false, error };
      }

      console.log('✅ Notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error in sendNotification:', error);
      return { success: false, error };
    }
  };

  // Get device token
  getDeviceToken = (): string | null => {
    return this.deviceToken;
  };

  // Clear all notifications
  clearAllNotifications = () => {
    if (!this.PushNotification) return;
    
    this.PushNotification.cancelAllLocalNotifications();
    if (Platform.OS === 'ios' && this.PushNotificationIOS) {
      this.PushNotificationIOS.removeAllDeliveredNotifications();
    }
  };

  // Set badge count (iOS only)
  setBadgeCount = (count: number) => {
    if (Platform.OS === 'ios' && this.PushNotificationIOS) {
      this.PushNotificationIOS.setApplicationIconBadgeNumber(count);
    }
  };

  // Check if push notifications are available
  isAvailable = (): boolean => {
    return this.hasNativeModule && this.isInitialized;
  };

  // Check notification settings
  checkNotificationSettings = async () => {
    if (!this.isInitialized) {
      await this.configure();
    }

    if (Platform.OS === 'ios' && this.PushNotificationIOS) {
      return new Promise((resolve) => {
        try {
          // Try callback-based approach first
          this.PushNotificationIOS.checkPermissions((settings: any) => {
            resolve({
              alert: settings.alert === 1,
              badge: settings.badge === 1,
              sound: settings.sound === 1,
            });
          });
        } catch (callbackError) {
          // Fallback to Promise-based approach
          this.PushNotificationIOS.checkPermissions()
            .then((settings: any) => {
              resolve({
                alert: settings.alert === 1,
                badge: settings.badge === 1,
                sound: settings.sound === 1,
              });
            })
            .catch(() => {
              resolve({
                alert: false,
                badge: false,
                sound: false,
              });
            });
        }
      });
    } else {
      // For Android, we'll assume permissions are granted
      return {
        alert: true,
        badge: true,
        sound: true,
      };
    }
  };

  // Open notification settings
  openNotificationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Debug method to check current token state - FOR DEBUGGING
  debugTokenState = async () => {
    console.log('\n🔍 === DEVICE TOKEN DEBUG STATE ===');
    console.log('📅 Debug timestamp:', new Date().toISOString());
    
    try {
      // Check local storage
      const localToken = await AsyncStorage.getItem('device_token');
      const pendingToken = await AsyncStorage.getItem('pending_device_token');
      
      console.log('💾 Local storage state:');
      console.log('   - device_token:', localToken ? localToken.substring(0, 20) + '...' : 'null');
      console.log('   - pending_device_token:', pendingToken ? pendingToken.substring(0, 20) + '...' : 'null');
      
      // Check service state
      console.log('🔧 Service state:');
      console.log('   - isInitialized:', this.isInitialized);
      console.log('   - hasNativeModule:', this.hasNativeModule);
      console.log('   - deviceToken:', this.deviceToken ? this.deviceToken.substring(0, 20) + '...' : 'null');
      
      // Check authentication
      const session = await supabase.auth.getSession();
      const user = await supabase.auth.getUser();
      
      console.log('🔐 Authentication state:');
      console.log('   - hasSession:', !!session.data.session);
      console.log('   - hasUser:', !!user.data.user);
      console.log('   - userId:', user.data.user?.id);
      console.log('   - userEmail:', user.data.user?.email);
      
      // Check database tokens for current user
      if (user.data.user) {
        const { data: dbTokens, error, count } = await supabase
          .from('device_tokens')
          .select('*', { count: 'exact' })
          .eq('user_id', user.data.user.id);
          
        console.log('🗄️ Database tokens for current user:');
        console.log('   - count:', count || 0);
        console.log('   - error:', error?.message || 'none');
        
        if (dbTokens && dbTokens.length > 0) {
          dbTokens.forEach((token, index) => {
            console.log(`   - token ${index + 1}:`, {
              id: token.id.substring(0, 8) + '...',
              device_type: token.device_type,
              is_active: token.is_active,
              created_at: token.created_at,
              token_preview: token.device_token.substring(0, 20) + '...'
            });
          });
        }
      }
      
      console.log('=== END DEBUG STATE ===\n');
      
      // Return summary for external use
      return {
        localToken: !!localToken,
        pendingToken: !!pendingToken,
        serviceToken: !!this.deviceToken,
        isInitialized: this.isInitialized,
        hasAuth: !!user.data.user,
        dbTokenCount: user.data.user ? (await supabase.from('device_tokens').select('id', { count: 'exact' }).eq('user_id', user.data.user.id)).count || 0 : 0
      };
    } catch (error) {
      console.error('❌ Error in debugTokenState:', error);
      return { error: error.message };
    }
  };

  // Force re-register device token - FOR DEBUGGING
  forceReRegisterToken = async () => {
    console.log('🔄 Force re-registering device token...');
    
    try {
      if (!this.isInitialized) {
        console.log('   🔧 Service not initialized, configuring first...');
        await this.configure();
      }
      
      if (Platform.OS === 'ios' && this.PushNotificationIOS) {
        console.log('   📱 iOS: Forcing remote notification registration...');
        
        // First check current permissions
        const permissions = await this.checkPermissions();
        console.log('   📱 Current permissions:', permissions);
        
        if (permissions.granted) {
          console.log('   ✅ Permissions granted, relying on native AppDelegate for token registration');
          console.log('   📱 Native iOS should automatically generate and forward tokens');
          
          // Give it a moment to register
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if we got a token
          if (this.deviceToken) {
            console.log('   ✅ Token available:', this.deviceToken.substring(0, 20) + '...');
            // Try to save it again
            await this.saveDeviceToken(this.deviceToken);
          } else {
            console.log('   ⚠️ No token received yet, may need to restart app or check native logs');
            console.log('   📱 Check Xcode logs for "Native iOS Device Token Generated"');
          }
        } else {
          console.log('   ⚠️ Permissions not granted, requesting...');
          await this.requestPermissions();
        }
      }
      
      // Also try to process any pending tokens
      console.log('   🔄 Processing any pending tokens...');
      await this.handlePendingToken();
      
      console.log('✅ Force re-registration completed');
    } catch (error) {
      console.error('❌ Error in force re-register:', error);
    }
  };
  
  // Check native iOS token status - FOR DEBUGGING
  checkNativeTokenStatus = () => {
    console.log('📱 Checking native iOS token status...');
    console.log('   - Service initialized:', this.isInitialized);
    console.log('   - Has native module:', this.hasNativeModule);
    console.log('   - Device token in service:', !!this.deviceToken);
    console.log('');
    console.log('📱 If no device token is received:');
    console.log('   1. Check Xcode console logs for "Native iOS Device Token Generated"');
    console.log('   2. Verify iOS app has been rebuilt after AppDelegate changes');
    console.log('   3. Ensure app has push notification permissions');
    console.log('   4. Make sure testing on real device (not simulator)');
  };
}

export default new SafePushNotificationService();