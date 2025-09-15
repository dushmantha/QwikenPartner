import { supabase } from '../supabase/index';

// Stripe configuration
// Use environment variable or fallback to production/test based on __DEV__
const isDevelopment = __DEV__ || false;

export const STRIPE_CONFIG = {
  // Environment-based key selection
  publishableKey: isDevelopment 
    ? 'pk_test_51Rr8rKD6UvyggcLYQsRsvjbCSqSDrZL8rzZhTPnvn6NFFPpDedxOzuEztNU4l96BpwovZByCpudDDJQfPvDsQVjX00FsdQdU0m' // Test/Sandbox key for development
    : 'pk_live_51Rr8puDAzqAtmMB5EBfPdqjqEKdpyOgAWYXvOP5KXc9Op4bvb3O4vzaJttjQE0qEBbZiycvZIiLHZPnqkzAhcQAZ00H0A2NrlF', // Live/Production key for release
  isTestMode: isDevelopment,
};

// Pricing plans (in NZD)
export const PRICING_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Pro',
    price: 14.99,  // Adjusted for NZD
    currency: 'nzd',
    interval: 'month',
    features: [
      'Unlimited Customer Requests',
      'Income Analytics & Reports',
      'Premium Invoices',
      'Unlimited Notifications'
    ]
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Pro',
    price: 149.99,  // Adjusted for NZD
    currency: 'nzd',
    interval: 'year',
    features: [
      'Unlimited Customer Requests',
      'Income Analytics & Reports',
      'Premium Invoices',
      'Unlimited Notifications',
      'Save 17% (2 months free)'
    ]
  }
};

export interface PaymentSession {
  sessionId: string;
  url: string;
  customerId?: string;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  planType: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

class StripeService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${supabase.supabaseUrl}/functions/v1`;
  }

  // Create payment session for subscription
  async createPaymentSession(planType: 'monthly' | 'yearly'): Promise<PaymentSession> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated');
      }

      const plan = PRICING_PLANS[planType];
      
      const response = await fetch(`${this.baseUrl}/stripe-create-payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-test-mode': isDevelopment ? 'true' : 'false',
        },
        body: JSON.stringify({
          planType,
          planId: plan.id,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment session creation failed: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating payment session:', error);
      throw error;
    }
  }

  // Get user's current subscription
  async getSubscription(): Promise<SubscriptionInfo | null> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/stripe-get-subscription`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-test-mode': isDevelopment ? 'true' : 'false',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No subscription found
        }
        const errorText = await response.text();
        throw new Error(`Failed to get subscription: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(): Promise<void> {
    try {
      console.log('🔐 Getting auth session for cancel subscription...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        console.error('❌ No access token found');
        throw new Error('User not authenticated - no access token');
      }

      console.log('✅ Auth session obtained');
      console.log('📡 Calling Edge Function:', `${this.baseUrl}/stripe-cancel-subscription`);

      const response = await fetch(`${this.baseUrl}/stripe-cancel-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-test-mode': isDevelopment ? 'true' : 'false',
        },
        body: JSON.stringify({}), // Send empty body to ensure proper request
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge Function error:', errorText);
        console.error('❌ Full response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        // Parse error if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || `Failed to cancel subscription: ${errorText}`);
        } catch {
          throw new Error(`Failed to cancel subscription: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Subscription cancelled successfully:', data);
    } catch (error: any) {
      console.error('❌ Error canceling subscription:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Reactivate a cancelled subscription
  async reactivateSubscription(): Promise<void> {
    try {
      console.log('🔐 Getting auth session for reactivate subscription...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        console.error('❌ No access token found');
        throw new Error('User not authenticated - no access token');
      }

      console.log('✅ Auth session obtained');
      console.log('📡 Calling Edge Function:', `${this.baseUrl}/stripe-reactivate-subscription`);

      const response = await fetch(`${this.baseUrl}/stripe-reactivate-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-test-mode': isDevelopment ? 'true' : 'false',
        },
        body: JSON.stringify({}), // Send empty body to ensure proper request
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge Function error:', errorText);
        console.error('❌ Full response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        // Parse error if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || `Failed to reactivate subscription: ${errorText}`);
        } catch {
          throw new Error(`Failed to reactivate subscription: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Subscription reactivated successfully:', data);
    } catch (error: any) {
      console.error('❌ Error reactivating subscription:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Update subscription plan (e.g., monthly to yearly)
  async updateSubscriptionPlan(newPlanType: 'monthly' | 'yearly'): Promise<{
    success: boolean;
    subscription?: {
      id: string;
      status: string;
      current_period_end: number;
      plan_type: string;
    };
  }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/stripe-update-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-test-mode': isDevelopment ? 'true' : 'false',
        },
        body: JSON.stringify({ newPlanType }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update subscription: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  // Get checkout URL for in-app WebView
  getCheckoutUrl(paymentSession: PaymentSession): string {
    return paymentSession.url;
  }

  // Check payment status
  async checkPaymentStatus(sessionId: string): Promise<{ success: boolean; subscriptionId?: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/stripe-check-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-test-mode': isDevelopment ? 'true' : 'false',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to check payment status: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();