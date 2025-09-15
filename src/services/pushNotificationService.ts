import { Platform, Alert, Linking } from 'react-native';
import PushNotification, { Importance } from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
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

class PushNotificationService {
  private isInitialized = false;
  private deviceToken: string | null = null;

  constructor() {
    // Don't auto-initialize in constructor to avoid immediate native module access
  }

  configure = () => {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing Push Notification Service...');

      // Configure push notifications with error handling
      PushNotification.configure({
      onRegister: async (token) => {
        console.log('📱 Device token received:', token.token);
        this.deviceToken = token.token;
        await this.saveDeviceToken(token.token);
      },

      onNotification: (notification) => {
        console.log('🔔 Notification received:', notification);
        
        // Handle notification tap
        if (notification.userInteraction) {
          this.handleNotificationTap(notification);
        }

        // Required on iOS only
        if (Platform.OS === 'ios') {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },

      onAction: (notification) => {
        console.log('🔔 Notification action:', notification.action);
      },

      onRegistrationError: (err) => {
        console.error('❌ Push notification registration error:', err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'qwiken-default',
            channelName: 'Qwiken Notifications',
            channelDescription: 'Default notification channel for Qwiken app',
            playSound: true,
            soundName: 'default',
            importance: Importance.HIGH,
            vibrate: true,
          },
          (created) => console.log(`🔔 Created channel returned '${created}'`)
        );
      }

      this.isInitialized = true;
      console.log('✅ Push notification service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize push notification service:', error);
      this.isInitialized = false;
    }
  };

  // Request notification permissions
  requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        });
        
        console.log('📱 iOS Permissions:', authStatus);
        return authStatus.alert === 1;
      } else {
        // Android permissions are handled automatically
        return true;
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  };

  // Save device token to Supabase
  saveDeviceToken = async (token: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        console.warn('⚠️ No authenticated user, storing token locally');
        await AsyncStorage.setItem('pending_device_token', token);
        return;
      }

      const deviceTokenData: Omit<DeviceToken, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.data.user.id,
        device_token: token,
        device_type: Platform.OS as 'ios' | 'android',
        app_version: '1.0.0', // You can get this from package.json
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
        const { error } = await supabase
          .from('device_tokens')
          .update({ 
            is_active: true, 
            updated_at: new Date().toISOString(),
            app_version: deviceTokenData.app_version,
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('❌ Error updating device token:', error);
        } else {
          console.log('✅ Device token updated in Supabase');
        }
      } else {
        // Insert new token
        const { error } = await supabase
          .from('device_tokens')
          .insert([deviceTokenData]);

        if (error) {
          console.error('❌ Error saving device token:', error);
        } else {
          console.log('✅ Device token saved to Supabase');
        }
      }

      // Store token locally as well
      await AsyncStorage.setItem('device_token', token);

    } catch (error) {
      console.error('❌ Error in saveDeviceToken:', error);
    }
  };

  // Handle pending token when user logs in
  handlePendingToken = async () => {
    try {
      const pendingToken = await AsyncStorage.getItem('pending_device_token');
      if (pendingToken) {
        await this.saveDeviceToken(pendingToken);
        await AsyncStorage.removeItem('pending_device_token');
        console.log('✅ Pending device token processed');
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
    PushNotification.localNotification({
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
    PushNotification.cancelAllLocalNotifications();
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
    }
  };

  // Set badge count (iOS only)
  setBadgeCount = (count: number) => {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    }
  };

  // Subscribe to notification topics
  subscribeToTopic = async (topic: string) => {
    try {
      // You can implement topic-based notifications using Supabase realtime
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        const { error } = await supabase
          .from('notification_subscriptions')
          .upsert([
            {
              user_id: user.data.user.id,
              topic: topic,
              is_active: true,
              updated_at: new Date().toISOString(),
            }
          ]);

        if (error) {
          console.error('❌ Error subscribing to topic:', error);
        } else {
          console.log(`✅ Subscribed to topic: ${topic}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in subscribeToTopic:', error);
    }
  };

  // Unsubscribe from notification topics
  unsubscribeFromTopic = async (topic: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        const { error } = await supabase
          .from('notification_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.data.user.id)
          .eq('topic', topic);

        if (error) {
          console.error('❌ Error unsubscribing from topic:', error);
        } else {
          console.log(`✅ Unsubscribed from topic: ${topic}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in unsubscribeFromTopic:', error);
    }
  };

  // Check notification settings
  checkNotificationSettings = async () => {
    if (Platform.OS === 'ios') {
      const settings = await PushNotificationIOS.checkPermissions();
      return {
        alert: settings.alert === 1,
        badge: settings.badge === 1,
        sound: settings.sound === 1,
      };
    } else {
      // For Android, we'll assume permissions are granted
      // You might want to use a more specific Android permission check
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
}

export default new PushNotificationService();