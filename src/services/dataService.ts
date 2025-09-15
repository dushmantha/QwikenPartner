// Data Service - Automatically switches between real and mock data based on DEV_CONFIG
import { shouldUseMockData, mockDelay } from '../config/devConfig';
import { 
  getMockUsers, 
  getMockShops, 
  getMockStaff, 
  getMockServices, 
  getMockCategories, 
  getMockBookings, 
  getMockReviews, 
  getMockNotifications,
  searchMockData,
  MOCK_USERS 
} from '../data/mockData';

// Real service imports (add these as needed)
// import { supabase } from '../lib/supabase';
// import { bookingsAPI } from './api/bookings/bookingsAPI';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

class DataService {
  
  // User Services
  async getCurrentUser(): Promise<ApiResponse<any>> {
    if (shouldUseMockData('MOCK_AUTH')) {
      await mockDelay();
      return {
        success: true,
        data: MOCK_USERS[0] // Return first mock user as current user
      };
    }
    
    // Real implementation
    try {
      // const { data: { user }, error } = await supabase.auth.getUser();
      // if (error) throw error;
      // return { success: true, data: user };
      
      // Temporary fallback until real auth is connected
      return { success: false, data: null, error: 'Real auth not implemented yet' };
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Shop Services
  async getShops(featured?: boolean): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_SHOPS')) {
      await mockDelay();
      const shops = getMockShops();
      const filteredShops = featured ? shops.filter(shop => shop.featured) : shops;
      return {
        success: true,
        data: filteredShops
      };
    }
    
    // Real implementation
    try {
      // const { data, error } = await supabase
      //   .from('provider_businesses')
      //   .select('*')
      //   .eq('is_active', true);
      // if (error) throw error;
      // return { success: true, data };
      
      // Temporary fallback
      return { success: false, data: null, error: 'Real shop service not implemented yet' };
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getShopById(shopId: string): Promise<ApiResponse<any>> {
    if (shouldUseMockData('MOCK_SHOPS')) {
      await mockDelay();
      const shops = getMockShops();
      const shop = shops.find(s => s.id === shopId);
      return {
        success: true,
        data: shop || null
      };
    }
    
    // Real implementation
    try {
      // const { data, error } = await supabase
      //   .from('provider_businesses')
      //   .select('*')
      //   .eq('id', shopId)
      //   .single();
      // if (error) throw error;
      // return { success: true, data };
      
      return { success: false, data: null, error: 'Real shop service not implemented yet' };
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Staff Services
  async getStaffByShop(shopId: string): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_STAFF')) {
      await mockDelay();
      const staff = getMockStaff(shopId);
      return {
        success: true,
        data: staff
      };
    }
    
    // Real implementation
    try {
      // const { data, error } = await supabase
      //   .from('shop_staff')
      //   .select('*')
      //   .eq('shop_id', shopId)
      //   .eq('is_active', true);
      // if (error) throw error;
      // return { success: true, data };
      
      return { success: false, data: null, error: 'Real staff service not implemented yet' };
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Service Services
  async getServicesByShop(shopId: string): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_SERVICES')) {
      await mockDelay();
      const services = getMockServices(shopId);
      return {
        success: true,
        data: services
      };
    }
    
    // Real implementation
    try {
      // const { data, error } = await supabase
      //   .from('shop_services')
      //   .select('*')
      //   .eq('shop_id', shopId)
      //   .eq('is_active', true);
      // if (error) throw error;
      // return { success: true, data };
      
      return { success: false, data: null, error: 'Real service service not implemented yet' };
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getFeaturedServices(): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_SERVICES')) {
      await mockDelay();
      const services = getMockServices();
      const featuredServices = services.filter(service => service.featured);
      return {
        success: true,
        data: featuredServices
      };
    }
    
    // Real implementation
    return { success: false, data: null, error: 'Real service not implemented yet' };
  }

  // Category Services
  async getCategories(): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_CATEGORIES')) {
      await mockDelay();
      const categories = getMockCategories();
      return {
        success: true,
        data: categories
      };
    }
    
    // Real implementation
    return { success: false, data: null, error: 'Real category service not implemented yet' };
  }

  // Booking Services
  async getBookingsByCustomer(customerId: string): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_BOOKINGS')) {
      await mockDelay();
      // For mock data, return all bookings with the current customer ID injected
      const mockBookings = getMockBookings();
      // Update customer ID to match current user for mock data and convert to expected format
      const bookingsWithCurrentUser = mockBookings.map(booking => {
        // Find the corresponding shop data to get location information
        const shopData = getMockShops().find(shop => shop.id === booking.shopId);
        
        // Parse address if available
        let shop_address = '';
        let shop_city = '';
        let shop_country = '';
        
        if (shopData?.address) {
          // Parse "123 Fashion Ave, New York, NY 10001" format
          const addressParts = shopData.address.split(', ');
          shop_address = addressParts[0] || '';
          shop_city = addressParts[1] || '';
          shop_country = addressParts[2] || '';
        }
        
        return {
          // Map to the format expected by BookingsScreen
          id: booking.id,
          customer_id: customerId,
          user_id: customerId,
          shop_id: booking.shopId,
          staff_id: booking.staffId,
          service_id: booking.serviceIds?.[0],
          booking_date: booking.bookingDate,
          start_time: booking.startTime,
          end_time: booking.endTime,
          status: booking.status,
          total_price: booking.totalPrice,
          notes: booking.notes,
          created_at: booking.createdAt,
          // Enriched display data
          shop_name: booking.shopName,
          staff_names: booking.staffName,
          service_names: booking.serviceNames?.[0] || booking.serviceNames,
          shop_image_url: booking.shopImage,
          // Shop location data
          shop_address: shop_address,
          shop_city: shop_city,
          shop_country: shop_country,
          duration: 60, // Default duration
          // Also keep original camelCase fields for compatibility
          ...booking,
          customerId: customerId
        };
      });
      return {
        success: true,
        data: bookingsWithCurrentUser
      };
    }
    
    // Real implementation
    try {
      const { bookingsAPI } = await import('./api/bookings/bookingsAPI');
      return await bookingsAPI.getCustomerBookings(customerId);
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createBooking(bookingData: any): Promise<ApiResponse<any>> {
    if (shouldUseMockData('MOCK_BOOKINGS')) {
      await mockDelay();
      // Simulate booking creation
      const newBooking = {
        id: `booking-${Date.now()}`,
        ...bookingData,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      return {
        success: true,
        data: newBooking
      };
    }
    
    // Real implementation
    try {
      // return await bookingsAPI.createBooking(bookingData);
      return { success: false, data: null, error: 'Real booking service not implemented yet' };
    } catch (error) {
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Review Services
  async getReviewsByShop(shopId: string): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_REVIEWS')) {
      await mockDelay();
      const reviews = getMockReviews(shopId);
      return {
        success: true,
        data: reviews
      };
    }
    
    // Real implementation
    return { success: false, data: null, error: 'Real review service not implemented yet' };
  }

  // Notification Services
  async getNotifications(): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_NOTIFICATIONS')) {
      await mockDelay();
      const notifications = getMockNotifications();
      return {
        success: true,
        data: notifications
      };
    }
    
    // Real implementation
    return { success: false, data: null, error: 'Real notification service not implemented yet' };
  }

  // Search Services
  async searchAll(query: string): Promise<ApiResponse<any>> {
    if (shouldUseMockData('MOCK_SEARCH_RESULTS')) {
      await mockDelay();
      const results = searchMockData(query);
      return {
        success: true,
        data: results
      };
    }
    
    // Real implementation
    return { success: false, data: null, error: 'Real search service not implemented yet' };
  }

  // Location Services
  async getNearbyShops(latitude: number, longitude: number, radius: number = 10): Promise<ApiResponse<any[]>> {
    if (shouldUseMockData('MOCK_NEARBY_SHOPS')) {
      await mockDelay();
      // Return all mock shops for now
      const shops = getMockShops();
      return {
        success: true,
        data: shops
      };
    }
    
    // Real implementation
    return { success: false, data: null, error: 'Real location service not implemented yet' };
  }
}

// Export singleton instance
export const dataService = new DataService();