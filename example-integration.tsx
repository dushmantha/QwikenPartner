/**
 * Example: How to add PushNotificationTest to your screen
 * 
 * Option 1: Add to Settings/Profile screen
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal } from 'react-native';
import PushNotificationTest from '../components/PushNotificationTest';

const SettingsScreen = () => {
  const [showPushTest, setShowPushTest] = useState(false);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Your existing settings UI */}
      
      {/* Add this button temporarily for testing */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: '#FF6B6B', 
          padding: 15, 
          borderRadius: 8, 
          marginTop: 20 
        }}
        onPress={() => setShowPushTest(true)}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          🧪 Test Push Notifications
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPushTest}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PushNotificationTest onClose={() => setShowPushTest(false)} />
      </Modal>
    </View>
  );
};

/**
 * Option 2: Add directly to any screen during development
 */

import React from 'react';
import { View } from 'react-native';
import PushNotificationTest from '../components/PushNotificationTest';

const AnyScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      {/* Your existing UI */}
      
      {/* Add this temporarily for testing - remove in production */}
      {__DEV__ && <PushNotificationTest />}
    </View>
  );
};

/**
 * Test Steps:
 * 
 * 1. Add the component to any screen
 * 2. Run the app on a physical device
 * 3. Log in to your app
 * 4. Tap "Check Device Token" - should show a token
 * 5. Tap "Send Remote Notification" - should receive notification
 * 6. Tap "Show Local Notification" - should show local notification
 * 7. Check "Notification Settings" - verify permissions
 * 
 * If any step fails, check the setup instructions in PUSH_NOTIFICATION_SETUP.md
 */