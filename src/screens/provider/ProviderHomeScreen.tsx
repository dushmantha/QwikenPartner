import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
  FlatList,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../navigation/AppNavigator';
import { usePremium } from '../../contexts/PremiumContext';
import UpgradeModal from '../../components/UpgradeModal';
import { CancellationBanner } from '../../components/CancellationBanner';
import { authService } from '../../lib/supabase/index';
// Lazy import to improve startup performance
let normalizedShopService: any;
const getShopService = async () => {
  if (!normalizedShopService) {
    normalizedShopService = (await import('../../lib/supabase/normalized')).normalizedShopService;
  }
  return normalizedShopService;
};
import { reviewsAPI } from '../../services/api/reviews/reviewsAPI';
import { responseTimeAPI, responseTimeUtils } from '../../services/api/responseTime/responseTimeAPI';
import { shouldUseMockData, logMockUsage } from '../../config/devConfig';
import { MOCK_USERS } from '../../data/mockData';
import 'react-native-get-random-values';

const { width } = Dimensions.get('window');

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Import navigation types
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp, RouteProp } from '@react-navigation/stack';

// Define navigation types
type RootStackParamList = {
  ShopDetails: {
    shop?: ShopDetails;
    onSave?: (shop: ShopDetails) => void;
  } | undefined;
  Subscription: undefined;
  Notifications: undefined;
  Analytics: undefined;
  Calendar: undefined;
  Earnings: undefined;
  Customers: undefined;
  ProviderTabs: {
    screen?: 'ProviderHomeTab' | 'QueueTab' | 'ServicesTab' | 'EarningsTab' | 'ProfileTab';
    params?: {
      newShop?: any;
    };
  } | undefined;
};

type ProviderHomeRouteProp = RouteProp<RootStackParamList, 'ProviderTabs'>;

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Types for API data
interface DashboardStats {
  totalEarnings: number;
  activeJobs: number;
  completedJobs: number;
  customerRating: number;
  pendingBookings: number;
  thisMonthEarnings: number;
  responseRate: number;
  totalCustomers: number;
  averageJobValue: number;
  growthPercentage: number;
  weeklyBookings: number;
  monthlyGrowth: number;
  // Monthly overview stats
  thisMonthBookings?: number;
  thisMonthCompletedJobs?: number;
  thisMonthActiveBookings?: number;
  thisMonthCustomers?: number;
  thisMonthAverageJobValue?: number;
  // Rating and response stats
  totalReviews?: number;
  averageResponseTimeMinutes?: number;
  averageResponseTime?: string;
  // Response time statistics
  responseTimeStats?: {
    avg_response_time_minutes: number;
    response_rate: number;
    min_response_time: number;
    max_response_time: number;
    total_bookings: number;
    responded_bookings: number;
    excellent_responses: number;
    good_responses: number;
    fair_responses: number;
    poor_responses: number;
  };
  // Review statistics
  reviewStats?: {
    total_reviews: number;
    average_rating: number;
    total_businesses_with_reviews: number;
    businesses: Array<{
      provider_business_id: string;
      business_name: string;
      total_reviews: number;
      average_rating: number;
      latest_review_date: string;
    }>;
  };
}

interface ActivityItem {
  id: string;
  type: 'job_completed' | 'new_booking' | 'payment_received' | 'review_received' | 'schedule_updated' | 'customer_message';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  rating?: number;
  customer?: string;
  priority?: 'high' | 'medium' | 'low';
}

// Define the Shop interface
interface Shop {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  category: string;
  rating: number;
  reviews_count: number;
  is_active: boolean;
  total_services: number;
  staff_count: number;
  monthly_revenue: number;
  certificate_images: string[];
  business_hours: {
    start: string;
    end: string;
  };
  contact_info: {
    phone: string;
    email: string;
    website?: string;
  };
  created_at: string;
  address: string;
  isActive: boolean;
  openingHours: string;
  services: string[];
  imageUrl?: string;
  phone: string;
  email: string;
}

interface ShopDetails {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  isActive: boolean;
  openingHours: string;
  services: string[];
  imageUrl?: string;
}

interface Notification {
  id: string;
  type: 'booking' | 'payment' | 'review' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read_at: string | null;
  priority: 'high' | 'medium' | 'low';
}

// Combined API response interface
interface ProviderDashboardData {
  stats: DashboardStats;
  activity: ActivityItem[];
  shops: Shop[];
  notifications: Notification[];
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  backgroundColor: string;
  action: () => void;
}

const ProviderHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProviderHomeRouteProp>();
  const { isPremium } = usePremium();
  const { user } = useAuth();
  
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalEarnings: 0,
    activeJobs: 0,
    completedJobs: 0,
    customerRating: 0,
    pendingBookings: 0,
    thisMonthEarnings: 0,
    responseRate: 0,
    totalCustomers: 0,
    averageJobValue: 0,
    growthPercentage: 0,
    weeklyBookings: 0,
    monthlyGrowth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Fetch profile data using the same pattern as ProfileScreen
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const shopService = await getShopService();
        if (shopService) {
          const profileResponse = await shopService.getUserProfile();
          if (profileResponse.success && profileResponse.data) {
            setProfile(profileResponse.data);
            setAvatarLoadError(false);
            console.log('✅ Profile loaded for ProviderHome:', profileResponse.data.full_name);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

  // Helper functions for mock data
  const getDisplayName = () => {
    if (shouldUseMockData('MOCK_AUTH')) {
      const mockUser = MOCK_USERS[0];
      return `${mockUser.firstName} ${mockUser.lastName}`;
    }
    
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
           'Provider';
  };

  const getAvatarUrl = () => {
    if (shouldUseMockData('MOCK_AUTH')) {
      return MOCK_USERS[0].avatar;
    }
    
    return profile?.avatar_url || 
           user?.user_metadata?.avatar_url ||
           user?.user_metadata?.picture || 
           null;
  };

  const getAvatarInitial = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  // Provider API service - Using real Supabase data
  const providerAPI = {
    async getDashboardData(providerId: string): Promise<ProviderDashboardData> {
      try {
        console.log('📊 Fetching real dashboard data from Supabase...');
        
        // Get shop service lazily
        const shopService = await getShopService();
        
        // Get real data in parallel
        const [shopsResponse, statsResponse, activityResponse, revenueResponse, shopStatsResponse, reviewStatsResponse] = await Promise.all([
          // Get shops
          authService.getProviderBusinesses(providerId),
          // Get dashboard stats
          shopService.getDashboardStats(providerId),
          // Get activity feed
          shopService.getActivityFeed(providerId, 10),
          // Get monthly revenue for shops
          shopService.getShopMonthlyRevenue(),
          // Get shop statistics (rating, reviews, staff, services)
          shopService.getShopStatistics(),
          // Get review statistics
          reviewsAPI.getAllProviderReviewStats(providerId)
        ]);
        
        // Temporarily disabled until database migration is deployed
        const responseTimeResponse = { success: false, data: null };
        
        console.log('📥 Shops response:', shopsResponse);
        console.log('📊 Stats response:', statsResponse);
        console.log('📋 Activity response:', activityResponse);
        console.log('💰 Revenue response:', revenueResponse);
        console.log('📊 Shop statistics response:', shopStatsResponse);
        console.log('⭐ Review statistics response:', reviewStatsResponse);
        console.log('⏱️ Response time statistics response:', responseTimeResponse);
        
        // Debug: Check if revenue response has any data
        if (revenueResponse.success && revenueResponse.data) {
          console.log('✅ Revenue data found:', revenueResponse.data.length, 'entries');
          revenueResponse.data.forEach(item => {
            console.log(`💰 Shop ${item.shop_id}: $${item.monthly_revenue}`);
          });
        } else {
          console.log('❌ No revenue data found. Error:', revenueResponse.error);
        }
        
        let realShops: Shop[] = [];
        
        if (shopsResponse.success && shopsResponse.data) {
          console.log('✅ Real shops data received:', shopsResponse.data);
          
          // Create revenue lookup map
          const revenueMap = new Map<string, number>();
          if (revenueResponse.success && revenueResponse.data) {
            console.log('💰 Raw revenue data:', revenueResponse.data);
            revenueResponse.data.forEach(item => {
              if (item.shop_id) {
                revenueMap.set(item.shop_id, item.monthly_revenue);
                console.log(`💰 Added to revenue map: ${item.shop_id} = $${item.monthly_revenue}`);
              } else {
                console.warn('⚠️ Revenue item missing shop_id:', item);
              }
            });
            console.log('💰 Final revenue map:', Object.fromEntries(revenueMap));
          } else {
            console.error('❌ Revenue response failed:', revenueResponse.error);
          }

          // Create statistics lookup map
          const statsMap = new Map<string, {rating: number, reviews_count: number, staff_count: number, services_count: number}>();
          if (shopStatsResponse.success && shopStatsResponse.data) {
            shopStatsResponse.data.forEach(item => {
              statsMap.set(item.shop_id, {
                rating: item.rating,
                reviews_count: item.reviews_count,
                staff_count: item.staff_count,
                services_count: item.services_count
              });
            });
            console.log('📊 Statistics map created:', Object.fromEntries(statsMap));
          }
          
          // Transform provider_businesses data to Shop interface
          realShops = shopsResponse.data.map((business: any) => {
            console.log(`🏪 Processing shop: ${business.name} (ID: ${business.id})`);
            console.log(`🔍 Looking for revenue with shop_id: ${business.id}`);
            console.log(`🔍 Available revenue keys:`, Array.from(revenueMap.keys()));
            
            const monthlyRevenue = revenueMap.get(business.id) || 0;
            const shopStats = statsMap.get(business.id) || {
              rating: 0,
              reviews_count: 0,
              staff_count: 0,
              services_count: 0
            };
            
            console.log(`💰 Shop ${business.name} (${business.id}):`, {
              revenue: `$${monthlyRevenue}`,
              revenueFound: revenueMap.has(business.id),
              rating: shopStats.rating,
              reviews: shopStats.reviews_count,
              staff: shopStats.staff_count,
              services: shopStats.services_count
            });
            
            return {
              id: business.id,
              name: business.name,
              description: business.description || '',
              image: business.image_url || business.logo_url || '',
              location: business.address ? `${business.address}, ${business.city}, ${business.state}` : `${business.city || ''}, ${business.state || ''}`,
              category: business.category || 'General Services',
              rating: shopStats.rating, // Real rating from reviews
              reviews_count: shopStats.reviews_count, // Real reviews count
              is_active: business.is_active !== undefined ? business.is_active : true,
              total_services: shopStats.services_count, // Real services count from shop_services table
              staff_count: shopStats.staff_count, // Real staff count from shop_staff table
              monthly_revenue: monthlyRevenue, // Real revenue from payments table
              certificate_images: [],
              business_hours: {
                start: business.business_hours_start || '09:00',
                end: business.business_hours_end || '17:00'
              },
              contact_info: {
                phone: business.phone || '',
                email: business.email || '',
                website: business.website_url || ''
              },
              created_at: business.created_at || new Date().toISOString(),
              // Additional fields for compatibility
              city: business.city || '',
              state: business.state || '',
              address: business.address || '',
              phone: business.phone || '',
              email: business.email || '',
              website_url: business.website_url || '',
              image_url: business.image_url || business.logo_url || '',
              images: business.images || [],
              logo_url: business.logo_url || '',
              isActive: business.is_active !== undefined ? business.is_active : true,
              openingHours: `${business.business_hours_start || '09:00'} - ${business.business_hours_end || '17:00'}`,
              services: business.services?.map((s: any) => typeof s === 'string' ? s : s.name || s.title || 'Service') || [],
              imageUrl: business.image_url || business.logo_url || ''
            };
          });
          
          console.log('🏪 Transformed real shops:', realShops);
        } else {
          console.warn('⚠️ Failed to get real shops data:', shopsResponse.error);
        }
        
        // Get review statistics
        const reviewStatsData = reviewStatsResponse.success ? reviewStatsResponse.data : null;
        console.log('⭐ Review stats data:', reviewStatsData);

        // Get response time statistics
        const responseTimeStatsData = responseTimeResponse.success ? responseTimeResponse.data : null;
        console.log('⏱️ Response time stats data:', responseTimeStatsData);

        // Use real stats from the API
        const realStats = statsResponse.success && statsResponse.data ? {
          ...statsResponse.data,
          reviewStats: reviewStatsData,
          responseTimeStats: responseTimeStatsData,
          // Update customer rating and total reviews from review stats if available
          customerRating: reviewStatsData?.average_rating || statsResponse.data.customerRating || 0,
          totalReviews: reviewStatsData?.total_reviews || statsResponse.data.totalReviews || 0,
          // Update response rate and response time from response time stats
          responseRate: responseTimeStatsData?.response_rate || statsResponse.data.responseRate || 0,
          averageResponseTimeMinutes: responseTimeStatsData?.avg_response_time_minutes || statsResponse.data.averageResponseTimeMinutes || 0,
          averageResponseTime: responseTimeStatsData?.avg_response_time_minutes ? 
            responseTimeUtils.formatResponseTime(responseTimeStatsData.avg_response_time_minutes) : 
            statsResponse.data.averageResponseTime || 'No data',
        } : {
          totalEarnings: 0,
          activeJobs: 0,
          completedJobs: 0,
          customerRating: reviewStatsData?.average_rating || 0,
          pendingBookings: 0,
          thisMonthEarnings: 0,
          responseRate: responseTimeStatsData?.response_rate || 0,
          totalCustomers: 0,
          averageJobValue: 0,
          growthPercentage: 0,
          weeklyBookings: 0,
          monthlyGrowth: 0,
          totalReviews: reviewStatsData?.total_reviews || 0,
          reviewStats: reviewStatsData,
          responseTimeStats: responseTimeStatsData,
          averageResponseTimeMinutes: responseTimeStatsData?.avg_response_time_minutes || 0,
          averageResponseTime: responseTimeStatsData?.avg_response_time_minutes ? 
            responseTimeUtils.formatResponseTime(responseTimeStatsData.avg_response_time_minutes) : 
            'No data',
        };
        
        console.log('📊 Final dashboard stats:', realStats);
        
        // Use real activity from the API
        const realActivity = activityResponse.success && activityResponse.data 
          ? activityResponse.data 
          : [{
              id: '1',
              type: 'system' as const,
              title: 'Welcome to Qwiken',
              description: realShops.length > 0 ? `Your shop "${realShops[0].name}" is ready for bookings!` : 'Create your first shop to start accepting bookings',
              timestamp: new Date().toISOString(),
              priority: 'medium' as const,
            }];
        
        // Basic notifications (can be enhanced later with a notifications table)
        const notifications: Notification[] = [
          {
            id: generateUUID(),
            type: 'system',
            title: 'Dashboard Updated',
            message: 'Your dashboard now shows real-time data from your business',
            timestamp: new Date().toISOString(),
            read_at: '2024-01-16T17:30:00Z',
            priority: 'low',
          }
        ];
        
        // If there are pending bookings, add a notification
        if (realStats.pendingBookings > 0) {
          notifications.unshift({
            id: generateUUID(),
            type: 'booking',
            title: 'Pending Bookings',
            message: `You have ${realStats.pendingBookings} booking${realStats.pendingBookings > 1 ? 's' : ''} waiting for approval`,
            timestamp: new Date().toISOString(),
            read_at: '2024-01-16T17:30:00Z',
            priority: 'high',
          });
        }
        
        return {
          stats: realStats,
          activity: realActivity,
          shops: realShops,
          notifications: notifications,
        };
      } catch (error) {
        console.error('❌ API Error getting real data:', error);
        // Return minimal real data structure
        return {
          stats: {
            totalEarnings: 0,
            activeJobs: 0,
            completedJobs: 0,
            customerRating: 0,
            pendingBookings: 0,
            thisMonthEarnings: 0,
            responseRate: 0,
            totalCustomers: 0,
            averageJobValue: 0,
            growthPercentage: 0,
            weeklyBookings: 0,
            monthlyGrowth: 0,
          },
          activity: [{
            id: '1',
            type: 'system',
            title: 'Welcome to Qwiken',
            description: 'Start by creating your first shop to begin accepting bookings',
            timestamp: new Date().toISOString(),
            priority: 'medium',
          }],
          shops: [],
          notifications: [{
            id: generateUUID(),
            type: 'system',
            title: 'Get Started',
            message: 'Create your first shop to start your business journey',
            timestamp: new Date().toISOString(),
            read_at: '2024-01-16T17:30:00Z',
            priority: 'medium',
          }],
        };
      }
    },

    // Mock data for development (remove this in production)
    async getMockDashboardData(): Promise<ProviderDashboardData> {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
      
      return {
        stats: {
          totalEarnings: 7455.25,
          activeJobs: 7,
          completedJobs: 342,
          customerRating: 4.9,
          pendingBookings: 12,
          thisMonthEarnings: 1626.15,
          responseRate: 98,
          totalCustomers: 156,
          averageJobValue: 38.35,
          growthPercentage: 23.5,
          weeklyBookings: 8,
          monthlyGrowth: 15.2,
        },
        activity: [
          {
            id: '1',
            type: 'payment_received',
            title: 'Payment Received',
            description: 'Premium hair styling service payment from Sarah Williams',
            timestamp: '2024-01-16T16:45:00Z',
            amount: 55.50,
            customer: 'Sarah Williams',
            priority: 'medium',
          },
          {
            id: '2',
            type: 'new_booking',
            title: 'New VIP Booking',
            description: 'Luxury spa package requested by Emma Thompson for this weekend',
            timestamp: '2024-01-16T15:30:00Z',
            customer: 'Emma Thompson',
            priority: 'high',
          },
          {
            id: '3',
            type: 'review_received',
            title: 'Excellent 5-Star Review',
            description: 'John Miller: "Outstanding service! Professional and exceeded expectations."',
            timestamp: '2024-01-16T14:20:00Z',
            rating: 5,
            customer: 'John Miller',
            priority: 'medium',
          },
          {
            id: '4',
            type: 'job_completed',
            title: 'Premium Service Completed',
            description: 'Executive manicure & pedicure package finished for Lisa Chen',
            timestamp: '2024-01-16T13:15:00Z',
            amount: 145.00,
            customer: 'Lisa Chen',
            priority: 'low',
          },
          {
            id: '5',
            type: 'customer_message',
            title: 'Customer Inquiry',
            description: 'David Brown asking about availability for corporate event services',
            timestamp: '2024-01-16T12:10:00Z',
            customer: 'David Brown',
            priority: 'high',
          },
          {
            id: '6',
            type: 'payment_received',
            title: 'Large Payment Received',
            description: 'Wedding party beauty services payment from Michelle Rodriguez',
            timestamp: '2024-01-16T11:05:00Z',
            amount: 750.00,
            customer: 'Michelle Rodriguez',
            priority: 'medium',
          },
          {
            id: '7',
            type: 'schedule_updated',
            title: 'Appointment Rescheduled',
            description: 'Tom Wilson moved his appointment to next Tuesday afternoon',
            timestamp: '2024-01-16T10:30:00Z',
            customer: 'Tom Wilson',
            priority: 'low',
          },
          {
            id: '8',
            type: 'new_booking',
            title: 'Recurring Client Booking',
            description: 'Monthly beauty maintenance package booked by Jennifer Adams',
            timestamp: '2024-01-16T09:45:00Z',
            customer: 'Jennifer Adams',
            priority: 'medium',
          },
        ],
        shops: [
          {
            id: '1',
            name: 'Elegance Beauty Studio',
            description: 'Premier beauty destination offering luxury nail care, skincare, and wellness treatments',
            image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=250&fit=crop&q=80',
            location: 'Östermalm, Stockholm',
            category: 'Beauty & Wellness',
            rating: 4.8,
            reviews_count: 287,
            is_active: true,
            total_services: 18,
            staff_count: 5,
            monthly_revenue: 8450.00,
            certificate_images: [],
            business_hours: { start: '09:00', end: '19:00' },
            contact_info: {
              phone: '+46 8 123 456 78',
              email: 'contact@elegancebeauty.se',
              website: 'www.elegancebeauty.se',
            },
            created_at: '2024-01-01T00:00:00Z',
            address: 'Östermalm, Stockholm',
            phone: '+46 8 123 456 78',
            email: 'contact@elegancebeauty.se',
            isActive: true,
            openingHours: '09:00 - 19:00',
            services: ['Beauty & Wellness'],
            imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=250&fit=crop&q=80'
          },
          {
            id: '2',
            name: 'Metropolitan Hair Lounge',
            description: 'Contemporary hair salon specializing in cutting-edge styles and premium treatments',
            image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=250&fit=crop&q=80',
            location: 'Södermalm, Stockholm',
            category: 'Hair Salon',
            rating: 4.9,
            reviews_count: 194,
            is_active: true,
            total_services: 12,
            staff_count: 3,
            monthly_revenue: 12200.00,
            certificate_images: [],
            business_hours: { start: '10:00', end: '20:00' },
            contact_info: {
              phone: '+46 8 987 654 32',
              email: 'info@methairlounge.se',
            },
            created_at: '2024-01-15T00:00:00Z',
            address: 'Södermalm, Stockholm',
            phone: '+46 8 987 654 32',
            email: 'info@methairlounge.se',
            isActive: true,
            openingHours: '10:00 - 20:00',
            services: ['Hair Salon'],
            imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=250&fit=crop&q=80'
          },
          {
            id: '3',
            name: 'Serenity Spa Retreat',
            description: 'Luxury wellness sanctuary offering therapeutic massages and holistic treatments',
            image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=250&fit=crop&q=80',
            location: 'Gamla Stan, Stockholm',
            category: 'Spa & Wellness',
            rating: 4.7,
            reviews_count: 168,
            is_active: false,
            total_services: 9,
            staff_count: 2,
            monthly_revenue: 6800.00,
            certificate_images: [],
            business_hours: { start: '09:00', end: '21:00' },
            contact_info: {
              phone: '+46 8 111 222 33',
              email: 'info@serenityspa.se',
              website: 'www.serenityspa.se',
            },
            created_at: '2024-02-01T00:00:00Z',
            address: 'Gamla Stan, Stockholm',
            phone: '+46 8 111 222 33',
            email: 'info@serenityspa.se',
            isActive: false,
            openingHours: '09:00 - 21:00',
            services: ['Spa & Wellness'],
            imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=250&fit=crop&q=80'
          },
        ],
        notifications: [
          {
            id: generateUUID(),
            type: 'booking',
            title: 'Premium Booking Request',
            message: 'VIP customer requesting exclusive spa package for tomorrow.',
            timestamp: '2024-01-16T17:30:00Z',
            read_at: '2024-01-16T17:30:00Z',
            priority: 'high',
          },
          {
            id: generateUUID(),
            type: 'payment',
            title: 'Large Payment Received',
            message: 'Payment of $750 received from wedding party services.',
            timestamp: '2024-01-16T15:15:00Z',
            read_at: '2024-01-16T17:30:00Z',
            priority: 'medium',
          },
          {
            id: generateUUID(),
            type: 'review',
            title: 'Outstanding Review',
            message: 'New 5-star review highlighting exceptional customer service.',
            timestamp: '2024-01-16T13:20:00Z',
            read_at: '2024-01-16T17:30:00Z',
            priority: 'low',
          },
          {
            id: generateUUID(),
            type: 'system',
            title: 'Monthly Report Ready',
            message: 'Your comprehensive business analytics report is available.',
            timestamp: '2024-01-16T10:00:00Z',
            read_at: '2024-01-16T10:00:00Z',
            priority: 'medium',
          },
        ],
      };
    },
  };

  // Updated quick actions configuration with new colors
  const quickActions: QuickAction[] = [
    {
      id: 'calendar',
      title: 'Schedule',
      subtitle: 'Manage bookings',
      icon: 'calendar-outline',
      color: '#1A2533',
      backgroundColor: '#EFF6FF',
      action: () => {
        navigation.navigate('ProviderTabs', { screen: 'ServicesTab' });
      },
    },
    {
      id: 'analytics',
      title: 'Analytics',
      subtitle: 'View insights',
      icon: 'analytics-outline',
      color: '#1A2533',
      backgroundColor: '#ECFDF5',
      action: () => {
        navigation.navigate('Analytics');
      },
    },
    {
      id: 'earnings',
      title: 'Earnings',
      subtitle: 'Track income',
      icon: 'trending-up-outline',
      color: '#1A2533',
      backgroundColor: '#F5F5E9',
      action: () => {
        navigation.navigate('ProviderTabs', { screen: 'EarningsTab' });
      },
    },
    {
      id: 'customers',
      title: 'Customers',
      subtitle: 'Manage clients',
      icon: 'people-outline',
      color: '#1A2533',
      backgroundColor: '#FED7AA',
      action: () => {
        navigation.navigate('Customers');
      },
    },
  ];

  // Fetch dashboard data with single API call
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use mock data only if explicitly enabled
      if (shouldUseMockData('MOCK_AUTH')) {
        console.log('🎭 Using mock dashboard data');
        logMockUsage('Loading mock provider dashboard data');
        const mockData = await providerAPI.getMockDashboardData();
        setDashboardStats(mockData.stats);
        setRecentActivity(mockData.activity);
        setMyShops(mockData.shops);
        setNotifications(mockData.notifications);
        const unreadCount = mockData.notifications.filter(n => !n.read_at).length;
        setUnreadNotifications(unreadCount);
        setIsLoading(false);
        return;
      }
      
      // Check if user is authenticated
      if (!user?.id) {
        console.warn('⚠️ No authenticated user found');
        setIsLoading(false);
        return;
      }

      console.log('🔄 Calling getDashboardData for user:', user.id);
      const dashboardData = await providerAPI.getDashboardData(user.id);
      console.log('📊 Dashboard data received:', dashboardData);
      console.log('🏪 Raw shops data:', dashboardData.shops);

      // Update all state with the single API response
      setDashboardStats(dashboardData.stats);
      setRecentActivity(dashboardData.activity);
      
      // Use shops data directly (already transformed in getDashboardData)
      console.log('🏪 Setting shops state with:', dashboardData.shops);
      setMyShops(dashboardData.shops || []);
      setNotifications(dashboardData.notifications);
      
      const unreadCount = dashboardData.notifications.filter(n => !n.read_at).length;
      setUnreadNotifications(unreadCount);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle new shop data from navigation params
  useFocusEffect(
    useCallback(() => {
      console.log('🔍 Checking for new shop data...');
      console.log('Route params:', route.params);
      console.log('Route params params:', route.params?.params);
      const newShop = route.params?.params?.newShop;
      console.log('New shop extracted:', newShop);
      
      if (newShop) {
        console.log('🏪 Received new shop data:', newShop);
        console.log('🖼️ Image data - image_url:', newShop.image_url);
        console.log('🖼️ Image data - images array:', newShop.images);
        
        // Transform the new shop data to match our Shop interface
        const transformedShop: Shop = {
          id: newShop.id,
          name: newShop.name,
          description: newShop.description || '',
          image: newShop.image_url || newShop.logo_url || '',
          location: newShop.address ? `${newShop.address}, ${newShop.city}, ${newShop.state}` : `${newShop.city}, ${newShop.state}`,
          category: newShop.category,
          // Add missing required fields
          city: newShop.city,
          state: newShop.state,
          address: newShop.address,
          phone: newShop.phone,
          email: newShop.email,
          website_url: newShop.website_url,
          image_url: newShop.image_url || '',
          images: newShop.images || [],
          rating: 0, // New shop starts with no rating
          reviews_count: 0,
          is_active: newShop.is_active,
          total_services: newShop.services?.length || 0,
          staff_count: 0, // New shop starts with no staff
          monthly_revenue: 0, // New shop starts with no revenue
          certificate_images: [],
          business_hours: {
            start: newShop.shop?.business_hours?.[0]?.openTime || newShop.business_hours?.[0]?.openTime || '09:00',
            end: newShop.shop?.business_hours?.[0]?.closeTime || newShop.business_hours?.[0]?.closeTime || '17:00'
          },
          contact_info: {
            phone: newShop.phone,
            email: newShop.email,
            website: newShop.website_url
          },
          created_at: newShop.created_at || new Date().toISOString(),
          address: newShop.address,
          isActive: newShop.is_active,
          openingHours: `${newShop.shop?.business_hours?.[0]?.openTime || newShop.business_hours?.[0]?.openTime || '09:00'} - ${newShop.shop?.business_hours?.[0]?.closeTime || newShop.business_hours?.[0]?.closeTime || '17:00'}`,
          services: newShop.services?.map((s: any) => s.name) || [],
          imageUrl: newShop.image_url || '',
          phone: newShop.phone,
          email: newShop.email
        };
        
        console.log('🔄 Transformed shop for display:', transformedShop);
        console.log('🖼️ Final image value:', transformedShop.image);
        
        // Add the new shop to the beginning of the shops list
        setMyShops(prevShops => {
          // Check if shop already exists to avoid duplicates
          const exists = prevShops.some(shop => shop.id === transformedShop.id);
          if (exists) {
            return prevShops.map(shop => 
              shop.id === transformedShop.id ? transformedShop : shop
            );
          }
          return [transformedShop, ...prevShops];
        });
        
        // Clear the navigation params to prevent re-processing
        navigation.setParams({ params: undefined } as any);
        
        // Show success message
        Alert.alert(
          '🎉 Shop Created Successfully!',
          `${newShop.name} has been created and is now visible on your dashboard.`,
          [{ text: 'Great!', style: 'default' }]
        );
        
        // Refresh dashboard data to get the latest shop information from database
        setTimeout(() => {
          console.log('🔄 Refreshing dashboard data to ensure consistency...');
          fetchDashboardData();
        }, 1000);
      }
    }, [route.params?.params?.newShop, navigation])
  );

  // Utility functions
  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = amount || 0;
    return `$${safeAmount.toFixed(2)}`;
  };
  const formatPercentage = (value: number | undefined | null) => {
    const safeValue = value || 0;
    return `${safeValue > 0 ? '+' : ''}${safeValue.toFixed(1)}%`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      job_completed: { name: 'checkmark-circle', color: '#1A2533' },
      new_booking: { name: 'calendar', color: '#1A2533' },
      payment_received: { name: 'card', color: '#1A2533' },
      review_received: { name: 'star', color: '#1A2533' },
      schedule_updated: { name: 'time', color: '#1A2533' },
      customer_message: { name: 'chatbubble', color: '#EF4444' },
    };
    return icons[type] || { name: 'information-circle', color: '#1A2533' };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#1A2533';
      case 'low': return '#1A2533';
      default: return '#1A2533';
    }
  };

  // Navigation handlers
  const handleNotificationPress = async () => {
    // Mark unread notifications as read
    if (unreadNotifications > 0) {
      try {
        const unreadNotificationIds = notifications
          .filter(n => !n.read_at)
          .map(n => n.id);
        
        if (unreadNotificationIds.length > 0) {
          await authService.markNotificationsAsRead(unreadNotificationIds);
          setUnreadNotifications(0);
          setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        }
      } catch (error) {
        console.warn('⚠️ Failed to mark notifications as read:', error);
      }
    }
    
    navigation.navigate('Notifications');
  };
  
  const handleUpgradePress = () => {
    setShowUpgradeModal(false);
    navigation.navigate('Subscription');
  };

  // Shop management with updated navigation
  const handleShopPress = (shop: Shop) => {
    // Create proper business hours structure from the simple start/end times
    const defaultBusinessHours = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ].map(day => ({
      day,
      isOpen: ['Saturday', 'Sunday'].includes(day) ? false : true,
      openTime: shop.business_hours?.start || '09:00',
      closeTime: shop.business_hours?.end || '17:00'
    }));

    navigation.navigate('ShopDetails', { 
      shop: {
        id: shop.id,
        name: shop.name,
        address: shop.address || shop.location || '',
        city: shop.city || '',
        state: shop.state || '',
        country: 'Sweden',
        phone: shop.phone || shop.contact_info?.phone || '',
        email: shop.email || shop.contact_info?.email || '',
        description: shop.description || '',
        category: shop.category || 'Beauty & Wellness',
        website_url: shop.website_url || shop.contact_info?.website || '',
        image_url: shop.image_url || shop.image || '',
        images: shop.images || [],
        logo_url: shop.logo_url || '',
        business_hours: defaultBusinessHours,
        special_days: [],
        timezone: 'Europe/Stockholm',
        advance_booking_days: 30,
        slot_duration: 60,
        buffer_time: 15,
        auto_approval: true,
        is_active: shop.is_active !== undefined ? shop.is_active : true,
        services: shop.services || [],
        discounts: shop.discounts || [],
        staff: shop.staff || []
      },
    });
  };

  // Updated shop creation handler
  const handleAddNewShop = () => {
    navigation.navigate('ShopDetails', undefined);
  };

  const toggleShopStatus = async (shopId: string) => {
    try {
      const currentShop = myShops.find(shop => shop.id === shopId);
      if (!currentShop) return;

      const newStatus = !currentShop.is_active;
      
      // Optimistically update UI
      setMyShops(prev => prev.map(shop => 
        shop.id === shopId ? { ...shop, is_active: newStatus, isActive: newStatus } : shop
      ));

      // Update in Supabase
      const response = await authService.updateProviderBusiness(shopId, {
        is_active: newStatus
      });

      if (!response.success) {
        // Revert optimistic update on failure
        setMyShops(prev => prev.map(shop => 
          shop.id === shopId ? { ...shop, is_active: !newStatus, isActive: !newStatus } : shop
        ));
        Alert.alert('Error', 'Failed to update shop status. Please try again.');
      } else {
        console.log('✅ Shop status updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating shop status:', error);
      Alert.alert('Error', 'Failed to update shop status. Please try again.');
    }
  };

  // Pro features for dashboard
  const dashboardFeatures = [
    {
      icon: 'trending-up-outline',
      iconColor: '#1A2533',
      title: 'Advanced Analytics Dashboard',
      description: 'Comprehensive business insights with revenue forecasting and customer behavior analysis'
    },
    {
      icon: 'people-outline',
      iconColor: '#1A2533',
      title: 'Complete Activity History',
      description: 'Unlimited access to all business activities, transactions, and customer interactions'
    },
    {
      icon: 'document-text-outline',
      iconColor: '#1A2533',
      title: 'Professional Reports & Invoices',
      description: 'Custom branded reports, invoices with digital signatures, and automated billing'
    },
    {
      icon: 'notifications-outline',
      iconColor: '#1A2533',
      title: 'Priority Business Alerts',
      description: 'Real-time notifications for VIP customers, large bookings, and important business events'
    }
  ];

  // Render methods
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => navigation.navigate('ProfileTab' as never)}
          activeOpacity={0.7}
        >
          {getAvatarUrl() && !avatarLoadError ? (
            <Image
              source={{ uri: getAvatarUrl() }}
              style={styles.avatarImage}
              onError={(error) => {
                console.log('❌ Avatar image failed to load:', error.nativeEvent);
                console.log('❌ Failed URL:', getAvatarUrl());
                setAvatarLoadError(true);
              }}
            />
          ) : (
            <Text style={styles.avatarText}>
              {getAvatarInitial()}
            </Text>
          )}
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.userName}>
            {getDisplayName()}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
        <Ionicons name="notifications-outline" size={24} color="#1F2937" />
        {unreadNotifications > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationCount}>
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      {/* Primary Earnings Card */}
      <View style={[styles.statCard, styles.primaryStatCard]}>
        <View style={styles.statCardHeader}>
          <Ionicons name="trending-up" size={20} color="#FFFFFF" />
          <Text style={styles.primaryStatLabel}>Total Earnings</Text>
        </View>
        <Text style={styles.primaryStatValue}>
          {formatCurrency(dashboardStats.totalEarnings)}
        </Text>
        <View style={styles.growthContainer}>
          <Ionicons name="arrow-up" size={12} color="#FFFFFF" />
          <Text style={styles.growthText}>
            {formatPercentage(dashboardStats.growthPercentage)} this month
          </Text>
        </View>
      </View>

      {/* Secondary Stats */}
      <View style={styles.secondaryStatsContainer}>
        <View style={[styles.statCard, styles.secondaryStatCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people" size={18} color="#1A2533" />
          </View>
          <Text style={styles.statValue}>{dashboardStats.totalCustomers || 0}</Text>
          <Text style={styles.statLabel}>Total Customers</Text>
        </View>
        
        <View style={[styles.statCard, styles.secondaryStatCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="checkmark-circle" size={18} color="#1A2533" />
          </View>
          <Text style={styles.statValue}>{dashboardStats.completedJobs || 0}</Text>
          <Text style={styles.statLabel}>Jobs Completed</Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionCard, { backgroundColor: action.backgroundColor }]}
            onPress={action.action}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={styles.quickActionTitle}>{action.title}</Text>
            <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderReviewStatistics = () => {
    const reviewStats = dashboardStats.reviewStats;
    
    if (!reviewStats || reviewStats.total_reviews === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          <View style={styles.noReviewsCard}>
            <View style={styles.noReviewsIcon}>
              <Ionicons name="star-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
            <Text style={styles.noReviewsSubtext}>
              Start receiving bookings to collect customer reviews
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Reviews</Text>
        <View style={styles.reviewStatsGrid}>
          <View style={[styles.reviewStatCard, styles.primaryReviewCard]}>
            <View style={styles.reviewStatHeader}>
              <Ionicons name="star" size={20} color="#1A2533" />
              <Text style={styles.reviewStatLabel}>Overall Rating</Text>
            </View>
            <Text style={styles.reviewStatValue}>
              {reviewStats.average_rating.toFixed(1)}
            </Text>
            <Text style={styles.reviewStatSubtext}>
              Based on {reviewStats.total_reviews} review{reviewStats.total_reviews !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.reviewStatCard}>
            <View style={styles.reviewStatHeader}>
              <Ionicons name="business-outline" size={16} color="#1A2533" />
              <Text style={styles.reviewStatLabelSmall}>Businesses</Text>
            </View>
            <Text style={styles.reviewStatValueSmall}>
              {reviewStats.total_businesses_with_reviews}
            </Text>
            <Text style={styles.reviewStatSubtextSmall}>with reviews</Text>
          </View>

          <View style={styles.reviewStatCard}>
            <View style={styles.reviewStatHeader}>
              <Ionicons name="chatbubbles-outline" size={16} color="#1A2533" />
              <Text style={styles.reviewStatLabelSmall}>Total Reviews</Text>
            </View>
            <Text style={styles.reviewStatValueSmall}>
              {reviewStats.total_reviews}
            </Text>
            <Text style={styles.reviewStatSubtextSmall}>across all shops</Text>
          </View>
        </View>

        {/* Individual Business Reviews */}
        {reviewStats.businesses.length > 0 && (
          <View style={styles.businessReviewsList}>
            <Text style={styles.businessReviewsTitle}>Shop Performance</Text>
            {reviewStats.businesses.slice(0, 3).map((business) => (
              <View key={business.provider_business_id} style={styles.businessReviewItem}>
                <View style={styles.businessReviewContent}>
                  <Text style={styles.businessReviewName}>{business.business_name}</Text>
                  <View style={styles.businessReviewStats}>
                    <View style={styles.businessReviewRating}>
                      <Ionicons name="star" size={12} color="#1A2533" />
                      <Text style={styles.businessReviewRatingText}>
                        {business.average_rating.toFixed(1)}
                      </Text>
                    </View>
                    <Text style={styles.businessReviewCount}>
                      {business.total_reviews} review{business.total_reviews !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderBusinessOverview = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Business Overview</Text>
      <View style={styles.overviewGrid}>
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="calendar-outline" size={16} color="#1A2533" />
            <Text style={styles.overviewLabel}>This Month</Text>
          </View>
          <Text style={styles.overviewValue}>
            {formatCurrency(dashboardStats.thisMonthEarnings)}
          </Text>
          <View style={styles.overviewStats}>
            <Text style={styles.overviewSubtext}>
              {dashboardStats.thisMonthBookings || 0} bookings • {dashboardStats.thisMonthCompletedJobs || 0} completed
            </Text>
          </View>
          <View style={styles.overviewChange}>
            <Ionicons 
              name={(dashboardStats.monthlyGrowth || 0) > 0 ? "arrow-up" : "arrow-down"} 
              size={12} 
              color={(dashboardStats.monthlyGrowth || 0) > 0 ? "#1A2533" : "#EF4444"} 
            />
            <Text style={[
              styles.overviewChangeText,
              { color: (dashboardStats.monthlyGrowth || 0) > 0 ? "#1A2533" : "#EF4444" }
            ]}>
              {formatPercentage(dashboardStats.monthlyGrowth)}
            </Text>
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="star-outline" size={16} color="#1A2533" />
            <Text style={styles.overviewLabel}>Rating</Text>
          </View>
          <Text style={styles.overviewValue}>{(dashboardStats.customerRating || 0).toFixed(1)}</Text>
          <Text style={styles.overviewSubtext}>
            {dashboardStats.totalReviews || 0} review{(dashboardStats.totalReviews || 0) !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="cash-outline" size={16} color="#1A2533" />
            <Text style={styles.overviewLabel}>Avg. Job Value</Text>
          </View>
          <Text style={styles.overviewValue}>
            {formatCurrency(dashboardStats.averageJobValue)}
          </Text>
          <Text style={styles.overviewSubtext}>Per booking</Text>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="time-outline" size={16} color="#1A2533" />
            <Text style={styles.overviewLabel}>Response Time</Text>
          </View>
          <Text style={styles.overviewValue}>
            {dashboardStats.averageResponseTime || 'No data'}
          </Text>
          <View style={styles.responseTimeDetails}>
            <Text style={styles.overviewSubtext}>
              {dashboardStats.responseRate || 0}% response rate
            </Text>
            {dashboardStats.responseTimeStats && (
              <View style={styles.responseTimeCategory}>
                <View style={[
                  styles.responseCategoryDot, 
                  { backgroundColor: responseTimeUtils.getResponseTimeCategory(dashboardStats.averageResponseTimeMinutes || 0).color }
                ]} />
                <Text style={[
                  styles.responseCategoryText,
                  { color: responseTimeUtils.getResponseTimeCategory(dashboardStats.averageResponseTimeMinutes || 0).color }
                ]}>
                  {responseTimeUtils.getResponseTimeCategory(dashboardStats.averageResponseTimeMinutes || 0).label}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderShopItem = ({ item }: { item: Shop | 'add' }) => {
    if (item === 'add') {
      return (
        <TouchableOpacity style={styles.addShopCard} onPress={handleAddNewShop}>
          <View style={styles.addShopContent}>
            <View style={styles.addShopIcon}>
              <Ionicons name="add-circle-outline" size={32} color="#1A2533" />
            </View>
            <Text style={styles.addShopText}>Add New Shop</Text>
            <Text style={styles.addShopSubtext}>Expand your business</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.shopCard} onPress={() => handleShopPress(item)}>
        {(item.image || item.imageUrl || item.image_url || item.logo_url) && 
         (item.image || item.imageUrl || item.image_url || item.logo_url).trim() !== '' ? (
          <Image 
            source={{ uri: item.image || item.imageUrl || item.image_url || item.logo_url }} 
            style={styles.shopImage}
            onError={(error) => {
              console.warn('❌ Image load error:', error.nativeEvent?.error || 'Unknown error');
            }}
            onLoad={() => {
              console.log('✅ Image loaded successfully:', item.image || item.imageUrl || item.image_url || item.logo_url);
            }}
          />
        ) : (
          <View style={[styles.shopImage, styles.shopImagePlaceholder]}>
            <Ionicons name="business-outline" size={40} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
              No Image
            </Text>
          </View>
        )}
        
        <View style={styles.shopBadgeContainer}>
          <TouchableOpacity
            style={[styles.shopStatusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}
            onPress={() => toggleShopStatus(item.id)}
          >
            <Text style={[styles.shopStatusText, item.is_active ? styles.activeText : styles.inactiveText]}>
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shopContent}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopCategory}>{item.category}</Text>
          
          <View style={styles.shopMetrics}>
            <View style={styles.shopMetric}>
              <Ionicons name="star" size={12} color="#1A2533" />
              <Text style={styles.shopMetricText}>{item.rating?.toFixed(1) || '0.0'}</Text>
            </View>
            <View style={styles.shopMetric}>
              <Ionicons name="people" size={12} color="#1A2533" />
              <Text style={styles.shopMetricText}>{item.staff_count || 0}</Text>
            </View>
            <View style={styles.shopMetric}>
              <Ionicons name="construct" size={12} color="#1A2533" />
              <Text style={styles.shopMetricText}>{item.total_services || 0}</Text>
            </View>
          </View>

          <View style={styles.shopRevenue}>
            <Text style={styles.shopRevenueLabel}>Monthly Revenue</Text>
            <Text style={styles.shopRevenueValue}>{formatCurrency(item.monthly_revenue || 0)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyShops = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Shops</Text>
        <Text style={styles.shopCount}>{myShops.filter(shop => shop.is_active).length} active</Text>
      </View>
      
      <FlatList
        data={[...myShops, 'add' as const]}
        renderItem={renderShopItem}
        keyExtractor={(item, index) => item === 'add' ? 'add' : item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shopsContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );

  const renderRecentActivity = () => {
    const activitiesToShow = isPremium ? recentActivity : recentActivity.slice(0, 3);
    const hiddenActivitiesCount = recentActivity.length - activitiesToShow.length;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {!isPremium && hiddenActivitiesCount > 0 && (
            <TouchableOpacity 
              style={styles.proButton}
              onPress={() => setShowUpgradeModal(true)}
            >
              <Ionicons name="star" size={12} color="#1A2533" />
              <Text style={styles.proButtonText}>PRO</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.activityList}>
          {activitiesToShow.map((activity, index) => {
            const icon = getActivityIcon(activity.type);
            const priorityColor = getPriorityColor(activity.priority || 'low');
            
            return (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIconContainer, { backgroundColor: `${icon.color}15` }]}>
                  <Ionicons name={icon.name as any} size={18} color={icon.color} />
                </View>
                
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <View style={styles.activityMeta}>
                      {activity.priority && (
                        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                      )}
                      <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  
                  <View style={styles.activityFooter}>
                    {activity.customer && (
                      <Text style={styles.activityCustomer}>👤 {activity.customer}</Text>
                    )}
                    {activity.amount && (
                      <Text style={styles.activityAmount}>{formatCurrency(activity.amount)}</Text>
                    )}
                    {activity.rating && (
                      <View style={styles.activityRating}>
                        <Ionicons name="star" size={12} color="#1A2533" />
                        <Text style={styles.activityRatingText}>{activity.rating}.0</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Upgrade Prompt for Free Users */}
        {!isPremium && hiddenActivitiesCount > 0 && (
          <TouchableOpacity 
            style={styles.upgradePrompt}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.upgradePromptContent}>
              <View style={styles.upgradeIconContainer}>
                <Ionicons name="star" size={20} color="#1A2533" />
              </View>
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeTitle}>
                  {hiddenActivitiesCount} more activit{hiddenActivitiesCount > 1 ? 'ies' : 'y'} hidden
                </Text>
                <Text style={styles.upgradeDescription}>
                  Upgrade to Pro for complete business insights
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#1A2533" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
            <Text style={styles.loadingSubtext}>Preparing your business insights</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
      
      {renderHeader()}
      
      <CancellationBanner />
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={['#1A2533']}
            tintColor="#1A2533"
          />
        }
      >
        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Business Overview */}
        {renderBusinessOverview()}

        {/* My Shops */}
        {renderMyShops()}

        {/* Recent Activity */}
        {renderRecentActivity()}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradePress}
        title="Unlock Professional Dashboard"
        subtitle="Get comprehensive business analytics and unlimited access to all your data"
        features={dashboardFeatures}
        hiddenCount={recentActivity.length - 3}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0FFFE', // Changed to match background color
    // Removed border line
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A2533',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FFFE', // Changed to match background color
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#1A2533',
  },

  // Stats Section
  statsContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 20,
  },
  primaryStatCard: {
    backgroundColor: '#1A2533',
    marginBottom: 16,
  },
  secondaryStatCard: {
    flex: 1,
    padding: 16,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryStatLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginLeft: 8,
    fontWeight: '500',
  },
  primaryStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginLeft: 4,
    fontWeight: '500',
  },
  secondaryStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '500',
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  shopCount: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  proButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A2533',
  },

  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#1A2533',
    textAlign: 'center',
  },

  // Business Overview
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
    marginLeft: 6,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  overviewSubtext: {
    fontSize: 11,
    color: '#1A2533',
  },
  overviewStats: {
    marginVertical: 4,
  },
  overviewChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overviewChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  responseTimeDetails: {
    gap: 4,
  },
  responseTimeCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  responseCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  responseCategoryText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Shops Styles
  shopsContainer: {
    paddingVertical: 4,
  },
  shopCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  shopImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  shopImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  shopStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  shopStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeText: {
    color: '#065F46',
  },
  inactiveText: {
    color: '#991B1B',
  },
  shopContent: {
    padding: 16,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  shopCategory: {
    fontSize: 13,
    color: '#1A2533',
    marginBottom: 12,
  },
  shopMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  shopMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shopMetricText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2533',
  },
  shopRevenue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  shopRevenueLabel: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  shopRevenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },

  // Add Shop Card
  addShopCard: {
    width: 280,
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F5F5E9',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addShopContent: {
    alignItems: 'center',
    padding: 24,
  },
  addShopIcon: {
    marginBottom: 12,
  },
  addShopText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  addShopSubtext: {
    fontSize: 13,
    color: '#1A2533',
    textAlign: 'center',
  },

  // Activity Styles
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  activityDescription: {
    fontSize: 13,
    color: '#1A2533',
    lineHeight: 18,
    marginBottom: 8,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityCustomer: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2533',
  },
  activityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
  },

  // Upgrade Prompt
  upgradePrompt: {
    marginTop: 16,
    backgroundColor: '#F5F5E9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5E9',
    padding: 16,
  },
  upgradePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  upgradeDescription: {
    fontSize: 12,
    color: '#1A2533',
  },

  // Review Statistics Styles
  noReviewsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  noReviewsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
  },
  reviewStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  reviewStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    flex: 1,
  },
  primaryReviewCard: {
    backgroundColor: '#F5F5E9',
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  reviewStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewStatLabel: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewStatLabelSmall: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
    marginLeft: 6,
  },
  reviewStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 4,
  },
  reviewStatValueSmall: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  reviewStatSubtext: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '500',
  },
  reviewStatSubtextSmall: {
    fontSize: 11,
    color: '#1A2533',
  },
  businessReviewsList: {
    marginTop: 8,
  },
  businessReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 12,
  },
  businessReviewItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  businessReviewContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessReviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  businessReviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  businessReviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  businessReviewRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2533',
  },
  businessReviewCount: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 32,
  },
});

export default ProviderHomeScreen;