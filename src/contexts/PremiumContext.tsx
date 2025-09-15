import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { premiumService, UserSubscription, PremiumFeature } from '../lib/premium/premiumService';
import { supabase } from '../lib/supabase/index';

interface PremiumContextType {
  subscription: UserSubscription | null;
  isPremium: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  canAccessFeature: (feature: PremiumFeature) => boolean;
  formatSubscription: () => ReturnType<typeof premiumService.formatSubscription> | null;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const tokenRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Load subscription data on mount and set up token refresh
  useEffect(() => {
    // Don't await to prevent blocking app startup
    loadSubscription().catch(error => {
      console.error('❌ Initial subscription load failed:', error);
      setIsLoading(false); // Ensure loading is cleared even on error
    });
    
    // Set up periodic token refresh to prevent expiry during real-time subscriptions
    // Refresh token every 45 minutes (tokens typically expire after 1 hour)
    const setupTokenRefresh = () => {
      tokenRefreshInterval.current = setInterval(async () => {
        try {
          console.log('🔄 Periodic token refresh started');
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('❌ Periodic token refresh failed:', error);
          } else {
            console.log('✅ Periodic token refresh successful');
          }
        } catch (error) {
          console.error('❌ Error during periodic token refresh:', error);
        }
      }, 45 * 60 * 1000); // 45 minutes
    };
    
    setupTokenRefresh();
    
    return () => {
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
        tokenRefreshInterval.current = null;
      }
    };
  }, []);

  // Watch for auth state changes to reload subscription
  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 PremiumContext: Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log('🔄 PremiumContext: User signed out, clearing premium state');
          setSubscription(null);
          setIsPremium(false);
          setIsLoading(false); // Important: clear loading immediately
          setCurrentUserId(null);
        } else if (event === 'SIGNED_IN' && session) {
          console.log('🔄 PremiumContext: User signed in, loading subscription');
          // Don't await here to prevent blocking
          loadSubscription().catch(error => {
            console.error('❌ Error loading subscription on sign in:', error);
            setIsLoading(false); // Ensure loading is cleared on error
          });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 PremiumContext: Token refreshed, reloading subscription');
          // Don't await here to prevent blocking
          loadSubscription().catch(error => {
            console.error('❌ Error loading subscription on token refresh:', error);
            setIsLoading(false);
          });
        }
      }
    );

    return () => {
      authSubscription?.unsubscribe();
    };
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = premiumService.subscribeToChanges(async (newSubscription) => {
      console.log('🔄 Premium context updated via real-time');
      console.log('🔄 New subscription data:', newSubscription);
      
      try {
        // Update subscription data
        setSubscription(newSubscription);
        
        // Use the premium service to determine if user has premium access
        // This handles both active and cancelled (but not expired) subscriptions
        const hasPremiumAccess = await premiumService.isPremium(true);
        setIsPremium(hasPremiumAccess);
        
        console.log('🔄 Real-time premium status updated:', {
          subscription_status: newSubscription?.subscription_status,
          is_premium: newSubscription?.is_premium,
          calculated_premium_access: hasPremiumAccess,
          subscription_end_date: newSubscription?.subscription_end_date
        });
        
        console.log('✅ Premium context state fully updated via real-time');
        
      } catch (error) {
        console.error('❌ Error updating premium context via real-time:', error);
      }
    });

    return unsubscribe;
  }, []);

  const loadSubscription = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      setIsLoading(true);
      console.log('📦 Loading subscription in context...');
      
      // Add a safety timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.warn('⏰ PremiumContext: Subscription loading timeout, clearing loading state');
        setIsLoading(false);
        setSubscription(null);
        setIsPremium(false);
      }, 10000); // 10 second timeout
      
      // Get current user to detect user changes
      const { data: { user } } = await supabase.auth.getUser();
      const newUserId = user?.id || null;
      
      // If user changed, reset state
      if (currentUserId && currentUserId !== newUserId) {
        console.log('🔄 User changed, resetting premium context state');
        setSubscription(null);
        setIsPremium(false);
      }
      
      // Update current user ID
      setCurrentUserId(newUserId);
      
      // Only load subscription if user is authenticated
      if (!newUserId) {
        setSubscription(null);
        setIsPremium(false);
        console.log('⚠️ No authenticated user, clearing premium state');
        return;
      }
      
      const sub = await premiumService.getUserSubscription();
      const premium = await premiumService.isPremium();
      
      setSubscription(sub);
      setIsPremium(premium);
      
      console.log('✅ Premium context loaded:', {
        has_subscription: !!sub,
        is_premium: premium,
        status: sub?.subscription_status
      });
    } catch (error) {
      console.error('❌ Error loading subscription in context:', error);
      setSubscription(null);
      setIsPremium(false);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoading(false);
    }
  };

  const refreshSubscription = async () => {
    try {
      console.log('🔄 Manual premium subscription refresh started');
      
      // Clear cache first to ensure fresh data
      premiumService.clearCache();
      
      // Use direct database fetch to bypass any caching issues
      const sub = await premiumService.getSubscriptionDirect();
      console.log('📊 Direct subscription data:', sub);
      
      // Calculate premium status based on direct data
      const premium = sub ? await premiumService.isPremium(true) : false;
      
      setSubscription(sub);
      setIsPremium(premium);
      
      console.log('✅ Premium context manually refreshed:', {
        has_subscription: !!sub,
        is_premium: premium,
        status: sub?.subscription_status,
        subscription_type: sub?.subscription_type,
        subscription_end_date: sub?.subscription_end_date
      });
      
    } catch (error) {
      console.error('❌ Error refreshing subscription:', error);
    }
  };

  const canAccessFeature = (feature: PremiumFeature): boolean => {
    return isPremium;
  };

  const formatSubscription = () => {
    if (!subscription) return null;
    return premiumService.formatSubscription(subscription);
  };

  const value: PremiumContextType = {
    subscription,
    isPremium,
    isLoading,
    refreshSubscription,
    canAccessFeature,
    formatSubscription,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};

// Hook to use premium context
export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

// HOC to protect premium features
export const withPremium = <P extends object>(
  Component: React.ComponentType<P>,
  feature: PremiumFeature,
  fallbackComponent?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { canAccessFeature } = usePremium();
    
    if (canAccessFeature(feature)) {
      return <Component {...props} />;
    }
    
    if (fallbackComponent) {
      const FallbackComponent = fallbackComponent;
      return <FallbackComponent {...props} />;
    }
    
    return null;
  };
};