import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert, Dimensions, Animated, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList, useAuth } from '../navigation/AppNavigator';
import { ServiceUtils } from '../services/serviceUtils';
import { ServiceOptionState } from '../types/service';
import type { Service } from '../services/types/service';
import { shopAPI, Shop } from '../services/api/shops/shopAPI';
import { serviceOptionsAPI, ServiceOption } from '../services/api/serviceOptions/serviceOptionsAPI';
import normalizedShopService, { CompleteShopData, supabase } from '../lib/supabase/normalized';
import { favoritesAPI } from '../services/api/favorites/favoritesAPI';
import { formatCurrency, CURRENCY } from '../utils/currency';
import { shouldUseMockData, mockDelay, logMockUsage } from '../config/devConfig';
import { getMockShops, getMockServices, getMockStaff, getMockReviews } from '../data/mockData';

const { width: screenWidth } = Dimensions.get('window');

// Transform shop data to service format for backward compatibility
const transformShopToService = (shop: CompleteShopData): Service => ({
  id: shop.id,
  name: shop.name || 'Unnamed Shop',
  description: shop.description || '',
  price: shop.services && shop.services.length > 0 ? shop.services[0].price : 0,
  duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 0,
  category_id: (shop.category || 'general').toLowerCase().replace(/\s+/g, '-'),
  category: shop.category || 'General', // Add category field for header display
  image: shop.images && shop.images.length > 0 ? shop.images[0] : 
         shop.image_url || shop.logo_url || 
         'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
  rating: shop.rating || 0,
  reviews_count: shop.reviews_count || 0,
  professional_name: shop.staff && shop.staff.length > 0 ? shop.staff[0].name : '',
  salon_name: shop.name || 'Unnamed Shop',
  discounts: shop.discounts || null, // Add discounts field for header display
  location: `${shop.city || 'Unknown City'}, ${shop.country || 'Unknown Country'}`,
  distance: shop.distance || '',
  available_times: shop.business_hours ? extractAvailableTimes(shop.business_hours) : [],
  certificate_images: shop.certificate_images || [],
  before_after_images: shop.before_after_images || shop.images?.slice(1) || [],
  available_time_text: shop.is_active ? 'Check availability' : 'Currently closed',
  welcome_message: shop.welcome_message || shop.description || '',
  special_note: shop.special_note || '',
  payment_methods: shop.payment_methods || [],
  is_favorite: false, // Always initialize as false, will be updated after favorite status check
  created_at: shop.created_at,
  logo_url: shop.logo_url // Add logo_url to service data
});

// Helper function to extract available times from business hours
const extractAvailableTimes = (businessHours: any[]): string[] => {
  const times: string[] = [];
  
  // Validate businessHours is an array
  if (!Array.isArray(businessHours) || businessHours.length === 0) {
    return times;
  }
  
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = daysOfWeek[new Date().getDay()];
  
  const todayHours = businessHours.find(bh => 
    bh && bh.day_of_week && typeof bh.day_of_week === 'string' && 
    bh.day_of_week.toLowerCase() === today
  );
  
  if (todayHours && todayHours.is_open && todayHours.open_time && todayHours.close_time) {
    try {
      // Generate time slots based on opening hours
      const openTime = parseInt(todayHours.open_time.split(':')[0]);
      const closeTime = parseInt(todayHours.close_time.split(':')[0]);
      
      if (!isNaN(openTime) && !isNaN(closeTime) && openTime < closeTime) {
        for (let hour = openTime; hour < closeTime; hour++) {
          times.push(`${hour.toString().padStart(2, '0')}:00`);
          times.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    } catch (error) {
      console.warn('Error parsing business hours:', error);
    }
  }
  
  return times;
};

// Helper functions for hours section
const getCurrentStatus = (businessHours: any[]): string => {
  if (!businessHours || businessHours.length === 0) {
    return 'Closed';
  }

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = daysOfWeek[new Date().getDay()];
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  
  // Try to find today's hours with multiple possible field names
  const todayHours = businessHours.find(bh => {
    if (!bh) return false;
    
    // Check for different day field names
    const dayField = bh.day_of_week || bh.day;
    if (!dayField) return false;
    
    return dayField.toLowerCase() === today;
  });
  
  if (!todayHours) {
    return 'Closed';
  }
  
  // Check if the business is open today with multiple possible field names
  const isOpenToday = todayHours.isOpen || todayHours.is_open || todayHours.open || false;
  
  if (!isOpenToday) {
    return 'Closed';
  }
  
  try {
    // Try multiple possible field names for open/close times
    const openTime = todayHours.openTime || todayHours.open_time || todayHours.start_time || '09:00';
    const closeTime = todayHours.closeTime || todayHours.close_time || todayHours.end_time || '18:00';
    
    if (!openTime || !closeTime) {
      return 'Open'; // Default to open if we know it's open today but don't have specific times
    }
    
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    if (isNaN(openHour) || isNaN(closeHour)) {
      return 'Open'; // Default to open if we can't parse times
    }
    
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const openTotalMinutes = openHour * 60 + (openMin || 0);
    const closeTotalMinutes = closeHour * 60 + (closeMin || 0);
    
    if (currentTotalMinutes >= openTotalMinutes && currentTotalMinutes < closeTotalMinutes) {
      return 'Open';
    } else {
      return 'Closed';
    }
  } catch (error) {
    console.warn('Error parsing business hours:', error);
    return 'Open'; // Default to open if there's an error but we know it's supposed to be open today
  }
};

const getCurrentStatusColor = (businessHours: any[]): string => {
  const status = getCurrentStatus(businessHours);
  switch (status) {
    case 'Open':
      return '#10B981';
    case 'Closed':
      return '#EF4444';
    default:
      return '#9CA3AF';
  }
};

const isTodayDay = (dayName: string): boolean => {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = daysOfWeek[new Date().getDay()];
  return dayName.toLowerCase() === today;
};

type ServiceDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ServiceDetail'>;
type ServiceDetailScreenRouteProp = RouteProp<RootStackParamList, 'ServiceDetail'>;

// Define service type for tab components
type ServiceTabProps = {
  service: Service;
  reviewStats?: {total_reviews: number; average_rating: number} | null;
};

// Image Carousel Component
interface ImageCarouselProps {
  images: string[];
  service: Service;
  onBackPress: () => void;
  onFavoritePress: () => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images = [], service, onBackPress, onFavoritePress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Use images directly - no complex state management
  const imageList = images;
  
  // Debug logging to track when ImageCarousel renders
  console.log('🖼️ ImageCarousel render:', {
    imagesCount: images.length,
    serviceId: service?.id,
    serviceName: service?.name,
    firstImage: imageList[0],
    allImages: imageList
  });

  // Get image type label with proper categorization
  const getImageTypeLabel = (imageUrl: string, index: number, images: any) => {
    // Check if it's in main shop images
    if (images.main?.includes(imageUrl)) {
      return index === 0 ? 'Main' : `Gallery ${index + 1}`;
    }
    // Check if it's a certificate
    if (images.certificates?.includes(imageUrl)) {
      const certIndex = images.certificates.indexOf(imageUrl) + 1;
      return `Certificate ${certIndex}`;
    }
    // Check if it's before/after
    if (images.beforeAfter?.includes(imageUrl)) {
      const beforeAfterIndex = images.beforeAfter.indexOf(imageUrl);
      return beforeAfterIndex % 2 === 0 ? 'Before' : 'After';
    }
    return `Image ${index + 1}`;
  };

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(index);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

  // We need to pass the categorized images to get proper labels
  // For now, use a simple approach
  const currentImageLabel = imageList[currentIndex] ? `${currentIndex + 1} of ${imageList.length}` : null;

  return (
    <View style={styles.imageContainer}>
      {/* Multiple shop images from provider_businesses table */}
      {imageList.length > 1 ? (
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const slideIndex = Math.round(nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width);
            setCurrentIndex(slideIndex);
          }}
          scrollEventThrottle={16}
        >
          {imageList.map((imageUrl, index) => (
            <Image
              key={index}
              source={{ uri: imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format' }}
              style={styles.serviceImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('Service image failed to load:', error.nativeEvent?.error || 'Unknown error');
              }}
            />
          ))}
        </ScrollView>
      ) : (
        <Image
          source={{ uri: imageList[0] || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format' }}
          style={styles.serviceImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Single service image failed to load:', error.nativeEvent?.error || 'Unknown error');
          }}
        />
      )}

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={onBackPress}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Favorite Button */}
      <TouchableOpacity 
        style={styles.favoriteButton}
        onPress={onFavoritePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={service.is_favorite === true ? "heart" : "heart-outline"}
          size={24} 
          color={service.is_favorite === true ? "#FF3B30" : "#1A2533"} 
        />
      </TouchableOpacity>

      {/* Image Counter */}
      {imageList.length > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentIndex + 1} / {imageList.length}
          </Text>
        </View>
      )}

      {/* Dots Indicator */}
      {imageList.length > 1 && (
        <View style={styles.dotsContainer}>
          {imageList.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot
              ]}
              onPress={() => goToSlide(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Staff Selection Component
const StaffSelectionSection: React.FC<{
  staffMembers: any[];
  selectedStaff: string | null;
  onSelectStaff: (staffId: string) => void;
}> = ({ staffMembers, selectedStaff, onSelectStaff }) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (staffId: string) => {
    setFailedImages(prev => new Set(prev).add(staffId));
  };

  return (
  <View style={styles.staffSection}>
    <Text style={styles.sectionTitle}>Team</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffScroll}>
      {staffMembers.map((staff) => (
        <TouchableOpacity
          key={staff.id}
          style={[
            styles.staffCard,
            selectedStaff === staff.id && styles.selectedStaffCard
          ]}
          onPress={() => onSelectStaff(staff.id)}
        >
          <View style={styles.staffAvatar}>
            {staff.avatar_url && !failedImages.has(staff.id) ? (
              <Image 
                source={{ uri: staff.avatar_url }} 
                style={styles.staffImage}
                onError={() => handleImageError(staff.id)}
              />
            ) : (
              <View style={styles.staffPlaceholder}>
                <Ionicons name="person" size={30} color="#9CA3AF" />
              </View>
            )}
            {selectedStaff === staff.id && (
              <View style={styles.staffCheckmark}>
                <Ionicons name="checkmark-circle" size={24} color="#1A2533" />
              </View>
            )}
          </View>
          <Text style={[styles.staffName, selectedStaff === staff.id && styles.selectedStaffName]}>
            {staff.name}
          </Text>
          {staff.role && staff.id !== 'any' && (
            <Text style={styles.staffRole}>{staff.role}</Text>
          )}
          {staff.rating > 0 && (
            <View style={styles.staffRating}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={styles.staffRatingText}>{staff.rating}</Text>
            </View>
          )}
          {staff.specialties && staff.specialties.length > 0 && (
            <Text style={styles.staffSpecialty} numberOfLines={1}>
              {staff.specialties[0]}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
  );
};

// Tab components with real shop data
const AboutTab: React.FC<ServiceTabProps> = ({ service }) => {
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);
  const [businessHours, setBusinessHours] = useState<any[]>([]);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_SHOPS')) {
          logMockUsage('AboutTab', `for shop ${service.id}`);
          await mockDelay();
          
          const mockShops = getMockShops();
          const mockShop = mockShops.find(shop => shop.id === service.id);
          
          if (mockShop) {
            console.log('🎭 AboutTab using mock shop data:', mockShop.name);
            
            // Transform mock shop to CompleteShopData format
            const completeShopData: CompleteShopData = {
              ...mockShop,
              image_url: mockShop.images?.[0] || mockShop.logo,
              logo_url: mockShop.logo,
              reviews_count: mockShop.reviewCount,
              city: mockShop.address?.split(',')[1]?.trim() || 'New York',
              country: mockShop.address?.split(',')[2]?.trim() || 'NY',
              business_hours: Object.entries(mockShop.openingHours || {}).map(([day, hours]: [string, any]) => ({
                day_of_week: day,
                is_open: hours.isOpen,
                open_time: hours.open,
                close_time: hours.close
              })),
              staff: getMockStaff(service.id),
              services: getMockServices(service.id),
              discounts: null,
              payment_methods: [],
              certificate_images: [],
              before_after_images: mockShop.images?.slice(1) || [],
              welcome_message: mockShop.description,
              special_note: '',
              is_favorite: false,
              created_at: new Date().toISOString(),
              distance: ''
            };
            
            setShopData(completeShopData);
            return;
          }
        }
        
        const response = await normalizedShopService.getShopById(service.id);
        if (response.success && response.data) {
          console.log('🔍 About Tab - Shop data from same source as provider saves:', response.data);
          setShopData(response.data);
        }
      } catch (error) {
        console.error('Error fetching shop data for about tab:', error);
      }
    };

    const fetchBusinessHours = async () => {
      try {
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_SHOPS')) {
          await mockDelay();
          logMockUsage('Loading mock business hours');
          
          // Set mock business hours
          const mockHours = [
            { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
            { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
            { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
            { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
            { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '21:00' },
            { day: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '18:00' },
            { day: 'Sunday', isOpen: true, openTime: '11:00', closeTime: '17:00' }
          ];
          setBusinessHours(mockHours);
          console.log('✅ Mock business hours loaded');
          return;
        }

        console.log('🕐 Fetching business hours from provider_businesses table for shop:', service.id);
        const { data: providerData, error } = await supabase
          .from('provider_businesses')
          .select('business_hours')
          .eq('id', service.id)
          .single();

        if (error) {
          console.error('❌ Error fetching business hours:', error);
          return;
        }

        if (providerData?.business_hours) {
          console.log('✅ Found business hours:', providerData.business_hours);
          // Ensure business_hours is an array
          const hours = Array.isArray(providerData.business_hours) 
            ? providerData.business_hours 
            : [providerData.business_hours];
          setBusinessHours(hours);
        } else {
          console.log('⚠️ No business hours found for shop, creating default hours');
          // Create default business hours for demo
          const defaultHours = [
            { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
            { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
            { day: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '16:00' },
            { day: 'Sunday', isOpen: false, openTime: '10:00', closeTime: '16:00' }
          ];
          setBusinessHours(defaultHours);
        }
      } catch (error) {
        console.error('Error fetching business hours:', error);
        setBusinessHours([]);
      }
    };

    fetchShopData();
    fetchBusinessHours();
  }, [service?.id]);

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContent}>
          <Text style={styles.descriptionText}>
            {service.description || 'No description available for this business.'}
          </Text>
        </View>

        {/* Contact Information */}
        <View style={[styles.contactSection, {paddingHorizontal: 16}]}>
          
          {shopData?.phone && (
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color="#1A2533" />
              <Text style={styles.contactText}>{shopData.phone}</Text>
            </View>
          )}
          
          {shopData?.email && (
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color="#1A2533" />
              <Text style={styles.contactText}>{shopData.email}</Text>
            </View>
          )}
          
          {shopData?.website_url && (
            <View style={styles.contactItem}>
              <Ionicons name="globe-outline" size={20} color="#1A2533" />
              <Text style={styles.contactText}>{shopData.website_url}</Text>
            </View>
          )}

          {shopData?.address && (
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={20} color="#1A2533" />
              <Text style={styles.contactText}>
                {shopData.address}, {shopData.city}, {shopData.country}
              </Text>
            </View>
          )}
          
          {shopData?.address && (
            <View style={styles.mapContainer}>
              <TouchableOpacity 
                style={styles.mapTouchable}
                onPress={() => openMaps(shopData?.address, shopData?.city, shopData?.country)}
                activeOpacity={0.8}
              >
                {/* Enhanced map view with visual map design */}
                <View style={styles.mapView}>
                  {/* Map background pattern */}
                  <View style={styles.mapBackground}>
                    {/* Create a grid pattern to simulate map */}
                    {Array.from({ length: 12 }, (_, i) => (
                      <View key={`h-${i}`} style={[styles.mapGridLine, { top: i * 15, width: '100%', height: 1 }]} />
                    ))}
                    {Array.from({ length: 20 }, (_, i) => (
                      <View key={`v-${i}`} style={[styles.mapGridLine, { left: i * 20, height: '100%', width: 1 }]} />
                    ))}
                    
                    {/* Add some "roads" - diagonal lines */}
                    <View style={styles.mapRoad1} />
                    <View style={styles.mapRoad2} />
                    
                    {/* Add some building blocks */}
                    <View style={[styles.mapBlock, { top: 40, left: 60, width: 80, height: 40 }]} />
                    <View style={[styles.mapBlock, { top: 100, left: 200, width: 60, height: 50 }]} />
                    <View style={[styles.mapBlock, { top: 60, left: 280, width: 70, height: 35 }]} />
                  </View>
                  
                  {/* Location marker */}
                  <View style={styles.mapMarker}>
                    <Ionicons name="location" size={32} color="#EF4444" />
                  </View>
                  
                  {/* Location info */}
                  <View style={styles.mapInfoBox}>
                    <Text style={styles.mapLocationText}>
                      {shopData.address}
                    </Text>
                    <Text style={styles.mapCityText}>
                      {shopData.city}, {shopData.country}
                    </Text>
                  </View>
                </View>
                <View style={styles.mapOverlay}>
                  <View style={styles.mapOverlayContent}>
                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                    <Text style={styles.mapOverlayText}>Tap for directions</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Opening Hours */}
        <View style={styles.hoursSection}>
          <View style={styles.hoursSectionHeader}>
            <View style={styles.hoursHeaderLeft}>
              <Text style={styles.sectionTitle}>Hours</Text>
            </View>
            {businessHours && businessHours.length > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: getCurrentStatusColor(businessHours) }]}>
                <Text style={styles.statusBadgeText}>{getCurrentStatus(businessHours)}</Text>
              </View>
            )}
          </View>
          {businessHours && businessHours.length > 0 ? (
            <View style={[styles.hoursContainer, {paddingHorizontal: 16}]}>
              {businessHours.map((hours: any, index: number) => {
                const dayName = hours.day || hours.day_of_week || 'Unknown';
                const displayDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                const isToday = isTodayDay(dayName);
                const isOpen = hours.isOpen || hours.is_open;
                
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.enhancedHourRow,
                      isToday && styles.todayHourRow,
                      index === businessHours.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={styles.hourRowLeft}>
                      <View style={[styles.dayIndicator, isToday && styles.todayIndicator]}>
                        <View style={[styles.dayDot, isOpen ? styles.openDot : styles.closedDot]} />
                      </View>
                      <Text style={[styles.enhancedDayText, isToday && styles.todayDayText]}>
                        {displayDay}
                        {isToday && <Text style={styles.todayLabel}> (Today)</Text>}
                      </Text>
                    </View>
                    <View style={styles.hourRowRight}>
                      <Text style={[styles.enhancedTimeText, isToday && styles.todayTimeText]}>
                        {isOpen
                          ? `${hours.openTime || hours.open_time || '09:00'} - ${hours.closeTime || hours.close_time || '18:00'}`
                          : 'Closed'
                        }
                      </Text>
                      <Ionicons 
                        name={isOpen ? "checkmark-circle" : "close-circle"} 
                        size={16} 
                        color={isOpen ? "#10B981" : "#EF4444"}
                        style={styles.statusIcon}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.enhancedNoHoursContainer, {paddingHorizontal: 16}]}>
              <View style={styles.noHoursIconContainer}>
                <View style={styles.noHoursIconBackground}>
                  <Ionicons name="time-outline" size={28} color="#F59E0B" />
                </View>
              </View>
              <Text style={styles.enhancedNoHoursTitle}>Hours not available</Text>
              <Text style={styles.enhancedNoHoursSubtitle}>Contact the business for their operating hours</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const HoursTab: React.FC<ServiceTabProps> = ({ service }) => {
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);
  const [businessHours, setBusinessHours] = useState<any[]>([]);

  useEffect(() => {
    const fetchShopAndHoursData = async () => {
      try {
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_SHOPS')) {
          logMockUsage('HoursTab', `for shop ${service.id}`);
          await mockDelay();
          
          const mockShops = getMockShops();
          const mockShop = mockShops.find(shop => shop.id === service.id);
          
          if (mockShop) {
            console.log('🎭 HoursTab using mock shop data:', mockShop.name);
            
            // Transform mock shop to CompleteShopData format
            const completeShopData: CompleteShopData = {
              ...mockShop,
              image_url: mockShop.images?.[0] || mockShop.logo,
              logo_url: mockShop.logo,
              reviews_count: mockShop.reviewCount,
              city: mockShop.address?.split(',')[1]?.trim() || 'New York',
              country: mockShop.address?.split(',')[2]?.trim() || 'NY',
              business_hours: Object.entries(mockShop.openingHours || {}).map(([day, hours]: [string, any]) => ({
                day_of_week: day,
                is_open: hours.isOpen,
                open_time: hours.open,
                close_time: hours.close
              })),
              staff: getMockStaff(service.id),
              services: getMockServices(service.id),
              discounts: null,
              payment_methods: [],
              certificate_images: [],
              before_after_images: mockShop.images?.slice(1) || [],
              welcome_message: mockShop.description,
              special_note: '',
              is_favorite: false,
              created_at: new Date().toISOString(),
              distance: ''
            };
            
            setShopData(completeShopData);
            setBusinessHours(completeShopData.business_hours);
            return;
          }
        }
        
        // Fetch basic shop data
        const shopResponse = await normalizedShopService.getShopById(service.id);
        if (shopResponse.success && shopResponse.data) {
          console.log('🔍 Hours Tab - Shop data:', shopResponse.data);
          setShopData(shopResponse.data);
        }

        // Fetch business hours directly from shop_business_hours table
        console.log('🔍 Hours Tab - Fetching business hours from shop_business_hours table for shop:', service.id);
        const { data: hoursData, error: hoursError } = await supabase
          .from('shop_business_hours')
          .select('*')
          .eq('shop_id', service.id)
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (hoursError) {
          console.error('❌ Error fetching business hours:', hoursError);
        } else {
          console.log('✅ Hours Tab - Business hours from shop_business_hours:', hoursData);
          setBusinessHours(hoursData || []);
        }
      } catch (error) {
        console.error('Error fetching shop and hours data:', error);
      }
    };
    fetchShopAndHoursData();
  }, [service?.id]);

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.slice(0, 5); // Remove seconds
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        {businessHours && businessHours.length > 0 ? (
          <View style={[styles.hoursContainer, {paddingHorizontal: 16}]}>
            {dayNames.map((dayName, index) => {
              // Find business hours for this day from the shop_business_hours table
              const dayData = businessHours.find(bh => 
                bh.day.toLowerCase() === dayName.toLowerCase()
              );
              
              return (
                <View key={dayName} style={styles.hourRow}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <Text style={styles.hourTime}>
                    {dayData?.is_open 
                      ? `${formatTime(dayData.open_time || '')} - ${formatTime(dayData.close_time || '')}`
                      : 'Closed'
                    }
                  </Text>
                </View>
              );
            })}
          </View>
        ) : shopData?.business_hours_start && shopData?.business_hours_end ? (
          <View style={styles.hoursContainer}>
            <View style={styles.basicHoursContainer}>
              <Ionicons name="time-outline" size={20} color="#1A2533" />
              <Text style={styles.basicHoursText}>
                General hours: {formatTime(shopData.business_hours_start)} - {formatTime(shopData.business_hours_end)}
              </Text>
            </View>
            <Text style={styles.basicHoursNote}>
              * Detailed daily schedules not available
            </Text>
          </View>
        ) : (
          <View style={styles.noHoursContainer}>
            <Ionicons name="time-outline" size={48} color="#D1D5DB" />
            <Text style={styles.noHoursText}>Opening hours not specified</Text>
          </View>
        )}

        {shopData?.timezone && (
          <Text style={styles.timezoneText}>Timezone: {shopData.timezone}</Text>
        )}
      </View>
    </View>
  );
};

const OffersTab: React.FC<ServiceTabProps> = ({ service }) => {
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_SHOPS')) {
          logMockUsage('OffersTab', `for shop ${service.id}`);
          await mockDelay();
          
          const mockShops = getMockShops();
          const mockShop = mockShops.find(shop => shop.id === service.id);
          
          if (mockShop) {
            console.log('🎭 OffersTab using mock shop data:', mockShop.name);
            
            // Transform mock shop to CompleteShopData format
            const completeShopData: CompleteShopData = {
              ...mockShop,
              image_url: mockShop.images?.[0] || mockShop.logo,
              logo_url: mockShop.logo,
              reviews_count: mockShop.reviewCount,
              city: mockShop.address?.split(',')[1]?.trim() || 'New York',
              country: mockShop.address?.split(',')[2]?.trim() || 'NY',
              business_hours: Object.entries(mockShop.openingHours || {}).map(([day, hours]: [string, any]) => ({
                day_of_week: day,
                is_open: hours.isOpen,
                open_time: hours.open,
                close_time: hours.close
              })),
              staff: getMockStaff(service.id),
              services: getMockServices(service.id),
              discounts: null,
              payment_methods: [],
              certificate_images: [],
              before_after_images: mockShop.images?.slice(1) || [],
              welcome_message: mockShop.description,
              special_note: '',
              is_favorite: false,
              created_at: new Date().toISOString(),
              distance: ''
            };
            
            setShopData(completeShopData);
            return;
          }
        }
        
        const response = await normalizedShopService.getShopById(service.id);
        if (response.success && response.data) {
          console.log('🔍 Offers Tab - Shop discounts from same source as provider saves:', response.data?.discounts);
          setShopData(response.data);
        }
      } catch (error) {
        console.error('Error fetching shop data for offers tab:', error);
      }
    };
    fetchShopData();
  }, [service?.id]);

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pricetag-outline" size={20} color="#1A2533" />
          <Text style={styles.sectionTitle}>Current Offers</Text>
        </View>
        
        {shopData?.discounts && Array.isArray(shopData.discounts) && shopData.discounts.length > 0 ? (
          <View style={styles.offersContainer}>
            {shopData.discounts
              .filter(discount => discount && discount.type && discount.value)
              .map((discount, index) => (
              <View key={index} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <Ionicons name="gift-outline" size={24} color="#1A2533" />
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerTitle}>
                      {discount.type === 'percentage' ? `${discount.value}% OFF` : `${formatCurrency(discount.value)} OFF`}
                    </Text>
                    <Text style={styles.offerDescription}>{discount.description || 'Special offer'}</Text>
                  </View>
                </View>
                <Text style={styles.offerPeriod}>
                  Valid: {discount.start_date ? new Date(discount.start_date).toLocaleDateString() : 'Now'} - {discount.end_date ? new Date(discount.end_date).toLocaleDateString() : 'Ongoing'}
                </Text>
                {discount.usage_limit && (
                  <Text style={styles.offerUsage}>
                    Used: {discount.used_count || 0} / {discount.usage_limit}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noOffersContainer}>
            <Ionicons name="pricetag-outline" size={48} color="#D1D5DB" />
            <Text style={styles.noOffersText}>No current offers available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ReviewsTab: React.FC<ServiceTabProps> = ({ service, reviewStats }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_REVIEWS')) {
          logMockUsage('ReviewsTab', `for shop ${service.id}`);
          await mockDelay();
          
          const mockReviews = getMockReviews(service.id);
          console.log('🎭 Using mock reviews:', mockReviews.length);
          setReviews(mockReviews);
          setLoadingReviews(false);
          return;
        }
        
        const { reviewsAPI } = await import('../services/api/reviews/reviewsAPI');
        const response = await reviewsAPI.getProviderBusinessReviews(service.id, 10, 0);
        
        if (response.success && response.data) {
          setReviews(response.data);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (service?.id) {
      fetchReviews();
    }
  }, [service?.id]);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={16} color="#1A2533" />);
    }
    
    if (hasHalfStar && fullStars < 5) {
      stars.push(<Ionicons key="star-half" name="star-half" size={16} color="#1A2533" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`star-empty-${i}`} name="star-outline" size={16} color="#D1D5DB" />);
    }
    
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        
        {loadingReviews ? (
          <View style={styles.reviewsPlaceholder}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.reviewsPlaceholderText}>Loading reviews...</Text>
          </View>
        ) : reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.slice(0, 3).map((review, index) => (
              <View key={review.id || index} style={styles.reviewItem}>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <View style={styles.avatarBackground}>
                          <Ionicons name="person" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.avatarRing} />
                      </View>
                      <View style={styles.reviewerDetails}>
                        <Text style={styles.reviewerName}>Customer</Text>
                        <View style={styles.reviewRating}>
                          {renderStars(review.overall_rating || 5)}
                          <Text style={styles.ratingText}>
                            {review.overall_rating || 5}.0
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.reviewDateContainer}>
                      <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    </View>
                  </View>
                
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                
                  {(review.service_quality_rating || review.punctuality_rating || 
                    review.cleanliness_rating || review.value_rating) && (
                    <View style={styles.reviewDetailsGrid}>
                      {review.service_quality_rating && (
                        <View style={styles.reviewDetailItem}>
                          <Ionicons name="cut-outline" size={16} color="#6B7280" />
                          <Text style={styles.reviewDetailLabel}>Service</Text>
                          <View style={styles.ratingBadge}>
                            <Text style={styles.reviewDetailValue}>{review.service_quality_rating}/5</Text>
                          </View>
                        </View>
                      )}
                      {review.punctuality_rating && (
                        <View style={styles.reviewDetailItem}>
                          <Ionicons name="time-outline" size={16} color="#6B7280" />
                          <Text style={styles.reviewDetailLabel}>Punctuality</Text>
                          <View style={styles.ratingBadge}>
                            <Text style={styles.reviewDetailValue}>{review.punctuality_rating}/5</Text>
                          </View>
                        </View>
                      )}
                      {review.cleanliness_rating && (
                        <View style={styles.reviewDetailItem}>
                          <Ionicons name="sparkles-outline" size={16} color="#6B7280" />
                          <Text style={styles.reviewDetailLabel}>Cleanliness</Text>
                          <View style={styles.ratingBadge}>
                            <Text style={styles.reviewDetailValue}>{review.cleanliness_rating}/5</Text>
                          </View>
                        </View>
                      )}
                      {review.value_rating && (
                        <View style={styles.reviewDetailItem}>
                          <Ionicons name="cash-outline" size={16} color="#6B7280" />
                          <Text style={styles.reviewDetailLabel}>Value</Text>
                          <View style={styles.ratingBadge}>
                            <Text style={styles.reviewDetailValue}>{review.value_rating}/5</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
            
            {reviews.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AllReviews', {
                  reviews: reviews,
                  shopName: service?.name || 'Service'
                })}
              >
                <Text style={styles.viewAllButtonText}>View All Reviews ({reviews.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.reviewsPlaceholder}>
            {/* Attractive empty state design */}
            <View style={styles.reviewsEmptyContainer}>
              <View style={styles.reviewsIconContainer}>
                <View style={styles.reviewsIconBackground}>
                  <Ionicons name="star" size={32} color="#F59E0B" />
                </View>
                <View style={styles.reviewsIconAccent1} />
                <View style={styles.reviewsIconAccent2} />
              </View>
              
              <Text style={styles.reviewsEmptyTitle}>No reviews yet</Text>
              <Text style={styles.reviewsEmptySubtitle}>
                Be the first to share your experience with this service!
              </Text>
              
              {/* Star rating preview */}
              <View style={styles.reviewsPreviewStars}>
                {[1, 2, 3, 4, 5].map((star, index) => (
                  <Ionicons 
                    key={star} 
                    name="star-outline" 
                    size={20} 
                    color="#F59E0B"
                    style={[
                      styles.previewStar,
                      { animationDelay: `${index * 100}ms` }
                    ]}
                  />
                ))}
              </View>
              
              <Text style={styles.reviewsEmptyHint}>
                Your review helps others make better choices
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// Function to open maps with directions
const openMaps = (address: string, city: string, country: string) => {
  const fullAddress = `${address}, ${city}, ${country}`;
  const encodedAddress = encodeURIComponent(fullAddress);
  
  const ios = Platform.OS === 'ios';
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${encodedAddress}`;
  
  if (ios) {
    // On iOS, check if Apple Maps is available, otherwise use Google Maps
    Linking.canOpenURL(appleMapsUrl)
      .then((supported) => {
        if (supported) {
          Alert.alert(
            'Open Maps',
            'Choose your preferred maps app:',
            [
              {
                text: 'Apple Maps',
                onPress: () => Linking.openURL(appleMapsUrl),
              },
              {
                text: 'Google Maps',
                onPress: () => Linking.openURL(googleMapsUrl),
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
        } else {
          Linking.openURL(googleMapsUrl);
        }
      })
      .catch(() => Linking.openURL(googleMapsUrl));
  } else {
    // On Android, directly open Google Maps
    Linking.openURL(googleMapsUrl);
  }
};

const ServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<ServiceDetailNavigationProp>();
  const route = useRoute<ServiceDetailScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // Get service data from route params - handle both cases safely
  const routeService = route.params?.service || null;
  const routeServiceId = route.params?.serviceId || route.params?.service?.id || null;
  
  const [service, setService] = useState<Service | null>(() => {
    if (routeService) {
      // Always initialize is_favorite as false
      // It will be updated from the API call
      return {
        ...routeService,
        is_favorite: false
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!routeService);
  const [error, setError] = useState<string | null>(null);
  
  // Scroll and sticky tabs state
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Section refs for auto tab switching
  const sectionRefs = useRef({
    services: { y: 0 },
    team: { y: 0 },
    reviews: { y: 0 },
    offers: { y: 0 },
    about: { y: 0 }
  });
  
  // Discount state - only one discount allowed
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('services');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [allStaffMembers, setAllStaffMembers] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [shopServices, setShopServices] = useState<any[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [selectedServicesWithOptions, setSelectedServicesWithOptions] = useState<Map<string, Set<string>>>(new Map());
  const [servicesLoading, setServicesLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [shopData, setShopData] = useState<CompleteShopData | null>(null);
  const [businessHoursForHeader, setBusinessHoursForHeader] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{total_reviews: number; average_rating: number} | null>(null);
  const [realReviews, setRealReviews] = useState<any[]>([]);
  
  // Get images from shopData (provider_businesses table)
  const allServiceImages = React.useMemo(() => {
    console.log('🔄 Computing allServiceImages from shopData:', {
      hasShopData: !!shopData,
      hasImages: !!shopData?.images,
      imagesType: typeof shopData?.images,
      isArray: Array.isArray(shopData?.images),
      imageCount: Array.isArray(shopData?.images) ? shopData.images.length : 0,
      images: shopData?.images,
      image_url: shopData?.image_url,
      logo_url: shopData?.logo_url
    });

    if (shopData?.images && Array.isArray(shopData.images) && shopData.images.length > 0) {
      // Use images from provider_businesses.images column
      const validImages = shopData.images.filter(img => img && typeof img === 'string');
      console.log('✅ Using images array:', validImages);
      return validImages;
    } else if (shopData?.image_url) {
      // Fallback to single image_url if available
      console.log('📷 Using single image_url fallback:', shopData.image_url);
      return [shopData.image_url];
    } else if (shopData?.logo_url) {
      // Last fallback to logo_url
      console.log('🏢 Using logo_url fallback:', shopData.logo_url);
      return [shopData.logo_url];
    } else {
      // Default fallback images only if no database images
      console.log('⚠️ Using fallback images - no database images found');
      return [
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=400&h=300&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1552693673-1bf958298935?w=400&h=300&fit=crop&auto=format'
      ];
    }
  }, [shopData?.images, shopData?.image_url, shopData?.logo_url]);

  // Debug loading state changes
  console.log('🔄 ServiceDetailScreen render:', {
    loading,
    hasService: !!service,
    serviceId: service?.id,
    imagesCount: allServiceImages.length,
    shopDataImages: shopData?.images,
    shopDataImageUrl: shopData?.image_url,
    shopDataLogoUrl: shopData?.logo_url,
    finalImages: allServiceImages,
    shopDataLoaded: !!shopData
  });

  // Helper function to get closing time
  const getClosingTime = () => {
    if (!businessHoursForHeader || businessHoursForHeader.length === 0) {
      return '8:00 pm';
    }
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = businessHoursForHeader.find(bh => 
      bh && bh.day && typeof bh.day === 'string' && 
      bh.day.toLowerCase() === currentDay
    );
    return todayHours?.close_time || '8:00 pm';
  };

  // Helper function to check if business is currently open
  const isBusinessOpen = () => {
    if (!businessHoursForHeader || businessHoursForHeader.length === 0) {
      return false; // Default to closed if no hours available
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

    // Find today's hours
    const todayHours = businessHoursForHeader.find((hours: any) => {
      const dayName = hours.day || hours.day_of_week || '';
      return dayName.toLowerCase() === currentDay.toLowerCase();
    });

    if (!todayHours || (!todayHours.isOpen && !todayHours.is_open)) {
      return false;
    }

    // Parse open and close times
    const openTimeStr = todayHours.openTime || todayHours.open_time || '09:00';
    const closeTimeStr = todayHours.closeTime || todayHours.close_time || '18:00';
    
    const [openHour, openMinute] = openTimeStr.split(':').map(Number);
    const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);
    
    const openTime = openHour * 60 + (openMinute || 0);
    const closeTime = closeHour * 60 + (closeMinute || 0);
    
    return currentTime >= openTime && currentTime < closeTime;
  };
  
  // Remove service options hook to fix React hooks order warning

  // Load service data if not passed directly
  useEffect(() => {
    const loadService = async () => {
      // If we already have the service data, use it but still load favorite status
      if (routeService) {
        console.log('🚨 ROUTE SERVICE EXISTS - Setting service but will load favorite status');
        setService(routeService);
        setLoading(false);
        
        // CRITICAL FIX: Always load favorite status even when service comes from navigation
        const mockUserId = '12345678-1234-1234-1234-123456789012';
        console.log('🔍 ROUTE SERVICE FAVORITE LOADING:', {
          userId: mockUserId,
          serviceId: routeService.id,
          serviceName: routeService.name,
          routeServiceIsFavorite: routeService.is_favorite
        });
        
        try {
          const favoriteResponse = await favoritesAPI.isFavorite(mockUserId, routeService.id);
          console.log('📡 ROUTE SERVICE FAVORITE RESPONSE:', {
            success: favoriteResponse.success,
            data: favoriteResponse.data,
            is_favorite_value: favoriteResponse.data?.is_favorite
          });
          
          if (favoriteResponse.success) {
            const isFavorited = favoriteResponse.data?.is_favorite === true;
            console.log('🎯 ROUTE SERVICE FAVORITE UPDATE:', {
              from: routeService.is_favorite,
              to: isFavorited
            });
            
            setService(prev => {
              if (!prev) return prev;
              return { ...prev, is_favorite: isFavorited };
            });
          }
        } catch (error) {
          console.error('❌ Failed to load favorite status for route service:', error);
        }
        
        return;
      }

      // If we don't have a service ID, show error
      if (!routeServiceId) {
        console.error('❌ Route service ID is missing');
        setError('Service ID is missing');
        return;
      }
      
      console.log('🔍 Route service ID:', routeServiceId, 'Type:', typeof routeServiceId);

      try {
        // Don't set loading true if we already have a service (prevent flicker)
        if (!service) {
          setLoading(true);
        }
        setError(null);
        
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_SHOPS')) {
          logMockUsage('ServiceDetailScreen', `for shop ID ${routeServiceId}`);
          await mockDelay();
          
          const mockShops = getMockShops();
          const mockShop = mockShops.find(shop => shop.id === routeServiceId);
          
          if (mockShop) {
            console.log('🎭 Using mock shop data:', mockShop.name);
            
            // Transform mock shop to CompleteShopData format
            const completeShopData: CompleteShopData = {
              ...mockShop,
              image_url: mockShop.images?.[0] || mockShop.logo,
              logo_url: mockShop.logo,
              reviews_count: mockShop.reviewCount,
              city: mockShop.address?.split(',')[1]?.trim() || 'New York',
              country: mockShop.address?.split(',')[2]?.trim() || 'NY',
              business_hours: Object.entries(mockShop.openingHours || {}).map(([day, hours]: [string, any]) => ({
                day_of_week: day,
                is_open: hours.isOpen,
                open_time: hours.open,
                close_time: hours.close
              })),
              staff: getMockStaff(routeServiceId),
              services: getMockServices(routeServiceId),
              discounts: null,
              payment_methods: [],
              certificate_images: [],
              before_after_images: mockShop.images?.slice(1) || [],
              welcome_message: mockShop.description,
              special_note: '',
              is_favorite: false,
              created_at: new Date().toISOString(),
              distance: ''
            };
            
            // Transform to service format
            const serviceData = transformShopToService(completeShopData);
            console.log('🎭 Mock service data transformed:', serviceData.name);
            
            setService(serviceData);
            setLoading(false);
            return;
          } else {
            console.warn('🎭 Mock shop not found for ID:', routeServiceId);
          }
        }
        
        console.log('🔍 SHOP DATA LOADING - routeServiceId:', routeServiceId);
        console.log('🔍 This ID should be a SHOP ID (despite confusing variable names)');
        console.log('🔍 normalizedShopService available:', !!normalizedShopService);
        console.log('🔍 Attempting to fetch shop with ID:', routeServiceId);
        
        // CRITICAL CHECK
        if (routeServiceId === '4fd80c01-2dc1-4b6b-93c5-da1f0570b777') {
          console.log('🚨 LOADING THE PROBLEMATIC SHOP DATA!');
        }
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
        );
        
        // Fetch shop using normalized service (same as ShopDetailsScreen uses)
        const shopResponse = await Promise.race([
          normalizedShopService.getShopById(routeServiceId),
          timeoutPromise
        ]) as any;
        
        if (!shopResponse.success || !shopResponse.data) {
          console.log('❌ Normalized service failed, trying direct Supabase query...');
          
          // Fallback: Direct query to provider_businesses table
          const { data: directShopData, error: directError } = await supabase
            .from('provider_businesses')
            .select('*')
            .eq('id', routeServiceId)
            .single();
            
          if (directError || !directShopData) {
            throw new Error(directError?.message || shopResponse.error || 'Failed to fetch shop details');
          }
          
          console.log('✅ Direct query successful:', directShopData.name);
          shopResponse.data = directShopData;
        }
        
        const shop = shopResponse.data;
        
        // Validate shop data before transformation
        if (!shop) {
          throw new Error('Shop data is null or undefined');
        }
        
        console.log('🔍 Shop data before transformation:', {
          id: shop.id,
          name: shop.name,
          category: shop.category,
          city: shop.city,
          country: shop.country,
          images: shop.images,
          image_url: shop.image_url,
          logo_url: shop.logo_url
        });
        
        // Transform shop to service format
        const serviceData = transformShopToService(shop);
        console.log('🎨 Service after transformation:', {
          name: serviceData.name,
          id: serviceData.id,
          is_favorite: serviceData.is_favorite,
          is_favorite_type: typeof serviceData.is_favorite,
          image: serviceData.image,
          certificate_images: serviceData.certificate_images,
          before_after_images: serviceData.before_after_images
        });
        console.log('🚨 SETTING SERVICE WITH IS_FAVORITE:', serviceData.is_favorite);
        setService(serviceData);
        
        console.log('✅ Successfully loaded service details:', serviceData.name);
        console.log('✅ Shop ID:', routeServiceId);
        
        // Load favorite status from database
        const mockUserId = '12345678-1234-1234-1234-123456789012'; // Same as ServiceListScreen
        console.log('🔍 INITIAL FAVORITE STATUS LOADING:', {
          userId: mockUserId,
          serviceId: serviceData.id,
          serviceName: serviceData.name,
          currentIsFavorite: serviceData.is_favorite
        });
        
        const favoriteResponse = await favoritesAPI.isFavorite(mockUserId, serviceData.id);
        console.log('📡 INITIAL FAVORITE API RESPONSE:', {
          success: favoriteResponse.success,
          data: favoriteResponse.data,
          error: favoriteResponse.error,
          is_favorite_value: favoriteResponse.data?.is_favorite,
          is_favorite_type: typeof favoriteResponse.data?.is_favorite
        });
        
        if (favoriteResponse.success) {
          const isFavorited = favoriteResponse.data?.is_favorite === true;
          console.log('🎯 INITIAL FAVORITE STATE UPDATE:', {
            apiResponseValue: favoriteResponse.data?.is_favorite,
            calculatedIsFavorited: isFavorited,
            previousServiceFavorite: serviceData.is_favorite
          });
          
          // Update service with favorite status from database
          setService(prev => {
            if (!prev) return prev;
            const updated = { ...prev, is_favorite: isFavorited };
            console.log('✅ INITIAL SERVICE FAVORITE UPDATED:', { 
              from: prev.is_favorite, 
              to: updated.is_favorite,
              serviceId: prev.id,
              serviceName: prev.name
            });
            return updated;
          });
        } else {
          console.error('❌ Failed to load initial favorite status:', favoriteResponse.error);
          // Keep service as is_favorite: false as initialized
        }

        // Set default review stats (will be loaded separately)
        setReviewStats({ total_reviews: 0, average_rating: 0 });
        
        console.log('✅ Basic service loading completed, will load reviews separately');
      } catch (err) {
        console.error('❌ Error loading service:', err);
        setError(err instanceof Error ? err.message : 'Failed to load service');
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [routeServiceId, routeService]);

  // Load review stats separately to avoid blocking main loading
  useEffect(() => {
    const loadReviewStats = async () => {
      if (!routeServiceId) return;
      
      try {
        console.log('📊 Loading review stats for:', routeServiceId);
        const { reviewsAPI } = await import('../services/api/reviews/reviewsAPI');
        const reviewStatsResponse = await reviewsAPI.getProviderReviewStats(routeServiceId);
        
        if (reviewStatsResponse.success && reviewStatsResponse.data) {
          setReviewStats({
            total_reviews: reviewStatsResponse.data.total_reviews,
            average_rating: reviewStatsResponse.data.average_rating
          });
          console.log('✅ Review stats loaded:', reviewStatsResponse.data);
        }
      } catch (reviewError) {
        console.error('❌ Error loading review stats:', reviewError);
      }
    };
    
    // Load review stats after a short delay to let main content render first
    if (service) {
      setTimeout(loadReviewStats, 500);
    }
  }, [routeServiceId, service]);

  // Load services from shop data (already loaded by getShopById)
  useEffect(() => {
    const loadShopServices = async () => {
      console.log('🚀 SERVICES LOADING - useEffect triggered');
      console.log('🚀 Current service object:', service);
      console.log('🚀 routeServiceId:', routeServiceId);
      console.log('🚀 isLoading:', loading);
      console.log('🚀 shopData:', shopData);
      console.log('🚀 shopData.services:', shopData?.services);
      
      // Don't try to load services until the main shop data is loaded
      // Check both loading state AND if shopData has been attempted to load
      if (loading || (!shopData && !service)) {
        console.log('⏳ Main shop data still loading or not yet available, waiting...');
        console.log('   loading:', loading);
        console.log('   shopData:', !!shopData);
        console.log('   service:', !!service);
        return;
      }
      
      // CRITICAL FIX: Use services from shopData instead of separate query
      // The getShopById already loads services without is_active filter
      if (shopData?.services && shopData.services.length > 0) {
        console.log('✅ USING SERVICES FROM SHOP DATA - No separate query needed!');
        console.log('✅ Found', shopData.services.length, 'services in shopData');
        console.log('✅ Services details:', shopData.services.map(s => ({ 
          name: s.name, 
          price: s.price,
          is_active: s.is_active,
          id: s.id,
          shop_id: s.shop_id
        })));
        
        setShopServices(shopData.services);
        setServicesLoading(false);
        return;
      }
      
      // If shopData exists but has empty services array, still run fallback query
      // This handles the case where getShopById returned empty services due to timing
      if (shopData?.services && shopData.services.length === 0) {
        console.log('⚠️ shopData has empty services array - running fallback query for timing issues');
        // Add small delay for newly created shops to allow database consistency
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Fallback: if shopData doesn't have services, use route/service ID
      const shopId = routeServiceId || service?.id;
      
      if (!shopId) {
        console.log('⚠️ No shop ID found for loading services');
        console.log('⚠️ Service data:', service);
        console.log('⚠️ routeServiceId:', routeServiceId);
        console.log('⚠️ This should not happen - check route params');
        setServicesLoading(false); // Stop loading spinner
        setShopServices([]); // Set empty services
        return;
      }

      console.log('✅ SHOP ID CONFIRMED:', shopId);
      console.log('🔍 Setting servicesLoading to TRUE');
      setServicesLoading(true);
      console.log('🔍 Starting service query for shop ID:', shopId);
      
      try {
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_SERVICES')) {
          logMockUsage('ServiceDetailScreen Services', `for shop ${shopId}`);
          console.log('🔍 Looking for mock services with shopId:', shopId);
          await mockDelay();
          
          const mockServicesData = getMockServices(shopId);
          console.log('🎭 Found mock services:', mockServicesData.length);
          console.log('🎭 Mock services data:', mockServicesData.map(s => ({ id: s.id, name: s.name, shopId: s.shopId })));
          
          // Transform mock services to expected format
          const transformedServices = mockServicesData.map(service => ({
            id: service.id,
            shop_id: shopId,
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category: service.category,
            is_active: service.isActive !== false,
            assigned_staff: service.staffIds || [],
            image_url: service.image,
            created_at: new Date().toISOString()
          }));
          
          console.log('✅ Mock services loaded:', transformedServices.length);
          setShopServices(transformedServices);
          return; // Early return for mock data
        }
        
        // DEBUG: Check for the specific shop_id issue
        console.log('🚨 CRITICAL DEBUG - Service Loading Issue:');
        console.log('🚨 Current shopId being used in query:', shopId);
        console.log('🚨 Type of shopId:', typeof shopId);
        
        // Check if this is the problematic shop
        if (shopId === '4fd80c01-2dc1-4b6b-93c5-da1f0570b777') {
          console.log('🚨 THIS IS THE PROBLEMATIC SHOP!');
        }
        
        // First get ALL services to see what's in the database
        const { data: allServices, error: allError } = await supabase
          .from('shop_services')
          .select('*')
          .eq('shop_id', '4fd80c01-2dc1-4b6b-93c5-da1f0570b777');
        
        console.log('🚨 Services for shop 4fd80c01-2dc1-4b6b-93c5-da1f0570b777:', allServices);
        console.log('🚨 Found', allServices?.length || 0, 'services for this specific shop');
        
        // Fetch services directly from shop_services table
        console.log('🔍 EXECUTING MAIN QUERY for shop_id:', shopId);
        console.log('🔍 Query: SELECT * FROM shop_services WHERE shop_id =', shopId);
        
        const { data: servicesData, error: servicesError } = await supabase
          .from('shop_services')
          .select('*')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false });
          
        console.log('🔍 QUERY RESULT:');
        console.log('   Shop ID used:', shopId);
        console.log('   Error:', servicesError?.message || 'none');
        console.log('   Data count:', servicesData?.length || 0);
        console.log('   Raw data:', servicesData);
        
        if (servicesData && servicesData.length > 0) {
          console.log('   First service:', {
            id: servicesData[0].id,
            shop_id: servicesData[0].shop_id,
            name: servicesData[0].name,
            is_active: servicesData[0].is_active
          });
        }
          
        if (servicesError) {
          console.error('❌ FINAL ERROR - Failed to fetch services:', servicesError);
          console.error('❌ Setting shopServices to empty array');
          setShopServices([]);
        } else if (servicesData && servicesData.length > 0) {
          console.log('✅ SUCCESS - Found', servicesData.length, 'services for shop:', shopId);
          console.log('✅ Services details:', servicesData.map(s => ({ 
            name: s.name, 
            price: s.price,
            is_active: s.is_active,
            id: s.id,
            shop_id: s.shop_id
          })));
          console.log('✅ Calling setShopServices with data');
          setShopServices(servicesData);
          console.log('✅ shopServices state updated with', servicesData.length, 'services');
          
          // Double check what we're setting
          console.log('🚨 ACTUAL DATA being set to shopServices:', servicesData);
        } else {
          console.log('❌ NO DATA - No services found for shop:', shopId);
          console.log('❌ Raw query result:', servicesData);
          console.log('❌ Setting shopServices to empty array');
          setShopServices([]);
        }
      } catch (error) {
        console.error('❌ EXCEPTION in loadShopServices:', error);
        console.error('❌ Setting shopServices to empty array due to exception');
        setShopServices([]);
      } finally {
        console.log('🏁 FINALLY BLOCK - Setting servicesLoading to false');
        setServicesLoading(false);
        console.log('🏁 servicesLoading should now be false');
      }
    };

    // Add a small delay on initial mount to ensure shopData loads first
    const timeoutId = setTimeout(() => {
      loadShopServices();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [routeServiceId, loading, shopData]); // Depend on route ID, loading state, and shopData

  // Service options are now handled by the useServiceOptions hook below

  // Load all staff members initially - using same logic as ShopDetailsScreen
  useEffect(() => {
    const loadAllStaff = async () => {
      if (!routeServiceId) return;

      try {
        console.log('🔍 Loading all staff members for shop:', routeServiceId);
        
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_STAFF')) {
          logMockUsage('ServiceDetailScreen Staff', `for shop ${routeServiceId}`);
          await mockDelay();
          
          const mockStaffData = getMockStaff(routeServiceId);
          console.log('🎭 Using mock staff:', mockStaffData.length);
          
          if (mockStaffData && mockStaffData.length > 0) {
            // Transform mock staff to expected format
            const transformedStaff = mockStaffData.map(staff => ({
              id: staff.id,
              name: staff.name,
              email: staff.email,
              phone: staff.phone,
              role: staff.role,
              avatar_url: staff.avatar,
              shop_id: staff.shopId,
              bio: staff.bio,
              specialties: staff.specialties,
              rating: staff.rating,
              review_count: staff.reviewCount,
              experience_years: staff.experienceYears,
              is_active: staff.isActive,
              created_at: new Date().toISOString()
            }));
            
            console.log('✅ Mock staff loaded:', transformedStaff);
            setAllStaffMembers(transformedStaff);
            setStaffMembers(transformedStaff);
            return;
          }
        }
        
        // Use the same method as ShopDetailsScreen
        const staffResponse = await normalizedShopService.getStaffByShopId(routeServiceId);
        
        console.log('📊 Staff response:', staffResponse);
        
        let allStaff = [];
        
        if (staffResponse.success && staffResponse.data && staffResponse.data.length > 0) {
          allStaff = staffResponse.data;
          console.log('✅ Staff loaded from normalized service:', allStaff.length, 'staff members');
          console.log('✅ Staff details:', allStaff.map(s => ({ id: s.id, name: s.name, role: s.role })));
        } else {
          // Fallback to direct query (same as ShopDetailsScreen)
          console.log('⚠️ Normalized service failed, trying direct query...');
          
          const { data: staffData, error: staffError } = await supabase
            .from('shop_staff')
            .select('*')
            .eq('shop_id', routeServiceId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          
          if (staffData && staffData.length > 0) {
            allStaff = staffData;
            console.log('✅ Staff loaded from direct query:', allStaff.length, 'staff members');
          } else {
            console.log('⚠️ No staff found for shop:', routeServiceId);
            console.log('   - Direct query error:', staffError);
          }
        }

        // Transform staff data - simplified since normalized service returns proper format
        const transformedStaff = allStaff.map((staff, index) => {
          // Generate placeholder avatar if none exists
          const avatarColors = ['#1A2533', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'];
          const avatarColor = avatarColors[index % avatarColors.length];
          const placeholderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=${avatarColor.slice(1)}&color=fff&size=120`;
          
          return {
            id: staff.id,
            name: staff.name,
            avatar_url: staff.avatar_url || placeholderAvatar,
            specialties: Array.isArray(staff.specialties) ? staff.specialties : [],
            experience_years: staff.experience_years || 0,
            rating: staff.rating || 4.5,
            role: staff.role || 'Staff',
            email: staff.email || '',
            phone: staff.phone || '',
            bio: staff.bio || '',
            work_schedule: staff.work_schedule || {
              monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              saturday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
              sunday: { isWorking: false, startTime: '09:00', endTime: '18:00' }
            },
            leave_dates: staff.leave_dates || []
          };
        });
        
        console.log('✅ Transformed staff:', transformedStaff.map(s => ({ id: s.id, name: s.name, role: s.role })));

        // Always add "Any Available Staff" as an option
        transformedStaff.push({
          id: 'any',
          name: 'Any Available',
          avatar_url: `https://ui-avatars.com/api/?name=Any&background=6B7280&color=fff&size=120`,
          specialties: ['All Services'],
          experience_years: 0,
          rating: 0,
          work_schedule: {
            monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            saturday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            sunday: { isWorking: true, startTime: '09:00', endTime: '18:00' }
          },
          leave_dates: []
        });

        setAllStaffMembers(transformedStaff);
        setStaffMembers(transformedStaff);
        console.log('✅ All staff loaded and set:', transformedStaff.length);
        console.log('✅ Staff names:', transformedStaff.map(s => s.name));

      } catch (err) {
        console.error('❌ Error loading all staff:', err);
        // Still add "Any Available" option even if there's an error
        const anyOption = {
          id: 'any',
          name: 'Any Available',
          avatar_url: `https://ui-avatars.com/api/?name=Any&background=6B7280&color=fff&size=120`,
          specialties: ['All Services'],
          experience_years: 0,
          rating: 0,
          role: '',
          email: '',
          phone: '',
          work_schedule: {
            monday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            tuesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            wednesday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            thursday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            friday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            saturday: { isWorking: true, startTime: '09:00', endTime: '18:00' },
            sunday: { isWorking: true, startTime: '09:00', endTime: '18:00' }
          },
          leave_dates: []
        };
        setAllStaffMembers([anyOption]);
        setStaffMembers([anyOption]);
      }
    };

    loadAllStaff();
  }, [routeServiceId]); // Only depend on routeServiceId for initial load

  // Filter staff based on selected services
  useEffect(() => {
    if (allStaffMembers.length === 0) {
      console.log('⚠️ No staff members loaded yet');
      return; // Wait for staff to load first
    }

    // If no services selected, show all staff
    if (selectedServicesWithOptions.size === 0) {
      console.log('🔍 No services selected, showing all staff');
      setStaffMembers(allStaffMembers);
      return;
    }

    console.log('🔍 Filtering staff based on selected services...');
    
    const selectedServiceNames = Array.from(selectedServicesWithOptions.keys());
    console.log('🔍 Selected services:', selectedServiceNames);
    
    // Get the services data to check assigned_staff
    const selectedServicesData = shopServices.filter(service => 
      selectedServiceNames.includes(service.name)
    );
    
    console.log('🔍 Selected services data:', selectedServicesData);
    
    // Collect all staff IDs who can perform the selected services
    const availableStaffIds = new Set();
    
    selectedServicesData.forEach(service => {
      console.log(`📋 Service "${service.name}":`, {
        assigned_staff: service.assigned_staff,
        type: typeof service.assigned_staff,
        isArray: Array.isArray(service.assigned_staff)
      });
      
      if (service.assigned_staff) {
        let staffIds = service.assigned_staff;
        
        // Handle JSONB format
        if (typeof staffIds === 'string') {
          try {
            staffIds = JSON.parse(staffIds);
          } catch (e) {
            console.log(`   - Failed to parse assigned_staff as JSON:`, e);
            staffIds = [];
          }
        }
        
        if (Array.isArray(staffIds)) {
          staffIds.forEach(staffId => {
            console.log(`   - Adding staff ID: ${staffId}`);
            availableStaffIds.add(staffId.toString());
          });
        }
      }
    });
    
    console.log('🔍 Available staff IDs:', Array.from(availableStaffIds));
    console.log('🔍 All staff IDs:', allStaffMembers.map(s => s.id.toString()));
    
    // Filter staff based on assignments
    const filteredStaff = allStaffMembers.filter(staff => {
      // Always include "Any Available" option
      if (staff.id === 'any') return true;
      
      // If no staff assignments found, show all staff (service might not have assignments set)
      if (availableStaffIds.size === 0) return true;
      
      // Check if staff is assigned to any selected service
      const isAssigned = availableStaffIds.has(staff.id.toString());
      console.log(`   - Staff ${staff.name} (${staff.id}): ${isAssigned ? 'INCLUDED' : 'EXCLUDED'}`);
      return isAssigned;
    });
    
    console.log('🔍 Filtered staff:', filteredStaff.map(s => s.name));
    setStaffMembers(filteredStaff);

  }, [selectedServicesWithOptions, shopServices, allStaffMembers]);

  // Load service options for each service
  useEffect(() => {
    const loadServiceOptions = async () => {
      if (!shopServices || shopServices.length === 0) return;

      try {
        setOptionsLoading(true);
        console.log('🔍 Loading options for services:', shopServices.length);
        
        // Load options for each service
        const servicesWithOptions = await Promise.all(
          shopServices.map(async (service) => {
            // Load service options directly from service_options table
            console.log('🔍 Loading options for service:', {
              id: service.id,
              name: service.name,
              shop_id: service.shop_id || routeServiceId
            });
            
            try {
              // Check if we should use mock data
              if (shouldUseMockData('MOCK_SERVICES')) {
                await mockDelay();
                logMockUsage('Loading mock service options');
                
                // Generate mock options for the service based on service type
                let mockOptions = [];
                
                // Determine service category and create appropriate options
                const serviceName = service.name?.toLowerCase() || '';
                
                if (serviceName.includes('hair') || serviceName.includes('cut') || serviceName.includes('style')) {
                  mockOptions = [
                    { id: `${service.id}_opt1`, name: 'Quick Trim', price: service.price || 50, duration: 30, is_active: true, sort_order: 1 },
                    { id: `${service.id}_opt2`, name: 'Full Style & Cut', price: (service.price || 50) * 1.5, duration: 45, is_active: true, sort_order: 2 },
                    { id: `${service.id}_opt3`, name: 'Premium Style with Treatment', price: (service.price || 50) * 2, duration: 60, is_active: true, sort_order: 3 }
                  ];
                } else if (serviceName.includes('nail') || serviceName.includes('manicure') || serviceName.includes('pedicure')) {
                  mockOptions = [
                    { id: `${service.id}_opt1`, name: 'Express Service', price: service.price || 40, duration: 20, is_active: true, sort_order: 1 },
                    { id: `${service.id}_opt2`, name: 'Classic Polish', price: (service.price || 40) * 1.5, duration: 30, is_active: true, sort_order: 2 },
                    { id: `${service.id}_opt3`, name: 'Gel/Shellac Polish', price: (service.price || 40) * 2, duration: 45, is_active: true, sort_order: 3 }
                  ];
                } else if (serviceName.includes('massage') || serviceName.includes('spa')) {
                  mockOptions = [
                    { id: `${service.id}_opt1`, name: '30 Minute Session', price: service.price || 80, duration: 30, is_active: true, sort_order: 1 },
                    { id: `${service.id}_opt2`, name: '60 Minute Session', price: (service.price || 80) * 1.8, duration: 60, is_active: true, sort_order: 2 },
                    { id: `${service.id}_opt3`, name: '90 Minute Deep Tissue', price: (service.price || 80) * 2.5, duration: 90, is_active: true, sort_order: 3 }
                  ];
                } else if (serviceName.includes('facial') || serviceName.includes('skin')) {
                  mockOptions = [
                    { id: `${service.id}_opt1`, name: 'Basic Facial', price: service.price || 60, duration: 30, is_active: true, sort_order: 1 },
                    { id: `${service.id}_opt2`, name: 'Deep Cleansing Facial', price: (service.price || 60) * 1.5, duration: 45, is_active: true, sort_order: 2 },
                    { id: `${service.id}_opt3`, name: 'Anti-Aging Treatment', price: (service.price || 60) * 2, duration: 60, is_active: true, sort_order: 3 }
                  ];
                } else if (serviceName.includes('makeup') || serviceName.includes('bridal')) {
                  mockOptions = [
                    { id: `${service.id}_opt1`, name: 'Natural Look', price: service.price || 70, duration: 30, is_active: true, sort_order: 1 },
                    { id: `${service.id}_opt2`, name: 'Glamour Makeup', price: (service.price || 70) * 1.5, duration: 45, is_active: true, sort_order: 2 },
                    { id: `${service.id}_opt3`, name: 'Bridal Package', price: (service.price || 70) * 2.5, duration: 90, is_active: true, sort_order: 3 }
                  ];
                } else {
                  // Default options for other services
                  mockOptions = [
                    { id: `${service.id}_opt1`, name: 'Standard Service', price: service.price || 50, duration: 30, is_active: true, sort_order: 1 },
                    { id: `${service.id}_opt2`, name: 'Premium Service', price: (service.price || 50) * 1.5, duration: 45, is_active: true, sort_order: 2 },
                    { id: `${service.id}_opt3`, name: 'Deluxe Service', price: (service.price || 50) * 2, duration: 60, is_active: true, sort_order: 3 }
                  ];
                }
                
                const serviceOptions = mockOptions;
                
                if (serviceOptions && serviceOptions.length > 0) {
                  console.log('✅ Found', serviceOptions.length, 'mock options for service:', service.name);
                  
                  // Transform options to match expected format
                  const transformedOptions = serviceOptions.map(option => ({
                    ...option,
                    service_id: service.id,
                    option_name: option.name, // Map 'name' to 'option_name'
                    option_description: option.description || ''
                  }));
                  
                  return {
                    ...service,
                    options: transformedOptions
                  };
                }
                
                return service;
              }
              
              // Real API call - only if not using mock data
              const { data: serviceOptions, error: optionsError } = await supabase
                .from('service_options')
                .select('*')
                .eq('service_id', service.id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
              
              if (optionsError) {
                console.error('❌ Error loading service options:', optionsError);
                return service; // Return service without options
              }
              
              if (serviceOptions && serviceOptions.length > 0) {
                console.log('✅ Found', serviceOptions.length, 'options for service:', service.name);
                
                // Transform options to match expected format
                const transformedOptions = serviceOptions.map(option => ({
                  id: option.id,
                  service_id: option.service_id,
                  option_name: option.option_name,
                  option_description: option.option_description || '',
                  price: option.price,
                  duration: option.duration,
                  is_active: option.is_active,
                  sort_order: option.sort_order || 0
                }));
                
                return { ...service, options: transformedOptions };
              } else {
                console.log('ℹ️ No options found for service:', service.name);
                return service; // Return service without options
              }
              
            } catch (error) {
              console.error('❌ Unexpected error loading service options:', error);
              return service; // Return service without options on error
            }
          })
        );
        
        setShopServices(servicesWithOptions);
        console.log('✅ Loaded service options successfully');
      } catch (err) {
        console.error('❌ Error loading service options:', err);
      } finally {
        setOptionsLoading(false);
      }
    };

    // Only load if we have services and haven't loaded options yet
    if (shopServices.length > 0 && !shopServices.some(s => s.options)) {
      loadServiceOptions();
    }
  }, [shopServices, routeServiceId]);

  // Calculate selected count for display
  const selectedCount = Array.from(selectedServicesWithOptions.values())
    .reduce((sum, options) => sum + options.size, 0);

  // Images are loaded through the main loadHeaderData function using normalizedShopService

  // Load business hours and shop data for header
  useEffect(() => {
    const loadHeaderData = async () => {
      if (!service?.id) return;

      try {
        console.log('🕐 Loading business hours and shop data for header:', service.id);
        
        // Check if we should use mock data
        if (shouldUseMockData('MOCK_SHOPS')) {
          logMockUsage('ServiceDetailScreen Header', `business hours for shop ${service.id}`);
          
          const mockShops = getMockShops();
          const mockShop = mockShops.find(shop => shop.id === service.id);
          
          if (mockShop && mockShop.openingHours) {
            const mockHours = Object.entries(mockShop.openingHours).map(([day, hours]: [string, any]) => ({
              day_of_week: day,
              is_open: hours.isOpen,
              open_time: hours.open,
              close_time: hours.close
            }));
            setBusinessHoursForHeader(mockHours);
            console.log('🎭 Loaded mock business hours for header:', mockHours);
          } else {
            console.log('⚠️ No mock business hours found, using default hours');
          }
        } else {
          // Fetch business hours from provider_businesses table
          const { data: providerData, error } = await supabase
            .from('provider_businesses')
            .select('business_hours')
            .eq('id', service.id)
            .single();

          if (!error && providerData?.business_hours) {
            const hours = Array.isArray(providerData.business_hours) 
              ? providerData.business_hours 
              : [providerData.business_hours];
            setBusinessHoursForHeader(hours);
            console.log('✅ Loaded business hours for header:', hours);
          } else {
            console.log('⚠️ No business hours found, using default hours');
            // Default hours fallback
            const defaultHours = [
              { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
              { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
              { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
              { day: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '16:00' },
              { day: 'Sunday', isOpen: false, openTime: '10:00', closeTime: '16:00' }
            ];
            setBusinessHoursForHeader(defaultHours);
          }
        }

        // Fetch complete shop data for discounts and other header info
        if (shouldUseMockData('MOCK_SHOPS')) {
          logMockUsage('ServiceDetailScreen Header', `shop data for ${service.id}`);
          
          const mockShops = getMockShops();
          const mockShop = mockShops.find(shop => shop.id === service.id);
          
          if (mockShop) {
            const completeShopData: CompleteShopData = {
              ...mockShop,
              image_url: mockShop.images?.[0] || mockShop.logo,
              logo_url: mockShop.logo,
              reviews_count: mockShop.reviewCount,
              city: mockShop.address?.split(',')[1]?.trim() || 'New York',
              country: mockShop.address?.split(',')[2]?.trim() || 'NY',
              business_hours: Object.entries(mockShop.openingHours || {}).map(([day, hours]: [string, any]) => ({
                day_of_week: day,
                is_open: hours.isOpen,
                open_time: hours.open,
                close_time: hours.close
              })),
              staff: getMockStaff(service.id),
              services: getMockServices(service.id),
              discounts: null,
              payment_methods: [],
              certificate_images: [],
              before_after_images: mockShop.images?.slice(1) || [],
              welcome_message: mockShop.description,
              special_note: '',
              is_favorite: false,
              created_at: new Date().toISOString(),
              distance: ''
            };
            
            console.log('🎭 Header - Mock shop data loaded:', {
              id: completeShopData.id,
              name: completeShopData.name,
              hasImages: !!completeShopData.images,
              imagesLength: Array.isArray(completeShopData.images) ? completeShopData.images.length : 'not array',
            });
            setShopData(completeShopData);
          }
        } else {
          const shopResponse = await normalizedShopService.getShopById(service.id);
          if (shopResponse.success && shopResponse.data) {
            console.log('🔍 Header - Shop data loaded:', {
              id: shopResponse.data.id,
              name: shopResponse.data.name,
              hasImages: !!shopResponse.data.images,
              imagesType: typeof shopResponse.data.images,
              imagesLength: Array.isArray(shopResponse.data.images) ? shopResponse.data.images.length : 'not array',
              imageUrls: shopResponse.data.images,
              image_url: shopResponse.data.image_url,
              logo_url: shopResponse.data.logo_url
            });
            setShopData(shopResponse.data);
          }
        }

        // Fetch reviews from database or mock data
        try {
          // Check if we should use mock data
          if (shouldUseMockData('MOCK_REVIEWS')) {
            logMockUsage('ServiceDetailScreen Header', `reviews for shop ${service.id}`);
            await mockDelay();
            
            const mockReviews = getMockReviews(service.id);
            console.log('🎭 Using mock reviews for header:', mockReviews.length);
            setRealReviews(mockReviews);
            
            // Calculate mock review stats
            const totalReviews = mockReviews.length;
            const averageRating = totalReviews > 0 
              ? mockReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
              : 0;
            setReviewStats({ total_reviews: totalReviews, average_rating: averageRating });
          } else {
            const { reviewsAPI } = await import('../services/api/reviews/reviewsAPI');
            const reviewsResponse = await reviewsAPI.getProviderBusinessReviews(service.id, 5);
            if (reviewsResponse.success && reviewsResponse.data) {
              console.log('📝 Real reviews loaded:', reviewsResponse.data.length);
              setRealReviews(reviewsResponse.data);
              
              // Calculate real review stats
              const totalReviews = reviewsResponse.data.length;
              const averageRating = totalReviews > 0 
                ? reviewsResponse.data.reduce((sum, review) => sum + review.overall_rating, 0) / totalReviews
                : 0;
              setReviewStats({ total_reviews: totalReviews, average_rating: averageRating });
            }
          }
        } catch (reviewError) {
          console.error('❌ Error loading reviews:', reviewError);
        }

        // Check if we should use mock data for discounts
        if (shouldUseMockData('MOCK_DISCOUNTS')) {
          await mockDelay();
          logMockUsage('Loading mock discounts');
          
          // Create mock discount
          const mockDiscount = {
            id: `discount_${service.id}`,
            title: 'New Customer Special',
            discount_percentage: 20,
            description: 'Get 20% off your first visit!',
            type: 'percentage',
            code: 'WELCOME20'
          };
          
          console.log('✅ Mock discount loaded:', mockDiscount);
          
          // Update service with mock discount data
          console.log('🎫 MOCK DISCOUNT - Before setService, is_favorite:', service?.is_favorite);
          setService(prev => {
            console.log('🎫 MOCK DISCOUNT - setService prev.is_favorite:', prev?.is_favorite);
            return prev ? {
              ...prev,
              discounts: mockDiscount,
              category: prev.category || 'Beauty & Wellness'
            } : null;
          });
          
          // Also update shopData
          if (shopData) {
            setShopData({
              ...shopData,
              discounts: mockDiscount
            });
          }
        } else {
          // Fetch real discounts from shop_discounts table
          console.log('💰 Fetching real discounts for shop:', service.id);
          const { data: discountsData, error: discountsError } = await supabase
            .from('shop_discounts')
            .select('*')
            .eq('shop_id', service.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);

          console.log('💰 Discount query result:', { discountsData, discountsError });

          if (!discountsError && discountsData && discountsData.length > 0) {
            const discount = discountsData[0]; // Take the first discount
            console.log('✅ Real discount found:', discount);
            const discountInfo = {
              id: discount.id, // Include the actual UUID from database
              title: discount.title,
              discount_percentage: discount.value,
              description: discount.description,
              type: discount.type,
              code: discount.code
            };
          
            // Update service with real discount data
            console.log('🎫 REAL DISCOUNT - Before setService, is_favorite:', service?.is_favorite);
            setService(prev => {
              console.log('🎫 REAL DISCOUNT - setService prev.is_favorite:', prev?.is_favorite);
              return prev ? {
                ...prev,
                discounts: discountInfo,
                category: prev.category || shopData?.category
              } : null;
            });
            
            // Also update shopData
            if (shopData) {
              setShopData(prev => prev ? {
                ...prev,
                discounts: discountInfo
              } : null);
            }
          } else {
            console.log('⚠️ No active discounts found in database - will not show discount banner');
            // Don't set any discount data - let the discount banner conditionally not render
            console.log('🎫 NO DISCOUNT - Before setService, is_favorite:', service?.is_favorite);
            setService(prev => {
              console.log('🎫 NO DISCOUNT - setService prev.is_favorite:', prev?.is_favorite);
              return prev ? {
                ...prev,
                discounts: null, // Explicitly set to null so discount banner won't show
                category: prev.category || shopData?.category
              } : null;
            });
          }
        }
      } catch (error) {
        console.error('Error loading business hours for header:', error);
      }
    };

    loadHeaderData();
  }, [service?.id]);

  // Only show loading screen on initial load, not on subsequent updates
  if (loading && !service) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
      </View>
    );
  }

  // Render error state (don't use early return)  
  if (error || !service) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {error || 'Service not found'}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBookNow = () => {
    if (selectedServicesWithOptions.size === 0) {
      Alert.alert('No Selection', 'Please select at least one service to continue.');
      return;
    }

    if (!selectedStaff) {
      Alert.alert('No Staff Selected', 'Please select a staff member to continue.');
      return;
    }

    // Prepare selected services for booking
    const selectedServices: any[] = [];
    selectedServicesWithOptions.forEach((optionIds, serviceName) => {
      const service = shopServices.find(s => s.name === serviceName);
      if (service) {
        if (optionIds.has('base')) {
          // Base service selected
          selectedServices.push({
            id: service.id,
            name: service.name,
            price: service.price,
            duration: service.duration,
            type: 'base'
          });
        } else {
          // Options selected
          optionIds.forEach(optionId => {
            const option = service.options?.find((opt: any) => opt.id === optionId);
            if (option) {
              selectedServices.push({
                id: option.id,
                name: `${service.name} - ${option.option_name}`,
                price: option.price,
                duration: option.duration,
                type: 'option',
                serviceName: service.name
              });
            }
          });
        }
      }
    });

    const selectedStaffMember = staffMembers.find(staff => staff.id === selectedStaff);
    const priceBreakdown = calculatePriceBreakdown();
    
    // Debug: Log available data for shop ID determination
    console.log('🔍 ServiceDetail Debug - shopData:', shopData);
    console.log('🔍 ServiceDetail Debug - selectedStaffMember:', selectedStaffMember);
    console.log('🔍 ServiceDetail Debug - service.id:', service.id);
    
    // Prepare booking details
    // Note: 'service' here is actually a shop object from getShopById, so service.id IS the shop ID
    const shopId = service.id; // This is the correct shop ID
    const bookingDetails = {
      serviceId: service.id, // This is also the shop ID (confusing naming)
      shopId: shopId,
      shopName: shopData?.name || service.salon_name || service.name,
      shopAddress: shopData?.address || service.location || 'Address not available',
      shopContact: shopData?.phone || 'Contact not available'
    };
    
    console.log('🔍 ServiceDetail Debug - Final bookingDetails:', bookingDetails);
    
    navigation.navigate('BookingSummary', {
      selectedServices,
      totalPrice: calculateTotalPrice(),
      selectedStaff: selectedStaffMember,
      selectedDiscount: selectedDiscount,
      priceBreakdown: priceBreakdown,
      bookingDetails: bookingDetails
    });
  };

  // TODO: Add focus refresh later after fixing hooks issue
  // For now, the favorite status will be updated when toggling favorites

  const handleFavoritePress = async () => {
    // Use mock user ID if no user is authenticated
    const userId = user?.id || '12345678-1234-1234-1234-123456789012';
    
    console.log('🤍 FAVORITE PRESS DEBUG:', {
      userId,
      serviceId: service?.id,
      serviceName: service?.name,
      currentFavoriteStatus: service?.is_favorite,
      serviceExists: !!service
    });
    
    if (!userId) {
      Alert.alert('Login Required', 'Please login to add favorites');
      return;
    }

    if (!service?.id) {
      console.error('❌ Service ID is missing:', service);
      Alert.alert('Error', 'Service information is missing');
      return;
    }

    try {
      console.log('🤍 Toggling favorite for service:', service.id);
      
      // Use the same API wrapper as ServiceListScreen
      const apiService = {
        async toggleFavorite(userId: string, serviceId: string) {
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
        }
      };
      
      const response = await apiService.toggleFavorite(userId, service.id);
      
      // TEMP DEBUG - Let's see what's happening
      console.log('🔍 ServiceDetailScreen Debug:', {
        'API Success': response.success,
        'Response Data': response.data,
        'Current service.is_favorite': service.is_favorite,
        'Extracted isFavorite': response.data?.isFavorite,
        'Will set to': response.data?.isFavorite === true
      });
      
      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to update favorite');
        return;
      }
      
      // Update local state - use isFavorite from API wrapper (same as ServiceListScreen)
      const isNowFavorited = response.data?.isFavorite === true;
      console.log('🔄 Updating service state:', { before: service.is_favorite, after: isNowFavorited });
      setService(prev => prev ? { ...prev, is_favorite: isNowFavorited } : prev);
      
      // Silent success (no alert popup)
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  // Toggle service expansion
  const toggleServiceExpansion = (serviceId: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  // Toggle service option selection
  const toggleServiceOption = (serviceName: string, optionId: string) => {
    setSelectedServicesWithOptions(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(serviceName)) {
        newMap.set(serviceName, new Set());
      }
      const options = newMap.get(serviceName)!;
      if (options.has(optionId)) {
        options.delete(optionId);
        if (options.size === 0) {
          newMap.delete(serviceName);
        }
      } else {
        options.add(optionId);
      }
      return newMap;
    });
  };

  // Calculate total price for selected services and options
  const calculateTotalPrice = () => {
    let subtotal = 0;
    selectedServicesWithOptions.forEach((optionIds, serviceName) => {
      const service = shopServices.find(s => s.name === serviceName);
      if (service) {
        optionIds.forEach(optionId => {
          if (optionId === 'base') {
            // Base service selected
            subtotal += service.price || 0;
          } else {
            // Option selected
            const option = service.options?.find((opt: any) => opt.id === optionId);
            if (option) {
              subtotal += option.price || 0;
            }
          }
        });
      }
    });
    
    // Apply discount if selected
    let discountAmount = 0;
    if (selectedDiscount && selectedDiscount.percentage) {
      discountAmount = Math.round(subtotal * (selectedDiscount.percentage / 100));
    }
    
    const discountedTotal = subtotal - discountAmount;
    
    return discountedTotal;
  };

  // Calculate price breakdown with all details
  const calculatePriceBreakdown = () => {
    let subtotal = 0;
    selectedServicesWithOptions.forEach((optionIds, serviceName) => {
      const service = shopServices.find(s => s.name === serviceName);
      if (service) {
        optionIds.forEach(optionId => {
          if (optionId === 'base') {
            subtotal += service.price || 0;
          } else {
            const option = service.options?.find((opt: any) => opt.id === optionId);
            if (option) {
              subtotal += option.price || 0;
            }
          }
        });
      }
    });
    
    // Apply discount if selected
    let discountAmount = 0;
    if (selectedDiscount && selectedDiscount.percentage) {
      discountAmount = Math.round(subtotal * (selectedDiscount.percentage / 100));
    }
    
    const discountedSubtotal = subtotal - discountAmount;
    const gstAmount = 0; // GST removed
    const finalTotal = discountedSubtotal; // No GST added
    
    return {
      subtotal,
      discountAmount,
      discountedSubtotal,
      gstAmount,
      finalTotal,
      hasDiscount: !!selectedDiscount
    };
  };

  // Removed old renderOptionItem as we're using services view now

  // Render services with dropdown options
  const renderServicesContent = () => {
    console.log('🛠️ Rendering services content...');
    console.log('🛠️ Services loading:', servicesLoading);
    console.log('🛠️ Shop services:', shopServices);
    console.log('🛠️ Shop services length:', shopServices?.length);
    console.log('🛠️ Shop services type:', typeof shopServices);
    console.log('🛠️ Shop services is array:', Array.isArray(shopServices));
    console.log('🛠️ Current route service ID:', routeServiceId);
    console.log('🛠️ Current service name:', service?.name);
    console.log('🚨 RENDER CHECK - Shop services data:', shopServices?.map(s => s.name));
    
    if (servicesLoading) {
      console.log('🔄 Showing loading state for services');
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      );
    }

    if (!shopServices || shopServices.length === 0) {
      console.log('⚠️ Showing no services state - shopServices:', shopServices);
      return (
        <View style={styles.noOptionsContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#1A2533" />
          <Text style={styles.noOptionsText}>No services available</Text>
          <Text style={styles.noOptionsSubtext}>This shop has not added any services yet</Text>
        </View>
      );
    }
    
    console.log('✅ Rendering', shopServices.length, 'services');

    // Group services by category - matching the shop creation modal exactly
    const serviceCategories = [
      { id: 'beauty-wellness', name: 'Beauty & Wellness', icon: 'sparkles-outline' },
      { id: 'hair-salon', name: 'Hair Salon', icon: 'cut-outline' },
      { id: 'spa-wellness', name: 'Spa & Wellness', icon: 'flower-outline' },
      { id: 'nail-care', name: 'Nail Care', icon: 'hand-left-outline' },
      { id: 'massage-therapy', name: 'Massage Therapy', icon: 'accessibility-outline' },
      { id: 'skincare', name: 'Skincare', icon: 'water-outline' },
      { id: 'fitness-health', name: 'Fitness & Health', icon: 'fitness-outline' },
      { id: 'home-services', name: 'Home Services', icon: 'home-outline' },
      { id: 'auto-services', name: 'Auto Services', icon: 'car-outline' },
      { id: 'pet-care', name: 'Pet Care', icon: 'paw-outline' },
      { id: 'food-dining', name: 'Food & Dining', icon: 'restaurant-outline' },
      { id: 'education', name: 'Education', icon: 'school-outline' },
      { id: 'other', name: 'Other', icon: 'ellipsis-horizontal-outline' }
    ];

    // Categorize services based on their names/descriptions
    const categorizeService = (service: any) => {
      const name = service.name?.toLowerCase() || '';
      const desc = service.description?.toLowerCase() || '';
      const combined = name + ' ' + desc;
      
      if (combined.includes('hair') || combined.includes('cut') || combined.includes('style') || combined.includes('color') || combined.includes('perm')) {
        return 'hair-salon';
      } else if (combined.includes('spa') || combined.includes('wellness') || combined.includes('relax')) {
        return 'spa-wellness';
      } else if (combined.includes('massage') || combined.includes('therapy') || combined.includes('deep tissue') || combined.includes('swedish')) {
        return 'massage-therapy';
      } else if (combined.includes('nail') || combined.includes('manicure') || combined.includes('pedicure') || combined.includes('polish')) {
        return 'nail-care';
      } else if (combined.includes('facial') || combined.includes('skin') || combined.includes('cleanse') || combined.includes('peel') || combined.includes('acne')) {
        return 'skincare';
      } else if (combined.includes('makeup') || combined.includes('beauty') || combined.includes('lash') || combined.includes('brow') || combined.includes('cosmetic')) {
        return 'beauty-wellness';
      } else if (combined.includes('fitness') || combined.includes('gym') || combined.includes('health') || combined.includes('personal training')) {
        return 'fitness-health';
      } else if (combined.includes('home') || combined.includes('cleaning') || combined.includes('repair') || combined.includes('maintenance')) {
        return 'home-services';
      } else if (combined.includes('auto') || combined.includes('car') || combined.includes('vehicle') || combined.includes('mechanic')) {
        return 'auto-services';
      } else if (combined.includes('pet') || combined.includes('dog') || combined.includes('cat') || combined.includes('grooming') || combined.includes('veterinary')) {
        return 'pet-care';
      } else if (combined.includes('food') || combined.includes('dining') || combined.includes('restaurant') || combined.includes('catering')) {
        return 'food-dining';
      } else if (combined.includes('education') || combined.includes('tutoring') || combined.includes('teaching') || combined.includes('training')) {
        return 'education';
      } else {
        return 'other';
      }
    };

    // Group services by category
    const groupedServices = shopServices.reduce((acc: any, service: any) => {
      const category = categorizeService(service);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {});

    return (
      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>Services</Text>
        {serviceCategories.map((category) => {
          const servicesInCategory = groupedServices[category.id] || [];
          if (servicesInCategory.length === 0) return null;
          
          return (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
              </View>
              
              {servicesInCategory.map((service: any, index: number) => (
          <View key={service.id || index} style={styles.serviceCard}>
            <TouchableOpacity 
              style={styles.serviceHeader}
              onPress={() => toggleServiceExpansion(service.id || service.name)}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDuration}>{service.duration || 0} mins</Text>
                {selectedDiscount && selectedDiscount.percentage ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.servicePrice}>${Math.round((service.price || 0) * (1 - selectedDiscount.percentage / 100))}</Text>
                    <Text style={styles.servicePriceOriginal}>${service.price || 0}</Text>
                  </View>
                ) : (
                  <Text style={styles.servicePrice}>${service.price || 0}</Text>
                )}
              </View>
              <Ionicons 
                name={expandedServices.has(service.id || service.name) ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#666666" 
              />
            </TouchableOpacity>
            
            {expandedServices.has(service.id || service.name) && (
              <View style={styles.serviceOptionsDropdown}>
                {(!service.options || service.options.length === 0) ? (
                  <View style={styles.noOptionsMessage}>
                    <Text style={styles.noOptionsText}>No options available for this service</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectBaseService,
                        selectedServicesWithOptions.get(service.name)?.has('base') && styles.serviceOptionSelected
                      ]}
                      onPress={() => toggleServiceOption(service.name, 'base')}
                    >
                      <View style={[styles.checkbox, selectedServicesWithOptions.get(service.name)?.has('base') && styles.checkboxSelected]}>
                        {selectedServicesWithOptions.get(service.name)?.has('base') && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      {selectedDiscount && selectedDiscount.percentage ? (
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.selectBaseServiceText}>Select base service</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Text style={[styles.selectBaseServiceText, { textDecorationLine: 'line-through', color: '#9CA3AF', fontSize: 12 }]}>(${service.price} NZD)</Text>
                            <Text style={[styles.selectBaseServiceText, { color: '#EF4444', fontWeight: '700', marginLeft: 6 }]}>(${Math.round(service.price * (1 - selectedDiscount.percentage / 100))} NZD)</Text>
                            <Text style={[styles.selectBaseServiceText, { color: '#059669', fontSize: 10, marginLeft: 6 }]}>Save ${Math.round(service.price * selectedDiscount.percentage / 100)} NZD</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.selectBaseServiceText}>Select base service (${service.price} NZD)</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  service.options.map((option: any) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.serviceOption,
                        selectedServicesWithOptions.get(service.name)?.has(option.id) && styles.serviceOptionSelected
                      ]}
                      onPress={() => toggleServiceOption(service.name, option.id)}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[styles.checkbox, selectedServicesWithOptions.get(service.name)?.has(option.id) && styles.checkboxSelected]}>
                          {selectedServicesWithOptions.get(service.name)?.has(option.id) && <Ionicons name="checkmark" size={16} color="white" />}
                        </View>
                        <View style={styles.optionInfo}>
                          <Text style={styles.optionName}>{option.option_name}</Text>
                          {option.option_description && <Text style={styles.optionDescription}>{option.option_description}</Text>}
                          <Text style={styles.optionDuration}>{option.duration} min</Text>
                        </View>
                      </View>
                      {selectedDiscount && selectedDiscount.percentage ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.optionPrice, { fontSize: 14, textDecorationLine: 'line-through', color: '#9CA3AF' }]}>${option.price} NZD</Text>
                          <Text style={styles.optionPrice}>${Math.round(option.price * (1 - selectedDiscount.percentage / 100))} NZD</Text>
                          <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600' }}>Save ${Math.round(option.price * selectedDiscount.percentage / 100)} NZD</Text>
                        </View>
                      ) : (
                        <Text style={styles.optionPrice}>${option.price} NZD</Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
              ))}
            </View>
          );
        })}
        
        {false && selectedServicesWithOptions.size > 0 && (
          <View style={styles.selectedOptionSummary}>
            <Text style={styles.summaryTitle}>Selected Services ({selectedServicesWithOptions.size})</Text>
            {(() => {
              const breakdown = calculatePriceBreakdown();
              return (
                <>
                  {breakdown.hasDiscount && (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>${breakdown.subtotal} NZD</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, styles.discountLabel]}>
                          Discount ({selectedDiscount.percentage}%)
                        </Text>
                        <Text style={[styles.summaryValue, styles.discountValue]}>-${breakdown.discountAmount} NZD</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      {breakdown.hasDiscount ? 'After Discount' : 'Total Price'}
                    </Text>
                    <Text style={styles.summaryValue}>${breakdown.discountedSubtotal} NZD</Text>
                  </View>
                  {breakdown.gstAmount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>GST (15%)</Text>
                      <Text style={styles.summaryValue}>${breakdown.gstAmount} NZD</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.finalTotalRow]}>
                    <Text style={[styles.summaryLabel, styles.finalTotalLabel]}>Final Total</Text>
                    <Text style={[styles.summaryValue, styles.finalTotalValue]}>${breakdown.finalTotal} NZD</Text>
                  </View>
                </>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  // Removed old renderOptionsContent as we're using renderServicesContent now

  // Handle scroll events for sticky tabs and auto tab switching
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const headerHeight = 400; // Updated header height
        setIsTabsSticky(offsetY > headerHeight - 100);
        
        // Auto tab switching based on scroll position
        const sections = [
          ['services', sectionRefs.current.services?.y || 0],
          ['team', sectionRefs.current.team?.y || 0],
          ['reviews', sectionRefs.current.reviews?.y || 0],
          ['offers', sectionRefs.current.offers?.y || 0],
          ['about', sectionRefs.current.about?.y || 0]
        ];
        
        let currentSection = 'services';
        
        // Find the section that is currently in view
        for (let i = sections.length - 1; i >= 0; i--) {
          const [sectionName, sectionY] = sections[i];
          if (sectionY > 0 && offsetY >= sectionY - 150) {
            currentSection = sectionName;
            break;
          }
        }
        
        if (currentSection !== activeTab) {
          setActiveTab(currentSection);
        }
      },
    }
  );
  
  // Function to scroll to specific section
  const scrollToSection = (sectionName: string) => {
    const sectionY = sectionRefs.current[sectionName as keyof typeof sectionRefs.current]?.y;
    if (sectionY !== undefined && sectionY > 0 && scrollViewRef.current) {
      // Account for sticky tabs height and some padding
      const offsetY = sectionY - 120;
      scrollViewRef.current.scrollTo({ y: Math.max(0, offsetY), animated: true });
      setActiveTab(sectionName);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ImageCarousel
            images={allServiceImages}
            service={service}
            onBackPress={() => navigation.goBack()}
            onFavoritePress={handleFavoritePress}
          />
        </View>

        {/* Overlapping Shop Info Section */}
        <View style={styles.overlappingInfoContainer}>
          {/* Shop Logo - Half overlapping with image */}
          <View style={styles.overlappingLogo}>
            <Image
              source={{ 
                uri: shopData?.logo_url || shopData?.image_url || allServiceImages[0] || 
                'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format' 
              }}
              style={styles.shopLogoImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('Shop logo image failed to load:', error.nativeEvent?.error || 'Unknown error');
              }}
            />
            {/* Open Status Badge on Logo */}
            {isBusinessOpen() && (
              <View style={styles.onlineStatusBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Open</Text>
              </View>
            )}
          </View>

          {/* Location and Availability - Top Right at Container Level */}
          <View style={styles.containerTopRightInfo}>
            <View style={styles.topRightLocationRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.topRightLocation}>
                {shopData?.city || 'Anthonyville'}, {shopData?.country || 'United States'}
              </Text>
            </View>
            
            <View style={styles.topRightAvailabilityRow}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.topRightAvailability}>Available today</Text>
            </View>
            
            {/* Rating Row - Aligned to bottom of Available today */}
            <View style={styles.topRightRatingRow}>
              <Text style={styles.topRightRatingNumber}>
                {reviewStats?.average_rating ? reviewStats.average_rating.toFixed(1) : (service.rating || '4.5')}
              </Text>
              <View style={styles.topRightStarsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons 
                    key={star} 
                    name={star <= Math.floor(parseFloat(reviewStats?.average_rating || service.rating || '4.5')) ? "star" : "star-outline"} 
                    size={14} 
                    color="#1A2533" 
                  />
                ))}
              </View>
              <Text style={styles.topRightReviewCount}>
                ({reviewStats?.total_reviews || 0})
              </Text>
            </View>
          </View>

          {/* Shop Details Card - Clean Design */}
          <View style={styles.cleanShopDetailsCard}>
            {/* Shop Name */}
            <Text style={styles.cleanShopTitle}>{service.salon_name || service.name}</Text>
            

            {/* Description */}
            {service.welcome_message && (
              <View style={styles.cleanDescriptionSection}>
                <Text style={styles.cleanDescriptionMessage}>
                  {service.welcome_message.length > 90 
                    ? `${service.welcome_message.substring(0, 90)}...` 
                    : service.welcome_message
                  }
                </Text>
              </View>
            )}

            {/* Payment Methods */}
            {service.payment_methods && service.payment_methods.length > 0 && (
              <View style={styles.cleanPaymentMethods}>
                <Ionicons name="card-outline" size={16} color="#1A2533" style={styles.cleanPaymentIcon} />
                {service.payment_methods.map((method, index) => (
                  <View key={index} style={styles.cleanPaymentTag}>
                    <Text style={styles.cleanPaymentText}>{method}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

      

        {/* Sticky Tabs */}
        {!isTabsSticky && (
        <View style={styles.stickyTabsContainer}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
            style={styles.tabsScrollView}
          >
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'services' && styles.activeTab]}
              onPress={() => scrollToSection('services')}
            >
              <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>Services</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'team' && styles.activeTab]}
              onPress={() => scrollToSection('team')}
            >
              <Text style={[styles.tabText, activeTab === 'team' && styles.activeTabText]}>Team</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'reviews' && styles.activeTab]}
              onPress={() => scrollToSection('reviews')}
            >
              <View style={styles.simpleTabContent}>
                <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
                {reviewStats && reviewStats.total_reviews > 0 && (
                  <View style={styles.cleanBadge}>
                    <Text style={styles.badgeText}>{reviewStats.total_reviews}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'offers' && styles.activeTab]}
              onPress={() => scrollToSection('offers')}
            >
              <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'about' && styles.activeTab]}
              onPress={() => scrollToSection('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        )}

        {/* All Sections Content */}
        <View style={[styles.allSectionsContainer, { paddingBottom: 120 }]}>
          
          {/* Services Section */}
          <View 
            style={styles.sectionContainer}
            onLayout={(event) => {
              sectionRefs.current.services.y = event.nativeEvent.layout.y;
            }}
          >
            {renderServicesContent()}
          </View>

          {/* Team Section */}
          <View 
            style={styles.sectionContainer}
            onLayout={(event) => {
              sectionRefs.current.team.y = event.nativeEvent.layout.y;
            }}
          >
            {staffMembers.length > 0 ? (
              <StaffSelectionSection 
                staffMembers={staffMembers}
                selectedStaff={selectedStaff}
                onSelectStaff={setSelectedStaff}
              />
            ) : (
              <View style={styles.noStaffContainer}>
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                <Text style={styles.noStaffText}>No staff members available</Text>
                <Text style={styles.noStaffSubtext}>Please contact the shop to add staff members</Text>
              </View>
            )}
          </View>

          {/* Reviews Section */}
          <View 
            style={styles.sectionContainer}
            onLayout={(event) => {
              sectionRefs.current.reviews.y = event.nativeEvent.layout.y;
            }}
          >
            <ReviewsTab service={service} reviewStats={reviewStats} />
          </View>

          {/* Offers Section */}
          <View 
            style={styles.sectionContainer}
            onLayout={(event) => {
              sectionRefs.current.offers.y = event.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionTitle}>Offers</Text>
            <View style={styles.offersContent}>
              {/* Debug: Show what discount data we have */}
              {console.log('🔍 DEBUG - service.discounts:', service?.discounts)}
              {console.log('🔍 DEBUG - shopData.discounts:', shopData?.discounts)}
              {/* Real discount data from database */}
              {(() => {
                const discountData = service?.discounts || shopData?.discounts;
                return discountData ? (
                  <View style={styles.discountCard}>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{discountData.discount_percentage}% OFF</Text>
                    </View>
                    <Text style={styles.discountTitle}>{discountData.title}</Text>
                    <Text style={styles.discountDescription}>{discountData.description}</Text>
                    <TouchableOpacity 
                      style={[
                        styles.selectDiscountButton,
                        selectedDiscount?.id === discountData.id && styles.selectedDiscountButton
                      ]}
                      onPress={() => {
                        const discountId = discountData.id; // Use the actual UUID from database
                        console.log('🔧 Button pressed - Current selectedDiscount:', selectedDiscount);
                        console.log('🔧 discountId:', discountId);
                        console.log('🔧 discountData:', discountData);
                        
                        if (selectedDiscount?.id === discountId) {
                          console.log('🔧 Removing discount');
                          setSelectedDiscount(null);
                        } else {
                          console.log('🔧 Applying discount');
                          setSelectedDiscount({
                            id: discountId, // Use the actual UUID
                            percentage: discountData.discount_percentage,
                            title: discountData.title
                          });
                        }
                      }}
                    >
                      <Text style={[
                        styles.selectDiscountText,
                        selectedDiscount?.id === discountData.id && styles.selectedDiscountText
                      ]}>
                        {selectedDiscount?.id === discountData.id ? 'Remove Discount' : 'Apply Discount'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.noOffersText}>No special offers available at the moment.</Text>
                );
              })()}
            </View>
          </View>

          {/* About Section */}
          <View 
            style={styles.sectionContainer}
            onLayout={(event) => {
              sectionRefs.current.about.y = event.nativeEvent.layout.y;
            }}
          >
            <AboutTab service={service} />
          </View>

        </View>

      </ScrollView>
      
      {/* Fixed Sticky Tabs Overlay */}
      {isTabsSticky && (
        <View style={[styles.fixedStickyTabsContainer, { paddingTop: insets.top }]}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
            style={styles.tabsScrollView}
          >
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'services' && styles.activeTab]}
              onPress={() => scrollToSection('services')}
            >
              <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>Services</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'team' && styles.activeTab]}
              onPress={() => scrollToSection('team')}
            >
              <Text style={[styles.tabText, activeTab === 'team' && styles.activeTabText]}>Team</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'reviews' && styles.activeTab]}
              onPress={() => scrollToSection('reviews')}
            >
              <View style={styles.simpleTabContent}>
                <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
                {reviewStats && reviewStats.total_reviews > 0 && (
                  <View style={styles.cleanBadge}>
                    <Text style={styles.badgeText}>{reviewStats.total_reviews}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'offers' && styles.activeTab]}
              onPress={() => scrollToSection('offers')}
            >
              <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scrollableTab, activeTab === 'about' && styles.activeTab]}
              onPress={() => scrollToSection('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
      
      {/* Fixed Book Button */}
      <View style={[styles.fixedBookButtonContainer, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity 
          style={[
            styles.bookButton, 
            (selectedServicesWithOptions.size === 0 || !selectedStaff || servicesLoading) && styles.bookButtonDisabled
          ]}
          onPress={handleBookNow}
          disabled={selectedServicesWithOptions.size === 0 || !selectedStaff || servicesLoading}
        >
          <View style={styles.bookButtonContent}>
            <Text style={[
              styles.bookButtonText,
              (selectedServicesWithOptions.size === 0 || !selectedStaff) && styles.bookButtonTextInactive
            ]}>
              {servicesLoading 
                ? 'Loading...' 
                : (selectedServicesWithOptions.size === 0
                  ? 'Select Services to Continue'
                  : !selectedStaff 
                    ? 'Select Staff to Continue'
                    : `Book Now • $${calculatePriceBreakdown().finalTotal} NZD`
                )
              }
            </Text>
            {selectedServicesWithOptions.size > 0 && selectedStaff && !servicesLoading && (
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white background
  },
  tabContent: {
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  stickyTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  fixedStickyTabsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1A2533', // Primary amber/honey
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabIcon: {
    marginRight: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#1A2533', // Dark gray for inactive tabs
    fontWeight: '500',
  },
  reviewBadge: {
    backgroundColor: '#1A2533',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 18,
    alignItems: 'center',
  },
  reviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  simpleTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cleanBadge: {
    backgroundColor: '#1A2533',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  tabContent: {
    paddingVertical: 8,
  },
  tabContentContainer: {
    minHeight: 150,
    marginBottom: 16,
  },
  optionsContainer: {
    // Remove paddingHorizontal from here since it's already in contentContainer
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  clearAllContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A2533',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '700',
  },
  stepTitleContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#1A2533',
    fontStyle: 'italic',
    marginTop: 2,
  },
  stepCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1A2533',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxSelected: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  optionsList: {
    paddingBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F8FFFE', // Lighter honey border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedOption: {
    borderColor: '#1A2533', // Primary amber/honey
    backgroundColor: '#F8F9FA', // Light gray background
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 6,
    lineHeight: 20,
  },
  optionDescription: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 6,
    lineHeight: 20,
    fontStyle: 'normal',
  },
  optionDuration: {
    fontSize: 12,
    color: '#9CA3AF', // Lighter gray for less important info
    fontWeight: '500',
  },
  optionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2533',
    marginRight: 12,
    textShadowColor: 'rgba(0, 201, 167, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(254, 243, 199, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
  },
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1A2533', // Primary amber/honey
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#1A2533', // Dark accent charcoal black
    fontSize: 14,
    fontWeight: '700',
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
  },
  // Image Carousel Styles
  imageContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  // Overlapping Shop Info Styles
  overlappingInfoContainer: {
    position: 'relative',
    marginTop: -10, // Slight negative margin to bring content closer
    paddingTop: 50, // Reduced padding for better spacing
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'flex-start',
    width: '100%',
  },
  overlappingLogo: {
    position: 'absolute',
    top: -40, // Position logo 40px above container (half of 80px logo height)
    left: 20, // Match container padding
    zIndex: 10,
  },
  shopLogoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  onlineStatusBadge: {
    position: 'absolute',
    bottom: -5,
    left: -5,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  onlineText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  overlappingDiscountBadge: {
    position: 'absolute',
    top: -30, // Position discount badge 30px above container (half of ~60px badge height)
    right: 16,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
  },
  shopDetailsCard: {
    borderRadius: 0,
    padding: 20,
  
    alignItems: 'flex-start', // Align content to left
    width: '100%',
   
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align to left
    marginBottom: 8,
    width: '100%',
  },
  shopTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533',
    flex: 1,
  },
  ratingRow: {
    marginBottom: 8,
    width: '100%',
    alignItems: 'flex-start',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  ratingNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  shopLocation: {
    fontSize: 16,
    color: '#1A2533',
    marginBottom: 4,
  },
  shopHours: {
    fontSize: 16,
    color: '#1A2533',
    marginBottom: 12,
  },
  shopDescription: {
    fontSize: 14,
    color: '#1A2533',
    lineHeight: 20,
    textAlign: 'left',
    alignSelf: 'flex-start',
    width: '100%',
  },
  // Clean shop header styles - matching ServiceListScreen
  cleanShopDetailsCard: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  cleanShopTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 8,
  },
  cleanRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cleanRatingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginRight: 6,
  },
  cleanStarsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  cleanReviewCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Container Level Top Right Info Styles
  containerTopRightInfo: {
    position: 'absolute',
    top: 12, // Small padding from the very top
    right: 20, // Match container padding
    alignItems: 'flex-end',
    zIndex: 5,
  },
  // Top Right Info Styles (legacy)
  topRightInfo: {
    position: 'absolute',
    top: 0, // Align with top of title
    right: 0,
    alignItems: 'flex-end',
  },
  topRightLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  topRightLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  topRightAvailabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRightAvailability: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  topRightRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  topRightRatingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginRight: 4,
  },
  topRightStarsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  topRightReviewCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  cleanDescriptionSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  cleanDescriptionMessage: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  cleanPaymentMethods: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  cleanPaymentIcon: {
    marginRight: 8,
  },
  cleanPaymentTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  cleanPaymentText: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  // Improved shop header styles (cleaner version)
  improvedShopDetailsCard: {
    borderRadius: 0,
    padding: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  improvedShopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
  },
  improvedShopTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2533',
    flex: 1,
    marginRight: 12,
  },
  improvedRatingRow: {
    marginBottom: 8,
    width: '100%',
    alignItems: 'flex-start',
  },
  improvedRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  improvedRatingNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
    marginRight: 8,
  },
  improvedStarsContainer: {
    flexDirection: 'row',
    marginRight: 8,
    gap: 2,
  },
  improvedReviewCount: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  improvedShopLocation: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  improvedShopHours: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  imageScrollView: {
    flex: 1,
  },
  serviceImage: {
    width: screenWidth,
    height: 300,
  },
  imageWrapper: {
    position: 'relative',
  },
  imageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.9)',
    zIndex: 3,
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    zIndex: 3,
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imageLoadingIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 8,
    zIndex: 1,
  },
  imageErrorText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  imageUrlText: {
    fontSize: 10,
    color: '#1A2533',
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50, // Increased padding for better spacing from status bar
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  favoriteButton: {
    position: 'absolute',
    top: 50, // Increased padding for better spacing from status bar
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  imageCounter: {
    position: 'absolute',
    top: 44, // Adjusted for status bar height
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1A2533',
    width: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveDot: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  // Rest of existing styles
  imageContainer: {
    position: 'relative',
  },
  overlappingDiscountTag: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  discountTagTop: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  discountTagBottom: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  discountPercentageTag: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  discountOffText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: -2,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533', // Dark accent charcoal black
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533', // Dark accent charcoal black
    marginLeft: 4,
    marginRight: 8,
  },
  reviewsText: {
    fontSize: 14,
    color: '#1A2533', // Darker gray for better readability
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A2533', // Dark accent charcoal black
  },
  timeText: {
    fontSize: 14,
    color: '#1A2533', // Darker gray for better readability
    marginTop: 4,
  },
  serviceDescription: {
    fontSize: 16,
    color: '#1A2533',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  openBadge: {
    backgroundColor: '#10B981', // Green for open
  },
  closedBadge: {
    backgroundColor: '#EF4444', // Red for closed
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A2533',
  },
  discountBanner: {
    backgroundColor: '#F0FFFE', // Light accent cream honey
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    width: '100%',
  },
  discountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountIconContainer: {
    marginRight: 12,
  },
  discountInfo: {
    flex: 1,
  },
  discountTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  discountPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  serviceHeaderSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  shopInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shopInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  shopLogoLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#1A2533',
  },
  shopLogoPlaceholderLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0FFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#1A2533',
  },
  businessHoursContainer: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  openIndicator: {
    backgroundColor: '#10B981',
  },
  closedIndicator: {
    backgroundColor: '#EF4444',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginLeft: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#1A2533',
    textAlign: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  openDot: {
    backgroundColor: '#10B981',
  },
  closedDot: {
    backgroundColor: '#EF4444',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'raw',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  optionsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  locationText: {
    fontSize: 16,
    color: '#1A2533',
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#1A2533',
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    lineHeight: 24,
    marginBottom: 4,
  },
  bookButton: {
    backgroundColor: '#1A2533', // Primary amber/honey
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonDisabled: {
    backgroundColor: '#F0FFFE', // Lighter honey
    opacity: 0.7,
  },
  bookButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF', // White text for better contrast
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  bookButtonTextInactive: {
    color: '#1A2533', // Teal text when button is inactive
  },
  // Staff Selection Styles
  staffSection: {
    paddingHorizontal: 0,
  },
  staffScroll: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    marginTop: -8,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 120,
    minHeight: 160,
    borderWidth: 2,
    borderColor: '#F8FFFE',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedStaffCard: {
    borderColor: '#1A2533',
    backgroundColor: '#F0FFFE',
  },
  staffAvatar: {
    position: 'relative',
    marginBottom: 8,
  },
  staffImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
  },
  staffPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 2,
    width: '100%',
  },
  selectedStaffName: {
    color: '#1A2533',
  },
  staffRole: {
    fontSize: 11,
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  staffRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffRatingText: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 2,
  },
  staffSpecialty: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  noStaffContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noStaffText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
    marginTop: 12,
  },
  noStaffSubtext: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    marginTop: 4,
  },
  // Service Options Styles
  baseServiceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
  },
  baseServiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginTop: 12,
    marginBottom: 8,
  },
  baseServiceDescription: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  baseServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  baseServiceInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  baseServiceInfoText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 6,
    fontWeight: '500',
  },
  selectedPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
  },
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedServiceOption: {
    borderColor: '#1A2533',
    backgroundColor: '#F0FFFE',
  },
  optionRadio: {
    marginRight: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#1A2533',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1A2533',
  },
  optionContent: {
    flex: 1,
  },
  optionMetaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  optionDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionDuration: {
    fontSize: 12,
    color: '#1A2533',
    marginLeft: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#1A2533',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  optionsList: {
    paddingBottom: 16,
  },
  selectedOptionSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#1A2533',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 16,
    textAlign: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#1A2533',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  discountLabel: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  discountValue: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  finalTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  finalTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  noOptionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noOptionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  noOptionsSubtext: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 20,
  },
  // New styles for services view
  servicesContainer: {
    paddingTop: 8,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 0,
    overflow: 'hidden',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  servicePriceOriginal: {
    fontSize: 14,
    color: '#999999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 8,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FFFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serviceDetailText: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '600',
  },
  serviceDetailTextOriginal: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  serviceDetailTextDiscounted: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '700',
  },
  discountBadgeSmall: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  discountBadgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  serviceOptionsDropdown: {
    backgroundColor: '#FAFBFC',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    overflow: 'hidden',
  },
  noOptionsMessage: {
    alignItems: 'center',
    padding: 16,
  },
  noOptionsText: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 12,
  },
  selectBaseService: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginTop: 8,
  },
  selectBaseServiceText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  serviceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceOptionSelected: {
    backgroundColor: '#F0FFFE',
    borderColor: '#1A2533',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  noImageText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // About section styles
  aboutContent: {
    paddingHorizontal: 16,
  },
  // Contact section styles
  contactSection: {
    marginTop: 16,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    flex: 1,
  },
  mapContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  mapFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapFallbackText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  mapTouchable: {
    flex: 1,
  },
  mapView: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  mapLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  mapCityText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E8F4F8',
  },
  mapGridLine: {
    position: 'absolute',
    backgroundColor: '#B8D4E0',
    opacity: 0.3,
  },
  mapRoad1: {
    position: 'absolute',
    top: 20,
    left: -50,
    width: 400,
    height: 4,
    backgroundColor: '#94A3B8',
    transform: [{ rotate: '15deg' }],
  },
  mapRoad2: {
    position: 'absolute',
    top: 120,
    left: -30,
    width: 450,
    height: 3,
    backgroundColor: '#94A3B8',
    transform: [{ rotate: '-10deg' }],
  },
  mapBlock: {
    position: 'absolute',
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    opacity: 0.6,
  },
  mapMarker: {
    position: 'absolute',
    top: 60,
    left: '50%',
    marginLeft: -16,
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mapInfoBox: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mapOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Hours tab styles
  hoursContainer: {
    marginTop: 16,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
  },
  hourTime: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
  },
  noHoursContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noHoursText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  timezoneText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  basicHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FFFE',
    borderRadius: 8,
    marginBottom: 8,
  },
  basicHoursText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  basicHoursNote: {
    fontSize: 12,
    color: '#A16207',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Offers tab styles
  offersContainer: {
    marginTop: 16,
  },
  offerCard: {
    backgroundColor: '#F0FFFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  offerDescription: {
    fontSize: 14,
    color: '#78350F',
    marginTop: 4,
  },
  offerPeriod: {
    fontSize: 12,
    color: '#A16207',
    marginTop: 8,
  },
  offerUsage: {
    fontSize: 12,
    color: '#A16207',
    marginTop: 4,
  },
  noOffersContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noOffersText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  // Reviews placeholder styles
  reviewsPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  reviewsPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  reviewsSubtext: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
  // Enhanced empty state styles
  reviewsEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  reviewsIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  reviewsIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewsIconAccent1: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    opacity: 0.8,
  },
  reviewsIconAccent2: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FDE68A',
    opacity: 0.9,
  },
  reviewsEmptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  reviewsEmptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  reviewsPreviewStars: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 4,
  },
  previewStar: {
    opacity: 0.7,
  },
  reviewsEmptyHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Enhanced review item styles
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  avatarRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    top: -4,
    left: -4,
    zIndex: 1,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  reviewDateContainer: {
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  viewAllButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignSelf: 'center',
    marginTop: 16,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
  },
  reviewsList: {
    marginTop: 8,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    marginRight: 12,
  },
  reviewerDetails: {
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewComment: {
    fontSize: 14,
    color: '#1A2533',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reviewDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  reviewDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  reviewDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  // Shop logo and name styles
  shopInfoSection: {
    flex: 1,
  },
  shopLogoAndName: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shopLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#1A2533',
  },
  shopLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0FFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#1A2533',
  },
  shopNameSection: {
    flex: 1,
    marginLeft: 12,
  },
  fixedBookButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
  },
  allSectionsContainer: {
    backgroundColor: '#FFFFFF',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#1A2533',
  },
  offersContent: {
    gap: 8,
  },
  discountCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  discountBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  discountTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  noOffersText: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  discountDescription: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 12,
    lineHeight: 20,
  },
  selectDiscountButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A2533',
  },
  selectedDiscountButton: {
    backgroundColor: '#1A2533',
  },
  selectDiscountText: {
    color: '#1A2533',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDiscountText: {
    color: '#FFFFFF',
  },
  // Scrollable tabs styles
  tabsScrollView: {
    flexGrow: 1,
  },
  tabsScrollContent: {
    paddingHorizontal: 8,
  },
  scrollableTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  // Opening hours styles
  hoursSection: {
    marginTop: 8,
  },
  hoursContainer: {
    marginTop: 8,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 44,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
  },
  noHoursContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 8,
  },
  noHoursText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  // Enhanced hours styles
  hoursSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hoursHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  enhancedHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 56,
  },
  todayHourRow: {
    backgroundColor: '#F0F4F8',
    borderLeftWidth: 4,
    borderLeftColor: '#1A2533',
    borderRadius: 8,
    marginVertical: 2,
  },
  hourRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hourRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#1A2533',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openDot: {
    backgroundColor: '#10B981',
  },
  closedDot: {
    backgroundColor: '#EF4444',
  },
  enhancedDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  todayDayText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
  },
  enhancedTimeText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B7280',
  },
  todayTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  statusIcon: {
    marginLeft: 4,
  },
  enhancedNoHoursContainer: {
    alignItems: 'center',
    padding: 24,
    marginTop: 8,
  },
  noHoursIconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  noHoursIconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  enhancedNoHoursTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  enhancedNoHoursSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Category section styles
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
  },
  categoryCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default ServiceDetailScreen;