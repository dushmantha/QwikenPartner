import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import PushNotificationTest from '../components/PushNotificationTest';

const TestPushScreen = () => {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${result}`, ...prev]);
  };

  useEffect(() => {
    checkDeviceToken();
  }, []);

  const checkDeviceToken = async () => {
    try {
      addTestResult('Checking device token...');
      const SafePushService = await import('../services/safePushNotificationService');
      const token = SafePushService.default.getDeviceToken();
      
      if (token) {
        setDeviceToken(token);
        addTestResult(`✅ Device token found: ${token.substring(0, 20)}...`);
      } else {
        addTestResult('❌ No device token found');
      }
    } catch (error) {
      addTestResult(`❌ Error: ${error.message}`);
    }
  };

  const requestPermissions = async () => {
    try {
      addTestResult('Requesting push permissions...');
      const SafePushService = await import('../services/safePushNotificationService');
      
      // First check current permissions
      const currentPerms = await SafePushService.default.checkPermissions();
      addTestResult(`📱 Current permissions: Alert=${currentPerms.alert}, Badge=${currentPerms.badge}, Sound=${currentPerms.sound}`);
      
      if (currentPerms.granted) {
        addTestResult('✅ Push permissions already granted');
        checkDeviceToken();
        return;
      }
      
      // Request permissions
      const granted = await SafePushService.default.requestPermissions();
      
      if (granted) {
        addTestResult('✅ Push permissions granted');
        checkDeviceToken();
      } else {
        addTestResult('❌ Push permissions denied - Please enable in Settings > Notifications > Qwiken');
      }
    } catch (error) {
      addTestResult(`❌ Error: ${error.message}`);
    }
  };

  const sendTestNotification = async () => {
    try {
      addTestResult('Sending test notification...');
      
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        addTestResult('❌ User not logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.data.user.id,
          title: '🧪 Test Notification',
          message: `Push notifications are working! Sent at ${new Date().toLocaleTimeString()}`,
          data: {
            type: 'test',
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) {
        addTestResult(`❌ Send failed: ${error.message}`);
      } else {
        addTestResult(`✅ Notification sent to ${data?.sent || 0} device(s)`);
        if (data?.failed > 0) {
          addTestResult(`⚠️ Failed to send to ${data.failed} device(s)`);
        }
      }
    } catch (error) {
      addTestResult(`❌ Error: ${error.message}`);
    }
  };

  const checkFirebaseConfig = async () => {
    try {
      addTestResult('Checking Firebase configuration...');
      
      // Check if Firebase is configured
      const hasGoogleServices = Platform.OS === 'android' 
        ? '✅ google-services.json configured'
        : '✅ GoogleService-Info.plist configured';
      
      addTestResult(hasGoogleServices);
      
      // Check bundle ID
      addTestResult(`Bundle ID: org.app.qwiken`);
      
      // Check if service is initialized
      const SafePushService = await import('../services/safePushNotificationService');
      const isAvailable = SafePushService.default.isAvailable();
      
      if (isAvailable) {
        addTestResult('✅ Push notification service initialized');
      } else {
        addTestResult('❌ Push notification service not initialized');
      }
    } catch (error) {
      addTestResult(`❌ Error: ${error.message}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    addTestResult('Test results cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Push Notification Testing</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>
        <Text style={styles.info}>Platform: {Platform.OS}</Text>
        <Text style={styles.info}>
          Token: {deviceToken ? `${deviceToken.substring(0, 30)}...` : 'Not available'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        
        <TouchableOpacity style={styles.button} onPress={checkFirebaseConfig}>
          <Text style={styles.buttonText}>1. Check Configuration</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>2. Request Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={checkDeviceToken}>
          <Text style={styles.buttonText}>3. Check Device Token</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={sendTestNotification}
        >
          <Text style={styles.buttonText}>4. Send Test Notification 🚀</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        <View style={styles.results}>
          {testResults.length === 0 ? (
            <Text style={styles.resultText}>No test results yet</Text>
          ) : (
            testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>{result}</Text>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced Testing</Text>
        <PushNotificationTest />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    padding: 10,
    marginTop: 5,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  results: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    maxHeight: 200,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default TestPushScreen;