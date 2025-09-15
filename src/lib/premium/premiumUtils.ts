// Premium feature utilities
import { stripeService } from '../stripe/stripeService';

// Premium feature types
export type PremiumFeature = 
  | 'unlimited_bookings'
  | 'advanced_analytics'
  | 'priority_support'
  | 'custom_branding'
  | 'team_management'
  | 'api_access'
  | 'unlimited_notifications'
  | 'premium_invoices'
  | 'income_analytics';

// Feature limits for free users
export const FREE_USER_LIMITS = {
  max_bookings_per_month: 10,
  max_notifications: 5,
  max_team_members: 1,
  max_custom_services: 5,
  analytics_history_days: 7,
};

// Premium feature definitions
export const PREMIUM_FEATURES: Record<PremiumFeature, {
  name: string;
  description: string;
  icon: string;
  category: 'core' | 'analytics' | 'support' | 'branding';
}> = {
  unlimited_bookings: {
    name: 'Unlimited Bookings',
    description: 'Accept unlimited booking requests without restrictions',
    icon: 'calendar',
    category: 'core'
  },
  advanced_analytics: {
    name: 'Advanced Analytics',
    description: 'Detailed insights, trends, and financial reports',
    icon: 'analytics',
    category: 'analytics'
  },
  priority_support: {
    name: 'Priority Support',
    description: '24/7 priority customer support and faster response times',
    icon: 'headset',
    category: 'support'
  },
  custom_branding: {
    name: 'Custom Branding',
    description: 'Add your logo and brand colors to invoices and communications',
    icon: 'brush',
    category: 'branding'
  },
  team_management: {
    name: 'Team Management',
    description: 'Add unlimited team members and manage their permissions',
    icon: 'people',
    category: 'core'
  },
  api_access: {
    name: 'API Access',
    description: 'Integrate with third-party tools and build custom integrations',
    icon: 'code-slash',
    category: 'core'
  },
  unlimited_notifications: {
    name: 'Unlimited Notifications',
    description: 'Access all notifications and reminders without limits',
    icon: 'notifications',
    category: 'core'
  },
  premium_invoices: {
    name: 'Premium Invoices',
    description: 'Professional invoices with custom templates and digital signatures',
    icon: 'document-text',
    category: 'branding'
  },
  income_analytics: {
    name: 'Income Analytics',
    description: 'Track earnings, revenue trends, and financial performance',
    icon: 'trending-up',
    category: 'analytics'
  }
};

class PremiumUtils {
  private static instance: PremiumUtils;
  private subscriptionStatus: { isActive: boolean; planType?: string } | null = null;
  private lastCheck: number = 0;
  private checkInterval = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): PremiumUtils {
    if (!PremiumUtils.instance) {
      PremiumUtils.instance = new PremiumUtils();
    }
    return PremiumUtils.instance;
  }

  // Check if user has premium access
  async hasFeatureAccess(feature: PremiumFeature): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus();
      return status.isActive;
    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }

  // Check if user has premium access (synchronous version using cached data)
  hasFeatureAccessSync(feature: PremiumFeature): boolean {
    if (!this.subscriptionStatus) {
      // If we don't have cached status, assume no access
      return false;
    }
    return this.subscriptionStatus.isActive;
  }

  // Get subscription status with caching
  async getSubscriptionStatus(): Promise<{ isActive: boolean; planType?: string }> {
    const now = Date.now();
    
    // Use cached data if it's fresh
    if (this.subscriptionStatus && (now - this.lastCheck) < this.checkInterval) {
      return this.subscriptionStatus;
    }

    try {
      const status = await stripeService.checkSubscriptionStatus();
      this.subscriptionStatus = {
        isActive: status.isActive,
        planType: status.planType
      };
      this.lastCheck = now;
      
      return this.subscriptionStatus;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return { isActive: false };
    }
  }

  // Force refresh subscription status
  async refreshSubscriptionStatus(): Promise<void> {
    this.subscriptionStatus = null;
    this.lastCheck = 0;
    await this.getSubscriptionStatus();
  }

  // Check if user has reached free tier limits
  async checkUsageLimit(feature: keyof typeof FREE_USER_LIMITS, currentUsage: number): Promise<{
    hasAccess: boolean;
    limit?: number;
    isAtLimit: boolean;
  }> {
    const isPremium = await this.hasFeatureAccess(feature as PremiumFeature);
    
    if (isPremium) {
      return {
        hasAccess: true,
        isAtLimit: false
      };
    }

    const limit = FREE_USER_LIMITS[feature];
    return {
      hasAccess: currentUsage < limit,
      limit,
      isAtLimit: currentUsage >= limit
    };
  }

  // Get features available for current plan
  async getAvailableFeatures(): Promise<PremiumFeature[]> {
    const status = await this.getSubscriptionStatus();
    
    if (status.isActive) {
      return Object.keys(PREMIUM_FEATURES) as PremiumFeature[];
    }
    
    // Free users get no premium features
    return [];
  }

  // Get feature info
  getFeatureInfo(feature: PremiumFeature) {
    return PREMIUM_FEATURES[feature];
  }

  // Clear cached subscription status (for logout)
  clearCache(): void {
    this.subscriptionStatus = null;
    this.lastCheck = 0;
  }
}

// Singleton instance
export const premiumUtils = PremiumUtils.getInstance();

// Convenience functions
export const hasFeatureAccess = (feature: PremiumFeature) => 
  premiumUtils.hasFeatureAccess(feature);

export const hasFeatureAccessSync = (feature: PremiumFeature) => 
  premiumUtils.hasFeatureAccessSync(feature);

export const checkUsageLimit = (feature: keyof typeof FREE_USER_LIMITS, currentUsage: number) =>
  premiumUtils.checkUsageLimit(feature, currentUsage);

export const refreshPremiumStatus = () => 
  premiumUtils.refreshSubscriptionStatus();

export const clearPremiumCache = () => 
  premiumUtils.clearCache();

// Hook-like function for React components
export const usePremiumStatus = () => {
  return {
    hasFeatureAccess,
    hasFeatureAccessSync,
    checkUsageLimit,
    refreshPremiumStatus,
    getAvailableFeatures: () => premiumUtils.getAvailableFeatures(),
    getFeatureInfo: (feature: PremiumFeature) => premiumUtils.getFeatureInfo(feature),
  };
};