import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface PushNotificationTestProps {
  onClose?: () => void;
}

const PushNotificationTest: React.FC<PushNotificationTestProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  const checkDeviceToken = async () => {
    try {
      const SafePushService = await import('../services/safePushNotificationService');
      const token = SafePushService.default.getDeviceToken();
      setDeviceToken(token);
      
      if (token) {
        Alert.alert('Device Token', `Token registered: ${token.substring(0, 50)}...`);
      } else {
        Alert.alert('No Token', 'Device token not found. Try restarting the app.');
      }
    } catch (error) {
      console.error('Error checking device token:', error);
      Alert.alert('Error', 'Failed to check device token');
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.data.user.id,
          title: 'Test Notification 🧪',
          message: 'Push notifications are working correctly!',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Push notification error:', error);
        Alert.alert('Error', `Failed to send: ${error.message}`);
      } else {
        console.log('Push notification sent:', data);
        Alert.alert('Success! 🎉', `Notification sent to ${data.sent} device(s)`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const showLocalNotification = async () => {
    try {
      const SafePushService = await import('../services/safePushNotificationService');
      SafePushService.default.showLocalNotification({
        title: 'Local Test Notification',
        message: 'This is a local notification test!',
        data: { type: 'local_test' }
      });
      Alert.alert('Local Notification', 'Local notification sent!');
    } catch (error) {
      console.error('Error showing local notification:', error);
      Alert.alert('Error', 'Failed to show local notification');
    }
  };

  const checkNotificationSettings = async () => {
    try {
      const SafePushService = await import('../services/safePushNotificationService');
      const settings = await SafePushService.default.checkNotificationSettings();
      Alert.alert(
        'Notification Settings',
        `Alert: ${settings.alert ? 'Enabled' : 'Disabled'}\n` +
        `Badge: ${settings.badge ? 'Enabled' : 'Disabled'}\n` +
        `Sound: ${settings.sound ? 'Enabled' : 'Disabled'}`
      );
    } catch (error) {
      console.error('Error checking settings:', error);
      Alert.alert('Error', 'Failed to check notification settings');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Push Notification Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkDeviceToken}>
        <Text style={styles.buttonText}>Check Device Token</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]} 
        onPress={sendTestNotification}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Sending...' : 'Send Remote Notification'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={showLocalNotification}>
        <Text style={styles.buttonText}>Show Local Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={checkNotificationSettings}>
        <Text style={styles.buttonText}>Check Notification Settings</Text>
      </TouchableOpacity>

      {deviceToken && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Device Token:</Text>
          <Text style={styles.tokenText}>{deviceToken.substring(0, 100)}...</Text>
        </View>
      )}

      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default PushNotificationTest;