import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import pushService from '../services/safePushNotificationService';
import { supabase } from '../lib/supabase';

const DebugPushTokenScreen: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkCurrentState();
  }, []);

  const checkCurrentState = async () => {
    setLoading(true);
    try {
      console.log('🔍 Checking push notification state...');
      const state = await pushService.debugTokenState();
      setDebugInfo(state);
    } catch (error) {
      console.error('Error checking state:', error);
    }
    setLoading(false);
  };

  const requestPermissions = async () => {
    setLoading(true);
    try {
      console.log('📱 Requesting permissions...');
      const granted = await pushService.requestPermissions();
      Alert.alert('Permissions', granted ? 'Granted' : 'Denied');
      await checkCurrentState();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    }
    setLoading(false);
  };

  const forceRegister = async () => {
    setLoading(true);
    try {
      console.log('🔄 Force registering...');
      await pushService.forceReRegisterToken();
      Alert.alert('Success', 'Force registration completed');
      await checkCurrentState();
    } catch (error) {
      console.error('Error force registering:', error);
      Alert.alert('Error', 'Failed to force register');
    }
    setLoading(false);
  };

  const manualRegisterIOS = () => {
    console.log('📱 Manual iOS registration...');
    pushService.manuallyRegisterIOS();
    Alert.alert('iOS Registration', 'Called registerForRemoteNotifications - check logs');
    setTimeout(() => checkCurrentState(), 3000);
  };

  const processPendingTokens = async () => {
    setLoading(true);
    try {
      console.log('🔄 Processing pending tokens...');
      await pushService.handlePendingToken();
      Alert.alert('Success', 'Processed pending tokens');
      await checkCurrentState();
    } catch (error) {
      console.error('Error processing pending:', error);
      Alert.alert('Error', 'Failed to process pending tokens');
    }
    setLoading(false);
  };

  const checkSupabaseAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      Alert.alert(
        'Supabase Auth',
        `User: ${user ? user.email : 'Not authenticated'}\n` +
        `Session: ${session ? 'Active' : 'No session'}\n` +
        `User ID: ${user?.id || 'N/A'}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to check auth');
    }
  };

  const reinitializeService = async () => {
    setLoading(true);
    try {
      console.log('🔧 Reinitializing service...');
      await pushService.configure();
      Alert.alert('Success', 'Service reinitialized');
      await checkCurrentState();
    } catch (error) {
      console.error('Error reinitializing:', error);
      Alert.alert('Error', 'Failed to reinitialize');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Push Token Debugger</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current State:</Text>
        <Text style={styles.info}>Local Token: {debugInfo.localToken ? '✅' : '❌'}</Text>
        <Text style={styles.info}>Pending Token: {debugInfo.pendingToken ? '✅' : '❌'}</Text>
        <Text style={styles.info}>Service Token: {debugInfo.serviceToken ? '✅' : '❌'}</Text>
        <Text style={styles.info}>Initialized: {debugInfo.isInitialized ? '✅' : '❌'}</Text>
        <Text style={styles.info}>Authenticated: {debugInfo.hasAuth ? '✅' : '❌'}</Text>
        <Text style={styles.info}>DB Tokens: {debugInfo.dbTokenCount || 0}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={checkCurrentState}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔄 Refresh State</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={requestPermissions}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📱 Request Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={forceRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔄 Force Register Token</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={manualRegisterIOS}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📱 Manual iOS Register</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={processPendingTokens}
          disabled={loading}
        >
          <Text style={styles.buttonText}>💾 Process Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={checkSupabaseAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔐 Check Auth</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={reinitializeService}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🔧 Reinitialize Service</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Instructions:</Text>
        <Text style={styles.instruction}>1. Check current state with "Refresh State"</Text>
        <Text style={styles.instruction}>2. If no permissions, tap "Request Permissions"</Text>
        <Text style={styles.instruction}>3. If no token, tap "Force Register Token"</Text>
        <Text style={styles.instruction}>4. For iOS, try "Manual iOS Register"</Text>
        <Text style={styles.instruction}>5. Check console logs for detailed info</Text>
        <Text style={styles.instruction}>6. If token in pending, tap "Process Pending"</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginVertical: 2,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instruction: {
    fontSize: 12,
    marginVertical: 2,
    color: '#666',
  },
});

export default DebugPushTokenScreen;