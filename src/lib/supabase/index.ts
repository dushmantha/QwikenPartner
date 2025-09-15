// lib/supabase/index.ts - React Native Compatible Version - INTEGRATED

import { createClient, SupabaseClient, AuthError, User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import integratedShopService from './integrated';

// ==============================================
// CONFIGURATION
// ==============================================

const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration');
}

// ==============================================
// TYPES & INTERFACES
// ==============================================

export type AccountType = 'consumer' | 'provider';
export type GenderType = 'male' | 'female' | 'other';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  accuracy?: number;
  fromCache?: boolean;
}

export interface LocationSuggestion {
  id: string;
  description: string;
  latitude?: number;
  longitude?: number;
  city: string;
  state: string;
  country: string;
}

export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  location: LocationData;
  gender: GenderType;
  birthDate: string;
  accountType: AccountType;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: GenderType;
  birth_date: string;
  address: string;
  bio?: string;
  avatar_url?: string;
  account_type: AccountType;
  is_premium: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  verification_required?: boolean;
}

export interface AvailabilityResponse {
  available: boolean;
  message?: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==============================================
// SUPABASE CLIENT - REACT NATIVE OPTIMIZED
// ==============================================

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Use password flow - most compatible with React Native
    flowType: 'password',
  },
  global: {
    headers: {
      'X-Client-Info': 'react-native',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

console.log('✅ Supabase client initialized for React Native');

// ==============================================
// AUTH SERVICE CLASS - FIXED
// ==============================================

class AuthServiceClass {
  constructor() {
    console.log('🔐 AuthService initialized');
    this.initializeAuthListener();
  }

  private initializeAuthListener(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in:', session?.user?.email);
          break;
        case 'SIGNED_OUT':
          console.log('👋 User signed out');
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed');
          break;
      }
    });
  }

  /**
   * Sign up a new user - MOCK FALLBACK METHOD
   */
  async signUpFallback(userData: UserData): Promise<AuthResponse> {
    try {
      console.log('🎭 Using MOCK authentication due to Supabase issues');
      console.log('🚀 Starting mock registration for:', userData.email);

      // Use mock auth service
      const { data: authData, error: authError } = await mockAuth.signUp({
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            full_name: `${userData.firstName} ${userData.lastName}`,
          },
        },
      });

      if (authError) {
        console.error('❌ Mock auth error:', authError);
        return {
          success: false,
          error: this.handleAuthError(authError.message),
        };
      }

      if (!authData?.user) {
        return {
          success: false,
          error: 'Failed to create user account',
        };
      }

      console.log('✅ Mock user created successfully:', authData.user.id);
      console.log('⚠️ Note: This is a mock account for development. Data will not persist to production.');

      return {
        success: true,
        user: authData.user as User,
        session: authData.session,
        verification_required: false, // Mock accounts are pre-verified
      };

    } catch (error: any) {
      console.error('❌ Mock registration error:', error);
      return {
        success: false,
        error: 'Failed to create mock account. Please try again.',
      };
    }
  }

  /**
   * Sign up a new user - SIMPLIFIED AND FIXED
   */
  async signUp(userData: UserData): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting registration for:', userData.email);

      // 1. Create auth user WITH metadata for profile creation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            address: userData.address || '',
            gender: userData.gender,
            birth_date: userData.birthDate,
            account_type: userData.accountType,
            location: userData.location ? {
              latitude: userData.location.latitude,
              longitude: userData.location.longitude,
              address: userData.location.address,
              city: userData.location.city,
              state: userData.location.state,
              country: userData.location.country,
              postalCode: userData.location.postalCode,
            } : null,
          },
        },
      });

      if (authError) {
        console.error('❌ Auth error details:', authError);
        console.error('❌ Auth error message:', authError.message);
        console.error('❌ Auth error code:', authError.status);
        
        return {
          success: false,
          error: this.handleAuthError(authError.message),
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Failed to create user account',
        };
      }

      console.log('✅ Auth user created:', authData.user.id);

      // 2. Try to create/update the user profile (but don't fail if it doesn't work)
      try {
        const userProfileData = {
          id: authData.user.id,
          email: userData.email.toLowerCase().trim(),
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          address: userData.address || '',
          gender: userData.gender,
          birth_date: userData.birthDate,
          account_type: userData.accountType,
          user_type: userData.accountType === 'provider' ? 'provider' : 'customer',
          full_name: `${userData.firstName} ${userData.lastName}`,
          is_active: true,
          email_verified: false,
          phone_verified: false,
          is_premium: false,
          subscription_status: 'inactive',
        };

        const { error: profileError } = await supabase
          .from('users')
          .upsert(userProfileData, { onConflict: 'id' });

        if (profileError) {
          console.log('⚠️ User profile creation/update warning:', profileError);
          // Don't fail the registration, profile will be created by trigger
        } else {
          console.log('✅ User profile data saved successfully');
        }
      } catch (profileErr) {
        console.log('⚠️ User profile save skipped:', profileErr);
      }

      console.log('✅ User registration completed successfully');

      return {
        success: true,
        user: authData.user,
        session: authData.session,
        verification_required: !authData.user.email_confirmed_at,
      };

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Sign in user - Enhanced with debugging and mock fallback
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const cleanEmail = email.toLowerCase().trim();
      console.log('🔐 Attempting to sign in user:', cleanEmail);
      console.log('🔐 Password length:', password.length);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // Enhanced error logging
      if (error) {
        console.error('❌ Supabase sign in error details:');
        console.error('   - Error message:', error.message);
        console.error('   - Error name:', error.name);
        console.error('   - Status:', error.status);
        console.error('   - Full error:', error);
        
        return {
          success: false,
          error: this.handleAuthError(error.message),
        };
      }

      // Enhanced success logging
      if (data.user) {
        console.log('✅ User signed in successfully');
        console.log('   - User ID:', data.user.id);
        console.log('   - User email:', data.user.email);
        console.log('   - Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
        
        // Ensure session is properly established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ Session established:', session.access_token ? 'Token present' : 'No token');
        } else {
          console.warn('⚠️ No session after login:', sessionError);
        }
        console.log('   - Session exists:', !!data.session);
      } else {
        console.warn('⚠️ Sign in returned no user data');
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      console.error('❌ Sign in catch error:', error);
      console.error('   - Error type:', typeof error);
      console.error('   - Error message:', error.message);
      console.error('   - Error stack:', error.stack);
      
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<ServiceResponse> {
    try {
      console.log('👋 Signing out user...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        return {
          success: false,
          error: 'Failed to sign out',
        };
      }

      console.log('✅ User signed out successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // First try to get the session to ensure we have valid auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('⚠️ No valid session found');
        return null;
      }
      
      // Now get the user with valid session
      const { data: { user }, error } = await supabase.auth.getUser();
      
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

  /**
   * Get comprehensive user profile with all related data
   */
  async getUserProfile(userId?: string): Promise<ServiceResponse<any>> {
    try {
      let targetUserId = userId;

      if (!targetUserId) {
        console.log('🔍 Getting current user for profile fetch...');
        const user = await this.getCurrentUser();
        if (!user) {
          console.error('❌ No authenticated user found for profile fetch');
          return {
            success: false,
            error: 'User not authenticated - please login again'
          };
        }
        targetUserId = user.id;
        console.log('✅ User found:', targetUserId);
      }

      console.log('📝 Fetching comprehensive user profile for:', targetUserId);

      // First try the SQL function approach
      try {
        const { data: sqlResult, error: sqlError } = await supabase
          .rpc('get_user_profile', {
            p_user_id: targetUserId
          });

        if (!sqlError && sqlResult && sqlResult.success) {
          console.log('✅ Profile fetched via SQL function');
          return {
            success: true,
            data: sqlResult.user
          };
        }
      } catch (sqlFunctionError) {
        console.warn('⚠️ SQL function not available, falling back to direct query');
      }

      // Fallback to direct table query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (userError) {
        console.error('❌ Get user error:', userError);
        
        // If users table doesn't exist, return mock data
        if (userError.code === 'PGRST116' || userError.message.includes('does not exist')) {
          console.warn('⚠️ Users table not found, returning mock profile');
          const currentUser = await this.getCurrentUser();
          return {
            success: true,
            data: {
              id: currentUser?.id || targetUserId,
              email: currentUser?.email || 'user@example.com',
              first_name: currentUser?.user_metadata?.first_name || 'User',
              last_name: currentUser?.user_metadata?.last_name || 'Name',
              full_name: currentUser?.user_metadata?.full_name || 'User Name',
              phone: currentUser?.phone || '',
              account_type: 'consumer',
              avatar_url: null,
              is_premium: false,
              email_verified: currentUser?.email_confirmed_at ? true : false,
              phone_verified: false,
              created_at: currentUser?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          };
        }
        
        return {
          success: false,
          error: 'Failed to fetch user profile'
        };
      }

      if (!userData) {
        console.warn('⚠️ No user data found, returning mock profile');
        const currentUser = await this.getCurrentUser();
        return {
          success: true,
          data: {
            id: currentUser?.id || targetUserId,
            email: currentUser?.email || 'user@example.com',
            first_name: currentUser?.user_metadata?.first_name || 'User',
            last_name: currentUser?.user_metadata?.last_name || 'Name',
            full_name: currentUser?.user_metadata?.full_name || 'User Name',
            phone: currentUser?.phone || '',
            account_type: 'consumer',
            avatar_url: null,
            is_premium: false,
            email_verified: currentUser?.email_confirmed_at ? true : false,
            phone_verified: false,
            created_at: currentUser?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      }

      // Get user locations
      const { data: locations } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_primary', true)
        .limit(1);

      // Get provider details if user is a provider
      let providerDetails = null;
      if (userData.account_type === 'provider') {
        const { data: provider } = await supabase
          .from('provider_details')
          .select(`
            *,
            provider_skills (
              skill_name,
              experience_level
            ),
            provider_certifications (
              certification_name,
              issued_by,
              issue_date,
              expiry_date
            )
          `)
          .eq('user_id', targetUserId)
          .single();
        
        providerDetails = provider;
      }

      // Get consumer details if user is a consumer
      let consumerDetails = null;
      if (userData.account_type === 'consumer') {
        const { data: consumer } = await supabase
          .from('consumer_details')
          .select(`
            *,
            consumer_preferred_services (
              service_category
            )
          `)
          .eq('user_id', targetUserId)
          .single();
        
        consumerDetails = consumer;
      }

      // Get user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      // Construct comprehensive profile
      const profile = {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        first_name: userData.first_name,
        last_name: userData.last_name,
        full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        gender: userData.gender,
        birth_date: userData.birth_date,
        address: userData.address,
        bio: userData.bio,
        avatar_url: userData.avatar_url,
        account_type: userData.account_type,
        is_premium: userData.is_premium,
        email_verified: userData.email_verified,
        phone_verified: userData.phone_verified,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        
        // Location data
        location: locations?.[0] || null,
        
        // Provider-specific data
        provider_details: providerDetails,
        
        // Consumer-specific data
        consumer_details: consumerDetails,
        
        // User preferences
        preferences: preferences || null
      };

      console.log('✅ Profile fetched successfully');
      return {
        success: true,
        data: profile
      };
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<ServiceResponse> {
    try {
      console.log('📝 Updating user profile...');

      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Update profile error:', error);
        return {
          success: false,
          error: 'Failed to update profile',
        };
      }

      console.log('✅ Profile updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<ServiceResponse> {
    try {
      console.log('🔄 Resetting password for:', email);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim()
      );

      if (error) {
        console.error('❌ Reset password error:', error);
        return {
          success: false,
          error: this.handleAuthError(error.message),
        };
      }

      console.log('✅ Password reset email sent');
      return {
        success: true,
        message: 'Password reset email sent',
      };
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * Check email availability
   */
  async checkEmailAvailability(email: string): Promise<AvailabilityResponse> {
    try {
      console.log('📧 Checking email availability:', email);

      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        console.error('⚠️ Email check error:', error);
        return { available: true }; // Assume available on error
      }

      if (data) {
        console.log('❌ Email is already taken');
        return {
          available: false,
          message: 'This email is already registered',
        };
      }

      console.log('✅ Email is available');
      return { available: true };
    } catch (error) {
      console.error('❌ Email availability check failed:', error);
      return { available: true };
    }
  }

  /**
   * Check phone availability
   */
  async checkPhoneAvailability(phone: string): Promise<AvailabilityResponse> {
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      console.log('📱 Checking phone availability:', cleanPhone);

      const { data, error } = await supabase
        .from('users')
        .select('phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) {
        console.error('⚠️ Phone check error:', error);
        return { available: true };
      }

      if (data) {
        console.log('❌ Phone is already taken');
        return {
          available: false,
          message: 'This phone number is already registered',
        };
      }

      console.log('✅ Phone is available');
      return { available: true };
    } catch (error) {
      console.error('❌ Phone availability check failed:', error);
      return { available: true };
    }
  }


  /**
   * Check if user exists in auth.users table
   */
  async checkUserExists(email: string): Promise<boolean> {
    try {
      console.log('🔍 Checking if user exists:', email);
      
      // Try to get user from auth.users
      const { data, error } = await supabase.auth.admin.getUserByEmail(email);
      
      if (error) {
        console.log('❌ Cannot check user existence (admin required):', error.message);
        return false;
      }
      
      const exists = !!data.user;
      console.log(`${exists ? '✅' : '❌'} User exists in auth.users:`, exists);
      return exists;
    } catch (error) {
      console.error('❌ Error checking user existence:', error);
      return false;
    }
  }

  /**
   * Get comprehensive provider dashboard data
   */
  async getProviderDashboardData(providerId?: string): Promise<ServiceResponse<any>> {
    try {
      let targetProviderId = providerId;

      if (!targetProviderId) {
        const user = await this.getCurrentUser();
        if (!user) {
          return {
            success: false,
            error: 'User not authenticated'
          };
        }
        targetProviderId = user.id;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetProviderId)) {
        console.error('❌ Invalid UUID format:', targetProviderId);
        return {
          success: false,
          error: 'Invalid user ID format'
        };
      }

      console.log('📊 Fetching provider dashboard data for:', targetProviderId);

      // Call the database function to get all dashboard data
      const { data, error } = await supabase
        .rpc('get_provider_dashboard_data', {
          provider_user_id: targetProviderId
        });

      if (error) {
        console.error('❌ Provider dashboard error:', error);
        return {
          success: false,
          error: 'Failed to fetch dashboard data: ' + error.message
        };
      }

      console.log('✅ Provider dashboard data fetched successfully');
      return {
        success: true,
        data: data || {}
      };
    } catch (error) {
      console.error('❌ Provider dashboard error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Get provider businesses (shops) with enhanced data
   */
  async getProviderBusinesses(providerId?: string): Promise<ServiceResponse<any[]>> {
    try {
      let targetProviderId = providerId;

      if (!targetProviderId) {
        const user = await this.getCurrentUser();
        if (!user) {
          return {
            success: false,
            error: 'User not authenticated'
          };
        }
        targetProviderId = user.id;
      }

      console.log('🏪 Fetching provider businesses with enhanced data for:', targetProviderId);

      const { data, error } = await supabase
        .from('provider_businesses')
        .select('*')
        .eq('provider_id', targetProviderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Get businesses error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ provider_businesses table does not exist, returning empty array');
          return {
            success: true,
            data: []
          };
        }
        
        return {
          success: false,
          error: 'Failed to fetch businesses: ' + error.message
        };
      }

      // Parse JSON fields for each business
      const parsedData = (data || []).map(business => ({
        ...business,
        business_hours: typeof business.business_hours === 'string' 
          ? JSON.parse(business.business_hours) 
          : business.business_hours || [],
        special_days: typeof business.special_days === 'string' 
          ? JSON.parse(business.special_days) 
          : business.special_days || [],
        staff: typeof business.staff === 'string' 
          ? JSON.parse(business.staff) 
          : business.staff || [],
        services: typeof business.services === 'string' 
          ? JSON.parse(business.services) 
          : business.services || [],
        discounts: typeof business.discounts === 'string' 
          ? JSON.parse(business.discounts) 
          : business.discounts || [],
        images: typeof business.images === 'string' 
          ? JSON.parse(business.images) 
          : business.images || []
      }));

      console.log('✅ Provider businesses fetched successfully with enhanced data');
      return {
        success: true,
        data: parsedData
      };
    } catch (error) {
      console.error('❌ Get businesses error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Debug shop creation by testing each step
   */
  async debugShopCreation(businessData: any): Promise<ServiceResponse<any>> {
    try {
      console.log('🔍 Starting debug shop creation...');
      
      // Step 1: Check authentication
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }
      console.log('✅ User authenticated:', user.id);
      
      // Step 2: Test database connection
      const { data: testData, error: testError } = await supabase
        .from('provider_businesses')
        .select('count(*)')
        .limit(1);
      
      if (testError) {
        console.error('❌ Database connection failed:', testError);
        return {
          success: false,
          error: 'Database connection failed: ' + testError.message
        };
      }
      console.log('✅ Database connection working');
      
      // Step 3: Validate required data
      if (!businessData.name || businessData.name.trim() === '') {
        return {
          success: false,
          error: 'Shop name is required'
        };
      }
      console.log('✅ Data validation passed');
      
      // Step 4: Test minimal insert
      const minimalData = {
        provider_id: user.id,
        name: businessData.name,
        description: businessData.description || 'Test description',
        category: businessData.category || 'Beauty & Wellness',
        address: businessData.address || 'Test address',
        city: businessData.city || 'Test city',
        state: businessData.state || '',
        country: businessData.country || 'Sweden',
        phone: businessData.phone || '1234567890',
        email: businessData.email || 'shop@example.com'
      };
      
      console.log('🏪 Testing minimal insert with data:', minimalData);
      
      const { data: insertData, error: insertError } = await supabase
        .from('provider_businesses')
        .insert(minimalData)
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Minimal insert failed:', insertError);
        return {
          success: false,
          error: 'Minimal insert failed: ' + insertError.message
        };
      }
      
      console.log('✅ Minimal insert successful:', insertData);
      return {
        success: true,
        data: insertData
      };
      
    } catch (error) {
      console.error('❌ Debug shop creation error:', error);
      return {
        success: false,
        error: 'Debug failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Create a new provider business - USING INTEGRATED SERVICE
   */
  async createProviderBusiness(businessData: any): Promise<ServiceResponse<any>> {
    console.log('🔄 Delegating to integrated shop service...');
    return integratedShopService.createShop(businessData);
  }

  /**
   * Create a new provider business with full shop data - ENHANCED VERSION (DEPRECATED)
   */
  async createProviderBusinessOld(businessData: any): Promise<ServiceResponse<any>> {
    try {
      console.log('🏪 Starting enhanced shop creation process...');
      console.log('🏪 Input data:', JSON.stringify(businessData, null, 2));
      
      const user = await this.getCurrentUser();
      if (!user) {
        console.error('❌ User not authenticated');
        return {
          success: false,
          error: 'User not authenticated'
        };
      }
      console.log('✅ User authenticated:', user.id);

      // Validate required fields
      if (!businessData.name || businessData.name.trim() === '') {
        console.error('❌ Shop name is required');
        return {
          success: false,
          error: 'Shop name is required'
        };
      }

      console.log('🏪 Processing business data...');
      
      // Clean and validate image URLs
      const cleanImageUrls = (urls: any[]): string[] => {
        if (!Array.isArray(urls)) return [];
        return urls
          .filter(url => url && typeof url === 'string' && url.trim() !== '')
          .map(url => url.trim());
      };

      const cleanedImages = cleanImageUrls(businessData.images || []);
      const cleanedLogoUrl = (businessData.logo_url && typeof businessData.logo_url === 'string') 
        ? businessData.logo_url.trim() 
        : '';

      console.log('🖼️ Cleaned images:', cleanedImages);
      console.log('🖼️ Cleaned logo URL:', cleanedLogoUrl);
      
      // Process all data for direct insert with proper validation
      const processedData = {
        provider_id: user.id,
        name: businessData.name.trim(),
        description: businessData.description?.trim() || '',
        category: businessData.category?.trim() || 'Beauty & Wellness',
        address: businessData.address?.trim() || '',
        city: businessData.city?.trim() || '',
        state: businessData.state?.trim() || '',
        country: businessData.country?.trim() || 'Sweden',
        phone: businessData.phone?.trim() || '',
        email: businessData.email?.trim() || '',
        website_url: businessData.website_url?.trim() || null,
        
        // Image fields
        image_url: cleanedImages[0] || cleanedLogoUrl || '', // Main image
        logo_url: cleanedLogoUrl,
        images: cleanedImages, // Array of all images
        
        // Business hours
        business_hours_start: businessData.business_hours_start || '09:00',
        business_hours_end: businessData.business_hours_end || '17:00',
        business_hours: Array.isArray(businessData.business_hours) ? businessData.business_hours : [],
        
        // Enhanced JSONB fields
        staff: Array.isArray(businessData.staff) ? businessData.staff : [],
        services: Array.isArray(businessData.services) ? businessData.services : [],
        special_days: Array.isArray(businessData.special_days) ? businessData.special_days : [],
        discounts: Array.isArray(businessData.discounts) ? businessData.discounts : [],
        
        // Business settings
        timezone: businessData.timezone || 'Europe/Stockholm',
        advance_booking_days: parseInt(businessData.advance_booking_days) || 30,
        slot_duration: parseInt(businessData.slot_duration) || 60,
        buffer_time: parseInt(businessData.buffer_time) || 15,
        auto_approval: businessData.auto_approval !== undefined ? businessData.auto_approval : true,
        
        // Status fields
        is_active: businessData.is_active !== undefined ? businessData.is_active : true,
        is_verified: false // New shops are not verified by default
      };
      
      console.log('🏪 Final processed data for insert:');
      console.log('  - Provider ID:', processedData.provider_id);
      console.log('  - Name:', processedData.name);
      console.log('  - Images count:', processedData.images.length);
      console.log('  - Logo URL:', processedData.logo_url);
      console.log('  - Main image URL:', processedData.image_url);
      console.log('  - Staff count:', processedData.staff.length);
      console.log('  - Services count:', processedData.services.length);

      // Test database connection first
      console.log('🔍 Testing database connection...');
      const { error: connectionError } = await supabase
        .from('provider_businesses')
        .select('id')
        .limit(1);
        
      if (connectionError) {
        console.error('❌ Database connection failed:', connectionError);
        return {
          success: false,
          error: 'Database connection failed: ' + connectionError.message
        };
      }
      console.log('✅ Database connection successful');

      // Insert the business
      console.log('🏪 Inserting business into database...');
      const { data, error } = await supabase
        .from('provider_businesses')
        .insert(processedData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database insert error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // Provide specific error messages for common issues
        let errorMessage = 'Failed to create shop: ' + error.message;
        
        if (error.message.includes('foreign key')) {
          errorMessage = 'Authentication error. Please log out and log back in.';
        } else if (error.message.includes('duplicate')) {
          errorMessage = 'A shop with this name already exists.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your account settings.';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      if (!data) {
        console.error('❌ No data returned from insert');
        return {
          success: false,
          error: 'Shop creation failed - no data returned'
        };
      }

      console.log('✅ Shop created successfully!');
      console.log('✅ Created shop ID:', data.id);
      console.log('✅ Shop name:', data.name);
      console.log('✅ Images in DB:', data.images);
      console.log('✅ Logo URL in DB:', data.logo_url);
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Unexpected error in shop creation:', error);
      return {
        success: false,
        error: 'Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Update provider business with full shop data
   */
  async updateProviderBusiness(businessId: string, updates: any): Promise<ServiceResponse<any>> {
    try {
      console.log('🏪 Updating provider business with enhanced data:', businessId);

      // Filter updates to include enhanced schema fields
      const validFields = {
        name: updates.name,
        description: updates.description,
        category: updates.category,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        country: updates.country,
        phone: updates.phone,
        email: updates.email,
        website_url: updates.website_url,
        image_url: updates.image_url,
        business_hours_start: updates.business_hours_start,
        business_hours_end: updates.business_hours_end,
        is_active: updates.is_active,
        is_verified: updates.is_verified,
        // Enhanced fields
        logo_url: updates.logo_url,
        images: updates.images ? this.parseJSONField(updates.images, []) : undefined,
        business_hours: updates.business_hours ? this.parseJSONField(updates.business_hours, []) : undefined,
        special_days: updates.special_days ? this.parseJSONField(updates.special_days, []) : undefined,
        services: updates.services ? this.parseJSONField(updates.services, []) : undefined,
        staff: updates.staff ? this.parseJSONField(updates.staff, []) : undefined,
        discounts: updates.discounts ? this.parseJSONField(updates.discounts, []) : undefined,
        timezone: updates.timezone,
        advance_booking_days: updates.advance_booking_days,
        slot_duration: updates.slot_duration,
        buffer_time: updates.buffer_time,
        auto_approval: updates.auto_approval,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined fields
      const filteredUpdates = Object.fromEntries(
        Object.entries(validFields).filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from('provider_businesses')
        .update(filteredUpdates)
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        console.error('❌ Update business error:', error);
        return {
          success: false,
          error: 'Failed to update business: ' + error.message
        };
      }

      console.log('✅ Provider business updated successfully with enhanced data');
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Update business error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Create activity log entry
   */
  async createActivityLogEntry(activityData: any): Promise<ServiceResponse<any>> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log('📝 Creating activity log entry...');

      const { data, error } = await supabase
        .rpc('create_activity_log_entry', {
          p_provider_id: user.id,
          p_business_id: activityData.business_id || null,
          p_booking_id: activityData.booking_id || null,
          p_customer_id: activityData.customer_id || null,
          p_activity_type: activityData.activity_type || 'system',
          p_title: activityData.title || '',
          p_description: activityData.description || '',
          p_amount: activityData.amount || null,
          p_rating: activityData.rating || null,
          p_priority: activityData.priority || 'medium'
        });

      if (error) {
        console.error('❌ Create activity log error:', error);
        return {
          success: false,
          error: 'Failed to create activity log'
        };
      }

      console.log('✅ Activity log entry created successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Create activity log error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsAsRead(notificationIds: string[]): Promise<ServiceResponse<any>> {
    try {
      console.log('📬 Marking notifications as read...');

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', notificationIds);

      if (error) {
        console.error('❌ Update notifications error:', error);
        return {
          success: false,
          error: 'Failed to update notifications'
        };
      }

      console.log('✅ Notifications marked as read');
      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Update notifications error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Create storage buckets programmatically (disabled due to RLS issues)
   */
  async createStorageBuckets(): Promise<ServiceResponse<any>> {
    console.log('⚠️ Automatic bucket creation is disabled due to RLS policy conflicts');
    console.log('⚠️ Please run: fix_storage_rls_complete.sql in Supabase SQL Editor');
    console.log('⚠️ This will create buckets properly and fix all RLS issues');
    
    // Return a controlled failure with helpful message
    return {
      success: false,
      error: 'Automatic bucket creation disabled. Please run the SQL script: fix_storage_rls_complete.sql',
      data: {
        shop_images_created: false,
        user_avatars_created: false,
        shop_images_error: 'RLS policy conflicts prevent automatic creation',
        user_avatars_error: 'RLS policy conflicts prevent automatic creation',
        solution: 'Run fix_storage_rls_complete.sql in Supabase SQL Editor'
      }
    };
  }

  /**
   * Test Supabase storage connectivity
   */
  async testStorageConnection(): Promise<ServiceResponse<any>> {
    try {
      console.log('🧪 Testing Supabase storage connection...');
      
      // List buckets to check connectivity
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Storage connection error:', bucketsError);
        return {
          success: false,
          error: `Storage connection failed: ${bucketsError.message}`
        };
      }
      
      console.log('✅ Storage buckets available:', buckets);
      
      // Check if shop-images bucket exists
      const shopImagesBucket = buckets.find(bucket => bucket.id === 'shop-images');
      const userAvatarsBucket = buckets.find(bucket => bucket.id === 'user-avatars');
      
      if (!shopImagesBucket || !userAvatarsBucket) {
        console.error('❌ Required storage buckets missing');
        console.error('❌ Available buckets:', buckets.map(b => b.id).join(', '));
        console.error('❌ Total buckets found:', buckets.length);
        console.error('❌ Missing: shop-images =', !shopImagesBucket, ', user-avatars =', !userAvatarsBucket);
        
        // Try to create the missing buckets automatically
        console.log('🔧 Attempting to create missing buckets...');
        const createResult = await this.createStorageBuckets();
        
        if (createResult.success) {
          console.log('✅ Buckets created successfully, retesting...');
          // Re-test after creating buckets
          const { data: newBuckets, error: newBucketsError } = await supabase.storage.listBuckets();
          if (!newBucketsError && newBuckets) {
            const hasShopImages = newBuckets.some(b => b.id === 'shop-images');
            const hasUserAvatars = newBuckets.some(b => b.id === 'user-avatars');
            if (hasShopImages && hasUserAvatars) {
              console.log('✅ All buckets now exist after creation');
            } else {
              console.warn('⚠️ Bucket creation partially failed, but continuing...');
            }
          }
        } else {
          console.warn('⚠️ Could not create storage buckets automatically.');
          console.warn('⚠️ Image uploads may not work until buckets are created manually.');
          console.warn('⚠️ Please run: fix_storage_buckets_rls.sql in Supabase SQL Editor');
        }
      }
      
      console.log('✅ shop-images bucket found:', shopImagesBucket);
      
      // Try to list files in the bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('shop-images')
        .list('', { limit: 10 });
      
      if (filesError) {
        console.error('❌ Error listing files:', filesError);
        return {
          success: false,
          error: `Failed to list files: ${filesError.message}`
        };
      }
      
      console.log('✅ Files in shop-images bucket:', files);
      
      return {
        success: true,
        data: {
          buckets: buckets,
          shopImagesBucket: shopImagesBucket,
          fileCount: files.length
        }
      };
    } catch (error) {
      console.error('❌ Storage test error:', error);
      return {
        success: false,
        error: 'Storage test failed'
      };
    }
  }

  /**
   * Upload image to Supabase storage - USING INTEGRATED SERVICE
   */
  async uploadImage(localUri: string, folder: string = 'shops'): Promise<ServiceResponse<string>> {
    console.log('🔄 Delegating to integrated image upload...');
    return integratedShopService.uploadImage(localUri, folder);
  }

  /**
   * Upload multiple images - USING INTEGRATED SERVICE
   */
  async uploadMultipleImages(localUris: string[], folder: string = 'shops'): Promise<ServiceResponse<string[]>> {
    console.log('🔄 Delegating to integrated multiple image upload...');
    return integratedShopService.uploadMultipleImages(localUris, folder);
  }

  /**
   * Upload image to Supabase storage - OLD VERSION (DEPRECATED)
   */
  async uploadImageOld(localUri: string, folder: string = 'shops'): Promise<ServiceResponse<string>> {
    try {
      console.log('📸 Starting image upload:', { localUri, folder });

      // Check authentication first
      const user = await this.getCurrentUser();
      if (!user) {
        console.error('❌ User not authenticated for image upload');
        return {
          success: false,
          error: 'User not authenticated. Please log in to upload images.'
        };
      }
      
      console.log('✅ User authenticated for upload:', user.id);

      // Validate local URI
      if (!localUri || localUri.trim() === '') {
        console.error('❌ Invalid local URI provided:', localUri);
        return {
          success: false,
          error: 'Invalid image URI provided'
        };
      }

      // Generate unique filename with timestamp and random string
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}-${randomId}.jpg`;
      const filePath = `${folder}/${fileName}`;

      console.log('📸 Generated file path:', filePath);

      // Convert local URI to blob
      console.log('📸 Fetching image from local URI...');
      const response = await fetch(localUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('📸 Image blob created, size:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('Image blob is empty');
      }

      // Upload to Supabase storage
      console.log('📸 Uploading to Supabase storage bucket: shop-images');
      console.log('📸 Upload path:', filePath);
      console.log('📸 Blob type:', blob.type);
      console.log('📸 Blob size:', blob.size);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shop-images')
        .upload(filePath, blob, {
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        console.error('❌ Upload error details:', JSON.stringify(uploadError, null, 2));
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`
        };
      }

      console.log('✅ Upload successful, data:', uploadData);

      // Get public URL
      console.log('📸 Getting public URL for path:', filePath);
      const { data: urlData } = supabase.storage
        .from('shop-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('✅ Public URL generated:', publicUrl);

      // Validate the generated URL
      if (!publicUrl || publicUrl.trim() === '') {
        console.error('❌ Generated public URL is empty');
        return {
          success: false,
          error: 'Failed to generate public URL'
        };
      }

      console.log('✅ Image upload completed successfully:', publicUrl);
      return {
        success: true,
        data: publicUrl
      };
    } catch (error: any) {
      console.error('❌ Image upload error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        localUri: localUri
      });
      return {
        success: false,
        error: `Failed to upload image: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Register user using SQL function
   */
  async registerUser(email: string, password: string, firstName: string, lastName: string, phone: string = '', userType: string = 'customer'): Promise<ServiceResponse<any>> {
    try {
      console.log('🔐 Registering user with SQL function:', email);

      const { data, error } = await supabase
        .rpc('register_user', {
          p_email: email,
          p_password: password,
          p_first_name: firstName,
          p_last_name: lastName,
          p_phone: phone,
          p_user_type: userType
        });

      if (error) {
        console.error('❌ Register user error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ User registered successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Register user error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Login user using SQL function
   */
  async loginUser(email: string, password: string): Promise<ServiceResponse<any>> {
    try {
      console.log('🔐 Logging in user with SQL function:', email);

      const { data, error } = await supabase
        .rpc('login_user', {
          p_email: email,
          p_password: password
        });

      if (error) {
        console.error('❌ Login user error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ User logged in successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Login user error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Get user profile using SQL function
   */
  async getUserProfileSQL(userId: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📝 Getting user profile with SQL function:', userId);

      const { data, error } = await supabase
        .rpc('get_user_profile', {
          p_user_id: userId
        });

      if (error) {
        console.error('❌ Get user profile error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ User profile fetched successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Update user profile using SQL function
   */
  async updateUserProfileSQL(userId: string, firstName?: string, lastName?: string, phone?: string, avatarUrl?: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📝 Updating user profile with SQL function:', userId);

      const { data, error } = await supabase
        .rpc('update_user_profile', {
          p_user_id: userId,
          p_first_name: firstName,
          p_last_name: lastName,
          p_phone: phone,
          p_avatar_url: avatarUrl
        });

      if (error) {
        console.error('❌ Update user profile error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ User profile updated successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Update user profile error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Change user password using SQL function
   */
  async changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<ServiceResponse<any>> {
    try {
      console.log('🔐 Changing user password with SQL function:', userId);

      const { data, error } = await supabase
        .rpc('change_user_password', {
          p_user_id: userId,
          p_current_password: currentPassword,
          p_new_password: newPassword
        });

      if (error) {
        console.error('❌ Change password error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Password changed successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Change password error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Create shop using SQL function
   */
  async createShopSQL(shopData: any): Promise<ServiceResponse<any>> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log('🏪 Creating shop with SQL function...');

      const { data, error } = await supabase
        .rpc('create_shop', {
          p_provider_id: user.id,
          p_name: shopData.name,
          p_category: shopData.category,
          p_description: shopData.description,
          p_address: shopData.address,
          p_city: shopData.city,
          p_state: shopData.state,
          p_phone: shopData.phone,
          p_email: shopData.email,
          p_logo_url: shopData.logo_url,
          p_images: shopData.images || [],
          p_staff: shopData.staff || [],
          p_services: shopData.services || [],
          p_business_hours_start: shopData.business_hours_start || '09:00',
          p_business_hours_end: shopData.business_hours_end || '17:00',
          p_website_url: shopData.website_url
        });

      if (error) {
        console.error('❌ Create shop error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Shop created successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Create shop error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Update shop using SQL function
   */
  async updateShopSQL(shopId: string, shopData: any): Promise<ServiceResponse<any>> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log('🏪 Updating shop with SQL function...');

      const { data, error } = await supabase
        .rpc('update_shop', {
          p_shop_id: shopId,
          p_provider_id: user.id,
          p_name: shopData.name,
          p_category: shopData.category,
          p_description: shopData.description,
          p_address: shopData.address,
          p_city: shopData.city,
          p_state: shopData.state,
          p_phone: shopData.phone,
          p_email: shopData.email,
          p_logo_url: shopData.logo_url,
          p_images: shopData.images || [],
          p_staff: shopData.staff || [],
          p_services: shopData.services || [],
          p_business_hours_start: shopData.business_hours_start || '09:00',
          p_business_hours_end: shopData.business_hours_end || '17:00',
          p_website_url: shopData.website_url
        });

      if (error) {
        console.error('❌ Update shop error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Shop updated successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Update shop error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Upload avatar using SQL function
   */
  async uploadUserAvatarSQL(userId: string, avatarUrl: string): Promise<ServiceResponse<any>> {
    try {
      console.log('📸 Uploading user avatar with SQL function:', userId);

      const { data, error } = await supabase
        .rpc('upload_user_avatar', {
          p_user_id: userId,
          p_avatar_url: avatarUrl
        });

      if (error) {
        console.error('❌ Upload avatar error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Avatar uploaded successfully');
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Upload avatar error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(localUris: string[], folder: string = 'shops'): Promise<ServiceResponse<string[]>> {
    try {
      console.log(`📸 Uploading ${localUris.length} images...`);
      
      const uploadPromises = localUris.map(uri => this.uploadImage(uri, folder));
      const results = await Promise.all(uploadPromises);
      
      const uploadedUrls: string[] = [];
      const errors: string[] = [];
      
      results.forEach((result, index) => {
        if (result.success && result.data) {
          uploadedUrls.push(result.data);
        } else {
          errors.push(`Image ${index + 1}: ${result.error}`);
        }
      });
      
      if (errors.length > 0) {
        console.warn('⚠️ Some images failed to upload:', errors);
      }
      
      console.log(`✅ Successfully uploaded ${uploadedUrls.length}/${localUris.length} images`);
      return {
        success: uploadedUrls.length > 0,
        data: uploadedUrls,
        error: errors.length > 0 ? errors.join(', ') : undefined
      };
    } catch (error) {
      console.error('❌ Multiple image upload error:', error);
      return {
        success: false,
        error: 'Failed to upload images',
        data: []
      };
    }
  }

  /**
   * Insert sample provider data for demo/testing
   */
  async insertSampleProviderData(providerId?: string): Promise<ServiceResponse<any>> {
    try {
      let targetProviderId = providerId;

      if (!targetProviderId) {
        const user = await this.getCurrentUser();
        if (!user) {
          return {
            success: false,
            error: 'User not authenticated'
          };
        }
        targetProviderId = user.id;
      }

      console.log('🎯 Inserting sample provider data for:', targetProviderId);

      const { data, error } = await supabase
        .rpc('insert_sample_provider_data', {
          provider_user_id: targetProviderId
        });

      if (error) {
        console.error('❌ Insert sample data error:', error);
        return {
          success: false,
          error: 'Failed to insert sample data: ' + error.message
        };
      }

      console.log('✅ Sample provider data inserted successfully');
      return {
        success: true,
        message: 'Sample data inserted successfully'
      };
    } catch (error) {
      console.error('❌ Insert sample data error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Verify database setup for shop creation
   */
  async verifyDatabaseSetup(): Promise<ServiceResponse<any>> {
    try {
      console.log('🔍 Verifying database setup...');
      
      const results: any = {
        authentication: false,
        table_exists: false,
        table_structure: [],
        storage_buckets: [],
        can_insert: false,
        test_shop_id: null
      };
      
      // 1. Check authentication
      const user = await this.getCurrentUser();
      if (user) {
        results.authentication = true;
        results.user_id = user.id;
        console.log('✅ Authentication: OK');
      } else {
        console.log('❌ Authentication: Failed');
        return {
          success: false,
          error: 'User not authenticated',
          data: results
        };
      }
      
      // 2. Check table exists and structure
      try {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'provider_businesses')
          .eq('table_schema', 'public');
          
        if (!columnsError && columns && columns.length > 0) {
          results.table_exists = true;
          results.table_structure = columns;
          console.log('✅ Table structure: OK');
        } else {
          console.log('❌ Table structure: Failed');
        }
      } catch (error) {
        console.log('❌ Could not check table structure');
      }
      
      // 3. Check storage buckets
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (!bucketsError && buckets) {
          results.storage_buckets = buckets.map(b => ({ id: b.id, name: b.name, public: b.public }));
          const hasShopImages = buckets.some(b => b.id === 'shop-images');
          const hasUserAvatars = buckets.some(b => b.id === 'user-avatars');
          if (hasShopImages && hasUserAvatars) {
            console.log('✅ Storage buckets: OK');
          } else {
            console.log('⚠️ Storage buckets: Missing some buckets');
          }
        }
      } catch (error) {
        console.log('❌ Could not check storage buckets');
      }
      
      // 4. Test basic insert capability
      try {
        const testData = {
          provider_id: user.id,
          name: 'Verification Test ' + Date.now(),
          description: 'Database verification test',
          category: 'Beauty & Wellness',
          address: 'Test Address',
          city: 'Test City',
          country: 'Sweden',
          phone: '1234567890',
          email: 'verify@example.com'
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('provider_businesses')
          .insert(testData)
          .select('id')
          .single();
          
        if (!insertError && insertData) {
          results.can_insert = true;
          results.test_shop_id = insertData.id;
          console.log('✅ Insert capability: OK');
          
          // Clean up test data
          await supabase
            .from('provider_businesses')
            .delete()
            .eq('id', insertData.id);
            
        } else {
          console.log('❌ Insert capability: Failed -', insertError?.message);
          results.insert_error = insertError?.message;
        }
      } catch (error) {
        console.log('❌ Could not test insert capability');
        results.insert_error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      const allGood = results.authentication && results.table_exists && results.can_insert;
      
      console.log('🔍 Database verification summary:');
      console.log('  - Authentication:', results.authentication ? '✅' : '❌');
      console.log('  - Table exists:', results.table_exists ? '✅' : '❌');
      console.log('  - Can insert:', results.can_insert ? '✅' : '❌');
      console.log('  - Storage buckets:', results.storage_buckets.length);
      
      return {
        success: allGood,
        data: results,
        message: allGood ? 'Database setup is working correctly!' : 'Database setup has issues'
      };
      
    } catch (error) {
      console.error('❌ Database verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse JSON field safely
   */
  private parseJSONField(field: any, defaultValue: any = null): any {
    try {
      if (typeof field === 'string') {
        return JSON.parse(field);
      } else if (Array.isArray(field) || typeof field === 'object') {
        return field;
      } else {
        return defaultValue;
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON field:', field, 'Error:', error);
      return defaultValue;
    }
  }

  /**
   * Handle auth errors
   */
  private handleAuthError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    const errorMap: Record<string, string> = {
      'email already registered': 'This email is already registered. Please sign in instead.',
      'user already registered': 'This email is already registered. Please sign in instead.',
      'invalid login credentials': 'Invalid email or password. Please check your credentials.',
      'invalid email or password': 'Invalid email or password. Please check your credentials.',
      'email not confirmed': 'Please check your email and verify your account first.',
      'too many requests': 'Too many attempts. Please wait before trying again.',
      'weak password': 'Password is too weak. Please choose a stronger password.',
      'invalid email': 'Please enter a valid email address.',
      'signup disabled': 'Registration is temporarily disabled.',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return value;
      }
    }

    return errorMessage;
  }
}

// ==============================================
// LOCATION SERVICE CLASS
// ==============================================

class LocationServiceClass {
  constructor() {
    console.log('📍 LocationService initialized');
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs location access to provide location-based services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      
      return true; // iOS handles permissions automatically
    } catch (error) {
      console.error('❌ Location permission error:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      console.log('📍 Getting current location...');

      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          async (position) => {
            try {
              console.log('✅ Got coordinates:', position.coords);

              const locationData: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                address: 'Current Location',
                city: 'Unknown',
                state: 'Unknown',
                country: 'Unknown',
                postalCode: '',
                accuracy: position.coords.accuracy,
              };

              // Try reverse geocoding
              try {
                const addressDetails = await this.reverseGeocode(
                  position.coords.latitude,
                  position.coords.longitude
                );
                Object.assign(locationData, addressDetails);
              } catch (reverseError) {
                console.warn('⚠️ Reverse geocoding failed:', reverseError);
              }

              console.log('✅ Location data prepared');
              resolve(locationData);
            } catch (error) {
              console.error('❌ Error processing location:', error);
              reject(error);
            }
          },
          (error) => {
            console.error('❌ Geolocation error:', error);
            let errorMessage = 'Unable to get location';
            
            switch (error.code) {
              case 1:
                errorMessage = 'Location permission denied';
                break;
              case 2:
                errorMessage = 'Location services unavailable';
                break;
              case 3:
                errorMessage = 'Location request timed out';
                break;
            }
            
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
            forceRequestLocation: true,
            forceLocationManager: false,
            showLocationDialog: true,
          }
        );
      });
    } catch (error: any) {
      console.error('❌ Get current location error:', error);
      throw error;
    }
  }

  /**
   * Search locations using OpenStreetMap Nominatim API
   */
  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    try {
      console.log('🔍 Searching locations for:', query);

      const encodedQuery = encodeURIComponent(query.trim());
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Qwiken/1.0.0 (contact@qwiken.com)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();
      
      if (!Array.isArray(results) || results.length === 0) {
        console.log('⚠️ No location results found for:', query);
        return [];
      }

      const suggestions: LocationSuggestion[] = results.map((result: any, index: number) => {
        const address = result.address || {};
        
        return {
          id: result.place_id?.toString() || `${query}-${index}`,
          description: result.display_name || `${query}, Unknown`,
          latitude: parseFloat(result.lat) || 0,
          longitude: parseFloat(result.lon) || 0,
          city: address.city || address.town || address.village || address.municipality || 'Unknown',
          state: address.state || address.region || address.province || address.county || '',
          country: address.country || 'Unknown'
        };
      });

      console.log(`✅ Found ${suggestions.length} location suggestions`);
      return suggestions;
    } catch (error) {
      console.error('❌ Search locations error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode using OpenStreetMap Nominatim API
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<Partial<LocationData>> {
    try {
      console.log('🔄 Reverse geocoding:', latitude, longitude);

      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Qwiken/1.0.0 (contact@qwiken.com)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result || !result.address) {
        console.warn('⚠️ No address data found for coordinates');
        return {
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          city: 'Unknown',
          state: 'Unknown',
          country: 'Unknown',
          postalCode: '',
        };
      }

      const address = result.address;
      
      const locationData = {
        address: result.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        city: address.city || address.town || address.village || address.municipality || 'Unknown',
        state: address.state || address.region || address.province || address.county || '',
        country: address.country || 'Unknown',
        postalCode: address.postcode || address.postal_code || '',
      };

      console.log('✅ Reverse geocoding successful:', locationData.city);
      return locationData;
    } catch (error) {
      console.error('❌ Reverse geocode error:', error);
      
      // Return fallback data instead of throwing
      return {
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
        postalCode: '',
      };
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// ==============================================
// CREATE INSTANCES AND EXPORT IMMEDIATELY
// ==============================================

// Create service instances immediately
console.log('🚀 Initializing Supabase services...');

export const authService = new AuthServiceClass();
export const locationService = new LocationServiceClass();

console.log('✅ Services initialized and exported');

// Also export the classes for advanced usage
export { AuthServiceClass, LocationServiceClass };

// ==============================================
// DEFAULT EXPORT
// ==============================================

// Create a service wrapper with client access
export const supabaseService = {
  client: supabase,
  auth: authService,
  location: locationService
};

const supabaseServices = {
  supabase,
  authService,
  locationService,
  AuthServiceClass,
  LocationServiceClass,
  supabaseService,
};

export default supabaseServices;