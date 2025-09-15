import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text, 
  RefreshControl, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  FlatList,
  Alert,
  PermissionsAndroid,
  Platform,
  AppState,
  AppStateStatus
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import api from '../services/api/home/providerHomeAPI';
import { shopAPI } from '../services/api/shops/shopAPI';
import { categoryAPI } from '../services/api/categories/categoryAPI';
import { dataService } from '../services/dataService';
import { useAuth } from '../navigation/AppNavigator';
import { usePremium } from '../contexts/PremiumContext';
import { formatCurrency } from '../utils/currency';
import { MockDataBanner, MockDataIndicator } from '../components/dev/MockDataIndicator';
import { DEV_CONFIG, shouldUseMockData, logMockUsage } from '../config/devConfig';
import { MOCK_USERS, getMockReviews } from '../data/mockData';
import MemberAppSwitchButton from '../components/MemberAppSwitchButton';

// Lazy import to improve startup performance
let normalizedShopService: any;
const getShopService = async () => {
  if (!normalizedShopService) {
    normalizedShopService = (await import('../lib/supabase/normalized')).normalizedShopService;
  }
  return normalizedShopService;
};

const { width } = Dimensions.get('window');
// Responsive card width for 2 columns with proper spacing
const horizontalPadding = 20; // Padding on both sides
const columnGap = 16; // Gap between columns
const numColumns = 2;
const cardWidth = (width - (horizontalPadding * 2) - (columnGap * (numColumns - 1))) / numColumns;
const promotionWidth = width - 40;

interface Category {
  id: string;
  name: string;
  image: string;
  service_count: number;
  color: string;
  description?: string;
  icon?: string;
}

interface Shop {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logo_url?: string;
  images: string[];
  rating?: number;
  reviews_count?: number;
  distance?: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_percentage: number;
  code: string;
  expires_at: string;
  image: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  duration: number;
  rating: number;
  reviews_count: number;
  professional_name: string;
  salon_name: string;
  location: string;
  distance: string;
  image: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountCode?: string;
  isSpecialOffer?: boolean;
}

interface Booking {
  id: string;
  service_name: string;
  professional_name: string;
  salon_name: string;
  date: string;
  time: string;
  status: string;
}

interface HomeData {
  categories: Category[];
  promotions: Promotion[];
  specialOffers: Service[];
  trendingServices: Service[];
  popularServices: Service[];
  recommendedServices: Service[];
  upcomingBookings: Booking[];
  stats: {
    totalServices: number;
    totalCategories: number;
    totalProviders: number;
    avgRating: number;
  };
}

type RootStackParamList = {
  ServiceList: { 
    category: string; 
    categoryId: string;
    showPopular?: boolean;
  };
  ServiceDetail: { serviceId: string };
  Bookings: undefined;
  Search: { query?: string };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { isPremium, subscription, isLoading: premiumLoading } = usePremium();
  
  const [homeData, setHomeData] = useState<HomeData>({
    categories: [],
    promotions: [],
    specialOffers: [],
    trendingServices: [],
    popularServices: [],
    recommendedServices: [],
    upcomingBookings: [],
    stats: { totalServices: 0, totalCategories: 0, totalProviders: 0, avgRating: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    categories: [],
    services: [],
    professionals: []
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    city?: string;
    address?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryShops, setCategoryShops] = useState<{[key: string]: Shop[]}>({});
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  
  // App state tracking
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const isFetchingRef = useRef(false);
  const [profile, setProfile] = useState<any>(null);

  // Fetch profile data using the same pattern as ProfileScreen
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const currentUser = user;
        
        // Use mock data if enabled, same as ProfileScreen
        if (shouldUseMockData('MOCK_AUTH')) {
          console.log('🎭 Using mock profile data for ConsumerHome');
          logMockUsage('Loading mock profile data');
          const mockUser = MOCK_USERS[0];
          
          const mockProfile = {
            id: currentUser?.id || mockUser.id,
            email: mockUser.email,
            phone: mockUser.phone || '1234567890',
            first_name: mockUser.firstName,
            last_name: mockUser.lastName,
            full_name: `${mockUser.firstName} ${mockUser.lastName}`,
            avatar_url: mockUser.avatar,
            account_type: 'consumer',
            is_premium: false,
            email_verified: true,
            phone_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          setProfile(mockProfile);
          console.log('✅ Mock profile loaded successfully for ConsumerHome');
          return;
        }
        
        if (!currentUser) {
          console.warn('⚠️ No authenticated user found');
          return;
        }
        
        // Get real user profile from normalizedShopService
        const shopService = await getShopService();
        if (shopService) {
          const profileResponse = await shopService.getUserProfile();
          if (profileResponse.success && profileResponse.data) {
            setProfile(profileResponse.data);
            console.log('✅ Profile loaded for ConsumerHome:', profileResponse.data.full_name);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

  // Helper functions for user display - prioritize real data
  const getDisplayName = () => {
    if (shouldUseMockData('MOCK_AUTH')) {
      const mockUser = MOCK_USERS[0];
      return `${mockUser.firstName} ${mockUser.lastName}`;
    }
    
    // Debug what we actually have
    console.log('🔍 All available name data:', {
      profile_full_name: profile?.full_name,
      profile_first_last: profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null,
      user_metadata_full_name: user?.user_metadata?.full_name,
      user_metadata_name: user?.user_metadata?.name,
      user_metadata_first: user?.user_metadata?.first_name,
      user_metadata_given: user?.user_metadata?.given_name,
      user_email: user?.email?.split('@')[0]
    });
    
    // Try user metadata first since profile might be failing
    const metadataName = user?.user_metadata?.full_name ||
                        user?.user_metadata?.name ||
                        (user?.user_metadata?.given_name && user?.user_metadata?.family_name 
                          ? `${user.user_metadata.given_name} ${user.user_metadata.family_name}` 
                          : '') ||
                        user?.user_metadata?.given_name ||
                        user?.user_metadata?.first_name;
    
    if (metadataName && metadataName !== 'User Profile') {
      return metadataName;
    }
    
    return profile?.full_name || 
           (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : '') ||
           profile?.first_name || 
           user?.email?.split('@')[0] || 
           'there';
  };

  const getDisplayAvatar = () => {
    if (shouldUseMockData('MOCK_AUTH')) {
      const mockUser = MOCK_USERS[0];
      logMockUsage('Using mock user avatar for HomeScreen');
      return mockUser.avatar;
    }
    
    return profile?.avatar_url || 
           user?.user_metadata?.avatar_url ||
           user?.user_metadata?.picture || 
           'https://randomuser.me/api/portraits/men/1.jpg';
  };

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      // iOS handles permissions automatically when calling getCurrentPosition
      // No need to explicitly request permission
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Qwiken Location Permission',
            message: 'Qwiken needs access to your location to show nearby services.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return false;
  };

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        setLocationError('Location permission denied');
        setLocationLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Get city name using reverse geocoding (simplified for now)
          // In production, you'd use a proper geocoding service
          const location = {
            latitude,
            longitude,
            city: 'Current Location', // This would be fetched from geocoding API
            address: `Within 40 km radius`
          };
          
          setCurrentLocation(location);
          setLocationLoading(false);
          
          console.log('📍 Location obtained:', location);
        },
        (error) => {
          console.error('Location error:', error);
          
          // Check for specific error codes
          let errorMessage = 'Unable to get current location';
          if (error.code === 1) {
            errorMessage = 'Location permission denied';
          } else if (error.code === 2) {
            errorMessage = 'Location unavailable';
          } else if (error.code === 3) {
            errorMessage = 'Location request timeout';
          }
          
          setLocationError(errorMessage);
          setLocationLoading(false);
          
          // Set default location as fallback
          setCurrentLocation({
            latitude: 59.3293, // Stockholm coordinates as default
            longitude: 18.0686,
            city: 'Stockholm',
            address: 'Within 40 km radius'
          });
        },
        { 
          enableHighAccuracy: false, // Changed to false for faster response
          timeout: 10000, // Reduced timeout
          maximumAge: 10000 
        }
      );
    } catch (error) {
      console.error('Location service error:', error);
      setLocationError('Location service unavailable');
      setLocationLoading(false);
    }
  }, []);

  // Fetch home data
  const fetchHomeData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('⏳ Already fetching data, skipping duplicate request');
      return;
    }
    
    // Don't fetch if auth is still loading and we don't have a user yet
    if ((authLoading || premiumLoading) && !user?.id) {
      console.log('🔄 Waiting for auth to complete (no user yet)...', { 
        authLoading, 
        premiumLoading,
        user: !!user,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      // Don't set loading to false here, let auth complete first
      return;
    }
    
    // Allow data fetching if we have a user, even if loading states are still true
    if ((authLoading || premiumLoading) && user?.id) {
      console.log('⚡ Auth still loading but user available, proceeding with fetch...', { 
        authLoading, 
        premiumLoading,
        user: !!user,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Auth ready, proceeding with data fetch...', {
      authLoading,
      premiumLoading,
      user: !!user,
      userId: user?.id
    });
    
    isFetchingRef.current = true;

    try {
      setError(null);
      console.log('📦 Fetching home data:', {
        userId: user?.id || 'anonymous',
        isPremium,
        subscriptionType: subscription?.subscription_type,
        subscriptionStatus: subscription?.subscription_status,
        usingMockData: shouldUseMockData()
      });

      // Test imports
      console.log('🔍 Testing imports:', {
        DEV_CONFIG_exists: !!DEV_CONFIG,
        USE_MOCK_DATA_value: DEV_CONFIG.USE_MOCK_DATA,
        shouldUseMockData_function: typeof shouldUseMockData,
        dataService_exists: !!dataService
      });

      if (shouldUseMockData()) {
        // Use mock data service
        console.log('🎭 MOCK DATA: Starting mock data load for home screen');
        console.log('🎭 MOCK DATA: shouldUseMockData() returned:', shouldUseMockData());
        console.log('🎭 MOCK DATA: DEV_CONFIG.USE_MOCK_DATA:', DEV_CONFIG.USE_MOCK_DATA);
        
        try {
          const [categoriesResponse, shopsResponse, servicesResponse] = await Promise.all([
            dataService.getCategories(),
            dataService.getShops(true), // Get featured shops
            dataService.getFeaturedServices()
          ]);

          console.log('🎭 MOCK DATA: Responses received:', {
            categories: categoriesResponse.success,
            shops: shopsResponse.success,
            services: servicesResponse.success
          });

          if (!categoriesResponse.success) {
            console.error('🎭 MOCK DATA: Categories failed:', categoriesResponse.error);
            throw new Error(categoriesResponse.error || 'Failed to load categories');
          }

          if (!shopsResponse.success) {
            console.error('🎭 MOCK DATA: Shops failed:', shopsResponse.error);
            throw new Error(shopsResponse.error || 'Failed to load shops');
          }

          // Transform mock shops to the expected service format
          const transformShopToService = (shop: any) => ({
            id: shop.id,
            name: shop.name,
            description: shop.description,
            professional_name: 'Shop Team',
            salon_name: shop.name,
            price: 50, // Default price for display
            duration: 60,
            rating: shop.rating,
            reviews_count: shop.reviewCount,
            location: shop.address,
            distance: '2.5 km',
            image: shop.images?.[0] || shop.logo,
            category_id: 'mock-cat',
            available_time_text: 'Available today',
            welcome_message: `Welcome to ${shop.name}!`,
            special_note: shop.amenities?.[0] || '',
            payment_methods: ['Card', 'Cash'],
            is_favorite: false,
            hasDiscount: false,
            discountPercentage: 0
          });

          const mockShops = shopsResponse.data || [];
          console.log('🎭 MOCK DATA: Mock shops loaded:', mockShops.length);
          
          const homeData = {
            categories: categoriesResponse.data || [],
            promotions: [],
            specialOffers: servicesResponse.data || [],
            trendingServices: mockShops.slice(0, 6).map(transformShopToService),
            popularServices: mockShops.slice(1, 7).map(transformShopToService),
            recommendedServices: mockShops.slice(2, 8).map(transformShopToService),
            upcomingBookings: [],
            stats: {
              totalServices: 150,
              totalCategories: categoriesResponse.data?.length || 0,
              totalProviders: mockShops.length,
              avgRating: 4.7
            }
          };

          console.log('🎭 MOCK DATA: Setting mock home data:', {
            categoriesCount: homeData.categories.length,
            trendingCount: homeData.trendingServices.length,
            popularCount: homeData.popularServices.length
          });

          setHomeData(homeData);
          console.log('✅ 🎭 MOCK DATA: Mock home data loaded successfully and set!');
          setIsLoading(false); // Make sure to stop loading
          isFetchingRef.current = false; // Clear fetch lock
          return;
        } catch (mockError) {
          console.error('❌ 🎭 MOCK DATA: Error in mock data loading:', mockError);
          // Re-throw the error so it gets caught by outer try-catch
          throw mockError;
        }
      }

      // Original real data fetching logic
      console.log('📋 Fetching categories from categoryAPI...');
      const categoriesResponse = await categoryAPI.getAllCategories();
      
      if (categoriesResponse.error && !categoriesResponse.data) {
        throw new Error(categoriesResponse.error);
      }

      // Fetch services from shop API
      console.log('⭐ Fetching services from shopAPI...');
      let specialOffers = [];
      let trendingServices = [];
      let popularServices = [];
      let recommendedServices = [];
      
      try {
        // Prepare location parameters if available
        const locationParams = currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: 40 // 40 km radius
        } : undefined;

        // First get shops with discounts for special offers
        const discountShopsResponse = await shopAPI.getShopsWithDiscounts(locationParams);
        // Then get all shops for other sections
        const shopsResponse = await shopAPI.getAllShops(locationParams);
        console.log('💰 Shops with discounts:', discountShopsResponse.data?.length || 0);
        console.log('🏪 All shops:', shopsResponse.data?.length || 0);
        
        // Use discount shops for special offers  
        const shopsWithDiscounts = discountShopsResponse.data || [];
        const shopsWithoutDiscounts = shopsResponse.data || [];
        
        console.log('💰 Real shops with discounts found:', shopsWithDiscounts.length);
        console.log('🏪 Regular shops without discounts:', shopsWithoutDiscounts.length);
          
          // Transform shops to services format
          const transformShopToService = (shop: any, isSpecialOffer = false) => {
            // Handle both array format (mock data) and single object format (real DB)
            let hasDiscount = false;
            let discountInfo = null;
            
            if (shop.discounts) {
              if (Array.isArray(shop.discounts) && shop.discounts.length > 0) {
                // Array format - find biggest discount
                const activeDiscounts = shop.discounts.filter((d: any) => d.is_active);
                if (activeDiscounts.length > 0) {
                  discountInfo = activeDiscounts.reduce((max: any, current: any) => 
                    (current.discount_percentage > max.discount_percentage) ? current : max
                  );
                  hasDiscount = true;
                }
              } else if (!Array.isArray(shop.discounts) && shop.discounts.is_active) {
                // Single object format - direct discount from getShopsWithDiscounts
                discountInfo = shop.discounts;
                hasDiscount = true;
              }
            }
            
            let originalPrice = shop.services && shop.services.length > 0 ? shop.services[0].price : null;
            let finalPrice = originalPrice || 0;
            
            // Apply discount to price if available
            if (discountInfo && discountInfo.discount_percentage && originalPrice) {
              finalPrice = Math.round(originalPrice * (1 - discountInfo.discount_percentage / 100));
            }
            
            // Add mock reviews if mock data is enabled
            let rating = shop.rating || 4.5;
            let reviewsCount = shop.reviews_count || 0;
            
            if (shouldUseMockData('MOCK_REVIEWS')) {
              const mockReviews = getMockReviews(shop.id);
              if (mockReviews.length > 0) {
                // Calculate average rating from mock reviews
                const totalRating = mockReviews.reduce((sum, review) => sum + review.rating, 0);
                rating = Number((totalRating / mockReviews.length).toFixed(1));
                reviewsCount = mockReviews.length;
                logMockUsage(`Using mock reviews for ${shop.name}`, { count: reviewsCount, rating });
              } else {
                // If no specific reviews for this shop, use some default mock values
                rating = Math.round((4.5 + (Math.random() * 0.5)) * 10) / 10; // Random between 4.5-5.0, rounded to 1 decimal
                reviewsCount = Math.floor(Math.random() * 50) + 10; // Random between 10-59
                logMockUsage(`Generated mock reviews for ${shop.name}`, { count: reviewsCount, rating });
              }
            }

            const serviceData = {
              id: shop.id,
              name: shop.name,
              description: shop.description,
              professional_name: shop.staff && shop.staff.length > 0 ? shop.staff[0].name : shop.category || 'Service Provider',
              salon_name: shop.name,
              price: finalPrice,
              originalPrice: hasDiscount ? originalPrice : null,
              duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 60,
              rating: rating,
              reviews_count: reviewsCount,
              location: `${shop.city}, ${shop.country}`,
              distance: shop.distance || '1.5 km',
              image: shop.images && shop.images.length > 0 ? shop.images[0] : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
              hasDiscount: hasDiscount,
              discountPercentage: discountInfo ? discountInfo.discount_percentage : null,
              discountCode: discountInfo ? discountInfo.code : null,
              isSpecialOffer: isSpecialOffer
            };
            
            console.log('🏷️ Transformed service:', serviceData.name, {
              hasDiscount: serviceData.hasDiscount,
              isSpecialOffer: serviceData.isSpecialOffer,
              discountPercentage: serviceData.discountPercentage,
              originalPrice: serviceData.originalPrice,
              finalPrice: serviceData.price
            });
            
            return serviceData;
          };
          
          // Distribute services across 4 sections
          
          // 1. Special Offers - Discounted services (with discount badges)
          specialOffers = shopsWithDiscounts.slice(0, 4).map(shop => transformShopToService(shop, true));
          
          console.log('🔥 Created special offers:', {
            count: specialOffers.length,
            shopsWithDiscounts: shopsWithDiscounts.length,
            offers: specialOffers.map(offer => ({
              name: offer.name,
              hasDiscount: offer.hasDiscount,
              discountPercentage: offer.discountPercentage
            }))
          });
          
          // 2. Trending Services - High rated services (rating >= 4.5)
          const highRatedShops = shopsWithoutDiscounts
            .filter(shop => (shop.rating || 4.5) >= 4.5)
            .sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5))
            .slice(0, 6);
          trendingServices = highRatedShops.map(shop => transformShopToService(shop, false));
          
          // 3. Popular Services - Most reviewed services
          const mostReviewedShops = shopsWithoutDiscounts
            .filter(shop => !highRatedShops.includes(shop)) // Exclude trending ones
            .sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0))
            .slice(0, 6);
          popularServices = mostReviewedShops.map(shop => transformShopToService(shop, false));
          
          // 4. Recommended Services - Remaining services (newest or random)
          const remainingShops = shopsWithoutDiscounts
            .filter(shop => !highRatedShops.includes(shop) && !mostReviewedShops.includes(shop))
            .slice(0, 6);
          recommendedServices = remainingShops.map(shop => transformShopToService(shop, false));
      } catch (shopError) {
        console.warn('⚠️ Could not fetch shops for popular services:', shopError);
      }

      // Calculate stats
      const totalCategories = categoriesResponse.data?.length || 0;
      const totalServices = categoriesResponse.data?.reduce((sum, cat) => sum + cat.service_count, 0) || 0;
      const totalProviders = popularServices.length;
      const avgRating = popularServices.length > 0 
        ? popularServices.reduce((sum, service) => sum + service.rating, 0) / popularServices.length 
        : 4.5;

      const homeData = {
        categories: categoriesResponse.data || [],
        promotions: [], // No promotions for now
        specialOffers: specialOffers,
        trendingServices: trendingServices,
        popularServices: popularServices,
        recommendedServices: recommendedServices,
        upcomingBookings: [],
        stats: {
          totalServices,
          totalCategories,
          totalProviders,
          avgRating: Number(avgRating.toFixed(1))
        }
      };

      console.log('✅ Home data loaded successfully:', {
        categories: homeData.categories.length,
        specialOffers: homeData.specialOffers.length,
        trending: homeData.trendingServices.length,
        popular: homeData.popularServices.length,
        recommended: homeData.recommendedServices.length,
        stats: homeData.stats
      });

      setHomeData(homeData);
      
    } catch (err) {
      console.error('❌ Error loading home data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // Always provide fallback data even on error
      const fallbackData = {
        categories: [],
        promotions: [],
        specialOffers: [],
        trendingServices: [],
        popularServices: [],
        recommendedServices: [],
        upcomingBookings: [],
        stats: {
          totalServices: 0,
          totalCategories: 0,
          totalProviders: 0,
          avgRating: 4.5
        }
      };
      
      // Try to get at least the default categories
      try {
        const categoriesResponse = await categoryAPI.getAllCategories();
        if (categoriesResponse.data) {
          fallbackData.categories = categoriesResponse.data;
          fallbackData.stats.totalCategories = categoriesResponse.data.length;
        }
      } catch (fallbackError) {
        console.error('❌ Could not load even fallback categories:', fallbackError);
      }
      
      setHomeData(fallbackData);
    } finally {
      console.log('🏁 fetchHomeData finally block - stopping loading');
      setIsLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false; // Clear fetch lock
      console.log('✅ Loading state cleared, isFetchingRef reset');
    }
  }, [authLoading, premiumLoading, user?.id, isPremium, subscription, currentLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reload user data first to get fresh profile
    if (refreshUser) {
      await refreshUser();
    }
    fetchHomeData();
  }, [fetchHomeData, refreshUser]);

  useEffect(() => {
    // Load fresh user data on mount, but only after auth is ready
    console.log('🏠 HomeScreen useEffect - Auth states:', {
      authLoading,
      premiumLoading,
      user: !!user,
      userId: user?.id
    });
    
    if (authLoading || premiumLoading) {
      console.log('⏳ Waiting for auth/premium to complete...');
      setIsLoading(true); // Ensure loading state is shown while waiting
      return;
    }

    // Get current location when component mounts
    getCurrentLocation();

    // Simple data fetch without reloadUserData to prevent circular calls
    console.log('📦 Fetching home data on mount...');
    fetchHomeData().catch((error) => {
      console.error('❌ Error in fetchHomeData:', error);
      setIsLoading(false); // Ensure loading stops even if there's an error
    });
  }, [authLoading, premiumLoading, user?.id]);

  // Refetch data when location changes
  useEffect(() => {
    if (currentLocation && !authLoading && !premiumLoading) {
      console.log('📍 Location changed, refetching data with radius filter...');
      fetchHomeData();
    }
  }, [currentLocation]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('🔄 App state changing from', appState.current, 'to', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 App has come to the foreground - refreshing data');
        setAppStateVisible(nextAppState);
        
        // Refresh critical data when app comes to foreground
        if (user) {
          // Reload user data to ensure fresh session
          refreshUser();
        }
        
        // Refresh home data
        if (!isLoading) {
          fetchHomeData();
        }
        
        // Refresh location if available
        if (currentLocation) {
          requestLocationPermission();
        }
      } else if (nextAppState === 'background') {
        console.log('📱 App going to background');
        setAppStateVisible(nextAppState);
        
        // Clear any sensitive data or timers if needed
        setShowSearchResults(false);
        setSearchQuery('');
      }
      
      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, [user, isLoading, currentLocation, fetchHomeData, refreshUser, requestLocationPermission]);

  // Search through loaded data locally
  const searchLoadedData = useCallback((query) => {
    console.log('🔍 Searching for:', query);
    console.log('📊 Available data:', {
      categories: homeData.categories.length,
      services: homeData.popularServices.length
    });

    if (!query.trim()) {
      return {
        categories: [],
        services: [],
        professionals: []
      };
    }

    const searchTerm = query.toLowerCase().trim();
    console.log('🔍 Search term:', searchTerm);

    // Search categories
    const matchedCategories = homeData.categories.filter(category => {
      const nameMatch = category.name.toLowerCase().includes(searchTerm);
      const descMatch = category.description ? category.description.toLowerCase().includes(searchTerm) : false;
      console.log(`Category ${category.name}: nameMatch=${nameMatch}, descMatch=${descMatch}`);
      return nameMatch || descMatch;
    });

    // Search services
    const matchedServices = homeData.popularServices.filter(service => {
      const nameMatch = service.name.toLowerCase().includes(searchTerm);
      const descMatch = service.description.toLowerCase().includes(searchTerm);
      const profMatch = service.professional_name.toLowerCase().includes(searchTerm);
      const salonMatch = service.salon_name.toLowerCase().includes(searchTerm);
      console.log(`Service ${service.name}: nameMatch=${nameMatch}, descMatch=${descMatch}, profMatch=${profMatch}, salonMatch=${salonMatch}`);
      return nameMatch || descMatch || profMatch || salonMatch;
    });

    // Extract professionals from services
    const professionals = homeData.popularServices.map(service => ({
      id: `${service.professional_name}-${service.salon_name}`,
      name: service.professional_name,
      salon: service.salon_name,
      rating: service.rating,
      location: service.location,
      image: service.image
    }));

    const matchedProfessionals = professionals.filter(professional => {
      const nameMatch = professional.name.toLowerCase().includes(searchTerm);
      const salonMatch = professional.salon.toLowerCase().includes(searchTerm);
      console.log(`Professional ${professional.name}: nameMatch=${nameMatch}, salonMatch=${salonMatch}`);
      return nameMatch || salonMatch;
    });

    const results = {
      categories: matchedCategories,
      services: matchedServices,
      professionals: matchedProfessionals
    };

    console.log('🎯 Search results:', {
      categories: results.categories.length,
      services: results.services.length,
      professionals: results.professionals.length
    });

    return results;
  }, [homeData]);

  // Handle search query changes - SINGLE VERSION ONLY
  const handleSearchQueryChange = useCallback(async (query) => {
    console.log('🔄 Search query changed:', query);
    setSearchQuery(query);
    
    if (!query.trim()) {
      console.log('❌ Empty query, hiding results');
      setShowSearchResults(false);
      setSearchResults({
        categories: [],
        services: [],
        professionals: []
      });
      return;
    }

    console.log('🔍 Performing local search...');
    // First: Search through loaded data for instant results
    const localResults = searchLoadedData(query);
    console.log('📋 Local results:', localResults);
    
    setSearchResults(localResults);
    
    // Show results if we have any matches OR if query is long enough for API call
    const hasLocalResults = localResults.categories.length > 0 || 
                           localResults.services.length > 0 || 
                           localResults.professionals.length > 0;
    
    if (hasLocalResults || query.trim().length >= 2) {
      console.log('✅ Showing search results');
      setShowSearchResults(true);
    }

    // Second: Fetch additional data from API if query is substantial
    if (query.trim().length >= 2) {
      console.log('🌐 Calling API for additional results...');
      setIsSearching(true);
      
      try {
        // Call API for more comprehensive search results
        const [servicesResponse, categoriesResponse] = await Promise.all([
          api.searchServices(query.trim(), {
            limit: 10,
            sortBy: 'relevance'
          }),
          api.searchCategories(query.trim())
        ]);

        console.log('🎯 API responses:', {
          services: servicesResponse.data?.services?.length || 0,
          categories: categoriesResponse.data?.categories?.length || 0
        });

        // Merge API results with local results
        const apiServices = servicesResponse.data?.services || [];
        const apiCategories = categoriesResponse.data?.categories || [];

        // Filter out duplicates and merge
        const mergedServices = [
          ...localResults.services,
          ...apiServices.filter(apiService => 
            !localResults.services.some(localService => localService.id === apiService.id)
          )
        ];

        const mergedCategories = [
          ...localResults.categories,
          ...apiCategories.filter(apiCategory => 
            !localResults.categories.some(localCategory => localCategory.id === apiCategory.id)
          )
        ];

        const finalResults = {
          categories: mergedCategories,
          services: mergedServices,
          professionals: localResults.professionals
        };

        console.log('🎯 Final merged results:', {
          categories: finalResults.categories.length,
          services: finalResults.services.length,
          professionals: finalResults.professionals.length
        });

        setSearchResults(finalResults);

      } catch (error) {
        console.error('❌ Error fetching search results:', error);
        // Keep local results if API fails
      } finally {
        setIsSearching(false);
      }
    }
  }, [searchLoadedData]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { 
        query: searchQuery.trim(),
        initialResults: searchResults
      });
      setShowSearchResults(false);
    }
  }, [searchQuery, searchResults, navigation]);

  // Handle search result item press
  const handleSearchResultPress = useCallback((type, item) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    switch (type) {
      case 'service':
        handleServicePress(item);
        break;
      case 'category':
        handleCategoryPress(item);
        break;
      case 'professional':
        navigation.navigate('Search', {
          query: item.name,
          filter: 'professional'
        });
        break;
      default:
        break;
    }
  }, [navigation]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults({
      categories: [],
      services: [],
      professionals: []
    });
  }, []);

  // Fetch shops for a specific category
  const fetchCategoryShops = useCallback(async (category: Category) => {
    console.log('🏪 Fetching shops for category:', category.name);
    
    const categoryKey = category.name;
    setLoadingCategories(prev => new Set(prev.add(categoryKey)));
    
    try {
      const result = await shopAPI.getShopsByCategory(category.name);
      
      if (result.error || !result.data) {
        console.error('❌ Error fetching category shops:', result.error);
        return;
      }
      
      setCategoryShops(prev => ({
        ...prev,
        [categoryKey]: result.data || []
      }));
      
      console.log('✅ Successfully fetched shops for category:', {
        category: categoryKey,
        count: result.data?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Unexpected error fetching category shops:', error);
    } finally {
      setLoadingCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryKey);
        return newSet;
      });
    }
  }, []);

  // Handle category expansion/collapse
  const handleCategoryExpand = useCallback(async (category: Category) => {
    const categoryKey = category.name;
    const isExpanded = expandedCategories.has(categoryKey);
    
    if (isExpanded) {
      // Collapse category
      setExpandedCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryKey);
        return newSet;
      });
    } else {
      // Expand category
      setExpandedCategories(prev => new Set(prev.add(categoryKey)));
      
      // Fetch shops if not already fetched
      if (!categoryShops[categoryKey]) {
        await fetchCategoryShops(category);
      }
    }
  }, [expandedCategories, categoryShops, fetchCategoryShops]);

  // Handle category press (navigate to full category view)
  const handleCategoryPress = (category: Category) => {
    console.log('Category pressed:', category.name);
    navigation.navigate('ServiceList', {
      category: category.name,
      categoryId: category.id
    });
  };

  // Handle shop press
  const handleShopPress = useCallback((shop: Shop) => {
    console.log('Shop pressed:', shop.name);
    // Navigate to shop details or service list
    navigation.navigate('ServiceList', {
      category: shop.category,
      categoryId: shop.category.toLowerCase().replace(/\s+/g, '-'),
      shopId: shop.id
    });
  }, [navigation]);

  // Handle service press
  const handleServicePress = (service: Service) => {
    console.log('Service pressed:', service.name);
    navigation.navigate('ServiceDetail', {
      serviceId: service.id
    });
  };

  // Handle view all popular services
  const handleViewAllPopularServices = () => {
    navigation.navigate('ServiceList', {
      category: 'Popular Services',
      categoryId: 'popular',
      showPopular: true,
      servicesData: homeData.popularServices
    });
  };

  // Handle view all special offers
  const handleViewAllSpecialOffers = () => {
    navigation.navigate('ServiceList', {
      category: 'Special Offers',
      categoryId: 'special-offers',
      showPopular: false,
      servicesData: homeData.specialOffers
    });
  };

  // Handle view all trending services
  const handleViewAllTrending = () => {
    navigation.navigate('ServiceList', {
      category: 'Trending Services',
      categoryId: 'trending',
      showPopular: false,
      servicesData: homeData.trendingServices
    });
  };

  // Handle view all recommended services
  const handleViewAllRecommended = () => {
    navigation.navigate('ServiceList', {
      category: 'Recommended Services',
      categoryId: 'recommended',
      showPopular: false,
      servicesData: homeData.recommendedServices
    });
  };

  // Handle promotion press
  const handlePromotionPress = (promotion: Promotion) => {
    Alert.alert(
      promotion.title,
      `${promotion.description}\n\nCode: ${promotion.code}\nDiscount: ${promotion.discount_percentage}%`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use Code', onPress: () => console.log('Using promo code:', promotion.code) }
      ]
    );
  };

  const renderCategoryCard = ({ item: category }: { item: Category }) => {
    const categoryKey = category.name;
    const isExpanded = expandedCategories.has(categoryKey);
    const shops = categoryShops[categoryKey] || [];
    const isLoading = loadingCategories.has(categoryKey);
    
    return (
      <View style={styles.categoryContainer}>
        <TouchableOpacity
          style={[styles.categoryCard, { backgroundColor: category.color || '#FFFFFF' }]}
          onPress={() => handleCategoryPress(category)}
          activeOpacity={0.8}
        >
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              style={styles.categoryImage}
              resizeMode="cover"
              onError={() => console.log('Image error for:', category.name)}
            />
          ) : (
            <View style={styles.categoryImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#1A2533" />
            </View>
          )}
          <Text style={styles.categoryName}>{category.name}</Text>
        </TouchableOpacity>

      </View>
    );
  };

  const renderPromotionCard = ({ item: promotion }: { item: Promotion }) => (
    <TouchableOpacity
      style={styles.promotionCard}
      onPress={() => handlePromotionPress(promotion)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: promotion.image }}
        style={styles.promotionImage}
        resizeMode="cover"
      />
      <View style={styles.promotionContent}>
        <View style={styles.promotionBadge}>
          <Text style={styles.promotionBadgeText}>{promotion.discount_percentage}% OFF</Text>
        </View>
        <Text style={styles.promotionTitle}>{promotion.title}</Text>
        <Text style={styles.promotionDescription}>{promotion.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderServiceCard = ({ item: service }: { item: Service }) => {
    // Debug: Log service data in the renderer
    console.log('🎨 Rendering service card:', service.name, {
      hasDiscount: service.hasDiscount,
      isSpecialOffer: service.isSpecialOffer,
      discountPercentage: service.discountPercentage,
      rating: service.rating,
      reviews_count: service.reviews_count
    });
    
    return (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServicePress(service)}
      activeOpacity={0.8}
    >
      {service.image ? (
        <Image
          source={{ uri: service.image }}
          style={styles.serviceImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.serviceImagePlaceholder}>
          <Ionicons name="cut-outline" size={32} color="#1A2533" />
        </View>
      )}
      
      {/* Badges */}
      <View style={styles.serviceBadgeContainer}>
        {service.isSpecialOffer && (
          <View style={styles.specialOfferBadge}>
            <Text style={styles.specialOfferBadgeText}>SPECIAL OFFER</Text>
          </View>
        )}
        {service.hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{service.discountPercentage}% OFF</Text>
          </View>
        )}
      </View>
      
      <View style={styles.serviceContent}>
        <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
        <Text style={styles.serviceProfessional} numberOfLines={1}>
          {service.professional_name}
        </Text>
        <View style={styles.serviceRating}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{service.rating}</Text>
          <Text style={styles.reviewsText}>({service.reviews_count})</Text>
        </View>
        <View style={styles.serviceFooter}>
          <View style={styles.servicePriceContainer}>
            {service.hasDiscount && service.originalPrice ? (
              <>
                <Text style={styles.serviceOriginalPrice}>{formatCurrency(service.originalPrice)}</Text>
                <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
              </>
            ) : (
              <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
            )}
          </View>
          <Text style={styles.serviceDuration}>{service.duration} min</Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderUpcomingBooking = ({ item: booking }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard} activeOpacity={0.8}>
      <View style={styles.bookingLeft}>
        <View style={styles.bookingIcon}>
          <Ionicons name="calendar" size={20} color="#1A2533" />
        </View>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingService}>{booking.service_name}</Text>
          <Text style={styles.bookingProfessional}>{booking.professional_name}</Text>
          <Text style={styles.bookingTime}>
            {new Date(booking.date).toLocaleDateString('sv-SE')} • {booking.time}
          </Text>
        </View>
      </View>
      <View style={[styles.bookingStatus, 
        booking.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending
      ]}>
        <Text style={[styles.statusText, 
          booking.status === 'confirmed' ? styles.statusConfirmedText : styles.statusPendingText
        ]}>
          {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Only show loading if auth is still loading or we have no data yet AND we're still loading
  // Don't wait for premiumLoading to prevent blocking the UI
  if ((isLoading || authLoading) && homeData.categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1A2533" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error && homeData.categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchHomeData} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
      
      {/* Mock Data Banner */}
      <MockDataBanner context="Home Screen" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerGreeting}>
            Hello {getDisplayName()}! 👋
          </Text>
          <Text style={styles.headerTitle}>What would you like to book?</Text>
        </View>
        {(user || shouldUseMockData('MOCK_AUTH')) && (
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('ProfileTab' as never)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: getDisplayAvatar() }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#1A2533" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services or categories"
              placeholderTextColor="#1A2533"
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#1A2533" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search Results Dropdown */}
          {showSearchResults && (
            <View style={styles.searchResultsContainer}>
              <ScrollView style={styles.searchResultsScroll} keyboardShouldPersistTaps="handled">
                
                {/* Debug info - remove in production */}
                {__DEV__ && (
                  <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                      Debug: Categories({searchResults.categories.length}) 
                      Services({searchResults.services.length}) 
                      Professionals({searchResults.professionals.length})
                    </Text>
                  </View>
                )}
                
                {/* Categories Results */}
                {searchResults.categories.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Categories</Text>
                    {searchResults.categories.slice(0, 3).map((category, index) => (
                      <TouchableOpacity
                        key={`search-category-${category.id}-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultPress('category', category)}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons name="grid-outline" size={16} color="#1A2533" />
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultTitle}>{category.name}</Text>
                          <Text style={styles.searchResultSubtitle}>{category.service_count} services</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Services Results */}
                {searchResults.services.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Services</Text>
                    {searchResults.services.slice(0, 4).map((service, index) => (
                      <TouchableOpacity
                        key={`search-service-${service.id}-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultPress('service', service)}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons name="cut-outline" size={16} color="#1A2533" />
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultTitle}>{service.name}</Text>
                          <Text style={styles.searchResultSubtitle}>
                            {service.professional_name} • {formatCurrency(service.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Professionals Results */}
                {searchResults.professionals.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Providers</Text>
                    {searchResults.professionals.slice(0, 3).map((professional, index) => (
                      <TouchableOpacity
                        key={`search-professional-${professional.id}-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultPress('professional', professional)}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons name="person-outline" size={16} color="#1A2533" />
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultTitle}>{professional.name}</Text>
                          <Text style={styles.searchResultSubtitle}>{professional.salon}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No results message */}
                {searchResults.categories.length === 0 && 
                 searchResults.services.length === 0 && 
                 searchResults.professionals.length === 0 && 
                 searchQuery.length >= 2 && !isSearching && (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={32} color="#1A2533" />
                    <Text style={styles.noResultsTitle}>No results</Text>
                    <Text style={styles.noResultsText}>
                      Try different keywords or browse categories
                    </Text>
                  </View>
                )}

                {/* Show More Results Button */}
                {(searchResults.categories.length > 0 || searchResults.services.length > 0 || searchResults.professionals.length > 0) && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={handleSearch}
                  >
                    <Text style={styles.showMoreButtonText}>
                      See all results for "{searchQuery}"
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#1A2533" />
                  </TouchableOpacity>
                )}

                {/* Loading indicator */}
                {isSearching && (
                  <View style={styles.searchLoadingContainer}>
                    <ActivityIndicator size="small" color="#1A2533" />
                    <Text style={styles.searchLoadingText}>Searching...</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            <Ionicons name="location-outline" size={14} color="#1A2533" style={styles.locationIcon} />
            {locationLoading ? (
              <ActivityIndicator size="small" color="#1A2533" style={{ marginLeft: 4 }} />
            ) : (
              <Text style={styles.locationText}>
                {currentLocation 
                  ? `${currentLocation.city || 'Current Location'} (40 km radius)`
                  : 'Tap to get location'
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1A2533']}
            tintColor="#1A2533"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Special Offers - TOP PRIORITY */}
        {homeData.specialOffers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={[styles.sectionTitle, styles.specialOfferTitle]}>🔥 Special Offers</Text>
                <MockDataIndicator context="Offers" />
              </View>
              <TouchableOpacity onPress={handleViewAllSpecialOffers}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.specialOffers}
              renderItem={renderServiceCard}
              keyExtractor={(item, index) => `special-offers-${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        {/* Upcoming Bookings */}
        {user && homeData.upcomingBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
              <TouchableOpacity onPress={() => console.log('Navigate to Bookings')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.upcomingBookings}
              renderItem={renderUpcomingBooking}
              keyExtractor={(item, index) => `upcoming-bookings-${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookingsList}
            />
          </View>
        )}

        {/* Active Promotions */}
        {homeData.promotions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Offers</Text>
            </View>
            <FlatList
              data={homeData.promotions}
              renderItem={renderPromotionCard}
              keyExtractor={(item, index) => `promotions-${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promotionsList}
            />
          </View>
        )}

        {/* Trending Services */}
        {homeData.trendingServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Trending</Text>
                <MockDataIndicator context="Trending" />
              </View>
              <TouchableOpacity onPress={handleViewAllTrending}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.trendingServices}
              renderItem={renderServiceCard}
              keyExtractor={(item, index) => `trending-services-${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>
          <View style={styles.categoriesContainer}>
            {homeData.categories.map((category, index) => (
              <View key={`categories-${category.id}-${index}`} style={styles.categoryWrapper}>
                {renderCategoryCard({ item: category })}
              </View>
            ))}
          </View>
        </View>

        {/* Popular Services */}
        {homeData.popularServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Popular Services</Text>
                <MockDataIndicator context="Popular" />
              </View>
              <TouchableOpacity onPress={handleViewAllPopularServices}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.popularServices}
              renderItem={renderServiceCard}
              keyExtractor={(item, index) => `popular-services-${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        {/* Recommended Services */}
        {homeData.recommendedServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended</Text>
              <TouchableOpacity onPress={handleViewAllRecommended}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={homeData.recommendedServices}
              renderItem={renderServiceCard}
              keyExtractor={(item, index) => `recommended-services-${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Member App Switch Button */}
      <MemberAppSwitchButton position="bottom-right" />
      
      {/* Test Button - Simple */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#FF5722',
          padding: 15,
          borderRadius: 25,
          zIndex: 1000,
        }}
        onPress={() => {
          console.log('Test button pressed!');
          Alert.alert('Test', 'Simple test button works!');
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>TEST</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Base: Soft Mint Cream
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F0FFFE', // Base: Soft Mint Cream
  },
  headerContent: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 16,
    color: '#1A2533', // Primary: Vibrant Teal
    marginBottom: 4,
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2533', // Primary: Vibrant Teal
    letterSpacing: -0.5,
  },
  debugText: {
    fontSize: 10,
    color: '#1A2533',
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  // Search Section Styles
  searchSection: {
    backgroundColor: '#F0FFFE',
    paddingBottom: 16,
    zIndex: 1000, // Ensure search section is above other content
    elevation: 10, // For Android
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'relative', // Important for absolute positioning of dropdown
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#1A2533', // Primary: Vibrant Teal
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
    color: '#1A2533', // Primary: Vibrant Teal
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  // Search Results Styles
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 999, // Very high elevation for Android
    zIndex: 9999, // Very high z-index for iOS
  },
  searchResultsScroll: {
    maxHeight: 400,
  },
  searchResultSection: {
    paddingVertical: 8,
  },
  searchResultSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0FFFE',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: '#1A2533',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: '#F0FFFE',
  },
  showMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginRight: 8,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  searchLoadingText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 8,
  },
  // Debug styles - remove in production
  debugInfo: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    margin: 8,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#1A2533',
    textAlign: 'center',
  },
  // No results styles
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 12,
    marginBottom: 4,
  },
  noResultsText: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#F8FFFE', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  locationIcon: {
    marginRight: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Base: Soft Mint Cream
    zIndex: 1, // Lower z-index than search
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533', // Primary: Vibrant Teal
  },
  specialOfferTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626', // Bright red for emphasis
  },
  seeAllText: {
    fontSize: 14,
    color: '#1A2533', // Primary: Vibrant Teal
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: horizontalPadding,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryWrapper: {
    width: cardWidth,
    marginBottom: 16,
  },
  categoryContainer: {
    width: '100%',
  },
  categoryCard: {
    width: '100%',
    aspectRatio: 1.1, // Slightly taller for better proportions
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F8FFFE', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  categoryImage: {
    width: '75%',
    height: '55%',
    borderRadius: 12,
    marginBottom: 10,
  },
  categoryImagePlaceholder: {
    width: '75%',
    height: '55%',
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533', // Primary: Vibrant Teal
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  expandButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopListContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shopLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  shopLoadingText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 8,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shopImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  shopAddress: {
    fontSize: 12,
    color: '#1A2533',
    marginBottom: 4,
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopRatingText: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 4,
    fontWeight: '500',
  },
  shopDistance: {
    fontSize: 12,
    color: '#1A2533',
  },
  shopSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },
  noShopsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noShopsText: {
    fontSize: 14,
    color: '#1A2533',
    fontStyle: 'italic',
  },
  viewAllShopsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginHorizontal: 12,
    backgroundColor: '#F0FFFE',
    borderRadius: 8,
  },
  viewAllShopsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
    marginRight: 4,
  },
  promotionsList: {
    paddingHorizontal: 20,
  },
  promotionCard: {
    width: promotionWidth,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F8FFFE', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  promotionImage: {
    width: '40%',
    height: '100%',
  },
  promotionContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  promotionBadge: {
    backgroundColor: '#845EC2', // Accent: Living Coral
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  promotionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 8,
  },
  promotionDescription: {
    fontSize: 12,
    color: '#1A2533',
    marginTop: 4,
  },
  servicesList: {
    paddingHorizontal: 20,
  },
  serviceCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    height: 120,
  },
  serviceImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceContent: {
    padding: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  serviceProfessional: {
    fontSize: 12,
    color: '#1A2533',
    marginBottom: 8,
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 4,
    fontWeight: '500',
  },
  reviewsText: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceBadgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  specialOfferBadge: {
    backgroundColor: '#845EC2', // Accent: Living Coral
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  specialOfferBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: '#EF4444', // Pop: Red
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  discountBadgeText: {
    color: '#1A2533', // Primary: Vibrant Teal for better contrast
    fontSize: 10,
    fontWeight: '700',
  },
  servicePriceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  serviceOriginalPrice: {
    fontSize: 12,
    fontWeight: '400',
    color: '#1A2533',
    textDecorationLine: 'line-through',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#1A2533',
  },
  bookingsList: {
    paddingHorizontal: 20,
  },
  bookingCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  bookingProfessional: {
    fontSize: 12,
    color: '#1A2533',
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 12,
    color: '#1A2533',
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E8',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statusConfirmedText: {
    color: '#4CAF50',
  },
  statusPendingText: {
    color: '#FF9800',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1A2533',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
});

export default HomeScreen;