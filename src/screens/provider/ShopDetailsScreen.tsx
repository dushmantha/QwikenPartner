import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Platform,
  Modal,
  FlatList,
  Dimensions,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  launchImageLibrary, 
  launchCamera, 
  MediaType,
  ImagePickerOptions,
  ImagePickerResponse
} from 'react-native-image-picker';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { compressLogoImage, compressShopImage, compressAvatarImage } from '../../utils/imageCompression';

// Import our Supabase service and auth context
import { authService, locationService } from '../../lib/supabase/index';
import normalizedShopService, { supabase, ShopStaff, WorkSchedule, LeaveDate } from '../../lib/supabase/normalized';
import integratedShopService from '../../lib/supabase/integrated';
import { OptimizedShopService } from '../../services/api/optimizedShop';
import { updateShopWithCRUD, createShopWithCRUD } from '../../lib/supabase/normalizedShopUpdate';
import { ImageUploadService } from '../../services/api/imageUploadFix';
import { StaffImageUploadService } from '../../services/api/staffImageUpload';
import { useAuth } from '../../navigation/AppNavigator';
import { FriendlyScheduleDisplay } from '../../components/shop/FriendlyScheduleDisplay';
import { TimePickerModal } from '../../components/shop/TimePickerModal';

const { width } = Dimensions.get('window');

// Type definitions
type ProviderStackParamList = {
  ShopDetails: {
    shop?: Shop;
    onSave?: (shop: Shop) => void;
  };
  ProviderTabs: {
    screen?: 'ProviderHomeTab' | 'QueueTab' | 'ServicesTab' | 'EarningsTab' | 'ProfileTab';
  };
};

type ShopDetailsRouteProp = RouteProp<ProviderStackParamList, 'ShopDetails'>;
type ShopDetailsNavigationProp = StackNavigationProp<ProviderStackParamList, 'ShopDetails'>;

// Using ShopStaff interface from normalized service
export type Staff = ShopStaff;

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  location_type: 'in_house' | 'on_location';
  image?: string;
  discount?: Discount;
  assigned_staff?: string[];
  is_active: boolean;
  service_options?: ServiceOption[];
}

export interface Discount {
  id: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'package';
  value: number;
  description: string;
  min_amount?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_limit?: number;
  used_count: number;
  applicable_services?: string[];
  conditions?: string;
}

export interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  isAlwaysOpen?: boolean;
  timezone?: string;
  priority?: number;
  description?: string;
}

export interface SpecialDay {
  id?: string;
  date: string;
  name: string;
  type: 'holiday' | 'special_hours' | 'closed' | 'event';
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  description?: string;
  recurring?: 'none' | 'weekly' | 'monthly' | 'yearly';
  recurring_until?: string;
  color?: string;
  priority?: number;
  is_active?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  description: string;
  category: string;
  website_url?: string;
  image_url?: string;
  images?: string[];
  logo_url?: string;
  business_hours: BusinessHours[];
  special_days: SpecialDay[];
  timezone: string;
  advance_booking_days: number;
  slot_duration: number;
  buffer_time: number;
  auto_approval: boolean;
  is_active: boolean;
  first_time_discount_active?: boolean;
  services?: Service[];
  discounts?: Discount[];
  staff?: Staff[];
  created_at?: string;
  updated_at?: string;
}

// Service categories
const SERVICE_CATEGORIES = [
  'Hair & styling', 'Nails', 'Eyebrows & eyelashes', 'Massage',
  'Barbering', 'Hair removal', 'Facials & skincare', 'Injectables & fillers',
  'Body', 'Tattoo & piercing', 'Makeup', 'Medical & dental',
  'Counseling & holistic', 'Fitness'
];

// Common role suggestions (for placeholder/examples)
const ROLE_SUGGESTIONS = [
  'Manager', 'Stylist', 'Specialist', 'Assistant', 'Consultant', 
  'Therapist', 'Supervisor', 'Coordinator', 'Expert', 'Professional'
];

// Common specialty suggestions (for placeholder/examples)
const SPECIALTY_SUGGESTIONS = [
  'Hair Cutting', 'Hair Coloring', 'Hair Styling', 'Manicure',
  'Pedicure', 'Facial Treatment', 'Massage Therapy', 'Eyebrow Shaping',
  'Makeup Application', 'Waxing', 'Personal Training', 'Yoga Instruction'
];

// Discount types
const DISCOUNT_TYPES = [
  { id: 'percentage', name: 'Percentage Off', icon: 'calculator-outline', description: 'e.g., 20% off' },
  { id: 'fixed', name: 'Fixed Amount', icon: 'cash-outline', description: 'e.g., $10 off' },
  { id: 'bogo', name: 'Buy One Get One', icon: 'gift-outline', description: 'Special offers' },
  { id: 'package', name: 'Package Deal', icon: 'bag-outline', description: 'Bundle discounts' }
];

// Days of the week
const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Special day types
const SPECIAL_DAY_TYPES = [
  { id: 'holiday', name: 'Public Holiday', icon: 'calendar-outline', color: '#EF4444' },
  { id: 'special_hours', name: 'Special Hours', icon: 'time-outline', color: '#1A2533' },
  { id: 'closed', name: 'Closed', icon: 'close-circle-outline', color: '#1A2533' },
  { id: 'event', name: 'Special Event', icon: 'star-outline', color: '#1A2533' }
];

// Recurring options
const RECURRING_OPTIONS = [
  { id: 'none', name: 'One-time only' },
  { id: 'weekly', name: 'Every week' },
  { id: 'monthly', name: 'Every month' },
  { id: 'yearly', name: 'Every year' }
];

// Timezones (simplified)
const TIMEZONES = [
  'Europe/Stockholm', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'
];

const ShopDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ShopDetailsNavigationProp>();
  const route = useRoute<ShopDetailsRouteProp>();
  const { user } = useAuth();

  // Set navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: existingShop ? 'Edit Shop' : 'Create Shop',
      headerStyle: { backgroundColor: '#F0FFFE' },
      headerTintColor: '#1A2533',
      headerTitleStyle: { fontWeight: '600' },
      headerRight: () => (
        <TouchableOpacity
          style={[styles.headerSaveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.headerSaveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, existingShop, isSaving]);
  
  const existingShop = route.params?.shop;
  const onSave = route.params?.onSave;
  const isEditing = !!existingShop;
  
  // DEBUG: Track shop ID throughout the component
  console.log('🔍 SHOP_ID TRACKING - Component Load:');
  console.log('🔍 existingShop?.id:', existingShop?.id);
  console.log('🔍 existingShop?.name:', existingShop?.name);
  console.log('🔍 isEditing:', isEditing);
  
  // State to track if we've loaded data from the database
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Load services from the new shop_services table
  const loadShopServices = useCallback(async (shopId: string) => {
    try {
      console.log('🛠️ Loading services for shop:', shopId);
      
      const response = await normalizedShopService.getServices(shopId);
      
      if (response.success && response.data) {
        console.log('✅ Loaded services:', response.data.length);
        setShop(prev => ({
          ...prev,
          services: response.data
        }));
      } else {
        console.warn('⚠️ No services found or error:', response.error);
        // Set empty array to prevent undefined errors
        setShop(prev => ({
          ...prev,
          services: []
        }));
      }
      
      // CRITICAL FIX: Mark as loaded after service loading completes
      setHasLoadedData(true);
      
    } catch (error) {
      console.error('❌ Error loading services:', error);
      setShop(prev => ({
        ...prev,
        services: []
      }));
      
      // Still mark as loaded even on error to prevent infinite loops
      setHasLoadedData(true);
    }
  }, []);

  // Load services only once when shop exists
  React.useEffect(() => {
    if (existingShop?.id && !hasLoadedData) {
      loadShopServices(existingShop.id);
    }

    // Test storage connection when component loads (non-blocking)
    const testStorage = async () => {
      try {
        
        const result = await integratedShopService.setupStorage();
        
      } catch (error) {
        
      }
    };
    
    testStorage();
  }, [existingShop]);

  // Helper function to deduplicate arrays by ID
  const deduplicateById = <T extends { id: string }>(array: T[]): T[] => {
    const seen = new Set<string>();
    return array.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  };

  // Function to refresh shop data from database for editing mode  
  const refreshShopData = async (source = 'manual') => {
    if (!isEditing || !existingShop?.id) {
      console.log('⚠️ Skipping refresh - not editing or no shop ID');
      // CRITICAL FIX: Ensure isRefreshing is false when not editing
      setIsRefreshing(false);
      return;
    }
    
    setIsRefreshing(true);
    
    try {
        // Try to get shop data using the normalized service
        const result = await normalizedShopService.getShopById(existingShop.id);
        
        // Always fetch staff and services separately to ensure we get the latest data
        if (result.success && result.data) {
          const staffResponse = await normalizedShopService.getStaffByShopId(existingShop.id);
          if (staffResponse.success && staffResponse.data) {
            console.log('🔄 REFRESH: Staff data fetched:', staffResponse.data);
            result.data.staff = staffResponse.data;
          }
          
          // CRITICAL FIX: Also fetch services in refresh like staff
          console.log('🔄 REFRESH: About to fetch services for shop ID:', existingShop.id);
          const servicesResponse = await normalizedShopService.getServices(existingShop.id);
          if (servicesResponse.success && servicesResponse.data) {
            console.log('🔄 REFRESH: Services data fetched:', servicesResponse.data.length, 'services');
            result.data.services = servicesResponse.data;
          } else {
            console.warn('🔄 REFRESH: No services found:', servicesResponse.error);
            result.data.services = [];
          }
        }
        
        // If normalized service fails, try direct queries for each data type
        if (!result.success) {
          
          try {
            // Load staff data
            const { data: staffData, error: staffError } = await supabase
              .from('shop_staff')
              .select('*')
              .eq('shop_id', existingShop.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false });

            // Load services data (show ALL services - active and inactive)
            console.log('🔍 LOADING SERVICES: Direct database query for shop:', existingShop.id);
            const { data: servicesData, error: servicesError } = await supabase
              .from('shop_services')
              .select('*')
              .eq('shop_id', existingShop.id)
              .order('created_at', { ascending: false });
              
            console.log('🔍 SERVICES QUERY RESULT:', {
              servicesError: servicesError?.message,
              servicesCount: servicesData?.length || 0,
              servicesData: servicesData
            });

            // Load discounts data
            const { data: discountsData, error: discountsError } = await supabase
              .from('shop_discounts')
              .select('*')
              .eq('shop_id', existingShop.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false });
            // Update shop state with all the data we could fetch (deduplicated)
            setShop(prev => ({
              ...prev,
              staff: !staffError ? deduplicateById(staffData || []) : prev.staff,
              services: !servicesError ? deduplicateById(servicesData || []) : prev.services,
              discounts: !discountsError ? deduplicateById(discountsData || []) : prev.discounts
            }));
            
            return; // Exit early after direct queries
          } catch (directError) {
            
            // Continue to check normalized service result below
          }
        }
        if (result.success && result.data) {
          
          // Log the actual staff data to see what we're getting
          if (result.data.staff && result.data.staff.length > 0) {
            
          }
          
          setShop(prev => {
            const updatedShop = {
              ...prev,
              staff: deduplicateById(result.data!.staff || []),
              services: deduplicateById(result.data!.services || []),
              discounts: deduplicateById(result.data!.discounts || [])
            };
            
            return updatedShop;
          });
        } else {
          
          // Set empty arrays if no data is available at all
          setShop(prev => ({
            ...prev,
            staff: prev.staff?.length > 0 ? prev.staff : [],
            services: prev.services?.length > 0 ? prev.services : [],
            discounts: prev.discounts?.length > 0 ? prev.discounts : []
          }));
        }
      } catch (error) {
        
        // Keep existing data on error
      } finally {
        setIsRefreshing(false);
        setHasLoadedData(true);  // Mark as loaded after any refresh
      }
  };
  // hasLoadedData state is declared above
  
  // AUTO-LOAD DATA: Load immediately when we detect editing mode
  React.useEffect(() => {
    if (!isEditing || !existingShop?.id) return;
    
    // Create an async function to load data
    const autoLoadData = async () => {
      try {
        // Method 1: Try the normalized service
        const shopResult = await normalizedShopService.getShopById(existingShop.id);
        
        if (shopResult.success && shopResult.data) {
          
          // Update the state (deduplicated)
          setShop(prev => {
            const updated = {
              ...prev,
              staff: deduplicateById(shopResult.data!.staff || []),
              services: deduplicateById(shopResult.data!.services || []),
              discounts: deduplicateById(shopResult.data!.discounts || [])
            };
            
            return updated;
          });
          
          setHasLoadedData(true);
          return; // Success, exit early
        }
        
        // Method 2: Direct table queries as fallback - optimized with timeout
        const [staffRes, servicesRes, discountsRes] = await Promise.allSettled([
          Promise.race([
            supabase.from('shop_staff').select('*').eq('shop_id', existingShop.id).eq('is_active', true).order('created_at', { ascending: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Staff query timeout')), 3000))
          ]),
          Promise.race([
            supabase.from('shop_services').select('*').eq('shop_id', existingShop.id).order('created_at', { ascending: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Services query timeout')), 3000))
          ]),
          Promise.race([
            supabase.from('shop_discounts').select('*').eq('shop_id', existingShop.id).eq('is_active', true).order('created_at', { ascending: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Discounts query timeout')), 3000))
          ])
        ]);
        // Update state with whatever data we got (deduplicated)
        setShop(prev => {
          const staffData = staffRes.status === 'fulfilled' && !staffRes.value.error ? staffRes.value.data || [] : [];
          const servicesData = servicesRes.status === 'fulfilled' && !servicesRes.value.error ? servicesRes.value.data || [] : [];
          const discountsData = discountsRes.status === 'fulfilled' && !discountsRes.value.error ? discountsRes.value.data || [] : [];
          
          const updated = {
            ...prev,
            staff: deduplicateById(staffData),
            services: deduplicateById(servicesData),
            discounts: deduplicateById(discountsData),
            business_hours: prev.business_hours && Array.isArray(prev.business_hours) && prev.business_hours.length === 7 
              ? prev.business_hours 
              : createDefaultBusinessHours()
          };
          
          return updated;
        });
        
        setHasLoadedData(true);
        
      } catch (error) {
        
        // Even on error, mark as loaded to prevent infinite attempts
        setHasLoadedData(true);
      }
    };
    
    // Execute the auto-load immediately
    autoLoadData();
    
    // FAILSAFE: Force a refresh after 500ms if data is still empty (faster response)
    const failsafeTimer = setTimeout(() => {
      if (shop.staff.length === 0 && shop.services.length === 0 && shop.discounts.length === 0) {
        console.log('🔄 Failsafe: Refreshing empty data');
        refreshShopData('failsafe');
      }
    }, 500);
    
    return () => clearTimeout(failsafeTimer);
    
  }, [isEditing, existingShop?.id]); // Remove hasLoadedData from dependencies!

  // Tab refresh: Refresh data when switching to staff, services, or discounts tabs
  React.useEffect(() => {
    if (!isEditing || !existingShop?.id) return;
    if (!['staff', 'services', 'discounts'].includes(activeTab)) return;
    if (!hasLoadedData) return; // Only refresh after initial load
    refreshShopData('tab-switch');
    
  }, [activeTab]); // Simplified dependencies

  // Create default business hours
  const createDefaultBusinessHours = (): BusinessHours[] => {
    return DAYS_OF_WEEK.map(day => ({
      day,
      isOpen: ['Saturday', 'Sunday'].includes(day) ? false : true,
      openTime: '09:00',
      closeTime: '17:00'
    }));
  };

  // Main shop state  
  const [shop, setShop] = useState<Shop>(() => {
    const initialShop = {
      id: existingShop?.id || '',
      name: existingShop?.name || '',
      address: existingShop?.address || '',
      city: existingShop?.city || '',
      state: existingShop?.state || '',
      country: existingShop?.country || 'Sweden',
      phone: existingShop?.phone || '',
      email: existingShop?.email || '',
      description: existingShop?.description || '',
      category: existingShop?.category || SERVICE_CATEGORIES[0],
      website_url: existingShop?.website_url || '',
      image_url: existingShop?.image_url || '',
      images: existingShop?.images || [],
      logo_url: existingShop?.logo_url || '',
      business_hours: (existingShop?.business_hours && Array.isArray(existingShop.business_hours) && existingShop.business_hours.length === 7) 
        ? existingShop.business_hours 
        : createDefaultBusinessHours(),
      special_days: existingShop?.special_days || [],
      timezone: existingShop?.timezone || 'Europe/Stockholm',
      advance_booking_days: existingShop?.advance_booking_days || 30,
      slot_duration: existingShop?.slot_duration || 60,
      buffer_time: existingShop?.buffer_time || 15,
      auto_approval: existingShop?.auto_approval ?? true,
      is_active: existingShop?.is_active ?? true,
      services: existingShop?.services || [],  // Preserve existing services or start empty
      discounts: existingShop?.discounts || [],  // Preserve existing discounts or start empty
      staff: existingShop?.staff || []  // Preserve existing staff or start empty
    };
    return initialShop;
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'staff' | 'services' | 'discounts' | 'settings'>('basic');
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    currentImage: 0,
    totalImages: 0,
    currentImageName: '',
    uploadedImages: 0,
    message: ''
  });
  
  // Debug: Log progress state changes
  React.useEffect(() => {
    
  }, [uploadProgress]);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSpecialDayModal, setShowSpecialDayModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSpecialDayTimePicker, setShowSpecialDayTimePicker] = useState(false);
  const [specialDayTimeType, setSpecialDayTimeType] = useState<'open' | 'close' | null>(null);
  const [isPickingForSpecialDay, setIsPickingForSpecialDay] = useState(false);
  
  // Staff scheduling states
  const [selectedStaffTimeField, setSelectedStaffTimeField] = useState<string | null>(null);
  const [showStaffLeaveCalendar, setShowStaffLeaveCalendar] = useState(false);
  const [selectedLeaveStartDate, setSelectedLeaveStartDate] = useState<string | null>(null);
  const [selectedLeaveEndDate, setSelectedLeaveEndDate] = useState<string | null>(null);
  const [isDraggingCalendar, setIsDraggingCalendar] = useState(false);
  const [expandedLeaveSection, setExpandedLeaveSection] = useState(false);
  
  // Form states
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [editingSpecialDay, setEditingSpecialDay] = useState<SpecialDay | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<{day: string, type: 'open' | 'close'} | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [imageUploadType, setImageUploadType] = useState<'shop' | 'logo' | 'staff'>('shop');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  
  // Refs for critical inputs
  const shopNameRef = useRef<TextInput>(null);
  const shopAddressRef = useRef<TextInput>(null);
  const shopPhoneRef = useRef<TextInput>(null);
  const shopEmailRef = useRef<TextInput>(null);
  
  // Store the actual text values separately to bypass React state issues
  const formValues = useRef({
    name: existingShop?.name || '',
    description: existingShop?.description || '',
    address: existingShop?.address || '',
    city: existingShop?.city || '',
    state: existingShop?.state || '',
    country: existingShop?.country || 'Sweden',
    phone: existingShop?.phone || '',
    email: existingShop?.email || ''
  });

  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState(existingShop?.address || '');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const addressSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Service form state
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({
    name: '', description: '', price: 0, duration: 60, category: '', assigned_staff: [], location_type: 'in_house', is_active: true
  });

  // Service options state - matching database schema
  interface ServiceOption {
    id: string;
    option_name: string;
    option_description: string;
    price: number;
    duration: number;
    is_active: boolean;
    sort_order: number;
  }

  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);

  // Service options management functions
  const addServiceOption = () => {
    const newOption: ServiceOption = {
      id: Date.now().toString(),
      option_name: '',
      option_description: '',
      price: serviceForm.price || 0, // Start with base service price
      duration: serviceForm.duration || 60, // Start with base service duration
      is_active: true,
      sort_order: serviceOptions.length
    };
    setServiceOptions(prev => [...prev, newOption]);
  };

  const updateServiceOption = (id: string, field: keyof ServiceOption, value: string | number | boolean) => {
    setServiceOptions(prev => prev.map(option => 
      option.id === id ? { ...option, [field]: value } : option
    ));
  };

  const removeServiceOption = (id: string) => {
    setServiceOptions(prev => prev.filter(option => option.id !== id));
  };

  const resetServiceOptions = () => {
    setServiceOptions([]);
  };

  // Staff form state
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({
    name: '', 
    email: '', 
    phone: '', 
    role: '', 
    specialties: [], 
    bio: '', 
    experience_years: 0, 
    is_active: true,
    avatar_url: undefined,
    work_schedule: {
      monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
      tuesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
      wednesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
      thursday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
      friday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
      saturday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
      sunday: { isWorking: false, startTime: '09:00', endTime: '17:00' }
    },
    leave_dates: []
  });
  
  // Staff specialty input
  const [newSpecialty, setNewSpecialty] = useState('');
  
  // Force re-render state for avatar
  const [avatarRefresh, setAvatarRefresh] = useState(0);
  const [imageRefresh, setImageRefresh] = useState(0);
  const [logoRefresh, setLogoRefresh] = useState(0);
  const [shopImagesRefresh, setShopImagesRefresh] = useState(0);

  // Discount form state
  const [discountForm, setDiscountForm] = useState<Partial<Discount>>({
    type: 'percentage', value: 0, description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true, used_count: 0
  });

  // Special day form state
  const [specialDayForm, setSpecialDayForm] = useState<Partial<SpecialDay>>({
    date: new Date().toISOString().split('T')[0],
    name: '', type: 'holiday', isOpen: false,
    openTime: '09:00', closeTime: '17:00',
    description: '', recurring: 'none'
  });

  // Helper function to safely get avatar URL (handles array corruption)
  const getSafeAvatarUrl = (avatar_url: any): string | undefined => {
    if (!avatar_url) return undefined;
    if (typeof avatar_url === 'string') return avatar_url;
    if (Array.isArray(avatar_url)) {
      console.warn('🚨 Avatar URL is array, using first item:', avatar_url);
      return avatar_url.length > 0 ? avatar_url[0] : undefined;
    }
    return undefined;
  };

  // Address autocomplete functions
  const searchAddresses = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    
    try {
      console.log('🔍 Searching for addresses:', query);
      const suggestions = await locationService.searchLocations(query.trim());
      
      if (suggestions && Array.isArray(suggestions)) {
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(suggestions.length > 0);
        console.log('✅ Found', suggestions.length, 'address suggestions');
      } else {
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      }
    } catch (error) {
      console.error('❌ Address search error:', error);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleAddressQueryChange = (text: string) => {
    setAddressQuery(text);
    
    // Update the actual address field
    formValues.current.address = text;
    setShop(prev => ({ ...prev, address: text }));
    
    // Clear existing timeout
    if (addressSearchTimeout.current) {
      clearTimeout(addressSearchTimeout.current);
    }
    
    // Debounce search
    addressSearchTimeout.current = setTimeout(() => {
      searchAddresses(text);
    }, 300);
  };

  // Function to use user's registered address
  const useMyAddress = async () => {
    try {
      console.log('📍 Using user registered address...');
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
      // Get user profile to get their registered address
      const profileResponse = await authService.getUserProfile(user.id);
      
      if (!profileResponse.success || !profileResponse.data) {
        Alert.alert('Error', 'Could not fetch your address. Please enter manually.');
        return;
      }
      
      const userData = profileResponse.data;
      
      // Check if user has location data
      if (userData.location && userData.location.city && userData.location.city !== 'Unknown') {
        // Use location data from registration
        const userLocation = userData.location;
        
        setAddressQuery(userLocation.address || '');
        setShop(prev => ({
          ...prev,
          address: userLocation.address || '',
          city: userLocation.city || '',
          state: userLocation.state || '',
          country: userLocation.country || ''
        }));
        
        // Update form values
        formValues.current.address = userLocation.address || '';
        formValues.current.city = userLocation.city || '';
        formValues.current.state = userLocation.state || '';
        formValues.current.country = userLocation.country || '';
        
        Alert.alert('Success', 'Your registered address has been filled in.');
      } else {
        Alert.alert('No Address Found', 'You don\'t have a registered address. Please enter your address manually.');
      }
    } catch (error) {
      console.error('❌ Error using user address:', error);
      Alert.alert('Error', 'Could not fetch your address. Please enter manually.');
    }
  };

  const selectAddress = async (suggestion: any) => {
    try {
      console.log('📍 Selecting address:', suggestion);
      
      // Update address query display
      setAddressQuery(suggestion.description);
      setShowAddressSuggestions(false);
      
      // Auto-fill all address fields
      const addressParts = suggestion.description.split(', ');
      const streetAddress = addressParts[0] || suggestion.description;
      const city = suggestion.city || '';
      const state = suggestion.state || '';
      const country = suggestion.country || '';
      
      // Update form values
      formValues.current.address = streetAddress;
      formValues.current.city = city;
      formValues.current.state = state;
      formValues.current.country = country;
      
      // Update shop state
      setShop(prev => ({
        ...prev,
        address: streetAddress,
        city: city,
        state: state,
        country: country
      }));
      
      console.log('✅ Address fields auto-filled:', {
        address: streetAddress,
        city: city,
        state: state,
        country: country
      });
      
    } catch (error) {
      console.error('❌ Error selecting address:', error);
    }
  };

  const dismissAddressSuggestions = () => {
    setShowAddressSuggestions(false);
  };

  // Cleanup address search timeout on unmount
  useEffect(() => {
    return () => {
      if (addressSearchTimeout.current) {
        clearTimeout(addressSearchTimeout.current);
      }
    };
  }, []);

  // Helper function to append timestamp to URL
  const appendTimestamp = (url: string, timestamp: number): string => {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  };

  // Load complete shop data if editing
  useEffect(() => {
    const loadCompleteShopData = async () => {
      if (isEditing && existingShop && existingShop.id) {
        
        setIsLoading(true);
        
        try {
          // Try to fetch complete shop data from database using normalized service
          console.log('🚨 FETCHING: Getting shop data for ID:', existingShop.id);
          const response = await normalizedShopService.getShopById(existingShop.id);
          console.log('🚨 FETCHED: Response:', response);
          
          if (response.success && response.data) {
            const completeShop = response.data;
            console.log('🚨 FETCHED: Complete shop data:', completeShop);
            console.log('🚨 FETCHED: Business hours from DB:', completeShop.business_hours);
            
            // Also fetch staff separately to ensure we get the latest data with new fields
            const staffResponse = await normalizedShopService.getStaffByShopId(existingShop.id);
            if (staffResponse.success && staffResponse.data) {
              console.log('🚨 FETCHED: Staff data separately:', staffResponse.data);
              completeShop.staff = staffResponse.data;
            }
            
            if (completeShop) {
              // Map the complete shop data to our expected format
              const mappedShop = {
                ...existingShop, // Start with the basic data
                // Override with complete data if available, but preserve current state if not in DB
                images: completeShop.images || shop.images || existingShop.images || [],
                services: completeShop.services || [],
                staff: completeShop.staff || [],
                business_hours: (() => {
                  console.log('🚨 LOADING: completeShop.business_hours:', completeShop.business_hours);
                  console.log('🚨 LOADING: existingShop.business_hours:', existingShop.business_hours);
                  
                  const dbBusinessHours = completeShop.business_hours || existingShop.business_hours;
                  
                  // Convert database format to frontend format if we have database data
                  let businessHours;
                  if (dbBusinessHours && dbBusinessHours.length > 0) {
                    // Check if it's already in frontend format (has isOpen field) or database format (has is_open field)
                    const firstEntry = dbBusinessHours[0];
                    if (firstEntry.hasOwnProperty('is_open')) {
                      // Database format - convert to frontend format
                      businessHours = dbBusinessHours.map((hour: any) => ({
                        day: hour.day,
                        isOpen: hour.is_open ?? true,
                        openTime: hour.open_time || '09:00',
                        closeTime: hour.close_time || '17:00',
                        isAlwaysOpen: hour.is_always_open || false
                      }));
                      console.log('🚨 CONVERTED: Database format to frontend format');
                    } else {
                      // Already in frontend format
                      businessHours = dbBusinessHours;
                      console.log('🚨 LOADED: Already in frontend format');
                    }
                  } else {
                    // No database data - use defaults
                    businessHours = createDefaultBusinessHours();
                    console.log('🚨 CREATED: Default business hours');
                  }
                  
                  // Deduplicate business hours by day (keep the first occurrence of each day)
                  const deduplicatedBusinessHours = businessHours.filter((hour: any, index: number, self: any[]) => 
                    index === self.findIndex((h: any) => h.day === hour.day)
                  );
                  
                  console.log('🚨 LOADING: Final business_hours:', deduplicatedBusinessHours);
                  console.log('🚨 DEDUPLICATION: Original count:', businessHours.length, 'Final count:', deduplicatedBusinessHours.length);
                  
                  
                  return deduplicatedBusinessHours;
                })(),
                special_days: completeShop.special_days || [],
                discounts: completeShop.discounts || [],
                logo_url: completeShop.logo_url || existingShop.logo_url || shop.logo_url || '',
                timezone: completeShop.timezone || existingShop.timezone || 'Europe/Stockholm',
                advance_booking_days: completeShop.advance_booking_days || existingShop.advance_booking_days || 30,
                slot_duration: completeShop.slot_duration || existingShop.slot_duration || 60,
                buffer_time: completeShop.buffer_time || existingShop.buffer_time || 15,
                auto_approval: completeShop.auto_approval ?? existingShop.auto_approval ?? true,
                // Location fields
                city: completeShop.city || existingShop.city || '',
                state: completeShop.state || existingShop.state || '',
                country: completeShop.country || existingShop.country || 'Sweden',
              };
              
              setShop(mappedShop);
              // Also update formValues ref
              formValues.current = {
                name: mappedShop.name || '',
                description: mappedShop.description || '',
                address: mappedShop.address || '',
                city: mappedShop.city || '',
                state: mappedShop.state || '',
                country: mappedShop.country || 'Sweden',
                phone: mappedShop.phone || '',
                email: mappedShop.email || ''
              };
            } else {
              
              setShop(existingShop);
              // Also update formValues ref
              formValues.current = {
                name: existingShop.name || '',
                description: existingShop.description || '',
                address: existingShop.address || '',
                city: existingShop.city || '',
                state: existingShop.state || '',
                country: existingShop.country || 'Sweden',
                phone: existingShop.phone || '',
                email: existingShop.email || ''
              };
            }
          } else {
            
            setShop(existingShop);
            // Also update formValues ref
            formValues.current = {
              name: existingShop.name || '',
              description: existingShop.description || '',
              address: existingShop.address || '',
              phone: existingShop.phone || '',
              email: existingShop.email || ''
            };
          }
        } catch (error) {
          
          setShop(existingShop);
          // Also update formValues ref
          formValues.current = {
            name: existingShop.name || '',
            description: existingShop.description || '',
            address: existingShop.address || '',
            phone: existingShop.phone || '',
            email: existingShop.email || ''
          };
        } finally {
          setIsLoading(false);
        }
      } else if (isEditing && existingShop) {
        setShop(existingShop);
        // Also update formValues ref
        formValues.current = {
          name: existingShop.name || '',
          description: existingShop.description || '',
          address: existingShop.address || '',
          phone: existingShop.phone || '',
          email: existingShop.email || ''
        };
      }
    };

    loadCompleteShopData();
  }, [isEditing, existingShop]);

  // Ensure shop always has business_hours to prevent undefined errors
  useEffect(() => {
    setShop(prevShop => {
      // Always ensure business_hours exists and is valid
      if (!prevShop.business_hours || !Array.isArray(prevShop.business_hours) || prevShop.business_hours.length !== 7) {
        console.warn('⚠️ Shop missing or invalid business_hours, adding defaults');
        const defaultHours = createDefaultBusinessHours();
        return {
          ...prevShop,
          business_hours: defaultHours,
          services: prevShop.services || [],
          staff: prevShop.staff || [],
          discounts: prevShop.discounts || []
        };
      }
      return prevShop; // No change needed
    });
  }, []); // Run only once on mount

  // More robust validation that uses formValues ref to bypass state timing issues
  const validateBasicInfo = useCallback((): boolean => {
    
    // Use the formValues ref as the primary source of truth, with fallback to state
    const currentName = formValues.current.name || shop.name || '';
    const trimmedName = currentName.trim();
    
    if (!trimmedName || trimmedName.length === 0) {
      
      setActiveTab('basic'); // Switch to basic tab to show the error
      Alert.alert('Validation Error', 'Shop name is required');
      return false;
    }
    
    // Check address validation using formValues
    const currentAddress = formValues.current.address || shop.address || '';
    const trimmedAddress = currentAddress.trim();
    
    if (!trimmedAddress || trimmedAddress.length === 0) {
      
      Alert.alert('Validation Error', 'Address is required');
      return false;
    }
    
    // Check phone validation using formValues
    const currentPhone = formValues.current.phone;
    const trimmedPhone = currentPhone.trim();
    if (!trimmedPhone) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    
    // Check email validation using formValues
    const currentEmail = formValues.current.email;
    const trimmedEmail = currentEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Validation Error', 'Valid email is required');
      return false;
    }
    return true;
  }, []); // No dependencies needed since we're using a ref

  // Save shop
  const handleSave = async () => {
    try {
      
      // Check if any images are actually selected
      const hasImages = shop.images && shop.images.length > 0 && shop.images.some(img => img && img.trim() !== '');
      const hasLogo = shop.logo_url && shop.logo_url.trim() !== '';

      // Verify storage setup before attempting uploads
      if (hasImages || hasLogo) {
        console.log('🔍 Verifying storage setup for image uploads...');
        const storageStatus = await ImageUploadService.verifyStorageSetup();
        
        if (!storageStatus.success) {
          console.warn('⚠️ Storage buckets not properly configured:', storageStatus.error);
          Alert.alert(
            'Storage Setup Required', 
            'Image upload requires storage buckets to be created. Please contact support or run the setup script.\n\n' + 
            `Missing buckets:\n${!storageStatus.buckets.shopImages ? '• shop-images\n' : ''}` +
            `${!storageStatus.buckets.userAvatars ? '• user-avatars\n' : ''}` +
            `${!storageStatus.buckets.shopLogos ? '• shop-logos\n' : ''}`,
            [
              { text: 'Continue without images', onPress: () => {
                // Set images to empty to continue without upload
                setShop(prev => ({ ...prev, images: [], logo_url: '' }));
              }},
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        } else {
          console.log('✅ Storage setup verified successfully');
        }
      }
      
      if (!hasImages && !hasLogo) {
        
      } else {
        
      }

      // Check storage connection before proceeding (but don't block shop creation)
      
      const storageTest = await integratedShopService.setupStorage();
      // Also try verifying with integrated service
      
      const integratedTest = await integratedShopService.verifySetup();
      // Try to initialize schema/storage if needed
      if (!storageTest.success && !integratedTest.success) {
        
        const initResult = await integratedShopService.initializeSchema();
        
      }
      
      // Determine storage availability - prioritize storage accessibility over bucket existence
      let storageAvailable = false;
      
      // Check if storage is accessible (even if buckets are missing)
      if (storageTest.success && storageTest.data?.storage_accessible) {
        
        storageAvailable = true;
        
        // Log bucket status for debugging
        if (storageTest.data.shop_images_bucket && storageTest.data.user_avatars_bucket) {
          
        } else {
        }
      } else if (integratedTest.success && integratedTest.data?.storage_buckets) {
        
        storageAvailable = true;
      } else {
        
        storageAvailable = false;
      }
    
    // Force a longer delay and multiple state checks to ensure synchronization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force React to flush any pending state updates
    await new Promise(resolve => {
      setShop(prevShop => {
        
        return prevShop; // No change, just force a re-render
      });
      setTimeout(resolve, 100);
    });
    
    // Re-check the current shop state before validation
    try {
      const validationResult = validateBasicInfo();
      
      if (!validationResult) {
        
        return;
      }
    } catch (validationError) {
      
      Alert.alert('Validation Error', 'Failed to validate shop data: ' + (validationError.message || 'Unknown error'));
      return;
    }
    
    // Get the latest shop state (in case of async state updates)
    const currentShop = await new Promise<typeof shop>(resolve => {
      setShop(prevShop => {
        resolve(prevShop);
        return prevShop;
      });
    });
    
    // Ensure currentShop has required properties with defaults
    if (!currentShop?.business_hours) {
      console.warn('⚠️ currentShop.business_hours is missing, adding defaults');
      const defaultHours = createDefaultBusinessHours();
      setShop(prev => ({ ...prev, business_hours: defaultHours }));
      // Update currentShop reference
      currentShop.business_hours = defaultHours;
    }
    // Validate that at least one image is provided
    const isValidImageUrl = (url: string | undefined | null): boolean => {
      if (!url || typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (trimmed === '') return false;
      // Accept both local file URIs and HTTP URLs (for existing shops)
      // Note: iOS uses file:/// (three slashes) for local files
      return trimmed.startsWith('file://') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
    };
    
    const hasValidImages = currentShop?.images && currentShop.images.length > 0 && currentShop.images.some(img => isValidImageUrl(img));
    const hasValidLogo = isValidImageUrl(currentShop?.logo_url);
    if (currentShop?.images && currentShop.images.length > 0) {
      currentShop.images.forEach((img, i) => {
        const valid = isValidImageUrl(img);
        
      });
    }
    
    if (!hasValidImages && !hasValidLogo) {
      // Alert.alert(
      //   'Image Required',
      //   'Please add at least one image or logo for your shop.',
      //   [{ text: 'OK' }]
      // );
      // return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save a shop');
      return;
    }

    setIsSaving(true);
    
    // Show initial message about what we're doing
    if (hasImages || hasLogo) {
      
    }
      
      // Initialize upload progress if there are any images to upload
      // Use currentShop instead of shop to ensure we have the latest state
      const hasLogoToUpload = currentShop?.logo_url && currentShop.logo_url.startsWith('file://');
      const localImages = (currentShop?.images || []).filter(img => img && img.startsWith('file://'));
      const totalImagesToUpload = (hasLogoToUpload ? 1 : 0) + localImages.length;
      
      // Debug: Check if images are properly stored
      
      if (shop.images && Array.isArray(shop.images)) {
        shop.images.forEach((img, index) => {
          
        });
      }
      
      if (shop.logo_url) {
        
      }
      
      
      if (totalImagesToUpload > 0) {
        
        setUploadProgress({
          isUploading: true,
          currentImage: 0,
          totalImages: totalImagesToUpload,
          currentImageName: '',
          uploadedImages: 0,
          message: `Starting upload of ${totalImagesToUpload} image(s)...`
        });
        
        // Small delay to show the initial progress
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        
      }
      
      // Check each image in the array
      if (shop.images && shop.images.length > 0) {
        shop.images.forEach((img, index) => {
          
        });
      } else {
        
      }
      
      // Upload logo if it's a local URI (and storage is available)
      let uploadedLogoUrl = currentShop?.logo_url;
      if (currentShop?.logo_url && currentShop.logo_url.startsWith('file://')) {
        if (storageAvailable) {
          
          // Update progress for logo upload
          setUploadProgress(prev => ({
            ...prev,
            currentImage: 1,
            currentImageName: 'Logo',
            message: 'Uploading shop logo...'
          }));
          
          try {
            const logoResult = await ImageUploadService.uploadShopLogo(currentShop.logo_url);
            if (logoResult.success && logoResult.data) {
              uploadedLogoUrl = logoResult.data;
              
              // Update progress - logo completed
              setUploadProgress(prev => ({
                ...prev,
                uploadedImages: 1,
                message: '✅ Logo uploaded successfully!'
              }));
            } else {
              uploadedLogoUrl = currentShop.logo_url; // Keep local URI as fallback
              
              // Update progress - logo failed but continuing
              setUploadProgress(prev => ({
                ...prev,
                message: '⚠️ Logo upload failed, using local image: ' + (logoResult.error || 'Unknown error')
              }));
            }
          } catch (uploadError: any) {
            console.warn('⚠️ Logo upload threw error:', uploadError);
            uploadedLogoUrl = currentShop.logo_url; // Keep local URI as fallback
            
            // Update progress - upload error but continuing
            setUploadProgress(prev => ({
              ...prev,
              message: '⚠️ Logo upload error, using local image: ' + (uploadError.message || 'Network error')
            }));
          }
        } else {
          
          uploadedLogoUrl = '';
        }
      } else if (currentShop?.logo_url && !currentShop.logo_url.startsWith('http')) {
        
        uploadedLogoUrl = '';
      } else {
        
      }
      
      // Upload shop images that are local URIs
      let uploadedImageUrls: string[] = [];
      const existingImages = (currentShop?.images || []).filter(img => img && !img.startsWith('file://'));
      if (localImages.length > 0) {
        if (storageAvailable) {
          
          // Use already calculated values
          let uploadedCount = hasLogoToUpload ? 1 : 0; // Start counting from logo if uploaded
          
          // Upload images one by one to show progress
          for (let i = 0; i < localImages.length; i++) {
            const imageUri = localImages[i];
            
            // Update progress for current image
            setUploadProgress(prev => ({
              ...prev,
              currentImage: uploadedCount + 1,
              currentImageName: `Image ${i + 1}`,
              uploadedImages: uploadedCount,
              message: `Uploading image ${i + 1} of ${localImages.length}...`
            }));
            try {
              const imageResult = await ImageUploadService.uploadImage(imageUri, 'shop-images', 'gallery');
              
              if (imageResult.success && imageResult.data) {
                uploadedImageUrls.push(imageResult.data);
                uploadedCount++;
                // Update progress - image completed
                setUploadProgress(prev => ({
                  ...prev,
                  uploadedImages: uploadedCount,
                  message: `✅ Image ${i + 1} uploaded successfully!`
                }));
              } else {
                // Keep local image as fallback
                uploadedImageUrls.push(imageUri);
                uploadedCount++;
                // Update progress - image failed but continuing with local
                setUploadProgress(prev => ({
                  ...prev,
                  uploadedImages: uploadedCount,
                  message: `⚠️ Image ${i + 1} upload failed, using local: ${imageResult.error || 'Unknown error'}`
                }));
              }
            } catch (uploadError: any) {
              console.warn(`⚠️ Image ${i + 1} upload threw error:`, uploadError);
              // Keep local image as fallback
              uploadedImageUrls.push(imageUri);
              uploadedCount++;
              // Update progress - upload error but continuing with local
              setUploadProgress(prev => ({
                ...prev,
                uploadedImages: uploadedCount,
                message: `⚠️ Image ${i + 1} upload error, using local: ${uploadError.message || 'Network error'}`
              }));
            }
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Final upload completion message
          const totalUploaded = uploadedImageUrls.length + (uploadedLogoUrl && uploadedLogoUrl !== currentShop?.logo_url ? 1 : 0);
          if (totalUploaded > 0) {
            setUploadProgress(prev => ({
              ...prev,
              message: `🎉 All uploads complete! ${totalUploaded} image(s) uploaded successfully.`
            }));
            
            // Show completion message briefly
            setTimeout(() => {
              setUploadProgress(prev => ({
                ...prev,
                isUploading: false
              }));
            }, 2000);
          }
        } else {
          
        }
      } else {
        
      }
      
      // Combine existing and newly uploaded images
      const allImages = [...existingImages, ...uploadedImageUrls];
      
      // Use the main image (logo or first shop image) as image_url
      const mainImageUrl = uploadedLogoUrl || allImages[0] || '';
      
      // Validate all image URLs before storing
      const validAllImages = allImages.filter(url => url && url.trim() !== '' && url.startsWith('http'));
      const validLogoUrl = (uploadedLogoUrl && uploadedLogoUrl.startsWith('http')) ? uploadedLogoUrl : '';
      const validMainImageUrl = (mainImageUrl && mainImageUrl.startsWith('http')) ? mainImageUrl : '';
      validAllImages.forEach((url, index) => {
        
      });
      if (validLogoUrl) {
        
      }
      
      // Extract basic business hours for backward compatibility
      const getBusinessHours = (businessHours: any[]) => {
        const mondayHours = businessHours.find(h => h.day === 'Monday');
        return {
          start: mondayHours?.isOpen ? mondayHours.openTime : '09:00',
          end: mondayHours?.isOpen ? mondayHours.closeTime : '17:00'
        };
      };

      const hours = getBusinessHours((currentShop?.business_hours) || []);

      // Use formValues ref as primary source of truth (consistent with validation)
      // Ensure we have valid data before proceeding
      const safeName = formValues.current.name || currentShop?.name || '';
      const safeDescription = formValues.current.description || currentShop?.description || '';
      const safeAddress = formValues.current.address || currentShop?.address || '';
      const safePhone = formValues.current.phone || currentShop?.phone || '';
      const safeEmail = formValues.current.email || currentShop?.email || '';
      
      const shopData = {
        name: safeName.trim(),
        description: safeDescription.trim(),
        category: currentShop?.category || 'Beauty & Wellness',
        address: safeAddress.trim(),
        city: (formValues.current.city || currentShop?.city || '').trim(),
        state: (formValues.current.state || currentShop?.state || '').trim(),
        country: (formValues.current.country || currentShop?.country || 'Sweden').trim(),
        phone: safePhone.trim(),
        email: safeEmail.trim(),
        website_url: currentShop?.website_url?.trim() || null,
        image_url: validMainImageUrl,
        business_hours_start: hours.start,
        business_hours_end: hours.end,
        is_active: currentShop?.is_active ?? true,
        // Enhanced data fields
        logo_url: validLogoUrl,
        images: validAllImages, // Send as array, will be handled properly by auth service
        business_hours: currentShop?.business_hours || shop?.business_hours || createDefaultBusinessHours(),
        special_days: currentShop?.special_days || [],
        services: shop?.services || [],
        staff: shop?.staff || [],
        discounts: shop?.discounts || [],
        timezone: currentShop?.timezone || 'Europe/Stockholm',
        advance_booking_days: currentShop?.advance_booking_days || 30,
        slot_duration: currentShop?.slot_duration || 60,
        buffer_time: currentShop?.buffer_time || 15,
        auto_approval: currentShop?.auto_approval ?? true,
        first_time_discount_active: currentShop?.first_time_discount_active ?? true
      };
      // CRITICAL DEBUG: Show what business hours data we're sending
      console.log('🚨 FRONTEND: About to call updateShop');
      console.log('🚨 FRONTEND: currentShop.business_hours:', JSON.stringify(currentShop?.business_hours || [], null, 2));
      console.log('🚨 FRONTEND: shopData.business_hours:', JSON.stringify(shopData.business_hours, null, 2));
      

      let result;
      if (isEditing && shop.id) {
        
        result = await updateShopWithCRUD(shop.id, shopData, user.id);
      } else {
        
        // Extra safety check
        if (!shopData) {
          
          throw new Error('CRITICAL: shopData is undefined before service call');
        }
        if (!shopData.name || shopData.name.trim() === '') {
          
          throw new Error('CRITICAL: shopData.name is empty before service call');
        }
        // Make absolutely sure we have valid data
        if (!shopData) {
          
          throw new Error('shopData became undefined before service call');
        }
        
        // Create shop data for optimized service
        const optimizedShopData = {
          shop: {
            provider_id: user.id,
            name: shopData.name,
            description: shopData.description,
            category: shopData.category,
            phone: shopData.phone,
            email: shopData.email,
            website_url: shopData.website_url,
            logo_url: shopData.logo_url,
            business_hours: shopData.business_hours,
            timezone: shopData.timezone,
            advance_booking_days: shopData.advance_booking_days,
            slot_duration: shopData.slot_duration,
            buffer_time: shopData.buffer_time,
            auto_approval: shopData.auto_approval,
            is_active: shopData.is_active
          },
          addresses: [{
            address_type: 'primary',
            street_address: shopData.address,
            city: shopData.city,
            state: shopData.state,
            country: shopData.country,
            is_active: true
          }],
          staff: shopData.staff?.map((s: any) => ({
            name: s.name,
            email: s.email,
            phone: s.phone,
            role: s.role || 'staff',
            specialties: s.specialties || [],
            is_active: true
          })) || [],
          services: shopData.services?.map((s: any) => ({
            name: s.name,
            description: s.description,
            category: s.category,
            duration: s.duration,
            price: s.price,
            currency: 'NZD',
            staff_ids: [],
            is_active: true,
            display_order: 0
          })) || [],
          discounts: shopData.discounts?.map((d: any) => ({
            code: d.code,
            name: d.name,
            description: d.description,
            discount_type: d.discount_type || 'percentage',
            discount_value: d.discount_value,
            minimum_amount: d.minimum_amount,
            service_ids: [],
            is_active: true,
            used_count: 0
          })) || []
        };
        
        // Create shop with services and staff included - use currentShop to get latest state
        // CRITICAL FIX: Ensure all service fields are properly set
        const completeShopData = {
          ...shopData,
          services: (currentShop.services || []).map(service => ({
            ...service,
            is_active: service.is_active !== undefined ? service.is_active : true,
            price: service.price || 0,
            duration: service.duration || 60,
            description: service.description || '',
            category: service.category || shopData.category || 'General'
          })),
          staff: currentShop.staff || [],
          discounts: currentShop.discounts || []
        };
        
        console.log('🚨 CREATING SHOP WITH COMPLETE DATA:');
        console.log('🔍 OLD shop state services count:', shop.services?.length || 0);
        console.log('🔍 OLD shop state staff count:', shop.staff?.length || 0);
        console.log('🔍 CURRENT shop state services count:', currentShop.services?.length || 0);
        console.log('🔍 CURRENT shop state staff count:', currentShop.staff?.length || 0);
        console.log('🔍 Complete data services count:', completeShopData.services?.length || 0);
        console.log('🔍 Complete data staff count:', completeShopData.staff?.length || 0);
        console.log('🔍 Raw currentShop.services:', currentShop.services);
        console.log('🔍 Raw currentShop.staff:', currentShop.staff);
        console.log('🔍 Complete services data:', completeShopData.services);
        console.log('🔍 Complete staff data:', completeShopData.staff);
        
        // DEBUG: Check service structure
        if (completeShopData.services && completeShopData.services.length > 0) {
          console.log('🔍 FIRST SERVICE STRUCTURE:', completeShopData.services[0]);
          console.log('🔍 Service fields check:');
          completeShopData.services.forEach((srv, idx) => {
            console.log(`   Service ${idx}: name="${srv.name}", price=${srv.price}, duration=${srv.duration}, is_active=${srv.is_active}`);
          });
        }
        
        // Additional verification - make sure arrays aren't empty
        if (!completeShopData.services || completeShopData.services.length === 0) {
          console.warn('⚠️ WARNING: No services in completeShopData during shop creation!');
        }
        if (!completeShopData.staff || completeShopData.staff.length === 0) {
          console.warn('⚠️ WARNING: No staff in completeShopData during shop creation!');
        }
        
        result = await createShopWithCRUD(completeShopData, user.id);
        
      }

      if (result.success) {
        // Parse JSON fields back to objects for the app
        const parsedShopData = {
          ...result.data,
          business_hours: typeof result.data.business_hours === 'string' 
            ? JSON.parse(result.data.business_hours) 
            : result.data.business_hours,
          special_days: typeof result.data.special_days === 'string' 
            ? JSON.parse(result.data.special_days) 
            : result.data.special_days,
          staff: typeof result.data.staff === 'string' 
            ? JSON.parse(result.data.staff) 
            : result.data.staff,
          services: typeof result.data.services === 'string' 
            ? JSON.parse(result.data.services) 
            : result.data.services,
          discounts: typeof result.data.discounts === 'string' 
            ? JSON.parse(result.data.discounts) 
            : result.data.discounts,
          images: typeof result.data.images === 'string' 
            ? JSON.parse(result.data.images) 
            : result.data.images,
          // Include the uploaded image URLs
          image_url: validMainImageUrl || result.data.image_url,
          logo_url: validLogoUrl || '',
          images: validAllImages
        };

        // Create detailed success message about images
        let successMessage = isEditing ? 'Shop updated successfully!' : 'Shop created successfully!';
        let imageStatusMessage = '';
        
        // Check image upload status - handle both new and existing images
        // More robust checking for valid image URLs - include both local file URIs and HTTP URLs
        const isValidImageUrl = (url) => {
          if (!url || typeof url !== 'string') return false;
          const trimmed = url.trim();
          if (trimmed === '') return false;
          // Accept both local file URIs and HTTP URLs (for both new and existing images)
          return trimmed.startsWith('file://') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('supabase');
        };
        
        const existingImages = shop.images?.filter(img => isValidImageUrl(img)) || [];
        const existingLogo = isValidImageUrl(shop.logo_url) ? 1 : 0;
        const newImages = validAllImages?.length || 0;
        const newLogo = isValidImageUrl(validLogoUrl) ? 1 : 0;
        
        const totalExistingImages = existingImages.length + existingLogo;
        const totalNewImages = newImages + newLogo;
        const totalFinalImages = totalExistingImages + totalNewImages;
        
        // Debug each image URL individually
        if (shop.images && shop.images.length > 0) {
          shop.images.forEach((img, index) => {
            
          });
        }
        if (shop.logo_url) {
          
        }
        
        if (isEditing) {
          // For editing existing shops
          // Fallback: if we can't count properly, check if there are ANY images present
          const hasValidImages = shop.images && shop.images.some(img => isValidImageUrl(img));
          const hasValidLogo = isValidImageUrl(shop.logo_url);
          const hasAnyImages = hasValidImages || hasValidLogo;
          
          if (totalFinalImages === 0 && !hasAnyImages) {
            imageStatusMessage = '';
          } else if (totalFinalImages === 0 && hasAnyImages) {
            // Images exist but are already uploaded (HTTP URLs, not file:// URIs)
            const validImageCount = (shop.images?.filter(img => isValidImageUrl(img)).length || 0) + (hasValidLogo ? 1 : 0);
            imageStatusMessage = '';
          } else if (totalNewImages > 0) {
            imageStatusMessage = '';
          } else {
            imageStatusMessage = '';
          }
        } else {
          // For creating new shops
          // Check if images were selected but not uploaded due to storage issues
          const hasValidImages = shop.images && shop.images.some(img => isValidImageUrl(img));
          const hasValidLogo = isValidImageUrl(shop.logo_url);
          const hasAnyImages = hasValidImages || hasValidLogo;
          
          if (totalNewImages === 0 && !hasAnyImages) {
            imageStatusMessage = '';
          } else if (totalNewImages === 0 && hasAnyImages) {
            // Images exist but are already uploaded (HTTP URLs, not new file:// URIs)
            const validImageCount = (shop.images?.filter(img => isValidImageUrl(img)).length || 0) + (hasValidLogo ? 1 : 0);
            imageStatusMessage = '';
          } else {
            imageStatusMessage = '';
          }
        }
        
        // Add storage status if there were upload issues during this session
        const localImages = shop.images?.filter(img => img && img.startsWith('file://')) || [];
        const localLogo = shop.logo_url && shop.logo_url.startsWith('file://') ? 1 : 0;
        const totalLocalImages = localImages.length + localLogo;
        
        
        const fullMessage = successMessage;
        
        Alert.alert(
          'Success',
          fullMessage,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSave) {
                  onSave(parsedShopData);
                }
                // Navigate to provider home screen to show the created shop
                navigation.navigate('ProviderTabs', { 
                  screen: 'ProviderHomeTab',
                  params: { 
                    params: { newShop: parsedShopData }
                  }
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save shop');
      }
    } catch (error) {
      // Check if this is the "Shop data is required" error
      if (error?.message?.includes('Shop data is required') || error?.message?.includes('undefined or null')) {
        Alert.alert('Data Error', 'There was an issue with the shop data. Please check all required fields and try again.');
      } else {
        Alert.alert('Save Error', error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
      // Reset upload progress
      setUploadProgress({
        isUploading: false,
        currentImage: 0,
        totalImages: 0,
        currentImageName: '',
        uploadedImages: 0,
        message: ''
      });
    }
  };

  // Image picker with explicit type handling
  const pickImage = (type: 'shop' | 'logo') => {
    const options: ImagePickerOptions = {
      mediaType: 'photo',
      quality: type === 'logo' ? 0.9 : 0.8, // High quality but compressed
      maxWidth: type === 'logo' ? 512 : 1920,
      maxHeight: type === 'logo' ? 512 : 1080,
      includeBase64: false, // Don't include base64 to save memory
    };

    const handleResponse = async (response: ImagePickerResponse) => {
      
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        
        if (asset.uri) {
          try {
            // Skip compression for now and use original URI directly
            const imageUri = asset.uri;
            if (type === 'logo') {
              console.log('📸 Setting logo URL:', imageUri);
              setShop(prev => {
                const updated = { ...prev, logo_url: imageUri };
                console.log('📸 Updated shop with logo:', updated.logo_url);
                return updated;
              });
              // Force logo refresh only
              setLogoRefresh(prev => prev + 1);
              
            } else {
              console.log('📸 Setting shop image at index:', selectedImageIndex, 'URL:', imageUri);
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                // Ensure array is long enough
                while (newImages.length <= selectedImageIndex) {
                  newImages.push('');
                }
                newImages[selectedImageIndex] = imageUri;
                const updated = { ...prev, images: newImages };
                console.log('📸 Updated shop images:', updated.images);
                return updated;
              });
              // Force shop images refresh only
              setShopImagesRefresh(prev => prev + 1);
              
              // Verify state was set (delayed check)
              setTimeout(() => {
                console.log('📸 Verifying shop state after update...');
                setShop(prev => {
                  console.log('📸 Current shop images:', prev.images);
                  console.log('📸 Current logo:', prev.logo_url);
                  return prev;
                });
              }, 100);
            }
          } catch (error) {
            
            // Fall back to original image
            if (type === 'logo') {
              setShop(prev => ({ ...prev, logo_url: asset.uri! }));
            } else {
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = asset.uri!;
                return { ...prev, images: newImages };
              });
            }
          }
        } else {
          
        }
      } else {
        
      }
    };

    Alert.alert(
      `Select ${type === 'logo' ? 'Logo' : 'Shop Photo'}`,
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: () => launchCamera(options, handleResponse) },
        { text: 'Gallery', onPress: () => launchImageLibrary(options, handleResponse) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleImageResponse = async (response: ImagePickerResponse, forceType?: 'staff' | 'shop' | 'logo') => {
    console.log('📸 Image picker response:', response);
    console.log('📸 Force type:', forceType, 'Current imageUploadType:', imageUploadType);
    
    if (response.didCancel) {
      console.log('📸 User cancelled image picker');
      return;
    }
    
    if (response.errorMessage) {
      console.error('📸 Image picker error:', response.errorMessage);
      Alert.alert('Error', 'Failed to select image: ' + response.errorMessage);
      return;
    }
    
    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      console.log('📸 Selected asset:', asset);
      
      if (asset.uri) {
        try {
          // Use forceType if provided, otherwise fall back to state
          const actualType = forceType || imageUploadType;
          console.log('📸 Using type:', actualType);
          
          if (actualType === 'staff') {
            console.log('🔄 Setting staff avatar immediately:', asset.uri);
            
            // Show the image immediately first for better UX and store it as fallback
            const localImageUri = asset.uri;
            setStaffForm(prev => {
              console.log('🔄 Staff form before update:', prev.avatar_url);
              const updated = { ...prev, avatar_url: localImageUri };
              console.log('🔄 Staff form after update:', updated.avatar_url);
              return updated;
            });
            
            // Force re-render immediately to show the image
            setAvatarRefresh(prev => {
              const newRefresh = prev + 1;
              console.log('🔄 Avatar refresh updated to:', newRefresh);
              return newRefresh;
            });
            
            // Then compress and upload avatar image to cloud storage
            try {
              console.log('🗜️ Compressing avatar image...');
              const compressionResult = await compressAvatarImage(asset.uri);
              console.log('🗜️ Compression result:', compressionResult);
              
              const imageToUpload = compressionResult.success && compressionResult.uri 
                ? compressionResult.uri 
                : asset.uri;
              
              console.log('☁️ Uploading avatar to cloud storage...');
              const uploadResult = await ImageUploadService.uploadStaffAvatar(imageToUpload);
              
              if (uploadResult.success && uploadResult.data) {
                console.log('✅ Avatar uploaded successfully:', uploadResult.data);
                // Update with cloud storage URL
                setStaffForm(prev => ({ ...prev, avatar_url: uploadResult.data! }));
                setAvatarRefresh(prev => prev + 1);
              } else {
                console.warn('⚠️ Upload failed, keeping local image:', uploadResult.error);
                // Keep the local compressed version if upload fails, otherwise keep original
                const fallbackUri = (compressionResult.success && compressionResult.uri) ? compressionResult.uri : localImageUri;
                setStaffForm(prev => ({ ...prev, avatar_url: fallbackUri }));
                setAvatarRefresh(prev => prev + 1);
              }
            } catch (error) {
              console.error('❌ Avatar processing error:', error);
              // Keep the original image if both compression and upload fail
              setStaffForm(prev => ({ ...prev, avatar_url: localImageUri }));
              setAvatarRefresh(prev => prev + 1);
            }
          } else {
            // Compress shop image
            const compressionResult = await compressShopImage(asset.uri);
            
            if (compressionResult.success && compressionResult.uri) {
              
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = compressionResult.uri!;
                return { ...prev, images: newImages };
              });
            } else {
              
              setShop(prev => {
                const newImages = [...(prev.images || [])];
                newImages[selectedImageIndex] = asset.uri!;
                return { ...prev, images: newImages };
              });
            }
          }
        } catch (error) {
          console.error('❌ Image processing error:', error);
          
          // Fall back to uploading original images
          if (actualType === 'staff') {
            // Try to upload original avatar to cloud storage
            try {
              console.log('☁️ Fallback: Uploading original avatar to cloud storage...');
              const uploadResult = await ImageUploadService.uploadStaffAvatar(asset.uri);
              if (uploadResult.success && uploadResult.data) {
                console.log('✅ Fallback avatar upload successful:', uploadResult.data);
                setStaffForm(prev => ({ ...prev, avatar_url: uploadResult.data! }));
                setAvatarRefresh(prev => prev + 1);
              } else {
                console.warn('⚠️ Fallback upload failed, using local URI:', uploadResult.error);
                setStaffForm(prev => ({ ...prev, avatar_url: asset.uri! }));
                setAvatarRefresh(prev => prev + 1);
              }
            } catch (fallbackError) {
              console.error('❌ Fallback upload error:', fallbackError);
              setStaffForm(prev => ({ ...prev, avatar_url: asset.uri! }));
              setAvatarRefresh(prev => prev + 1);
            }
          } else {
            setShop(prev => {
              const newImages = [...(prev.images || [])];
              newImages[selectedImageIndex] = asset.uri!;
              return { ...prev, images: newImages };
            });
          }
        }
      }
    }
  };
  const pickStaffAvatar = () => {
    setImageUploadType('staff');
    const options: ImagePickerOptions = {
      mediaType: 'photo',
      quality: 0.9, // High quality but compressed
      maxWidth: 400,
      maxHeight: 400,
      includeBase64: false, // Don't include base64 to save memory
    };

    Alert.alert(
      'Select Profile Photo',
      'Choose how you want to select a profile image',
      [
        { text: 'Camera', onPress: () => launchCamera(options, (response) => handleImageResponse(response, 'staff')) },
        { text: 'Gallery', onPress: () => launchImageLibrary(options, (response) => handleImageResponse(response, 'staff')) },
        { text: 'Remove', onPress: () => setStaffForm(prev => ({ ...prev, avatar_url: undefined })), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const pickShopImage = (index: number) => {
    const options: ImagePickerOptions = {
      mediaType: 'photo',
      quality: 0.8, // High quality but compressed
      maxWidth: 1920,
      maxHeight: 1080,
      includeBase64: false, // Don't include base64 to save memory
    };

    const handleShopImageResponse = async (response: ImagePickerResponse) => {
      
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        
        if (asset.uri) {
          try {
            // Use original image URI directly for now
            const imageUri = asset.uri;
            console.log('📸 [pickShopImage] Setting image at index:', index, 'URI:', imageUri);
            
            setShop(prev => {
              const newImages = [...(prev.images || [])];
              // Ensure the array is long enough
              while (newImages.length <= index) {
                newImages.push('');
              }
              newImages[index] = imageUri;
              
              const updated = { ...prev, images: newImages };
              console.log('📸 [pickShopImage] Updated shop with images:', updated.images);
              return updated;
            });
            // Force image refresh
            setImageRefresh(prev => prev + 1);
            
          } catch (error) {
            
            // Fall back to original image
            
            setShop(prev => {
              const newImages = [...(prev.images || [])];
              while (newImages.length <= index) {
                newImages.push('');
              }
              newImages[index] = asset.uri!;
              return { ...prev, images: newImages };
            });
            // Force image refresh
            setImageRefresh(prev => prev + 1);
          }
        } else {
          
        }
      } else {
        
      }
    };

    Alert.alert(
      'Select Shop Photo',
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: () => launchCamera(options, handleShopImageResponse) },
        { text: 'Gallery', onPress: () => launchImageLibrary(options, handleShopImageResponse) },
        { text: 'Remove', onPress: () => removeShopImage(index), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removeShopImage = (index: number) => {
    setShop(prev => {
      const newImages = [...(prev.images || [])];
      // Set the specific index to empty string instead of removing the element
      // This keeps the array structure intact for the 5-slot grid
      newImages[index] = '';
      
      return { ...prev, images: newImages };
    });
  };

  // Business hours management
  // Helper function to format time in user-friendly way
  const formatTimeDisplay = (time: string): string => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    // Remove :00 for on-the-hour times
    if (minutes === '00') {
      return `${displayHour} ${ampm}`;
    }
    
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to format special day date in user-friendly way
  const formatSpecialDayDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Check if it's within the next 7 days
    const daysFromNow = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysFromNow > 0 && daysFromNow <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    
    // For past dates, show relative time
    if (daysFromNow < 0) {
      const daysAgo = Math.abs(daysFromNow);
      if (daysAgo === 1) return 'Yesterday';
      if (daysAgo < 7) return `${daysAgo} days ago`;
    }
    
    // Otherwise show full date
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const updateBusinessHours = (day: string, field: keyof BusinessHours, value: any) => {
    console.log('🚨 updateBusinessHours called:', { day, field, value });
    
    
    setShop(prev => {
      // Ensure prev and business_hours exist
      if (!prev) {
        console.warn('⚠️ prev is null/undefined in updateBusinessHours');
        return prev;
      }
      
      if (!prev.business_hours) {
        console.warn('⚠️ prev.business_hours is null/undefined, creating defaults');
        const defaultHours = createDefaultBusinessHours();
        return {
          ...prev,
          business_hours: defaultHours
        };
      }
      
      const oldHour = prev.business_hours.find(h => h.day === day);
      console.log('🚨 Old business hour for', day, ':', oldHour);
      
      const updatedHours = prev.business_hours.map(hour =>
        hour.day === day ? { ...hour, [field]: value } : hour
      );
      
      const newHour = updatedHours.find(h => h.day === day);
      console.log('🚨 New business hour for', day, ':', newHour);
      
      return {
        ...prev,
        business_hours: updatedHours
      };
    });
  };

  const openTimePicker = (day: string, type: 'open' | 'close') => {
    const currentHour = shop?.business_hours?.find(h => h.day === day);
    if (currentHour) {
      const time = type === 'open' ? currentHour.openTime : currentHour.closeTime;
      const [hours, minutes] = time.split(':').map(Number);
      setTempDate(new Date(2024, 0, 1, hours, minutes));
      setEditingTimeSlot({ day, type });
      setShowTimePicker(true); // Use native time picker instead of custom
    }
  };


  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate && editingTimeSlot) {
      const timeString = selectedDate.toTimeString().slice(0, 5);
      const field = editingTimeSlot.type === 'open' ? 'openTime' : 'closeTime';
      updateBusinessHours(editingTimeSlot.day, field, timeString);
    }
    setEditingTimeSlot(null);
  };

  // Special days management
  const openSpecialDayModal = (specialDay?: SpecialDay) => {
    if (specialDay) {
      setEditingSpecialDay(specialDay);
      setSpecialDayForm(specialDay);
    } else {
      setEditingSpecialDay(null);
      setSpecialDayForm({
        date: new Date().toISOString().split('T')[0],
        name: '', type: 'holiday', isOpen: false,
        openTime: '09:00', closeTime: '17:00',
        description: '', recurring: 'none'
      });
    }
    setShowSpecialDayModal(true);
  };

  const saveSpecialDay = () => {
    if (!specialDayForm.name?.trim()) {
      Alert.alert('Error', 'Special day name is required');
      return;
    }
    if (!specialDayForm.date) {
      Alert.alert('Error', 'Date is required');
      return;
    }

    const newSpecialDay: SpecialDay = {
      id: editingSpecialDay?.id || Date.now().toString(),
      name: specialDayForm.name!.trim(),
      date: specialDayForm.date!,
      type: specialDayForm.type!,
      isOpen: specialDayForm.isOpen!,
      openTime: specialDayForm.openTime,
      closeTime: specialDayForm.closeTime,
      description: specialDayForm.description?.trim(),
      recurring: specialDayForm.recurring
    };

    setShop(prev => {
      const specialDays = prev.special_days || [];
      if (editingSpecialDay) {
        return {
          ...prev,
          special_days: specialDays.map(d => d.id === editingSpecialDay.id ? newSpecialDay : d)
        };
      } else {
        return {
          ...prev,
          special_days: [...specialDays, newSpecialDay]
        };
      }
    });

    setShowSpecialDayModal(false);
    setEditingSpecialDay(null);
  };

  const deleteSpecialDay = (dayId: string) => {
    Alert.alert(
      'Delete Special Day',
      'Are you sure you want to delete this special day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShop(prev => ({
              ...prev,
              special_days: prev.special_days.filter(d => d.id !== dayId)
            }));
          }
        }
      ]
    );
  };

  // Service management (keeping existing functionality)
  const openServiceModal = async (service?: Service) => {
    console.log('🔧 Opening service modal:', { service: service?.name || 'NEW SERVICE' });
    if (service) {
      setEditingService(service);
      setServiceForm(service);
      console.log('📝 Editing existing service:', service.name);
      
      // Load existing service options
      try {
        // First check if service options are stored locally (for new shops)
        if (service.service_options && service.service_options.length > 0) {
          setServiceOptions(service.service_options);
          console.log('✅ Loaded', service.service_options.length, 'service options from local state');
        } else if (isEditing && shop.id) {
          // For existing shops, load from database
          const optionsResult = await normalizedShopService.getServiceOptions(service.id);
          if (optionsResult.success && optionsResult.data) {
            const loadedOptions = optionsResult.data.map((option: any) => ({
              id: option.id,
              option_name: option.option_name,
              option_description: option.option_description || '',
              price: option.price,
              duration: option.duration,
              is_active: option.is_active,
              sort_order: option.sort_order
            }));
            setServiceOptions(loadedOptions);
            console.log('✅ Loaded', loadedOptions.length, 'service options from database');
          } else {
            console.log('⚠️ No service options found in database:', optionsResult.error);
            resetServiceOptions();
          }
        } else {
          resetServiceOptions();
        }
      } catch (error) {
        console.error('❌ Error loading service options:', error);
        resetServiceOptions();
      }
    } else {
      setEditingService(null);
      setServiceForm({
        name: '', description: '', price: 0, duration: 60,
        category: shop.category, location_type: 'in_house', is_active: true
      });
      resetServiceOptions();
      console.log('➕ Creating new service');
    }
    setShowServiceModal(true);
    console.log('✅ Service modal should be visible now');
  };




  const saveService = async () => {
    console.log('💾 Saving service:', { serviceForm, editingService: editingService?.name || 'NEW' });
    
    if (!serviceForm.name?.trim()) {
      console.log('❌ Service name validation failed');
      Alert.alert('Error', 'Service name is required');
      return;
    }
    // Validate price: either main service has price OR service options exist with prices
    const hasValidMainPrice = serviceForm.price && serviceForm.price > 0;
    const hasValidOptions = serviceOptions.length > 0 && serviceOptions.some(option => 
      option.option_name.trim() && option.price > 0
    );
    
    if (!hasValidMainPrice && !hasValidOptions) {
      Alert.alert('Error', 'Either set a base service price or add service options with prices');
      return;
    }

    const serviceData = {
      name: serviceForm.name!.trim(),
      description: serviceForm.description || '',
      price: serviceForm.price || 0,
      duration: serviceForm.duration || 60,
      category: serviceForm.category || shop.category,
      assigned_staff: serviceForm.assigned_staff || [],
      location_type: serviceForm.location_type || 'in_house',
      is_active: serviceForm.is_active ?? true
    };

    // Validate service options if they exist
    if (serviceOptions.length > 0) {
      const invalidOptions = serviceOptions.filter(option => 
        !option.option_name.trim() || option.price <= 0 || option.duration <= 0
      );
      
      if (invalidOptions.length > 0) {
        Alert.alert('Error', 'All service options must have a name, price greater than 0, and duration greater than 0');
        return;
      }
    }

    if (isEditing && shop.id) {
      // For existing shops, save directly to database
      
      try {
        let result;
        if (editingService) {
          
          result = await normalizedShopService.updateService(editingService.id!, serviceData);
        } else {
          
          result = await normalizedShopService.createService(shop.id, serviceData);
          
          // If normalized service fails due to missing tables, fall back to local state
          if (!result.success && result.error?.includes('does not exist')) {
            
            result = { success: true, data: serviceData };
            
            // Add to local state as fallback
            const newService: Service = {
              id: Date.now().toString(),
              ...serviceData
            };

            setShop(prev => {
              const updatedShop = {
                ...prev,
                services: deduplicateById([...(prev.services || []), newService])
              };
              console.log('🎯 FALLBACK: ADDED NEW SERVICE TO SHOP STATE:');
              console.log('📊 Previous services count:', prev.services?.length || 0);
              console.log('📊 New service:', newService.name);
              console.log('📊 Updated services count:', updatedShop.services.length);
              return updatedShop;
            });
          }
        }
        
        if (result.success) {
          // Save service options if they exist
          if (serviceOptions.length > 0 && result.data?.id) {
            try {
              console.log('💾 Saving service options for service:', result.data.id);
              const optionsResult = editingService 
                ? await normalizedShopService.updateServiceOptions(result.data.id, serviceOptions)
                : await normalizedShopService.createServiceOptions(result.data.id, serviceOptions);
              
              if (!optionsResult.success) {
                console.error('❌ Service options save failed:', optionsResult.error);
                Alert.alert('Warning', `Service was saved but service options failed: ${optionsResult.error}`);
              } else {
                console.log('✅ Service options saved successfully:', optionsResult.data?.length);
              }
            } catch (optionError) {
              console.error('❌ Error saving service options:', optionError);
              Alert.alert('Warning', 'Service was saved but there was an error saving service options');
            }
          }
          
          // Only refresh from database if it was actually saved to database (not fallback)
          if (!result.error?.includes('does not exist')) {
            await refreshShopData('after-save');
            // Also reload services to ensure we have the latest data with correct field names
            if (shop.id) {
              await loadShopServices(shop.id);
            }
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to save service');
        }
      } catch (error) {
        
        Alert.alert('Error', 'An unexpected error occurred while saving service');
      }
    } else {
      // For new shops, add to local state (will be saved when shop is created)
      const newService: Service = {
        id: editingService?.id || Date.now().toString(),
        ...serviceData,
        service_options: serviceOptions.length > 0 ? serviceOptions : undefined // Store options locally
      };

      setShop(prev => {
        const services = prev.services || [];
        let updatedShop;
        if (editingService) {
          updatedShop = {
            ...prev,
            services: services.map(s => s.id === editingService.id ? newService : s)
          };
        } else {
          updatedShop = {
            ...prev,
            services: deduplicateById([...services, newService])
          };
          console.log('🎯 ADDED NEW SERVICE TO SHOP STATE:');
          console.log('📊 Previous services count:', services.length);
          console.log('📊 New service:', newService.name);
          console.log('📊 Updated services count:', updatedShop.services.length);
        }
        return updatedShop;
      });
    }

    // Show success message with options info
    const optionsMessage = serviceOptions.length > 0 
      ? ` with ${serviceOptions.length} option${serviceOptions.length === 1 ? '' : 's'}` 
      : '';
    
    const successMessage = editingService 
      ? `Service updated successfully${optionsMessage}!`
      : `Service created successfully${optionsMessage}!`;
    
    Alert.alert('Success', successMessage);

    setShowServiceModal(false);
    setEditingService(null);
    resetServiceOptions(); // Clear service options after saving
  };

  const toggleServiceStatus = async (service: Service, value: boolean) => {
    try {
      const result = await normalizedShopService.updateService(service.id, { is_active: value });
      if (result.success) {
        // Update local state
        setShop(prev => ({
          ...prev,
          services: prev.services.map(s => s.id === service.id ? { ...s, is_active: value } : s)
        }));
      } else {
        Alert.alert('Error', 'Failed to update service status');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating service status');
    }
  };

  const deleteService = (serviceId: string) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isEditing && shop.id) {
              // For existing shops, delete from database
              const result = await normalizedShopService.deleteService(serviceId);
              
              if (result.success) {
                
                // Refresh the complete shop data
                await refreshShopData('after-save');
              } else {
                
                Alert.alert('Error', result.error || 'Failed to delete service');
              }
            } else {
              // For new shops, remove from local state
              
              setShop(prev => ({
                ...prev,
                services: (prev.services || []).filter(s => s.id !== serviceId)
              }));
            }
          }
        }
      ]
    );
  };

  // Discount management (keeping existing functionality)
  const openDiscountModal = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setDiscountForm(discount);
    } else {
      setEditingDiscount(null);
      setDiscountForm({
        type: 'percentage', value: 0, description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: true, used_count: 0
      });
    }
    setShowDiscountModal(true);
  };

  const saveDiscount = async () => {
    if (!discountForm.description?.trim()) {
      Alert.alert('Error', 'Discount description is required');
      return;
    }
    if (!discountForm.value || discountForm.value <= 0) {
      Alert.alert('Error', 'Discount value must be greater than 0');
      return;
    }

    const discountData = {
      type: discountForm.type!,
      value: discountForm.value!,
      description: discountForm.description!.trim(),
      start_date: discountForm.start_date!,
      end_date: discountForm.end_date!,
      is_active: discountForm.is_active ?? true,
      used_count: discountForm.used_count || 0,
      min_amount: discountForm.min_amount,
      max_discount: discountForm.max_discount,
      usage_limit: discountForm.usage_limit,
      applicable_services: discountForm.applicable_services || [],
      conditions: discountForm.conditions || {}
    };

    if (isEditing && shop.id) {
      // For existing shops, save directly to database
      
      try {
        let result;
        if (editingDiscount) {
          
          result = await normalizedShopService.updateDiscount(editingDiscount.id!, discountData);
        } else {
          
          result = await normalizedShopService.createDiscount(shop.id, discountData);
          
          // If normalized service fails due to missing tables, fall back to local state
          if (!result.success && result.error?.includes('does not exist')) {
            
            result = { success: true, data: discountData };
            
            // Add to local state as fallback
            const newDiscount: Discount = {
              id: Date.now().toString(),
              ...discountData
            };

            setShop(prev => ({
              ...prev,
              discounts: deduplicateById([...(prev.discounts || []), newDiscount])
            }));
          }
        }
        
        if (result.success) {
          
          // Only refresh from database if it was actually saved to database (not fallback)
          if (!result.error?.includes('does not exist')) {
            await refreshShopData('after-save');
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to save discount');
        }
      } catch (error) {
        
        Alert.alert('Error', 'An unexpected error occurred while saving discount');
      }
    } else {
      // For new shops, add to local state (will be saved when shop is created)
      const newDiscount: Discount = {
        id: editingDiscount?.id || Date.now().toString(),
        ...discountData
      };

      setShop(prev => {
        const discounts = prev.discounts || [];
        if (editingDiscount) {
          return {
            ...prev,
            discounts: discounts.map(d => d.id === editingDiscount.id ? newDiscount : d)
          };
        } else {
          return {
            ...prev,
            discounts: deduplicateById([...discounts, newDiscount])
          };
        }
      });
    }

    setShowDiscountModal(false);
    setEditingDiscount(null);
  };

  const deleteDiscount = (discountId: string) => {
    Alert.alert(
      'Delete Discount',
      'Are you sure you want to delete this discount?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isEditing && shop.id) {
              // For existing shops, delete from database
              const result = await normalizedShopService.deleteDiscount(discountId);
              
              if (result.success) {
                
                // Refresh the complete shop data
                await refreshShopData('after-save');
              } else {
                
                Alert.alert('Error', result.error || 'Failed to delete discount');
              }
            } else {
              // For new shops, remove from local state
              
              setShop(prev => ({
                ...prev,
                discounts: (prev.discounts || []).filter(d => d.id !== discountId)
              }));
            }
          }
        }
      ]
    );
  };

  // Staff management
  const closeStaffModal = () => {
    console.log('🔄 Closing staff modal and resetting form');
    setShowStaffModal(false);
    setEditingStaff(null);
    
    // Reset staff form to ensure clean state
    setStaffForm({
      name: '', 
      email: '', 
      phone: '', 
      role: '', 
      specialties: [], 
      bio: '', 
      experience_years: 0, 
      is_active: true,
      avatar_url: undefined,
      work_schedule: {
        monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        tuesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        wednesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        thursday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        friday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        saturday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        sunday: { isWorking: false, startTime: '09:00', endTime: '17:00' }
      },
      leave_dates: []
    });
    setAvatarRefresh(prev => prev + 1);
    setNewSpecialty('');
  };

  const openStaffModal = (staff?: Staff) => {
    console.log('📝 Opening staff modal, staff:', staff ? 'editing' : 'new');
    if (staff) {
      setEditingStaff(staff);
      
      // Fix avatar_url if it's an array (data corruption fix)
      let avatar_url = staff.avatar_url;
      if (Array.isArray(avatar_url)) {
        console.warn('🚨 Staff avatar_url is an array, fixing:', avatar_url);
        avatar_url = avatar_url.length > 0 ? avatar_url[0] : undefined;
      }
      
      const formData = {
        ...staff,
        avatar_url: avatar_url,
        leave_dates: staff.leave_dates || [],
        work_schedule: staff.work_schedule || {
          monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          tuesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          wednesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          thursday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          friday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          saturday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          sunday: { isWorking: false, startTime: '09:00', endTime: '17:00' }
        }
      };
      console.log('📝 Setting staff form to:', formData);
      console.log('📝 Work schedule:', formData.work_schedule);
      console.log('📝 Leave dates:', formData.leave_dates);
      setStaffForm(formData);
      // Force avatar refresh when opening edit modal
      setAvatarRefresh(prev => prev + 1);
    } else {
      setEditingStaff(null);
      const emptyForm = {
        name: '', 
        email: '', 
        phone: '', 
        role: '', 
        specialties: [], 
        bio: '', 
        experience_years: 0, 
        is_active: true,
        avatar_url: undefined,
        work_schedule: {
          monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          tuesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          wednesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          thursday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          friday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          saturday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
          sunday: { isWorking: false, startTime: '09:00', endTime: '17:00' }
        },
        leave_dates: []
      };
      console.log('📝 Setting empty staff form:', emptyForm);
      setStaffForm(emptyForm);
      setNewSpecialty('');
      setAvatarRefresh(prev => prev + 1); // Force avatar re-render
    }
    setShowStaffModal(true);
  };

  const saveStaff = async () => {
    if (!staffForm.name?.trim()) {
      Alert.alert('Error', 'Staff name is required');
      return;
    }
    if (!staffForm.email?.trim() || !staffForm.email.includes('@')) {
      Alert.alert('Error', 'Valid email is required');
      return;
    }

    // Ensure avatar_url is a single string, not an array
    let avatar_url = staffForm.avatar_url;
    if (Array.isArray(avatar_url)) {
      console.warn('🚨 Fixing avatar_url array before save:', avatar_url);
      avatar_url = avatar_url.length > 0 ? avatar_url[0] : undefined;
    }

    // Show loading state during upload
    setIsLoading(true);
    
    // Upload staff avatar before saving to database
    console.log('👤📤 Uploading staff avatar before save...');
    let finalAvatarUrl = avatar_url;
    
    if (avatar_url && !avatar_url.startsWith('http')) {
      try {
        const uploadResult = await StaffImageUploadService.uploadStaffAvatar(avatar_url);
        if (uploadResult.success && uploadResult.avatarUrl) {
          finalAvatarUrl = uploadResult.avatarUrl;
          console.log('✅ Staff avatar uploaded successfully:', finalAvatarUrl);
          
          if (uploadResult.warning) {
            console.warn('⚠️', uploadResult.warning);
          }
        } else {
          console.error('❌ Staff avatar upload failed:', uploadResult.error);
          Alert.alert(
            'Upload Warning',
            'Staff avatar upload to cloud failed. The staff will be saved with a local image reference.',
            [{ text: 'OK' }]
          );
          // Keep original URL as fallback
          finalAvatarUrl = avatar_url;
        }
      } catch (error) {
        console.error('❌ Staff avatar upload error:', error);
        Alert.alert(
          'Upload Error',
          'There was an issue uploading the staff avatar. The staff will be saved with a local image reference.',
          [{ text: 'OK' }]
        );
        // Keep original URL as fallback
        finalAvatarUrl = avatar_url;
      }
    }

    const staffData = {
      name: staffForm.name!.trim(),
      email: staffForm.email!.trim(),
      phone: staffForm.phone || '',
      role: staffForm.role || '',
      specialties: (staffForm.specialties || []).filter(s => s && s.trim()),
      avatar_url: finalAvatarUrl,
      bio: staffForm.bio?.trim() || '',
      experience_years: staffForm.experience_years || 0,
      is_active: staffForm.is_active ?? true,
      work_schedule: staffForm.work_schedule || {
        monday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        tuesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        wednesday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        thursday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        friday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        saturday: { isWorking: false, startTime: '09:00', endTime: '17:00' },
        sunday: { isWorking: false, startTime: '09:00', endTime: '17:00' }
      },
      leave_dates: staffForm.leave_dates || []
    };

    if (isEditing && shop.id) {
      // For existing shops, save directly to database
      try {
        let result;
        if (editingStaff) {
          
          result = await normalizedShopService.updateStaff(editingStaff.id!, staffData);
        } else {
          
          result = await normalizedShopService.createStaff(shop.id, staffData);
          
          // If normalized service fails due to missing tables, fall back to local state
          if (!result.success && result.error?.includes('does not exist')) {
            
            result = { success: true, data: staffData };
            
            // Add to local state as fallback
            const newStaff: Staff = {
              id: Date.now().toString(),
              ...staffData
            };

            setShop(prev => {
              const updatedShop = {
                ...prev,
                staff: deduplicateById([...(prev.staff || []), newStaff])
              };
              console.log('🎯 FALLBACK: ADDED NEW STAFF TO SHOP STATE:');
              console.log('📊 Previous staff count:', prev.staff?.length || 0);
              console.log('📊 New staff:', newStaff.name);
              console.log('📊 Updated staff count:', updatedShop.staff.length);
              return updatedShop;
            });
          }
        }
        
        if (result.success) {
          
          // Only refresh from database if it was actually saved to database (not fallback)
          if (!result.error?.includes('does not exist')) {
            await refreshShopData('after-save');
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to save staff member');
        }
      } catch (error) {
        
        Alert.alert('Error', 'An unexpected error occurred while saving staff');
      } finally {
        setIsLoading(false);
      }
    } else {
      // For new shops, add to local state (will be saved when shop is created)
      const newStaff: Staff = {
        id: editingStaff?.id || Date.now().toString(),
        ...staffData
      };

      setShop(prev => {
        
        const staff = prev.staff || [];
        let updatedShop;
        if (editingStaff) {
          updatedShop = {
            ...prev,
            staff: staff.map(s => s.id === editingStaff.id ? newStaff : s)
          };
        } else {
          updatedShop = {
            ...prev,
            staff: deduplicateById([...staff, newStaff])
          };
          console.log('🎯 ADDED NEW STAFF TO SHOP STATE:');
          console.log('📊 Previous staff count:', staff.length);
          console.log('📊 New staff:', newStaff.name);
          console.log('📊 Updated staff count:', updatedShop.staff.length);
        }
        
        return updatedShop;
      });
    }

    // Reset loading state for new shops path as well
    setIsLoading(false);
    closeStaffModal();
  };

  const deleteStaff = (staffId: string) => {
    Alert.alert(
      'Delete Staff Member',
      'Are you sure you want to delete this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isEditing && shop.id) {
              // For existing shops, delete from database
              const result = await normalizedShopService.deleteStaff(staffId);
              
              if (result.success) {
                
                // Refresh the complete shop data
                await refreshShopData('after-save');
              } else {
                
                Alert.alert('Error', result.error || 'Failed to delete staff member');
              }
            } else {
              // For new shops, remove from local state
              
              setShop(prev => ({
                ...prev,
                staff: (prev.staff || []).filter(s => s.id !== staffId)
              }));
            }
          }
        }
      ]
    );
  };

  const addSpecialty = () => {
    const trimmedSpecialty = newSpecialty.trim();
    if (trimmedSpecialty && !(staffForm.specialties || []).includes(trimmedSpecialty)) {
      setStaffForm(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []).filter(s => s && s.trim()), trimmedSpecialty]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setStaffForm(prev => ({
      ...prev,
      specialties: (prev.specialties || []).filter(s => s && s.trim() && s !== specialty)
    }));
  };

  const addSuggestedSpecialty = (specialty: string) => {
    if (specialty && specialty.trim() && !(staffForm.specialties || []).includes(specialty)) {
      setStaffForm(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []).filter(s => s && s.trim()), specialty]
      }));
    }
  };

  // Render methods

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { id: 'basic', label: 'Basic', icon: 'information-circle-outline' },
        { id: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
        { id: 'staff', label: 'Staff', icon: 'people-outline' },
        { id: 'services', label: 'Services', icon: 'construct-outline' },
        { id: 'discounts', label: 'Discounts', icon: 'pricetag-outline' },
        { id: 'settings', label: 'Settings', icon: 'settings-outline' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
          onPress={() => setActiveTab(tab.id as any)}
        >
          <Ionicons 
            name={tab.icon as any} 
            size={18} 
            color={activeTab === tab.id ? '#FFFFFF' : '#6B7280'} 
          />
          <Text style={[
            styles.tabLabel,
            activeTab === tab.id && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      {/* Images Section */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Shop Images</Text>
        
        {/* Shop Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.imageLabel}>Shop Logo</Text>
          <TouchableOpacity style={styles.logoContainer} onPress={() => pickImage('logo')}>
            {shop.logo_url ? (
              <Image 
                key={`logo-${shop.logo_url}-${logoRefresh}`}
                source={{ uri: appendTimestamp(shop.logo_url, logoRefresh) }} 
                style={styles.logoImage}
                onError={(e) => console.error('❌ Logo image failed to load:', e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="business-outline" size={32} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>


        {/* Shop Photos Grid */}
        <View style={styles.photosSection}>
          <Text style={styles.imageLabel}>Shop Photos (up to 5)</Text>
          <View style={styles.photosGrid}>
            {[0, 1, 2, 3, 4].map((index) => {
              const imageUrl = shop.images?.[index];
              const hasImage = imageUrl && imageUrl.trim() !== '';
              console.log(`🖼️ Shop image ${index}: hasImage=${hasImage}, URL=${imageUrl}`);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.photoBox}
                  onPress={() => pickShopImage(index)}
                >
                  {hasImage ? (
                    <Image 
                      key={`shop-image-${index}-${imageUrl}-${shopImagesRefresh}`}
                      source={{ uri: appendTimestamp(imageUrl, shopImagesRefresh) }} 
                      style={styles.photoImage}
                      onError={(e) => console.error(`❌ Shop image ${index} failed to load:`, e.nativeEvent.error)}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={20} color="#9CA3AF" />
                      <Text style={styles.photoPlaceholderText}>Add</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Basic Information */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shop Name *</Text>
          <TextInput
            ref={shopNameRef}
            style={styles.input}
            value={shop.name}
            onChangeText={(text) => {
              // Update the ref value immediately
              formValues.current.name = text;
              
              // Also update state for UI
              setShop(prev => {
                const newState = { ...prev, name: text };
                
                return newState;
              });
            }}
            placeholder="Enter shop name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity 
            style={styles.selectInput}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.selectInputText}>{shop.category}</Text>
            <Ionicons name="chevron-down" size={20} color="#1A2533" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={shop.description}
            onChangeText={(text) => {
              
              formValues.current.description = text;
              setShop(prev => ({ ...prev, description: text }));
            }}
            placeholder="Describe your shop and services"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={shop.phone}
            onChangeText={(text) => {
              formValues.current.phone = text;
              setShop(prev => ({ ...prev, phone: text }));
            }}
            placeholder="+46 XX XXX XX XX"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={shop.email}
            onChangeText={(text) => {
              formValues.current.email = text;
              setShop(prev => ({ ...prev, email: text }));
            }}
            placeholder="shop@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website (Optional)</Text>
          <TextInput
            style={styles.input}
            value={shop.website_url}
            onChangeText={(text) => setShop(prev => ({ ...prev, website_url: text }))}
            placeholder="https://yourwebsite.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Address Information */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Address</Text>
        
        <View style={[styles.inputGroup, { zIndex: 999 }]}>
          <Text style={styles.label}>Street Address *</Text>
          <TextInput
            style={styles.input}
            value={addressQuery || shop.address}
            onChangeText={handleAddressQueryChange}
            onFocus={() => {
              // Set initial query if address exists
              if (shop.address && !addressQuery) {
                setAddressQuery(shop.address);
              }
              // Hide suggestions when focusing on other fields
              if (showAddressSuggestions && addressSuggestions.length > 0) {
                setShowAddressSuggestions(true);
              }
            }}
            placeholder="Type your address to search..."
            placeholderTextColor="#9CA3AF"
          />
          
          {/* Use My Address Button */}
          <TouchableOpacity
            style={styles.useMyAddressButton}
            onPress={useMyAddress}
          >
            <Ionicons name="person-outline" size={16} color="#1A2533" />
            <Text style={styles.useMyAddressText}>Use My Address</Text>
          </TouchableOpacity>
          
          {/* Address suggestions dropdown - positioned relative to input group */}
          {showAddressSuggestions && addressSuggestions.length > 0 && (
            <View style={[styles.addressDropdown, { top: 70 }]}>
              <ScrollView 
                style={styles.addressDropdownScroll} 
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {addressSuggestions.slice(0, 5).map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion.id || index}
                    style={[
                      styles.addressDropdownItem,
                      index === addressSuggestions.slice(0, 5).length - 1 && styles.lastDropdownItem
                    ]}
                    onPress={() => selectAddress(suggestion)}
                  >
                    <Ionicons name="location-outline" size={16} color="#3B82F6" />
                    <Text style={styles.addressDropdownText} numberOfLines={2}>
                      {suggestion.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Loading indicator */}
          {isSearchingAddress && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1A2533" />
              <Text style={styles.loadingText}>Searching addresses...</Text>
            </View>
          )}
        </View>

        <View style={[styles.row, { zIndex: 1 }]}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={shop.city}
              onChangeText={(text) => {
                formValues.current.city = text;
                setShop(prev => ({ ...prev, city: text }));
              }}
              onFocus={dismissAddressSuggestions}
              placeholder="City"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>State/Province</Text>
            <TextInput
              style={styles.input}
              value={shop.state}
              onChangeText={(text) => {
                formValues.current.state = text;
                setShop(prev => ({ ...prev, state: text }));
              }}
              onFocus={dismissAddressSuggestions}
              placeholder="State"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={shop.country}
            onChangeText={(text) => {
              formValues.current.country = text;
              setShop(prev => ({ ...prev, country: text }));
            }}
            onFocus={dismissAddressSuggestions}
            placeholder="Country"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
    </View>
  );

  const renderScheduleTab = () => (
    <View style={styles.section}>
      {/* Friendly Schedule Display */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Current Schedule Overview</Text>
        <FriendlyScheduleDisplay 
          businessHours={shop?.business_hours || []}
          specialDays={shop?.special_days || []}
        />
      </View>

      {/* Business Hours Editor */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Edit Business Hours</Text>
        
        {(shop?.business_hours && Array.isArray(shop.business_hours) ? shop.business_hours : createDefaultBusinessHours())
          .filter((hours, index, self) => {
            // Extra safety check for hours object
            if (!hours || typeof hours !== 'object' || !hours.day) {
              console.warn('⚠️ Invalid business hours object:', hours);
              return false;
            }
            // Remove duplicates by keeping only the first occurrence of each day
            return index === self.findIndex(h => h && h.day === hours.day);
          })
          .map((hours, index) => {
            // Additional safety check before rendering
            if (!hours || !hours.day) {
              console.warn('⚠️ Skipping invalid business hour:', hours);
              return null;
            }
            
            return (
          <View key={`business-hour-${hours.day}-${index}`} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayName}>{hours.day}</Text>
              <Switch
                value={hours.isOpen}
                onValueChange={(value) => updateBusinessHours(hours.day, 'isOpen', value)}
                trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
                thumbColor={hours.isOpen ? '#1A2533' : '#9CA3AF'}
              />
            </View>
            
            {hours.isOpen && (
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker(hours.day, 'open')}
                >
                  <Ionicons name="time-outline" size={16} color="#1A2533" />
                  <Text style={styles.timeText}>{formatTimeDisplay(hours.openTime)}</Text>
                </TouchableOpacity>
                
                <Text style={styles.timeSeparator}>to</Text>
                
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker(hours.day, 'close')}
                >
                  <Ionicons name="time-outline" size={16} color="#1A2533" />
                  <Text style={styles.timeText}>{formatTimeDisplay(hours.closeTime)}</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {!hours.isOpen && (
              <Text style={styles.closedText}>Closed</Text>
            )}
          </View>
            );
          }).filter(item => item !== null)}
      </View>

      {/* Special Days */}
      <View style={styles.formSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Special Days & Holidays</Text>
          <TouchableOpacity
            style={styles.roundedAddButton}
            onPress={() => openSpecialDayModal()}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {shop.special_days && shop.special_days.length > 0 ? (
          <FlatList
            data={shop.special_days}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const typeConfig = SPECIAL_DAY_TYPES.find(t => t.id === item.type);
              return (
                <View style={styles.specialDayCard}>
                  <View style={styles.specialDayHeader}>
                    <View style={[styles.specialDayIcon, { backgroundColor: typeConfig?.color + '20' }]}>
                      <Ionicons 
                        name={typeConfig?.icon as any || 'calendar'} 
                        size={20} 
                        color={typeConfig?.color || '#6B7280'} 
                      />
                    </View>
                    <View style={styles.specialDayInfo}>
                      <Text style={styles.specialDayName}>{item.name}</Text>
                      <Text style={styles.specialDayDate}>
                        {formatSpecialDayDate(item.date)}
                        {item.recurring !== 'none' && ` • ${RECURRING_OPTIONS.find(r => r.id === item.recurring)?.name}`}
                      </Text>
                      <Text style={styles.specialDayType}>{typeConfig?.name}</Text>
                    </View>
                    <View style={styles.specialDayActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openSpecialDayModal(item)}
                      >
                        <Ionicons name="create-outline" size={18} color="#1A2533" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => deleteSpecialDay(item.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {item.isOpen && item.openTime && item.closeTime && (
                    <View style={styles.specialDayHours}>
                      <Ionicons name="time-outline" size={14} color="#1A2533" />
                      <Text style={styles.specialDayHoursText}>
                        {formatTimeDisplay(item.openTime || '')} - {formatTimeDisplay(item.closeTime || '')}
                      </Text>
                    </View>
                  )}
                  
                  {item.description && (
                    <Text style={styles.specialDayDescription}>{item.description}</Text>
                  )}
                </View>
              );
            }}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Special Days Added</Text>
            <Text style={styles.emptyStateDescription}>
              Add holidays, special hours, or events to keep customers informed
            </Text>
          </View>
        )}
      </View>

      {/* Timezone Selection */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Timezone</Text>
        <TouchableOpacity 
          style={styles.selectInput}
          onPress={() => setShowTimezoneModal(true)}
        >
          <Text style={styles.selectInputText}>{shop.timezone}</Text>
          <Ionicons name="chevron-down" size={20} color="#1A2533" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderServices = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Services</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            console.log('🔥 ADD SERVICE BUTTON PRESSED');
            openServiceModal();
          }}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1A2533" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : shop.services && shop.services.length > 0 ? (
        <FlatList
          data={shop.services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.serviceCard, !item.is_active && styles.inactiveServiceCard]}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceNameRow}>
                    <Text style={[styles.serviceName, !item.is_active && styles.inactiveServiceName]}>
                      {item.name}
                    </Text>
                    {!item.is_active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.serviceCategory, !item.is_active && styles.inactiveServiceCategory]}>
                    {item.category}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <Switch
                    value={item.is_active}
                    onValueChange={(value) => toggleServiceStatus(item, value)}
                    trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                    thumbColor={item.is_active ? '#10B981' : '#9CA3AF'}
                    style={styles.serviceSwitch}
                  />
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openServiceModal(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#1A2533" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteService(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.serviceDescription}>{item.description}</Text>
              
              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetail}>
                  <Ionicons name="cash-outline" size={16} color="#10B981" />
                  <Text style={styles.serviceDetailText}>${item.price || 0}</Text>
                </View>
                <View style={styles.serviceDetail}>
                  <Ionicons name="time-outline" size={16} color="#1A2533" />
                  <Text style={styles.serviceDetailText}>{item.duration || item.duration_minutes || 0} min</Text>
                </View>
                <View style={styles.serviceDetail}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }
                  ]} />
                  <Text style={styles.serviceDetailText}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              
              {item.discount && (
                <View style={styles.discountBadge}>
                  <Ionicons name="pricetag" size={14} color="#1A2533" />
                  <Text style={styles.discountText}>{item.discount.description}</Text>
                </View>
              )}
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Services Added</Text>
          <Text style={styles.emptyStateDescription}>
            Add services that your shop offers to attract customers
          </Text>
        </View>
      )}
    </View>
  );

  const renderStaff = () => {
    try {
      console.log('🔍 Rendering staff tab with data:', shop.staff);
      console.log('🔍 Staff count:', shop.staff?.length || 0);
      
      if (shop.staff && !Array.isArray(shop.staff)) {
        console.error('❌ Staff is not an array:', typeof shop.staff, shop.staff);
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Members</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Invalid staff data</Text>
              <Text style={styles.emptyStateDescription}>Please refresh the page</Text>
            </View>
          </View>
        );
      }
      
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff Members</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openStaffModal()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1A2533" />
              <Text style={styles.loadingText}>Loading staff...</Text>
            </View>
          ) : shop.staff && shop.staff.length > 0 ? (
            <View>
              {shop.staff.map((item, index) => {
                // Skip invalid items
                if (!item || typeof item !== 'object') {
                  console.error('❌ Invalid staff item:', item);
                  return null;
                }
            
                // Ensure all fields are safe strings
                const safeName = String(item.name || 'Unnamed Staff');
                const safeRole = String(item.role || 'No Role');
                const safeEmail = String(item.email || 'No Email');
                const safeId = String(item.id || index);
                
                return (
                  <View key={safeId} style={styles.staffCard}>
                    <View style={styles.staffHeader}>
                      <View style={styles.staffAvatar}>
                        {item.avatar_url ? (
                          <Image 
                            source={{ uri: item.avatar_url }} 
                            style={styles.avatarImage}
                            onError={(error) => console.log('❌ Staff avatar failed to load:', error)}
                            onLoad={() => console.log('✅ Staff avatar loaded:', item.name)}
                          />
                        ) : (
                          <Ionicons name="person" size={24} color="#1A2533" />
                        )}
                      </View>
                      <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>{safeName}</Text>
                        <Text style={styles.staffRole}>{safeRole}</Text>
                        <Text style={styles.staffContact}>{safeEmail}</Text>
                      </View>
                      <View style={styles.staffActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openStaffModal(item)}
                        >
                          <Ionicons name="create-outline" size={18} color="#1A2533" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => deleteStaff(safeId)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Commented out complex rendering for now
                    {item.specialties && Array.isArray(item.specialties) && item.specialties.length > 0 && (
                      <View style={styles.specialties}>
                        <Text style={styles.specialtiesLabel}>Specialties:</Text>
                        <View style={styles.specialtyTags}>
                          {item.specialties.filter(s => s && typeof s === 'string').map((specialty, idx) => (
                            <View key={idx} style={styles.specialtyTag}>
                              <Text style={styles.specialtyText}>{String(specialty)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    {item.bio && typeof item.bio === 'string' && (
                      <Text style={styles.staffBio}>{item.bio}</Text>
                    )}
                    
                    <View style={styles.staffDetails}>
                      {item.experience_years && Number(item.experience_years) > 0 && (
                        <View style={styles.staffDetail}>
                          <Ionicons name="star-outline" size={16} color="#1A2533" />
                          <Text style={styles.staffDetailText}>{Number(item.experience_years)} years exp.</Text>
                        </View>
                      )}
                      <View style={styles.staffDetail}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }
                        ]} />
                        <Text style={styles.staffDetailText}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    */}
                    
                    {/* Simple status display */}
                    <View style={styles.staffDetails}>
                      <View style={styles.staffDetail}>
                        <Text style={styles.staffDetailText}>
                          Status: {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Staff Members Added</Text>
              <Text style={styles.emptyStateDescription}>
                Add staff members to assign them to services and manage your team
              </Text>
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error('❌ Error rendering staff section:', error);
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staff Members</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Error loading staff</Text>
            <Text style={styles.emptyStateDescription}>Please try refreshing the page</Text>
          </View>
        </View>
      );
    }
  };

  const renderDiscounts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Discounts & Offers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openDiscountModal()}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* First-Time User Discount Feature */}
      <View style={styles.firstTimeDiscountCard}>
        <View style={styles.firstTimeDiscountHeader}>
          <View style={styles.firstTimeDiscountIcon}>
            <Ionicons name="gift" size={24} color="#10B981" />
          </View>
          <View style={styles.firstTimeDiscountInfo}>
            <Text style={styles.firstTimeDiscountTitle}>First-Time Customer Discount</Text>
            <Text style={styles.firstTimeDiscountSubtitle}>
              Automatically offer 25% off to new customers
            </Text>
          </View>
          <Switch
            value={shop.first_time_discount_active ?? true}
            onValueChange={(value) => {
              if (!value) {
                Alert.alert(
                  'Disable First-Time Discount',
                  'Warning: Disabling the first-time customer discount may reduce customer attraction and growth. New customers are more likely to book services when offered an introductory discount.\n\nAre you sure you want to disable this promotional feature?',
                  [
                    { 
                      text: 'Keep Active', 
                      style: 'cancel',
                      onPress: () => {}
                    },
                    { 
                      text: 'Disable', 
                      style: 'destructive',
                      onPress: () => {
                        setShop(prev => ({ ...prev, first_time_discount_active: false }));
                      }
                    }
                  ],
                  { cancelable: true }
                );
              } else {
                setShop(prev => ({ ...prev, first_time_discount_active: true }));
              }
            }}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={shop.first_time_discount_active ?? true ? '#10B981' : '#9CA3AF'}
          />
        </View>
        <View style={styles.firstTimeDiscountBenefits}>
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={16} color="#10B981" />
            <Text style={styles.benefitText}>Increase customer acquisition</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="star" size={16} color="#10B981" />
            <Text style={styles.benefitText}>Build customer loyalty</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="megaphone" size={16} color="#10B981" />
            <Text style={styles.benefitText}>Free app promotion</Text>
          </View>
        </View>
      </View>

      {isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1A2533" />
          <Text style={styles.loadingText}>Loading discounts...</Text>
        </View>
      ) : shop.discounts && shop.discounts.length > 0 ? (
        <FlatList
          data={shop.discounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.discountCard}>
              <View style={styles.discountHeader}>
                <View style={styles.discountIcon}>
                  <Ionicons 
                    name={DISCOUNT_TYPES.find(t => t.id === item.type)?.icon as any || 'pricetag'} 
                    size={20} 
                    color="#1A2533" 
                  />
                </View>
                <View style={styles.discountInfo}>
                  <Text style={styles.discountTitle}>{item.description}</Text>
                  <Text style={styles.discountType}>
                    {DISCOUNT_TYPES.find(t => t.id === item.type)?.name}
                  </Text>
                </View>
                <View style={styles.discountActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openDiscountModal(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#1A2533" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteDiscount(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.discountDetails}>
                <View style={styles.discountDetail}>
                  <Text style={styles.discountValue}>
                    {item.type === 'percentage' ? `${item.value}%` : `$${item.value}`}
                  </Text>
                  <Text style={styles.discountLabel}>Discount</Text>
                </View>
                <View style={styles.discountDetail}>
                  <Text style={styles.discountValue}>{item.used_count}</Text>
                  <Text style={styles.discountLabel}>Used</Text>
                </View>
                <View style={styles.discountDetail}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }
                  ]} />
                  <Text style={styles.discountLabel}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.discountPeriod}>
                <Text style={styles.discountPeriodText}>
                  Valid: {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pricetag-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Discounts Created</Text>
          <Text style={styles.emptyStateDescription}>
            Create attractive discounts to boost customer engagement
          </Text>
        </View>
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      {/* Booking Settings */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Booking Settings</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Advance Booking Days</Text>
          <TextInput
            style={styles.input}
            value={shop.advance_booking_days.toString()}
            onChangeText={(text) => setShop(prev => ({ 
              ...prev, 
              advance_booking_days: parseInt(text) || 30 
            }))}
            placeholder="30"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
          <Text style={styles.inputHint}>How many days in advance customers can book</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Slot Duration (min)</Text>
            <TextInput
              style={styles.input}
              value={shop.slot_duration.toString()}
              onChangeText={(text) => setShop(prev => ({ 
                ...prev, 
                slot_duration: parseInt(text) || 60 
              }))}
              placeholder="60"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>Buffer Time (min)</Text>
            <TextInput
              style={styles.input}
              value={shop.buffer_time.toString()}
              onChangeText={(text) => setShop(prev => ({ 
                ...prev, 
                buffer_time: parseInt(text) || 15 
              }))}
              placeholder="15"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Shop Status */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Shop Status</Text>
        
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Auto-approve Bookings</Text>
            <Text style={styles.switchDescription}>
              Automatically approve booking requests
            </Text>
          </View>
          <Switch
            value={shop.auto_approval}
            onValueChange={(value) => setShop(prev => ({ ...prev, auto_approval: value }))}
            trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
            thumbColor={shop.auto_approval ? '#1A2533' : '#9CA3AF'}
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Shop Active</Text>
            <Text style={styles.switchDescription}>
              Enable to make your shop visible to customers
            </Text>
          </View>
          <Switch
            value={shop.is_active}
            onValueChange={(value) => setShop(prev => ({ ...prev, is_active: value }))}
            trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
            thumbColor={shop.is_active ? '#1A2533' : '#9CA3AF'}
          />
        </View>
      </View>
    </View>
  );

  // Modal components (keeping existing modals and adding new ones)
  const renderSpecialDayModal = () => (
    <Modal
      visible={showSpecialDayModal}
      animationType="slide"
      onRequestClose={() => setShowSpecialDayModal(false)}
    >
      <SafeAreaView style={styles.fullScreenModalContainer}>
        <View style={styles.fullScreenModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSpecialDay ? 'Edit Special Day' : 'Add Special Day'}
              </Text>
              <TouchableOpacity onPress={() => setShowSpecialDayModal(false)}>
                <Ionicons name="close" size={24} color="#1A2533" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={specialDayForm.name}
                  onChangeText={(text) => setSpecialDayForm(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Christmas Day, Extended Hours"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.selectInputText}>
                    {specialDayForm.date ? formatSpecialDayDate(specialDayForm.date) : 'Select Date'}
                  </Text>
                </TouchableOpacity>
                
                {/* Inline Date Picker */}
                {showDatePicker && (
                  <View style={styles.inlinePicker}>
                    {Platform.OS === 'ios' ? (
                      <DateTimePicker
                        value={specialDayForm.date ? new Date(specialDayForm.date) : new Date()}
                        mode="date"
                        display="compact"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const dateString = selectedDate.toISOString().split('T')[0];
                            setSpecialDayForm(prev => ({ ...prev, date: dateString }));
                          }
                          setShowDatePicker(false);
                        }}
                        style={styles.inlineDatePicker}
                      />
                    ) : Platform.OS === 'android' ? (
                      <DateTimePicker
                        value={specialDayForm.date ? new Date(specialDayForm.date) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const dateString = selectedDate.toISOString().split('T')[0];
                            setSpecialDayForm(prev => ({ ...prev, date: dateString }));
                          }
                          setShowDatePicker(false);
                        }}
                      />
                    ) : (
                      <View style={styles.webInlinePicker}>
                        <input
                          type="date"
                          value={specialDayForm.date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            setSpecialDayForm(prev => ({ ...prev, date: e.target.value }));
                            setShowDatePicker(false);
                          }}
                          style={styles.webDateInput}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.specialDayTypeGrid}>
                  {SPECIAL_DAY_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.specialDayTypeOption,
                        specialDayForm.type === type.id && styles.selectedSpecialDayType
                      ]}
                      onPress={() => setSpecialDayForm(prev => ({ ...prev, type: type.id as any }))}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={20} 
                        color={specialDayForm.type === type.id ? type.color : '#6B7280'} 
                      />
                      <Text style={[
                        styles.specialDayTypeName,
                        specialDayForm.type === type.id && { color: type.color }
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Open on this day</Text>
                  <Text style={styles.switchDescription}>
                    Enable if the shop will be open
                  </Text>
                </View>
                <Switch
                  value={specialDayForm.isOpen}
                  onValueChange={(value) => setSpecialDayForm(prev => ({ ...prev, isOpen: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
                  thumbColor={specialDayForm.isOpen ? '#1A2533' : '#9CA3AF'}
                />
              </View>

              {specialDayForm.isOpen && (
                <View style={styles.timePickerSection}>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Opening Time</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          setSpecialDayTimeType('open');
                          setShowSpecialDayTimePicker(true);
                        }}
                      >
                        <Ionicons name="time-outline" size={20} color="#10B981" style={styles.timePickerIcon} />
                        <Text style={specialDayForm.openTime ? styles.timePickerText : styles.timePickerPlaceholder}>
                          {specialDayForm.openTime ? formatTimeDisplay(specialDayForm.openTime) : 'Select Time'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                      
                      {/* Inline Opening Time Picker */}
                      {showSpecialDayTimePicker && specialDayTimeType === 'open' && (
                        <View style={styles.inlineTimePickerContainer}>
                          {Platform.OS === 'ios' ? (
                            <DateTimePicker
                              value={specialDayForm.openTime ? new Date(`1970-01-01T${specialDayForm.openTime}:00`) : new Date(`1970-01-01T09:00:00`)}
                              mode="time"
                              display="compact"
                              onChange={(event, selectedTime) => {
                                if (selectedTime) {
                                  const timeString = selectedTime.toTimeString().slice(0, 5);
                                  setSpecialDayForm(prev => ({ ...prev, openTime: timeString }));
                                }
                                setShowSpecialDayTimePicker(false);
                                setSpecialDayTimeType(null);
                              }}
                              style={styles.inlineTimePickerStyle}
                            />
                          ) : Platform.OS === 'android' ? (
                            <DateTimePicker
                              value={specialDayForm.openTime ? new Date(`1970-01-01T${specialDayForm.openTime}:00`) : new Date(`1970-01-01T09:00:00`)}
                              mode="time"
                              display="default"
                              onChange={(event, selectedTime) => {
                                if (selectedTime) {
                                  const timeString = selectedTime.toTimeString().slice(0, 5);
                                  setSpecialDayForm(prev => ({ ...prev, openTime: timeString }));
                                }
                                setShowSpecialDayTimePicker(false);
                                setSpecialDayTimeType(null);
                              }}
                            />
                          ) : (
                            <View style={styles.webInlineTimePicker}>
                              <input
                                type="time"
                                value={specialDayForm.openTime || '09:00'}
                                onChange={(e) => {
                                  setSpecialDayForm(prev => ({ ...prev, openTime: e.target.value }));
                                  setShowSpecialDayTimePicker(false);
                                  setSpecialDayTimeType(null);
                                }}
                                style={styles.webTimeInput}
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Closing Time</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          setSpecialDayTimeType('close');
                          setShowSpecialDayTimePicker(true);
                        }}
                      >
                        <Ionicons name="time-outline" size={20} color="#EF4444" style={styles.timePickerIcon} />
                        <Text style={specialDayForm.closeTime ? styles.timePickerText : styles.timePickerPlaceholder}>
                          {specialDayForm.closeTime ? formatTimeDisplay(specialDayForm.closeTime) : 'Select Time'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                      
                      {/* Inline Closing Time Picker */}
                      {showSpecialDayTimePicker && specialDayTimeType === 'close' && (
                        <View style={styles.inlineTimePickerContainer}>
                          {Platform.OS === 'ios' ? (
                            <DateTimePicker
                              value={specialDayForm.closeTime ? new Date(`1970-01-01T${specialDayForm.closeTime}:00`) : new Date(`1970-01-01T17:00:00`)}
                              mode="time"
                              display="compact"
                              onChange={(event, selectedTime) => {
                                if (selectedTime) {
                                  const timeString = selectedTime.toTimeString().slice(0, 5);
                                  setSpecialDayForm(prev => ({ ...prev, closeTime: timeString }));
                                }
                                setShowSpecialDayTimePicker(false);
                                setSpecialDayTimeType(null);
                              }}
                              style={styles.inlineTimePickerStyle}
                            />
                          ) : Platform.OS === 'android' ? (
                            <DateTimePicker
                              value={specialDayForm.closeTime ? new Date(`1970-01-01T${specialDayForm.closeTime}:00`) : new Date(`1970-01-01T17:00:00`)}
                              mode="time"
                              display="default"
                              onChange={(event, selectedTime) => {
                                if (selectedTime) {
                                  const timeString = selectedTime.toTimeString().slice(0, 5);
                                  setSpecialDayForm(prev => ({ ...prev, closeTime: timeString }));
                                }
                                setShowSpecialDayTimePicker(false);
                                setSpecialDayTimeType(null);
                              }}
                            />
                          ) : (
                            <View style={styles.webInlineTimePicker}>
                              <input
                                type="time"
                                value={specialDayForm.closeTime || '17:00'}
                                onChange={(e) => {
                                  setSpecialDayForm(prev => ({ ...prev, closeTime: e.target.value }));
                                  setShowSpecialDayTimePicker(false);
                                  setSpecialDayTimeType(null);
                                }}
                                style={styles.webTimeInput}
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.specialDaySection}>
                <Text style={styles.specialDaySectionTitle}>Recurrence</Text>
                <View style={styles.recurringOptionsContainer}>
                  {RECURRING_OPTIONS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.recurringOptionCard,
                        specialDayForm.recurring === item.id && styles.selectedRecurringCard
                      ]}
                      onPress={() => setSpecialDayForm(prev => ({ ...prev, recurring: item.id as any }))}
                    >
                      <View style={[
                        styles.recurringIconContainer,
                        specialDayForm.recurring === item.id && styles.selectedRecurringIcon
                      ]}>
                        <Ionicons 
                          name={item.id === 'once' ? 'calendar-outline' : 
                               item.id === 'weekly' ? 'repeat-outline' :
                               item.id === 'monthly' ? 'calendar-clear-outline' : 'infinite-outline'} 
                          size={20} 
                          color={specialDayForm.recurring === item.id ? '#1A2533' : '#6B7280'} 
                        />
                      </View>
                      <Text style={[
                        styles.recurringOptionTitle,
                        specialDayForm.recurring === item.id && styles.selectedRecurringTitle
                      ]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.specialDaySection}>
                <Text style={styles.specialDaySectionTitle}>Additional Details</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description (Optional)</Text>
                  <View style={styles.textAreaContainer}>
                    <Ionicons name="document-text-outline" size={20} color="#9CA3AF" style={styles.textAreaIcon} />
                    <TextInput
                      style={styles.textAreaWithIcon}
                      value={specialDayForm.description}
                      onChangeText={(text) => setSpecialDayForm(prev => ({ ...prev, description: text }))}
                      placeholder="Additional notes or details about this special day"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.specialDayModalActions}>
              <TouchableOpacity
                style={styles.specialDayCancelButton}
                onPress={() => setShowSpecialDayModal(false)}
              >
                <Text style={styles.specialDayCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.specialDaySaveButton,
                  (!specialDayForm.name || !specialDayForm.date) && styles.disabledSaveButton
                ]}
                onPress={saveSpecialDay}
                disabled={!specialDayForm.name || !specialDayForm.date}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" style={styles.saveButtonIcon} />
                <Text style={styles.specialDaySaveText}>
                  {editingSpecialDay ? 'Update Special Day' : 'Add Special Day'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
  );

  // Keep existing modals but add new ones
  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#1A2533" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={SERVICE_CATEGORIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  shop.category === item && styles.selectedCategoryOption
                ]}
                onPress={() => {
                  setShop(prev => ({ ...prev, category: item }));
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.categoryOptionText,
                  shop.category === item && styles.selectedCategoryOptionText
                ]}>
                  {item}
                </Text>
                {shop.category === item && (
                  <Ionicons name="checkmark" size={20} color="#1A2533" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderTimezoneModal = () => (
    <Modal
      visible={showTimezoneModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTimezoneModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Timezone</Text>
            <TouchableOpacity onPress={() => setShowTimezoneModal(false)}>
              <Ionicons name="close" size={24} color="#1A2533" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={TIMEZONES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  shop.timezone === item && styles.selectedCategoryOption
                ]}
                onPress={() => {
                  setShop(prev => ({ ...prev, timezone: item }));
                  setShowTimezoneModal(false);
                }}
              >
                <Text style={[
                  styles.categoryOptionText,
                  shop.timezone === item && styles.selectedCategoryOptionText
                ]}>
                  {item}
                </Text>
                {shop.timezone === item && (
                  <Ionicons name="checkmark" size={20} color="#1A2533" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderServiceModal = () => (
    <Modal
      visible={showServiceModal}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={() => setShowServiceModal(false)}
    >
      <SafeAreaView style={styles.fullScreenModal}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.fullScreenKeyboardView}
        >
          <View style={styles.fullScreenContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'Add Service'}
              </Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color="#1A2533" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
                  {/* Service Form View */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={styles.input}
                  value={serviceForm.name}
                  onChangeText={(text) => setServiceForm(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Haircut, Massage, Repair"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={serviceForm.description}
                  onChangeText={(text) => setServiceForm(prev => ({ ...prev, description: text }))}
                  placeholder="Describe what this service includes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    value={serviceForm.price?.toString()}
                    onChangeText={(text) => setServiceForm(prev => ({ 
                      ...prev, 
                      price: parseFloat(text) || 0 
                    }))}
                    placeholder="25.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>Duration (min)</Text>
                  <TextInput
                    style={styles.input}
                    value={serviceForm.duration?.toString()}
                    onChangeText={(text) => setServiceForm(prev => ({ 
                      ...prev, 
                      duration: parseInt(text) || 60 
                    }))}
                    placeholder="60"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={serviceForm.category}
                  onChangeText={(text) => setServiceForm(prev => ({ ...prev, category: text }))}
                  placeholder="Service category"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Location</Text>
                <View style={styles.locationTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.locationTypeOption,
                      serviceForm.location_type === 'in_house' && styles.selectedLocationOption
                    ]}
                    onPress={() => setServiceForm(prev => ({ ...prev, location_type: 'in_house' }))}
                  >
                    <Ionicons 
                      name="storefront-outline" 
                      size={20} 
                      color={serviceForm.location_type === 'in_house' ? '#10B981' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.locationTypeText,
                      serviceForm.location_type === 'in_house' && styles.selectedLocationText
                    ]}>
                      In-House
                    </Text>
                    <Text style={styles.locationTypeDescription}>
                      Client comes to shop
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.locationTypeOption,
                      serviceForm.location_type === 'on_location' && styles.selectedLocationOption
                    ]}
                    onPress={() => setServiceForm(prev => ({ ...prev, location_type: 'on_location' }))}
                  >
                    <Ionicons 
                      name="car-outline" 
                      size={20} 
                      color={serviceForm.location_type === 'on_location' ? '#10B981' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.locationTypeText,
                      serviceForm.location_type === 'on_location' && styles.selectedLocationText
                    ]}>
                      On-Location
                    </Text>
                    <Text style={styles.locationTypeDescription}>
                      You go to client
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign Staff</Text>
                <View style={styles.staffSelection}>
                  {shop.staff && shop.staff.length > 0 ? (
                    shop.staff.map((staff) => (
                      <TouchableOpacity
                        key={staff.id}
                        style={[
                          styles.staffOption,
                          serviceForm.assigned_staff?.includes(staff.id) && styles.selectedStaffOption
                        ]}
                        onPress={() => {
                          const assignedStaff = serviceForm.assigned_staff || [];
                          if (assignedStaff.includes(staff.id)) {
                            setServiceForm(prev => ({
                              ...prev,
                              assigned_staff: assignedStaff.filter(id => id !== staff.id)
                            }));
                          } else {
                            setServiceForm(prev => ({
                              ...prev,
                              assigned_staff: [...assignedStaff, staff.id]
                            }));
                          }
                        }}
                      >
                        <View style={styles.staffOptionContent}>
                          <Text style={[
                            styles.staffOptionName,
                            serviceForm.assigned_staff?.includes(staff.id) && styles.selectedStaffOptionText
                          ]}>
                            {staff.name}
                          </Text>
                          <Text style={styles.staffOptionRole}>{staff.role}</Text>
                        </View>
                        {serviceForm.assigned_staff?.includes(staff.id) && (
                          <Ionicons name="checkmark-circle" size={20} color="#1A2533" />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noStaffText}>No staff members available. Add staff first in the Staff tab.</Text>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.optionsHeaderContainer}>
                  <View style={styles.optionsTitleSection}>
                    <Text style={styles.label}>Service Options</Text>
                    <Text style={styles.optionsDescription}>
                      Add variations of this service with different prices and durations
                    </Text>
                  </View>
                    <TouchableOpacity
                      style={styles.addOptionButton}
                      onPress={addServiceOption}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#1A2533" />
                      <Text style={styles.addOptionText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {serviceOptions.length === 0 ? (
                    <View style={styles.noOptionsContainer}>
                      <Ionicons name="list-outline" size={40} color="#D1D5DB" />
                      <Text style={styles.noOptionsText}>No service options added yet</Text>
                      <Text style={styles.noOptionsSubtext}>
                        Tap "Add Option" to create variations like "Basic", "Premium", etc.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.serviceOptionsList}>
                      {serviceOptions.map((option, index) => (
                        <View key={option.id} style={styles.serviceOptionItem}>
                          <View style={styles.optionHeader}>
                            <Text style={styles.optionNumber}>Option {index + 1}</Text>
                            <TouchableOpacity
                              style={styles.removeOptionButton}
                              onPress={() => removeServiceOption(option.id)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.optionInputRow}>
                            <View style={styles.optionNameContainer}>
                              <Text style={styles.optionLabel}>Option Name *</Text>
                              <TextInput
                                style={styles.optionInput}
                                value={option.option_name}
                                onChangeText={(text) => updateServiceOption(option.id, 'option_name', text)}
                                placeholder="e.g., Basic Package, Premium Service"
                                placeholderTextColor="#9CA3AF"
                              />
                            </View>
                          </View>

                          <View style={styles.optionInputRow}>
                            <View style={styles.optionNameContainer}>
                              <Text style={styles.optionLabel}>Description (Optional)</Text>
                              <TextInput
                                style={[styles.optionInput, styles.optionTextArea]}
                                value={option.option_description}
                                onChangeText={(text) => updateServiceOption(option.id, 'option_description', text)}
                                placeholder="Describe what's included in this option"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={2}
                                textAlignVertical="top"
                              />
                            </View>
                          </View>

                          <View style={styles.optionInputRow}>
                            <View style={styles.optionFieldContainer}>
                              <Text style={styles.optionLabel}>Price ($)</Text>
                              <TextInput
                                style={styles.optionInput}
                                value={option.price.toString()}
                                onChangeText={(text) => updateServiceOption(option.id, 'price', parseFloat(text) || 0)}
                                placeholder={(serviceForm.price || 0).toString()}
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                              />
                            </View>
                            <View style={styles.optionFieldContainer}>
                              <Text style={styles.optionLabel}>Duration (min)</Text>
                              <TextInput
                                style={styles.optionInput}
                                value={option.duration.toString()}
                                onChangeText={(text) => updateServiceOption(option.id, 'duration', parseInt(text) || 0)}
                                placeholder={(serviceForm.duration || 60).toString()}
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                              />
                            </View>
                          </View>

                          <View style={styles.optionStatusRow}>
                            <View>
                              <Text style={styles.optionLabel}>Active Option</Text>
                              <Text style={styles.optionStatusDescription}>
                                Enable to make this option bookable
                              </Text>
                            </View>
                            <Switch
                              value={option.is_active}
                              onValueChange={(value) => updateServiceOption(option.id, 'is_active', value)}
                              trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
                              thumbColor={option.is_active ? '#1A2533' : '#9CA3AF'}
                            />
                          </View>

                          <View style={styles.optionPreview}>
                            <Text style={styles.previewLabel}>Preview:</Text>
                            <Text style={styles.previewText}>
                              {option.option_name || 'Option Name'} - ${option.price} ({option.duration} min)
                              {!option.is_active && (
                                <Text style={styles.inactiveText}> • Inactive</Text>
                              )}
                            </Text>
                            {option.option_description && (
                              <Text style={styles.previewDescription}>
                                {option.option_description}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Active Service</Text>
                  <Text style={styles.switchDescription}>
                    Enable to make this service bookable
                  </Text>
                </View>
                <Switch
                  value={serviceForm.is_active}
                  onValueChange={(value) => setServiceForm(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
                  thumbColor={serviceForm.is_active ? '#1A2533' : '#9CA3AF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={saveService}
              >
                <Text style={styles.saveModalButtonText}>
                  {editingService ? 'Update' : 'Add'} Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  const renderDiscountModal = () => (
    <Modal
      visible={showDiscountModal}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={() => setShowDiscountModal(false)}
    >
      <SafeAreaView style={styles.fullScreenModal}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.fullScreenKeyboardView}
        >
          <View style={styles.fullScreenContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDiscount ? 'Edit Discount' : 'Add Discount'}
              </Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <Ionicons name="close" size={24} color="#1A2533" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Discount Description *</Text>
                <TextInput
                  style={styles.input}
                  value={discountForm.description}
                  onChangeText={(text) => setDiscountForm(prev => ({ ...prev, description: text }))}
                  placeholder="e.g., 20% off all services, Buy 2 Get 1 Free"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Discount Type</Text>
                <View style={styles.discountTypeGrid}>
                  {DISCOUNT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.discountTypeOption,
                        discountForm.type === type.id && styles.selectedDiscountType
                      ]}
                      onPress={() => setDiscountForm(prev => ({ ...prev, type: type.id as any }))}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={20} 
                        color={discountForm.type === type.id ? '#1A2533' : '#6B7280'} 
                      />
                      <Text style={[
                        styles.discountTypeName,
                        discountForm.type === type.id && styles.selectedDiscountTypeName
                      ]}>
                        {type.name}
                      </Text>
                      <Text style={styles.discountTypeDesc}>{type.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Value *</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.value?.toString()}
                    onChangeText={(text) => setDiscountForm(prev => ({ 
                      ...prev, 
                      value: parseFloat(text) || 0 
                    }))}
                    placeholder={discountForm.type === 'percentage' ? '20' : '10.00'}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>Usage Limit</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.usage_limit?.toString()}
                    onChangeText={(text) => setDiscountForm(prev => ({ 
                      ...prev, 
                      usage_limit: parseInt(text) || undefined 
                    }))}
                    placeholder="Unlimited"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Start Date</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.start_date}
                    onChangeText={(text) => setDiscountForm(prev => ({ ...prev, start_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>End Date</Text>
                  <TextInput
                    style={styles.input}
                    value={discountForm.end_date}
                    onChangeText={(text) => setDiscountForm(prev => ({ ...prev, end_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Active Discount</Text>
                  <Text style={styles.switchDescription}>
                    Enable to make this discount available
                  </Text>
                </View>
                <Switch
                  value={discountForm.is_active}
                  onValueChange={(value) => setDiscountForm(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
                  thumbColor={discountForm.is_active ? '#1A2533' : '#9CA3AF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDiscountModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={saveDiscount}
              >
                <Text style={styles.saveModalButtonText}>
                  {editingDiscount ? 'Update' : 'Add'} Discount
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  const renderStaffModal = () => (
    <Modal
      visible={showStaffModal}
      animationType="slide"
      onRequestClose={closeStaffModal}
    >
      <SafeAreaView style={styles.fullScreenModalContainer}>
        <View style={styles.fullScreenModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </Text>
              <TouchableOpacity onPress={closeStaffModal}>
                <Ionicons name="close" size={24} color="#1A2533" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Profile Photo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Profile Photo</Text>
                <View style={styles.avatarUploadSection}>
                  <TouchableOpacity 
                    style={styles.avatarUpload}
                    onPress={pickStaffAvatar}
                  >
                    {(() => {
                      const avatarUrl = getSafeAvatarUrl(staffForm.avatar_url);
                      console.log('🖼️ Rendering avatar (refresh:', avatarRefresh, '), staffForm.avatar_url:', staffForm.avatar_url);
                      console.log('🖼️ Safe avatar URL:', avatarUrl);
                      return avatarUrl ? (
                        <Image 
                          key={`${avatarUrl}-${avatarRefresh}`} // Force re-render when URI or refresh changes
                          source={{ uri: appendTimestamp(avatarUrl, avatarRefresh) }} 
                          style={styles.avatarPreview}
                          onLoad={() => console.log('✅ Avatar image loaded successfully')}
                          onError={(error) => console.error('❌ Avatar image failed to load:', error)}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                          <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                        </View>
                      );
                    })()}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.name}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.email}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, email: text }))}
                  placeholder="staff@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.phone}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, phone: text }))}
                  placeholder="+46 XX XXX XX XX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role/Position</Text>
                <TextInput
                  style={styles.input}
                  value={staffForm.role}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, role: text }))}
                  placeholder="e.g., Manager, Stylist, Specialist, Therapist"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputHint}>Enter the job title or role for this staff member</Text>
                
                {/* Role suggestions */}
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionLabel}>Quick suggestions:</Text>
                  <View style={styles.suggestionTags}>
                    {ROLE_SUGGESTIONS.map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={styles.suggestionTag}
                        onPress={() => setStaffForm(prev => ({ ...prev, role }))}
                      >
                        <Text style={styles.suggestionTagText}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Specialties</Text>
                
                {/* Add new specialty */}
                <View style={styles.addSpecialtyRow}>
                  <TextInput
                    style={[styles.input, styles.specialtyInput]}
                    value={newSpecialty}
                    onChangeText={setNewSpecialty}
                    placeholder="Enter specialty (e.g., Hair Cutting, Massage Therapy)"
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={addSpecialty}
                  />
                  <TouchableOpacity
                    style={styles.addSpecialtyButton}
                    onPress={addSpecialty}
                    disabled={!newSpecialty.trim()}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                {/* Current specialties */}
                {staffForm.specialties && staffForm.specialties.length > 0 && (
                  <View style={styles.currentSpecialties}>
                    <Text style={styles.currentSpecialtiesLabel}>Current Specialties:</Text>
                    <View style={styles.specialtyTags}>
                      {(staffForm.specialties || []).filter(specialty => specialty && specialty.trim()).map((specialty, index) => (
                        <View key={index} style={styles.specialtyTagWithRemove}>
                          <Text style={styles.specialtyText}>{specialty}</Text>
                          <TouchableOpacity
                            style={styles.removeSpecialtyButton}
                            onPress={() => removeSpecialty(specialty)}
                          >
                            <Ionicons name="close" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {/* Specialty suggestions */}
                <View style={styles.suggestionSection}>
                  <Text style={styles.suggestionLabel}>Common specialties:</Text>
                  <View style={styles.suggestionTags}>
                    {SPECIALTY_SUGGESTIONS.filter(s => !(staffForm.specialties || []).includes(s)).map((specialty) => (
                      <TouchableOpacity
                        key={specialty}
                        style={styles.suggestionTag}
                        onPress={() => addSuggestedSpecialty(specialty)}
                      >
                        <Text style={styles.suggestionTagText}>{specialty}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Experience (years)</Text>
                  <TextInput
                    style={styles.input}
                    value={staffForm.experience_years ? staffForm.experience_years.toString() : ''}
                    onChangeText={(text) => setStaffForm(prev => ({ 
                      ...prev, 
                      experience_years: parseInt(text) || 0 
                    }))}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={staffForm.bio}
                  onChangeText={(text) => setStaffForm(prev => ({ ...prev, bio: text }))}
                  placeholder="Brief description about this staff member"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Work Schedule Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Work Schedule</Text>
                <Text style={styles.inputHint}>Set the staff member's regular working hours</Text>
                
                <View style={styles.workScheduleContainer}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const dayKey = day.toLowerCase();
                    const daySchedule = staffForm.work_schedule?.[dayKey] || { 
                      isWorking: false, 
                      startTime: '09:00', 
                      endTime: '17:00' 
                    };
                    
                    // Debug logging for first day only to avoid spam
                    if (day === 'Monday') {
                      console.log('🗓️ Rendering work schedule for Monday:', {
                        staffFormExists: !!staffForm,
                        workScheduleExists: !!staffForm.work_schedule,
                        workScheduleValue: staffForm.work_schedule,
                        mondaySchedule: daySchedule
                      });
                    }
                    
                    return (
                      <View key={day} style={styles.dayScheduleRow}>
                        <View style={styles.dayScheduleHeader}>
                          <Text style={styles.dayScheduleName}>{day}</Text>
                          <Switch
                            value={daySchedule.isWorking}
                            onValueChange={(value) => {
                              setStaffForm(prev => ({
                                ...prev,
                                work_schedule: {
                                  ...prev.work_schedule,
                                  [day.toLowerCase()]: {
                                    ...daySchedule,
                                    isWorking: value
                                  }
                                }
                              }));
                            }}
                            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                            thumbColor={daySchedule.isWorking ? '#10B981' : '#9CA3AF'}
                            style={styles.daySwitch}
                          />
                        </View>
                        
                        {daySchedule.isWorking && (
                          <View style={styles.dayTimeRow}>
                            <TouchableOpacity
                              style={styles.timeSlotButton}
                              onPress={() => {
                                setSelectedStaffTimeField(`${day.toLowerCase()}_start`);
                              }}
                            >
                              <Ionicons name="time-outline" size={16} color="#10B981" />
                              <Text style={styles.timeSlotText}>
                                {formatTimeDisplay(daySchedule.startTime)}
                              </Text>
                            </TouchableOpacity>
                            
                            {/* Inline Start Time Picker */}
                            {selectedStaffTimeField === `${day.toLowerCase()}_start` && (
                              <View style={styles.inlineStaffTimePicker}>
                                {Platform.OS === 'ios' ? (
                                  <DateTimePicker
                                    value={new Date(`1970-01-01T${daySchedule.startTime}:00`)}
                                    mode="time"
                                    display="compact"
                                    onChange={(event, selectedTime) => {
                                      if (selectedTime) {
                                        const timeString = selectedTime.toTimeString().slice(0, 5);
                                        setStaffForm(prev => ({
                                          ...prev,
                                          work_schedule: {
                                            ...prev.work_schedule,
                                            [day.toLowerCase()]: {
                                              ...prev.work_schedule?.[day.toLowerCase()],
                                              startTime: timeString
                                            }
                                          }
                                        }));
                                      }
                                      setSelectedStaffTimeField(null);
                                    }}
                                    style={styles.compactTimePicker}
                                  />
                                ) : Platform.OS === 'android' ? (
                                  <DateTimePicker
                                    value={new Date(`1970-01-01T${daySchedule.startTime}:00`)}
                                    mode="time"
                                    display="default"
                                    onChange={(event, selectedTime) => {
                                      if (selectedTime) {
                                        const timeString = selectedTime.toTimeString().slice(0, 5);
                                        setStaffForm(prev => ({
                                          ...prev,
                                          work_schedule: {
                                            ...prev.work_schedule,
                                            [day.toLowerCase()]: {
                                              ...prev.work_schedule?.[day.toLowerCase()],
                                              startTime: timeString
                                            }
                                          }
                                        }));
                                      }
                                      setSelectedStaffTimeField(null);
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="time"
                                    value={daySchedule.startTime}
                                    onChange={(e) => {
                                      setStaffForm(prev => ({
                                        ...prev,
                                        work_schedule: {
                                          ...prev.work_schedule,
                                          [day.toLowerCase()]: {
                                            ...prev.work_schedule?.[day.toLowerCase()],
                                            startTime: e.target.value
                                          }
                                        }
                                      }));
                                      setSelectedStaffTimeField(null);
                                    }}
                                    style={styles.webTimeInput}
                                  />
                                )}
                              </View>
                            )}
                            
                            <Text style={styles.timeToText}>to</Text>
                            
                            <TouchableOpacity
                              style={styles.timeSlotButton}
                              onPress={() => {
                                setSelectedStaffTimeField(`${day.toLowerCase()}_end`);
                              }}
                            >
                              <Ionicons name="time-outline" size={16} color="#EF4444" />
                              <Text style={styles.timeSlotText}>
                                {formatTimeDisplay(daySchedule.endTime)}
                              </Text>
                            </TouchableOpacity>
                            
                            {/* Inline End Time Picker */}
                            {selectedStaffTimeField === `${day.toLowerCase()}_end` && (
                              <View style={styles.inlineStaffTimePicker}>
                                {Platform.OS === 'ios' ? (
                                  <DateTimePicker
                                    value={new Date(`1970-01-01T${daySchedule.endTime}:00`)}
                                    mode="time"
                                    display="compact"
                                    onChange={(event, selectedTime) => {
                                      if (selectedTime) {
                                        const timeString = selectedTime.toTimeString().slice(0, 5);
                                        setStaffForm(prev => ({
                                          ...prev,
                                          work_schedule: {
                                            ...prev.work_schedule,
                                            [day.toLowerCase()]: {
                                              ...prev.work_schedule?.[day.toLowerCase()],
                                              endTime: timeString
                                            }
                                          }
                                        }));
                                      }
                                      setSelectedStaffTimeField(null);
                                    }}
                                    style={styles.compactTimePicker}
                                  />
                                ) : Platform.OS === 'android' ? (
                                  <DateTimePicker
                                    value={new Date(`1970-01-01T${daySchedule.endTime}:00`)}
                                    mode="time"
                                    display="default"
                                    onChange={(event, selectedTime) => {
                                      if (selectedTime) {
                                        const timeString = selectedTime.toTimeString().slice(0, 5);
                                        setStaffForm(prev => ({
                                          ...prev,
                                          work_schedule: {
                                            ...prev.work_schedule,
                                            [day.toLowerCase()]: {
                                              ...prev.work_schedule?.[day.toLowerCase()],
                                              endTime: timeString
                                            }
                                          }
                                        }));
                                      }
                                      setSelectedStaffTimeField(null);
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="time"
                                    value={daySchedule.endTime}
                                    onChange={(e) => {
                                      setStaffForm(prev => ({
                                        ...prev,
                                        work_schedule: {
                                          ...prev.work_schedule,
                                          [day.toLowerCase()]: {
                                            ...prev.work_schedule?.[day.toLowerCase()],
                                            endTime: e.target.value
                                          }
                                        }
                                      }));
                                      setSelectedStaffTimeField(null);
                                    }}
                                    style={styles.webTimeInput}
                                  />
                                )}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Leave & Special Days - Always Expanded */}
              <View style={styles.inputGroup}>
                <View style={styles.leaveHeaderFixed}>
                  <Ionicons name="calendar-outline" size={20} color="#1A2533" />
                  <View style={styles.leaveHeaderTextContainer}>
                    <Text style={styles.label}>Leave & Special Days</Text>
                    <Text style={styles.inputHint}>Tap dates to select leave periods (drag between dates for ranges)</Text>
                  </View>
                </View>

                {/* Inline Calendar */}
                <View style={styles.inlineLeaveCalendar}>
                  {(() => {
                    const currentMonth = new Date();
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    
                    // Generate calendar days for current month
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const startDate = new Date(firstDay);
                    startDate.setDate(startDate.getDate() - firstDay.getDay());
                    
                    const calendar = [];
                    const currentDate = new Date(startDate);
                    
                    for (let week = 0; week < 6; week++) {
                      const weekDays = [];
                      for (let day = 0; day < 7; day++) {
                        weekDays.push(new Date(currentDate));
                        currentDate.setDate(currentDate.getDate() + 1);
                      }
                      calendar.push(weekDays);
                      if (currentDate.getMonth() !== month && weekDays[6].getMonth() !== month) {
                        break;
                      }
                    }

                    const handleDayPress = (date: Date) => {
                      const dateString = date.toISOString().split('T')[0];
                      
                      if (!selectedLeaveStartDate) {
                        setSelectedLeaveStartDate(dateString);
                        setSelectedLeaveEndDate(null);
                      } else if (!selectedLeaveEndDate) {
                        const startDate = new Date(selectedLeaveStartDate);
                        if (date >= startDate) {
                          setSelectedLeaveEndDate(dateString);
                        } else {
                          setSelectedLeaveStartDate(dateString);
                          setSelectedLeaveEndDate(null);
                        }
                      } else {
                        // Reset and start new selection
                        setSelectedLeaveStartDate(dateString);
                        setSelectedLeaveEndDate(null);
                      }
                    };

                    const isDateInRange = (date: Date) => {
                      if (!selectedLeaveStartDate || !selectedLeaveEndDate) return false;
                      const dateString = date.toISOString().split('T')[0];
                      return dateString >= selectedLeaveStartDate && dateString <= selectedLeaveEndDate;
                    };

                    const isDateSelected = (date: Date) => {
                      const dateString = date.toISOString().split('T')[0];
                      return dateString === selectedLeaveStartDate || dateString === selectedLeaveEndDate;
                    };

                    const isDateOnLeave = (date: Date) => {
                      const dateString = date.toISOString().split('T')[0];
                      return staffForm.leave_dates?.some(leave => 
                        dateString >= leave.startDate && dateString <= leave.endDate
                      ) || false;
                    };

                    return (
                      <View style={styles.inlineCalendarContainer}>
                        {/* Calendar Header */}
                        <View style={styles.inlineCalendarHeader}>
                          <Text style={styles.inlineCalendarMonthYear}>
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </Text>
                        </View>

                        {/* Day Names */}
                        <View style={styles.inlineCalendarDayNames}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <Text key={day} style={styles.inlineCalendarDayName}>{day}</Text>
                          ))}
                        </View>

                        {/* Calendar Grid */}
                        {calendar.map((week, weekIndex) => (
                          <View key={weekIndex} style={styles.inlineCalendarWeek}>
                            {week.map((date, dayIndex) => {
                              const isCurrentMonth = date.getMonth() === month;
                              const isToday = date.toDateString() === new Date().toDateString();
                              const isInRange = isDateInRange(date);
                              const isSelected = isDateSelected(date);
                              const isOnLeave = isDateOnLeave(date);
                              
                              return (
                                <TouchableOpacity
                                  key={dayIndex}
                                  style={[
                                    styles.inlineCalendarDay,
                                    !isCurrentMonth && styles.inlineCalendarDayOtherMonth,
                                    isToday && styles.inlineCalendarDayToday,
                                    isInRange && styles.inlineCalendarDayInRange,
                                    isSelected && styles.inlineCalendarDaySelected,
                                    isOnLeave && styles.inlineCalendarDayOnLeave
                                  ]}
                                  onPress={() => isCurrentMonth && date >= new Date() && handleDayPress(date)}
                                  disabled={!isCurrentMonth || date < new Date()}
                                >
                                  <Text style={[
                                    styles.inlineCalendarDayText,
                                    !isCurrentMonth && styles.inlineCalendarDayTextOther,
                                    isToday && styles.inlineCalendarDayTextToday,
                                    (isSelected || isInRange) && styles.inlineCalendarDayTextSelected,
                                    isOnLeave && styles.inlineCalendarDayTextOnLeave
                                  ]}>
                                    {date.getDate()}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ))}

                        {/* Selected Range Display */}
                        {selectedLeaveStartDate && selectedLeaveEndDate && (
                          <View style={styles.inlineSelectedRangeDisplay}>
                            <Text style={styles.inlineSelectedRangeTitle}>Selected Leave Period:</Text>
                            <Text style={styles.inlineSelectedRangeText}>
                              {selectedLeaveStartDate === selectedLeaveEndDate 
                                ? new Date(selectedLeaveStartDate).toLocaleDateString()
                                : `${new Date(selectedLeaveStartDate).toLocaleDateString()} - ${new Date(selectedLeaveEndDate).toLocaleDateString()}`
                              }
                            </Text>
                            <TouchableOpacity
                              style={styles.addLeaveButton}
                              onPress={() => {
                                if (selectedLeaveStartDate && selectedLeaveEndDate) {
                                  const newLeave = {
                                    title: 'Leave Period',
                                    startDate: selectedLeaveStartDate,
                                    endDate: selectedLeaveEndDate,
                                    type: 'leave'
                                  };
                                  
                                  setStaffForm(prev => ({
                                    ...prev,
                                    leave_dates: [...(prev.leave_dates || []), newLeave]
                                  }));

                                  // Reset selection
                                  setSelectedLeaveStartDate(null);
                                  setSelectedLeaveEndDate(null);
                                }
                              }}
                            >
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                              <Text style={styles.addLeaveButtonText}>Add Leave</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </View>

                {/* Current Leave Dates */}
                {staffForm.leave_dates && staffForm.leave_dates.length > 0 && (
                  <View style={styles.currentLeaveDates}>
                    <Text style={styles.currentLeaveDatesTitle}>Scheduled Leave Days:</Text>
                    <View style={styles.leaveDaysList}>
                      {staffForm.leave_dates
                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                        .map((leave, index) => (
                          <View key={index} style={styles.leaveDayCard}>
                            <View style={styles.leaveDayIconContainer}>
                              <Ionicons 
                                name={new Date(leave.endDate) < new Date() ? "checkmark-circle" : "time-outline"} 
                                size={16} 
                                color={new Date(leave.endDate) < new Date() ? "#10B981" : "#1A2533"} 
                              />
                            </View>
                            <View style={styles.leaveDayInfo}>
                              <Text style={styles.leaveDayTitle}>{leave.title}</Text>
                              <Text style={styles.leaveDayDates}>
                                {leave.startDate === leave.endDate 
                                  ? new Date(leave.startDate).toLocaleDateString()
                                  : `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}`
                                }
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.removeLeaveDayButton}
                              onPress={() => {
                                setStaffForm(prev => ({
                                  ...prev,
                                  leave_dates: prev.leave_dates?.filter((_, i) => i !== index) || []
                                }));
                              }}
                            >
                              <Ionicons name="close" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Active Staff Member</Text>
                  <Text style={styles.switchDescription}>
                    Enable to make this staff member available for bookings
                  </Text>
                </View>
                <Switch
                  value={staffForm.is_active}
                  onValueChange={(value) => setStaffForm(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#F5F5E9' }}
                  thumbColor={staffForm.is_active ? '#1A2533' : '#9CA3AF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeStaffModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={saveStaff}
              >
                <Text style={styles.saveModalButtonText}>
                  {editingStaff ? 'Update' : 'Add'} Staff
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
  );

  // Staff Leave Calendar Modal with drag-to-select functionality
  const renderStaffLeaveCalendar = () => {
    const currentMonth = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Generate calendar days for current month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    const currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      calendar.push(weekDays);
    }

    const handleDayPress = (date: Date) => {
      const dateString = date.toISOString().split('T')[0];
      
      if (!selectedLeaveStartDate) {
        setSelectedLeaveStartDate(dateString);
        setSelectedLeaveEndDate(dateString);
      } else if (selectedLeaveStartDate && !selectedLeaveEndDate) {
        const startDate = new Date(selectedLeaveStartDate);
        if (date < startDate) {
          setSelectedLeaveStartDate(dateString);
          setSelectedLeaveEndDate(selectedLeaveStartDate);
        } else {
          setSelectedLeaveEndDate(dateString);
        }
      } else {
        // Reset selection
        setSelectedLeaveStartDate(dateString);
        setSelectedLeaveEndDate(dateString);
      }
    };

    const addLeaveRange = () => {
      if (selectedLeaveStartDate && selectedLeaveEndDate) {
        const leaveTitle = selectedLeaveStartDate === selectedLeaveEndDate 
          ? 'Single Day Leave'
          : 'Leave Period';
          
        const newLeave = {
          title: leaveTitle,
          startDate: selectedLeaveStartDate,
          endDate: selectedLeaveEndDate,
          type: 'leave'
        };

        setStaffForm(prev => ({
          ...prev,
          leave_dates: [...(prev.leave_dates || []), newLeave]
        }));

        // Reset selection
        setSelectedLeaveStartDate(null);
        setSelectedLeaveEndDate(null);
        setShowStaffLeaveCalendar(false);
      }
    };

    const isDateInRange = (date: Date) => {
      if (!selectedLeaveStartDate || !selectedLeaveEndDate) return false;
      const dateString = date.toISOString().split('T')[0];
      return dateString >= selectedLeaveStartDate && dateString <= selectedLeaveEndDate;
    };

    const isDateSelected = (date: Date) => {
      const dateString = date.toISOString().split('T')[0];
      return dateString === selectedLeaveStartDate || dateString === selectedLeaveEndDate;
    };

    const isDateOnLeave = (date: Date) => {
      if (!staffForm.leave_dates) return false;
      const dateString = date.toISOString().split('T')[0];
      return staffForm.leave_dates.some(leave => 
        dateString >= leave.startDate && dateString <= leave.endDate
      );
    };

    return (
      <Modal
        visible={showStaffLeaveCalendar}
        animationType="slide"
        onRequestClose={() => setShowStaffLeaveCalendar(false)}
      >
        <SafeAreaView style={styles.fullScreenModalContainer}>
          <View style={styles.leaveCalendarModal}>
              <View style={styles.leaveCalendarHeader}>
                <View style={styles.leaveCalendarTitleContainer}>
                  <Ionicons name="calendar" size={24} color="#1A2533" />
                  <Text style={styles.leaveCalendarTitle}>Staff Leave Calendar</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowStaffLeaveCalendar(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#1A2533" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.leaveCalendarBody}>
                <Text style={styles.leaveCalendarInstructions}>
                  Tap a date to start, then tap another date to create a leave range. 
                  Tap the same date twice for single day leave.
                </Text>

                {/* Calendar Header */}
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <Text style={styles.calendarMonthYear}>
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                  </View>

                  {/* Day Names */}
                  <View style={styles.calendarDayNames}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <Text key={day} style={styles.calendarDayName}>{day}</Text>
                    ))}
                  </View>

                  {/* Calendar Grid */}
                  {calendar.map((week, weekIndex) => (
                    <View key={weekIndex} style={styles.calendarWeek}>
                      {week.map((date, dayIndex) => {
                        const isCurrentMonth = date.getMonth() === month;
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isInRange = isDateInRange(date);
                        const isSelected = isDateSelected(date);
                        const isOnLeave = isDateOnLeave(date);
                        
                        return (
                          <TouchableOpacity
                            key={dayIndex}
                            style={[
                              styles.calendarDay,
                              !isCurrentMonth && styles.calendarDayOtherMonth,
                              isToday && styles.calendarDayToday,
                              isInRange && styles.calendarDayInRange,
                              isSelected && styles.calendarDaySelected,
                              isOnLeave && styles.calendarDayOnLeave
                            ]}
                            onPress={() => isCurrentMonth && date >= new Date() && handleDayPress(date)}
                            disabled={!isCurrentMonth || date < new Date()}
                          >
                            <Text style={[
                              styles.calendarDayText,
                              !isCurrentMonth && styles.calendarDayTextOther,
                              isToday && styles.calendarDayTextToday,
                              (isSelected || isInRange) && styles.calendarDayTextSelected,
                              isOnLeave && styles.calendarDayTextOnLeave
                            ]}>
                              {date.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>

                {/* Selected Range Display */}
                {selectedLeaveStartDate && selectedLeaveEndDate && (
                  <View style={styles.selectedRangeDisplay}>
                    <Text style={styles.selectedRangeTitle}>Selected Leave Period:</Text>
                    <Text style={styles.selectedRangeText}>
                      {selectedLeaveStartDate === selectedLeaveEndDate 
                        ? new Date(selectedLeaveStartDate).toLocaleDateString()
                        : `${new Date(selectedLeaveStartDate).toLocaleDateString()} - ${new Date(selectedLeaveEndDate).toLocaleDateString()}`
                      }
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.leaveCalendarActions}>
                <TouchableOpacity
                  style={styles.leaveCalendarCancelButton}
                  onPress={() => {
                    setSelectedLeaveStartDate(null);
                    setSelectedLeaveEndDate(null);
                    setShowStaffLeaveCalendar(false);
                  }}
                >
                  <Text style={styles.leaveCalendarCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.leaveCalendarSaveButton,
                    (!selectedLeaveStartDate || !selectedLeaveEndDate) && styles.disabledButton
                  ]}
                  onPress={addLeaveRange}
                  disabled={!selectedLeaveStartDate || !selectedLeaveEndDate}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.leaveCalendarSaveText}>Add Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
        </SafeAreaView>
      </Modal>
    );
  };


  // Main component render
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
      
      {renderTabBar()}
      
      {/* Upload Progress Indicator */}
      {uploadProgress.isUploading && (
        <View style={styles.uploadProgressContainer}>
          <View style={styles.uploadProgressHeader}>
            <Text style={styles.uploadProgressTitle}>
              📸 Uploading Images ({uploadProgress.uploadedImages}/{uploadProgress.totalImages})
            </Text>
            <Text style={styles.uploadProgressMessage}>
              {uploadProgress.message}
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${(uploadProgress.uploadedImages / uploadProgress.totalImages) * 100}%` 
                }
              ]} 
            />
          </View>
          
          {/* Current Image Info */}
          {uploadProgress.currentImageName && (
            <Text style={styles.currentImageText}>
              {uploadProgress.currentImageName}
            </Text>
          )}
        </View>
      )}
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={dismissAddressSuggestions}
        scrollEventThrottle={16}
      >
        {activeTab === 'basic' && renderBasicInfo()}
        {activeTab === 'schedule' && renderScheduleTab()}
        {activeTab === 'staff' && renderStaff()}
        {activeTab === 'services' && renderServices()}
        {activeTab === 'discounts' && renderDiscounts()}
        {activeTab === 'settings' && renderSettings()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const dateString = selectedDate.toISOString().split('T')[0];
              setSpecialDayForm(prev => ({ 
                ...prev, 
                date: dateString
              }));
            }
          }}
        />
      )}

      {/* Web Date Picker Fallback */}
      {Platform.OS === 'web' && showDatePicker && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.webPickerContainer}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <input
                type="date"
                value={specialDayForm.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const dateString = e.target.value;
                  setSpecialDayForm(prev => ({ ...prev, date: dateString }));
                  setShowDatePicker(false);
                }}
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  margin: '16px 0'
                }}
              />
              <View style={styles.webPickerActions}>
                <TouchableOpacity 
                  style={styles.webPickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.webPickerButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker */}
      <TimePickerModal
        visible={showTimePicker && Platform.OS !== 'web'}
        onClose={() => {
          setShowTimePicker(false);
          setEditingTimeSlot(null);
          setSpecialDayTimeType(null);
        }}
        onSelectTime={(time) => {
          if (editingTimeSlot && editingTimeSlot.day === 'Special Day') {
            // Handle special day time
            if (specialDayTimeType === 'open') {
              setSpecialDayForm(prev => ({ ...prev, openTime: time }));
            } else if (specialDayTimeType === 'close') {
              setSpecialDayForm(prev => ({ ...prev, closeTime: time }));
            }
          } else if (editingTimeSlot) {
            // Handle regular business hours
            const field = editingTimeSlot.type === 'open' ? 'openTime' : 'closeTime';
            updateBusinessHours(editingTimeSlot.day, field, time);
          }
          setShowTimePicker(false);
          setEditingTimeSlot(null);
          setSpecialDayTimeType(null);
        }}
        currentTime={
          editingTimeSlot && editingTimeSlot.day === 'Special Day'
            ? specialDayTimeType === 'open' 
              ? specialDayForm.openTime || '09:00'
              : specialDayForm.closeTime || '17:00'
            : editingTimeSlot && shop?.business_hours?.find(h => h.day === editingTimeSlot.day)
              ? editingTimeSlot.type === 'open'
                ? shop?.business_hours?.find(h => h.day === editingTimeSlot.day)?.openTime
                : shop?.business_hours?.find(h => h.day === editingTimeSlot.day)?.closeTime
              : '09:00'
        }
        title={editingTimeSlot ? `Select ${editingTimeSlot.type === 'open' ? 'Opening' : 'Closing'} Time for ${editingTimeSlot.day}` : 'Select Time'}
      />


      {/* Web Time Picker Fallback */}
      {Platform.OS === 'web' && showTimePicker && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.webPickerContainer}>
              <Text style={styles.modalTitle}>
                Select {editingTimeSlot?.type === 'open' ? 'Opening' : 'Closing'} Time
              </Text>
              <input
                type="time"
                value={
                  editingTimeSlot && editingTimeSlot.day === 'Special Day'
                    ? specialDayTimeType === 'open' 
                      ? specialDayForm.openTime || '09:00'
                      : specialDayForm.closeTime || '17:00'
                    : editingTimeSlot && shop?.business_hours?.find(h => h.day === editingTimeSlot.day)
                      ? editingTimeSlot.type === 'open'
                        ? shop?.business_hours?.find(h => h.day === editingTimeSlot.day)?.openTime
                        : shop?.business_hours?.find(h => h.day === editingTimeSlot.day)?.closeTime
                      : '09:00'
                }
                onChange={(e) => {
                  const time = e.target.value;
                  
                  if (editingTimeSlot && editingTimeSlot.day === 'Special Day') {
                    // Handle special day time
                    if (specialDayTimeType === 'open') {
                      setSpecialDayForm(prev => ({ ...prev, openTime: time }));
                    } else if (specialDayTimeType === 'close') {
                      setSpecialDayForm(prev => ({ ...prev, closeTime: time }));
                    }
                  } else if (editingTimeSlot) {
                    // Handle regular business hours
                    const field = editingTimeSlot.type === 'open' ? 'openTime' : 'closeTime';
                    updateBusinessHours(editingTimeSlot.day, field, time);
                  }
                  
                  setShowTimePicker(false);
                  setEditingTimeSlot(null);
                  setSpecialDayTimeType(null);
                }}
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  margin: '16px 0'
                }}
              />
              <View style={styles.webPickerActions}>
                <TouchableOpacity 
                  style={styles.webPickerButton}
                  onPress={() => {
                    setShowTimePicker(false);
                    setEditingTimeSlot(null);
                    setSpecialDayTimeType(null);
                  }}
                >
                  <Text style={styles.webPickerButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}



      {/* Modals */}
      {renderCategoryModal()}
      {renderTimezoneModal()}
      {renderSpecialDayModal()}
      {renderServiceModal()}
      {renderDiscountModal()}
      {renderStaffModal()}
      {renderStaffLeaveCalendar()}
      
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  // Service Options Styles
  modalHeaderLeft: {
    width: 40,
  },
  backButton: {
    padding: 4,
  },
  infoSection: {
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#1A2533',
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  deleteButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1A2533',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#F5F5E9',
  },
  addButtonText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exampleSection: {
    backgroundColor: '#F5F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#1A2533',
    fontSize: 14,
  },
  // Service Options List Styles
  optionsListContainer: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionsListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  optionListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionListContent: {
    flex: 1,
  },
  optionListName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
    marginBottom: 2,
  },
  optionListDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionListPrice: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '600',
  },
  optionListDuration: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 4,
  },
  activeIndicator: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  inactiveIndicator: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inactiveText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Save Button
  headerSaveButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  headerSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Tab Bar (updated to 6 tabs)
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    marginHorizontal: 1,
  },
  activeTabItem: {
    backgroundColor: '#1A2533',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#1A2533',
    marginTop: 3,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2533',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  
  // Forms
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    overflow: 'visible',
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
    overflow: 'visible',
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A2533',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#1A2533',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  // Address autocomplete styles
  addressContainer: {
    position: 'relative',
    zIndex: 999,
    elevation: 999,
  },
  useMyAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  useMyAddressText: {
    color: '#1A2533',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  // Address dropdown styles
  addressDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 999,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressDropdownScroll: {
    maxHeight: 200,
  },
  addressDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  addressDropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 8,
    lineHeight: 18,
  },
  // Old modal styles - keeping for other modals
  modalCloseButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  // Old address suggestion styles - no longer used (replaced with dropdown)
  // Modal address suggestions styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: 400,
  },
  modalSuggestionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalSuggestionText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalDismissButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  modalDismissText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 4,
    borderRadius: 6,
  },
  loadingText: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 8,
  },
  webPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  webPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  webPickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  webPickerButtonText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectInputText: {
    fontSize: 16,
    color: '#1A2533',
  },
  inputHint: {
    fontSize: 12,
    color: '#1A2533',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  switchDescription: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 2,
  },

  // Images
  imageSection: {
    marginBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photosSection: {
    marginTop: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoBox: {
    width: (width - 64) / 3 - 4,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  photoPlaceholderText: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Business Hours
  dayRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 110,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2533',
    letterSpacing: 0.3,
  },
  timeSeparator: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  closedText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'right',
  },

  // Special Days
  specialDayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specialDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specialDayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  specialDayInfo: {
    flex: 1,
  },
  specialDayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  specialDayDate: {
    fontSize: 13,
    color: '#1A2533',
    marginTop: 2,
  },
  specialDayType: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  specialDayActions: {
    flexDirection: 'row',
  },
  specialDayHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  specialDayHoursText: {
    fontSize: 13,
    color: '#1A2533',
  },
  specialDayDescription: {
    fontSize: 13,
    color: '#1A2533',
    fontStyle: 'italic',
  },

  // Special Day Modal
  specialDayTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialDayTypeOption: {
    flex: 1,
    minWidth: (width - 64) / 2 - 4,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 6,
  },
  selectedSpecialDayType: {
    borderColor: '#1A2533',
    backgroundColor: '#F5F5E9',
  },
  specialDayTypeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A2533',
    textAlign: 'center',
  },
  recurringOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedRecurringOption: {
    backgroundColor: '#F5F5E9',
  },
  recurringOptionText: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '500',
  },
  selectedRecurringOptionText: {
    color: '#92400E',
    fontWeight: '600',
  },

  // Buttons
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2533',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  roundedAddButton: {
    backgroundColor: '#1A2533',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  // Cards (keep existing service and discount card styles)
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  serviceCategory: {
    fontSize: 13,
    color: '#1A2533',
    marginTop: 2,
  },
  serviceActions: {
    flexDirection: 'row',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDetailText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A2533',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Discount Cards (keep existing styles)
  discountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  discountInfo: {
    flex: 1,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  discountType: {
    fontSize: 13,
    color: '#1A2533',
    marginTop: 2,
  },
  discountActions: {
    flexDirection: 'row',
  },
  discountDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  discountDetail: {
    alignItems: 'center',
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  discountLabel: {
    fontSize: 12,
    color: '#1A2533',
    marginTop: 2,
  },
  discountPeriod: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
  },
  discountPeriodText: {
    fontSize: 12,
    color: '#1A2533',
  },
  
  // First-Time Discount Feature Styles
  firstTimeDiscountCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  firstTimeDiscountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  firstTimeDiscountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  firstTimeDiscountInfo: {
    flex: 1,
  },
  firstTimeDiscountTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  firstTimeDiscountSubtitle: {
    fontSize: 14,
    color: '#047857',
  },
  firstTimeDiscountBenefits: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullScreenKeyboardView: {
    flex: 1,
  },
  fullScreenContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  saveModalButton: {
    flex: 1,
    backgroundColor: '#1A2533',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Category Modal
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedCategoryOption: {
    backgroundColor: '#F5F5E9',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#1A2533',
  },
  selectedCategoryOptionText: {
    fontWeight: '600',
    color: '#92400E',
  },

  // Discount Type Grid
  discountTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  discountTypeOption: {
    flex: 1,
    minWidth: (width - 64) / 2 - 4,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 4,
  },
  selectedDiscountType: {
    borderColor: '#1A2533',
    backgroundColor: '#F5F5E9',
  },
  discountTypeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A2533',
    textAlign: 'center',
  },
  selectedDiscountTypeName: {
    color: '#92400E',
    fontWeight: '600',
  },
  discountTypeDesc: {
    fontSize: 10,
    color: '#1A2533',
    textAlign: 'center',
  },

  // Staff Cards
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  staffRole: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '500',
    marginTop: 2,
  },
  staffContact: {
    fontSize: 13,
    color: '#1A2533',
    marginTop: 1,
  },
  staffActions: {
    flexDirection: 'row',
  },
  specialties: {
    marginBottom: 12,
  },
  specialtiesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 6,
  },
  specialtyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialtyTag: {
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  staffBio: {
    fontSize: 13,
    color: '#1A2533',
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  staffDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  staffDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  staffDetailText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A2533',
  },

  // Staff Selection in Service Modal
  staffSelection: {
    gap: 8,
  },

  // Service Options
  optionsDescription: {
    fontSize: 13,
    color: '#1A2533',
    marginBottom: 12,
    lineHeight: 18,
  },
  manageOptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5E9',
    borderWidth: 1,
    borderColor: '#1A2533',
    borderRadius: 12,
    padding: 16,
  },
  manageOptionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
    marginLeft: 12,
  },
  optionsInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  optionsInfoText: {
    fontSize: 14,
    color: '#1A2533',
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  staffOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStaffOption: {
    borderColor: '#1A2533',
    backgroundColor: '#F5F5E9',
  },
  staffOptionContent: {
    flex: 1,
  },
  staffOptionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  selectedStaffOptionText: {
    color: '#92400E',
    fontWeight: '600',
  },
  staffOptionRole: {
    fontSize: 12,
    color: '#1A2533',
    marginTop: 2,
  },
  noStaffText: {
    fontSize: 14,
    color: '#1A2533',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },

  // Note: Role and specialty selection styles removed as we now use manual input

  // Custom Time Picker
  timePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    marginTop: 'auto',
  },
  timeSlotGrid: {
    padding: 20,
    maxHeight: 400,
  },
  timeSlot: {
    flex: 1,
    margin: 4,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTimeSlot: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A2533',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Staff Avatar Upload
  avatarUploadSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarUpload: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Specialty Management
  addSpecialtyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  specialtyInput: {
    flex: 1,
  },
  addSpecialtyButton: {
    backgroundColor: '#1A2533',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentSpecialties: {
    marginBottom: 12,
  },
  currentSpecialtiesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  specialtyTagWithRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  removeSpecialtyButton: {
    padding: 2,
  },

  // Suggestions
  suggestionSection: {
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    color: '#1A2533',
    marginBottom: 6,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionTagText: {
    fontSize: 11,
    color: '#1A2533',
    fontWeight: '500',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#1A2533',
    marginTop: 12,
  },

  // Bottom spacing
  bottomSpacing: {
    height: 32,
  },

  // Service Options Styles
  optionsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  optionsTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5E9',
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  noOptionsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noOptionsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A2533',
    marginTop: 8,
    marginBottom: 4,
  },
  noOptionsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  serviceOptionsList: {
    gap: 16,
  },
  serviceOptionItem: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeOptionButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  optionInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  optionNameContainer: {
    flex: 1,
  },
  optionFieldContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 6,
  },
  optionInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#1A2533',
  },
  optionTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  optionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  optionStatusDescription: {
    fontSize: 12,
    color: '#1A2533',
    marginTop: 2,
  },
  optionPreview: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#047857',
  },
  previewDescription: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inactiveText: {
    color: '#EF4444',
    fontSize: 11,
  },

  // Upload Progress Styles
  uploadProgressContainer: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#1A2533',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  uploadProgressHeader: {
    marginBottom: 12,
  },
  uploadProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  uploadProgressMessage: {
    fontSize: 14,
    color: '#1A2533',
    fontStyle: 'italic',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1A2533',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  currentImageText: {
    fontSize: 12,
    color: '#1A2533',
    textAlign: 'center',
    marginTop: 4,
  },

  // Location Type Styles
  locationTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  locationTypeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F0FFFE',
    alignItems: 'center',
    gap: 8,
  },
  selectedLocationType: {
    borderColor: '#1A2533',
    backgroundColor: '#F5F5E9',
  },
  locationTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  selectedLocationTypeTitle: {
    color: '#92400E',
  },
  locationTypeDesc: {
    fontSize: 12,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedLocationTypeDesc: {
    color: '#92400E',
  },

  // Inactive service styles
  inactiveServiceCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.9,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inactiveServiceName: {
    color: '#1A2533',
  },
  inactiveServiceCategory: {
    color: '#9CA3AF',
  },
  inactiveBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1A2533',
  },

  // Inline Date Picker Styles  
  inlinePicker: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  inlineDatePicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  webInlinePicker: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 8,
  },
  webDateInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    color: '#1A2533',
    backgroundColor: '#FFFFFF',
  },

  // Inline Time Picker Styles for Special Day
  inlineTimePickerContainer: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inlineTimePickerStyle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 120,
  },
  webInlineTimePicker: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  webTimeInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    color: '#1A2533',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },

  // Special Day Modal Styles
  specialDayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FEFEFE',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialDaySection: {
    marginBottom: 24,
    backgroundColor: '#FEFEFE',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specialDaySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWithIconText: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  datePickerPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  specialDayTypeCard: {
    flex: 1,
    minWidth: (width - 80) / 2 - 8,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  selectedSpecialDayTypeCard: {
    borderColor: '#1A2533',
    backgroundColor: '#F5F5E9',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  specialDayTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialDayTypeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
    textAlign: 'center',
  },
  openStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  openStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  openStatusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  openStatusTextContainer: {
    flex: 1,
  },
  openStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  openStatusDescription: {
    fontSize: 13,
    color: '#1A2533',
  },
  timePickerSection: {
    marginTop: 16,
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  timePickerIcon: {
    marginRight: 8,
  },
  timePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1A2533',
    fontWeight: '500',
  },
  timePickerPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  recurringOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recurringOptionCard: {
    flex: 1,
    minWidth: (width - 80) / 2 - 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  selectedRecurringCard: {
    borderColor: '#1A2533',
    backgroundColor: '#F5F5E9',
  },
  recurringIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRecurringIcon: {
    backgroundColor: '#F5F5E9',
  },
  recurringOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
    flex: 1,
  },
  selectedRecurringTitle: {
    color: '#92400E',
    fontWeight: '600',
  },
  textAreaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textAreaIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  textAreaWithIcon: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  specialDayModalActions: {
    flexDirection: 'row',
    gap: 16,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FEFEFE',
  },
  specialDayCancelButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  specialDayCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  specialDaySaveButton: {
    flex: 2,
    backgroundColor: '#1A2533',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledSaveButton: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonIcon: {
    marginRight: 4,
  },
  specialDaySaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Staff Work Schedule Styles
  workScheduleContainer: {
    backgroundColor: '#FEFEFE',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayScheduleRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayScheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayScheduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  daySwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  dayTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  timeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    flex: 1,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  timeToText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },

  // Staff Leave Management Styles
  addLeaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5E9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A2533',
    marginTop: 8,
  },
  addLeaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
    marginLeft: 12,
  },
  currentLeaveDays: {
    marginTop: 16,
    backgroundColor: '#FEFEFE',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  leaveDaysTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 12,
  },
  leaveDaysList: {
    gap: 8,
  },
  leaveDayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  leaveDayInfo: {
    flex: 1,
  },
  leaveDayTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  leaveDayDates: {
    fontSize: 12,
    color: '#1A2533',
    marginTop: 2,
  },
  removeLeaveDayButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Full Screen Modal Container
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Leave Calendar Modal Styles
  leaveCalendarModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  leaveCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FEFEFE',
  },
  leaveCalendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaveCalendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
  },
  leaveCalendarBody: {
    flex: 1,
    padding: 20,
  },
  leaveCalendarInstructions: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
  },
  calendarDayNames: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
    paddingVertical: 8,
  },
  calendarWeek: {
    flexDirection: 'row',
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  calendarDayOtherMonth: {
    backgroundColor: '#F9FAFB',
  },
  calendarDayToday: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  calendarDayInRange: {
    backgroundColor: '#F5F5E9',
  },
  calendarDaySelected: {
    backgroundColor: '#1A2533',
  },
  calendarDayOnLeave: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  calendarDayTextOther: {
    color: '#9CA3AF',
  },
  calendarDayTextToday: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayTextOnLeave: {
    color: '#DC2626',
    fontWeight: '600',
  },
  selectedRangeDisplay: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  selectedRangeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C4A6E',
    marginBottom: 4,
  },
  selectedRangeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0369A1',
  },
  leaveCalendarActions: {
    flexDirection: 'row',
    gap: 16,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FEFEFE',
  },
  leaveCalendarCancelButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  leaveCalendarCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  leaveCalendarSaveButton: {
    flex: 2,
    backgroundColor: '#1A2533',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  leaveCalendarSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Full Screen Modal Styles
  fullScreenModalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Fixed Leave Header (non-collapsible)
  leaveHeaderFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  // Inline Leave Calendar Styles
  inlineLeaveCalendar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  inlineCalendarContainer: {
    backgroundColor: '#FFFFFF',
  },
  inlineCalendarHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  inlineCalendarMonthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  inlineCalendarDayNames: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inlineCalendarDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#1A2533',
    paddingVertical: 8,
  },
  inlineCalendarWeek: {
    flexDirection: 'row',
  },
  inlineCalendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  inlineCalendarDayOtherMonth: {
    backgroundColor: '#F9FAFB',
  },
  inlineCalendarDayToday: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  inlineCalendarDayInRange: {
    backgroundColor: '#F5F5E9',
  },
  inlineCalendarDaySelected: {
    backgroundColor: '#1A2533',
  },
  inlineCalendarDayOnLeave: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  inlineCalendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  inlineCalendarDayTextOther: {
    color: '#9CA3AF',
  },
  inlineCalendarDayTextToday: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  inlineCalendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inlineCalendarDayTextOnLeave: {
    color: '#EF4444',
    fontWeight: '600',
  },

  // Selected Range Display
  inlineSelectedRangeDisplay: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  inlineSelectedRangeTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
    marginBottom: 4,
  },
  inlineSelectedRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 8,
  },
  addLeaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addLeaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Current Leave Dates Styles
  currentLeaveDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 12,
  },
});

export default ShopDetailsScreen;