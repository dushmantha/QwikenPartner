import { supabase } from '../../../lib/supabase/normalized';

export interface ResponseTimeStats {
  avg_response_time_minutes: number;
  response_rate: number;
  min_response_time: number;
  max_response_time: number;
  total_bookings: number;
  responded_bookings: number;
  avg_business_hours_response: number;
  excellent_responses: number;
  good_responses: number;
  fair_responses: number;
  poor_responses: number;
}

export interface ResponseTimeCategory {
  label: string;
  color: string;
  icon: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

class ResponseTimeAPI {

  /**
   * Get response time statistics for a provider
   */
  async getProviderResponseStats(providerId: string): Promise<ApiResponse<ResponseTimeStats>> {
    try {
      console.log('⏱️ Fetching response time stats for provider:', providerId);

      const { data, error } = await supabase
        .rpc('calculate_response_time_stats', { p_provider_id: providerId });

      if (error) {
        console.error('❌ Error fetching response time stats:', error);
        
        // If function doesn't exist, return default stats
        if (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.log('⚠️ Response time tracking not yet deployed, returning default stats');
          const defaultStats = {
            avg_response_time_minutes: 0,
            response_rate: 0,
            min_response_time: 0,
            max_response_time: 0,
            total_bookings: 0,
            responded_bookings: 0,
            avg_business_hours_response: 0,
            excellent_responses: 0,
            good_responses: 0,
            fair_responses: 0,
            poor_responses: 0
          };
          
          return {
            data: defaultStats,
            error: null,
            success: true
          };
        }
        
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      const stats = data?.[0] || {
        avg_response_time_minutes: 0,
        response_rate: 0,
        min_response_time: 0,
        max_response_time: 0,
        total_bookings: 0,
        responded_bookings: 0,
        avg_business_hours_response: 0,
        excellent_responses: 0,
        good_responses: 0,
        fair_responses: 0,
        poor_responses: 0
      };

      console.log('✅ Response time stats:', stats);
      return {
        data: stats,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Response time stats API error:', error);
      
      // Return default stats as fallback
      const defaultStats = {
        avg_response_time_minutes: 0,
        response_rate: 0,
        min_response_time: 0,
        max_response_time: 0,
        total_bookings: 0,
        responded_bookings: 0,
        avg_business_hours_response: 0,
        excellent_responses: 0,
        good_responses: 0,
        fair_responses: 0,
        poor_responses: 0
      };
      
      return {
        data: defaultStats,
        error: null,
        success: true
      };
    }
  }

  /**
   * Get response time analytics for all provider businesses
   */
  async getAllProvidersResponseAnalytics(providerId: string): Promise<ApiResponse<Array<{
    provider_business_id: string;
    business_name: string;
    total_bookings_30d: number;
    responded_bookings: number;
    avg_response_minutes: number;
    response_rate_percent: number;
    fastest_response_minutes: number;
    slowest_response_minutes: number;
    excellent_responses: number;
    good_responses: number;
    fair_responses: number;
    poor_responses: number;
  }>>> {
    try {
      console.log('📊 Fetching response analytics for all businesses of provider:', providerId);

      const { data, error } = await supabase
        .from('provider_response_analytics')
        .select('*')
        .eq('provider_id', providerId)
        .order('avg_response_minutes', { ascending: true, nullsLast: true });

      if (error) {
        console.error('❌ Error fetching response analytics:', error);
        
        // If view doesn't exist, return empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('⚠️ Response analytics view not yet deployed, returning empty data');
          return {
            data: [],
            error: null,
            success: true
          };
        }
        
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      console.log('✅ Response analytics data:', data);
      return {
        data: data || [],
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Response analytics API error:', error);
      return {
        data: [],
        error: null,
        success: true
      };
    }
  }

  /**
   * Get pending bookings that need response (for notifications)
   */
  async getPendingBookings(providerId: string, hoursThreshold: number = 2): Promise<ApiResponse<Array<{
    id: string;
    customer_name: string;
    service_name: string;
    requested_at: string;
    hours_pending: number;
    provider_business_name: string;
  }>>> {
    try {
      console.log('⏰ Fetching pending bookings for provider:', providerId);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          service_name,
          requested_at,
          created_at,
          provider_businesses!inner(name, provider_id)
        `)
        .eq('provider_businesses.provider_id', providerId)
        .eq('status', 'pending')
        .lt('requested_at', new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString())
        .order('requested_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching pending bookings:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      const enrichedData = data?.map(booking => ({
        id: booking.id,
        customer_name: 'Customer', // You might want to join with customer data
        service_name: booking.service_name || 'Service',
        requested_at: booking.requested_at || booking.created_at,
        hours_pending: Math.round((Date.now() - new Date(booking.requested_at || booking.created_at).getTime()) / (1000 * 60 * 60)),
        provider_business_name: booking.provider_businesses?.name || 'Business'
      })) || [];

      console.log('✅ Pending bookings:', enrichedData.length);
      return {
        data: enrichedData,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Pending bookings API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Manually update booking response time (for testing or corrections)
   */
  async updateBookingResponseTime(bookingId: string): Promise<ApiResponse<boolean>> {
    try {
      console.log('🔄 Manually updating response time for booking:', bookingId);

      const { error } = await supabase
        .rpc('update_booking_response_time_manual', { p_booking_id: bookingId });

      if (error) {
        console.error('❌ Error updating booking response time:', error);
        return {
          data: false,
          error: error.message,
          success: false
        };
      }

      console.log('✅ Booking response time updated');
      return {
        data: true,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Update response time API error:', error);
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }
}

// Utility functions for response time formatting and categorization
export const responseTimeUtils = {
  
  /**
   * Format response time for display
   */
  formatResponseTime: (minutes: number): string => {
    if (minutes < 1) {
      return '< 1m';
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.round(minutes / 60);
      return `${hours}h`;
    } else {
      const days = Math.round(minutes / 1440);
      return `${days}d`;
    }
  },

  /**
   * Get response time category with styling
   */
  getResponseTimeCategory: (minutes: number): ResponseTimeCategory => {
    if (minutes <= 15) {
      return { 
        label: 'Excellent', 
        color: '#10B981', 
        icon: 'flash' 
      };
    } else if (minutes <= 60) {
      return { 
        label: 'Good', 
        color: '#F59E0B', 
        icon: 'checkmark-circle' 
      };
    } else if (minutes <= 240) {
      return { 
        label: 'Fair', 
        color: '#F97316', 
        icon: 'time' 
      };
    } else {
      return { 
        label: 'Needs Improvement', 
        color: '#EF4444', 
        icon: 'warning' 
      };
    }
  },

  /**
   * Calculate response rate percentage
   */
  calculateResponseRate: (responded: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((responded / total) * 100);
  },

  /**
   * Get response time insights text
   */
  getResponseTimeInsight: (avgMinutes: number, responseRate: number): string => {
    const category = responseTimeUtils.getResponseTimeCategory(avgMinutes);
    
    if (responseRate < 80) {
      return `Low response rate (${responseRate}%) - focus on responding to all booking requests`;
    } else if (category.label === 'Excellent') {
      return `Outstanding response time! You respond faster than 95% of providers`;
    } else if (category.label === 'Good') {
      return `Good response time - customers appreciate quick responses`;
    } else if (category.label === 'Fair') {
      return `Consider responding faster - customers prefer responses within 1 hour`;
    } else {
      return `Slow response time may affect bookings - aim to respond within 4 hours`;
    }
  }
};

export const responseTimeAPI = new ResponseTimeAPI();