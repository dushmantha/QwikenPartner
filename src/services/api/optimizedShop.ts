import { supabase } from '../../lib/supabase/index';

// Types for the optimized schema
export interface OptimizedShop {
  id: string;
  provider_id: string;
  name: string;
  description?: string;
  category?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  logo_url?: string;
  cover_image_url?: string;
  gallery_images?: string[];
  address_ids: string[];
  staff_ids: string[];
  service_ids: string[];
  discount_ids: string[];
  business_hours: BusinessHour[];
  timezone?: string;
  advance_booking_days?: number;
  slot_duration?: number;
  buffer_time?: number;
  auto_approval?: boolean;
  rating?: number;
  review_count?: number;
  is_active?: boolean;
  is_verified?: boolean;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopAddress {
  id: string;
  shop_id: string;
  address_type: string;
  street_address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

export interface ShopStaff {
  id: string;
  shop_id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  specialties?: string[];
  avatar_url?: string;
  hourly_rate?: number;
  commission_rate?: number;
  is_active: boolean;
  hire_date?: string;
}

export interface ShopService {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  category?: string;
  duration: number;
  price: number;
  currency: string;
  staff_ids: string[];
  is_active: boolean;
  display_order: number;
}

export interface ShopDiscount {
  id: string;
  shop_id: string;
  code?: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'first_time';
  discount_value: number;
  minimum_amount?: number;
  maximum_discount?: number;
  service_ids: string[];
  valid_from?: string;
  valid_until?: string;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
}

export interface BusinessHour {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface CompleteShopData {
  shop: OptimizedShop;
  addresses: ShopAddress[];
  staff: ShopStaff[];
  services: ShopService[];
  discounts: ShopDiscount[];
}

/**
 * OPTIMIZED SHOP SERVICE
 * Reduces database requests by using UUID arrays and batch fetching
 */
export class OptimizedShopService {
  
  /**
   * Create a new shop with all related data in optimized way
   * Single transaction with minimal requests
   */
  static async createShop(data: {
    shop: Omit<OptimizedShop, 'id' | 'address_ids' | 'staff_ids' | 'service_ids' | 'discount_ids' | 'created_at' | 'updated_at'>;
    addresses?: Omit<ShopAddress, 'id' | 'shop_id'>[];
    staff?: Omit<ShopStaff, 'id' | 'shop_id'>[];
    services?: Omit<ShopService, 'id' | 'shop_id'>[];
    discounts?: Omit<ShopDiscount, 'id' | 'shop_id'>[];
  }): Promise<{ success: boolean; data?: CompleteShopData; error?: string }> {
    try {
      // 1. Create the main shop record
      const { data: shopData, error: shopError } = await supabase
        .from('provider_businesses')
        .insert(data.shop)
        .select()
        .single();

      if (shopError) throw shopError;

      const shopId = shopData.id;

      // 2. Create addresses and collect IDs
      let addressIds: string[] = [];
      let addresses: ShopAddress[] = [];
      if (data.addresses && data.addresses.length > 0) {
        const addressInserts = data.addresses.map(addr => ({
          ...addr,
          shop_id: shopId,
        }));

        const { data: addressData, error: addressError } = await supabase
          .from('shop_addresses')
          .insert(addressInserts)
          .select();

        if (addressError) throw addressError;
        
        addresses = addressData;
        addressIds = addressData.map(addr => addr.id);
      }

      // 3. Create staff and collect IDs
      let staffIds: string[] = [];
      let staff: ShopStaff[] = [];
      if (data.staff && data.staff.length > 0) {
        const staffInserts = data.staff.map(member => ({
          ...member,
          shop_id: shopId,
        }));

        const { data: staffData, error: staffError } = await supabase
          .from('shop_staff')
          .insert(staffInserts)
          .select();

        if (staffError) throw staffError;
        
        staff = staffData;
        staffIds = staffData.map(member => member.id);
      }

      // 4. Create services and collect IDs
      let serviceIds: string[] = [];
      let services: ShopService[] = [];
      if (data.services && data.services.length > 0) {
        const serviceInserts = data.services.map(service => ({
          ...service,
          shop_id: shopId,
        }));

        const { data: serviceData, error: serviceError } = await supabase
          .from('shop_services')
          .insert(serviceInserts)
          .select();

        if (serviceError) throw serviceError;
        
        services = serviceData;
        serviceIds = serviceData.map(service => service.id);
      }

      // 5. Create discounts and collect IDs
      let discountIds: string[] = [];
      let discounts: ShopDiscount[] = [];
      if (data.discounts && data.discounts.length > 0) {
        const discountInserts = data.discounts.map(discount => ({
          ...discount,
          shop_id: shopId,
        }));

        const { data: discountData, error: discountError } = await supabase
          .from('shop_discounts')
          .insert(discountInserts)
          .select();

        if (discountError) throw discountError;
        
        discounts = discountData;
        discountIds = discountData.map(discount => discount.id);
      }

      // 6. Update the main shop record with all the collected IDs
      const { data: updatedShop, error: updateError } = await supabase
        .from('provider_businesses')
        .update({
          address_ids: addressIds,
          staff_ids: staffIds,
          service_ids: serviceIds,
          discount_ids: discountIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        success: true,
        data: {
          shop: updatedShop,
          addresses,
          staff,
          services,
          discounts,
        },
      };

    } catch (error) {
      console.error('Create shop error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create shop',
      };
    }
  }

  /**
   * Get complete shop data with single optimized query
   * Uses the ID arrays to fetch all related data efficiently
   */
  static async getCompleteShopData(shopId: string): Promise<{ success: boolean; data?: CompleteShopData; error?: string }> {
    try {
      // 1. Get the main shop record
      const { data: shop, error: shopError } = await supabase
        .from('provider_businesses')
        .select('*')
        .eq('id', shopId)
        .single();

      if (shopError) throw shopError;

      // 2. Batch fetch all related data using the ID arrays
      const [addressesResult, staffResult, servicesResult, discountsResult] = await Promise.all([
        // Addresses
        shop.address_ids && shop.address_ids.length > 0
          ? supabase
              .from('shop_addresses')
              .select('*')
              .in('id', shop.address_ids)
              .eq('is_active', true)
          : { data: [], error: null },

        // Staff
        shop.staff_ids && shop.staff_ids.length > 0
          ? supabase
              .from('shop_staff')
              .select('*')
              .in('id', shop.staff_ids)
              .eq('is_active', true)
          : { data: [], error: null },

        // Services
        shop.service_ids && shop.service_ids.length > 0
          ? supabase
              .from('shop_services')
              .select('*')
              .in('id', shop.service_ids)
              .eq('is_active', true)
              .order('display_order')
          : { data: [], error: null },

        // Discounts
        shop.discount_ids && shop.discount_ids.length > 0
          ? supabase
              .from('shop_discounts')
              .select('*')
              .in('id', shop.discount_ids)
              .eq('is_active', true)
          : { data: [], error: null },
      ]);

      // Check for errors
      if (addressesResult.error) throw addressesResult.error;
      if (staffResult.error) throw staffResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (discountsResult.error) throw discountsResult.error;

      return {
        success: true,
        data: {
          shop,
          addresses: addressesResult.data || [],
          staff: staffResult.data || [],
          services: servicesResult.data || [],
          discounts: discountsResult.data || [],
        },
      };

    } catch (error) {
      console.error('Get complete shop data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch shop data',
      };
    }
  }

  /**
   * Update shop business hours optimally
   */
  static async updateBusinessHours(shopId: string, businessHours: BusinessHour[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('provider_businesses')
        .update({
          business_hours: businessHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId);

      if (error) throw error;

      return { success: true };

    } catch (error) {
      console.error('Update business hours error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business hours',
      };
    }
  }

  /**
   * Add staff member and update shop's staff_ids array
   */
  static async addStaffMember(shopId: string, staffData: Omit<ShopStaff, 'id' | 'shop_id'>): Promise<{ success: boolean; data?: ShopStaff; error?: string }> {
    try {
      // 1. Create the staff member
      const { data: staff, error: staffError } = await supabase
        .from('shop_staff')
        .insert({
          ...staffData,
          shop_id: shopId,
        })
        .select()
        .single();

      if (staffError) throw staffError;

      // 2. Add staff ID to shop's staff_ids array
      const { error: updateError } = await supabase
        .rpc('add_to_uuid_array', {
          table_name: 'provider_businesses',
          id_field: 'id',
          target_id: shopId,
          array_field: 'staff_ids',
          new_id: staff.id,
        });

      if (updateError) {
        // Fallback: manual array update
        const { data: currentShop } = await supabase
          .from('provider_businesses')
          .select('staff_ids')
          .eq('id', shopId)
          .single();

        const updatedStaffIds = [...(currentShop?.staff_ids || []), staff.id];

        await supabase
          .from('provider_businesses')
          .update({
            staff_ids: updatedStaffIds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopId);
      }

      return {
        success: true,
        data: staff,
      };

    } catch (error) {
      console.error('Add staff member error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add staff member',
      };
    }
  }

  /**
   * Add service and update shop's service_ids array
   */
  static async addService(shopId: string, serviceData: Omit<ShopService, 'id' | 'shop_id'>): Promise<{ success: boolean; data?: ShopService; error?: string }> {
    try {
      // 1. Create the service
      const { data: service, error: serviceError } = await supabase
        .from('shop_services')
        .insert({
          ...serviceData,
          shop_id: shopId,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // 2. Add service ID to shop's service_ids array
      const { data: currentShop } = await supabase
        .from('provider_businesses')
        .select('service_ids')
        .eq('id', shopId)
        .single();

      const updatedServiceIds = [...(currentShop?.service_ids || []), service.id];

      await supabase
        .from('provider_businesses')
        .update({
          service_ids: updatedServiceIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId);

      return {
        success: true,
        data: service,
      };

    } catch (error) {
      console.error('Add service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add service',
      };
    }
  }

  /**
   * Get shops for a provider (lightweight - no related data)
   */
  static async getProviderShops(providerId: string): Promise<{ success: boolean; data?: OptimizedShop[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('provider_businesses')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };

    } catch (error) {
      console.error('Get provider shops error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch provider shops',
      };
    }
  }

  /**
   * Search shops with filters (public view)
   */
  static async searchShops(params: {
    city?: string;
    category?: string;
    rating?: number;
    limit?: number;
  }): Promise<{ success: boolean; data?: OptimizedShop[]; error?: string }> {
    try {
      let query = supabase
        .from('provider_businesses')
        .select('*')
        .eq('is_active', true);

      if (params.city) {
        // We'll need to join with addresses for city search
        // For now, this is a simplified version
        query = query.ilike('description', `%${params.city}%`);
      }

      if (params.category) {
        query = query.eq('category', params.category);
      }

      if (params.rating) {
        query = query.gte('rating', params.rating);
      }

      query = query
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(params.limit || 20);

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };

    } catch (error) {
      console.error('Search shops error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search shops',
      };
    }
  }
}