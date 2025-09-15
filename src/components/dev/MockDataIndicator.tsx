import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DEV_CONFIG } from '../../config/devConfig';

interface MockDataIndicatorProps {
  context?: string;
  visible?: boolean;
  onPress?: () => void;
}

export const MockDataIndicator: React.FC<MockDataIndicatorProps> = ({ 
  context = 'Mock Data', 
  visible = true,
  onPress 
}) => {
  // Don't show if mock data is disabled or indicators are turned off
  if (!DEV_CONFIG.USE_MOCK_DATA || !DEV_CONFIG.SHOW_DEV_INDICATORS || !visible) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={styles.indicator} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Ionicons name="flask-outline" size={12} color="#FF6B6B" />
        <Text style={styles.text}>{context}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Banner version for full-width display
export const MockDataBanner: React.FC<{ context?: string }> = ({ context = 'Development Mode' }) => {
  if (!DEV_CONFIG.USE_MOCK_DATA || !DEV_CONFIG.SHOW_DEV_INDICATORS) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="flask" size={16} color="#FFFFFF" />
      <Text style={styles.bannerText}>
        🎭 {context} - Using Mock Data
      </Text>
      <Ionicons name="code-working" size={16} color="#FFFFFF" />
    </View>
  );
};

// Floating overlay indicator
export const MockDataOverlay: React.FC<{ context?: string }> = ({ context = 'MOCK' }) => {
  if (!DEV_CONFIG.USE_MOCK_DATA || !DEV_CONFIG.SHOW_DEV_INDICATORS) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Text style={styles.overlayText}>{context}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  banner: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1000,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});