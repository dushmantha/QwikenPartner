import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePremium } from '../contexts/PremiumContext';

interface CancellationBannerProps {
  style?: any;
}

export const CancellationBanner: React.FC<CancellationBannerProps> = ({ style }) => {
  const { subscription } = usePremium();

  // Only show banner if subscription is cancelled
  if (!subscription || subscription.subscription_status !== 'cancelled') {
    return null;
  }

  const formatEndDate = (dateString: string | null) => {
    if (!dateString) return 'period end';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={[styles.banner, style]}>
      <Ionicons name="warning" size={20} color="#FFFFFF" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Subscription Cancelled</Text>
        <Text style={styles.subtitle}>
          Access until {formatEndDate(subscription.subscription_end_date)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
});