import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Image,
  Dimensions,
  Animated,
  Alert,
  StatusBar,
  Linking,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ConsumerTabParamList } from '../navigation/AppNavigator';
import { useAuth } from '../navigation/AppNavigator';
import { bookingsAPI } from '../services/api/bookings/bookingsAPI';
import { reviewsAPI } from '../services/api/reviews/reviewsAPI';
import { dataService } from '../services/dataService';
import { shopAPI } from '../services/api/shops/shopAPI';
import { formatCurrency } from '../utils/currency';
import { MockDataBanner, MockDataIndicator } from '../components/dev/MockDataIndicator';
import { shouldUseMockData } from '../config/devConfig';

const { width: screenWidth } = Dimensions.get('window');

interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  shop_id: string;
  service_name: string;
  professional_name: string;
  salon_name: string;
  date: string;
  time: string;
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  notes?: string;
  created_at: string;
  duration?: number;
  service_image?: string;
  rating?: number;
  review?: string;
}

interface ProcessedBooking {
  id: string;
  service_id: string;
  shop_id: string;
  service: string;
  date: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Pending';
  price: string;
  professional: string;
  salon: string;
  shop_address?: string;
  shop_city?: string;
  shop_country?: string;
  notes?: string;
  created_at: string;
  originalDate: Date;
  duration?: number;
  service_image?: string;
  rating?: number;
  review?: string;
}

interface ReviewData {
  rating: number;
  comment: string;
  serviceQuality: number;
  punctuality: number;
  cleanliness: number;
  valueForMoney: number;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// Enhanced Star Rating Component with animations
const StarRating = ({ 
  rating, 
  onRatingChange, 
  size = 24, 
  readonly = false,
  showAnimation = false
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void; 
  size?: number; 
  readonly?: boolean;
  showAnimation?: boolean;
}) => {
  const [animationValues] = useState([1, 2, 3, 4, 5].map(() => new Animated.Value(1)));

  const animateStar = (index: number) => {
    if (!showAnimation) return;
    
    Animated.sequence([
      Animated.timing(animationValues[index], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animationValues[index], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleStarPress = (star: number) => {
    if (readonly) return;
    animateStar(star - 1);
    onRatingChange && onRatingChange(star);
  };

  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star, index) => (
        <TouchableOpacity
          key={star}
          onPress={() => handleStarPress(star)}
          disabled={readonly}
          style={styles.starTouchable}
        >
          <Animated.View
            style={[
              styles.starWrapper,
              {
                transform: [{ scale: showAnimation ? animationValues[index] : 1 }]
              }
            ]}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={size}
              color={star <= rating ? "#FFB800" : "#E5E7EB"}
              style={[
                styles.starIcon,
                star <= rating && styles.activeStarIcon
              ]}
            />
            {star <= rating && (
              <View style={[styles.starGlow, { width: size + 4, height: size + 4 }]} />
            )}
          </Animated.View>
        </TouchableOpacity>
      ))}
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

// Enhanced Booking Card Component
const BookingCard = ({ 
  booking, 
  isPast = false, 
  onReview,
  onPress
}: { 
  booking: ProcessedBooking; 
  isPast?: boolean;
  onReview?: (booking: ProcessedBooking) => void;
  onPress?: (booking: ProcessedBooking) => void;
}) => {
  const handleMapPress = () => {
    // Check if we have valid location data
    if (booking.shop_address && booking.shop_address.trim() !== '') {
      openMaps(
        booking.shop_address, 
        booking.shop_city || '', 
        booking.shop_country || ''
      );
    } else {
      // Show alert if location is not available
      Alert.alert(
        'Location Not Available', 
        'Shop location information is not available for this booking. Please contact the shop directly for directions.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return '#1A2533';
      case 'Pending': return '#1A2533';
      case 'Completed': return '#10B981';
      case 'Cancelled': return '#EF4444';
      default: return '#1A2533';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'checkmark-circle';
      case 'Pending': return 'time';
      case 'Completed': return 'checkmark-done-circle';
      case 'Cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.bookingCard, isPast && styles.pastBookingCard]}
      onPress={() => onPress?.(booking)}
      activeOpacity={0.7}
    >
      {/* Card Header with Service Image */}
      <View style={styles.cardHeader}>
        <View style={styles.serviceImageContainer}>
          {booking.service_image ? (
            <Image source={{ uri: booking.service_image }} style={styles.serviceImage} />
          ) : (
            <View style={[styles.serviceImagePlaceholder, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
              <Ionicons name="cut" size={24} color={getStatusColor(booking.status)} />
            </View>
          )}
        </View>
        
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={2}>{booking.service}</Text>
          <Text style={styles.salonName}>{booking.salon}</Text>
          {booking.rating && (
            <View style={styles.existingRatingContainer}>
              <StarRating rating={booking.rating} readonly size={16} />
              <Text style={styles.existingRatingText}>Your rating</Text>
            </View>
          )}
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatCurrency(booking.price)}</Text>
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#1A2533" />
          <Text style={styles.detailText}>{booking.date}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#1A2533" />
          <Text style={styles.detailText}>with {booking.professional}</Text>
        </View>
        
        {booking.duration && (
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#1A2533" />
            <Text style={styles.detailText}>{booking.duration} minutes</Text>
          </View>
        )}

        {booking.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color="#1A2533" />
            <Text style={styles.detailText} numberOfLines={2}>{booking.notes}</Text>
          </View>
        )}
      </View>

      {/* Status and Actions */}
      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '15' }]}>
          <Ionicons 
            name={getStatusIcon(booking.status)} 
            size={14} 
            color={getStatusColor(booking.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status}
          </Text>
        </View>
        
        <View style={styles.actionsContainer}>
          {/* Map button */}
          <TouchableOpacity 
            style={styles.mapButton}
            onPress={handleMapPress}
          >
            <Ionicons name="location" size={14} color="#1A2533" />
            <Text style={styles.mapButtonText}>Directions</Text>
          </TouchableOpacity>
          
          {booking.status === 'Completed' && onReview && !booking.rating && (
            <TouchableOpacity 
              style={styles.reviewButton}
              onPress={() => onReview(booking)}
            >
              <Ionicons name="star" size={14} color="#1A2533" />
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          )}
          
          {booking.status === 'Completed' && booking.rating && (
            <TouchableOpacity 
              style={styles.reviewedButton}
              onPress={() => onReview && onReview(booking)}
            >
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.reviewedButtonText}>Reviewed</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

type BookingsScreenRouteProp = RouteProp<ConsumerTabParamList, 'BookingsTab'>;

const BookingsScreen = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [upcomingBookings, setUpcomingBookings] = useState<ProcessedBooking[]>([]);
  const [pastBookings, setPastBookings] = useState<ProcessedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, clearAllData, isInitializing, isAuthenticated } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<BookingsScreenRouteProp>();

  // Utility function to check if string is valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Use the actual user ID from auth context
  const userId = user?.id || null;
  
  console.log('📱 BookingsScreen - User ID:', userId);
  console.log('📱 BookingsScreen - User object:', user);
  console.log('📱 BookingsScreen - User exists?:', !!user);
  console.log('📱 BookingsScreen - UserId exists?:', !!userId);
  console.log('📱 BookingsScreen - User ID type:', typeof userId);
  console.log('📱 BookingsScreen - User ID length:', userId?.length);
  console.log('📱 BookingsScreen - Auth condition (!user || !userId):', (!user || !userId));
  console.log('📱 BookingsScreen - User email:', user?.email);
  console.log('📱 BookingsScreen - User role:', user?.role);
  console.log('📱 BookingsScreen - isInitializing:', isInitializing);
  console.log('📱 BookingsScreen - isAuthenticated:', isAuthenticated);


  // Format date to a readable string
  const formatBookingDate = (dateString: string, timeString: string) => {
    const bookingDate = new Date(dateString);
    const now = new Date();
    const diffTime = bookingDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedTime = timeString || '';

    if (diffDays === 0) {
      return `Today, ${formattedTime}`;
    } else if (diffDays === 1) {
      return `Tomorrow, ${formattedTime}`;
    } else if (diffDays > 0 && diffDays < 7) {
      return `${bookingDate.toLocaleDateString([], { weekday: 'long' })}, ${formattedTime}`;
    }
    
    return `${bookingDate.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    })}, ${formattedTime}`;
  };

  // Process booking data to match UI format
  const processBooking = (booking: Booking): ProcessedBooking => {
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const isPast = bookingDate < now;
    
    let status: ProcessedBooking['status'];
    if (booking.status.toLowerCase() === 'cancelled') {
      status = 'Cancelled';
    } else if (isPast) {
      status = 'Completed';
    } else if (booking.status.toLowerCase() === 'pending') {
      status = 'Pending';
    } else {
      status = 'Confirmed';
    }

    return {
      id: booking.id,
      service_id: booking.service_id,
      shop_id: booking.shop_id,
      service: booking.service_name || 'Service',
      date: formatBookingDate(booking.date, booking.time),
      status,
      price: booking.price?.toString() || '0',
      professional: booking.professional_name || 'Professional',
      salon: booking.salon_name || 'Salon',
      shop_address: '',  // Will be fetched from database
      shop_city: '',
      shop_country: '',
      notes: booking.notes || '',
      created_at: booking.created_at,
      originalDate: bookingDate,
      duration: booking.duration,
      service_image: booking.service_image,
      rating: booking.rating,
      review: booking.review
    };
  };

  const processBookingMemoized = useCallback(processBooking, []);

  // Handle review submission
  const handleReviewSubmit = async (reviewData: ReviewData) => {
    if (!selectedBookingForReview || !user) return;
    
    try {
      // Get the booking details to extract shop_id, provider_id etc.
      const bookingResponse = await bookingsAPI.getCustomerBookings(user.id);
      if (!bookingResponse.success) {
        Alert.alert('Error', 'Could not verify booking details');
        return;
      }

      const booking = bookingResponse.data?.find(b => b.id === selectedBookingForReview.id);
      if (!booking) {
        Alert.alert('Error', 'Booking not found');
        return;
      }

      console.log('📝 Submitting review with data:', {
        booking_id: selectedBookingForReview.id,
        shop_id: booking.shop_id,
        customer_name: user.full_name,
        customer_email: user.email,
        customer_phone: user.phone,
        rating: reviewData.rating,
        comment: reviewData.comment,
        service_quality: reviewData.serviceQuality,
        punctuality: reviewData.punctuality,
        cleanliness: reviewData.cleanliness,
        value_for_money: reviewData.valueForMoney
      });

      const response = await reviewsAPI.submitReview({
        booking_id: selectedBookingForReview.id,
        shop_id: booking.shop_id,
        provider_id: booking.provider_id || booking.shop_id, // Fallback if provider_id not available
        service_id: booking.service_id,
        customer_name: user.full_name,
        customer_email: user.email,
        customer_phone: user.phone,
        rating: reviewData.rating,
        comment: reviewData.comment,
        service_quality: reviewData.serviceQuality,
        punctuality: reviewData.punctuality,
        cleanliness: reviewData.cleanliness,
        value_for_money: reviewData.valueForMoney
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to submit review');
        return;
      }
      
      console.log('✅ Review submitted successfully:', response.data?.id);
      
      // Update local state to show the review was submitted
      const updateBookings = (bookings: ProcessedBooking[]) =>
        bookings.map(bookingItem =>
          bookingItem.id === selectedBookingForReview.id
            ? { ...bookingItem, rating: reviewData.rating, review: reviewData.comment }
            : bookingItem
        );
      
      setUpcomingBookings(updateBookings);
      setPastBookings(updateBookings);
      
      Alert.alert('Review Submitted', 'Thank you for your feedback! Your review has been saved to the database.');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  // Handle review button press - Navigate to ReviewScreen
  const handleReviewPress = async (booking: ProcessedBooking) => {
    console.log('🌟 Review button pressed for booking:', booking.id);
    
    // Fetch the complete booking data with database IDs needed for review submission
    try {
      const bookingResponse = await bookingsAPI.getCustomerBookings(user?.id || '');
      if (!bookingResponse.success || !bookingResponse.data) {
        Alert.alert('Error', 'Could not load booking details for review');
        return;
      }

      // Find the specific booking with all database fields
      const fullBookingData = bookingResponse.data.find(b => b.id === booking.id);
      if (!fullBookingData) {
        Alert.alert('Error', 'Booking details not found');
        return;
      }

      console.log('📝 Navigating to ReviewScreen with complete booking data:', {
        id: fullBookingData.id,
        shop_id: fullBookingData.shop_id,
        staff_id: fullBookingData.staff_id,
        service_name: fullBookingData.service_names || booking.service
      });
      
      // Navigate to the ReviewScreen with complete booking data including database IDs
      navigation.navigate('Review', {
        booking: {
          id: fullBookingData.id,
          shop_id: fullBookingData.shop_id,
          staff_id: fullBookingData.staff_id,
          service: fullBookingData.service_names || booking.service,
          professional: fullBookingData.staff_names || booking.professional,
          salon: fullBookingData.shop_name || booking.salon,
          date: booking.date,
          status: booking.status
        }
      });
    } catch (error) {
      console.error('❌ Error fetching booking details for review:', error);
      Alert.alert('Error', 'Could not load booking details. Please try again.');
    }
  };

  // Cancel booking function removed as cancel button was removed

  // Handle navigation
  const handleNavigation = () => {
    if (navigation?.navigate) {
      navigation.navigate('ConsumerTabs', { screen: 'HomeTab' });
    } else {
      Alert.alert('Navigation', 'Navigate to home to book services');
    }
  };

  // Handle booking press - Navigate to shop details screen
  const handleBookingPress = (booking: ProcessedBooking) => {
    console.log('🏪 Booking pressed, navigating to shop details:', booking.shop_id);
    
    if (!booking.shop_id) {
      Alert.alert('Error', 'Shop information not available');
      return;
    }

    // Navigate to ServiceDetailScreen with serviceId (using shop_id as the service identifier)
    navigation.navigate('ServiceDetail', { 
      serviceId: booking.shop_id 
    });
  };

  // Fetch bookings with comprehensive data
  const fetchBookings = useCallback(async () => {
    if (!userId) {
      setError('Please log in to view your bookings');
      setIsLoading(false);
      return;
    }
    
    // Check if user ID is invalid and clear cache if needed
    if (!isValidUUID(userId)) {
      console.error('❌ Invalid user ID detected:', userId);
      console.log('🧹 Clearing all auth data and forcing re-login...');
      
      try {
        await clearAllData();
        setError('Invalid authentication detected. Please restart the app to re-login.');
        setIsLoading(false);
        return;
      } catch (clearError) {
        console.error('❌ Failed to clear auth data:', clearError);
      }
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📅 Fetching bookings for user:', userId);
      console.log('🔍 User ID is valid UUID:', isValidUUID(userId));
      console.log('👤 Auth user:', user?.id || 'No user');
      console.log('🔄 Current timestamp:', new Date().toISOString());
      console.log('🎭 Using mock data:', shouldUseMockData('MOCK_BOOKINGS'));
      
      // Use dataService which handles mock data automatically
      const response = await dataService.getBookingsByCustomer(userId);
      
      console.log('📊 Bookings API Response:', {
        success: response.success,
        error: response.error,
        dataLength: response.data?.length || 0,
        data: response.data
      });
      
      if (!response.success) {
        console.error('❌ Bookings API error:', response.error);
        throw new Error(response.error || 'Failed to load bookings');
      }
      
      if (response.data && response.data.length > 0) {
        console.log('✅ Found', response.data.length, 'bookings');
        console.log('📋 Booking details:', response.data.map(b => ({
          id: b.id,
          customer_id: b.customer_id,
          service_name: b.service_name,
          booking_date: b.booking_date,
          status: b.status,
          created_at: b.created_at
        })));
        
        // Convert Supabase booking format to component format and check for existing reviews
        const processedBookings = await Promise.all(response.data.map(async booking => {
          let rating = undefined;
          let review = undefined;

          // Check if this booking has been reviewed (only for completed bookings)
          if (booking.status === 'completed') {
            try {
              const reviewResponse = await reviewsAPI.getBookingReview(booking.id);
              if (reviewResponse.success && reviewResponse.data) {
                rating = reviewResponse.data.rating;
                // Extract comment from review, removing detailed ratings JSON if present
                const comment = reviewResponse.data.comment || '';
                const cleanComment = comment.replace(/\[DETAILED_RATINGS\].*?\[\/DETAILED_RATINGS\]/g, '').trim();
                review = cleanComment;
              }
            } catch (reviewError) {
              console.warn('⚠️ Error checking review for booking:', booking.id, reviewError);
            }
          }
          
          return {
            id: booking.id,
            service_id: booking.service_id,
            shop_id: booking.shop_id,
            service: booking.service_names || (Array.isArray(booking.serviceNames) ? booking.serviceNames[0] : booking.serviceNames) || 'Service',
            date: new Date(booking.booking_date || booking.bookingDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short', 
              day: 'numeric'
            }),
            time: booking.start_time || booking.startTime,
            professional: booking.staff_names || booking.staffName || 'Staff Member',
            salon: booking.shop_name || booking.shopName || 'Salon',
            shop_address: booking.shop_address || '',
            shop_city: booking.shop_city || '',
            shop_country: booking.shop_country || '',
            price: booking.total_price || booking.totalPrice,
            status: booking.status === 'confirmed' ? 'Confirmed' : 
                   booking.status === 'completed' ? 'Completed' :
                   booking.status === 'cancelled' ? 'Cancelled' : 'Pending',
            originalDate: new Date(`${booking.booking_date || booking.bookingDate}T${booking.start_time || booking.startTime}`),
            duration: booking.duration || 60,
            image: booking.shop_image_url || booking.shopImage || 'https://via.placeholder.com/150',
            notes: booking.notes || '',
            rating,
            review
          };
        }));
        
        const now = new Date();
        const upcoming = processedBookings.filter(b => 
          (b.status === 'Confirmed' || b.status === 'Pending') && b.originalDate >= now
        );
        const past = processedBookings.filter(b => 
          b.status === 'Completed' || b.status === 'Cancelled' || b.originalDate < now
        );
        
        upcoming.sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
        past.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
        
        setUpcomingBookings(upcoming);
        setPastBookings(past);
      } else {
        console.log('📅 No bookings found for user:', userId);
        console.log('🔍 Response data:', response.data);
        setUpcomingBookings([]);
        setPastBookings([]);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, processBookingMemoized]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Add focus listener to refresh bookings when screen comes back into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📅 BookingsScreen focused - refreshing bookings...');
      if (userId) {
        fetchBookings();
      }
    });

    return unsubscribe;
  }, [navigation, userId, fetchBookings]);

  // Handle review completion from ReviewScreen
  useEffect(() => {
    if (route.params?.reviewCompleted) {
      const { bookingId, rating, comment } = route.params.reviewCompleted;
      console.log('✅ Review completed for booking:', bookingId, 'Rating:', rating);
      
      // Update local state to show the review was completed
      const updateBookingWithReview = (bookings: ProcessedBooking[]) =>
        bookings.map(booking =>
          booking.id === bookingId
            ? { ...booking, rating, review: comment }
            : booking
        );
      
      setUpcomingBookings(updateBookingWithReview);
      setPastBookings(updateBookingWithReview);
      
      // Clear the navigation params to prevent re-processing
      navigation.setParams({ reviewCompleted: undefined });
    }
  }, [route.params?.reviewCompleted, navigation]);

  // Show loading while auth is initializing
  if (isInitializing) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
        <View style={styles.modernHeader}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </View>
    );
  }

  // Show login required if not authenticated or no user
  if (!isAuthenticated || !user || !userId) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
        <View style={styles.modernHeader}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <View style={styles.loginPrompt}>
          <View style={styles.loginPromptIcon}>
            <Ionicons name="person-circle-outline" size={80} color="#E5E7EB" />
          </View>
          <Text style={styles.loginPromptTitle}>Login Required</Text>
          <Text style={styles.loginPromptText}>
            Please log in to view your bookings
          </Text>
          <Text style={[styles.loginPromptText, { marginTop: 10, fontSize: 12, color: '#9CA3AF' }]}>
            Debug: user={!!user}, userId={!!userId}, isAuth={isAuthenticated}
          </Text>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={async () => {
              console.log('🔄 Force clearing all data and restarting auth...');
              await clearAllData();
              // Force reload after clearing
              setTimeout(() => {
                fetchBookings();
              }, 2000);
            }}
          >
            <Text style={styles.debugButtonText}>Clear All Data & Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
      
      {/* Mock Data Banner */}
      <MockDataBanner context="Bookings Screen" />
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>Manage your appointments</Text>
      </View>

      {/* Enhanced Tabs */}
      <View style={styles.modernTabContainer}>
        <TouchableOpacity 
          style={[styles.modernTab, activeTab === 'upcoming' && styles.modernActiveTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="calendar" 
              size={20} 
              color={activeTab === 'upcoming' ? '#FFFFFF' : '#1A2533'} 
            />
            <Text style={[styles.modernTabText, activeTab === 'upcoming' && styles.modernActiveTabText]}>
              Upcoming
            </Text>
            {upcomingBookings.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{upcomingBookings.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modernTab, activeTab === 'history' && styles.modernActiveTab]}
          onPress={() => setActiveTab('history')}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name="time" 
              size={20} 
              color={activeTab === 'history' ? '#FFFFFF' : '#1A2533'} 
            />
            <Text style={[styles.modernTabText, activeTab === 'history' && styles.modernActiveTabText]}>
              History
            </Text>
            {pastBookings.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pastBookings.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading && (upcomingBookings.length > 0 || pastBookings.length > 0)} 
            onRefresh={fetchBookings}
            colors={['#1A2533']}
            tintColor="#1A2533"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="warning" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchBookings}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : isLoading && upcomingBookings.length === 0 && pastBookings.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading your bookings...</Text>
          </View>
        ) : activeTab === 'upcoming' ? (
          upcomingBookings.length > 0 ? (
            <>
              {upcomingBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  onReview={handleReviewPress}
                  onPress={handleBookingPress}
                />
              ))}
              <View style={styles.bottomSpacing} />
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="calendar-outline" size={80} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateText}>No upcoming bookings</Text>
              <Text style={styles.emptyStateSubtext}>
                Your upcoming appointments will appear here
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={handleNavigation}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.exploreButtonText}>Book a Service</Text>
              </TouchableOpacity>
            </View>
          )
        ) : pastBookings.length > 0 ? (
          <>
            {pastBookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                isPast={true}
                onReview={handleReviewPress}
                onPress={handleBookingPress}
              />
            ))}
            <View style={styles.bottomSpacing} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="time-outline" size={80} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyStateText}>No past bookings</Text>
            <Text style={styles.emptyStateSubtext}>
              Your booking history will appear here
            </Text>
          </View>
        )}
      </ScrollView>

    </View>
  );
};

// Updated styles with consistent color palette
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Consistent app background
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 50, // Account for transparent status bar
    paddingBottom: 24,
    backgroundColor: 'transparent', // Transparent header
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0FFFE',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1A2533',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernTab: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  modernActiveTab: {
    backgroundColor: '#1A2533',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  modernActiveTabText: {
    color: '#FAFAFA',
  },
  tabBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#1A2533',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  pastBookingCard: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  serviceImageContainer: {
    marginRight: 12,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  serviceImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 4,
  },
  salonName: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
    marginBottom: 4,
  },
  existingRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  existingRatingText: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
  },
  currency: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  bookingDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#1A2533',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0FFFE',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FFFE',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1A2533',
  },
  mapButtonText: {
    color: '#1A2533',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1A2533',
  },
  reviewButtonText: {
    color: '#1A2533',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  reviewedButtonText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  // Enhanced Star Rating Styles
  starContainer: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  starTouchable: {
    padding: 2,
  },
  starWrapper: {
    position: 'relative',
  },
  starIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeStarIcon: {
    textShadowColor: 'rgba(255, 184, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  starGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    zIndex: -1,
  },

  // Modern Modal Overlay
  modernModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modernReviewModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },

  // Modern Header
  modernModalHeader: {
    position: 'relative',
    overflow: 'hidden',
  },
  modalHeaderGradient: {
    backgroundColor: '#1A2533',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  modernCloseButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 12,
  },
  modernModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  modernModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Modern Scroll View
  modernModalScroll: {
    flex: 1,
  },

  // Service Info Card
  serviceInfoCard: {
    flexDirection: 'row',
    margin: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FFFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modernServiceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 6,
  },
  modernServiceProvider: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 3,
    fontWeight: '500',
  },
  modernServiceLocation: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 3,
    fontWeight: '500',
  },
  modernServiceDate: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },

  // Modern Review Sections
  modernReviewSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  modernSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Overall Rating Card
  overallRatingCard: {
    backgroundColor: '#F0FFFE',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  ratingDisplayContainer: {
    alignItems: 'center',
    gap: 12,
  },
  ratingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  modernRatingText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },

  // Detailed Ratings Grid
  detailedRatingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailedRatingsList: {
    gap: 16,
  },
  detailedRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  ratingGridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modernRatingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
  },

  // Text Input Container
  textInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modernTextInput: {
    padding: 16,
    fontSize: 16,
    color: '#1A2533',
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  inputFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modernCharacterCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  validCharacterCount: {
    color: '#10B981',
  },

  // Modern Footer
  modernModalFooter: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modernSubmitButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modernSubmitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modernSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginPromptIcon: {
    marginBottom: 20,
  },
  loginPromptTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 8,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 20,
  },
  debugButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default BookingsScreen;