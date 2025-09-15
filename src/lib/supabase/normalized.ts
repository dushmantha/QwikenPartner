// Normalized Supabase Service - Separate Tables for Staff, Services, Discounts
// This service uses separate tables instead of JSONB arrays for better data integrity

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ==============================================
// CONFIGURATION
// ==============================================

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

// ==============================================
// TYPES
// ==============================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WorkSchedule {
  monday: { isWorking: boolean; startTime: string; endTime: string; };
  tuesday: { isWorking: boolean; startTime: string; endTime: string; };
  wednesday: { isWorking: boolean; startTime: string; endTime: string; };
  thursday: { isWorking: boolean; startTime: string; endTime: string; };
  friday: { isWorking: boolean; startTime: string; endTime: string; };
  saturday: { isWorking: boolean; startTime: string; endTime: string; };
  sunday: { isWorking: boolean; startTime: string; endTime: string; };
}

export interface LeaveDate {
  title: string;
  startDate: string;
  endDate: string;
  type: string;
}

export interface ShopStaff {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  specialties?: string[];
  bio?: string;
  experience_years?: number;
  avatar_url?: string;
  is_active?: boolean;
  work_schedule?: WorkSchedule;
  leave_dates?: LeaveDate[]; // Re-enabled after schema update
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id?: string;
  booking_id: string;
  provider_id: string;
  shop_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  service_title: string;
  service_type?: string;
  service_date: string;
  service_time?: string;
  duration?: string;
  amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  location_type?: 'in_house' | 'on_location';
  location?: string;
  invoice_sent?: boolean;
  invoice_number?: string;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
}

export interface ShopService {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  category?: string;
  assigned_staff?: string[];
  location_type?: 'in_house' | 'on_location';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopBusinessHours {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  day: string;
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
  is_always_open?: boolean;
  timezone?: string;
  priority?: number;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopSpecialDay {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  date: string; // ISO date string
  name: string;
  description?: string;
  type: 'holiday' | 'special_hours' | 'closed' | 'event';
  is_open?: boolean;
  open_time?: string;
  close_time?: string;
  is_always_open?: boolean;
  recurring?: 'none' | 'weekly' | 'monthly' | 'yearly';
  recurring_until?: string;
  color?: string;
  priority?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopDiscount {
  id?: string;
  shop_id?: string;
  provider_id?: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  used_count?: number;
  min_amount?: number;
  max_discount?: number;
  applicable_services?: string[];
  conditions?: any;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompleteShopData {
  // Basic shop info
  id?: string;
  provider_id?: string;
  name: string;
  description?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  image_url?: string;
  logo_url?: string;
  images?: string[];
  business_hours_start?: string;
  business_hours_end?: string;
  timezone?: string;
  advance_booking_days?: number;
  slot_duration?: number;
  buffer_time?: number;
  auto_approval?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Related data
  staff?: ShopStaff[];
  services?: ShopService[];
  business_hours?: ShopBusinessHours[];
  special_days?: ShopSpecialDay[];
  discounts?: ShopDiscount[];
}

// ==============================================
// SUPABASE CLIENT
// ==============================================

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'react-native-buzybees-normalized',
    },
  },
});

// ==============================================
// NORMALIZED SHOP SERVICE CLASS
// ==============================================

class NormalizedShopService {
  private client = supabase;

  constructor() {
    console.log('🏪 Normalized Shop Service initialized');
  }

  // ==============================================
  // AUTHENTICATION
  // ==============================================

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) {
        console.error('❌ Get current user error:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('❌ Get current user error:', error);
      return null;
    }
  }

  // ==============================================
  // SHOP MANAGEMENT
  // ==============================================

  async createShop(shopData: CompleteShopData): Promise<ServiceResponse<CompleteShopData>> {
    try {
      console.log('🏪 Creating shop with normalized tables...');
      
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Prepare shop data (basic fields only)
      const basicShopData = {
        name: shopData.name,
        description: shopData.description || '',
        category: shopData.category || 'Beauty & Wellness',
        address: shopData.address || '',
        city: shopData.city || '',
        state: shopData.state || '',
        country: shopData.country || 'Sweden',
        phone: shopData.phone || '',
        email: shopData.email || '',
        website_url: shopData.website_url,
        image_url: shopData.image_url || '',
        logo_url: shopData.logo_url || '',
        images: shopData.images || [],
        business_hours: shopData.business_hours || [], // Add the business_hours JSONB field
        special_days: shopData.special_days || [], // Add the special_days JSONB field
        business_hours_start: shopData.business_hours_start || '09:00',
        business_hours_end: shopData.business_hours_end || '17:00',
        timezone: shopData.timezone || 'Europe/Stockholm',
        advance_booking_days: shopData.advance_booking_days || 30,
        slot_duration: shopData.slot_duration || 60,
        buffer_time: shopData.buffer_time || 15,
        auto_approval: shopData.auto_approval ?? true,
        is_active: shopData.is_active ?? true
      };

      console.log('🏪 Calling create_shop_normalized function...');
      console.log('📊 Data counts:', {
        staff: shopData.staff?.length || 0,
        services: shopData.services?.length || 0,
        business_hours: shopData.business_hours?.length || 0,
        discounts: shopData.discounts?.length || 0
      });

      // Prepare schedule data from shop data
      const scheduleData = {
        name: `${shopData.name} Schedule`,
        description: `Business schedule for ${shopData.name}`,
        default_start_time: shopData.business_hours_start || '09:00',
        default_end_time: shopData.business_hours_end || '17:00',
        timezone: shopData.timezone || 'Europe/Stockholm',
        advance_booking_days: shopData.advance_booking_days || 30,
        slot_duration: shopData.slot_duration || 60,
        buffer_time: shopData.buffer_time || 15,
        auto_approval: shopData.auto_approval ?? true,
        cancellation_hours: 24,
        enable_breaks: false,
        observe_public_holidays: true
      };

      console.log('🗓️ Schedule data:', scheduleData);

      // Use the normalized database function
      const { data: result, error } = await this.client.rpc('create_shop_normalized', {
        p_provider_id: user.id,
        p_shop_data: basicShopData,
        p_staff: shopData.staff || [],
        p_services: shopData.services || [],
        p_business_hours: shopData.business_hours || [],
        p_discounts: shopData.discounts || [],
        p_schedule_data: scheduleData
      });

      if (error) {
        console.error('❌ Shop creation RPC error:', error);
        return {
          success: false,
          error: `Failed to create shop: ${error.message}`
        };
      }

      if (!result || !result.success) {
        console.error('❌ Shop creation failed:', result);
        return {
          success: false,
          error: result?.error || 'Shop creation failed'
        };
      }

      console.log('✅ Shop created successfully with normalized tables');
      
      // Fetch the complete shop data
      const completeShop = await this.getShopById(result.shop_id);
      
      return {
        success: true,
        data: completeShop.data,
        message: 'Shop created successfully with normalized data'
      };

    } catch (error) {
      console.error('❌ Unexpected shop creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getShopById(shopId: string): Promise<ServiceResponse<CompleteShopData>> {
    try {
      console.log('🔍 Fetching shop with normalized data:', shopId);

      // Fetch shop data and all related data in parallel
      const [shopResult, servicesResult, staffResult, discountsResult] = await Promise.all([
        // Shop basic data
        this.client
          .from('provider_businesses')
          .select('*')
          .eq('id', shopId)
          .single(),
        
        // Services
        this.client
          .from('shop_services')
          .select('*')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false }),
        
        // Staff
        this.client
          .from('shop_staff')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        
        // Discounts
        this.client
          .from('shop_discounts')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ]);

      if (shopResult.error) {
        console.error('❌ Get shop error:', shopResult.error);
        return {
          success: false,
          error: shopResult.error.message
        };
      }

      // Handle case where no shop is found
      if (!shopResult.data) {
        console.warn('⚠️ No shop found with ID:', shopId);
        return {
          success: false,
          error: `Shop with ID ${shopId} not found`
        };
      }

      // Combine all data
      const completeShopData = {
        ...shopResult.data,
        services: servicesResult.data || [],
        staff: staffResult.data || [],
        discounts: discountsResult.data || []
      };

      console.log('✅ Successfully fetched complete shop data');
      console.log('📊 Data fetched:', {
        shopName: completeShopData.name,
        servicesCount: completeShopData.services.length,
        staffCount: completeShopData.staff.length,
        discountsCount: completeShopData.discounts.length
      });
      
      return {
        success: true,
        data: completeShopData as CompleteShopData
      };

    } catch (error) {
      console.error('❌ Get shop error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateShop(shopId: string, shopData: CompleteShopData): Promise<ServiceResponse<CompleteShopData>> {
    try {
      console.log('🔄 Updating shop with normalized tables:', shopId);
      
      // CRITICAL DEBUG: Show what data was received
      console.log('🚨 RECEIVED SHOP DATA:');
      console.log('Shop Name:', shopData.name);
      console.log('Business Hours Received:', shopData.business_hours);
      console.log('Business Hours Count:', shopData.business_hours?.length || 0);
      console.log('Business Hours Sample:', shopData.business_hours?.[0]);
      

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Update basic shop data
      const basicShopData = {
        name: shopData.name,
        description: shopData.description || '',
        category: shopData.category || 'Beauty & Wellness',
        address: shopData.address || '',
        city: shopData.city || '',
        state: shopData.state || '',
        country: shopData.country || 'Sweden',
        phone: shopData.phone || '',
        email: shopData.email || '',
        website_url: shopData.website_url,
        image_url: shopData.image_url || '',
        logo_url: shopData.logo_url || '',
        images: shopData.images || [],
        business_hours: shopData.business_hours || [], // Add the business_hours JSONB field
        special_days: shopData.special_days || [], // Add the special_days JSONB field
        business_hours_start: shopData.business_hours_start || '09:00',
        business_hours_end: shopData.business_hours_end || '17:00',
        timezone: shopData.timezone || 'Europe/Stockholm',
        advance_booking_days: shopData.advance_booking_days || 30,
        slot_duration: shopData.slot_duration || 60,
        buffer_time: shopData.buffer_time || 15,
        auto_approval: shopData.auto_approval ?? true,
        is_active: shopData.is_active ?? true,
        updated_at: new Date().toISOString()
      };

      const { error: shopError } = await this.client
        .from('provider_businesses')
        .update(basicShopData)
        .eq('id', shopId)
        .eq('provider_id', user.id);

      if (shopError) {
        console.error('❌ Shop update error:', shopError);
        return {
          success: false,
          error: `Failed to update shop: ${shopError.message}`
        };
      }

      console.log('✅ Shop basic data updated successfully');

      // Update schedule data if shop has a schedule_id
      const { data: existingShop } = await this.client
        .from('provider_businesses')
        .select('schedule_id')
        .eq('id', shopId)
        .single();

      if (existingShop?.schedule_id) {
        console.log('🗓️ Updating schedule data for schedule_id:', existingShop.schedule_id);
        
        const scheduleUpdateData = {
          default_start_time: shopData.business_hours_start || '09:00',
          default_end_time: shopData.business_hours_end || '17:00',
          timezone: shopData.timezone || 'Europe/Stockholm',
          advance_booking_days: shopData.advance_booking_days || 30,
          slot_duration: shopData.slot_duration || 60,
          buffer_time: shopData.buffer_time || 15,
          auto_approval: shopData.auto_approval ?? true,
          updated_at: new Date().toISOString()
        };

        const { error: scheduleError } = await this.client
          .from('shop_schedules')
          .update(scheduleUpdateData)
          .eq('id', existingShop.schedule_id)
          .eq('provider_id', user.id);

        if (scheduleError) {
          console.error('❌ Schedule update error:', scheduleError);
          // Don't fail the entire operation, just log the error
          console.log('⚠️ Schedule update failed, but shop update succeeded');
        } else {
          console.log('✅ Schedule updated successfully');
        }
      }

      // Business hours are now updated directly in the provider_businesses table above
      // No need for separate business_hours table update
      if (shopData.business_hours && shopData.business_hours.length > 0) {
        console.log('✅ Business hours updated in provider_businesses table');
        console.log('🕐 Business hours count:', shopData.business_hours.length);
      } else {
        console.log('⚠️ No business hours provided');
        console.log('shopData.business_hours:', shopData.business_hours);
      }

      // Special days are now updated directly in the provider_businesses table above
      // No need for separate special_days table update
      if (shopData.special_days && shopData.special_days.length > 0) {
        console.log('✅ Special days updated in provider_businesses table');
        console.log('📅 Special days count:', shopData.special_days.length);
      } else {
        console.log('⚠️ No special days provided');
      }

      // Fetch the updated complete shop data
      const completeShop = await this.getShopById(shopId);
      
      return {
        success: true,
        data: completeShop.data,
        message: 'Shop and schedule updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected shop update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateShopSchedule(shopId: string, scheduleData: {
    business_hours_start?: string;
    business_hours_end?: string;
    timezone?: string;
    advance_booking_days?: number;
    slot_duration?: number;
    buffer_time?: number;
    auto_approval?: boolean;
    business_hours?: ShopBusinessHours[];
  }): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🗓️ Updating shop schedule only:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get the shop's schedule_id
      const { data: existingShop } = await this.client
        .from('provider_businesses')
        .select('schedule_id')
        .eq('id', shopId)
        .eq('provider_id', user.id)
        .single();

      if (!existingShop?.schedule_id) {
        return {
          success: false,
          error: 'Shop does not have a schedule. Please run the migration script first.'
        };
      }

      // Update schedule table
      const scheduleUpdateData = {
        default_start_time: scheduleData.business_hours_start || '09:00',
        default_end_time: scheduleData.business_hours_end || '17:00',
        timezone: scheduleData.timezone || 'Europe/Stockholm',
        advance_booking_days: scheduleData.advance_booking_days || 30,
        slot_duration: scheduleData.slot_duration || 60,
        buffer_time: scheduleData.buffer_time || 15,
        auto_approval: scheduleData.auto_approval ?? true,
        updated_at: new Date().toISOString()
      };

      const { error: scheduleError } = await this.client
        .from('shop_schedules')
        .update(scheduleUpdateData)
        .eq('id', existingShop.schedule_id)
        .eq('provider_id', user.id);

      if (scheduleError) {
        console.error('❌ Schedule update error:', scheduleError);
        return {
          success: false,
          error: `Failed to update schedule: ${scheduleError.message}`
        };
      }

      // Update business hours if provided
      if (scheduleData.business_hours && scheduleData.business_hours.length > 0) {
        console.log('🕐 Updating business hours for schedule');
        
        // Delete existing business hours for this shop
        await this.client
          .from('shop_business_hours')
          .delete()
          .eq('shop_id', shopId)
          .eq('provider_id', user.id);

        // Insert new business hours - handle both frontend and database formats
        const businessHoursToInsert = scheduleData.business_hours.map(hour => ({
          shop_id: shopId,
          provider_id: user.id,
          day: hour.day,
          // Handle frontend format (isOpen, openTime, closeTime) and database format (is_open, open_time, close_time)
          is_open: (hour as any).isOpen !== undefined ? (hour as any).isOpen : (hour.is_open ?? true),
          open_time: (hour as any).openTime || hour.open_time || '09:00',
          close_time: (hour as any).closeTime || hour.close_time || '17:00',
          is_always_open: (hour as any).isAlwaysOpen || hour.is_always_open || false,
          is_active: true
        }));

        const { error: businessHoursError } = await this.client
          .from('shop_business_hours')
          .insert(businessHoursToInsert);

        if (businessHoursError) {
          console.error('❌ Business hours update error:', businessHoursError);
          return {
            success: false,
            error: `Failed to update business hours: ${businessHoursError.message}`
          };
        }
      }

      console.log('✅ Schedule and business hours updated successfully');
      return {
        success: true,
        data: true,
        message: 'Schedule updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected schedule update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Convenient method to just update business hours
  async syncBusinessHours(shopId: string, businessHours: ShopBusinessHours[]): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🕐 Syncing business hours for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      if (!businessHours || businessHours.length === 0) {
        return {
          success: false,
          error: 'No business hours provided'
        };
      }

      // Delete existing business hours for this shop
      await this.client
        .from('shop_business_hours')
        .delete()
        .eq('shop_id', shopId)
        .eq('provider_id', user.id);

      // Insert new business hours - handle both frontend and database formats
      const businessHoursToInsert = businessHours.map(hour => ({
        shop_id: shopId,
        provider_id: user.id,
        day: hour.day,
        // Handle frontend format (isOpen, openTime, closeTime) and database format (is_open, open_time, close_time)
        is_open: (hour as any).isOpen !== undefined ? (hour as any).isOpen : (hour.is_open ?? true),
        open_time: (hour as any).openTime || hour.open_time || '09:00',
        close_time: (hour as any).closeTime || hour.close_time || '17:00',
        is_always_open: (hour as any).isAlwaysOpen || hour.is_always_open || false,
        is_active: true
      }));

      const { error: businessHoursError } = await this.client
        .from('shop_business_hours')
        .insert(businessHoursToInsert);

      if (businessHoursError) {
        console.error('❌ Business hours sync error:', businessHoursError);
        return {
          success: false,
          error: `Failed to sync business hours: ${businessHoursError.message}`
        };
      }

      console.log('✅ Business hours synced successfully');
      return {
        success: true,
        data: true,
        message: 'Business hours synced successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected business hours sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // STAFF MANAGEMENT
  // ==============================================

  async createStaff(shopId: string, staffData: ShopStaff): Promise<ServiceResponse<ShopStaff>> {
    try {
      console.log('👤 Creating staff member for shop:', shopId);
      console.log('👤 Staff data received:', JSON.stringify(staffData, null, 2));

      const user = await this.getCurrentUser();
      if (!user) {
        console.error('❌ User not authenticated');
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log('👤 User authenticated:', user.id);

      // Validate required data
      if (!shopId || !staffData.name || !staffData.email) {
        console.error('❌ Missing required staff data');
        console.error('  - shopId:', shopId);
        console.error('  - name:', staffData.name);
        console.error('  - email:', staffData.email);
        return {
          success: false,
          error: 'Missing required staff data (shopId, name, or email)'
        };
      }

      // Start with basic required fields
      const insertData: any = {
        shop_id: shopId,
        provider_id: user.id, // Add provider_id as the authenticated user's ID
        name: staffData.name,
        email: staffData.email,
        phone: staffData.phone || '',
        role: staffData.role || '',
        specialties: staffData.specialties || [],
        bio: staffData.bio || '',
        experience_years: staffData.experience_years || 0,
        avatar_url: staffData.avatar_url,
        is_active: staffData.is_active ?? true
      };

      // Re-enabled work_schedule and leave_dates after schema fix deployment
      if (staffData.work_schedule !== undefined) {
        insertData.work_schedule = staffData.work_schedule;
      }
      
      if (staffData.leave_dates !== undefined) {
        insertData.leave_dates = staffData.leave_dates;
      }

      console.log('👤 Inserting staff data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await this.client
        .from('shop_staff')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Staff creation error:', error);
        console.error('❌ Error code:', error.code || 'No error code');
        console.error('❌ Error details:', error.details || 'No error details');
        console.error('❌ Error hint:', error.hint || 'No error hint');
        
        // Check if it's a table not found error
        if (error.code === 'PGRST116' || (error.message && error.message.includes('does not exist'))) {
          return {
            success: false,
            error: 'Database table "shop_staff" does not exist. Please run the normalized schema SQL first.'
          };
        }
        
        return {
          success: false,
          error: `Failed to create staff: ${error.message}`
        };
      }

      console.log('✅ Staff created successfully:', data?.name);
      return {
        success: true,
        data: data as ShopStaff
      };

    } catch (error) {
      console.error('❌ Unexpected staff creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateStaff(staffId: string, staffData: Partial<ShopStaff>): Promise<ServiceResponse<ShopStaff>> {
    try {
      console.log('👤 Updating staff member:', staffId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Prepare update data, excluding fields that might not exist in DB yet
      const updateData: any = {
        name: staffData.name,
        email: staffData.email,
        phone: staffData.phone,
        role: staffData.role,
        specialties: staffData.specialties,
        bio: staffData.bio,
        experience_years: staffData.experience_years,
        avatar_url: staffData.avatar_url,
        is_active: staffData.is_active,
        updated_at: new Date().toISOString()
      };

      // Re-enabled work_schedule and leave_dates after schema fix deployment
      if (staffData.work_schedule !== undefined) {
        updateData.work_schedule = staffData.work_schedule;
      }
      if (staffData.leave_dates !== undefined) {
        updateData.leave_dates = staffData.leave_dates;
      }

      // First check if the staff belongs to a shop owned by the user
      const { data: staff, error: staffError } = await this.client
        .from('shop_staff')
        .select('shop_id')
        .eq('id', staffId)
        .single();

      if (staffError || !staff) {
        return {
          success: false,
          error: 'Staff member not found'
        };
      }

      // Check if the shop belongs to the user
      const { data: shop, error: shopError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('id', staff.shop_id)
        .eq('provider_id', user.id)
        .single();

      if (shopError || !shop) {
        return {
          success: false,
          error: 'Unauthorized: You can only update staff from your own shops'
        };
      }

      const { data, error } = await this.client
        .from('shop_staff')
        .update(updateData)
        .eq('id', staffId)
        .select()
        .single();

      if (error) {
        console.error('❌ Staff update error:', error);
        return {
          success: false,
          error: `Failed to update staff: ${error.message}`
        };
      }

      console.log('✅ Staff updated successfully');
      return {
        success: true,
        data: data as ShopStaff
      };

    } catch (error) {
      console.error('❌ Unexpected staff update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getStaffByShopId(shopId: string): Promise<ServiceResponse<ShopStaff[]>> {
    try {
      console.log('👥 Fetching all staff for shop:', shopId);

      // Check if we should use mock data
      const { shouldUseMockData, mockDelay, logMockUsage } = await import('../../config/devConfig');
      const { getMockStaff } = await import('../../data/mockData');
      
      if (shouldUseMockData('MOCK_STAFF')) {
        logMockUsage('NormalizedShopService.getStaffByShopId', `for shop ${shopId}`);
        await mockDelay();
        
        const mockStaffData = getMockStaff(shopId);
        console.log('🎭 Using mock staff data:', mockStaffData.length);
        
        // Transform mock staff to expected format
        const transformedStaff: ShopStaff[] = mockStaffData.map(staff => ({
          id: staff.id,
          shop_id: staff.shopId,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
          avatar_url: staff.avatar,
          bio: staff.bio,
          specialties: staff.specialties,
          rating: staff.rating,
          review_count: staff.reviewCount,
          experience_years: staff.experienceYears,
          is_active: staff.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        return {
          success: true,
          data: transformedStaff
        };
      }

      const { data, error } = await this.client
        .from('shop_staff')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Get staff error:', error);
        return {
          success: false,
          error: `Failed to fetch staff: ${error.message}`
        };
      }

      console.log('✅ Staff fetched successfully:', data?.length || 0, 'members');
      // Log the first staff member to check if new fields are included
      if (data && data.length > 0) {
        console.log('📋 Sample staff data:', {
          name: data[0].name,
          // Re-enabled after schema fix deployment
          hasWorkSchedule: !!data[0].work_schedule,
          hasLeaveDates: !!data[0].leave_dates,
          workSchedule: data[0].work_schedule,
          leaveDates: data[0].leave_dates
        });
      }

      return {
        success: true,
        data: data as ShopStaff[]
      };

    } catch (error) {
      console.error('❌ Unexpected get staff error:', error);
      return {
        success: false,
        error: 'Failed to fetch staff members'
      };
    }
  }

  async deleteStaff(staffId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('👤 Deleting staff member:', staffId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // First check if the staff belongs to a shop owned by the user
      const { data: staff, error: staffError } = await this.client
        .from('shop_staff')
        .select('shop_id')
        .eq('id', staffId)
        .single();

      if (staffError || !staff) {
        return {
          success: false,
          error: 'Staff member not found'
        };
      }

      // Check if the shop belongs to the user
      const { data: shop, error: shopError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('id', staff.shop_id)
        .eq('provider_id', user.id)
        .single();

      if (shopError || !shop) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete staff from your own shops'
        };
      }

      const { error } = await this.client
        .from('shop_staff')
        .delete()
        .eq('id', staffId);

      if (error) {
        console.error('❌ Staff deletion error:', error);
        return {
          success: false,
          error: `Failed to delete staff: ${error.message}`
        };
      }

      console.log('✅ Staff deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected staff deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // SERVICE MANAGEMENT
  // ==============================================


  async updateService(serviceId: string, serviceData: Partial<ShopService>): Promise<ServiceResponse<ShopService>> {
    try {
      console.log('🛠️ Updating service:', serviceId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if the service belongs to the current user
      const { data: service, error: serviceError } = await this.client
        .from('shop_services')
        .select('shop_id, provider_id')
        .eq('id', serviceId)
        .single();

      if (serviceError || !service) {
        return {
          success: false,
          error: 'Service not found'
        };
      }

      // Check if the service belongs to the current user
      console.log('🔍 Checking service ownership - service.provider_id:', service.provider_id, 'user.id:', user.id);
      
      if (service.provider_id !== user.id) {
        console.error('❌ Service ownership verification failed');
        return {
          success: false,
          error: 'Unauthorized: You can only update services from your own shops'
        };
      }

      // Map fields to match database schema
      const updateData = {
        name: serviceData.name,
        description: serviceData.description,
        category: serviceData.category,
        price: serviceData.price || 0,
        duration: serviceData.duration || 60,
        location_type: serviceData.location_type,
        assigned_staff: serviceData.assigned_staff,
        is_active: serviceData.is_active,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('shop_services')
        .update(updateData)
        .eq('id', serviceId)
        .select()
        .single();

      if (error) {
        console.error('❌ Service update error:', error);
        return {
          success: false,
          error: `Failed to update service: ${error.message}`
        };
      }

      console.log('✅ Service updated successfully');
      return {
        success: true,
        data: data as ShopService
      };

    } catch (error) {
      console.error('❌ Unexpected service update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteService(serviceId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🛠️ Deleting service:', serviceId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // First check if the service belongs to a shop owned by the user
      const { data: service, error: serviceError } = await this.client
        .from('shop_services')
        .select('shop_id')
        .eq('id', serviceId)
        .single();

      if (serviceError || !service) {
        return {
          success: false,
          error: 'Service not found'
        };
      }

      // Check if the shop belongs to the user
      const { data: shop, error: shopError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('id', service.shop_id)
        .eq('provider_id', user.id)
        .single();

      if (shopError || !shop) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete services from your own shops'
        };
      }

      const { error } = await this.client
        .from('shop_services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        console.error('❌ Service deletion error:', error);
        return {
          success: false,
          error: `Failed to delete service: ${error.message}`
        };
      }

      console.log('✅ Service deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected service deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // BUSINESS HOURS MANAGEMENT
  // ==============================================

  async createBusinessHours(shopId: string, businessHoursData: ShopBusinessHours): Promise<ServiceResponse<ShopBusinessHours>> {
    try {
      console.log('🕐 Creating business hours for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_business_hours')
        .insert({
          shop_id: shopId,
          provider_id: user.id,
          day: businessHoursData.day,
          is_open: businessHoursData.is_open ?? true,
          open_time: businessHoursData.open_time || '09:00',
          close_time: businessHoursData.close_time || '17:00',
          is_always_open: businessHoursData.is_always_open ?? false,
          is_active: businessHoursData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Business hours creation error:', error);
        return {
          success: false,
          error: `Failed to create business hours: ${error.message}`
        };
      }

      console.log('✅ Business hours created successfully for:', data.day);
      return {
        success: true,
        data: data as ShopBusinessHours
      };

    } catch (error) {
      console.error('❌ Unexpected business hours creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateBusinessHours(businessHoursId: string, businessHoursData: Partial<ShopBusinessHours>): Promise<ServiceResponse<ShopBusinessHours>> {
    try {
      console.log('🕐 Updating business hours:', businessHoursId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_business_hours')
        .update({
          ...businessHoursData,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessHoursId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Business hours update error:', error);
        return {
          success: false,
          error: `Failed to update business hours: ${error.message}`
        };
      }

      console.log('✅ Business hours updated successfully');
      return {
        success: true,
        data: data as ShopBusinessHours
      };

    } catch (error) {
      console.error('❌ Unexpected business hours update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteBusinessHours(businessHoursId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🕐 Deleting business hours:', businessHoursId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('shop_business_hours')
        .delete()
        .eq('id', businessHoursId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Business hours deletion error:', error);
        return {
          success: false,
          error: `Failed to delete business hours: ${error.message}`
        };
      }

      console.log('✅ Business hours deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected business hours deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBusinessHours(shopId: string): Promise<ServiceResponse<ShopBusinessHours[]>> {
    try {
      console.log('🕐 Fetching business hours for shop:', shopId);

      const { data, error } = await this.client
        .from('shop_business_hours')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('day');

      if (error) {
        console.error('❌ Get business hours error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched business hours:', data?.length || 0);
      return {
        success: true,
        data: data as ShopBusinessHours[] || []
      };

    } catch (error) {
      console.error('❌ Get business hours error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // SPECIAL DAYS MANAGEMENT
  // ==============================================

  async createSpecialDay(shopId: string, specialDayData: ShopSpecialDay): Promise<ServiceResponse<ShopSpecialDay>> {
    try {
      console.log('📅 Creating special day for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_special_days')
        .insert({
          shop_id: shopId,
          provider_id: user.id,
          date: specialDayData.date,
          name: specialDayData.name,
          description: specialDayData.description || '',
          type: specialDayData.type || 'holiday',
          is_open: specialDayData.is_open ?? false,
          open_time: specialDayData.open_time,
          close_time: specialDayData.close_time,
          is_always_open: specialDayData.is_always_open ?? false,
          recurring: specialDayData.recurring || 'none',
          recurring_until: specialDayData.recurring_until,
          color: specialDayData.color || '#FF6B6B',
          priority: specialDayData.priority || 0,
          is_active: specialDayData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Special day creation error:', error);
        return {
          success: false,
          error: `Failed to create special day: ${error.message}`
        };
      }

      console.log('✅ Special day created successfully:', data.name);
      return {
        success: true,
        data: data as ShopSpecialDay
      };

    } catch (error) {
      console.error('❌ Unexpected special day creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateSpecialDay(specialDayId: string, specialDayData: Partial<ShopSpecialDay>): Promise<ServiceResponse<ShopSpecialDay>> {
    try {
      console.log('📅 Updating special day:', specialDayId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_special_days')
        .update({
          ...specialDayData,
          updated_at: new Date().toISOString()
        })
        .eq('id', specialDayId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Special day update error:', error);
        return {
          success: false,
          error: `Failed to update special day: ${error.message}`
        };
      }

      console.log('✅ Special day updated successfully');
      return {
        success: true,
        data: data as ShopSpecialDay
      };

    } catch (error) {
      console.error('❌ Unexpected special day update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteSpecialDay(specialDayId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('📅 Deleting special day:', specialDayId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('shop_special_days')
        .delete()
        .eq('id', specialDayId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Special day deletion error:', error);
        return {
          success: false,
          error: `Failed to delete special day: ${error.message}`
        };
      }

      console.log('✅ Special day deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected special day deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSpecialDays(shopId: string, startDate?: string, endDate?: string): Promise<ServiceResponse<ShopSpecialDay[]>> {
    try {
      console.log('📅 Fetching special days for shop:', shopId);

      let query = this.client
        .from('shop_special_days')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('date');

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get special days error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched special days:', data?.length || 0);
      return {
        success: true,
        data: data as ShopSpecialDay[] || []
      };

    } catch (error) {
      console.error('❌ Get special days error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get effective hours for a specific date (considering special days)
  async getEffectiveHours(shopId: string, date: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Getting effective hours for shop:', shopId, 'date:', date);

      const { data, error } = await this.client.rpc('get_effective_hours_for_date', {
        p_shop_id: shopId,
        p_date: date
      });

      if (error) {
        console.error('❌ Get effective hours error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched effective hours');
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Get effective hours error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // BOOKING MANAGEMENT
  
  async createBooking(bookingData: {
    shop_id: string;
    service_id: string;
    assigned_staff_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    duration: number;
    service_price: number;
    total_price: number;
    notes?: string;
    timezone?: string;
    service_option_ids?: string[];
    discount_id?: string;
    service_name?: string;
    price?: number;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Creating booking:', bookingData);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Skip conflict check if function doesn't exist (schema not deployed)
      try {
        const { data: conflictCheck, error: conflictError } = await this.client
          .rpc('check_booking_conflict', {
            p_shop_id: bookingData.shop_id,
            p_staff_id: bookingData.assigned_staff_id || null,
            p_booking_date: bookingData.booking_date,
            p_start_time: bookingData.start_time,
            p_end_time: bookingData.end_time
          });

        if (conflictError) {
          console.warn('⚠️ Conflict check failed, proceeding without check:', conflictError.message);
        } else if (conflictCheck) {
          return {
            success: false,
            error: 'This time slot is already booked'
          };
        }
      } catch (error) {
        console.warn('⚠️ Conflict check function not available, proceeding without check');
      }

      // For proper booking creation, we need a service_id
      // If no service_id is provided, we need the user to deploy the schema first
      if (!bookingData.service_id) {
        return {
          success: false,
          error: 'No service selected. Please deploy the comprehensive booking schema first to enable service management, then create services before making bookings.'
        };
      }

      // Get the provider_id from the shop
      let providerId = null;
      try {
        console.log('🔍 Looking for shop with ID:', bookingData.shop_id);
        
        const { data: shop, error: shopError } = await this.client
          .from('provider_businesses')
          .select('id, provider_id, name')
          .eq('id', bookingData.shop_id)
          .single();
        
        console.log('🔍 Shop query result:', { shop, shopError });
        
        if (shopError || !shop) {
          console.error('❌ Could not find shop with ID:', bookingData.shop_id);
          console.error('❌ Shop error:', shopError);
          
          // Try to find any shop as fallback
          const { data: anyShop, error: anyShopError } = await this.client
            .from('provider_businesses')
            .select('id, provider_id, name')
            .eq('is_active', true)
            .limit(1)
            .single();
            
          if (anyShopError || !anyShop) {
            console.error('❌ No shops found at all');
            return {
              success: false,
              error: 'Shop not found - please check the shop ID'
            };
          }
          
          console.log('⚠️ Using fallback shop:', anyShop);
          providerId = anyShop.provider_id;
          
          // Update the booking data to use the correct shop
          bookingData.shop_id = anyShop.id;
        } else {
          providerId = shop.provider_id;
          console.log('✅ Found shop:', shop.name, 'with provider_id:', providerId);
        }
      } catch (error) {
        console.error('❌ Error getting shop provider:', error);
        return {
          success: false,
          error: 'Failed to get shop information'
        };
      }
      
      // Validate provider_id - if null, try to use the authenticated user as provider
      if (!providerId) {
        console.warn('⚠️ Provider ID is null in shop record, using authenticated user as fallback');
        providerId = user.id; // Use the current authenticated user as the provider
        
        // Update the shop record to have this provider_id for future bookings
        const { error: updateError } = await this.client
          .from('provider_businesses')
          .update({ provider_id: user.id })
          .eq('id', bookingData.shop_id);
          
        if (updateError) {
          console.warn('⚠️ Could not update shop provider_id:', updateError);
        } else {
          console.log('✅ Updated shop with provider_id:', user.id);
        }
      }

      // Find or create customer record
      let customerId = null;
      try {
        // First try to find existing customer by phone
        const { data: existingCustomer } = await this.client
          .from('customers')
          .select('id')
          .eq('phone', bookingData.customer_phone)
          .eq('provider_id', providerId) // Use provider_id from shop
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          console.log('📱 Found existing customer:', customerId);
        } else {
          // Create new customer
          const { data: newCustomer, error: customerError } = await this.client
            .from('customers')
            .insert({
              name: bookingData.customer_name,
              phone: bookingData.customer_phone,
              email: bookingData.customer_email || null,
              provider_id: providerId, // Use provider_id from shop
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (customerError) {
            console.log('⚠️ Could not create customer, using null customer_id:', customerError.message);
            customerId = null;
          } else {
            customerId = newCustomer.id;
            console.log('✅ Created new customer:', customerId);
          }
        }
      } catch (error) {
        console.log('⚠️ Customer lookup/creation failed, using null customer_id:', error.message);
        customerId = null;
      }

      // Create booking record compatible with enhanced schema
      const bookingRecord = {
        // Primary relationships
        customer_id: user.id, // Use authenticated user ID for booking lookup
        shop_id: bookingData.shop_id,
        provider_id: providerId, // Provider who owns the shop (from shop lookup)
        staff_id: bookingData.assigned_staff_id || null, // Can be null for "any staff"
        service_id: bookingData.service_id,
        
        // Service options and discounts
        service_option_ids: bookingData.service_option_ids || [],
        discount_id: bookingData.discount_id || null,
        
        // Customer information
        customer_name: bookingData.customer_name,
        customer_phone: bookingData.customer_phone,
        customer_email: bookingData.customer_email || null,
        
        // Booking date and time
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        timezone: bookingData.timezone || 'UTC',
        
        // Service snapshot
        service_name: bookingData.service_name || 'Service',
        
        // Pricing
        total_price: Number(bookingData.total_price || bookingData.price || 0),
        
        // Status
        status: 'confirmed',
        
        // Notes
        notes: bookingData.notes || null
      };

      // All fields are now set in the bookingRecord object above

      console.log('📝 Creating booking with customer_id:', user.id);
      console.log('📝 Booking record keys:', Object.keys(bookingRecord));

      const { data, error } = await this.client
        .from('shop_bookings')
        .insert(bookingRecord)
        .select()
        .single();

      if (error) {
        console.error('❌ Booking creation error:', error);
        
        // Handle foreign key constraint violation (schema not deployed)
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          console.warn('⚠️ New schema not deployed, trying fallback booking creation');
          
          // Fallback to minimal booking creation with only existing columns
          const fallbackRecord: any = {
            customer_id: user.id, // Use authenticated user ID for booking lookup
            shop_id: bookingData.shop_id,
            customer_name: bookingData.customer_name,
            customer_phone: bookingData.customer_phone,
            booking_date: bookingData.booking_date,
            start_time: bookingData.start_time,
            end_time: bookingData.end_time,
            total_price: Number(bookingData.total_price || 0),
            status: 'confirmed'
          };
          
          // Only add optional fields if they exist
          if (bookingData.customer_email) {
            fallbackRecord.customer_email = bookingData.customer_email;
          }
          if (bookingData.notes) {
            fallbackRecord.notes = bookingData.notes;
          }

          const { data: fallbackData, error: fallbackError } = await this.client
            .from('shop_bookings')
            .insert(fallbackRecord)
            .select()
            .single();

          if (fallbackError) {
            console.error('❌ Fallback booking creation failed:', fallbackError);
            
            // If even the minimal fallback fails, create a super minimal booking
            if (fallbackError.code === '42703' || fallbackError.message?.includes('does not exist')) {
              console.warn('⚠️ Trying super minimal booking creation');
              const minimalRecord = {
                shop_id: bookingData.shop_id,
                customer_name: bookingData.customer_name,
                customer_phone: bookingData.customer_phone,
                booking_date: bookingData.booking_date,
                start_time: bookingData.start_time,
                end_time: bookingData.end_time
              };

              const { data: minimalData, error: minimalError } = await this.client
                .from('shop_bookings')
                .insert(minimalRecord)
                .select()
                .single();

              if (minimalError) {
                return {
                  success: false,
                  error: `Database schema incompatible. Please deploy the comprehensive booking schema: ${minimalError.message}`
                };
              }

              return {
                success: true,
                data: minimalData,
                warning: 'Booking created with minimal data. Please deploy the new schema for full features.'
              };
            }
            
            return {
              success: false,
              error: `Please deploy the new booking schema first: ${fallbackError.message}`
            };
          }

          return {
            success: true,
            data: fallbackData
          };
        }
        
        // Handle missing column errors gracefully
        if (error.code === '42703' || error.message?.includes('does not exist')) {
          console.warn('⚠️ Database schema issue - some columns may be missing, trying basic schema');
          
          // Try with most basic schema - only essential columns
          const basicRecord = {
            customer_id: user.id,
            shop_id: bookingData.shop_id,
            service_id: bookingData.service_id,
            staff_id: bookingData.assigned_staff_id || null,
            customer_name: bookingData.customer_name,
            customer_phone: bookingData.customer_phone,
            booking_date: bookingData.booking_date,
            start_time: bookingData.start_time,
            end_time: bookingData.end_time,
            total_price: Number(bookingData.total_price || 0),
            status: 'confirmed'
          };

          // Only add fields if they're provided and might exist in schema
          if (bookingData.customer_email) {
            basicRecord.customer_email = bookingData.customer_email;
          }
          if (bookingData.notes) {
            basicRecord.notes = bookingData.notes;
          }

          const { data: basicData, error: basicError } = await this.client
            .from('shop_bookings')
            .insert(basicRecord)
            .select()
            .single();

          if (basicError) {
            console.error('❌ Basic booking creation also failed:', basicError);
            
            // Final ultra-minimal fallback
            const ultraMinimalRecord = {
              shop_id: bookingData.shop_id,
              customer_name: bookingData.customer_name,
              customer_phone: bookingData.customer_phone,
              booking_date: bookingData.booking_date,
              start_time: bookingData.start_time,
              end_time: bookingData.end_time,
              total_price: Number(bookingData.total_price || 0),
              status: 'confirmed'
            };

            const { data: ultraData, error: ultraError } = await this.client
              .from('shop_bookings')
              .insert(ultraMinimalRecord)
              .select()
              .single();

            if (ultraError) {
              return {
                success: false,
                error: `Database schema incompatible. Error: ${ultraError.message}. Please ensure the shop_bookings table has the required columns.`
              };
            }

            return {
              success: true,
              data: ultraData,
              warning: 'Booking created with minimal data. Database schema should be updated for full functionality.'
            };
          }

          return {
            success: true,
            data: basicData,
            warning: 'Booking created successfully. Consider updating the database schema for enhanced features.'
          };
        }
        
        return {
          success: false,
          error: `Failed to create booking: ${error.message}`
        };
      }

      console.log('✅ Booking created successfully');
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Unexpected booking creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Service management methods - supports both old and new calling patterns
  async createService(shopIdOrServiceData: string | any, serviceData?: any): Promise<ServiceResponse<any>> {
    try {
      let actualServiceData;
      let shopId;
      
      // Handle both calling patterns: createService(shopId, serviceData) and createService(serviceData)
      if (typeof shopIdOrServiceData === 'string') {
        // Old pattern: createService(shopId, serviceData)
        shopId = shopIdOrServiceData;
        actualServiceData = serviceData;
        console.log('🛠️ Creating service for shop (old pattern):', shopId);
      } else {
        // New pattern: createService(serviceData)
        actualServiceData = shopIdOrServiceData;
        shopId = actualServiceData.shop_id;
        console.log('🛠️ Creating service (new pattern):', actualServiceData.name);
      }

      if (!shopId) {
        return {
          success: false,
          error: 'Shop ID is required to create a service'
        };
      }

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Normalize the service data to the new schema format
      const serviceRecord = {
        shop_id: shopId,
        provider_id: user.id,
        name: actualServiceData.name,
        description: actualServiceData.description || '',
        category: actualServiceData.category || '',
        price: Number(actualServiceData.price || 0),
        duration: actualServiceData.duration || 60,
        location_type: actualServiceData.location_type || 'in_house',
        is_active: actualServiceData.is_active ?? true
      };

      const { data, error } = await this.client
        .from('shop_services')
        .insert(serviceRecord)
        .select()
        .single();

      if (error) {
        console.error('❌ Service creation error:', error);
        return {
          success: false,
          error: `Failed to create service: ${error.message}`
        };
      }

      console.log('✅ Service created successfully');
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Unexpected service creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Service Options management methods
  async createServiceOptions(serviceId: string, options: any[]): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🛠️ Creating service options for service:', serviceId);
      
      // First, let's check what columns actually exist in the service_options table
      try {
        const { data: columnCheck, error: columnError } = await this.client
          .from('service_options')
          .select('*')
          .limit(1);
        console.log('📋 Service options table columns check:', columnCheck);
        if (columnError) {
          console.log('📋 Column check error:', columnError);
        }
        
        // Also try to get table schema information via a simple insert test
        try {
          const testInsert = await this.client
            .from('service_options')
            .insert({
              service_id: 'test-id',
              name: 'test-name'
            })
            .select();
          console.log('📋 Minimal test insert result:', testInsert);
          
          // Clean up the test record if it was created
          if (testInsert.data && testInsert.data.length > 0) {
            await this.client
              .from('service_options')
              .delete()
              .eq('service_id', 'test-id');
          }
        } catch (testError) {
          console.log('📋 Test insert error (this helps us understand required fields):', testError);
        }
      } catch (columnCheckError) {
        console.log('📋 Column check failed:', columnCheckError);
      }
      
      if (!options || options.length === 0) {
        return { success: true, data: [] };
      }

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get the service to verify ownership and get shop_id
      const { data: service, error: serviceError } = await this.client
        .from('shop_services')
        .select('shop_id')
        .eq('id', serviceId)
        .single();

      if (serviceError || !service) {
        return {
          success: false,
          error: 'Service not found or unauthorized'
        };
      }

      // Start with a minimal approach to avoid schema cache issues
      // First try without any duration fields since that's causing the error
      const optionsData = options.map((option, index) => ({
        service_id: serviceId,
        option_name: option.option_name,
        option_description: option.option_description || '',
        price: Number(option.price) || 0,
        duration: Number(option.duration) || 30,
        is_active: option.is_active ?? true
      }));

      const { data, error } = await this.client
        .from('service_options')
        .insert(optionsData)
        .select();

      if (error) {
        console.error('❌ Service options creation error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ Options data that failed:', JSON.stringify(optionsData, null, 2));
        
        // If it's still a column not found error, try even more simplified version
        if (error.message.includes('column') || error.message.includes('price_adjustment') || error.message.includes('description')) {
          console.log('🔄 Trying more simplified service options insert...');
          
          const simplifiedData = options.map((option, index) => ({
            service_id: serviceId,
            option_name: option.option_name
          }));
          
          const { data: retryData, error: retryError } = await this.client
            .from('service_options')
            .insert(simplifiedData)
            .select();
            
          if (retryError) {
            console.error('❌ Simplified service options creation also failed:', retryError);
            console.error('❌ Retry error details:', JSON.stringify(retryError, null, 2));
            
            // Try an ultra-minimal version with just required fields
            if (retryError.message.includes('shop_id') || retryError.message.includes('column')) {
              console.log('🔄 Trying ultra-minimal service options insert...');
              
              const minimalData = options.map((option, index) => ({
                service_id: serviceId,
                option_name: option.option_name,
                price: Number(option.price) || 0
              }));
              
              const { data: minimalRetryData, error: minimalRetryError } = await this.client
                .from('service_options')
                .insert(minimalData)
                .select();
                
              if (minimalRetryError) {
                console.error('❌ Ultra-minimal service options creation also failed:', minimalRetryError);
                console.error('❌ Ultra-minimal error details:', JSON.stringify(minimalRetryError, null, 2));
                
                // Final attempt - just service_id and name
                if (minimalRetryError.message.includes('column') || minimalRetryError.message.includes('price_adjustment')) {
                  console.log('🔄 Trying absolute minimal service options insert (just service_id + name)...');
                  
                  const absoluteMinimalData = options.map((option, index) => ({
                    service_id: serviceId,
                    option_name: option.option_name
                  }));
                  
                  const { data: absoluteMinimalRetryData, error: absoluteMinimalRetryError } = await this.client
                    .from('service_options')
                    .insert(absoluteMinimalData)
                    .select();
                    
                  if (absoluteMinimalRetryError) {
                    console.error('❌ Absolute minimal service options creation also failed:', absoluteMinimalRetryError);
                    return {
                      success: false,
                      error: `Failed to create service options after all attempts: ${absoluteMinimalRetryError.message}. The database table might not exist or have a completely different structure.`
                    };
                  }
                  
                  console.log('✅ Service options created with absolute minimal data');
                  return {
                    success: true,
                    data: absoluteMinimalRetryData || []
                  };
                }
                
                return {
                  success: false,
                  error: `Failed to create service options after multiple attempts: ${minimalRetryError.message}`
                };
              }
              
              console.log('✅ Service options created with minimal data');
              return {
                success: true,
                data: minimalRetryData || []
              };
            }
            
            return {
              success: false,
              error: `Failed to create service options: ${retryError.message}`
            };
          }
          
          console.log('✅ Service options created with simplified data');
          return {
            success: true,
            data: retryData || []
          };
        }
        
        return {
          success: false,
          error: `Failed to create service options: ${error.message}`
        };
      }

      console.log('✅ Service options created successfully:', data?.length);
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('❌ Unexpected service options creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getServiceOptions(serviceId: string): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('service_options')
        .select('*')
        .eq('service_id', serviceId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('❌ Service options fetch error:', error);
        return {
          success: false,
          error: `Failed to fetch service options: ${error.message}`
        };
      }

      // Normalize the data to handle both schema formats
      const normalizedData = (data || []).map((option: any) => ({
        id: option.id,
        option_name: option.option_name || option.name,
        option_description: option.option_description || option.description || '',
        price: option.price || option.price_adjustment || 0,
        duration: option.duration || option.duration_adjustment || 60,
        is_active: option.is_active ?? true,
        sort_order: option.sort_order ?? 0
      }));

      return {
        success: true,
        data: normalizedData
      };

    } catch (error) {
      console.error('❌ Unexpected service options fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateServiceOptions(serviceId: string, options: any[]): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🛠️ Updating service options for service:', serviceId);

      // First, delete existing options
      await this.client
        .from('service_options')
        .delete()
        .eq('service_id', serviceId);

      // Then create new options if any
      if (options && options.length > 0) {
        return await this.createServiceOptions(serviceId, options);
      }

      return { success: true, data: [] };

    } catch (error) {
      console.error('❌ Unexpected service options update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getServices(shopId: string): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🔍 SERVICE LOADING DEBUG:');
      console.log('🔍 Requested shop_id:', shopId);
      console.log('🔍 Query: SELECT * FROM shop_services WHERE shop_id =', shopId, 'AND is_active = true');
      
      // First try with is_active filter
      let { data, error } = await this.client
        .from('shop_services')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name');
        
      // If no results with is_active=true, try without the filter
      if (!error && (!data || data.length === 0)) {
        console.log('🔍 No services with is_active=true, trying without filter...');
        ({ data, error } = await this.client
          .from('shop_services')
          .select('*')
          .eq('shop_id', shopId)
          .order('name'));
        console.log('🔍 Without filter - Data count:', data?.length || 0);
      }

      console.log('🔍 SERVICE QUERY RESULT:');
      console.log('🔍 Error:', error?.message);
      console.log('🔍 Data count:', data?.length || 0);
      console.log('🔍 Raw data:', data);

      if (error) {
        console.error('❌ Error fetching services:', error);
        return {
          success: false,
          error: `Failed to fetch services: ${error.message}`
        };
      }

      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching services:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAvailableTimeSlots(
    shopId: string,
    serviceId: string,
    date: string,
    staffId?: string
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🕐 Getting available time slots:', { shopId, serviceId, date, staffId });

      const { data, error } = await this.client
        .rpc('get_available_slots', {
          p_shop_id: shopId,
          p_service_id: serviceId,
          p_date: date,
          p_staff_id: staffId || null
        });

      if (error) {
        console.error('❌ Error getting available slots:', error);
        return {
          success: false,
          error: `Failed to get available slots: ${error.message}`
        };
      }

      console.log('✅ Available slots retrieved:', data?.length || 0, 'slots');
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('❌ Unexpected error getting available slots:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBookings(
    shopId?: string,
    date?: string,
    status?: string
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log('📅 Getting bookings:', { shopId, date, status });

      let query = this.client
        .from('shop_bookings')
        .select('*')
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      if (date) {
        query = query.eq('booking_date', date);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error getting bookings:', error);
        return {
          success: false,
          error: `Failed to get bookings: ${error.message}`
        };
      }

      console.log('✅ Bookings retrieved:', data?.length || 0, 'bookings');
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('❌ Unexpected error getting bookings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateBooking(
    bookingId: string,
    updateData: {
      status?: string;
      assigned_staff_id?: string;
      notes?: string;
    }
  ): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Updating booking:', bookingId, updateData);

      const { data, error } = await this.client
        .from('shop_bookings')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Booking update error:', error);
        return {
          success: false,
          error: `Failed to update booking: ${error.message}`
        };
      }

      console.log('✅ Booking updated successfully');
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Unexpected booking update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get bookings for a provider
  async getBookings(
    providerId: string,
    filters?: { status?: string; date?: string; shopId?: string }
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log('📋 Getting bookings for provider:', providerId, 'with filters:', filters);

      let query = this.client
        .from('shop_bookings')
        .select('*')
        .eq('provider_id', providerId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply filters if provided
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date) {
        query = query.eq('booking_date', filters.date);
      }

      if (filters?.shopId) {
        query = query.eq('shop_id', filters.shopId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get bookings error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Transform the data to include joined information and fetch service options
      const transformedBookings = await Promise.all((data || []).map(async booking => {
        // Fetch service options if service_option_ids exist
        let service_options = [];
        if (booking.service_option_ids && booking.service_option_ids.length > 0) {
          const { data: options, error: optionsError } = await this.client
            .from('service_options')
            .select('id, option_name, price')
            .in('id', booking.service_option_ids);
          
          if (!optionsError && options) {
            service_options = options;
          }
        }

        return {
          ...booking,
          service_name: booking.service_name || 'Service',
          service_options: service_options, // Add service options to the booking data
          staff: null, // Staff data not available without join
          shop: null // Shop data not available without join
        };
      }));

      console.log('✅ Successfully fetched', transformedBookings.length, 'bookings');
      return {
        success: true,
        data: transformedBookings,
        message: 'Bookings retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get bookings error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get bookings for a specific staff member on a specific date
  async getStaffBookingsForDate(staffId: string, date: string): Promise<ServiceResponse<Array<{ start: string; end: string }>>> {
    try {
      console.log('📅 Getting staff bookings for:', staffId, 'on', date);

      // Query bookings for the specific staff member and date
      const { data, error } = await this.client
        .from('shop_bookings')
        .select('start_time, end_time, status')
        .eq('staff_id', staffId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'in_progress', 'pending'])
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Error getting staff bookings:', error);
        return {
          success: false,
          error: `Failed to get staff bookings: ${error.message}`
        };
      }

      const bookedSlots = data?.map(booking => ({
        start: booking.start_time,
        end: booking.end_time
      })) || [];
      
      console.log('📅 Found', bookedSlots.length, 'existing bookings for staff on', date);
      return {
        success: true,
        data: bookedSlots,
        message: 'Staff bookings retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error getting staff bookings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update booking status specifically
  async updateBookingStatus(
    bookingId: string,
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
    internalNotes?: string
  ): Promise<ServiceResponse<any>> {
    try {
      console.log('📅 Updating booking status:', bookingId, 'to', status);

      // First try direct update to avoid function ambiguity issues
      const { data: bookingData, error: fetchError } = await this.client
        .from('shop_bookings')
        .select('provider_id')
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ Booking not found:', fetchError);
        return {
          success: false,
          error: 'Booking not found'
        };
      }

      // Verify the user owns this booking
      const currentUser = await this.getCurrentUser();
      if (!currentUser || bookingData.provider_id !== currentUser.id) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Update the booking directly
      // Update the booking status
      const updateData: any = {
        status: status,
        notes: internalNotes || undefined,
        updated_at: new Date().toISOString()
      };
      
      
      const { data, error } = await this.client
        .from('shop_bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Update booking status error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Failed to update booking status'
        };
      }

      console.log('✅ Booking status updated successfully');
      return {
        success: true,
        data: { updated: true },
        message: `Booking status updated to ${status}`
      };

    } catch (error) {
      console.error('❌ Unexpected booking status update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get booking status counts for dashboard
  async getBookingStatusCounts(
    shopId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Getting booking status counts for shop:', shopId);

      const { data, error } = await this.client
        .rpc('get_booking_status_counts', {
          p_shop_id: shopId,
          p_date_from: dateFrom || new Date().toISOString().split('T')[0],
          p_date_to: dateTo || new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('❌ Get booking status counts error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Booking status counts retrieved');
      return {
        success: true,
        data: data || {},
        message: 'Booking status counts retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get booking status counts error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // DISCOUNT MANAGEMENT  
  // ==============================================

  async createDiscount(shopId: string, discountData: ShopDiscount): Promise<ServiceResponse<ShopDiscount>> {
    try {
      console.log('🎯 Creating discount for shop:', shopId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_discounts')
        .insert({
          shop_id: shopId,
          type: discountData.type,
          value: discountData.value,
          description: discountData.description,
          start_date: discountData.start_date,
          end_date: discountData.end_date,
          usage_limit: discountData.usage_limit,
          min_amount: discountData.min_amount,
          max_discount: discountData.max_discount,
          applicable_services: discountData.applicable_services || [],
          conditions: discountData.conditions || {},
          is_active: discountData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Discount creation error:', error);
        return {
          success: false,
          error: `Failed to create discount: ${error.message}`
        };
      }

      console.log('✅ Discount created successfully');
      return {
        success: true,
        data: data as ShopDiscount
      };

    } catch (error) {
      console.error('❌ Unexpected discount creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateDiscount(discountId: string, discountData: Partial<ShopDiscount>): Promise<ServiceResponse<ShopDiscount>> {
    try {
      console.log('🎯 Updating discount:', discountId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // First check if the discount belongs to a shop owned by the user
      const { data: discount, error: discountError } = await this.client
        .from('shop_discounts')
        .select('shop_id')
        .eq('id', discountId)
        .single();

      if (discountError || !discount) {
        return {
          success: false,
          error: 'Discount not found'
        };
      }

      // Check if the shop belongs to the user
      const { data: shop, error: shopError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('id', discount.shop_id)
        .eq('provider_id', user.id)
        .single();

      if (shopError || !shop) {
        return {
          success: false,
          error: 'Unauthorized: You can only update discounts from your own shops'
        };
      }

      const { data, error } = await this.client
        .from('shop_discounts')
        .update({
          ...discountData,
          updated_at: new Date().toISOString()
        })
        .eq('id', discountId)
        .select()
        .single();

      if (error) {
        console.error('❌ Discount update error:', error);
        return {
          success: false,
          error: `Failed to update discount: ${error.message}`
        };
      }

      console.log('✅ Discount updated successfully');
      return {
        success: true,
        data: data as ShopDiscount
      };

    } catch (error) {
      console.error('❌ Unexpected discount update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteDiscount(discountId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🎯 Deleting discount:', discountId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // First check if the discount belongs to a shop owned by the user
      const { data: discount, error: discountError } = await this.client
        .from('shop_discounts')
        .select('shop_id')
        .eq('id', discountId)
        .single();

      if (discountError || !discount) {
        return {
          success: false,
          error: 'Discount not found'
        };
      }

      // Check if the shop belongs to the user
      const { data: shop, error: shopError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('id', discount.shop_id)
        .eq('provider_id', user.id)
        .single();

      if (shopError || !shop) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete discounts from your own shops'
        };
      }

      const { error } = await this.client
        .from('shop_discounts')
        .delete()
        .eq('id', discountId);

      if (error) {
        console.error('❌ Discount deletion error:', error);
        return {
          success: false,
          error: `Failed to delete discount: ${error.message}`
        };
      }

      console.log('✅ Discount deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected discount deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // MIGRATION AND UTILITIES
  // ==============================================

  async fixExistingShopsSchedule(): Promise<ServiceResponse<any>> {
    try {
      console.log('🔧 Fixing existing shops without schedule...');

      const { data: result, error } = await this.client.rpc('fix_existing_shops_schedule');

      if (error) {
        console.error('❌ Fix existing shops error:', error);
        return {
          success: false,
          error: `Failed to fix existing shops: ${error.message}`
        };
      }

      console.log('✅ Fix existing shops completed:', result);
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Unexpected fix existing shops error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkShopScheduleStatus(): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Checking shop schedule status...');

      const { data: result, error } = await this.client.rpc('check_shop_schedule_status');

      if (error) {
        console.error('❌ Check status error:', error);
        return {
          success: false,
          error: `Failed to check status: ${error.message}`
        };
      }

      console.log('✅ Status check completed:', result);
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Unexpected status check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // QUERYING
  // ==============================================

  async getShops(providerId?: string): Promise<ServiceResponse<CompleteShopData[]>> {
    try {
      console.log('🏪 Fetching shops with normalized data...');

      let query = this.client
        .from('provider_businesses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get shops error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched shops:', data?.length || 0);
      return {
        success: true,
        data: data as CompleteShopData[] || []
      };

    } catch (error) {
      console.error('❌ Get shops error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PAYMENT METHODS
  // ==============================================

  // Create payment record when booking is completed
  async createPaymentRecord(bookingData: {
    booking_id: string;
    shop_id?: string;
    client_name: string;
    client_email?: string;
    client_phone?: string;
    service_title: string;
    service_type?: string;
    service_date: string;
    service_time?: string;
    duration?: string;
    amount: number;
    notes?: string;
    location_type?: 'in_house' | 'on_location';
    location?: string;
    invoice_number?: string;
  }): Promise<ServiceResponse<Payment>> {
    try {
      console.log('💰 Creating payment record for booking:', bookingData.booking_id);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Since we use comprehensive schema, payment info is stored in shop_bookings table
      // Just update the existing booking record with payment status
      const { data, error } = await this.client
        .from('shop_bookings')
        .update({
          payment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingData.booking_id)
        .eq('provider_id', user.id)
        .select()
        .single();

      // If that fails, try using booking_reference instead
      if (error && error.code === 'PGRST116') {
        const { data: fallbackData, error: fallbackError } = await this.client
          .from('shop_bookings')
          .update({
            payment_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('booking_reference', bookingData.booking_id)
          .eq('provider_id', user.id)
          .select()
          .single();

        if (fallbackError) {
          console.error('❌ Payment creation fallback failed:', fallbackError);
          return {
            success: false,
            error: `Failed to create payment record: ${fallbackError.message}`
          };
        }

        console.log('✅ Payment record created via fallback');
        return {
          success: true,
          data: fallbackData as Payment,
          message: 'Payment record created successfully'
        };
      }

      if (error) {
        console.error('❌ Payment creation error:', error);
        return {
          success: false,
          error: `Failed to create payment record: ${error.message}`
        };
      }

      console.log('✅ Payment record created successfully');
      return {
        success: true,
        data: data as Payment,
        message: 'Payment record created successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected payment creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    paymentMethod?: string,
    paymentReference?: string
  ): Promise<ServiceResponse<Payment>> {
    try {
      console.log('💰 Updating payment status:', paymentId, 'to', status);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };


      // Update shop_bookings table directly by booking ID
      console.log('💰 Updating payment status for booking ID:', paymentId);
      console.log('💰 Update data:', updateData);
      console.log('💰 Provider ID:', user.id);
      
      // First, check if the booking exists
      const { data: existingBooking, error: checkError } = await this.client
        .from('shop_bookings')
        .select('id, provider_id, payment_status')
        .eq('id', paymentId)
        .eq('provider_id', user.id)
        .single();

      if (checkError) {
        console.error('❌ Booking not found or access denied:', checkError);
        return {
          success: false,
          error: `Booking not found: ${checkError.message}`
        };
      }

      console.log('✅ Found booking:', existingBooking);
      
      const { data, error } = await this.client
        .from('shop_bookings')
        .update(updateData)
        .eq('id', paymentId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Payment status update error:', error);
        return {
          success: false,
          error: `Failed to update payment status: ${error.message}`
        };
      }

      console.log('✅ Payment status updated successfully');
      return {
        success: true,
        data: data as Payment,
        message: `Payment status updated to ${status}`
      };

    } catch (error) {
      console.error('❌ Unexpected payment update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get shop statistics (rating, reviews, staff count, services count)
  async getShopStatistics(shopId?: string): Promise<ServiceResponse<{ 
    shop_id: string; 
    rating: number; 
    reviews_count: number; 
    staff_count: number; 
    services_count: number; 
  }[]>> {
    try {
      console.log('📊 Fetching shop statistics');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get all shops for this provider
      let shopQuery = this.client
        .from('provider_businesses')
        .select('id')
        .eq('provider_id', user.id);

      if (shopId) {
        shopQuery = shopQuery.eq('id', shopId);
      }

      const { data: shops, error: shopsError } = await shopQuery;

      if (shopsError) {
        console.error('❌ Get shops error:', shopsError);
        return {
          success: false,
          error: shopsError.message
        };
      }

      if (!shops || shops.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      const shopIds = shops.map(s => s.id);
      console.log('🏪 Processing statistics for shops:', shopIds);

      // Get statistics for all shops in parallel
      const statisticsPromises = shopIds.map(async (shopId) => {
        const [reviewsResult, staffResult, servicesResult] = await Promise.all([
          // Get reviews and calculate rating
          this.client
            .from('reviews')
            .select('rating')
            .eq('shop_id', shopId),
          
          // Get staff count
          this.client
            .from('shop_staff')
            .select('id')
            .eq('shop_id', shopId)
            .eq('is_active', true),
          
          // Get services count
          this.client
            .from('shop_services')
            .select('id')
            .eq('shop_id', shopId)
            .eq('is_active', true)
        ]);

        // Calculate rating and reviews count
        const reviews = reviewsResult.data || [];
        const rating = reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length 
          : 0;
        const reviews_count = reviews.length;

        // Get counts
        const staff_count = staffResult.data?.length || 0;
        const services_count = servicesResult.data?.length || 0;

        console.log(`📊 Shop ${shopId} stats:`, {
          rating: rating.toFixed(1),
          reviews_count,
          staff_count,
          services_count
        });

        return {
          shop_id: shopId,
          rating: Math.round(rating * 10) / 10, // Round to 1 decimal
          reviews_count,
          staff_count,
          services_count
        };
      });

      const statistics = await Promise.all(statisticsPromises);

      console.log('✅ Shop statistics calculated:', statistics);
      return {
        success: true,
        data: statistics
      };

    } catch (error: any) {
      console.error('❌ Get shop statistics error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get shop statistics'
      };
    }
  }

  // Get monthly revenue for each shop
  async getShopMonthlyRevenue(shopId?: string): Promise<ServiceResponse<{ shop_id?: string; monthly_revenue: number }[]>> {
    try {
      console.log('💰 Calculating monthly revenue for shops');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get current month's date range
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const dateFrom = firstDayOfMonth.toISOString().split('T')[0];
      const dateTo = lastDayOfMonth.toISOString().split('T')[0];

      console.log('📅 Calculating revenue from', dateFrom, 'to', dateTo);

      // First, check if there are any payments at all for this provider
      console.log('🔍 Checking all payments for provider:', user.id);
      const { data: allPayments, error: allPaymentsError } = await this.client
        .from('payments')
        .select('*')
        .eq('provider_id', user.id);

      if (allPaymentsError) {
        console.error('❌ Error checking all payments:', allPaymentsError);
      } else {
        console.log('💳 Total payments found:', allPayments?.length || 0);
        console.log('💳 Total payments found:', allPayments?.length);
        console.log('💳 Payment sample:', allPayments?.slice(0, 3));
      }

      // First get all shops owned by this provider
      const { data: userShops } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('provider_id', user.id);

      const shopIds = userShops?.map(shop => shop.id) || [];
      console.log('🏪 User shop IDs:', shopIds);

      if (shopIds.length === 0) {
        console.log('⚠️ No shops found for provider, returning empty revenue');
        return {
          success: true,
          data: []
        };
      }

      // Build query for current month's paid bookings using shop IDs
      let query = this.client
        .from('shop_bookings')
        .select('shop_id, total_price, booking_date, created_at')
        .in('shop_id', shopIds)
        .gte('booking_date', dateFrom)
        .lte('booking_date', dateTo);

      // Also try alternative query with created_at date
      console.log('🔍 Also checking payments by created_at date...');
      const { data: altPayments, error: altError } = await this.client
        .from('shop_bookings')
        .select('shop_id, total_price, booking_date, created_at')
        .in('shop_id', shopIds)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');

      if (!altError && altPayments) {
        console.log('💳 Payments by created_at:', altPayments.length);
      }

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get shop revenue error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('💳 Current month payments found:', data?.length || 0);
      console.log('💳 Current month payment details:', data);

      // If no current month data, try different approaches
      let finalData = data;
      if (!data || data.length === 0) {
        console.log('⚠️ No current month data, trying all-time revenue...');
        
        // Try 1: All-time paid bookings
        const { data: allTimeData, error: allTimeError } = await this.client
          .from('shop_bookings')
          .select('shop_id, total_price, booking_date, created_at')
          .in('shop_id', shopIds)
;

        if (!allTimeError && allTimeData && allTimeData.length > 0) {
          console.log('💳 All-time PAID payments found:', allTimeData.length);
          finalData = allTimeData;
        } else {
          // Try 2: All bookings regardless of status
          console.log('⚠️ No paid bookings, checking all payment statuses...');
          const { data: allStatusData, error: allStatusError } = await this.client
            .from('shop_bookings')
            .select('shop_id, total_price, booking_date, created_at')
            .in('shop_id', shopIds);

          if (!allStatusError && allStatusData) {
            console.log('💳 All payments (any status) found:', allStatusData.length);
            console.log('💳 Total payments in status data:', allStatusData.length);
            finalData = allStatusData;
          }
        }
      }

      // Get all shop IDs for this provider to check matching
      const { data: providerShops, error: shopsError } = await this.client
        .from('provider_businesses')
        .select('id, name')
        .eq('provider_id', user.id);

      if (shopsError) {
        console.error('❌ Error getting provider shops:', shopsError);
      } else {
        console.log('🏪 Provider shops:', providerShops?.map(s => ({ id: s.id, name: s.name })));
      }

      // Group by shop_id and sum amounts
      const revenueByShop = new Map<string, number>();
      
      finalData?.forEach(payment => {
        let shopId = payment.shop_id;
        const amount = parseFloat(payment.total_price) || 0;
        
        console.log(`💰 Processing payment:`, {
          originalShopId: payment.shop_id,
          amount: amount,
          status: 'paid', // Default status since payment_status column doesn't exist
          bookingId: payment.id,
          bookingDate: payment.booking_date
        });
        
        // Handle payments without shop_id - assign to first shop as fallback
        if (!shopId && providerShops && providerShops.length > 0) {
          shopId = providerShops[0].id;
          console.log(`⚠️ Payment missing shop_id, assigning to first shop: ${shopId}`);
        } else if (!shopId) {
          shopId = 'unknown';
          console.warn(`⚠️ Payment missing shop_id and no shops available`);
        }
        
        // Check if this shop_id exists in provider_businesses
        const shopExists = providerShops?.find(s => s.id === shopId);
        if (!shopExists && shopId !== 'unknown') {
          console.warn(`⚠️ Payment has shop_id ${shopId} but this shop doesn't exist in provider_businesses`);
          // If shop doesn't exist, assign to first available shop
          if (providerShops && providerShops.length > 0) {
            shopId = providerShops[0].id;
            console.log(`🔧 Reassigning to first available shop: ${shopId}`);
          }
        }
        
        revenueByShop.set(shopId, (revenueByShop.get(shopId) || 0) + amount);
        console.log(`✅ Added $${amount} to shop ${shopId}. New total: $${revenueByShop.get(shopId)}`);
      });

      console.log('💰 Revenue by shop before conversion:', Object.fromEntries(revenueByShop));

      // Convert to array format
      const result = Array.from(revenueByShop.entries()).map(([shop_id, monthly_revenue]) => ({
        shop_id: shop_id === 'unknown' ? undefined : shop_id,
        monthly_revenue
      }));

      console.log('✅ Final revenue calculated:', result);
      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error('❌ Calculate monthly revenue error:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate monthly revenue'
      };
    }
  }

  // Get payments for provider
  async getPayments(
    shopId?: string,
    status?: 'pending' | 'paid' | 'failed' | 'refunded',
    dateFrom?: string,
    dateTo?: string
  ): Promise<ServiceResponse<Payment[]>> {
    try {
      console.log('💰 Fetching payments for provider');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Query from shop_bookings table - only get completed bookings for payments
      let query = this.client
        .from('shop_bookings')
        .select('*')
        .eq('provider_id', user.id)
        .eq('status', 'completed') // Only show completed bookings in payments
        .order('created_at', { ascending: false });

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      if (status) {
        query = query.eq('payment_status', status);
      }
      if (dateFrom) {
        query = query.gte('booking_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('booking_date', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Get payments error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Transform booking data to Payment interface format
      const payments: Payment[] = (data || []).map(booking => ({
        id: booking.id,
        booking_id: booking.id,
        provider_id: booking.provider_id,
        shop_id: booking.shop_id,
        client_name: booking.customer_name,
        client_email: booking.customer_email,
        client_phone: booking.customer_phone,
        service_title: booking.service_name,
        service_type: booking.service_name,
        service_date: booking.booking_date,
        service_time: booking.start_time,
        duration: `${booking.duration || 60} min`,
        amount: booking.total_price,
        payment_status: booking.payment_status || 'pending',
        notes: booking.customer_notes,
        location_type: 'in_house', // Default for now
        location: 'Shop Location', // Default for now
        invoice_number: null,
        invoice_sent: false,
        created_at: booking.created_at,
        updated_at: booking.updated_at
      }));

      console.log('✅ Successfully fetched', payments.length, 'payments');
      return {
        success: true,
        data: payments,
        message: 'Payments retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get payments error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get dashboard statistics for provider
  async getDashboardStats(providerId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Fetching dashboard statistics for provider:', providerId);

      const user = await this.getCurrentUser();
      if (!user || user.id !== providerId) {
        return {
          success: false,
          error: 'User not authenticated or unauthorized'
        };
      }

      // Get current date info
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      // Fetch all necessary data in parallel
      const [
        bookingsResult,
        paymentsResult,
        shopsResult,
        thisMonthPaymentsResult,
        lastMonthPaymentsResult,
        ratingStatsResult,
        responseStatsResult
      ] = await Promise.all([
        // All bookings
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId),
        
        // All paid bookings (payment data is in shop_bookings)
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId),
        
        // All shops
        this.client
          .from('provider_businesses')
          .select('*')
          .eq('provider_id', providerId),
        
        // This month's paid bookings
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId)
            .gte('booking_date', startOfMonth)
          .lte('booking_date', endOfMonth),
        
        // Last month's paid bookings
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId)
            .gte('booking_date', startOfLastMonth)
          .lte('booking_date', endOfLastMonth),

        // Rating statistics
        this.client
          .rpc('get_provider_rating_stats', { p_provider_id: providerId }),

        // Response time statistics
        this.client
          .rpc('get_provider_response_stats', { p_provider_id: providerId })
      ]);

      const bookings = bookingsResult.data || [];
      const payments = paymentsResult.data || [];
      const shops = shopsResult.data || [];
      const thisMonthPayments = thisMonthPaymentsResult.data || [];
      const lastMonthPayments = lastMonthPaymentsResult.data || [];
      const ratingStats = ratingStatsResult.data?.[0] || { average_rating: 0, total_reviews: 0 };
      const responseStats = responseStatsResult.data?.[0] || { 
        average_response_minutes: 0, 
        response_rate_percentage: 0 
      };

      // Debug logging
      console.log('📊 Total bookings found:', bookings.length);
      console.log('📊 Bookings by status:', bookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      // Calculate statistics
      const completedBookings = bookings.filter(b => b.status === 'completed');
      console.log('📊 Completed bookings:', completedBookings.length);
      
      const paidPayments = payments.filter(p => p.payment_status === 'paid');
      const thisMonthPaidPayments = thisMonthPayments.filter(p => p.payment_status === 'paid');
      const lastMonthPaidPayments = lastMonthPayments.filter(p => p.payment_status === 'paid');

      // Calculate unique customers from bookings
      const uniqueCustomers = new Set([
        ...bookings.map(b => b.customer_email || b.customer_phone).filter(Boolean)
      ]);

      // Calculate this month's unique customers
      const thisMonthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.booking_date);
        const startDate = new Date(startOfMonth);
        const endDate = new Date(endOfMonth);
        return bookingDate >= startDate && bookingDate <= endDate;
      });

      console.log('📊 This month date range:', startOfMonth, 'to', endOfMonth);
      console.log('📊 This month bookings:', thisMonthBookings.length);
      console.log('📊 This month bookings by status:', thisMonthBookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      const thisMonthUniqueCustomers = new Set([
        ...thisMonthBookings.map(b => b.customer_email || b.customer_phone).filter(Boolean)
      ]);

      // Calculate total earnings (using total_price from shop_bookings)
      const totalEarnings = paidPayments.reduce((sum, p) => sum + (p.total_price || 0), 0);
      const thisMonthEarnings = thisMonthPaidPayments.reduce((sum, p) => sum + (p.total_price || 0), 0);
      const lastMonthEarnings = lastMonthPaidPayments.reduce((sum, p) => sum + (p.total_price || 0), 0);

      // Calculate growth percentage
      const monthlyGrowth = lastMonthEarnings > 0 
        ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
        : thisMonthEarnings > 0 ? 100 : 0;

      // Calculate average job value
      const averageJobValue = completedBookings.length > 0
        ? totalEarnings / completedBookings.length
        : 0;

      // Calculate this month's completed jobs
      const thisMonthCompletedJobs = thisMonthBookings.filter(b => b.status === 'completed').length;
      console.log('📊 This month completed jobs:', thisMonthCompletedJobs);

      // Calculate this month's active bookings (confirmed or in_progress)
      const thisMonthActiveBookings = thisMonthBookings.filter(
        b => b.status === 'confirmed' || b.status === 'in_progress'
      ).length;

      // Use real rating and response stats from database
      const customerRating = parseFloat(ratingStats.average_rating) || 0;
      const responseRate = responseStats.response_rate_percentage || 0;

      const stats = {
        totalEarnings,
        activeJobs: bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length,
        completedJobs: completedBookings.length,
        customerRating, // Real rating from reviews
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        thisMonthEarnings,
        responseRate, // Real response rate from bookings
        totalCustomers: uniqueCustomers.size,
        averageJobValue,
        growthPercentage: monthlyGrowth,
        weeklyBookings: bookings.filter(b => {
          const bookingDate = new Date(b.booking_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return bookingDate >= weekAgo;
        }).length,
        monthlyGrowth,
        // New monthly overview stats
        thisMonthBookings: thisMonthBookings.length,
        thisMonthCompletedJobs,
        thisMonthActiveBookings,
        thisMonthCustomers: thisMonthUniqueCustomers.size,
        thisMonthAverageJobValue: thisMonthCompletedJobs > 0 
          ? thisMonthEarnings / thisMonthCompletedJobs 
          : 0,
        // Rating and response stats
        totalReviews: ratingStats.total_reviews || 0,
        averageResponseTimeMinutes: parseFloat(responseStats.average_response_minutes) || 0,
        averageResponseTime: formatResponseTime(parseFloat(responseStats.average_response_minutes) || 0)
      };

      // Helper function to format response time
      function formatResponseTime(minutes: number): string {
        if (minutes === 0) return 'No data';
        if (minutes < 60) return `${Math.round(minutes)}m`;
        if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
        return `${Math.round(minutes / 1440)}d`;
      }

      console.log('✅ Dashboard stats calculated:', stats);
      return {
        success: true,
        data: stats,
        message: 'Dashboard statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Dashboard stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get activity feed for provider
  async getActivityFeed(providerId: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
    try {
      console.log('📋 Fetching activity feed for provider:', providerId);

      const user = await this.getCurrentUser();
      if (!user || user.id !== providerId) {
        return {
          success: false,
          error: 'User not authenticated or unauthorized'
        };
      }

      // Fetch recent activities from different sources
      const [bookingsResult, paymentsResult, shopsResult] = await Promise.all([
        // Recent bookings
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId)
          .order('created_at', { ascending: false })
          .limit(limit),
        
        // Recent payments
        this.client
          .from('payments')
          .select('*')
          .eq('provider_id', providerId)
          .order('created_at', { ascending: false })
          .limit(limit),
        
        // Recent shop updates
        this.client
          .from('provider_businesses')
          .select('*')
          .eq('provider_id', providerId)
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);

      const activities: any[] = [];

      // Transform bookings to activities
      if (bookingsResult.data) {
        bookingsResult.data.forEach(booking => {
          if (booking.status === 'pending') {
            activities.push({
              id: `booking-${booking.id}`,
              type: 'new_booking',
              title: 'New Booking Request',
              description: `${booking.customer_name} requested ${booking.service_name || 'a service'} for ${booking.booking_date}`,
              timestamp: booking.created_at,
              customer: booking.customer_name,
              priority: 'high'
            });
          } else if (booking.status === 'completed') {
            activities.push({
              id: `booking-complete-${booking.id}`,
              type: 'job_completed',
              title: 'Service Completed',
              description: `Completed service for ${booking.customer_name}`,
              timestamp: booking.updated_at,
              amount: booking.total_price,
              customer: booking.customer_name,
              priority: 'low'
            });
          }
        });
      }

      // Transform payments to activities
      if (paymentsResult.data) {
        paymentsResult.data.forEach(payment => {
          if (true) { // All payments treated as paid since payment_status doesn't exist
            activities.push({
              id: `payment-${payment.id}`,
              type: 'payment_received',
              title: 'Payment Received',
              description: `Payment for ${payment.service_title} from ${payment.client_name}`,
              timestamp: payment.updated_at || payment.created_at,
              amount: payment.amount,
              customer: payment.client_name,
              priority: 'medium'
            });
          }
        });
      }

      // Transform shop updates to activities
      if (shopsResult.data) {
        shopsResult.data.forEach(shop => {
          // Only show if recently updated (within last 24 hours)
          const updateTime = new Date(shop.updated_at);
          const createTime = new Date(shop.created_at);
          const dayAgo = new Date();
          dayAgo.setDate(dayAgo.getDate() - 1);
          
          // Show shop creation activity for newly created shops
          if (createTime > dayAgo) {
            activities.push({
              id: `shop-created-${shop.id}`,
              type: 'schedule_updated',
              title: 'New Shop Created',
              description: `Successfully created "${shop.name}" - your shop is now live and ready for bookings!`,
              timestamp: shop.created_at,
              priority: 'medium'
            });
          }
          
          // Show shop updates (only if different from creation time)
          if (updateTime > dayAgo && shop.updated_at !== shop.created_at) {
            activities.push({
              id: `shop-update-${shop.id}`,
              type: 'schedule_updated',
              title: 'Shop Updated',
              description: `Updated settings for ${shop.name}`,
              timestamp: shop.updated_at,
              priority: 'low'
            });
          }
        });
      }

      // Sort activities by timestamp (most recent first)
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Limit to requested number
      const limitedActivities = activities.slice(0, limit);

      console.log('✅ Activity feed retrieved:', limitedActivities.length, 'activities');
      return {
        success: true,
        data: limitedActivities,
        message: 'Activity feed retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Activity feed error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create a review for a completed booking
  async createReview(reviewData: {
    booking_id: string;
    shop_id: string;
    provider_id: string;
    service_id?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    rating: number;
    title?: string;
    comment?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('⭐ Creating review for booking:', reviewData.booking_id);

      const { data, error } = await this.client
        .from('reviews')
        .insert({
          booking_id: reviewData.booking_id,
          shop_id: reviewData.shop_id,
          provider_id: reviewData.provider_id,
          service_id: reviewData.service_id,
          customer_name: reviewData.customer_name,
          customer_email: reviewData.customer_email,
          customer_phone: reviewData.customer_phone,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          is_verified: true,
          is_public: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Create review error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Review created successfully');
      return {
        success: true,
        data,
        message: 'Review submitted successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected create review error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get reviews for a shop
  async getShopReviews(shopId: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
    try {
      console.log('⭐ Fetching reviews for shop:', shopId);

      const { data, error } = await this.client
        .from('reviews')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Get shop reviews error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched', data?.length || 0, 'reviews');
      return {
        success: true,
        data: data || [],
        message: 'Reviews retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get reviews error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get shop rating statistics
  async getShopRatingStats(shopId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Fetching rating stats for shop:', shopId);

      const { data, error } = await this.client
        .rpc('get_shop_rating_stats', { p_shop_id: shopId });

      if (error) {
        console.error('❌ Get shop rating stats error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const stats = data?.[0] || { average_rating: 0, total_reviews: 0, rating_distribution: {} };

      console.log('✅ Shop rating stats retrieved:', stats);
      return {
        success: true,
        data: stats,
        message: 'Rating statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get rating stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get provider rating statistics
  async getProviderRatingStats(providerId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📊 Fetching rating stats for provider:', providerId);

      const { data, error } = await this.client
        .rpc('get_provider_rating_stats', { p_provider_id: providerId });

      if (error) {
        console.error('❌ Get provider rating stats error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const stats = data?.[0] || { average_rating: 0, total_reviews: 0, shops_with_reviews: 0 };

      console.log('✅ Provider rating stats retrieved:', stats);
      return {
        success: true,
        data: stats,
        message: 'Provider rating statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get provider rating stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get provider response time statistics
  async getProviderResponseStats(providerId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('⏱️ Fetching response stats for provider:', providerId);

      const { data, error } = await this.client
        .rpc('get_provider_response_stats', { p_provider_id: providerId });

      if (error) {
        console.error('❌ Get provider response stats error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const stats = data?.[0] || { 
        average_response_minutes: 0, 
        response_rate_percentage: 0, 
        total_responded: 0, 
        total_bookings: 0 
      };

      console.log('✅ Provider response stats retrieved:', stats);
      return {
        success: true,
        data: stats,
        message: 'Response statistics retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected get response stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Add provider response to a review
  async addProviderResponse(reviewId: string, response: string): Promise<ServiceResponse<any>> {
    try {
      console.log('💬 Adding provider response to review:', reviewId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('reviews')
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Add provider response error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Provider response added successfully');
      return {
        success: true,
        data,
        message: 'Response added successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected add response error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PROVIDER SKILLS MANAGEMENT
  // ==============================================

  async addProviderSkill(skillData: {
    skill_name: string;
    experience_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    years_experience?: number;
    is_certified?: boolean;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🎯 Adding provider skill:', skillData);

      const { data, error } = await supabase.rpc('add_provider_skill', {
        p_skill_name: skillData.skill_name,
        p_experience_level: skillData.experience_level,
        p_years_experience: skillData.years_experience || 0,
        p_is_certified: skillData.is_certified || false
      });

      if (error) {
        console.error('❌ Error adding skill:', error);
        throw error;
      }

      console.log('✅ Skill added successfully:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error in addProviderSkill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProviderSkills(providerId?: string): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🔍 Getting provider skills for:', providerId || 'current user');

      const { data, error } = await supabase.rpc('get_provider_skills', {
        p_provider_id: providerId || null
      });

      if (error) {
        console.error('❌ Error getting skills:', error);
        throw error;
      }

      console.log('✅ Skills retrieved:', data?.length || 0, 'skills');
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('❌ Error in getProviderSkills:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProviderSkill(skillId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('🗑️ Deleting provider skill:', skillId);

      const { error } = await supabase
        .from('provider_skills')
        .delete()
        .eq('id', skillId);

      if (error) {
        console.error('❌ Error deleting skill:', error);
        throw error;
      }

      console.log('✅ Skill deleted successfully');
      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('❌ Error in deleteProviderSkill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PROVIDER CERTIFICATIONS MANAGEMENT
  // ==============================================

  async addProviderCertification(certData: {
    certification_name: string;
    issued_by: string;
    issue_date: string;
    expiry_date?: string;
    certificate_number?: string;
    verification_url?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🏆 Adding provider certification:', certData);

      const { data, error } = await supabase.rpc('add_provider_certification', {
        p_certification_name: certData.certification_name,
        p_issued_by: certData.issued_by,
        p_issue_date: certData.issue_date,
        p_expiry_date: certData.expiry_date || null,
        p_certificate_number: certData.certificate_number || null,
        p_verification_url: certData.verification_url || null
      });

      if (error) {
        console.error('❌ Error adding certification:', error);
        throw error;
      }

      console.log('✅ Certification added successfully:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error in addProviderCertification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProviderCertifications(providerId?: string): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🔍 Getting provider certifications for:', providerId || 'current user');

      const { data, error } = await supabase.rpc('get_provider_certifications', {
        p_provider_id: providerId || null
      });

      if (error) {
        console.error('❌ Error getting certifications:', error);
        throw error;
      }

      console.log('✅ Certifications retrieved:', data?.length || 0, 'certifications');
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('❌ Error in getProviderCertifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProviderCertification(certId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('🗑️ Deleting provider certification:', certId);

      const { error } = await supabase
        .from('provider_certifications')
        .delete()
        .eq('id', certId);

      if (error) {
        console.error('❌ Error deleting certification:', error);
        throw error;
      }

      console.log('✅ Certification deleted successfully');
      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('❌ Error in deleteProviderCertification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // USER PROFILE MANAGEMENT
  // ==============================================

  async updateUserProfile(profileData: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone?: string;
    address?: string;
    bio?: string;
    avatar_url?: string;
    gender?: string;
    birth_date?: string;
    is_premium?: boolean;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('👤 Updating user profile:', profileData);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('users')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating user profile:', error);
        return {
          success: false,
          error: `Failed to update profile: ${error.message}`
        };
      }

      console.log('✅ User profile updated successfully');
      return {
        success: true,
        data: data,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error updating user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateProviderBusiness(businessData: {
    name?: string;
    description?: string;
    category?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
    website_url?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🏢 Updating provider business:', JSON.stringify(businessData, null, 2));

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log('👤 Current user ID:', user.id);

      // First check if a business profile exists
      const { data: businessList, error: checkError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('provider_id', user.id)
        .limit(1);

      if (checkError) {
        console.error('❌ Error checking provider business:', checkError);
        return {
          success: false,
          error: `Failed to check business profile: ${checkError.message}`
        };
      }

      const existingBusiness = businessList && businessList.length > 0 ? businessList[0] : null;

      // If there are multiple business profiles, clean them up (keep only the most recent)
      if (businessList && businessList.length > 1) {
        console.warn('⚠️ Multiple business profiles found for provider, cleaning up duplicates...');
        
        // Get all business profiles to find the most recent one
        const { data: allBusinesses, error: allError } = await this.client
          .from('provider_businesses')
          .select('id, created_at')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        if (!allError && allBusinesses && allBusinesses.length > 1) {
          // Keep the first (most recent) and delete the rest
          const idsToDelete = allBusinesses.slice(1).map(b => b.id);
          
          const { error: deleteError } = await this.client
            .from('provider_businesses')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error('❌ Error cleaning up duplicate businesses:', deleteError);
          } else {
            console.log('✅ Cleaned up', idsToDelete.length, 'duplicate business profiles');
          }
        }
      }

      let result;
      if (existingBusiness) {
        // Update existing business - use the ID we found
        const { error: updateError } = await this.client
          .from('provider_businesses')
          .update({
            ...businessData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBusiness.id);

        if (updateError) {
          console.error('❌ Error updating provider business:', updateError);
          return {
            success: false,
            error: `Failed to update business profile: ${updateError.message}`
          };
        }

        // Fetch the updated record
        const { data: updatedData, error: fetchError } = await this.client
          .from('provider_businesses')
          .select('*')
          .eq('id', existingBusiness.id)
          .limit(1);

        if (fetchError || !updatedData || updatedData.length === 0) {
          console.error('❌ Error fetching updated business:', fetchError);
          return {
            success: false,
            error: 'Failed to fetch updated business profile'
          };
        }

        result = updatedData[0];
      } else {
        // Create new business profile
        const { data: insertData, error: insertError } = await this.client
          .from('provider_businesses')
          .insert({
            provider_id: user.id,
            ...businessData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error('❌ Error creating provider business:', insertError);
          return {
            success: false,
            error: `Failed to create business profile: ${insertError.message}`
          };
        }

        if (!insertData || insertData.length === 0) {
          return {
            success: false,
            error: 'Failed to create business profile - no data returned'
          };
        }

        result = insertData[0];
      }

      console.log('✅ Provider business updated/created successfully');
      return {
        success: true,
        data: result,
        message: existingBusiness ? 'Business profile updated successfully' : 'Business profile created successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error updating provider business:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getUserProfile(userId?: string): Promise<ServiceResponse<any>> {
    try {
      console.log('👤 Getting user profile for:', userId || 'current user');

      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const targetUserId = userId || currentUser.id;

      // Get user data
      const { data: userData, error: userError } = await this.client
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (userError) {
        console.error('❌ Error getting user profile:', userError);
        return {
          success: false,
          error: `Failed to get profile: ${userError.message}`
        };
      }

      // Get provider business separately if user is a provider
      let providerBusiness = null;
      if (userData.account_type === 'provider') {
        const { data: businessList, error: businessError } = await this.client
          .from('provider_businesses')
          .select('*')
          .eq('provider_id', targetUserId)
          .limit(1);

        if (businessError) {
          console.error('⚠️ Error getting provider business:', businessError);
          // Don't fail the whole request if business doesn't exist
        } else if (businessList && businessList.length > 0) {
          providerBusiness = businessList[0];
        }
      }

      // Format the response to match ProfileScreen expectations
      const profile = {
        ...userData,
        provider_business: providerBusiness
      };

      console.log('✅ User profile retrieved successfully');
      return {
        success: true,
        data: profile,
        message: 'Profile retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error getting user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // USER PRIVACY SETTINGS
  // ==============================================

  async getPrivacySettings(): Promise<ServiceResponse<any>> {
    try {
      console.log('🔐 Getting privacy settings');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get user preferences which contain privacy settings
      const { data, error } = await this.client
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error getting privacy settings:', error);
        return {
          success: false,
          error: `Failed to get privacy settings: ${error.message}`
        };
      }

      // If no preferences exist, return default settings
      const defaultSettings = {
        profile_visibility: 'public',
        location_sharing: false,
        show_online_status: true,
        allow_direct_messages: true,
        allow_data_analytics: true,
        marketing_emails: false,
        two_factor_auth: false,
        visibility_phone: true,
        visibility_email: false,
        visibility_address: false,
        visibility_work_history: true
      };

      console.log('✅ Privacy settings retrieved');
      return {
        success: true,
        data: data || defaultSettings,
        message: 'Privacy settings retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error getting privacy settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updatePrivacySettings(settings: {
    profile_visibility?: string;
    location_sharing?: boolean;
    show_online_status?: boolean;
    allow_direct_messages?: boolean;
    allow_data_analytics?: boolean;
    marketing_emails?: boolean;
    two_factor_auth?: boolean;
    visibility_phone?: boolean;
    visibility_email?: boolean;
    visibility_address?: boolean;
    visibility_work_history?: boolean;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🔐 Updating privacy settings:', settings);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if preferences exist
      const { data: existing, error: checkError } = await this.client
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking preferences:', checkError);
        return {
          success: false,
          error: `Failed to check preferences: ${checkError.message}`
        };
      }

      let result;
      if (existing) {
        // Update existing preferences
        const { data, error } = await this.client
          .from('user_preferences')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating privacy settings:', error);
          return {
            success: false,
            error: `Failed to update privacy settings: ${error.message}`
          };
        }
        result = data;
      } else {
        // Create new preferences
        const { data, error } = await this.client
          .from('user_preferences')
          .insert({
            user_id: user.id,
            ...settings,
            // Set default notification preferences
            email_notifications: true,
            push_notifications: true,
            sms_notifications: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating privacy settings:', error);
          return {
            success: false,
            error: `Failed to create privacy settings: ${error.message}`
          };
        }
        result = data;
      }

      console.log('✅ Privacy settings updated successfully');
      return {
        success: true,
        data: result,
        message: 'Privacy settings updated successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error updating privacy settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // SUPPORT TICKET SYSTEM
  // ==============================================

  async createSupportTicket(ticketData: {
    subject: string;
    description: string;
    category: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    user_name?: string;
    user_email?: string;
    user_phone?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('🎫 Creating support ticket:', ticketData.subject);

      const { data, error } = await supabase.rpc('create_support_ticket', {
        p_subject: ticketData.subject,
        p_description: ticketData.description,
        p_category: ticketData.category,
        p_priority: ticketData.priority || 'normal',
        p_user_name: ticketData.user_name || null,
        p_user_email: ticketData.user_email || null,
        p_user_phone: ticketData.user_phone || null
      });

      if (error) {
        console.error('❌ Error creating support ticket:', error);
        return {
          success: false,
          error: `Failed to create support ticket: ${error.message}`
        };
      }

      console.log('✅ Support ticket created successfully:', data);
      return {
        success: true,
        data: data,
        message: 'Support ticket created successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error creating support ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSupportTickets(): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🎫 Getting support tickets');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('support_tickets')
        .select(`
          *,
          support_ticket_messages (
            id,
            message,
            created_at,
            sender_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting support tickets:', error);
        return {
          success: false,
          error: `Failed to get support tickets: ${error.message}`
        };
      }

      // Count messages for each ticket
      const ticketsWithCount = (data || []).map(ticket => ({
        ...ticket,
        messages_count: ticket.support_ticket_messages?.length || 0
      }));

      console.log('✅ Support tickets retrieved:', ticketsWithCount.length);
      return {
        success: true,
        data: ticketsWithCount,
        message: 'Support tickets retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error getting support tickets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async addTicketMessage(ticketId: string, message: string): Promise<ServiceResponse<any>> {
    try {
      console.log('💬 Adding message to ticket:', ticketId);

      const { data, error } = await supabase.rpc('add_ticket_message', {
        p_ticket_id: ticketId,
        p_message: message,
        p_is_internal: false
      });

      if (error) {
        console.error('❌ Error adding ticket message:', error);
        return {
          success: false,
          error: `Failed to add message: ${error.message}`
        };
      }

      console.log('✅ Message added successfully');
      return {
        success: true,
        data: data,
        message: 'Message added successfully'
      };

    } catch (error) {
      console.error('❌ Unexpected error adding ticket message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // PROVIDER VERIFICATION SYSTEM
  // ==============================================

  async submitVerificationRequest(requestData: {
    request_type: 'business' | 'identity' | 'certification' | 'skill';
    documents?: any;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('✅ Submitting verification request:', requestData);

      const { data, error } = await supabase.rpc('submit_verification_request', {
        p_request_type: requestData.request_type,
        p_documents: requestData.documents || null
      });

      if (error) {
        console.error('❌ Error submitting verification request:', error);
        throw error;
      }

      console.log('✅ Verification request submitted successfully:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error in submitVerificationRequest:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getVerificationRequests(): Promise<ServiceResponse<any[]>> {
    try {
      console.log('🔍 Getting verification requests');

      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting verification requests:', error);
        throw error;
      }

      console.log('✅ Verification requests retrieved:', data?.length || 0, 'requests');
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('❌ Error in getVerificationRequests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create a new customer in the database
  async createCustomer(customerData: {
    email: string;
    full_name: string;
    phone: string;
    user_type?: string;
    account_type?: string;
    notes?: string;
    provider_id?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('📝 Creating customer:', customerData);

      // Create new user record in users table
      // Note: Make sure to run fix_customer_creation_rls.sql first
      const { data, error } = await this.client
        .from('users')
        .insert({
          email: customerData.email,
          full_name: customerData.full_name,
          phone: customerData.phone,
          user_type: customerData.user_type || 'customer',
          account_type: customerData.account_type || 'consumer',
          bio: customerData.notes || '',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Create customer error:', error);
        // Handle specific duplicate email error
        if (error.code === '23505') {
          return {
            success: false,
            error: 'A user with this email address already exists'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Failed to create customer'
        };
      }
      
      console.log('✅ Customer created successfully:', data.id);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error in createCustomer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send emails to customers using Supabase Edge Function
  async sendEmails(emailData: {
    customers: Array<{ id: string; name: string; email: string }>;
    subject: string;
    message: string;
    providerInfo: any;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('📧 Sending emails via Edge Function:', emailData.customers.length, 'recipients');

      const { data, error } = await this.client.functions.invoke('send-email', {
        body: {
          customers: emailData.customers,
          subject: emailData.subject,
          message: emailData.message,
          providerInfo: emailData.providerInfo
        }
      });

      if (error) {
        console.error('❌ Email sending error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Email sending completed:', data);
      return {
        success: true,
        data: data,
        totalSent: data?.totalSent || 0,
        totalFailed: data?.totalFailed || 0
      };
    } catch (error) {
      console.error('❌ Error in sendEmails:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send SMS to customers using Supabase Edge Function
  async sendSMS(smsData: {
    customers: Array<{ id: string; name: string; phone: string }>;
    message: string;
    providerInfo: any;
  }): Promise<ServiceResponse<any>> {
    try {
      console.log('📱 Sending SMS via Edge Function:', smsData.customers.length, 'recipients');

      const { data, error } = await this.client.functions.invoke('send-sms', {
        body: {
          customers: smsData.customers,
          message: smsData.message,
          providerInfo: smsData.providerInfo
        }
      });

      if (error) {
        console.error('❌ SMS sending error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ SMS sending completed:', data);
      return {
        success: true,
        data: data,
        totalSent: data?.totalSent || 0,
        totalFailed: data?.totalFailed || 0
      };
    } catch (error) {
      console.error('❌ Error in sendSMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // ANALYTICS METHODS
  // ==============================================

  async getAnalyticsData(providerId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<ServiceResponse<{
    incomeData: Array<{period: string; amount: number; bookings: number; growth: number}>;
    customerEngagement: {
      newCustomers: number;
      returningCustomers: number;
      totalBookings: number;
      averageBookingValue: number;
      customerSatisfaction: number;
      repeatRate: number;
    };
    monthlyStats: Array<{month: string; revenue: number; customers: number; bookings: number}>;
    servicePerformance: Array<{
      serviceName: string;
      bookings: number;
      revenue: number;
      averageRating: number;
      color: string;
    }>;
    peakHours: Array<{hour: string; bookings: number}>;
    totalRevenue: number;
    revenueGrowth: number;
  }>> {
    try {
      console.log('📊 Fetching analytics data for provider:', providerId, 'period:', period);

      const user = await this.getCurrentUser();
      if (!user || user.id !== providerId) {
        return {
          success: false,
          error: 'User not authenticated or unauthorized'
        };
      }

      // Get date ranges based on period
      const now = new Date();
      let startDate: Date;
      let periodCount: number;
      let dateFormat: Intl.DateTimeFormatOptions;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          periodCount = 7;
          dateFormat = { weekday: 'short' };
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          periodCount = 12;
          dateFormat = { year: 'numeric' };
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
          periodCount = 12;
          dateFormat = { month: 'short' };
      }

      // Fetch all necessary data
      const [
        paymentsResult,
        bookingsResult,
        servicesResult,
        bookingsByHourResult
      ] = await Promise.all([
        // Payments for revenue calculation - use shop_bookings table
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId)
          .not('payment_status', 'is', null)
          .gte('booking_date', startDate.toISOString().split('T')[0])
            .order('booking_date', { ascending: true }),

        // Bookings for customer engagement
        this.client
          .from('shop_bookings')
          .select('*')
          .eq('provider_id', providerId)
          .gte('booking_date', startDate.toISOString().split('T')[0])
          .order('booking_date', { ascending: true }),

        // Services for performance analysis
        this.client
          .from('shop_services')
          .select('*')
          .eq('provider_id', providerId),

        // Bookings by hour for peak analysis
        this.client
          .from('shop_bookings')
          .select('booking_time, status')
          .eq('provider_id', providerId)
          .gte('booking_date', startDate.toISOString().split('T')[0])
          .not('status', 'eq', 'cancelled')
      ]);

      const payments = paymentsResult.data || [];
      const bookings = bookingsResult.data || [];
      const services = servicesResult.data || [];
      const hourlyBookings = bookingsByHourResult.data || [];
      
      // If no payments found for this provider, try to fetch all bookings for demo purposes
      if (payments.length === 0) {
        console.log('⚠️ No payments found for provider:', providerId);
        console.log('🔍 Trying to fetch all bookings for demo...');
        
        const { data: allBookings } = await this.client
          .from('shop_bookings')
          .select('*')
          .gte('booking_date', startDate.toISOString().split('T')[0])
          .limit(10);
          
        console.log('🔍 All available bookings:', allBookings);
        if (allBookings && allBookings.length > 0) {
          console.log('🔍 Provider IDs in bookings:', [...new Set(allBookings.map(b => b.provider_id))]);
        }
      }

      console.log('📊 Fetched data:', {
        payments: payments.length,
        bookings: bookings.length,
        services: services.length,
        hourlyBookings: hourlyBookings.length
      });
      
      console.log('📊 Analytics Debug - Provider ID used:', providerId);
      console.log('📊 Analytics Debug - Payments data:', payments);
      console.log('📊 Analytics Debug - First payment total_price:', payments[0]?.total_price);
      console.log('📊 Analytics Debug - All payment prices:', payments.map(p => p.total_price));

      // Generate income data
      const incomeData = this.generateIncomeData(payments, period, periodCount);

      // Calculate customer engagement
      const customerEngagement = this.calculateCustomerEngagement(bookings, payments);

      // Generate monthly stats (always monthly regardless of period)
      const monthlyStats = this.generateMonthlyStats(payments, bookings);

      // Calculate service performance
      const servicePerformance = await this.calculateServicePerformance(services, bookings, payments, providerId);

      // Calculate peak hours
      const peakHours = this.calculatePeakHours(hourlyBookings);

      // Calculate totals - use total_price from shop_bookings table
      const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0);
      const revenueGrowth = this.calculateRevenueGrowth(incomeData);
      
      console.log('📊 Total Revenue Calculation:');
      console.log('  - Payments used for calculation:', payments.length);
      console.log('  - Individual prices:', payments.map(p => `${p.total_price} (${typeof p.total_price})`));
      console.log('  - Calculated total:', totalRevenue);
      console.log('  - Revenue growth:', revenueGrowth);

      return {
        success: true,
        data: {
          incomeData,
          customerEngagement,
          monthlyStats,
          servicePerformance,
          peakHours,
          totalRevenue,
          revenueGrowth
        }
      };

    } catch (error) {
      console.error('❌ Analytics data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics data'
      };
    }
  }

  private generateIncomeData(payments: any[], period: string, periodCount: number) {
    const data: Array<{period: string; amount: number; bookings: number; growth: number}> = [];
    const now = new Date();

    // Group payments by period
    const periodMap = new Map<string, {amount: number; bookings: number}>();

    for (let i = periodCount - 1; i >= 0; i--) {
      let date: Date;
      let key: string;

      if (period === 'week') {
        date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        key = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (period === 'year') {
        date = new Date(now.getFullYear() - i, 0, 1);
        key = date.getFullYear().toString();
      } else {
        date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        key = date.toLocaleDateString('en-US', { month: 'short' });
      }

      periodMap.set(key, { amount: 0, bookings: 0 });
    }

    // Aggregate payments
    payments.forEach(payment => {
      const paymentDate = new Date(payment.booking_date);
      let key: string;

      if (period === 'week') {
        key = paymentDate.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (period === 'year') {
        key = paymentDate.getFullYear().toString();
      } else {
        key = paymentDate.toLocaleDateString('en-US', { month: 'short' });
      }

      if (periodMap.has(key)) {
        const existing = periodMap.get(key)!;
        existing.amount += Number(payment.total_price) || 0;
        existing.bookings += 1;
      }
    });

    // Convert to array and calculate growth
    let previousAmount = 0;
    Array.from(periodMap.entries()).forEach(([key, value]) => {
      const growth = previousAmount > 0 ? ((value.amount - previousAmount) / previousAmount) * 100 : 0;
      data.push({
        period: key,
        amount: value.amount,
        bookings: value.bookings,
        growth
      });
      previousAmount = value.amount;
    });

    return data;
  }

  private calculateCustomerEngagement(bookings: any[], payments: any[]) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get unique customers
    const allCustomers = new Set(bookings.map(b => b.customer_email || b.customer_phone).filter(Boolean));
    const thisMonthBookings = bookings.filter(b => new Date(b.booking_date) >= thisMonth);
    const lastMonthBookings = bookings.filter(b => {
      const date = new Date(b.booking_date);
      return date >= lastMonth && date < thisMonth;
    });

    const thisMonthCustomers = new Set(thisMonthBookings.map(b => b.customer_email || b.customer_phone).filter(Boolean));
    const lastMonthCustomers = new Set(lastMonthBookings.map(b => b.customer_email || b.customer_phone).filter(Boolean));

    // Calculate new vs returning customers
    const returningThisMonth = Array.from(thisMonthCustomers).filter(c => lastMonthCustomers.has(c));
    const newCustomers = thisMonthCustomers.size - returningThisMonth.length;

    // Calculate average booking value
    const paidPayments = payments.filter(p => p.payment_status === 'paid');
    const averageBookingValue = paidPayments.length > 0 
      ? paidPayments.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0) / paidPayments.length 
      : 0;

    // Calculate repeat rate
    const repeatRate = allCustomers.size > 0 
      ? (returningThisMonth.length / allCustomers.size) * 100 
      : 0;

    return {
      newCustomers,
      returningCustomers: returningThisMonth.length,
      totalBookings: thisMonthBookings.length,
      averageBookingValue,
      customerSatisfaction: 4.5, // Will be calculated from real reviews later
      repeatRate
    };
  }

  private generateMonthlyStats(payments: any[], bookings: any[]) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const data: Array<{month: string; revenue: number; customers: number; bookings: number}> = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.booking_date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const monthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.booking_date);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });

      const monthCustomers = new Set(monthBookings.map(b => b.customer_email || b.customer_phone).filter(Boolean));

      data.push({
        month: months[date.getMonth()],
        revenue: monthPayments.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0),
        customers: monthCustomers.size,
        bookings: monthBookings.length
      });
    }

    return data;
  }

  private async calculateServicePerformance(services: any[], bookings: any[], payments: any[], providerId: string) {
    const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#06B6D4'];
    const performance: Array<{
      serviceName: string;
      bookings: number;
      revenue: number;
      averageRating: number;
      color: string;
    }> = [];

    for (let i = 0; i < services.length && i < 7; i++) {
      const service = services[i];
      
      // Count bookings for this service
      const serviceBookings = bookings.filter(b => b.service_id === service.id || b.service_title === service.name);
      
      // Calculate revenue for this service
      const servicePayments = payments.filter(p => 
        p.service_title === service.name || 
        serviceBookings.some(b => b.id === p.booking_id)
      );
      const serviceRevenue = servicePayments.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0);

      // Get average rating (placeholder for now - will implement with reviews)
      const averageRating = 4.0 + Math.random() * 1;

      performance.push({
        serviceName: service.name,
        bookings: serviceBookings.length,
        revenue: serviceRevenue,
        averageRating,
        color: colors[i % colors.length]
      });
    }

    return performance.sort((a, b) => b.revenue - a.revenue);
  }

  private calculatePeakHours(hourlyBookings: any[]) {
    const hours = [
      '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', 
      '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'
    ];

    const hourCounts = new Map<string, number>();
    hours.forEach(hour => hourCounts.set(hour, 0));

    hourlyBookings.forEach(booking => {
      if (booking.booking_time) {
        const hour = parseInt(booking.booking_time.split(':')[0]);
        let hourLabel: string;
        
        if (hour === 0) hourLabel = '12 AM';
        else if (hour < 12) hourLabel = `${hour} AM`;
        else if (hour === 12) hourLabel = '12 PM';
        else hourLabel = `${hour - 12} PM`;

        if (hourCounts.has(hourLabel)) {
          hourCounts.set(hourLabel, hourCounts.get(hourLabel)! + 1);
        }
      }
    });

    return hours.map(hour => ({
      hour,
      bookings: hourCounts.get(hour) || 0
    }));
  }

  private calculateRevenueGrowth(incomeData: Array<{amount: number; growth: number}>) {
    if (incomeData.length < 2) return 0;
    
    return incomeData.reduce((sum, item) => sum + item.growth, 0) / incomeData.length;
  }
}

// ==============================================
// EXPORTS
// ==============================================

export const normalizedShopService = new NormalizedShopService();
export { supabase };
export default normalizedShopService;