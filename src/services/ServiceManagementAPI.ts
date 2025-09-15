// services/ServiceManagementAPI.ts
import { normalizedShopService, CompleteShopData, ShopService } from '../lib/supabase/normalized';

export interface Shop {
    id: string;
    name: string;
    location: string;
    category: string;
    is_active: boolean;
    image?: string;
    description?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface Service {
    id: string;
    shop_id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    category: string;
    location_type: 'in_house' | 'on_location';
    is_active: boolean;
    available_dates: string[];
    unavailable_dates: string[];
    booking_slots: BookingSlot[];
    created_at: string;
    updated_at: string;
  }
  
  export interface BookingSlot {
    start: string;
    end: string;
  }
  
  export interface QuickBooking {
    service_id: string;
    service_name: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    notes?: string;
    assigned_staff_id?: string;
    service_option_ids?: string[];
  }
  
  export interface ServiceAvailability {
    business_hours: {
      start: string;
      end: string;
    };
    closed_days: number[];
    special_closures: string[];
    booked_slots: {
      [date: string]: BookingSlot[];
    };
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message: string;
    error?: string;
    errors?: { [key: string]: string[] };
  }

  // Transform CompleteShopData to Shop interface for compatibility
  const transformShopData = (shopData: CompleteShopData): Shop => ({
    id: shopData.id,
    name: shopData.name,
    location: `${shopData.address || ''}, ${shopData.city || ''}`.trim(),
    category: shopData.category || 'General',
    is_active: shopData.is_active ?? true,
    image: shopData.image_url,
    description: shopData.description,
    created_at: shopData.created_at,
    updated_at: shopData.updated_at
  });

  // Transform ShopService to Service interface for compatibility
  const transformServiceData = (serviceData: ShopService): Service => ({
    id: serviceData.id,
    shop_id: serviceData.shop_id,
    name: serviceData.name,
    description: serviceData.description || '',
    price: serviceData.price,
    duration: serviceData.duration || 60,
    category: serviceData.category || 'General',
    location_type: serviceData.location_type || 'in_house',
    is_active: serviceData.is_active ?? true,
    available_dates: [], // We'll populate this based on business hours
    unavailable_dates: [], // We'll populate this based on special days
    booking_slots: [],
    created_at: serviceData.created_at,
    updated_at: serviceData.updated_at
  });
  
  class ServiceManagementAPI {
    // Get all shops for a provider
    async getShops(providerId: string): Promise<ApiResponse<Shop[]>> {
      try {
        console.log('🛒 ServiceManagementAPI.getShops called with providerId:', providerId);
        const response = await normalizedShopService.getShops(providerId);
        
        console.log('🛒 normalizedShopService.getShops response:', response);
        
        if (response.success && response.data) {
          const shops = response.data.map(transformShopData);
          console.log('🛒 Transformed shops:', shops);
          return {
            success: true,
            data: shops,
            message: 'Shops loaded successfully',
          };
        } else {
          console.error('🛒 Failed to get shops:', response.error);
          return {
            success: false,
            message: response.error || 'Failed to load shops',
            error: response.error
          };
        }
      } catch (error) {
        console.error('🛒 Error in getShops:', error);
        return {
          success: false,
          message: 'Failed to load shops',
          error: error.message,
        };
      }
    }

    // Get services for a specific shop
    async getServicesByShop(shopId: string): Promise<ApiResponse<Service[]>> {
      try {
        const response = await normalizedShopService.getShopById(shopId);
        
        if (response.success && response.data) {
          const services = (response.data.services || []).map(transformServiceData);
          return {
            success: true,
            data: services,
            message: 'Services loaded successfully',
          };
        } else {
          return {
            success: false,
            message: response.error || 'Failed to load services',
            error: response.error
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Failed to load services',
          error: error.message,
        };
      }
    }

    // Create a new service
    async createService(shopId: string, serviceData: Partial<Service>): Promise<ApiResponse<Service>> {
      try {
        const shopServiceData: ShopService = {
          id: '', // Will be generated by database
          shop_id: shopId,
          name: serviceData.name || '',
          description: serviceData.description || '',
          price: serviceData.price || 0,
          duration: serviceData.duration || 60,
          category: serviceData.category || 'General',
          assigned_staff: [],
          location_type: serviceData.location_type || 'in_house',
          is_active: serviceData.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const response = await normalizedShopService.createService(shopId, shopServiceData);
        
        if (response.success && response.data) {
          const service = transformServiceData(response.data);
          return {
            success: true,
            data: service,
            message: 'Service created successfully',
          };
        } else {
          return {
            success: false,
            message: response.error || 'Failed to create service',
            error: response.error
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Failed to create service',
          error: error.message,
        };
      }
    }

    // Update an existing service
    async updateService(serviceId: string, serviceData: Partial<Service>): Promise<ApiResponse<Service>> {
      try {
        const updateData: Partial<ShopService> = {
          name: serviceData.name,
          description: serviceData.description,
          price: serviceData.price,
          duration: serviceData.duration,
          category: serviceData.category,
          location_type: serviceData.location_type,
          is_active: serviceData.is_active,
          updated_at: new Date().toISOString()
        };

        const response = await normalizedShopService.updateService(serviceId, updateData);
        
        if (response.success && response.data) {
          const service = transformServiceData(response.data);
          return {
            success: true,
            data: service,
            message: 'Service updated successfully',
          };
        } else {
          return {
            success: false,
            message: response.error || 'Failed to update service',
            error: response.error
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Failed to update service',
          error: error.message,
        };
      }
    }

    // Toggle service status (active/inactive)
    async toggleServiceStatus(serviceId: string, isActive: boolean): Promise<ApiResponse<boolean>> {
      try {
        const response = await normalizedShopService.updateService(serviceId, { 
          is_active: isActive,
          updated_at: new Date().toISOString()
        });
        
        if (response.success) {
          return {
            success: true,
            data: true,
            message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`,
          };
        } else {
          return {
            success: false,
            message: response.error || 'Failed to update service status',
            error: response.error
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Failed to update service status',
          error: error.message,
        };
      }
    }

    // Delete a service
    async deleteService(serviceId: string): Promise<ApiResponse<boolean>> {
      try {
        const response = await normalizedShopService.deleteService(serviceId);
        
        if (response.success) {
          return {
            success: true,
            data: true,
            message: 'Service deleted successfully',
          };
        } else {
          return {
            success: false,
            message: response.error || 'Failed to delete service',
            error: response.error
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Failed to delete service',
          error: error.message,
        };
      }
    }

    // Update service availability (placeholder - would need booking system integration)
    async updateServiceAvailability(
      serviceId: string, 
      availableDates: string[], 
      unavailableDates: string[]
    ): Promise<ApiResponse<boolean>> {
      try {
        // This would need integration with a booking/calendar system
        // For now, return success as a placeholder
        return {
          success: true,
          data: true,
          message: 'Service availability updated successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to update service availability',
          error: error.message,
        };
      }
    }

    // Create a quick booking
    async createQuickBooking(bookingData: QuickBooking & { 
      shop_id: string, 
      assigned_staff_id?: string 
    }): Promise<ApiResponse<any>> {
      try {
        console.log('📅 ServiceManagementAPI.createQuickBooking called with:', bookingData);
        
        // Validate required fields
        if (!bookingData.customer_name || !bookingData.customer_phone || !bookingData.date || !bookingData.time || !bookingData.service_id) {
          return {
            success: false,
            message: 'Missing required booking information',
            errors: {
              customer_name: bookingData.customer_name ? [] : ['Customer name is required'],
              customer_phone: bookingData.customer_phone ? [] : ['Customer phone is required'],
              date: bookingData.date ? [] : ['Date is required'],
              time: bookingData.time ? [] : ['Time is required'],
              service_id: bookingData.service_id ? [] : ['Service ID is required'],
            },
          };
        }

        // Calculate end time based on duration
        const startTime = bookingData.time;
        const duration = bookingData.duration || 60;
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

        const response = await normalizedShopService.createBooking({
          shop_id: bookingData.shop_id,
          service_id: bookingData.service_id,
          assigned_staff_id: bookingData.assigned_staff_id,
          customer_name: bookingData.customer_name,
          customer_phone: bookingData.customer_phone,
          customer_email: bookingData.customer_email,
          booking_date: bookingData.date,
          start_time: startTime,
          end_time: endTime,
          duration: duration,
          service_price: bookingData.price,
          total_price: bookingData.price,
          notes: bookingData.notes,
          service_option_ids: bookingData.service_option_ids || []
        });

        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: 'Quick booking created successfully',
          };
        } else {
          return {
            success: false,
            message: response.error || 'Failed to create booking',
            error: response.error
          };
        }
      } catch (error) {
        console.error('🛒 Error in createQuickBooking:', error);
        return {
          success: false,
          message: 'Failed to create quick booking',
          error: error.message,
        };
      }
    }

    // Get service availability (placeholder - would get from business hours and bookings)
    async getServiceAvailability(serviceId: string): Promise<ApiResponse<ServiceAvailability>> {
      try {
        // This would need to integrate with business hours and booking data
        // For now, return mock availability based on general business hours
        const mockAvailability: ServiceAvailability = {
          business_hours: { start: "09:00", end: "18:00" },
          closed_days: [0], // Sunday
          special_closures: [],
          booked_slots: {}
        };

        return {
          success: true,
          data: mockAvailability,
          message: 'Service availability loaded successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to load service availability',
          error: error.message,
        };
      }
    }

    // Get staff members assigned to a specific service
    async getServiceStaff(shopId: string, serviceId: string): Promise<ApiResponse<any[]>> {
      try {
        console.log('📋 Getting staff for service:', serviceId, 'in shop:', shopId);
        
        // Get shop data which includes services and staff
        const shopResponse = await normalizedShopService.getShopById(shopId);
        if (!shopResponse.success || !shopResponse.data) {
          return {
            success: false,
            data: [],
            message: shopResponse.error || 'Failed to load shop data',
            error: shopResponse.error
          };
        }

        const shopData = shopResponse.data;
        const allServices = shopData.services || [];
        const allStaff = shopData.staff || [];
        
        console.log('👨‍💼 All shop staff:', allStaff.length);
        console.log('🛠️ All shop services:', allServices.length);

        // Find the specific service
        const targetService = allServices.find(service => service.id === serviceId);
        if (!targetService) {
          console.error('❌ Service not found:', serviceId);
          return {
            success: false,
            data: [],
            message: 'Service not found',
            error: 'Service not found'
          };
        }

        const assignedStaffIds = targetService.assigned_staff || [];
        console.log('👥 Service assigned staff IDs:', assignedStaffIds);

        // If no staff assigned to this service, return empty array
        if (assignedStaffIds.length === 0) {
          console.log('⚠️ No staff assigned to this service');
          return {
            success: true,
            data: [],
            message: 'No staff assigned to this service',
          };
        }

        // Filter staff to only those assigned to this service
        const assignedStaff = allStaff.filter(staff => 
          assignedStaffIds.includes(staff.id) && staff.is_active !== false
        );

        console.log('✅ Filtered assigned staff:', assignedStaff.length);

        return {
          success: true,
          data: assignedStaff,
          message: 'Service staff loaded successfully',
        };
      } catch (error) {
        console.error('❌ Error getting service staff:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to load service staff',
          error: error.message,
        };
      }
    }

    // Get all staff members for a shop (legacy function, kept for compatibility)
    async getShopStaff(shopId: string): Promise<ApiResponse<any[]>> {
      try {
        const response = await normalizedShopService.getShopById(shopId);
        
        if (response.success && response.data) {
          const staff = response.data.staff || [];
          return {
            success: true,
            data: staff,
            message: 'Shop staff loaded successfully',
          };
        } else {
          return {
            success: false,
            data: [],
            message: response.error || 'Failed to load shop staff',
            error: response.error
          };
        }
      } catch (error) {
        return {
          success: false,
          data: [],
          message: 'Failed to load shop staff',
          error: error.message,
        };
      }
    }

    // Update booking status (approve, complete, etc.)
    async updateBookingStatus(
      bookingId: string, 
      status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
      notes?: string
    ): Promise<ApiResponse<any>> {
      try {
        console.log('📅 ServiceManagementAPI.updateBookingStatus called:', bookingId, status);
        
        const response = await normalizedShopService.updateBookingStatus(bookingId, status, notes);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: response.message || `Booking ${status} successfully`,
          };
        } else {
          return {
            success: false,
            message: response.error || 'Failed to update booking status',
            error: response.error
          };
        }
      } catch (error) {
        console.error('🛒 Error in updateBookingStatus:', error);
        return {
          success: false,
          message: 'Failed to update booking status',
          error: error.message,
        };
      }
    }

    // Get booking status counts for dashboard
    async getBookingStatusCounts(shopId: string, dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
      try {
        const response = await normalizedShopService.getBookingStatusCounts(shopId, dateFrom, dateTo);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: 'Booking status counts loaded successfully',
          };
        } else {
          return {
            success: false,
            data: {},
            message: response.error || 'Failed to load booking status counts',
            error: response.error
          };
        }
      } catch (error) {
        return {
          success: false,
          data: {},
          message: 'Failed to load booking status counts',
          error: error.message,
        };
      }
    }

    // Get bookings queue for provider
    async getBookingQueue(providerId: string, filters?: { 
      status?: string; 
      date?: string; 
      shopId?: string;
    }): Promise<ApiResponse<any[]>> {
      try {
        console.log('📋 ServiceManagementAPI.getBookingQueue called for provider:', providerId);
        
        const response = await normalizedShopService.getBookings(providerId, filters);
        
        if (response.success && response.data) {
          // Transform bookings to queue items
          const queueItems = response.data.map(booking => ({
            id: booking.id,
            booking_id: booking.id,
            title: booking.service_name || 'Service',
            service_type: booking.service_name,
            client: booking.customer_name,
            client_phone: booking.customer_phone,
            client_email: booking.customer_email || '',
            date: booking.booking_date,
            time: booking.start_time,
            scheduled_time: `${booking.booking_date} ${booking.start_time}`,
            duration: `${booking.duration} min`,
            price: booking.total_price,
            status: booking.status,
            priority: booking.status === 'confirmed' ? 'high' : 'medium',
            notes: booking.notes || '',
            location_type: booking.service_location_type || 'in_house',
            location: booking.service_location_type === 'on_location' 
              ? 'Client Location' 
              : 'Shop Location',
            staff_name: booking.staff?.name || 'Any Staff',
            created_at: booking.created_at,
            invoice_sent: false // Will be added later
          }));

          console.log('✅ Transformed', queueItems.length, 'bookings to queue items');
          
          return {
            success: true,
            data: queueItems,
            message: 'Booking queue loaded successfully',
          };
        } else {
          return {
            success: false,
            data: [],
            message: response.error || 'Failed to load booking queue',
            error: response.error
          };
        }
      } catch (error) {
        console.error('🛒 Error in getBookingQueue:', error);
        return {
          success: false,
          data: [],
          message: 'Failed to load booking queue',
          error: error.message,
        };
      }
    }

    // Get service statistics (placeholder)
    async getServiceStatistics(shopId?: string): Promise<ApiResponse<any>> {
      try {
        // This would calculate real statistics from the database
        // For now, return placeholder stats
        const mockStats = {
          total_services: 0,
          active_services: 0,
          average_price: 0,
          average_duration: 0,
          total_bookings_this_month: 0,
          revenue_this_month: 0,
          most_popular_service: '',
          busiest_day: '',
        };

        return {
          success: true,
          data: mockStats,
          message: 'Statistics loaded successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to load statistics',
          error: error.message,
        };
      }
    }
  }
  
  export default new ServiceManagementAPI();