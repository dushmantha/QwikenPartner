import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ScrollView, 
  Alert, 
  Modal, 
  StatusBar,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAccount } from '../navigation/AppNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock Service Options Data
const mockServiceOptions = [
  {
    id: "opt_1_1",
    service_id: "1",
    name: "Classic Manicure",
    description: "Basic nail care with polish application",
    duration: 45,
    price: 450,
    is_default: true,
    salon_name: "Beauty and Me",
    professional_name: "Anna Andersson",
    location: "Lützengatan 1, Stockholm"
  },
  {
    id: "opt_1_2",
    service_id: "1",
    name: "Gel Manicure",
    description: "Long-lasting gel polish application",
    duration: 60,
    price: 550,
    is_default: false,
    salon_name: "Beauty and Me",
    professional_name: "Anna Andersson",
    location: "Lützengatan 1, Stockholm"
  },
  {
    id: "opt_2_1",
    service_id: "2",
    name: "Haircut & Style",
    description: "Professional haircut with styling",
    duration: 60,
    price: 500,
    is_default: true,
    salon_name: "Elite Hair Studio",
    professional_name: "Erik Johansson",
    location: "Götgatan 15, Stockholm"
  },
  {
    id: "opt_2_2",
    service_id: "2",
    name: "Cut, Color & Style",
    description: "Complete hair transformation with color",
    duration: 120,
    price: 850,
    is_default: false,
    salon_name: "Elite Hair Studio",
    professional_name: "Erik Johansson",
    location: "Götgatan 15, Stockholm"
  },
  {
    id: "opt_3_1",
    service_id: "3",
    name: "Swedish Massage",
    description: "Classic relaxing Swedish massage",
    duration: 60,
    price: 750,
    is_default: true,
    salon_name: "Wellness Spa Center",
    professional_name: "Maria Larsson",
    location: "Södermalm, Stockholm"
  }
];

// JSON Service Availability Data
const mockServiceAvailability = {
  "1": {
    "business_hours": { 
      "start": "09:00", 
      "end": "18:00" 
    },
    "closed_days": [0], // 0 = Sunday
    "special_closures": [
      "2025-07-19", 
      "2025-07-26"
    ],
    "booked_slots": {
      "2025-07-15": [
        { "start": "09:00", "end": "09:45" },
        { "start": "10:30", "end": "11:15" },
        { "start": "13:00", "end": "13:45" },
        { "start": "14:30", "end": "15:15" },
        { "start": "16:00", "end": "16:45" }
      ],
      "2025-07-16": [
        { "start": "09:00", "end": "09:45" },
        { "start": "09:45", "end": "10:30" },
        { "start": "10:30", "end": "11:15" },
        { "start": "11:15", "end": "12:00" },
        { "start": "13:00", "end": "13:45" },
        { "start": "13:45", "end": "14:30" },
        { "start": "14:30", "end": "15:15" },
        { "start": "15:15", "end": "16:00" },
        { "start": "16:00", "end": "16:45" },
        { "start": "16:45", "end": "17:30" }
      ],
      "2025-07-17": [
        { "start": "11:00", "end": "11:45" },
        { "start": "15:00", "end": "15:45" }
      ],
      "2025-07-18": [
        { "start": "13:00", "end": "13:45" }
      ]
    }
  },
  "2": {
    "business_hours": { 
      "start": "10:00", 
      "end": "19:00" 
    },
    "closed_days": [0, 1], // Sunday and Monday
    "special_closures": [
      "2025-07-25"
    ],
    "booked_slots": {
      "2025-07-15": [
        { "start": "11:00", "end": "12:00" },
        { "start": "15:00", "end": "17:00" }
      ],
      "2025-07-17": [
        { "start": "10:00", "end": "11:00" },
        { "start": "11:00", "end": "12:00" },
        { "start": "12:00", "end": "13:00" },
        { "start": "13:00", "end": "14:00" },
        { "start": "14:00", "end": "15:00" },
        { "start": "15:00", "end": "16:00" },
        { "start": "16:00", "end": "17:00" },
        { "start": "17:00", "end": "18:00" },
        { "start": "18:00", "end": "19:00" }
      ]
    }
  },
  "3": {
    "business_hours": { 
      "start": "08:00", 
      "end": "20:00" 
    },
    "closed_days": [0], // Sunday only
    "special_closures": [],
    "booked_slots": {
      "2025-07-15": [
        { "start": "09:00", "end": "10:00" }
      ]
    }
  }
};

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// Utility functions for availability calculations
const parseTimeString = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Function to check if a date is available for a service
const isDateAvailable = (date: string, serviceId: string): boolean => {
  const availability = mockServiceAvailability[serviceId];
  if (!availability) return false;
  
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  
  // Check if closed on this day of week
  if (availability.closed_days.includes(dayOfWeek)) {
    return false;
  }
  
  // Check if specially closed on this date
  if (availability.special_closures.includes(date)) {
    return false;
  }
  
  // Check if it's in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    return false;
  }
  
  return true;
};

// Function to check if a date is fully booked
const isDateFullyBooked = (date: string, serviceId: string, serviceDuration: number): boolean => {
  const availability = mockServiceAvailability[serviceId];
  if (!availability) return true;
  
  // First check if date is available at all
  if (!isDateAvailable(date, serviceId)) {
    return true;
  }
  
  const businessStart = parseTimeString(availability.business_hours.start);
  const businessEnd = parseTimeString(availability.business_hours.end);
  
  // Calculate total possible slots
  const totalPossibleSlots = Math.floor((businessEnd - businessStart) / serviceDuration);
  
  // Get booked slots for this date
  const bookedSlots = availability.booked_slots[date] || [];
  
  // Calculate how many service slots are blocked by bookings
  let blockedSlots = 0;
  for (let time = businessStart; time <= businessEnd - serviceDuration; time += serviceDuration) {
    const slotEnd = time + serviceDuration;
    
    const isBlocked = bookedSlots.some(booked => {
      const bookedStart = parseTimeString(booked.start);
      const bookedEnd = parseTimeString(booked.end);
      return (time < bookedEnd && slotEnd > bookedStart);
    });
    
    if (isBlocked) {
      blockedSlots++;
    }
  }
  
  return blockedSlots >= totalPossibleSlots;
};

// Function to generate available dates for the next 60 days
const generateAvailableDates = (serviceId: string, serviceDuration: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    if (isDateAvailable(dateStr, serviceId)) {
      dates.push(dateStr);
    }
  }
  
  return dates;
};

// Function to get date status for calendar marking
const getDateStatus = (date: string, serviceId: string, serviceDuration: number): 'available' | 'fully_booked' | 'closed' => {
  if (!isDateAvailable(date, serviceId)) {
    return 'closed';
  }
  
  if (isDateFullyBooked(date, serviceId, serviceDuration)) {
    return 'fully_booked';
  }
  
  return 'available';
};

// Function to generate time slots for a specific date
const generateTimeSlotsForDate = (date: string, serviceId: string, serviceDuration: number): any[] => {
  const availability = mockServiceAvailability[serviceId];
  if (!availability || !isDateAvailable(date, serviceId)) {
    return [];
  }

  const businessStart = parseTimeString(availability.business_hours.start);
  const businessEnd = parseTimeString(availability.business_hours.end);
  const bookedSlots = availability.booked_slots[date] || [];

  const slots = [];
  
  // Generate slots with service duration intervals
  for (let time = businessStart; time <= businessEnd - serviceDuration; time += serviceDuration) {
    const slotEnd = time + serviceDuration;
    
    // Check if this slot conflicts with booked slots
    const isConflict = bookedSlots.some(booked => {
      const bookedStart = parseTimeString(booked.start);
      const bookedEnd = parseTimeString(booked.end);
      return (time < bookedEnd && slotEnd > bookedStart);
    });

    if (!isConflict && slotEnd <= businessEnd) {
      slots.push({
        id: minutesToTime(time),
        startTime: minutesToTime(time),
        endTime: minutesToTime(slotEnd),
        available: true,
        duration: serviceDuration
      });
    }
  }

  return slots;
};

const { width: windowWidth } = Dimensions.get('window');

const BookingDateTimeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { accountType } = useAccount();
  
  // Initialize with a default service option
  const [selectedServiceOption, setSelectedServiceOption] = useState(mockServiceOptions[0]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Single API service function for booking data
  const apiService = {
    async getBookingAvailability(params: {
      serviceId: string;
      date?: string;
      duration: number;
    }): Promise<ApiResponse<{
      availableDates: string[];
      markedDates: any;
      timeSlots?: any[];
    }>> {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const { serviceId, date, duration } = params;
        
        // Generate marked dates for calendar
        const marks: any = {};
        const today = new Date();
        
        for (let i = 0; i < 60; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          const status = getDateStatus(dateStr, serviceId, duration);
          
          switch (status) {
            case 'closed':
              marks[dateStr] = {
                disabled: true,
                disableTouchEvent: true,
                customStyles: {
                  container: { backgroundColor: '#1A2533' },
                  text: { color: 'white', fontWeight: 'bold' }
                },
                marked: true,
                dotColor: '#1A2533'
              };
              break;
              
            case 'fully_booked':
              marks[dateStr] = {
                disabled: true,
                disableTouchEvent: true,
                customStyles: {
                  container: { backgroundColor: '#FEE2E2' },
                  text: { color: '#DC2626', fontWeight: 'bold' }
                },
                marked: true,
                dotColor: '#EF4444'
              };
              break;
              
            case 'available':
              marks[dateStr] = {
                marked: true,
                dotColor: '#1A2533',
                customStyles: {
                  container: { backgroundColor: 'transparent' },
                  text: { color: '#1A2533' }
                }
              };
              break;
          }
        }

        // Get time slots if date is provided
        let timeSlots: any[] = [];
        if (date) {
          timeSlots = generateTimeSlotsForDate(date, serviceId, duration);
        }

        const availableDates = generateAvailableDates(serviceId, duration);

        return {
          data: {
            availableDates,
            markedDates: marks,
            timeSlots
          },
          success: true
        };
      } catch (error) {
        console.error('Booking availability error:', error);
        return {
          data: {
            availableDates: [],
            markedDates: {},
            timeSlots: []
          },
          success: false,
          error: 'Failed to fetch booking availability'
        };
      }
    },

    async confirmBooking(bookingData: {
      serviceId: string;
      date: string;
      time: string;
      serviceOption: any;
    }): Promise<ApiResponse<{ bookingId: string }>> {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          data: {
            bookingId: `BK_${Date.now()}`
          },
          success: true
        };
      } catch (error) {
        console.error('Booking confirmation error:', error);
        return {
          data: { bookingId: '' },
          success: false,
          error: 'Failed to confirm booking'
        };
      }
    }
  };

  // Calculate calendar marked dates when service changes
  useEffect(() => {
    if (selectedServiceOption) {
      const loadCalendarData = async () => {
        const response = await apiService.getBookingAvailability({
          serviceId: selectedServiceOption.service_id,
          duration: selectedServiceOption.duration
        });

        if (response.success) {
          let marks = response.data.markedDates;
          
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
      };

      loadCalendarData();
    }
  }, [selectedServiceOption, selectedDate]);

  // Generate time slots when date changes
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!selectedDate || !selectedServiceOption) {
        return;
      }
      
      setLoading(true);
      
      const response = await apiService.getBookingAvailability({
        serviceId: selectedServiceOption.service_id,
        date: selectedDate,
        duration: selectedServiceOption.duration
      });

      if (response.success) {
        setAvailableSlots(response.data.timeSlots || []);
      }
      
      setLoading(false);
    };
    
    fetchTimeSlots();
  }, [selectedDate, selectedServiceOption]);

  const handleServiceSelection = (serviceId: string) => {
    console.log('Service selected:', serviceId);
    const newService = mockServiceOptions.find(opt => opt.service_id === serviceId && opt.is_default);
    if (newService) {
      setSelectedServiceOption(newService);
      setSelectedDate('');
      setSelectedTime('');
    }
  };

  const handleDatePress = (day: { dateString: string }): void => {
    console.log('Date selected:', day.dateString);
    setSelectedDate(day.dateString);
    setSelectedTime('');
  };

  const handleTimePress = (time: string) => {
    console.log('Time selected:', time);
    setSelectedTime(time);
  };

  const handleBackPress = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      Alert.alert('Navigation', 'Go back to previous screen');
    }
  };

  const handleConfirm = async (): Promise<void> => {
    if (!selectedDate || !selectedTime) {
      return;
    }
    
    try {
      const response = await apiService.confirmBooking({
        serviceId: selectedServiceOption.service_id,
        date: selectedDate,
        time: selectedTime,
        serviceOption: selectedServiceOption
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to confirm booking');
        return;
      }

      setShowSuccessModal(true);
      
      // Close modal after showing success and navigate based on account type
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        // Reset form after successful booking
        setSelectedDate('');
        setSelectedTime('');
        console.log('Booking completed successfully!');
        
        // Navigate to correct tabs based on account type
        if (navigation?.navigate) {
          if (accountType === 'provider') {
            navigation.navigate('ProviderTabs');
          } else {
            navigation.navigate('ConsumerTabs');
          }
        } else {
          Alert.alert('Success', 'Booking confirmed successfully!');
        }
      }, 2500);
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to confirm booking');
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    
    // Get today and tomorrow for comparison
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

  // Get today's date for calendar
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60); // 60 days in advance
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
          <Ionicons name="arrow-back" size={20} color="#1A2533" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSubtitle}>Select date and time</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Selector */}
        <View style={styles.serviceSelector}>
          <Text style={styles.summaryTitle}>Select Service</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(mockServiceAvailability).map(serviceId => {
              const serviceOption = mockServiceOptions.find(opt => opt.service_id === serviceId && opt.is_default);
              if (!serviceOption) return null;
              
              const isSelected = selectedServiceOption?.service_id === serviceId;
              
              return (
                <TouchableOpacity
                  key={serviceId}
                  style={[styles.serviceOptionButton, isSelected && styles.selectedServiceOption]}
                  onPress={() => handleServiceSelection(serviceId)}
                >
                  <Text style={[styles.serviceOptionText, isSelected && styles.selectedServiceOptionText]}>
                    {serviceOption.salon_name}
                  </Text>
                  <Text style={[styles.serviceOptionSubtext, isSelected && styles.selectedServiceOptionText]}>
                    {serviceOption.name} ({serviceOption.duration}min)
                  </Text>
                  <Text style={[styles.serviceOptionSubtext, isSelected && styles.selectedServiceOptionText]}>
                    ${serviceOption.price}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Current Selection Summary */}
        {selectedServiceOption && (
          <View style={styles.servicesSummary}>
            <Text style={styles.summaryTitle}>Selected Service</Text>
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{selectedServiceOption.name}</Text>
                <Text style={styles.servicePrice}>${selectedServiceOption.price}</Text>
              </View>
              <Text style={styles.serviceDescription}>{selectedServiceOption.description}</Text>
              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetailItem}>
                  <Ionicons name="time-outline" size={14} color="#1A2533" />
                  <Text style={styles.serviceDetailText}>{selectedServiceOption.duration}min</Text>
                </View>
                <View style={styles.serviceDetailItem}>
                  <Ionicons name="business-outline" size={14} color="#1A2533" />
                  <Text style={styles.serviceDetailText}>{selectedServiceOption.salon_name}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

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
              <Text style={styles.legendText}>Fully Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1A2533' }]} />
              <Text style={styles.legendText}>Closed</Text>
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
            ) : availableSlots.length > 0 ? (
              <View style={styles.timeSlotsGrid}>
                {availableSlots.map(slot => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot, 
                      selectedTime === slot.startTime && styles.selectedTimeSlot,
                    ]}
                    onPress={() => handleTimePress(slot.startTime)}
                  >
                    <Text 
                      style={[
                        styles.timeText,
                        selectedTime === slot.startTime && styles.selectedTimeText,
                      ]}
                    >
                      {slot.startTime}
                    </Text>
                    <Text 
                      style={[
                        styles.durationText,
                        selectedTime === slot.startTime && styles.selectedTimeText,
                      ]}
                    >
                      {slot.duration}min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="calendar-clear-outline" size={48} color="#1A2533" />
                <Text style={styles.noSlotsText}>No available time slots</Text>
                <Text style={styles.noSlotsSubtext}>Please select another date</Text>
              </View>
            )}
          </View>
        )}

        {/* Booking Summary */}
        {selectedDate && selectedTime && selectedServiceOption && (
          <View style={styles.selectionSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service</Text>
                <Text style={styles.summaryValue}>{selectedServiceOption.name}</Text>
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
                <Text style={styles.summaryValue}>{selectedServiceOption.duration} minutes</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>${selectedServiceOption.price}</Text>
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
              Your appointment has been successfully scheduled.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Updated styles with consistent color palette
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Consistent app background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50, // Account for transparent status bar
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent', // Transparent header
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(254, 243, 199, 0.9)', // Semi-transparent background
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.5)', // Semi-transparent border
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  serviceSelector: {
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 12,
  },
  serviceOptionButton: {
    backgroundColor: '#F0FFFE',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 2,
    borderColor: '#F8FFFE',
  },
  selectedServiceOption: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  serviceOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
  },
  serviceOptionSubtext: {
    fontSize: 10,
    color: '#1A2533',
    textAlign: 'center',
    marginTop: 2,
  },
  selectedServiceOptionText: {
    color: '#FFFFFF',
  },
  servicesSummary: {
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
  serviceCard: {
    backgroundColor: '#F0FFFE',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#1A2533',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDetailText: {
    fontSize: 11,
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
    backgroundColor: '#F0FFFE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedTimeSlot: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  selectedTimeText: {
    color: '#FFFFFF',
  },
  durationText: {
    fontSize: 11,
    color: '#1A2533',
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
});

export default BookingDateTimeScreen;