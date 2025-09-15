import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Image, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Linking
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { shopAPI, Shop } from '../services/api/shops/shopAPI';
import { favoritesAPI } from '../services/api/favorites/favoritesAPI';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatCurrency } from '../utils/currency';

type ServiceListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ServiceList'>;
type ServiceListScreenRouteProp = RouteProp<RootStackParamList, 'ServiceList'>;

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category_id: string;
  image: string;
  rating: number;
  reviews_count: number;
  professional_name: string;
  salon_name: string;
  location: string;
  distance: string;
  available_times: string[];
  certificate_images: string[];
  before_after_images: string[];
  available_time_text: string;
  welcome_message: string;
  special_note: string;
  payment_methods: string[];
  is_favorite: boolean;
  created_at: string;
}

interface FilterOptions {
  priceRange: { min: number; max: number };
  locations: string[];
  durations: number[];
  categories: any[];
  paymentMethods: string[];
  sortOptions: { value: string; label: string }[];
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  total_count?: number;
  has_more?: boolean;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

const ServiceListScreen = () => {
  const navigation = useNavigation<ServiceListScreenNavigationProp>();
  const route = useRoute<ServiceListScreenRouteProp>();
  const category = route.params?.category || 'All Services';
  const categoryId = route.params?.categoryId;
  const showPopular = route.params?.showPopular || false;
  const servicesData = route.params?.servicesData; // Data passed from HomeScreen

  // State management
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    price_min: undefined as number | undefined,
    price_max: undefined as number | undefined,
    rating_min: undefined as number | undefined,
    location: undefined as string | undefined,
    sort_by: 'popularity' as 'price' | 'rating' | 'distance' | 'popularity',
    sort_order: 'desc' as 'asc' | 'desc'
  });

  // Helper function to get minimum price from service data
  const getMinimumServicePrice = (service: any): number | null => {
    let minPrice: number | null = null;
    
    // Check if service has services array (shop-like structure)
    if (service.services && Array.isArray(service.services)) {
      service.services.forEach((s: any) => {
        if (s.price && s.price > 0) {
          minPrice = minPrice === null ? s.price : Math.min(minPrice, s.price);
        }
        // Check service options
        if (s.options && Array.isArray(s.options)) {
          s.options.forEach((opt: any) => {
            if (opt.price && opt.price > 0) {
              minPrice = minPrice === null ? opt.price : Math.min(minPrice, opt.price);
            }
          });
        }
      });
    }
    
    // Check if service has options directly
    if (service.options && Array.isArray(service.options)) {
      service.options.forEach((opt: any) => {
        if (opt.price && opt.price > 0) {
          minPrice = minPrice === null ? opt.price : Math.min(minPrice, opt.price);
        }
      });
    }
    
    // Return null if no price found - let the database handle it
    return minPrice;
  };

  // Helper function to get minimum price from shop services and options
  const getMinimumShopPrice = (shop: Shop): number | null => {
    let minPrice: number | null = null;
    
    // Check services for minimum price
    if (shop.services && shop.services.length > 0) {
      shop.services.forEach(service => {
        // Check base service price
        if (service.price && service.price > 0) {
          minPrice = minPrice === null ? service.price : Math.min(minPrice, service.price);
        }
        
        // Check service options for lower prices
        if (service.options && service.options.length > 0) {
          service.options.forEach(option => {
            if (option.price && option.price > 0) {
              minPrice = minPrice === null ? option.price : Math.min(minPrice, option.price);
            }
          });
        }
      });
    }
    
    // If no valid price found, check starting_price from database
    if (minPrice === null && shop.starting_price && shop.starting_price > 0) {
      minPrice = shop.starting_price;
    }
    
    // If no price found, check min_price field from database
    if (minPrice === null && shop.min_price && shop.min_price > 0) {
      minPrice = shop.min_price;
    }
    
    // Return the found price or null if none exists
    return minPrice;
  };

  // Transform shop data to service format for backward compatibility
  const transformShopToService = (shop: Shop): Service => ({
    id: shop.id,
    name: shop.name,
    description: shop.description,
    price: getMinimumShopPrice(shop) || 0, // Will be 0 if no price in database
    duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 60,
    category_id: shop.category.toLowerCase().replace(/\s+/g, '-'),
    image: shop.images && shop.images.length > 0 ? shop.images[0] : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
    rating: shop.rating || 4.5,
    reviews_count: shop.reviews_count || 0,
    professional_name: shop.staff && shop.staff.length > 0 ? shop.staff[0].name : shop.category || 'Service Provider',
    salon_name: shop.name,
    location: `${shop.city}, ${shop.country}`,
    distance: shop.distance || '1.5 km',
    available_times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    certificate_images: [],
    before_after_images: [],
    available_time_text: 'Available today',
    welcome_message: `Welcome to ${shop.name}! We provide excellent ${shop.category.toLowerCase()} services.`,
    special_note: shop.description,
    payment_methods: ['Card', 'Cash', 'Mobile Payment'],
    is_favorite: false,
    created_at: shop.created_at
  });

  // Real API service using shop data
  const apiService = {
    async getServiceListData(params?: {
      searchQuery?: string;
      categoryId?: string;
      showPopular?: boolean;
      filters?: any;
    }): Promise<ApiResponse<{
      services: Service[];
      totalResults: number;
      filterOptions: FilterOptions;
    }>> {
      try {
        console.log('🔍 Fetching services with params:', params);
        
        let shopsResponse;
        
        if (params?.searchQuery?.trim()) {
          // Search shops by query
          shopsResponse = await shopAPI.searchShops(params.searchQuery);
        } else if (params?.categoryId && params.categoryId !== 'popular') {
          // Get shops by category - map categoryId back to category name
          const categoryName = params.categoryId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          // Handle special category mappings
          let mappedCategory = categoryName;
          if (categoryName === 'Beauty Wellness') mappedCategory = 'Beauty & Wellness';
          if (categoryName === 'Fitness Health') mappedCategory = 'Fitness & Health';
          if (categoryName === 'Pet Services') mappedCategory = 'Pet Services';
          
          shopsResponse = await shopAPI.getShopsByCategory(mappedCategory);
        } else {
          // Get all shops for popular or general listing
          shopsResponse = await shopAPI.getAllShops();
        }

        if (shopsResponse.error || !shopsResponse.data) {
          console.warn('⚠️ No shop data available:', shopsResponse.error);
          return {
            data: {
              services: [],
              totalResults: 0,
              filterOptions: this.getDefaultFilterOptions()
            },
            success: false,
            error: shopsResponse.error || 'Failed to fetch services'
          };
        }

        // Transform shops to services
        const services = shopsResponse.data.map(transformShopToService);
        
        // Apply filters if provided
        let filteredServices = services;
        if (params?.filters) {
          filteredServices = this.applyFilters(services, params.filters);
        }
        
        // Sort services
        if (params?.filters?.sort_by) {
          filteredServices = this.sortServices(filteredServices, params.filters.sort_by, params.filters.sort_order);
        }

        console.log('✅ Successfully fetched and transformed services:', filteredServices.length);

        return {
          data: {
            services: filteredServices,
            totalResults: filteredServices.length,
            filterOptions: this.getDefaultFilterOptions()
          },
          success: true
        };
      } catch (error) {
        console.error('❌ API Error:', error);
        return {
          data: {
            services: [],
            totalResults: 0,
            filterOptions: this.getDefaultFilterOptions()
          },
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch service data'
        };
      }
    },

    getDefaultFilterOptions(): FilterOptions {
      return {
        priceRange: { min: 0, max: 1000 },
        locations: ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Linköping', 'Västerås'],
        durations: [30, 45, 60, 90, 120, 180],
        categories: [
          { id: 'beauty-wellness', name: 'Beauty & Wellness' },
          { id: 'maintenance', name: 'Maintenance' },
          { id: 'home-services', name: 'Home Services' },
          { id: 'fitness-health', name: 'Fitness & Health' },
          { id: 'automotive', name: 'Automotive' },
          { id: 'pet-services', name: 'Pet Services' }
        ],
        paymentMethods: ['Card', 'Cash', 'Mobile Payment', 'Bank Transfer'],
        sortOptions: [
          { value: 'popularity', label: 'Most Popular' },
          { value: 'rating', label: 'Highest Rated' },
          { value: 'price', label: 'Price: Low to High' },
          { value: 'distance', label: 'Nearest First' }
        ]
      };
    },

    applyFilters(services: Service[], filters: any): Service[] {
      let filtered = [...services];
      
      if (filters.price_min !== undefined) {
        filtered = filtered.filter(service => service.price >= filters.price_min);
      }
      
      if (filters.price_max !== undefined) {
        filtered = filtered.filter(service => service.price <= filters.price_max);
      }
      
      if (filters.rating_min !== undefined) {
        filtered = filtered.filter(service => service.rating >= filters.rating_min);
      }
      
      if (filters.location) {
        filtered = filtered.filter(service => 
          service.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      
      return filtered;
    },

    sortServices(services: Service[], sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): Service[] {
      const sorted = [...services];
      
      sorted.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'price':
            comparison = a.price - b.price;
            break;
          case 'rating':
            comparison = a.rating - b.rating;
            break;
          case 'distance':
            const aDistance = parseFloat(a.distance.replace(' km', ''));
            const bDistance = parseFloat(b.distance.replace(' km', ''));
            comparison = aDistance - bDistance;
            break;
          case 'popularity':
          default:
            comparison = a.reviews_count - b.reviews_count;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
      
      return sorted;
    },

    async toggleFavorite(userId: string, serviceId: string): Promise<ApiResponse<{ isFavorite: boolean }>> {
      try {
        console.log('🤍 Toggling favorite for service:', serviceId);
        
        // Use the real favorites API
        const response = await favoritesAPI.toggleFavorite(userId, serviceId);
        
        if (response.success) {
          return {
            data: { isFavorite: response.data?.is_favorite || false },
            success: true
          };
        } else {
          return {
            data: { isFavorite: false },
            success: false,
            error: response.error || 'Failed to toggle favorite'
          };
        }
      } catch (error) {
        console.error('Toggle favorite error:', error);
        return {
          data: { isFavorite: false },
          success: false,
          error: 'Failed to update favorite'
        };
      }
    }
  };

  // Load services with comprehensive data
  const loadServices = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      // If we have servicesData from HomeScreen, use that instead of API call
      // Check only the actual filter fields, not sort options
      const hasActiveFilters = filters.price_min !== undefined || 
                               filters.price_max !== undefined || 
                               filters.rating_min !== undefined || 
                               filters.location !== undefined;
      
      if (servicesData && servicesData.length > 0 && !searchQuery && !hasActiveFilters) {
        console.log('📋 Using services data from HomeScreen:', servicesData.length, 'items');
        
        // Transform the data to match Service interface if needed
        const transformedServices = servicesData.map((service, index) => ({
          id: service.id || `service-${index}`,
          name: service.name || service.salon_name || 'Unknown Service',
          description: service.description || '',
          price: service.price || service.starting_price || service.min_price || getMinimumServicePrice(service) || 0,
          duration: service.duration || 60,
          category_id: categoryId || 'general',
          image: service.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
          rating: service.rating || 4.5,
          reviews_count: service.reviews_count || 0,
          professional_name: service.professional_name || 'Professional',
          salon_name: service.salon_name || service.name || 'Salon',
          location: service.location || 'Location',
          distance: service.distance || '1.5 km',
          available_times: service.available_times || ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          certificate_images: service.certificate_images || [],
          before_after_images: service.before_after_images || [],
          available_time_text: service.available_time_text || 'Available today',
          welcome_message: service.welcome_message || `Welcome to ${service.salon_name || service.name}!`,
          special_note: service.special_note || service.description || '',
          payment_methods: service.payment_methods || ['Card', 'Cash', 'Mobile Payment'],
          is_favorite: false, // Will be loaded from API
          created_at: service.created_at || new Date().toISOString()
        }));
        
        // Load favorite statuses for all services
        const mockUserId = '12345678-1234-1234-1234-123456789012';
        const shopIds = transformedServices.map(s => s.id);
        
        try {
          const favoriteStatuses = await favoritesAPI.getFavoriteStatuses(mockUserId, shopIds);
          if (favoriteStatuses.success && favoriteStatuses.data) {
            // Update services with favorite statuses
            const servicesWithFavorites = transformedServices.map(service => ({
              ...service,
              is_favorite: favoriteStatuses.data[service.id] === true
            }));
            setServices(servicesWithFavorites);
          } else {
            setServices(transformedServices);
          }
        } catch (error) {
          console.log('Error loading favorite statuses:', error);
          setServices(transformedServices);
        }
        
        setTotalResults(transformedServices.length);
        setFilterOptions({
          priceRange: { min: 0, max: 1000 },
          locations: ['All Locations'],
          durations: [30, 60, 90, 120],
          categories: [],
          paymentMethods: ['Card', 'Cash', 'Mobile Payment'],
          sortOptions: [
            { value: 'popularity', label: 'Popularity' },
            { value: 'price', label: 'Price' },
            { value: 'rating', label: 'Rating' },
            { value: 'distance', label: 'Distance' }
          ]
        });
        
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fallback to API call if no servicesData or when searching/filtering
      const response = await apiService.getServiceListData({
        searchQuery,
        categoryId,
        showPopular,
        filters
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to load services');
        return;
      }

      setServices(response.data.services);
      setTotalResults(response.data.totalResults);
      setFilterOptions(response.data.filterOptions);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, categoryId, showPopular, filters, servicesData]);

  // Toggle favorite
  const toggleFavorite = async (serviceId: string) => {
    try {
      const mockUserId = '12345678-1234-1234-1234-123456789012'; // Same mock user ID as ServiceDetailScreen
      const response = await apiService.toggleFavorite(mockUserId, serviceId);
      
      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to update favorite');
        return;
      }

      // Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, is_favorite: response.data?.isFavorite === true }
          : service
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices(false);
  }, [loadServices]);

  // Handle search
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    const [sort_by, sort_order] = sortBy.includes('_') 
      ? sortBy.split('_') 
      : [sortBy, 'desc'];
    
    setFilters(prev => ({
      ...prev,
      sort_by: sort_by as any,
      sort_order: sort_order as 'asc' | 'desc'
    }));
  };

  // Handle navigation back
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      Alert.alert('Navigation', 'Go back to previous screen');
    }
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }
    
    return stars.join('');
  };

  // Effects
  useFocusEffect(
    useCallback(() => {
      // Only load services on first focus or when route parameters change
      loadServices();
    }, [categoryId, showPopular]) // Remove loadServices dependency to prevent double calls
  );

  useEffect(() => {
    // Only trigger search/filter updates, not initial load
    const hasActiveFilters = filters.price_min !== undefined || 
                            filters.price_max !== undefined || 
                            filters.rating_min !== undefined || 
                            filters.location !== undefined;
    
    if (searchQuery || hasActiveFilters) {
      const timeoutId = setTimeout(() => {
        loadServices();
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, filters]);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
        {/* Main Header - Only one navigation bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#1A2533" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{category}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.resultsCount}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </View>
    );
  }

  // Open maps with the service location
  const openMaps = (service: Service) => {
    const { location, salon_name } = service;
    const address = location || 'Anthonyville, United States';
    const label = salon_name || 'Service Location';
    
    // Encode the address for use in URL
    const encodedAddress = encodeURIComponent(address);
    const encodedLabel = encodeURIComponent(label);
    
    // Different URL schemes for iOS and Android
    const scheme = Platform.select({
      ios: `maps:0,0?q=${encodedLabel}@${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}(${encodedLabel})`
    });
    
    // Fallback to Google Maps URL if native maps fail
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    
    if (scheme) {
      Linking.canOpenURL(scheme).then(supported => {
        if (supported) {
          Linking.openURL(scheme);
        } else {
          // Fallback to Google Maps in browser
          Linking.openURL(googleMapsUrl);
        }
      }).catch(() => {
        // If error, open Google Maps in browser
        Linking.openURL(googleMapsUrl);
      });
    } else {
      // Direct fallback to Google Maps
      Linking.openURL(googleMapsUrl);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
      
      {/* Main Header - Only one navigation bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1A2533" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{category}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.resultsCount}>{totalResults} services</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#1A2533" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search treatment, clinic, location..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#1A2533" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Service List */}
      <ScrollView 
        style={styles.serviceList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#1A2533"
            colors={['#1A2533']}
          />
        }
      >
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No services found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          services.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.serviceCard}
              onPress={() => {
                if (navigation?.navigate) {
                  navigation.navigate('ServiceDetail', { 
                    service,
                    serviceId: service.id 
                  });
                } else {
                  Alert.alert('Navigation', 'Navigate to service detail');
                }
              }}
              activeOpacity={0.8}
            >
              {/* Certificate Images */}
              {service.certificate_images && service.certificate_images.length > 0 && (
                <View style={styles.certificateSection}>
                  <Image 
                    source={{ uri: service.certificate_images[0] }} 
                    style={styles.certificateImage}
                    resizeMode="cover"
                  />
                  <View style={styles.certificateBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#1A2533" />
                    <Text style={styles.certificateText}>Certified</Text>
                  </View>
                </View>
              )}

              {/* Before/After Images */}
              {service.before_after_images && service.before_after_images.length >= 2 && (
                <View style={styles.beforeAfterSection}>
                  <View style={styles.beforeAfterContainer}>
                    <Image 
                      source={{ uri: service.before_after_images[0] }} 
                      style={styles.beforeAfterImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.beforeAfterLabel}>Before</Text>
                  </View>
                  <View style={styles.beforeAfterContainer}>
                    <Image 
                      source={{ uri: service.before_after_images[1] }} 
                      style={styles.beforeAfterImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.beforeAfterLabel}>After</Text>
                  </View>
                </View>
              )}
              
              {/* Service Info */}
              <View style={styles.serviceInfo}>
                <View style={styles.serviceHeader}>
                  <Image 
                    source={{ uri: service.image }} 
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                  <View style={styles.serviceDetails}>
                    <View style={styles.nameAndFavorite}>
                      <Text style={styles.serviceName} numberOfLines={1}>
                        {service.salon_name}
                      </Text>
                      <TouchableOpacity 
                        style={styles.favoriteButton}
                        onPress={() => toggleFavorite(service.id)}
                      >
                        <Ionicons 
                          name={service.is_favorite === true ? "heart" : "heart-outline"} 
                          size={24} 
                          color={service.is_favorite === true ? "#EF4444" : "#9CA3AF"} 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.ratingContainer}>
                      <Text style={styles.rating}>{service.rating.toFixed(1)}</Text>
                      <Text style={styles.stars}>{renderStars(service.rating)}</Text>
                      <Text style={styles.reviews}>({service.reviews_count})</Text>
                    </View>
                    
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color="#1A2533" />
                      <Text style={styles.location} numberOfLines={1}>
                        {service.location}
                      </Text>
                    </View>
                    
                    <View style={styles.availabilityContainer}>
                      <Ionicons name="time-outline" size={14} color="#1A2533" />
                      <Text style={styles.availableTime}>
                        {service.available_time_text}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.welcomeMessage} numberOfLines={2}>
                  {service.welcome_message}
                </Text>
                
                <Text style={styles.specialNote} numberOfLines={2}>
                  {service.special_note}
                </Text>
                
                {/* Payment Methods */}
                {service.payment_methods && service.payment_methods.length > 0 && (
                  <View style={styles.paymentMethods}>
                    <Ionicons name="card-outline" size={14} color="#1A2533" style={styles.paymentIcon} />
                    {service.payment_methods.slice(0, 3).map((method, index) => (
                      <View key={index} style={styles.paymentTag}>
                        <Text style={styles.paymentText}>{method}</Text>
                      </View>
                    ))}
                    {service.payment_methods.length > 3 && (
                      <Text style={styles.morePayments}>
                        +{service.payment_methods.length - 3} more
                      </Text>
                    )}
                  </View>
                )}

                {/* Bottom Section */}
                <View style={styles.bottomSection}>
                  <View style={styles.priceSection}>
                    {service.price > 0 ? (
                      <>
                        <Text style={styles.priceLabel}>From</Text>
                        <Text style={styles.price}>{formatCurrency(service.price)}</Text>
                      </>
                    ) : (
                      <Text style={styles.priceNotAvailable}>Price on request</Text>
                    )}
                    <View style={styles.durationContainer}>
                      <Ionicons name="time" size={12} color="#1A2533" />
                      <Text style={styles.duration}>{service.duration} min</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.viewButton}
                    onPress={() => openMaps(service)}
                  >
                    <Text style={styles.viewButtonText}>Get Directions</Text>
                    <Ionicons name="navigate" size={16} color="#1A2533" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        {/* Load More Button */}
        {services.length > 0 && services.length < totalResults && (
          <TouchableOpacity 
            style={styles.loadMoreButton}
            onPress={() => loadServices()}
          >
            <Text style={styles.loadMoreText}>Load More Services</Text>
            <Ionicons name="chevron-down" size={20} color="#1A2533" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Consistent app background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Add top padding to account for status bar
    backgroundColor: '#F0FFFE', // Consistent with app background
    // Removed borderBottomWidth for seamless design
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  resultsCount: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FFFE',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0FFFE', // Consistent background
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A2533',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
  },
  clearButton: {
    padding: 4,
  },
  serviceList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#1A2533',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  certificateSection: {
    position: 'relative',
    marginBottom: 12,
  },
  certificateImage: {
    width: '100%',
    height: 120,
  },
  certificateBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  certificateText: {
    fontSize: 10,
    color: '#1A2533',
    fontWeight: '600',
    marginLeft: 4,
  },
  beforeAfterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  beforeAfterContainer: {
    width: '48%',
    position: 'relative',
  },
  beforeAfterImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  beforeAfterLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceInfo: {
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#1A2533',
  },
  serviceDetails: {
    flex: 1,
    marginLeft: 12,
  },
  nameAndFavorite: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2533',
    flex: 1,
    marginRight: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2533',
    marginRight: 4,
  },
  stars: {
    color: '#1A2533',
    fontSize: 14,
    marginRight: 4,
  },
  reviews: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '500',
    marginLeft: 4,
    flex: 1,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableTime: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '600',
    marginLeft: 4,
  },
  welcomeMessage: {
    fontSize: 15,
    color: '#1A2533',
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  specialNote: {
    fontSize: 13,
    color: '#1A2533',
    marginBottom: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  paymentMethods: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentTag: {
    backgroundColor: '#F8FFFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#1A2533',
  },
  paymentText: {
    fontSize: 11,
    color: '#1A2533',
    fontWeight: '500',
  },
  morePayments: {
    fontSize: 11,
    color: '#1A2533',
    fontWeight: '500',
    marginLeft: 4,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#1A2533',
    marginRight: 4,
    fontWeight: '500',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
    marginRight: 8,
  },
  priceNotAvailable: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    fontStyle: 'italic',
    marginRight: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
    marginLeft: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A2533',
  },
  viewButtonText: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '600',
    marginRight: 4,
  },
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1A2533',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 15,
    color: '#1A2533',
    fontWeight: '600',
    marginRight: 8,
  },
});

export default ServiceListScreen;