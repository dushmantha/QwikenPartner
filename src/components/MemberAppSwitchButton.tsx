import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount, useAuth } from '../navigation/AppNavigator';
import AppSwitcher from '../utils/AppSwitcher';

interface MemberAppSwitchButtonProps {
  style?: any;
  position?: 'bottom-right' | 'bottom-center' | 'top-right';
}

const MemberAppSwitchButton: React.FC<MemberAppSwitchButtonProps> = ({ 
  style, 
  position = 'bottom-right' 
}) => {
  const { user } = useAuth();
  const { profile } = useAccount();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  console.log('MemberAppSwitchButton: Rendering component, isVisible:', isVisible);

  useEffect(() => {
    // Check if member app is installed
    const checkMemberAppAvailability = async () => {
      try {
        const appSwitcher = AppSwitcher.getInstance();
        const isInstalled = await appSwitcher.isMemberAppInstalled();
        console.log('MemberAppSwitchButton: Member app installed:', isInstalled);
        setIsVisible(true); // Always show for testing
      } catch (error) {
        console.error('Error checking member app availability:', error);
        setIsVisible(true); // Always show for testing
      }
    };

    checkMemberAppAvailability();
  }, []);

  const handlePress = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      const userEmail = profile?.email || user?.email;
      const userId = profile?.id || user?.id;
      
      if (!userEmail || !userId) {
        Alert.alert(
          'Missing Information', 
          'User information is required to switch to the member app.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const appSwitcher = AppSwitcher.getInstance();
      await appSwitcher.switchToMemberApp({
        userEmail,
        userId,
        autoSwitch: true
      });
      
    } catch (error) {
      console.error('Error switching to member app:', error);
      Alert.alert(
        'Switch Failed',
        'Unable to switch to the member app. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  const positionStyles = {
    'bottom-right': styles.bottomRight,
    'bottom-center': styles.bottomCenter,
    'top-right': styles.topRight,
  };

  return (
    <TouchableOpacity
      style={[styles.container, positionStyles[position], style]}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      <View style={[styles.button, isLoading && styles.buttonLoading]}>
        <Ionicons 
          name="swap-horizontal-outline" 
          size={20} 
          color="#FFFFFF" 
        />
        <Text style={styles.buttonText}>
          {isLoading ? 'Switching...' : 'Member App'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    elevation: 1000,
  },
  bottomRight: {
    bottom: 90,
    right: 20,
  },
  bottomCenter: {
    bottom: 90,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -75, // Half the button width to center
  },
  topRight: {
    top: 60,
    right: 20,
  },
  button: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 140,
  },
  buttonLoading: {
    backgroundColor: '#666666',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MemberAppSwitchButton;