// Shop Schedule Service - Normalized Schedule Management
// This service manages shop schedules as a separate entity

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export interface ShopSchedule {
  id?: string;
  provider_id?: string;
  name?: string;
  description?: string;
  default_start_time?: string;
  default_end_time?: string;
  timezone?: string;
  advance_booking_days?: number;
  slot_duration?: number;
  buffer_time?: number;
  auto_approval?: boolean;
  cancellation_hours?: number;
  cancellation_policy?: string;
  lunch_start_time?: string;
  lunch_end_time?: string;
  enable_breaks?: boolean;
  observe_public_holidays?: boolean;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopWithSchedule {
  // Basic shop info
  id?: string;
  provider_id?: string;
  schedule_id?: string;
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
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Schedule details
  schedule?: ShopSchedule;
  business_hours?: any[];
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
      'X-Client-Info': 'react-native-buzybees-schedule',
    },
  },
});

// ==============================================
// SHOP SCHEDULE SERVICE CLASS
// ==============================================

class ShopScheduleService {
  private client = supabase;

  constructor() {
    console.log('🗓️ Shop Schedule Service initialized');
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
  // SCHEDULE MANAGEMENT
  // ==============================================

  async createSchedule(scheduleData: ShopSchedule): Promise<ServiceResponse<ShopSchedule>> {
    try {
      console.log('🗓️ Creating shop schedule...');
      
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_schedules')
        .insert({
          provider_id: user.id,
          name: scheduleData.name || 'Business Schedule',
          description: scheduleData.description,
          default_start_time: scheduleData.default_start_time || '09:00',
          default_end_time: scheduleData.default_end_time || '17:00',
          timezone: scheduleData.timezone || 'Europe/Stockholm',
          advance_booking_days: scheduleData.advance_booking_days || 30,
          slot_duration: scheduleData.slot_duration || 60,
          buffer_time: scheduleData.buffer_time || 15,
          auto_approval: scheduleData.auto_approval ?? true,
          cancellation_hours: scheduleData.cancellation_hours || 24,
          cancellation_policy: scheduleData.cancellation_policy,
          lunch_start_time: scheduleData.lunch_start_time,
          lunch_end_time: scheduleData.lunch_end_time,
          enable_breaks: scheduleData.enable_breaks ?? false,
          observe_public_holidays: scheduleData.observe_public_holidays ?? true,
          is_default: scheduleData.is_default ?? false,
          is_active: scheduleData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Schedule creation error:', error);
        return {
          success: false,
          error: `Failed to create schedule: ${error.message}`
        };
      }

      console.log('✅ Schedule created successfully');
      return {
        success: true,
        data: data as ShopSchedule
      };

    } catch (error) {
      console.error('❌ Unexpected schedule creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateSchedule(scheduleId: string, scheduleData: Partial<ShopSchedule>): Promise<ServiceResponse<ShopSchedule>> {
    try {
      console.log('🗓️ Updating shop schedule:', scheduleId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await this.client
        .from('shop_schedules')
        .update({
          ...scheduleData,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Schedule update error:', error);
        return {
          success: false,
          error: `Failed to update schedule: ${error.message}`
        };
      }

      console.log('✅ Schedule updated successfully');
      return {
        success: true,
        data: data as ShopSchedule
      };

    } catch (error) {
      console.error('❌ Unexpected schedule update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSchedule(scheduleId: string): Promise<ServiceResponse<ShopSchedule>> {
    try {
      console.log('🗓️ Fetching schedule:', scheduleId);

      const { data, error } = await this.client
        .from('shop_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (error) {
        console.error('❌ Get schedule error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched schedule');
      return {
        success: true,
        data: data as ShopSchedule
      };

    } catch (error) {
      console.error('❌ Get schedule error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSchedulesByProvider(providerId?: string): Promise<ServiceResponse<ShopSchedule[]>> {
    try {
      console.log('🗓️ Fetching schedules for provider...');

      const user = await this.getCurrentUser();
      const targetProviderId = providerId || user?.id;

      if (!targetProviderId) {
        return {
          success: false,
          error: 'No provider ID available'
        };
      }

      const { data, error } = await this.client
        .from('shop_schedules')
        .select('*')
        .eq('provider_id', targetProviderId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Get schedules error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Successfully fetched schedules:', data?.length || 0);
      return {
        success: true,
        data: data as ShopSchedule[] || []
      };

    } catch (error) {
      console.error('❌ Get schedules error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async setDefaultSchedule(scheduleId: string): Promise<ServiceResponse<ShopSchedule>> {
    try {
      console.log('🗓️ Setting default schedule:', scheduleId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // The database trigger will handle unsetting other default schedules
      const { data, error } = await this.client
        .from('shop_schedules')
        .update({
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .eq('provider_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Set default schedule error:', error);
        return {
          success: false,
          error: `Failed to set default schedule: ${error.message}`
        };
      }

      console.log('✅ Default schedule set successfully');
      return {
        success: true,
        data: data as ShopSchedule
      };

    } catch (error) {
      console.error('❌ Unexpected set default schedule error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteSchedule(scheduleId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🗓️ Deleting schedule:', scheduleId);

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if this schedule is in use by any shops
      const { data: shops, error: checkError } = await this.client
        .from('provider_businesses')
        .select('id')
        .eq('schedule_id', scheduleId)
        .limit(1);

      if (checkError) {
        console.error('❌ Check schedule usage error:', checkError);
        return {
          success: false,
          error: `Failed to check schedule usage: ${checkError.message}`
        };
      }

      if (shops && shops.length > 0) {
        return {
          success: false,
          error: 'Cannot delete schedule that is in use by shops'
        };
      }

      const { error } = await this.client
        .from('shop_schedules')
        .delete()
        .eq('id', scheduleId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Schedule deletion error:', error);
        return {
          success: false,
          error: `Failed to delete schedule: ${error.message}`
        };
      }

      console.log('✅ Schedule deleted successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected schedule deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // SHOP WITH SCHEDULE MANAGEMENT
  // ==============================================

  async createShopWithSchedule(shopData: any, scheduleData?: ShopSchedule): Promise<ServiceResponse<ShopWithSchedule>> {
    try {
      console.log('🏪 Creating shop with schedule...');
      
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data: result, error } = await this.client.rpc('create_shop_with_schedule', {
        p_provider_id: user.id,
        p_shop_data: shopData,
        p_schedule_data: scheduleData || null
      });

      if (error) {
        console.error('❌ Shop with schedule creation error:', error);
        return {
          success: false,
          error: `Failed to create shop with schedule: ${error.message}`
        };
      }

      if (!result || !result.success) {
        console.error('❌ Shop with schedule creation failed:', result);
        return {
          success: false,
          error: result?.error || 'Shop creation failed'
        };
      }

      console.log('✅ Shop with schedule created successfully');
      
      // Fetch the complete shop data
      const completeShop = await this.getShopWithSchedule(result.shop_id);
      
      return {
        success: true,
        data: completeShop.data,
        message: 'Shop created successfully with schedule'
      };

    } catch (error) {
      console.error('❌ Unexpected shop with schedule creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getShopWithSchedule(shopId: string): Promise<ServiceResponse<ShopWithSchedule>> {
    try {
      console.log('🔍 Fetching shop with schedule:', shopId);

      const { data, error } = await this.client
        .from('shop_complete_with_schedule')
        .select('*')
        .eq('id', shopId)
        .single();

      if (error) {
        console.error('❌ Get shop with schedule error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Transform the data to include schedule as nested object
      const shopWithSchedule: ShopWithSchedule = {
        ...data,
        schedule: data.schedule_id ? {
          id: data.schedule_table_id,
          name: data.schedule_name,
          description: data.schedule_description,
          default_start_time: data.schedule_default_start_time,
          default_end_time: data.schedule_default_end_time,
          timezone: data.schedule_timezone,
          advance_booking_days: data.schedule_advance_booking_days,
          slot_duration: data.schedule_slot_duration,
          buffer_time: data.schedule_buffer_time,
          auto_approval: data.schedule_auto_approval,
          cancellation_hours: data.cancellation_hours,
          cancellation_policy: data.cancellation_policy,
          lunch_start_time: data.lunch_start_time,
          lunch_end_time: data.lunch_end_time,
          enable_breaks: data.enable_breaks,
          observe_public_holidays: data.observe_public_holidays,
          is_default: data.schedule_is_default,
          is_active: data.schedule_is_active
        } : undefined,
        business_hours: data.normalized_business_hours || []
      };

      console.log('✅ Successfully fetched shop with schedule');
      return {
        success: true,
        data: shopWithSchedule
      };

    } catch (error) {
      console.error('❌ Get shop with schedule error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async assignScheduleToShop(shopId: string, scheduleId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log('🔗 Assigning schedule to shop:', { shopId, scheduleId });

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { error } = await this.client
        .from('provider_businesses')
        .update({
          schedule_id: scheduleId,
          updated_at: new Date().toISOString()
        })
        .eq('id', shopId)
        .eq('provider_id', user.id);

      if (error) {
        console.error('❌ Assign schedule error:', error);
        return {
          success: false,
          error: `Failed to assign schedule: ${error.message}`
        };
      }

      console.log('✅ Schedule assigned successfully');
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('❌ Unexpected assign schedule error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==============================================
  // MIGRATION HELPER
  // ==============================================

  async migrateExistingSchedules(): Promise<ServiceResponse<any>> {
    try {
      console.log('🔄 Migrating existing schedules...');

      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data: result, error } = await this.client.rpc('migrate_shop_schedules');

      if (error) {
        console.error('❌ Schedule migration error:', error);
        return {
          success: false,
          error: `Failed to migrate schedules: ${error.message}`
        };
      }

      console.log('✅ Schedule migration completed:', result);
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Unexpected schedule migration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ==============================================
// EXPORTS
// ==============================================

export const shopScheduleService = new ShopScheduleService();
export { supabase };
export default shopScheduleService;