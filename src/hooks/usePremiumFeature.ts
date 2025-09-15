import { useEffect, useState } from 'react';
import { usePremium } from '../contexts/PremiumContext';
import { PremiumFeature } from '../lib/premium/premiumService';

/**
 * Hook to check if user can access a specific premium feature
 */
export const usePremiumFeature = (feature: PremiumFeature) => {
  const { isPremium, canAccessFeature, isLoading } = usePremium();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    setHasAccess(canAccessFeature(feature));
  }, [isPremium, feature, canAccessFeature]);

  return {
    hasAccess,
    isPremium,
    isLoading,
    canAccess: hasAccess,
  };
};

/**
 * Hook to get premium gate configuration for a feature
 */
export const usePremiumGate = (feature: PremiumFeature) => {
  const { hasAccess, isPremium, isLoading } = usePremiumFeature(feature);

  const getGateConfig = () => {
    if (isLoading) {
      return {
        shouldShow: false,
        showLoading: true,
        message: 'Loading...',
      };
    }

    if (hasAccess) {
      return {
        shouldShow: true,
        showLoading: false,
        message: null,
      };
    }

    // Feature blocked - show upgrade message
    const featureMessages = {
      [PremiumFeature.UNLIMITED_NOTIFICATIONS]: {
        title: 'Unlimited Notifications',
        message: 'View all your notifications without limits',
      },
      [PremiumFeature.UNLIMITED_CUSTOMERS]: {
        title: 'Unlimited Customers',
        message: 'Manage unlimited customer requests',
      },
      [PremiumFeature.INCOME_ANALYTICS]: {
        title: 'Income Analytics',
        message: 'Access detailed income reports and analytics',
      },
      [PremiumFeature.PREMIUM_INVOICES]: {
        title: 'Premium Invoices',
        message: 'Create professional branded invoices',
      },
      [PremiumFeature.ADVANCED_REPORTS]: {
        title: 'Advanced Reports',
        message: 'Generate comprehensive business reports',
      },
      [PremiumFeature.PRIORITY_SUPPORT]: {
        title: 'Priority Support',
        message: 'Get priority customer support',
      },
      [PremiumFeature.CUSTOM_BRANDING]: {
        title: 'Custom Branding',
        message: 'Add your custom branding to invoices and reports',
      },
    };

    const featureConfig = featureMessages[feature] || {
      title: 'Premium Feature',
      message: 'This feature requires a premium subscription',
    };

    return {
      shouldShow: false,
      showLoading: false,
      message: `${featureConfig.title}: ${featureConfig.message}`,
      title: featureConfig.title,
      description: featureConfig.message,
    };
  };

  return {
    hasAccess,
    isPremium,
    isLoading,
    gateConfig: getGateConfig(),
  };
};

/**
 * Hook to track premium feature usage (for analytics)
 */
export const usePremiumFeatureTracking = (feature: PremiumFeature) => {
  const { hasAccess } = usePremiumFeature(feature);

  const trackFeatureAttempt = () => {
    console.log(`📊 Feature attempt: ${feature}, hasAccess: ${hasAccess}`);
    
    // Here you could send analytics to your preferred service
    // analytics.track('premium_feature_attempt', {
    //   feature,
    //   hasAccess,
    //   timestamp: new Date().toISOString(),
    // });
  };

  const trackFeatureUsage = () => {
    if (hasAccess) {
      console.log(`📊 Feature used: ${feature}`);
      
      // Track successful feature usage
      // analytics.track('premium_feature_used', {
      //   feature,
      //   timestamp: new Date().toISOString(),
      // });
    }
  };

  return {
    hasAccess,
    trackFeatureAttempt,
    trackFeatureUsage,
  };
};