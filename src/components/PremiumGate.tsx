import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePremiumGate } from '../hooks/usePremiumFeature';
import { PremiumFeature } from '../lib/premium/premiumService';

interface PremiumGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  onUpgradePress?: () => void;
  fallback?: React.ReactNode;
  style?: any;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  children,
  onUpgradePress,
  fallback,
  style,
}) => {
  const { hasAccess, isLoading, gateConfig } = usePremiumGate(feature);

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#1A2533" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show content if user has access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show premium gate
  return (
    <View style={[styles.container, styles.gateContainer, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name="star" size={24} color="#1A2533" />
      </View>
      
      <Text style={styles.title}>{gateConfig.title}</Text>
      <Text style={styles.description}>{gateConfig.description}</Text>
      
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={onUpgradePress}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
        <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1A2533',
  },
  gateContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#FED7AA',
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2533',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PremiumGate;