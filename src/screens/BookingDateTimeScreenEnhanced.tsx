import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Modal, 
  StatusBar,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  generateStaffTimeSlots, 
  generateStaffTimeSlotsWithBookings,
  generateStaffCalendarMarks,
  getStaffAvailabilityForDate,
  StaffMember 
} from '../utils/staffAvailability';
import { bookingsAPI } from '../services/api/bookings/bookingsAPI';
import { useAuth } from '../navigation/AppNavigator';
import { supabase } from '../lib/supabase';

type RootStackParamList = {
  BookingDateTimeEnhanced: {
    selectedServices: any[];
    totalPrice: number;
    selectedStaff: StaffMember;
    selectedDiscount?: any;
    priceBreakdown?: {
      subtotal: number;
      discountAmount: number;
      discountedSubtotal: number;
      finalTotal: number;
      hasDiscount: boolean;
    };
    bookingDetails?: {
      serviceId: string;
      shopId: string;
      shopName: string;
      shopAddress: string;
      shopContact: string;
    };
  };
  [key: string]: any;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = RouteProp<RootStackParamList, 'BookingDateTimeEnhanced'>;

const { width: windowWidth } = Dimensions.get('window');

// Function to check if a specific time slot has conflicts using the same logic as booking creation
const checkTimeSlotConflict = async (shopId: string, staffId: string, date: string, startTime: string, endTime: string): Promise<boolean> => {
  try {
    // Use the exact same RPC function that booking creation uses
    const { data: conflictCheck, error: conflictError } = await supabase
      .rpc('check_booking_conflict', {
        p_shop_id: shopId,
        p_staff_id: staffId || null,
        p_booking_date: date,
        p_start_time: startTime,
        p_end_time: endTime
      });

    if (conflictError) {
      console.warn('⚠️ Conflict check failed:', conflictError.message);
      // If the function doesn't exist, assume no conflict
      if (conflictError.code === '42883' || conflictError.message?.includes('function') || conflictError.message?.includes('does not exist')) {
        return false;
      }
      return false;
    }

    return conflictCheck === true;
  } catch (error) {
    console.warn('⚠️ Error checking time slot conflict:', error);
    return false;
  }
};

// Function to fetch real bookings from Supabase
const getStaffBookingsForDate = async (staffId: string, date: string): Promise<Array<{ start: string; end: string }>> => {
  try {
    console.log('📅 Fetching bookings for staff:', staffId, 'on date:', date);
    
    // Try to get bookings from the bookings table first
    const { data: bookings, error } = await supabase
      .from('shop_bookings')
      .select('booking_date, start_time, end_time, status')
      .eq('staff_id', staffId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'pending']); // Both confirmed and pending bookings block slots
    
    if (error) {
      // Handle missing table gracefully
      if (error.code === '42P01') {
        console.warn('⚠️ Bookings table does not exist yet. Will use conflict check function instead.');
        return [];
      }
      console.error('❌ Error fetching staff bookings:', error);
      return [];
    }
    
    // Convert bookings to start/end time format
    const bookedSlots = (bookings || []).map(booking => {
      // Handle both formats: start_time/end_time or booking_time/duration
      let startTime, endTime;
      
      if (booking.start_time && booking.end_time) {
        // Use explicit start and end times if available
        startTime = booking.start_time;
        endTime = booking.end_time;
      } else if (booking.booking_time) {
        // Calculate end time from booking_time and duration
        startTime = booking.booking_time;
        const duration = booking.duration || 60; // Default 60 minutes if no duration
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      } else {
        // Skip this booking if no time info
        return null;
      }
      
      return {
        start: startTime,
        end: endTime
      };
    }).filter(slot => slot !== null); // Remove null entries
    
    console.log('✅ Found booked slots:', bookedSlots);
    return bookedSlots;
  } catch (error) {
    console.error('❌ Error in getStaffBookingsForDate:', error);
    return [];
  }
};

const BookingDateTimeEnhancedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user } = useAuth();
  const { 
    selectedServices, 
    totalPrice, 
    selectedStaff, 
    selectedDiscount, 
    priceBreakdown, 
    bookingDetails 
  } = route.params || {};

  // Early return if required params are missing
  if (!selectedServices || !totalPrice || !selectedStaff) {
    console.error('❌ Missing required booking parameters');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Missing booking information. Please go back and try again.</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Calculate service duration from selected services
  const serviceDuration = selectedServices.reduce((total, service) => {
    const duration = parseInt(service.duration) || 30;
    return total + duration;
  }, 0);

  // Generate calendar marks based on staff availability
  useEffect(() => {
    if (selectedStaff) {
      const marks = generateStaffCalendarMarks(selectedStaff);
      
      // Mark selected date
      if (selectedDate && marks[selectedDate] && !marks[selectedDate].disabled) {
        marks[selectedDate] = {
          ...marks[selectedDate],
          selected: true,
          selectedColor: '#1A2533',
          customStyles: {
            container: { backgroundColor: '#1A2533' },
            text: { color: 'white', fontWeight: 'bold' }
          }
        };
      }
      
      setMarkedDates(marks);
    }
  }, [selectedStaff, selectedDate]);

  // Generate time slots when date changes
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!selectedDate || !selectedStaff) {
        return;
      }
      
      setLoading(true);
      
      try {
        // First generate basic time slots based on staff schedule
        const slots = await generateStaffTimeSlotsWithBookings(
          selectedDate, 
          selectedStaff, 
          serviceDuration, 
          getStaffBookingsForDate
        );
        
        // Then check each slot using the same conflict check as booking creation
        const shopId = bookingDetails?.shopId || route.params?.bookingDetails?.shopId;
        
        if (shopId) {
          // Check conflicts for each slot using the same RPC function
          const checkedSlots = await Promise.all(
            slots.map(async (slot) => {
              const hasConflict = await checkTimeSlotConflict(
                shopId,
                selectedStaff.id,
                selectedDate,
                slot.startTime,
                slot.endTime
              );
              
              return {
                ...slot,
                available: slot.available && !hasConflict,
                reason: hasConflict ? 'Time slot already booked' : slot.reason
              };
            })
          );
          
          setAvailableSlots(checkedSlots);
        } else {
          // If no shopId, just use the basic availability
          setAvailableSlots(slots);
        }
      } catch (error) {
        console.error('❌ Error generating time slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeSlots();
    
    // Refresh slots every 30 seconds when on this screen to catch new bookings
    const refreshInterval = setInterval(() => {
      if (selectedDate && selectedStaff) {
        console.log('🔄 Auto-refreshing time slots...');
        fetchTimeSlots();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [selectedDate, selectedStaff, serviceDuration, bookingDetails]);

  const handleDatePress = (day: { dateString: string }): void => {
    const availability = getStaffAvailabilityForDate(day.dateString, selectedStaff);
    
    if (!availability.isAvailable) {
      setWarningMessage(availability.reason || 'Staff member is not available on this date');
      setShowWarningModal(true);
      return;
    }
    
    setSelectedDate(day.dateString);
    setSelectedTime('');
  };

  const handleTimePress = (slot: any) => {
    // Since we're only showing available slots, we can directly select them
    setSelectedTime(slot.startTime);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleConfirm = async (): Promise<void> => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Missing Information', 'Please select both date and time');
      return;
    }
    
    try {
      setLoading(true);
      
      // Double-check availability right before booking
      console.log('🔄 Re-checking slot availability before booking...');
      const currentBookings = await getStaffBookingsForDate(selectedStaff.id, selectedDate);
      
      // Check if selected time conflicts with any existing booking
      const [selectedHour, selectedMinute] = selectedTime.split(':').map(Number);
      const selectedStartMinutes = selectedHour * 60 + selectedMinute;
      const selectedEndMinutes = selectedStartMinutes + serviceDuration;
      
      const hasConflict = currentBookings.some(booking => {
        const [bookingStartHour, bookingStartMin] = booking.start.split(':').map(Number);
        const [bookingEndHour, bookingEndMin] = booking.end.split(':').map(Number);
        const bookingStartMinutes = bookingStartHour * 60 + bookingStartMin;
        const bookingEndMinutes = bookingEndHour * 60 + bookingEndMin;
        
        // Check for overlap
        return (selectedStartMinutes < bookingEndMinutes && selectedEndMinutes > bookingStartMinutes);
      });
      
      if (hasConflict) {
        setLoading(false);
        Alert.alert(
          'Slot No Longer Available', 
          'This time slot was just booked by someone else. Please select another time.',
          [{ text: 'OK', onPress: () => {
            // Refresh the time slots
            setSelectedTime('');
          }}]
        );
        return;
      }
      
      // Calculate end time based on service duration
      const [startHour, startMinute] = selectedTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = startTotalMinutes + serviceDuration;
      const endHour = Math.floor(endTotalMinutes / 60);
      const endMinute = endTotalMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      // UUID validation utility
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Prepare booking data with valid UUIDs
      console.log('🔍 Current user from auth context:', user);
      console.log('🔍 Current user ID:', user?.id);
      console.log('🔍 User email:', user?.email);
      console.log('🔍 User role:', user?.role);
      console.log('🔍 Is user ID valid UUID?:', user?.id ? isValidUUID(user.id) : 'No user ID');
      
      // Use the actual user ID - don't use a fallback UUID
      const customerId = user?.id || null;
      
      if (!customerId) {
        console.error('❌ No user ID available for booking');
        Alert.alert('Authentication Error', 'Please log in to create a booking.');
        setLoading(false);
        return;
      }
      
      // Debug: Log all available data to understand what we have
      console.log('🔍 Debug - bookingDetails:', bookingDetails);
      console.log('🔍 Debug - selectedStaff:', selectedStaff);
      console.log('🔍 Debug - selectedServices:', selectedServices);
      
      // Use shop ID from booking details, or from staff, or try service ID as fallback
      let shopId = null;
      
      if (bookingDetails?.shopId && isValidUUID(bookingDetails.shopId)) {
        console.log('✅ Using shop ID from bookingDetails');
        shopId = bookingDetails.shopId;
      } else if (selectedStaff.shop_id && isValidUUID(selectedStaff.shop_id)) {
        console.log('✅ Using shop ID from selectedStaff');
        shopId = selectedStaff.shop_id;
      } else if (selectedServices[0]?.id && isValidUUID(selectedServices[0].id)) {
        // Note: selectedServices here are actual service objects, not shop objects
        console.log('⚠️ Warning: Using service ID as last resort - this may be incorrect');
        shopId = selectedServices[0].id;
      } else {
        // If no valid shop ID, try to get any existing shop from database
        console.warn('⚠️ No valid UUID found in passed data, trying database lookup...');
        console.error('bookingDetails?.shopId:', bookingDetails?.shopId);
        console.error('selectedStaff.shop_id:', selectedStaff.shop_id);
        console.error('selectedServices[0]?.id:', selectedServices[0]?.id);
        
        try {
          // First check if provider_businesses table has any records at all
          const { data: allShops, error: allShopsError } = await supabase
            .from('provider_businesses')
            .select('id, name, is_active')
            .limit(5);
            
          console.log('🔍 All shops in database:', allShops);
          console.log('🔍 Database error (if any):', allShopsError);
          
          if (allShopsError) {
            console.error('❌ Database error:', allShopsError);
            Alert.alert('Database Error', `Unable to access provider database: ${allShopsError.message}`);
            setLoading(false);
            return;
          }
          
          if (!allShops || allShops.length === 0) {
            console.error('❌ No shops found in provider_businesses table');
            Alert.alert('Setup Required', 'No service providers are configured in the system. Please contact support.');
            setLoading(false);
            return;
          }
          
          // Try to find an active shop first
          const activeShop = allShops.find(shop => shop.is_active);
          const shopToUse = activeShop || allShops[0];
          
          shopId = shopToUse.id;
          console.log('✅ Using database shop as fallback:', shopToUse);
        } catch (error) {
          console.error('❌ Database lookup failed:', error);
          Alert.alert('Booking Error', 'Unable to connect to database. Please check your connection.');
          setLoading(false);
          return;
        }
      }
      
      console.log('📅 Booking with customer ID:', customerId);
      console.log('🏪 Booking with shop ID:', shopId);
      
      // Prepare services data
      const firstService = selectedServices[0];
      const totalDuration = selectedServices.reduce((sum, service) => sum + (parseInt(service.duration) || 30), 0);
      const finalPrice = priceBreakdown ? priceBreakdown.finalTotal : totalPrice;
      
      const bookingData = {
        customer_id: customerId,
        shop_id: shopId,
        staff_id: selectedStaff.id,
        booking_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        total_price: finalPrice,
        services: selectedServices.map(service => ({
          id: service.id,
          name: service.name,
          duration: parseInt(service.duration) || 30,
          price: parseFloat(service.price) || 0
        })),
        notes: `Booking with ${selectedStaff.name} for ${selectedServices.map(s => s.name).join(', ')}${selectedDiscount ? ` (${selectedDiscount.percentage}% discount applied)` : ''}`,
        discount_id: (selectedDiscount?.id && isValidUUID(selectedDiscount.id)) ? selectedDiscount.id : undefined,
        service_option_ids: []
      };
      
      console.log('📅 Creating booking:', bookingData);
      
      // Validate that the shop exists before creating booking
      console.log('🔍 Validating shop exists:', shopId);
      const { data: shopExists, error: shopError } = await supabase
        .from('provider_businesses')
        .select('id, name')
        .eq('id', shopId)
        .single();
        
      if (shopError || !shopExists) {
        console.error('❌ Shop validation failed:', shopError);
        console.log('❌ Trying to find any shop from provider_businesses...');
        
        // Try to find any active shop as a fallback
        const { data: anyShop, error: anyShopError } = await supabase
          .from('provider_businesses')
          .select('id, name')
          .eq('is_active', true)
          .limit(1)
          .single();
          
        if (anyShopError || !anyShop) {
          console.error('❌ No shops found in provider_businesses table');
          Alert.alert('Booking Error', 'No shops available for booking. Please try again later.');
          setLoading(false);
          return;
        }
        
        console.log('⚠️ Using fallback shop:', anyShop);
        shopId = anyShop.id;
      } else {
        console.log('✅ Shop validated:', shopExists);
      }
      
      // Save booking to Supabase
      const response = await bookingsAPI.createBooking(bookingData);
      
      if (response.success) {
        console.log('✅ Booking created successfully:', response.data);
        setShowSuccessModal(true);
        
        setTimeout(() => {
          setShowSuccessModal(false);
          setSelectedDate('');
          setSelectedTime('');
          // Navigate to bookings screen to see the new booking
          navigation.navigate('ConsumerTabs', { screen: 'BookingsTab' });
        }, 2500);
      } else {
        console.error('❌ Booking creation failed:', response.error);
        
        // Handle specific conflict error
        if (response.error?.includes('already booked')) {
          // This shouldn't happen with our pre-checks, but if it does, refresh the slots
          Alert.alert(
            'Time Slot Unavailable', 
            'This time slot was just booked. The available times will refresh now.',
            [{ text: 'OK', onPress: async () => {
              setSelectedTime('');
              // Force refresh the time slots
              setLoading(true);
              try {
                const slots = await generateStaffTimeSlotsWithBookings(
                  selectedDate, 
                  selectedStaff, 
                  serviceDuration, 
                  getStaffBookingsForDate
                );
                setAvailableSlots(slots);
              } finally {
                setLoading(false);
              }
            }}]
          );
        } else {
          Alert.alert('Booking Failed', response.error || 'Failed to create booking. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('❌ Booking error:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return 'Select a time';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${period}`;
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Book with {selectedStaff?.name || 'Staff'}</Text>
          <Text style={styles.headerSubtitle}>Select date and time</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Staff Info */}
        <View style={styles.staffInfo}>
          <Text style={styles.sectionTitle}>Selected Staff Member</Text>
          <View style={styles.staffCard}>
            <View style={styles.staffHeader}>
              <Text style={styles.staffName}>{selectedStaff?.name}</Text>
              {selectedStaff?.rating > 0 && (
                <View style={styles.staffRating}>
                  <Ionicons name="star" size={16} color="#1A2533" />
                  <Text style={styles.staffRatingText}>{selectedStaff.rating}</Text>
                </View>
              )}
            </View>
            {selectedStaff?.specialties?.length > 0 && (
              <Text style={styles.staffSpecialties}>
                Specializes in: {selectedStaff.specialties.join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar-outline" size={20} color="#1A2533" />
            {' '}Choose Date
          </Text>
          
          {/* Calendar Legend */}
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1A2533' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>On Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1A2533' }]} />
              <Text style={styles.legendText}>Not Working</Text>
            </View>
          </View>
          
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDatePress}
              markedDates={markedDates}
              minDate={today}
              maxDate={maxDateStr}
              hideExtraDays={true}
              disableAllTouchEventsForDisabledDays={true}
              enableSwipeMonths={true}
              style={styles.calendar}
              theme={{
                textSectionTitleColor: '#1A2533',
                selectedDayBackgroundColor: '#1A2533',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#1A2533',
                dayTextColor: '#2D2D2D',
                textDisabledColor: '#D1D5DB',
                dotColor: '#1A2533',
                selectedDotColor: '#FFFFFF',
                arrowColor: '#1A2533',
                monthTextColor: '#1A2533',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
                calendarBackground: '#FFFFFF',
                backgroundColor: '#FFFFFF',
                agendaKnobColor: '#1A2533',
              }}
            />
          </View>
        </View>

        {/* Time Slots */}
        {selectedDate && (
          <View style={styles.timeSlotsSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="time-outline" size={20} color="#1A2533" />
              {' '}Available Times for {formatDisplayDate(selectedDate)}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1A2533" />
                <Text style={styles.loadingText}>Loading available times...</Text>
              </View>
            ) : availableSlots.filter(slot => slot.available && slot.staffAvailable).length > 0 ? (
              <View style={styles.timeSlotsGrid}>
                {availableSlots.filter(slot => slot.available && slot.staffAvailable).map(slot => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot,
                      selectedTime === slot.startTime && styles.selectedTimeSlot,
                    ]}
                    onPress={() => handleTimePress(slot)}
                  >
                    <Text 
                      style={[
                        styles.timeText,
                        selectedTime === slot.startTime && styles.selectedTimeText,
                      ]}
                    >
                      {slot.startTime}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="calendar-clear-outline" size={48} color="#1A2533" />
                <Text style={styles.noSlotsText}>No available time slots</Text>
                <Text style={styles.noSlotsSubtext}>
                  {selectedStaff?.name} is not working on this day
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Booking Summary */}
        {selectedDate && selectedTime && (
          <View style={styles.selectionSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Staff Member</Text>
                <Text style={styles.summaryValue}>{selectedStaff?.name}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>{formatDisplayDate(selectedDate)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time</Text>
                <Text style={styles.summaryValue}>{formatDisplayTime(selectedTime)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{serviceDuration} minutes</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              {/* Pricing breakdown */}
              {priceBreakdown && priceBreakdown.hasDiscount && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${priceBreakdown.subtotal}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, styles.discountText]}>
                      Discount ({selectedDiscount?.percentage}%)
                    </Text>
                    <Text style={[styles.summaryValue, styles.discountText]}>
                      -${priceBreakdown.discountAmount}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>After Discount</Text>
                    <Text style={styles.summaryValue}>${priceBreakdown.discountedSubtotal}</Text>
                  </View>
                </>
              )}
              
              {!priceBreakdown?.hasDiscount && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${totalPrice}</Text>
                  </View>
                </>
              )}
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>
                  ${priceBreakdown ? priceBreakdown.finalTotal : totalPrice}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Footer */}
      {selectedDate && selectedTime && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Warning Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showWarningModal}
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name="warning" 
              size={64} 
              color="#1A2533" 
              style={styles.warningIcon} 
            />
            <Text style={styles.warningTitle}>Staff Not Available</Text>
            <Text style={styles.warningText}>
              {warningMessage}
            </Text>
            <TouchableOpacity 
              style={styles.warningButton}
              onPress={() => setShowWarningModal(false)}
            >
              <Text style={styles.warningButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name="checkmark-circle" 
              size={64} 
              color="#1A2533" 
              style={styles.successIcon} 
            />
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your appointment with {selectedStaff?.name} has been scheduled.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A2533',
    borderWidth: 1,
    borderColor: 'rgba(0, 201, 167, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  staffInfo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 12,
  },
  staffCard: {
    backgroundColor: '#F0FFFE',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
  },
  staffRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffRatingText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 2,
  },
  staffSpecialties: {
    fontSize: 12,
    color: '#1A2533',
  },
  calendarSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6F7F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  legendText: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeSlotsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    width: (windowWidth - 64) / 3,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E6F7F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedTimeSlot: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  unavailableTimeSlot: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.7,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  selectedTimeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  unavailableTimeText: {
    color: '#1A2533',
    fontWeight: '500',
  },
  bookedText: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 12,
    fontWeight: '500',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 12,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 4,
  },
  selectionSummary: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  discountText: {
    color: '#059669', // Green for discount
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0FFFE',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2533',
  },
  bottomSpacing: {
    height: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
    paddingBottom: 34,
  },
  confirmButton: {
    backgroundColor: '#1A2533',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#F8FFFE',
  },
  warningIcon: {
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    color: '#1A2533',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2533',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingDateTimeEnhancedScreen;