// Updated updateShop function to use comprehensive CRUD functions
// This replaces the old direct query approach in normalized.ts

import { supabase } from './normalized';

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CompleteShopData {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  image_url?: string;
  images?: string[];
  logo_url?: string;
  business_hours?: any[];
  special_days?: any[];
  business_hours_start?: string;
  business_hours_end?: string;
  timezone?: string;
  advance_booking_days?: number;
  slot_duration?: number;
  buffer_time?: number;
  auto_approval?: boolean;
  first_time_discount_active?: boolean;
  is_active?: boolean;
  // Add support for services and staff during creation
  services?: any[];
  staff?: any[];
  discounts?: any[];
}

// Updated updateShop function using comprehensive CRUD
export async function updateShopWithCRUD(shopId: string, shopData: CompleteShopData, userId: string): Promise<ServiceResponse<CompleteShopData>> {
  try {
    console.log('🔄 Updating shop with comprehensive CRUD function:', shopId);
    
    // CRITICAL DEBUG: Show what data was received
    console.log('🚨 RECEIVED SHOP DATA:');
    console.log('Shop Name:', shopData.name);
    console.log('Business Hours Received:', shopData.business_hours);
    console.log('Business Hours Count:', shopData.business_hours?.length || 0);
    console.log('Business Hours Sample:', shopData.business_hours?.[0]);
    
    // Use the comprehensive shop update function
    const { data, error } = await supabase.rpc('buzybees_update_complete_shop', {
      p_shop_id: shopId,
      p_provider_id: userId,
      p_name: shopData.name,
      p_description: shopData.description || null,
      p_category: shopData.category || null,
      p_phone: shopData.phone || null,
      p_email: shopData.email || null,
      p_website_url: shopData.website_url || null,
      p_address: shopData.address || null,
      p_city: shopData.city || null,
      p_state: shopData.state || null,
      p_country: shopData.country || null,
      p_image_url: shopData.image_url || null,
      p_images: shopData.images || null,
      p_logo_url: shopData.logo_url || null,
      p_business_hours: shopData.business_hours || null,
      p_special_days: shopData.special_days || null,
      p_timezone: shopData.timezone || null,
      p_advance_booking_days: shopData.advance_booking_days || null,
      p_slot_duration: shopData.slot_duration || null,
      p_buffer_time: shopData.buffer_time || null,
      p_auto_approval: shopData.auto_approval ?? null,
      p_first_time_discount_active: shopData.first_time_discount_active ?? null,
      p_is_active: shopData.is_active ?? null
    });

    if (error) {
      console.error('❌ Shop update error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get the result from the function
    const result = data?.[0];
    if (!result?.success) {
      console.error('❌ Shop update failed:', result?.message);
      return {
        success: false,
        error: result?.message || 'Failed to update shop'
      };
    }

    console.log('✅ Shop updated successfully with CRUD function');
    console.log('📋 Updated fields:', result?.updated_fields);
    
    return {
      success: true,
      data: result?.shop_data || shopData,
      message: result?.message || 'Shop updated successfully'
    };

  } catch (error) {
    console.error('❌ Unexpected shop update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Updated createShop function using direct database operations
export async function createShopWithCRUD(shopData: CompleteShopData, userId: string): Promise<ServiceResponse<CompleteShopData>> {
  try {
    console.log('🏪 Creating shop with direct database operations');
    console.log('🔍 Services to create:', shopData.services?.length || 0);
    console.log('🔍 Staff to create:', shopData.staff?.length || 0);
    
    // Create the basic shop record first
    const { data: shopRecord, error: shopError } = await supabase
      .from('provider_businesses')
      .insert({
        provider_id: userId,
        name: shopData.name,
        description: shopData.description || '',
        category: shopData.category || 'Beauty & Wellness',
        phone: shopData.phone || '',
        email: shopData.email || '',
        website_url: shopData.website_url || null,
        address: shopData.address || '',
        city: shopData.city || '',
        state: shopData.state || '',
        country: shopData.country || 'Sweden',
        image_url: shopData.image_url || null,
        images: shopData.images || [],
        logo_url: shopData.logo_url || null,
        business_hours: shopData.business_hours || [
          {"day": "Monday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
          {"day": "Tuesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
          {"day": "Wednesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
          {"day": "Thursday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
          {"day": "Friday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
          {"day": "Saturday", "isOpen": true, "openTime": "10:00", "closeTime": "16:00"},
          {"day": "Sunday", "isOpen": false, "openTime": "10:00", "closeTime": "16:00"}
        ],
        special_days: shopData.special_days || [],
        timezone: shopData.timezone || 'Europe/Stockholm',
        advance_booking_days: shopData.advance_booking_days || 30,
        slot_duration: shopData.slot_duration || 60,
        buffer_time: shopData.buffer_time || 15,
        auto_approval: shopData.auto_approval ?? true,
        first_time_discount_active: shopData.first_time_discount_active ?? true,
        is_active: shopData.is_active ?? true
      })
      .select()
      .single();

    if (shopError) {
      console.error('❌ Shop creation error:', shopError);
      return {
        success: false,
        error: shopError.message
      };
    }

    const new_shop_id = shopRecord.id;
    console.log('✅ Basic shop created with ID:', new_shop_id);
    console.log('🔍 SHOP_ID VERIFICATION - After creation:');
    console.log('🔍 New shop ID:', new_shop_id);
    console.log('🔍 Shop name:', shopRecord.name);
    console.log('🔍 Provider ID:', userId);
    console.log('🚨 CRITICAL: Remember this shop ID for debugging:', new_shop_id);
    
    let staff_created = 0;
    let services_created = 0;
    
    console.log(`🔍 DEBUGGING SERVICE CREATION CONDITIONS:`);
    console.log(`🔍 shopData.services exists:`, !!shopData.services);
    console.log(`🔍 shopData.services length:`, shopData.services?.length || 0);
    console.log(`🔍 new_shop_id exists:`, !!new_shop_id);
    console.log(`🔍 new_shop_id value:`, new_shop_id);
    
    // Create services if provided
    const createdServiceIds: string[] = [];
    if (shopData.services && shopData.services.length > 0 && new_shop_id) {
      console.log(`📋 Creating ${shopData.services.length} services for new shop...`);
      console.log(`🔧 NEW SHOP ID: ${new_shop_id}`);
      console.log(`🔧 USER ID: ${userId}`);
      console.log(`🔧 ALL SERVICE DATA:`, JSON.stringify(shopData.services, null, 2));
      
      for (const service of shopData.services) {
        try {
          console.log(`🔨 Inserting service: ${service.name}`);
          console.log(`📊 Service data:`, {
            shop_id: new_shop_id,
            provider_id: userId,
            name: service.name,
            price: service.price,
            duration: service.duration
          });
          
          // Try multiple service table approaches to handle schema differences
          let serviceData = null;
          let serviceError = null;
          
          // Use minimal schema approach (same as working staff creation)
          console.log('🔄 Using minimal service schema like working staff...');
          
          const serviceToInsert = {
            shop_id: new_shop_id,
            provider_id: userId,
            name: service.name,
            description: service.description || '',
            price: Number(service.price || 0),
            duration: Number(service.duration || 60),
            category: service.category || shopData.category || 'General',
            location_type: service.location_type || 'in_house',
            is_active: service.is_active !== undefined ? service.is_active : true
          };
          
          console.log('📦 EXACT DATA BEING INSERTED:', serviceToInsert);
          console.log('🔍 VALIDATION CHECK:');
          console.log('   shop_id is:', new_shop_id, 'type:', typeof new_shop_id);
          console.log('   provider_id is:', userId, 'type:', typeof userId);
          console.log('   name is:', service.name, 'type:', typeof service.name);
          console.log('   is_active is:', true);
          
          ({ data: serviceData, error: serviceError } = await supabase
            .from('shop_services')
            .insert(serviceToInsert)
            .select()
            .single());
            
          if (serviceError) {
            console.error(`❌ Failed to create service ${service.name}:`, serviceError);
            console.error(`❌ Service error details:`, serviceError.details);
            console.error(`❌ Service error code:`, serviceError.code);
          } else {
            services_created++;
            createdServiceIds.push(serviceData.id);
            console.log(`✅ Service created successfully: ${service.name} (ID: ${serviceData.id})`);
            console.log(`✅ Service details:`, {
              id: serviceData.id,
              shop_id: serviceData.shop_id,
              provider_id: serviceData.provider_id,
              name: serviceData.name,
              is_active: serviceData.is_active
            });
          }
        } catch (error) {
          console.error(`❌ Exception creating service ${service.name}:`, error);
        }
      }
      
      // VERIFICATION: Query the services we just created
      console.log('🔍 VERIFYING: Querying services with shop_id:', new_shop_id);
      const { data: verifyServices, error: verifyError } = await supabase
        .from('shop_services')
        .select('*')
        .eq('shop_id', new_shop_id);
        
      console.log('🔍 VERIFICATION QUERY RESULT:');
      console.log('   Error:', verifyError?.message || 'none');
      console.log('   Services found:', verifyServices?.length || 0);
      if (verifyServices && verifyServices.length > 0) {
        console.log('   Services:', verifyServices.map(s => ({
          id: s.id,
          shop_id: s.shop_id,
          name: s.name,
          is_active: s.is_active
        })));
      }
      
    } else {
      console.warn(`⚠️ SERVICES NOT CREATED - CONDITIONS FAILED:`);
      console.warn(`⚠️ shopData.services:`, shopData.services);
      console.warn(`⚠️ shopData.services length:`, shopData.services?.length);
      console.warn(`⚠️ new_shop_id:`, new_shop_id);
    }
    
    // Create staff if provided
    if (shopData.staff && shopData.staff.length > 0 && new_shop_id) {
      console.log(`👤 Creating ${shopData.staff.length} staff members for new shop...`);
      for (const staffMember of shopData.staff) {
        try {
          // Ensure email is provided since it's required in the database
          const staffEmail = staffMember.email?.trim() || `${staffMember.name?.toLowerCase().replace(/\s+/g, '.')}@temp.local`;
          
          console.log(`🔨 Inserting staff: ${staffMember.name}`);
          console.log(`📊 Staff data:`, {
            shop_id: new_shop_id,
            provider_id: userId,
            name: staffMember.name,
            email: staffEmail,
            role: staffMember.role
          });
          
          const { data: staffData, error: staffError } = await supabase
            .from('shop_staff')
            .insert({
              shop_id: new_shop_id,
              provider_id: userId,
              name: staffMember.name,
              email: staffEmail,
              phone: staffMember.phone || '',
              role: staffMember.role || 'Staff',
              specialties: staffMember.specialties || [],
              work_schedule: {
                "monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
                "tuesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
                "wednesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
                "thursday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
                "friday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
                "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
                "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
              },
              leave_dates: [],
              is_active: true
            })
            .select()
            .single();
            
          if (staffError) {
            console.error(`❌ Failed to create staff ${staffMember.name}:`, staffError);
            console.error(`❌ Staff error details:`, staffError.details);
            console.error(`❌ Staff error code:`, staffError.code);
          } else {
            staff_created++;
            console.log(`✅ Staff created successfully: ${staffMember.name} (ID: ${staffData.id})`);
          }
        } catch (error) {
          console.error(`❌ Exception creating staff ${staffMember.name}:`, error);
        }
      }
    }
    
    console.log(`✅ Shop creation complete - Staff: ${staff_created}, Services: ${services_created}`);
    
    // Wait a moment for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // WORKAROUND: Force update services to ensure they're properly saved
    console.log('🔄 WORKAROUND: Forcing service update to fix initial creation issue...');
    for (const serviceId of createdServiceIds) {
      try {
        const { data: updateData, error: updateError } = await supabase
          .from('shop_services')
          .update({ 
            updated_at: new Date().toISOString(),
            is_active: true 
          })
          .eq('id', serviceId)
          .select()
          .single();
          
        if (updateError) {
          console.error('❌ Failed to force update service:', updateError);
        } else {
          console.log('✅ Force updated service:', updateData?.name);
        }
      } catch (err) {
        console.error('❌ Error in force update:', err);
      }
    }
    
    // Count discounts created by trigger
    const { count: discounts_created } = await supabase
      .from('shop_discounts')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', new_shop_id);
    
    console.log(`📊 Final counts - Staff: ${staff_created}, Services: ${services_created}, Discounts: ${discounts_created || 0}`);
    
    // CRITICAL FIX: Fetch the created services and staff to return with the shop data
    console.log('📋 Fetching created services and staff for response...');
    
    // Add a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: createdServices, error: fetchServicesError } = await supabase
      .from('shop_services')
      .select('*')
      .eq('shop_id', new_shop_id);
      
    const { data: createdStaff, error: fetchStaffError } = await supabase
      .from('shop_staff')
      .select('*')
      .eq('shop_id', new_shop_id);
    
    console.log('✅ Fetched services:', createdServices?.length || 0);
    console.log('✅ Fetched staff:', createdStaff?.length || 0);
    
    if (createdServices && createdServices.length > 0) {
      console.log('✅ VERIFICATION - Services in database:', createdServices.map(s => ({
        id: s.id,
        shop_id: s.shop_id,
        name: s.name,
        is_active: s.is_active
      })));
    } else {
      console.warn('⚠️ VERIFICATION FAILED - No services found for shop_id:', new_shop_id);
      console.warn('⚠️ Fetch error:', fetchServicesError);
      
      // NUCLEAR OPTION: Try to re-create services with a different approach
      if (shopData.services && shopData.services.length > 0 && services_created === 0) {
        console.log('🚨 NUCLEAR OPTION: Attempting to re-create services...');
        
        for (const service of shopData.services) {
          try {
            const { data: reCreatedService, error: reCreateError } = await supabase
              .from('shop_services')
              .upsert({
                shop_id: new_shop_id,
                provider_id: userId,
                name: service.name,
                description: service.description || '',
                price: Number(service.price || 0),
                duration: Number(service.duration || 60),
                category: service.category || shopData.category || 'General',
                location_type: 'in_house',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (reCreateError) {
              console.error('❌ Nuclear re-create failed:', reCreateError);
            } else {
              console.log('✅ Nuclear re-create success:', reCreatedService?.name);
            }
          } catch (err) {
            console.error('❌ Nuclear exception:', err);
          }
        }
        
        // Fetch again after nuclear option
        const { data: finalServices } = await supabase
          .from('shop_services')
          .select('*')
          .eq('shop_id', new_shop_id);
          
        console.log('🔍 Services after nuclear option:', finalServices?.length || 0);
      }
    }
    
    // Fetch services one more time to ensure we have the latest data
    const { data: finalServiceCheck } = await supabase
      .from('shop_services')
      .select('*')
      .eq('shop_id', new_shop_id);
    
    console.log('🏁 FINAL SERVICE CHECK:', finalServiceCheck?.length || 0, 'services');
    
    return {
      success: true,
      data: { 
        ...shopData, 
        id: new_shop_id,
        services: finalServiceCheck || createdServices || [],
        staff: createdStaff || []
      },
      message: `Shop created successfully with ${staff_created} staff and ${services_created} services`
    };

  } catch (error) {
    console.error('❌ Unexpected shop creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Function to get complete shop data using direct database queries
export async function getCompleteShopData(shopId: string, providerId?: string): Promise<ServiceResponse<any>> {
  try {
    console.log('📋 Getting complete shop data with direct queries:', shopId);
    
    // Get shop data
    let shopQuery = supabase
      .from('provider_businesses')
      .select('*')
      .eq('id', shopId);
      
    if (providerId) {
      shopQuery = shopQuery.eq('provider_id', providerId);
    }
    
    const { data: shopData, error: shopError } = await shopQuery.single();

    if (shopError) {
      console.error('❌ Get shop data error:', shopError);
      return {
        success: false,
        error: shopError.message
      };
    }

    if (!shopData) {
      return {
        success: false,
        error: 'Shop not found or access denied'
      };
    }

    // Get related data in parallel
    const [staffResult, servicesResult, discountsResult] = await Promise.all([
      supabase
        .from('shop_staff')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true),
      supabase
        .from('shop_services')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true),
      supabase
        .from('shop_discounts')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
    ]);

    console.log('✅ Shop data retrieved successfully');
    
    return {
      success: true,
      data: {
        shop: shopData,
        staff: staffResult.data || [],
        services: servicesResult.data || [],
        discounts: discountsResult.data || [],
        service_options: []
      },
      message: 'Shop data retrieved successfully'
    };

  } catch (error) {
    console.error('❌ Unexpected get shop data error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}