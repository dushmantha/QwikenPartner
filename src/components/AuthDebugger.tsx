import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth, useAccount } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthDebugger = () => {
  const { user, session, isAuthenticated, isLoading: authLoading, signOut, forceCheckSession } = useAuth();
  const { accountType, isLoading: accountLoading } = useAccount();

  const clearAllStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('✅ All AsyncStorage cleared');
      alert('All storage cleared! Restart the app.');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const debugInfo = {
    'Auth State': isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated',
    'User Email': user?.email || 'None',
    'User ID': user?.id ? user.id.substring(0, 8) + '...' : 'None',
    'Session': session ? '✅ Active' : '❌ None',
    'Auth Loading': authLoading ? '⏳ Yes' : '✅ No',
    'Account Type': accountType,
    'Account Loading': accountLoading ? '⏳ Yes' : '✅ No',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Auth Debug Info</Text>
      {Object.entries(debugInfo).map(([key, value]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{key}:</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={forceCheckSession}>
          <Text style={styles.buttonText}>Force Check</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearAllStorage}>
          <Text style={styles.buttonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: '600',
    marginRight: 10,
    minWidth: 120,
  },
  value: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  button: {
    backgroundColor: '#1A2533',
    padding: 8,
    borderRadius: 4,
    flex: 1,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
  },
});