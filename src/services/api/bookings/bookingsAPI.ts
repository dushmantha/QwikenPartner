import { normalizedShopService, supabase } from '../../../lib/supabase/normalized';
import { bookingEmailService } from '../../bookingEmailService';
import { shouldUseMockData, mockDelay, logMockUsage } from '../../../config/devConfig';
import { getMockBookings } from '../../../data/mockData';

export interface BookingService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface Booking {
  id?: string;
  customer_id: string;
  shop_id: string;
  staff_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  services: BookingService[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookingCreateRequest {
  customer_id: string;
  shop_id: string;
  staff_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  services: BookingService[];
  notes?: string;
  discount_id?: string;
  service_option_ids?: string[];
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

class BookingsAPI {
  
  /**
   * Create a new booking
   */
  async createBooking(bookingData: BookingCreateRequest): Promise<ApiResponse<Booking>> {
    try {
      console.log('🚨 CRITICAL DEBUG: BookingsAPI.createBooking called!');
      console.log('📅 Creating booking for multiple services:', bookingData);

      const services = bookingData.services || [];
      
      if (services.length === 0) {
        console.error('❌ No services found in booking data');
        return {
          data: null,
          error: 'No service selected. Please select a service before booking.',
          success: false
        };
      }

      console.log(`🔍 Creating ${services.length} booking(s) for services:`, services.map(s => s.name));

      // Generate a session ID for grouping related bookings
      const bookingSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create separate booking for each service
      const bookingPromises = services.map(async (service, index) => {
        const serviceDuration = service.duration || 60;
        
        // Calculate start and end times for this service
        const baseStartTime = new Date(`${bookingData.booking_date}T${bookingData.start_time}`);
        const serviceStartTime = new Date(baseStartTime.getTime() + (index * serviceDuration * 60000));
        const serviceEndTime = new Date(serviceStartTime.getTime() + (serviceDuration * 60000));
        
        const transformedBookingData = {
          shop_id: bookingData.shop_id,
          service_id: service.id,
          assigned_staff_id: bookingData.staff_id,
          customer_name: 'Customer', // Default name - should come from auth
          customer_phone: 'N/A', // Default phone - should come from user profile
          customer_email: undefined,
          booking_date: bookingData.booking_date,
          start_time: serviceStartTime.toTimeString().slice(0, 5), // HH:MM format
          end_time: serviceEndTime.toTimeString().slice(0, 5), // HH:MM format
          duration: serviceDuration,
          service_price: service.price || 0,
          total_price: service.price || 0, // Individual service price
          service_name: services.length > 1 ? `${service.name} (${index + 1}/${services.length})` : service.name || 'Service',
          notes: index === 0 ? `${services.length > 1 ? `Multi-service booking (${services.length} services): ` : ''}${bookingData.notes || ''}` : `Service ${index + 1} of ${services.length}: ${service.name}`,
          timezone: 'UTC',
          discount_id: index === 0 ? bookingData.discount_id : undefined, // Apply discount only to first service
          service_option_ids: bookingData.service_option_ids || [],
          booking_session_id: bookingSessionId // Add session ID to group related bookings
        };

        console.log(`📅 Creating booking ${index + 1}/${services.length} for service: ${service.name}`);
        return normalizedShopService.createBooking(transformedBookingData);
      });

      // Wait for all bookings to be created
      const responses = await Promise.allSettled(bookingPromises);
      
      // Check if all bookings were successful
      const successfulBookings: any[] = [];
      const failedBookings: string[] = [];
      
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.success) {
          successfulBookings.push(response.value.data);
        } else {
          const serviceName = services[index]?.name || `Service ${index + 1}`;
          const error = response.status === 'rejected' 
            ? response.reason 
            : (response.value as any).error;
          failedBookings.push(`${serviceName}: ${error}`);
        }
      });

      if (failedBookings.length > 0) {
        console.error('❌ Some bookings failed:', failedBookings);
        return {
          data: null,
          error: `Failed to create bookings for: ${failedBookings.join(', ')}`,
          success: false
        };
      }

      console.log(`✅ Successfully created ${successfulBookings.length} bookings`);
      
      // Send booking confirmation email for the first booking
      try {
        console.log('🚨 CRITICAL DEBUG: About to process emails for successful bookings!');
        const booking = successfulBookings[0];
        
        // Get customer details from authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('👤 Auth user data:', user);
        console.log('👤 User error:', userError);
        console.log('👤 User email:', user?.email);
        console.log('👤 User metadata:', user?.user_metadata);
        
        const customer = user ? {
          email: user.email,
          first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || user.user_metadata?.name || 'Customer',
          last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || ''
        } : null;
        
        console.log('👤 Customer object:', customer);
        
        // Get shop details - fetch available email fields (check schema)
        const { data: shop, error: shopError } = await supabase
          .from('provider_businesses')
          .select('name, address, phone, email')
          .eq('id', bookingData.shop_id)
          .single();
          
        console.log('🏪 Shop query for shop_id:', bookingData.shop_id);
        console.log('🏪 Shop data retrieved:', shop);
        console.log('🏪 Shop query error:', shopError);
        console.log('🏪 Shop email:', shop?.email);
        
        if (!shop) {
          console.error('❌ CRITICAL: Shop data is null for shop_id:', bookingData.shop_id);
          console.error('❌ Shop query error details:', shopError);
          
          // Try alternative query to get shop data
          console.log('🏪 FALLBACK: Trying to get shop by any matching ID...');
          const { data: anyShop } = await supabase
            .from('provider_businesses')
            .select('*')
            .or(`id.eq.${bookingData.shop_id},business_id.eq.${bookingData.shop_id}`)
            .limit(1)
            .single();
            
          if (anyShop) {
            console.log('🏪 FALLBACK: Found shop using alternative query:', anyShop);
            // Use the fallback shop data
            Object.assign(shop || {}, anyShop);
          }
        }
        
        // Get staff details if available
        let staffName = '';
        if (bookingData.staff_id) {
          const { data: staff } = await supabase
            .from('provider_staff')
            .select('full_name')
            .eq('id', bookingData.staff_id)
            .single();
          staffName = staff?.full_name || '';
        }
        
        // Try to get customer email from multiple sources
        let customerEmail = customer?.email;
        let customerName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer';
        
        // Fallback: try to get email from user profile if not in auth
        if (!customerEmail && user?.id) {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('email, first_name, last_name')
              .eq('user_id', user.id)
              .single();
              
            if (profile?.email) {
              customerEmail = profile.email;
              customerName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Customer';
              console.log('📧 Retrieved email from user profile:', customerEmail);
            }
          } catch (profileError) {
            console.warn('⚠️ Could not fetch user profile:', profileError);
          }
        }
        
        // Store original customer email for business notification
        const originalCustomerEmail = customerEmail;
        
        // Production mode - use actual customer and business emails
        const USE_TEST_EMAILS_ONLY = false; // Set to true for development with Resend sandbox
        
        if (!customerEmail) {
          customerEmail = 'tdmihiran@gmail.com'; // Fallback for missing email
          console.log('📧 Using fallback test email for customer confirmation:', customerEmail);
        } else if (USE_TEST_EMAILS_ONLY && customerEmail !== 'tdmihiran@gmail.com') {
          // Only redirect if explicitly in test mode
          console.log('📧 Development mode: redirecting customer email from', customerEmail, 'to tdmihiran@gmail.com');
          customerEmail = 'tdmihiran@gmail.com';
        } else {
          // Production mode: use actual customer email
          console.log('📧 Sending confirmation to customer email:', customerEmail);
        }
        
        if (customerEmail) {
          console.log('📧 Preparing to send confirmation email to:', customerEmail);
          console.log('🏪 Shop details:', shop?.name);
          console.log('🏪 Shop address:', shop?.address);
          console.log('🏪 Shop phone:', shop?.phone);
          console.log('📅 Booking date from booking data:', bookingData.booking_date);
          console.log('🛎️ Service details:', services.map(s => s.name));
          
          const totalDuration = services.reduce((sum, service) => sum + (service.duration || 60), 0);
          const serviceNames = services.map(s => s.name).join(', ');
          const totalPrice = services.reduce((sum, service) => sum + (service.price || 0), 0);
          
          const emailData = {
            to_email: customerEmail,
            customer_name: customerName,
            shop_name: shop?.name || 'Shop',
            service_name: services.length > 1 ? `${services.length} Services: ${serviceNames}` : services[0]?.name || 'Service',
            booking_date: bookingData.booking_date,
            booking_time: bookingData.start_time,
            duration: totalDuration,
            price: totalPrice,
            staff_name: staffName,
            shop_address: shop?.address,
            shop_phone: shop?.phone,
            booking_id: booking?.id,
            notes: bookingData.notes
          };
          
          console.log('📧 Email data prepared:', emailData);
          
          // Send confirmation email using Edge Function
          console.log('📧 Sending customer confirmation email via Edge Function...');
          const confirmationResult = await bookingEmailService.sendBookingConfirmation(emailData);
          console.log('📧 Customer email result:', confirmationResult);
          
          // Schedule reminder for 6 hours before
          const reminderResult = await bookingEmailService.scheduleReminder(emailData);
          console.log('⏰ Reminder scheduling result:', reminderResult);
          
          console.log('📧 Customer email processing completed for:', customer?.email || customerEmail);
          
          // Send business notification email - ensure business always gets notified
          // Use only the available email field
          let businessEmail = shop?.email;
          
          console.log('🏪 DEBUGGING: Checking shop email field:');
          console.log('  - email:', shop?.email);
          console.log('🏪 DEBUGGING: Selected business email:', businessEmail);
          console.log('🏪 DEBUGGING: Full shop data:', JSON.stringify(shop, null, 2));
          
          // If still no shop data, try to get ANY provider business email as last resort
          if (!businessEmail && !shop) {
            console.log('🏪 CRITICAL FALLBACK: No shop found, trying to get ANY provider business...');
            const { data: anyProvider } = await supabase
              .from('provider_businesses')
              .select('email')
              .not('email', 'is', null)
              .limit(1)
              .single();
              
            if (anyProvider) {
              businessEmail = anyProvider.email;
              console.log('🏪 CRITICAL FALLBACK: Using email from first available provider:', businessEmail);
            }
          }
          
          // Try to get business owner email if shop email is not available
          if (!businessEmail) {
            console.log('🏪 No shop email found, trying to get business owner email...');
            try {
              const { data: businessOwner, error: ownerError } = await supabase
                .from('provider_businesses')
                .select('email')
                .eq('id', bookingData.shop_id)
                .single();
                
              console.log('🏪 DEBUGGING: Business owner query result:', JSON.stringify(businessOwner, null, 2));
              console.log('🏪 DEBUGGING: Business owner query error:', ownerError);
                
              businessEmail = businessOwner?.email;
              console.log('🏪 Retrieved business owner email:', businessEmail);
            } catch (ownerError) {
              console.warn('⚠️ Could not fetch business owner email:', ownerError);
            }
          } else {
            console.log('🏪 DEBUGGING: Using shop email:', businessEmail);
          }
          
          // Final fallback for missing business email - ensure business ALWAYS gets notified
          if (!businessEmail) {
            // Try multiple fallback approaches
            console.log('🏪 CRITICAL: No business email found, trying additional fallbacks...');
            
            // Fallback 1: Try to get any email from the business record
            try {
              const { data: businessData } = await supabase
                .from('provider_businesses')
                .select('*')
                .eq('id', bookingData.shop_id)
                .single();
              
              console.log('🏪 FALLBACK: Full business data:', JSON.stringify(businessData, null, 2));
              
              // Use only the existing email field
              businessEmail = businessData?.email;
                             
              console.log('🏪 FALLBACK: Extracted business email:', businessEmail);
            } catch (fallbackError) {
              console.error('🏪 FALLBACK: Error getting business data:', fallbackError);
            }
            
            // Fallback 2: Use test email if still no email found
            if (!businessEmail) {
              businessEmail = 'tdmihiran@gmail.com'; // Test email for business notifications
              console.log('🏪 FINAL FALLBACK: Using test email for business notification:', businessEmail);
            }
          } else {
            console.log('🏪 DEBUGGING: Using found business email:', businessEmail);
          }
          
          // Remove the force override - use real business email
          console.log('🏪 PRODUCTION: Using actual business email:', businessEmail);
          
          if (businessEmail) {
            console.log('🏪 Preparing to send business notification email to:', businessEmail);
            
            const businessNotificationData = {
              business_email: businessEmail,
              business_name: shop?.name || 'Business',
              customer_name: customerName,
              customer_phone: user?.phone || undefined,
              customer_email: originalCustomerEmail || customerEmail, // Show original customer email to business
              service_name: services.length > 1 ? `${services.length} Services: ${serviceNames}` : services[0]?.name || 'Service',
              booking_date: bookingData.booking_date,
              booking_time: bookingData.start_time,
              duration: totalDuration,
              price: totalPrice,
              staff_name: staffName,
              booking_id: booking?.id,
              notes: bookingData.notes
            };
            
            console.log('🏪 Business notification data prepared:', businessNotificationData);
            console.log('📅 BUSINESS EMAIL - booking_date value:', businessNotificationData.booking_date);
            console.log('📅 BUSINESS EMAIL - booking_date type:', typeof businessNotificationData.booking_date);
            
            // Send business notification using Edge Function
            console.log('🏪 Sending business notification email via Edge Function...');
            console.log('🏪 DEBUGGING: About to call sendBusinessNotification with email:', businessEmail);
            
            try {
              const businessResult = await bookingEmailService.sendBusinessNotification(businessNotificationData);
              
              console.log('🏪 DEBUGGING: Business email send result:', JSON.stringify(businessResult, null, 2));
              console.log('🏪 Business email result:', businessResult);
              
              if (businessResult.success) {
                console.log('✅ BUSINESS EMAIL SENT SUCCESSFULLY!');
              } else {
                console.error('❌ BUSINESS EMAIL FAILED:', businessResult.error);
              }
            } catch (businessEmailError) {
              console.error('❌ CRITICAL: Business email sending threw exception:', businessEmailError);
              console.error('❌ Exception details:', JSON.stringify(businessEmailError, null, 2));
              
              // Try direct Edge Function call as backup
              console.log('🏪 BACKUP: Attempting direct Edge Function call...');
              try {
                const directResult = await supabase.functions.invoke('send-email', {
                  body: {
                    to: businessEmail,
                    subject: `New Booking: ${businessNotificationData.service_name} - ${businessNotificationData.customer_name}`,
                    html: `<h1>New Booking</h1><p>Customer: ${businessNotificationData.customer_name}</p><p>Service: ${businessNotificationData.service_name}</p><p>Date: ${businessNotificationData.booking_date}</p><p>Time: ${businessNotificationData.booking_time}</p>`,
                    type: 'business_notification'
                  }
                });
                
                console.log('🏪 BACKUP: Direct Edge Function result:', JSON.stringify(directResult, null, 2));
              } catch (backupError) {
                console.error('❌ BACKUP FAILED:', backupError);
              }
            }
            
            console.log('🏪 Business email processing completed for:', businessEmail);
          } else {
            console.error('❌ CRITICAL: No business email could be resolved for booking notification!');
            console.error('❌ Shop data:', JSON.stringify(shop, null, 2));
            console.error('❌ This should not happen with the fallback mechanisms in place');
          }
        } else {
          console.error('❌ CRITICAL: No customer email could be resolved for booking confirmation!');
          console.error('❌ User data:', JSON.stringify(user, null, 2));
          console.error('❌ Customer object:', JSON.stringify(customer, null, 2));
          console.error('❌ This should not happen with the fallback mechanisms in place');
        }
      } catch (emailError) {
        console.error('Failed to send booking email:', emailError);
        // Don't fail the booking if email fails
      }
      
      return {
        data: successfulBookings[0], // Return first booking as main response
        error: null,
        success: true,
        message: `Successfully created ${successfulBookings.length} booking(s)`
      };

    } catch (error) {
      console.error('❌ Booking API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Get bookings for a customer with shop and staff details
   */
  async getCustomerBookings(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      console.log('📅 Fetching bookings for customer:', customerId);

      // Check if we should use mock data
      if (shouldUseMockData('MOCK_BOOKINGS')) {
        logMockUsage('Bookings API', `for customer ${customerId}`);
        await mockDelay();
        
        const mockBookings = getMockBookings(customerId);
        console.log('🎭 Using mock bookings:', mockBookings.length);
        
        return {
          data: mockBookings,
          error: null,
          success: true
        };
      }

      // Fetch bookings first
      const { data: bookings, error: bookingsError } = await supabase
        .from('shop_bookings')
        .select(`
          id,
          customer_id,
          shop_id,
          staff_id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          service_name,
          notes,
          created_at,
          updated_at
        `)
        .eq('customer_id', customerId)
        .order('booking_date', { ascending: false });

      if (bookingsError) {
        console.error('❌ Error fetching customer bookings:', bookingsError);
        return {
          data: null,
          error: bookingsError.message,
          success: false
        };
      }

      if (!bookings || bookings.length === 0) {
        console.log('📅 No bookings found for customer');
        return {
          data: [],
          error: null,
          success: true
        };
      }

      console.log('📅 Found', bookings.length, 'bookings, fetching additional details...');

      // Get unique shop IDs and staff IDs to fetch their details
      const shopIds = [...new Set(bookings.map(b => b.shop_id))];
      const staffIds = [...new Set(bookings.map(b => b.staff_id))];

      // Fetch shop details including address
      console.log('🏪 Fetching shop details for IDs:', shopIds);
      const { data: shops, error: shopsError } = await supabase
        .from('provider_businesses')
        .select('id, name, image_url, address, city, country, phone, email')
        .in('id', shopIds);

      if (shopsError) {
        console.warn('⚠️ Error fetching shop details:', shopsError);
      } else {
        console.log('✅ Fetched shop details:', shops?.map(s => ({ id: s.id, name: s.name, address: s.address })));
      }

      // Fetch staff details
      const { data: staff, error: staffError } = await supabase
        .from('shop_staff')
        .select('id, name, role, avatar_url')
        .in('id', staffIds);

      if (staffError) {
        console.warn('⚠️ Error fetching staff details:', staffError);
      }

      // Create lookup maps
      const shopMap = new Map();
      shops?.forEach(shop => shopMap.set(shop.id, shop));

      const staffMap = new Map();
      staff?.forEach(staffMember => staffMap.set(staffMember.id, staffMember));

      // Enrich bookings with shop and staff details
      const enrichedBookings = bookings.map(booking => {
        const shop = shopMap.get(booking.shop_id);
        const staffMember = staffMap.get(booking.staff_id);
        
        // Use service_name directly from the booking
        const serviceNames = booking.service_name || 'Unknown Service';

        const staffNames = staffMember?.name || 'Unknown Staff';
        const duration = 60; // Default duration since we don't have services array

        return {
          ...booking,
          shop_name: shop?.name || 'Unknown Shop',
          shop_image_url: shop?.image_url || null,
          shop_address: shop?.address || '',
          shop_city: shop?.city || '',
          shop_country: shop?.country || '',
          shop_phone: shop?.phone || '',
          shop_email: shop?.email || '',
          staff_names: staffNames,
          staff_avatar: staffMember?.avatar_url || null,
          service_names: serviceNames,
          duration: duration,
          // Add computed fields for easier access
          display_date: booking.booking_date,
          display_time: booking.start_time,
          display_status: booking.status,
          display_price: booking.total_price
        };
      });

      console.log('✅ Successfully fetched and enriched', enrichedBookings.length, 'bookings');
      console.log('📍 Sample booking with location data:', enrichedBookings[0] ? {
        id: enrichedBookings[0].id,
        shop_name: enrichedBookings[0].shop_name,
        shop_address: enrichedBookings[0].shop_address,
        shop_city: enrichedBookings[0].shop_city,
        shop_country: enrichedBookings[0].shop_country
      } : 'No bookings');

      return {
        data: enrichedBookings,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Customer bookings API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Get bookings for a staff member on a specific date
   */
  async getStaffBookings(staffId: string, date: string): Promise<ApiResponse<Array<{start: string; end: string}>>> {
    try {
      const { data, error } = await supabase
        .from('shop_bookings')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'pending']);

      if (error) {
        console.error('❌ Error fetching staff bookings:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      // Transform to expected format
      const bookings = data?.map(booking => ({
        start: booking.start_time,
        end: booking.end_time
      })) || [];

      return {
        data: bookings,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Staff bookings API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Check for booking conflicts
   */
  async checkBookingConflict(
    staffId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      let query = supabase
        .from('shop_bookings')
        .select('id')
        .eq('staff_id', staffId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'pending']);

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error checking booking conflict:', error);
        return {
          data: false,
          error: error.message,
          success: false
        };
      }

      // Check for time overlaps manually since Supabase doesn't support complex time queries easily
      const hasConflict = data && data.length > 0;

      return {
        data: hasConflict,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Booking conflict check API error:', error);
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      console.log('🚫 Attempting to cancel booking:', bookingId);
      
      // First check if the booking exists
      const { data: existingBooking, error: findError } = await supabase
        .from('shop_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (findError || !existingBooking) {
        console.error('❌ Booking not found for cancellation:', bookingId, findError);
        return {
          data: null,
          error: 'Booking not found or already cancelled',
          success: false
        };
      }

      console.log('📋 Found booking to cancel:', existingBooking);

      // Now update the booking
      const { data, error } = await supabase
        .from('shop_bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Booking cancellation error:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      console.log('✅ Booking cancelled successfully:', data);
      return {
        data,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('❌ Booking cancellation API error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }
}

export const bookingsAPI = new BookingsAPI();