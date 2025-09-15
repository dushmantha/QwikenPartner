import { supabase } from '../supabase/index';

export interface UserSubscription {
  id: string;
  is_premium: boolean;
  subscription_type: 'monthly' | 'yearly' | null;
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'past_due';
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  stripe_customer_id: string | null;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan_type: string;
  created_at: string;
  subscription_id: string | null;
}

class PremiumService {
  private cachedSubscription: UserSubscription | null = null;
  private cachedUserId: string | null = null; // Track which user the cache belongs to
  private lastFetch: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current user's subscription status
   */
  async getUserSubscription(forceRefresh: boolean = false): Promise<UserSubscription | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError);
        this.clearCache(); // Clear cache if user not authenticated
        return null;
      }

      // Clear cache if it belongs to a different user
      if (this.cachedUserId && this.cachedUserId !== user.id) {
        console.log('🔄 Different user detected, clearing cache');
        this.clearCache();
      }

      // Use cache if available, not expired, and belongs to current user
      if (!forceRefresh && 
          this.cachedSubscription && 
          this.cachedUserId === user.id && 
          (Date.now() - this.lastFetch) < this.CACHE_DURATION) {
        console.log('📦 Using cached subscription data for user:', user.id);
        return this.cachedSubscription;
      }

      console.log('🔄 Fetching fresh subscription data for user:', user.id);

      const { data, error } = await supabase
        .from('users')
        .select('id, is_premium, subscription_type, subscription_status, subscription_start_date, subscription_end_date, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching subscription:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ No user data found');
        return null;
      }

      const subscription: UserSubscription = {
        id: data.id,
        is_premium: data.is_premium || false,
        subscription_type: data.subscription_type,
        subscription_status: data.subscription_status || 'inactive',
        subscription_start_date: data.subscription_start_date,
        subscription_end_date: data.subscription_end_date,
        stripe_customer_id: data.stripe_customer_id,
      };

      // Cache the result with user ID
      this.cachedSubscription = subscription;
      this.cachedUserId = user.id;
      this.lastFetch = Date.now();

      console.log('✅ Subscription data fetched:', {
        is_premium: subscription.is_premium,
        status: subscription.subscription_status,
        type: subscription.subscription_type
      });

      return subscription;
    } catch (error) {
      console.error('❌ Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * Check if user has premium access
   */
  async isPremium(forceRefresh: boolean = false): Promise<boolean> {
    const subscription = await this.getUserSubscription(forceRefresh);
    if (!subscription) return false;

    // Real-time premium access logic for Stripe integration
    const hasValidSubscription = subscription.is_premium && 
      (subscription.subscription_status === 'active' || 
       subscription.subscription_status === 'cancelled' ||
       subscription.subscription_status === 'cancel_at_period_end'); // Allow cancelled subscriptions until period end
    
    if (!hasValidSubscription) {
      console.log('❌ No valid subscription:', {
        is_premium: subscription.is_premium,
        status: subscription.subscription_status
      });
      return false;
    }
    
    // Real-time expiration check for active and cancelled subscriptions
    if (subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      
      if (endDate < now) {
        console.log('⚠️ Subscription expired, real-time update to expired status');
        
        // Real-time update: Mark subscription as expired
        try {
          const { error } = await supabase
            .from('users')
            .update({
              is_premium: false,
              subscription_status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);
            
          if (error) {
            console.error('❌ Failed to update expired subscription:', error);
          } else {
            console.log('✅ Real-time updated expired subscription status');
            this.clearCache(); // Clear cache to force refresh
          }
        } catch (error) {
          console.error('❌ Error updating expired subscription:', error);
        }
        
        return false;
      }
    }

    // Special handling for cancelled subscriptions
    if (subscription.subscription_status === 'cancelled' || subscription.subscription_status === 'cancel_at_period_end') {
      console.log('ℹ️ Cancelled subscription - access until period end:', {
        status: subscription.subscription_status,
        endDate: subscription.subscription_end_date,
        hasAccess: true
      });
    }

    console.log('✅ Premium access confirmed:', {
      status: subscription.subscription_status,
      endDate: subscription.subscription_end_date,
      isPremium: true
    });
    
    return true;
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(): Promise<PaymentHistory[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError);
        return [];
      }

      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, currency, status, plan_type, created_at, subscription_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching payment history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getPaymentHistory:', error);
      return [];
    }
  }

  /**
   * Refresh subscription data from server
   */
  async refreshSubscription(): Promise<UserSubscription | null> {
    console.log('🔄 Force refreshing subscription data');
    this.cachedSubscription = null; // Clear cache
    return this.getUserSubscription(true);
  }

  /**
   * Get subscription directly from database (bypass cache completely)
   */
  async getSubscriptionDirect(): Promise<UserSubscription | null> {
    try {
      console.log('🔄 Getting subscription directly from database');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User not authenticated for direct fetch:', userError);
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, is_premium, subscription_type, subscription_status, subscription_start_date, subscription_end_date, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching direct subscription:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ No direct user data found');
        return null;
      }

      const subscription: UserSubscription = {
        id: data.id,
        is_premium: data.is_premium || false,
        subscription_type: data.subscription_type,
        subscription_status: data.subscription_status || 'inactive',
        subscription_start_date: data.subscription_start_date,
        subscription_end_date: data.subscription_end_date,
        stripe_customer_id: data.stripe_customer_id,
      };

      console.log('✅ Direct subscription data fetched:', {
        is_premium: subscription.is_premium,
        status: subscription.subscription_status,
        type: subscription.subscription_type
      });

      return subscription;
    } catch (error) {
      console.error('❌ Error in direct subscription fetch:', error);
      return null;
    }
  }

  /**
   * Check if user can access a specific premium feature
   */
  async canAccessFeature(feature: PremiumFeature): Promise<boolean> {
    const isPremium = await this.isPremium();
    
    if (!isPremium) {
      console.log(`❌ Feature '${feature}' blocked - user not premium`);
      return false;
    }

    console.log(`✅ Feature '${feature}' allowed - user is premium`);
    return true;
  }

  /**
   * Clear cached subscription data
   */
  clearCache(): void {
    this.cachedSubscription = null;
    this.cachedUserId = null;
    this.lastFetch = 0;
    console.log('🗑️ Premium subscription cache cleared');
  }

  /**
   * Get the currently cached user ID (for detecting user switches)
   */
  getCachedUserId(): string | null {
    return this.cachedUserId;
  }

  /**
   * Subscribe to real-time subscription changes with token refresh handling
   */
  subscribeToChanges(callback: (subscription: UserSubscription | null) => void): () => void {
    let channel: any = null;
    let reconnectionAttempts = 0;
    const maxReconnectionAttempts = 3;
    
    const setupRealTimeSubscription = async () => {
      try {
        // Get fresh user session
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
          console.error('❌ User not authenticated for real-time subscription:', error);
          return;
        }

        console.log('📡 Setting up real-time subscription for user:', data.user.id);
        
        // Clean up existing channel
        if (channel) {
          supabase.removeChannel(channel);
        }
        
        // Create unique channel name to avoid conflicts
        const channelName = `premium-changes-${data.user.id}-${Date.now()}`;
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'users',
              filter: `id=eq.${data.user.id}`,
            },
            async (payload) => {
              console.log('🔄 Subscription updated via real-time:', {
                eventType: payload.eventType,
                table: payload.table,
                schema: payload.schema,
                old: payload.old,
                new: payload.new
              });
              
              // Clear cache to force fresh data
              this.clearCache();
              
              // Add small delay to ensure database consistency
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Fetch fresh subscription data and call callback
              try {
                const freshSubscription = await this.getUserSubscription(true);
                console.log('🔄 Fresh subscription data fetched via real-time:', freshSubscription);
                callback(freshSubscription);
              } catch (error) {
                console.error('❌ Error fetching fresh subscription:', error);
                callback(null);
              }
            }
          )
          .subscribe((status, err) => {
            console.log('📡 Real-time subscription status:', status);
            
            if (err) {
              console.error('❌ Real-time subscription error:', err);
              
              // Check if error is related to token expiry
              if (err.message && err.message.includes('expired')) {
                console.log('🔄 Token expired, attempting to refresh and reconnect...');
                
                // Attempt to refresh token and reconnect
                if (reconnectionAttempts < maxReconnectionAttempts) {
                  reconnectionAttempts++;
                  setTimeout(async () => {
                    try {
                      // Try to refresh session
                      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                      
                      if (refreshError) {
                        console.error('❌ Failed to refresh session:', refreshError);
                      } else {
                        console.log('✅ Session refreshed, reconnecting real-time subscription');
                        setupRealTimeSubscription(); // Reconnect
                      }
                    } catch (refreshError) {
                      console.error('❌ Error during token refresh:', refreshError);
                    }
                  }, 1000 * reconnectionAttempts); // Exponential backoff
                } else {
                  console.error('❌ Max reconnection attempts reached. Real-time subscription disabled.');
                }
              }
            }
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time subscription successfully established');
              reconnectionAttempts = 0; // Reset on successful connection
            }
          });
          
      } catch (error) {
        console.error('❌ Error setting up real-time subscription:', error);
      }
    };

    // Initial setup
    setupRealTimeSubscription();

    return () => {
      console.log('📡 Unsubscribing from premium changes');
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      reconnectionAttempts = 0;
    };
  }

  /**
   * Format subscription for display
   */
  formatSubscription(subscription: UserSubscription): {
    statusText: string;
    statusColor: string;
    planText: string;
    expiryText: string;
  } {
    const statusMap = {
      'active': { text: 'Active', color: '#059669' },
      'inactive': { text: 'Inactive', color: '#6B7280' },
      'cancelled': { text: 'Cancelled', color: '#EF4444' },
      'cancel_at_period_end': { text: 'Cancelling at Period End', color: '#F59E0B' },
      'expired': { text: 'Expired', color: '#F59E0B' },
      'past_due': { text: 'Past Due', color: '#DC2626' },
    };

    const status = statusMap[subscription.subscription_status] || statusMap.inactive;
    
    const planText = subscription.subscription_type 
      ? `${subscription.subscription_type.charAt(0).toUpperCase() + subscription.subscription_type.slice(1)} Plan`
      : 'No Plan';

    let expiryText = '';
    if (subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        expiryText = `${daysLeft} days remaining`;
      } else {
        expiryText = 'Expired';
      }
    }

    return {
      statusText: status.text,
      statusColor: status.color,
      planText,
      expiryText,
    };
  }
}

// Premium features enum
export enum PremiumFeature {
  UNLIMITED_NOTIFICATIONS = 'unlimited_notifications',
  UNLIMITED_CUSTOMERS = 'unlimited_customers',
  INCOME_ANALYTICS = 'income_analytics',
  PREMIUM_INVOICES = 'premium_invoices',
  ADVANCED_REPORTS = 'advanced_reports',
  PRIORITY_SUPPORT = 'priority_support',
  CUSTOM_BRANDING = 'custom_branding',
}

// Export singleton instance
export const premiumService = new PremiumService();

// Export the class for advanced usage
export { PremiumService };