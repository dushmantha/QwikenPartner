// ServiceQueueScreen.tsx - Complete integration with single API call and fixed styling
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccount } from '../../navigation/AppNavigator';
import UpgradeModal from '../../components/UpgradeModal';
import { normalizedShopService, Payment } from '../../lib/supabase/normalized';
import ServiceManagementAPI from '../../services/ServiceManagementAPI';
import { usePremium } from '../../contexts/PremiumContext';
import { CancellationBanner } from '../../components/CancellationBanner';
import { useQueueBadge } from '../../contexts/QueueBadgeContext';
import { shouldUseMockData, logMockUsage } from '../../config/devConfig';
import { getMockBookings } from '../../data/mockData';

// Types
interface QueueItem {
  id: string;
  booking_id: string;
  title: string;
  service_type: string;
  service_options?: Array<{
    id: string;
    option_name: string;
    price: number;
  }>;
  client: string;
  client_phone: string;
  client_email: string;
  date: string;
  time: string;
  scheduled_time: string;
  duration: string;
  price: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  priority: 'high' | 'medium' | 'low';
  notes: string;
  location_type: 'in_house' | 'on_location';
  location: string;
  staff_name: string;
  created_at: string;
  invoice_sent: boolean;
}

interface QueueStats {
  totalBookings: number;
  pendingCount: number;
  confirmedCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  todayRevenue: number;
  weeklyRevenue: number;
}

// Combined API response interface
interface QueueDashboardData {
  items: QueueItem[];
  stats: QueueStats;
  invoicesSent: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

const ServiceQueueScreen = ({ navigation }) => {
  const { user } = useAccount();
  const { isPremium } = usePremium();
  const { hideBadge } = useQueueBadge();
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Helper function to format booking ID
  const formatBookingId = (bookingId: string) => {
    // Get last 5 characters and prepend with BKR
    const last5 = bookingId.slice(-5).toUpperCase();
    return `BKR${last5}`;
  };

  // Helper function to format date for display
  const formatBookingDate = (dateString: string) => {
    const bookingDate = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for accurate comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (bookingDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      // Show day of week and date for other dates
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      };
      return bookingDate.toLocaleDateString('en-US', options);
    }
  };

  // Helper function to check if booking is upcoming (today or in the future)
  const isUpcoming = (dateString: string) => {
    const bookingDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate.getTime() >= today.getTime();
  };
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalBookings: 0,
    pendingCount: 0,
    confirmedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [invoiceSentItems, setInvoiceSentItems] = useState(new Set());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Main tab state
  const [activeTab, setActiveTab] = useState<'queue' | 'payments'>('queue');
  
  // Payment-related state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [paidPayments, setPaidPayments] = useState<Payment[]>([]);
  const [paymentStatusTab, setPaymentStatusTab] = useState<'pending' | 'paid'>('pending');

  const FREE_USER_LIMIT = 3;

  // Custom features for the booking queue upgrade modal
  const queueUpgradeFeatures = [
    {
      icon: 'infinite-outline',
      iconColor: '#3B82F6',
      title: 'Unlimited Booking Views',
      description: 'View and manage all your customer bookings without any restrictions or limits'
    },
    {
      icon: 'filter-outline',
      iconColor: '#059669',
      title: 'Advanced Filtering',
      description: 'Filter bookings by status, date, service type, and priority with unlimited results'
    },
    {
      icon: 'analytics-outline',
      iconColor: '#1A2533',
      title: 'Booking Analytics',
      description: 'Track booking trends, peak times, customer patterns, and service performance'
    },
    {
      icon: 'notifications-outline',
      iconColor: '#8B5CF6',
      title: 'Real-time Notifications',
      description: 'Get instant notifications for new bookings, cancellations, and urgent requests'
    }
  ];


  // Filter options with honey theme
  const filterOptions = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'pending', label: 'Pending', icon: 'time' },
    { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle' },
    { key: 'in_progress', label: 'In Progress', icon: 'play-circle' },
    { key: 'completed', label: 'Done', icon: 'checkmark-done' },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
    { key: 'no_show', label: 'No Show', icon: 'person-remove' },
  ];

  // Load initial data directly from Supabase
  const loadQueueData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      // Use mock data if enabled
      if (shouldUseMockData('MOCK_BOOKINGS')) {
        console.log('🎭 Using mock queue data');
        logMockUsage('Loading mock service queue data');
        
        const mockBookings = getMockBookings();
        
        // Filter mock bookings to only show active ones (not completed)
        const queueBookings = mockBookings.filter(booking => {
          return booking.status !== 'completed' && 
                 booking.status !== 'cancelled' && 
                 booking.status !== 'no_show';
        });
        
        // Transform mock data to match QueueItem interface
        const customerNames = ['Sarah Williams', 'Emma Thompson', 'John Miller', 'Maria Garcia', 'David Chen'];
        const customerEmails = ['sarah.w@email.com', 'emma.t@email.com', 'john.m@email.com', 'maria.g@email.com', 'david.c@email.com'];
        const customerPhones = ['+1 (555) 123-4567', '+1 (555) 234-5678', '+1 (555) 345-6789', '+1 (555) 456-7890', '+1 (555) 567-8901'];
        
        const queueItems: QueueItem[] = queueBookings.map((booking, index) => ({
          id: booking.id,
          booking_id: booking.id,
          title: Array.isArray(booking.serviceNames) ? booking.serviceNames[0] : booking.serviceNames || 'Service',
          service_type: 'Beauty Service',
          service_options: [],
          client: customerNames[index % customerNames.length],
          client_phone: customerPhones[index % customerPhones.length],
          client_email: customerEmails[index % customerEmails.length],
          date: booking.bookingDate,
          time: booking.startTime,
          scheduled_time: `${booking.bookingDate}T${booking.startTime}:00`,
          duration: '60 min',
          price: booking.totalPrice,
          status: booking.status as any,
          priority: booking.status === 'pending' ? 'high' : 'medium',
          notes: booking.notes || '',
          location_type: 'in_house' as any,
          location: 'Shop Location',
          staff_name: booking.staffName || 'Staff Member',
          created_at: booking.createdAt,
          invoice_sent: false
        }));
        
        console.log('📋 Mock queue items loaded:', queueItems.length);
        setQueueData(queueItems);
        
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }
      
      // Get user ID from multiple sources for reliability
      let providerId = user?.id;
      
      // If context user is not available, try to get it from Supabase directly
      if (!providerId) {
        console.log('⚠️ User context not available, checking Supabase auth...');
        const currentUser = await normalizedShopService.getCurrentUser();
        providerId = currentUser?.id;
      }
      
      if (!providerId) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      console.log('📋 Loading bookings directly from Supabase for provider:', providerId);
      const response = await normalizedShopService.getBookings(providerId);
      
      if (response.success && response.data) {
        const bookings = response.data;
        console.log('📋 Loaded', bookings.length, 'bookings from Supabase');
        
        // Filter bookings for Service Queue: show all bookings that are NOT completed
        // Completed bookings go to Payments tab
        const queueBookings = bookings.filter(booking => {
          // Keep in queue if status is not completed/cancelled/no_show
          return booking.status !== 'completed' && 
                 booking.status !== 'cancelled' && 
                 booking.status !== 'no_show';
        });
        console.log('📋 Filtered to', queueBookings.length, 'queue items (active bookings)');
        
        // Transform the booking data to match our QueueItem interface
        const queueItems: QueueItem[] = queueBookings.map(booking => ({
          id: booking.id,
          booking_id: booking.id,
          title: booking.service_name || 'Service',
          service_type: booking.service_category || 'General Service',
          service_options: booking.service_options || [],
          client: booking.customer_name,
          client_phone: booking.customer_phone,
          client_email: booking.customer_email || '',
          date: booking.booking_date,
          time: booking.start_time,
          scheduled_time: `${booking.booking_date} ${booking.start_time}`,
          duration: `${booking.duration || 60} min`,
          price: booking.total_price,
          status: booking.status,
          priority: booking.status === 'pending' ? 'high' : 'medium',
          notes: booking.notes || '',
          location_type: booking.service_location_type || 'in_house',
          location: booking.service_location_type === 'on_location' ? 'Client Location' : 'Shop Location',
          staff_name: booking.staff?.name || 'Any Staff',
          created_at: booking.created_at,
          invoice_sent: false // Will be managed separately
        }));
        
        // Update queue data
        setQueueData(queueItems);
        
        // Calculate stats from the booking data
        const stats: QueueStats = {
          totalBookings: queueItems.length,
          pendingCount: queueItems.filter(item => item.status === 'pending').length,
          confirmedCount: queueItems.filter(item => item.status === 'confirmed').length,
          inProgressCount: queueItems.filter(item => item.status === 'in_progress').length,
          completedCount: queueItems.filter(item => item.status === 'completed').length,
          cancelledCount: queueItems.filter(item => item.status === 'cancelled').length,
          noShowCount: queueItems.filter(item => item.status === 'no_show').length,
          todayRevenue: queueItems
            .filter(item => item.status === 'completed' && item.date === new Date().toISOString().split('T')[0])
            .reduce((sum, item) => sum + item.price, 0),
          weeklyRevenue: queueItems
            .filter(item => item.status === 'completed')
            .reduce((sum, item) => sum + item.price, 0),
        };
        
        setQueueStats(stats);
        
        // Load invoice tracking data from local storage (only on initial load)
        if (showLoading) {
          try {
            const savedInvoices = await AsyncStorage.getItem('sentInvoices');
            if (savedInvoices) {
              setInvoiceSentItems(new Set(JSON.parse(savedInvoices)));
            }
          } catch (error) {
            console.log('No saved invoice data found');
          }
        }
        
      } else {
        throw new Error(response.error || 'Failed to load bookings');
      }
      
    } catch (error) {
      console.error('Error loading booking queue:', error);
      
      // Handle authentication errors specifically
      if (error.message?.includes('not authenticated')) {
        Alert.alert(
          'Authentication Required', 
          'Please log in again to access your booking queue.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else if (showLoading) {
        Alert.alert('Error', 'Failed to load booking queue. Please try again.');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadQueueData(true); // Initial load with loading indicator
    
    // Set up periodic refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing booking queue...');
      loadQueueData(false); // Background refresh without loading indicator
    }, 30000);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [loadQueueData]);

  // Refresh data when screen comes into focus and clear badge
  useFocusEffect(
    useCallback(() => {
      console.log('📋 Screen focused, refreshing booking queue...');
      // Clear the badge when user views the queue
      hideBadge();
      loadQueueData(false); // Background refresh without loading indicator
    }, [loadQueueData, hideBadge])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (activeTab === 'queue') {
      await loadQueueData(false); // Manual refresh doesn't need loading indicator
    } else {
      await loadPayments();
    }
    setIsRefreshing(false);
  }, [loadQueueData, activeTab]);

  // Load payments function
  const loadPayments = useCallback(async () => {
    try {
      setIsLoadingPayments(true);
      const response = await normalizedShopService.getPayments();
      
      if (response.success && response.data) {
        setPayments(response.data);
        // Separate pending and paid payments
        setPendingPayments(response.data.filter(p => p.payment_status === 'pending'));
        setPaidPayments(response.data.filter(p => p.payment_status === 'paid'));
      } else {
        console.error('Failed to load payments:', response.error);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'payments') {
      loadPayments();
    }
  }, [activeTab, loadPayments]);

  // Get filtered data with proper limitations
  const getFilteredData = useCallback(() => {
    let filtered = selectedFilter === 'all' 
      ? queueData 
      : queueData.filter(item => item.status === selectedFilter);
    
    // Sort bookings:
    // 1. Non-completed statuses first (pending, confirmed, in_progress)
    // 2. Then by date and time (upcoming first)
    // 3. Completed, cancelled, no_show at the bottom
    filtered = filtered.sort((a, b) => {
      // Priority order for statuses
      const statusPriority = {
        'pending': 1,
        'confirmed': 2,
        'in_progress': 3,
        'completed': 4,
        'cancelled': 5,
        'no_show': 6
      };
      
      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      
      // If different status priorities, sort by priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same status, sort by date and time (upcoming first)
      const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
      const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
      
      return aDateTime - bDateTime;
    });
    
    if (!isPremium) {
      return filtered.slice(0, FREE_USER_LIMIT);
    }
    
    return filtered;
  }, [queueData, selectedFilter, isPremium]);

  // Get counts for each filter using stats from API
  const getFilterCounts = useCallback(() => {
    return {
      all: queueStats.totalBookings,
      pending: queueStats.pendingCount,
      confirmed: queueStats.confirmedCount,
      in_progress: queueStats.inProgressCount,
      completed: queueStats.completedCount,
      cancelled: queueStats.cancelledCount,
      no_show: queueStats.noShowCount,
    };
  }, [queueStats]);

  // Check if there are hidden items
  const getHiddenItemsCount = useCallback(() => {
    if (isPremium) return 0;
    
    const allFiltered = selectedFilter === 'all' 
      ? queueData 
      : queueData.filter(item => item.status === selectedFilter);
    
    return Math.max(0, allFiltered.length - FREE_USER_LIMIT);
  }, [queueData, selectedFilter, isPremium]);

  const filteredData = getFilteredData();
  const hiddenItemsCount = getHiddenItemsCount();

  // Handle filter selection with premium check
  const handleFilterSelect = useCallback((filterKey: string) => {
    // Block free users from using any filter except "all"
    if (!isPremium && filterKey !== 'all') {
      setShowUpgradeModal(true);
      return; // Don't change the selected filter
    }
    
    setSelectedFilter(filterKey);
  }, [isPremium]);

  // Handle premium upgrade
  const handleUpgradeToPremium = useCallback(async () => {
    try {
      setShowUpgradeModal(false);
      setIsLoading(true);
      
      // Navigate to subscription screen
      navigation.navigate('Subscription');
      
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  // Accept booking with direct Supabase integration
  const handleAcceptBooking = useCallback(async (item: QueueItem) => {
    try {
      setProcessingItems(prev => new Set([...prev, item.id]));
      
      console.log('📋 Confirming booking:', item.booking_id);
      const response = await normalizedShopService.updateBookingStatus(
        item.booking_id, 
        'confirmed',
        'Booking confirmed by provider'
      );
      
      if (response.success) {
        // Update local state immediately
        setQueueData(prevData =>
          prevData.map(queueItem =>
            queueItem.id === item.id
              ? { ...queueItem, status: 'confirmed' as const }
              : queueItem
          )
        );
        
        // Update stats
        setQueueStats(prevStats => ({
          ...prevStats,
          pendingCount: prevStats.pendingCount - 1,
          confirmedCount: prevStats.confirmedCount + 1
        }));
        
        Alert.alert(
          'Booking Confirmed',
          `You've confirmed the booking for ${item.client}. They will be notified.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.error || 'Failed to confirm booking');
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }, []);

  // Reject booking with API integration
  const handleRejectBooking = useCallback(async (item: QueueItem) => {
    Alert.alert(
      'Reject Booking',
      `Are you sure you want to reject the booking for ${item.client}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingItems(prev => new Set([...prev, item.id]));
              
              console.log('📋 Cancelling booking:', item.booking_id);
              const response = await normalizedShopService.updateBookingStatus(
                item.booking_id, 
                'cancelled', 
                'Provider declined booking'
              );
              
              if (response.success) {
                // Update local state immediately
                setQueueData(prevData =>
                  prevData.map(queueItem =>
                    queueItem.id === item.id
                      ? { ...queueItem, status: 'cancelled' as const }
                      : queueItem
                  )
                );
                
                // Update stats
                setQueueStats(prevStats => ({
                  ...prevStats,
                  pendingCount: prevStats.pendingCount - 1,
                  cancelledCount: prevStats.cancelledCount + 1
                }));
                
                Alert.alert(
                  'Booking Cancelled',
                  `You've cancelled the booking for ${item.client}. They will be notified and can book with another provider.`,
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(response.error || 'Failed to cancel booking');
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            } finally {
              setProcessingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [user?.id]);

  // Mark as completed with API integration
  const handleMarkCompleted = useCallback(async (item: QueueItem) => {
    Alert.alert(
      'Mark as Completed',
      `Mark the booking for ${item.client} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setProcessingItems(prev => new Set([...prev, item.id]));
              
              console.log('📋 Completing booking:', item.booking_id);
              const response = await normalizedShopService.updateBookingStatus(
                item.booking_id, 
                'completed', 
                'Service completed successfully'
              );
              
              console.log('📋 Update booking status response:', response);
              
              if (response.success) {
                // Create payment record for completed booking
                console.log('💰 Creating payment record for completed booking');
                const paymentResponse = await normalizedShopService.createPaymentRecord({
                  booking_id: item.booking_id,
                  client_name: item.client,
                  client_email: item.client_email,
                  client_phone: item.client_phone,
                  service_title: item.title,
                  service_type: item.service_type,
                  service_date: item.date,
                  service_time: item.time,
                  duration: item.duration,
                  amount: item.price,
                  notes: item.notes,
                  location_type: item.location_type,
                  location: item.location,
                  payment_status: 'pending' // Set as pending for newly completed items
                });

                if (paymentResponse.success) {
                  console.log('✅ Payment record created successfully');
                } else {
                  console.warn('⚠️ Failed to create payment record:', paymentResponse.error);
                }

                // Remove completed item from queue since it now has payment status
                // (it will only show in Payments tab now)
                setQueueData(prevData =>
                  prevData.filter(queueItem => queueItem.id !== item.id)
                );
                
                // Update stats (decrease total since item is removed from queue)
                setQueueStats(prevStats => ({
                  ...prevStats,
                  totalBookings: prevStats.totalBookings - 1,
                  confirmedCount: prevStats.confirmedCount - 1,
                  // Don't increase completedCount since completed items are no longer in queue
                  todayRevenue: prevStats.todayRevenue + item.price,
                  weeklyRevenue: prevStats.weeklyRevenue + item.price
                }));
                
                // Auto-switch to Payments tab to show the new pending payment
                setActiveTab('payments');
                setPaymentStatusTab('pending');
                
                // Load payments to show the new pending payment
                await loadPayments();
                
                // Show simple success message with payment options
                Alert.alert(
                  'Service Completed!',
                  `Service for ${item.client} completed successfully. The payment is now pending in the Payments tab below. You can mark it as paid when payment is received.`,
                  [
                    { text: 'OK' },
                    {
                      text: 'Mark as Paid Now',
                      onPress: async () => {
                        try {
                          const response = await normalizedShopService.updatePaymentStatus(item.booking_id, 'paid');
                          if (response.success) {
                            Alert.alert('Success', `Payment for ${item.client} marked as paid!`);
                            // Refresh data to update payment status
                            loadQueueData();
                            await loadPayments();
                          } else {
                            Alert.alert('Error', 'Failed to update payment status');
                          }
                        } catch (error) {
                          console.error('Error updating payment:', error);
                          Alert.alert('Error', 'Failed to update payment status');
                        }
                      }
                    }
                  ]
                );
              } else {
                throw new Error(response.error || 'Failed to complete booking');
              }
            } catch (error: any) {
              console.error('Error completing booking:', error);
              const errorMessage = error?.message || error?.error || 'Failed to mark booking as completed';
              Alert.alert('Error', errorMessage);
            } finally {
              setProcessingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [user?.id]);

  // Handle invoice generation navigation
  const handleGenerateInvoice = useCallback(async (item: QueueItem) => {
    try {
      await AsyncStorage.setItem('selectedBookingForInvoice', JSON.stringify({
        bookingId: item.booking_id,
        bookingData: item
      }));
      
      navigation.navigate('InvoiceGenerator');
      
    } catch (error) {
      console.error('Error preparing invoice data:', error);
      Alert.alert('Error', 'Failed to prepare invoice data');
    }
  }, [navigation]);

  // Handle invoice sending with API integration
  const handleSendInvoice = useCallback(async (item: QueueItem) => {
    const isInvoiceSent = invoiceSentItems.has(item.booking_id);
    
    if (isInvoiceSent) {
      Alert.alert(
        'Send Invoice Again?',
        `An invoice has already been sent to ${item.client} for booking ${formatBookingId(item.booking_id)}. Would you like to send it again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Again',
            onPress: async () => {
              await sendInvoiceToClient(item);
            }
          }
        ]
      );
    } else {
      await sendInvoiceToClient(item);
    }
  }, [invoiceSentItems]);

  const sendInvoiceToClient = useCallback(async (item: QueueItem) => {
    try {
      setProcessingItems(prev => new Set([...prev, item.id]));
      
      // Mock invoice sending - replace with actual invoice service when available
      const response = await new Promise<{success: boolean; message?: string}>((resolve) => {
        setTimeout(() => {
          // Simulate successful invoice sending
          resolve({
            success: true,
            message: 'Invoice sent successfully'
          });
        }, 1000); // Simulate network delay
      });
      
      if (response.success) {
        const newInvoiceSentItems = new Set([...invoiceSentItems, item.booking_id]);
        setInvoiceSentItems(newInvoiceSentItems);
        
        // Create pending payment record for invoiced booking
        console.log('💰 Creating pending payment record for invoiced booking');
        try {
          const paymentResponse = await normalizedShopService.createPaymentRecord({
            booking_id: item.booking_id,
            client_name: item.client,
            client_email: item.client_email,
            client_phone: item.client_phone,
            service_title: item.title,
            service_type: item.service_type,
            service_date: item.date,
            service_time: item.time,
            duration: item.duration,
            amount: item.price,
            notes: item.notes,
            location_type: item.location_type,
            location: item.location,
            payment_status: 'pending' // Set as pending for invoiced items
          });

          if (paymentResponse.success) {
            console.log('✅ Pending payment record created for invoice');
            // Refresh payments if user is on payments tab
            if (activeTab === 'payments') {
              loadPayments();
            }
          } else {
            console.warn('⚠️ Failed to create payment record for invoice:', paymentResponse.error);
          }
        } catch (paymentError) {
          console.error('❌ Error creating payment record:', paymentError);
        }
        
        // Save locally
        await AsyncStorage.setItem('sentInvoices', JSON.stringify([...newInvoiceSentItems]));
        
        setQueueData(prevData =>
          prevData.map(queueItem =>
            queueItem.id === item.id
              ? { ...queueItem, invoice_sent: true }
              : queueItem
          )
        );
        
        // Auto-switch to Payments tab to show the new pending payment
        setActiveTab('payments');
        setPaymentStatusTab('pending');
        
        // Load payments to show the new pending payment
        await loadPayments();
        
        // Show simple success message
        Alert.alert(
          'Invoice Sent!',
          `Invoice has been sent to ${item.client}. Check the pending payments below to mark as paid when received.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      Alert.alert('Error', 'Failed to send invoice. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }, [user?.id, invoiceSentItems]);

  // Make phone call
  const handleCallClient = useCallback(async (phoneNumber: string, clientName: string) => {
    try {
      const phoneUrl = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          'Call Failed',
          'Unable to make phone calls on this device',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert('Error', 'Failed to initiate phone call');
    }
  }, []);

  // Send SMS message
  const handleMessageClient = useCallback(async (phoneNumber: string, clientName: string, serviceName: string) => {
    try {
      const message = `Hi ${clientName}, this is regarding your ${serviceName} booking. How can I help you?`;
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(smsUrl);
      
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert(
          'Message Failed',
          'Unable to send messages on this device',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  }, []);

  // Get status badge style with honey theme
  const getStatusBadgeStyle = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return { badge: styles.pendingBadge, text: styles.pendingText };
      case 'confirmed':
        return { badge: styles.confirmedBadge, text: styles.confirmedText };
      case 'in_progress':
        return { badge: styles.inProgressBadge, text: styles.inProgressText };
      case 'completed':
        return { badge: styles.completedBadge, text: styles.completedText };
      case 'cancelled':
        return { badge: styles.cancelledBadge, text: styles.cancelledText };
      case 'no_show':
        return { badge: styles.noShowBadge, text: styles.noShowText };
      default:
        return { badge: styles.pendingBadge, text: styles.pendingText };
    }
  }, []);

  // Render action buttons based on status
  const renderActionButtons = useCallback((item: QueueItem) => {
    const isProcessing = processingItems.has(item.id);
    const isInvoiceSent = invoiceSentItems.has(item.booking_id);

    if (isProcessing) {
      return (
        <View style={styles.queueActions}>
          <View style={styles.loadingAction}>
            <ActivityIndicator size="small" color="#1A2533" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.queueActions}>
        {/* Communication Actions */}
        <View style={styles.communicationActions}>
          <TouchableOpacity 
            style={styles.communicationButton}
            onPress={() => handleCallClient(item.client_phone, item.client)}
          >
            <Ionicons name="call-outline" size={16} color="#10B981" />
            <Text style={styles.communicationButtonText}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.communicationButton}
            onPress={() => handleMessageClient(item.client_phone, item.client, item.title)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
            <Text style={[styles.communicationButtonText, { color: '#3B82F6' }]}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Status Actions */}
        <View style={styles.statusActions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => handleRejectBooking(item)}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => handleAcceptBooking(item)}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Confirm</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'confirmed' && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={() => handleMarkCompleted(item)}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}

          {item.status === 'completed' && (
            <View style={styles.completedActions}>
              <TouchableOpacity 
                style={styles.invoiceButton}
                onPress={() => handleGenerateInvoice(item)}
              >
                <Ionicons name="document-text" size={16} color="#1A2533" />
                <Text style={styles.invoiceButtonText}>Generate Invoice</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={isInvoiceSent ? styles.invoiceSentButton : styles.sendInvoiceButton}
                onPress={() => handleSendInvoice(item)}
              >
                <Ionicons 
                  name={isInvoiceSent ? "checkmark-circle" : "send"} 
                  size={16} 
                  color={isInvoiceSent ? "#10B981" : "#FFFFFF"} 
                />
                <Text style={isInvoiceSent ? styles.invoiceSentButtonText : styles.sendInvoiceButtonText}>
                  {isInvoiceSent ? 'Invoice Sent' : 'Send Invoice'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(item.status === 'cancelled' || item.status === 'no_show') && (
            <View style={styles.statusIndicatorButton}>
              <Text style={styles.statusIndicatorText}>
                {item.status === 'cancelled' ? 'Cancelled' : 'No Show'}
              </Text>
            </View>
          )}
        </View>

        {/* Invoice sent indicator */}
        {isInvoiceSent && item.status === 'completed' && (
          <View style={styles.invoiceSentIndicator}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.invoiceSentIndicatorText}>Invoice has been sent to client</Text>
          </View>
        )}
      </View>
    );
  }, [processingItems, invoiceSentItems, handleCallClient, handleMessageClient, handleRejectBooking, handleAcceptBooking, handleMarkCompleted, handleGenerateInvoice, handleSendInvoice]);

  const renderQueueItem = useCallback(({ item }: { item: QueueItem }) => {
    const statusStyle = getStatusBadgeStyle(item.status);

    return (
      <TouchableOpacity style={styles.queueItem}>
        <View style={styles.queueHeader}>
          <View style={styles.queueTitleContainer}>
            <Text style={styles.queueTitle}>{item.title}</Text>
            <Text style={styles.serviceType}>{item.service_type}</Text>
            {item.service_options && item.service_options.length > 0 && (
              <View style={styles.serviceOptionsContainer}>
                {item.service_options.map((option, index) => (
                  <View key={option.id} style={styles.serviceOptionTag}>
                    <Text style={styles.serviceOptionText}>
                      + {option.option_name}
                    </Text>
                    <Text style={styles.serviceOptionPrice}>
                      ${option.price}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, statusStyle.badge]}>
            <Text style={[styles.statusText, statusStyle.text]}>
              {item.status === 'completed' ? 'DONE' : item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.clientInfo}>
          <Text style={styles.queueClient}>{item.client}</Text>
          <Text style={styles.bookingId}>{formatBookingId(item.booking_id)}</Text>
        </View>

        <View style={styles.queueDetails}>
          {/* Date Row - Prominently displayed */}
          <View style={[styles.detailRow, styles.dateRow]}>
            <Ionicons 
              name="calendar-outline" 
              size={16} 
              color={isUpcoming(item.date) ? "#059669" : "#6B7280"} 
            />
            <Text style={[
              styles.queueDate, 
              isUpcoming(item.date) && item.status !== 'completed' && styles.upcomingDate,
              item.status === 'completed' && styles.completedDate
            ]}>
              {formatBookingDate(item.date)}
            </Text>
            {item.status === 'completed' ? (
              <View style={styles.completedDateBadge}>
                <Text style={styles.completedDateBadgeText}>COMPLETED</Text>
              </View>
            ) : isUpcoming(item.date) && (
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
              </View>
            )}
          </View>
          
          {/* Time Row */}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#1A2533" />
            <Text style={styles.queueTime}>{item.time}</Text>
            <Text style={styles.duration}>({item.duration})</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons 
              name={item.location_type === 'on_location' ? "car-outline" : "storefront-outline"} 
              size={14} 
              color="#4B5563" 
            />
            <Text style={styles.queueLocation}>
              {item.location_type === 'on_location' ? 'Client Location' : 'Shop Location'}
            </Text>
            {item.location_type === 'on_location' && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>On-Location</Text>
              </View>
            )}
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color="#1A2533" />
            <Text style={styles.queuePrice}>${item.price}</Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {renderActionButtons(item)}
      </TouchableOpacity>
    );
  }, [getStatusBadgeStyle, renderActionButtons]);

  // Render filter chips with honey theme
  const renderFilterChips = useCallback(() => {
    const counts = getFilterCounts();
    
    return (
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterOptions.map((filter) => {
            const count = counts[filter.key];
            const isSelected = selectedFilter === filter.key;
            const isLocked = !isPremium && filter.key !== 'all';
            
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                  isLocked && styles.filterChipLocked,
                ]}
                onPress={() => handleFilterSelect(filter.key)}
              >
                <View style={styles.filterChipContent}>
                  <Ionicons 
                    name={filter.icon} 
                    size={16} 
                    color={isSelected ? '#FFFFFF' : isLocked ? '#9CA3AF' : '#1A2533'} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                    isLocked && styles.filterChipTextLocked,
                  ]}>
                    {filter.label}
                    {isLocked && ' 🔒'}
                  </Text>
                  {count > 0 && (
                    <View style={[
                      styles.filterChipBadge,
                      isSelected && styles.filterChipBadgeSelected,
                      isLocked && styles.filterChipBadgeLocked,
                    ]}>
                      <Text style={[
                        styles.filterChipBadgeText,
                        isSelected && styles.filterChipBadgeTextSelected,
                        isLocked && styles.filterChipBadgeTextLocked,
                      ]}>
                        {count}
                      </Text>
                    </View>
                  )}
                  {isLocked && (
                    <Ionicons 
                      name="lock-closed" 
                      size={12} 
                      color="#9CA3AF" 
                      style={styles.lockIcon}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [getFilterCounts, selectedFilter, isPremium, handleFilterSelect]);

  // Render filter restriction notice for free users
  const renderFilterRestrictionNotice = useCallback(() => {
    if (isPremium) return null;

    return (
      <View style={styles.restrictionNotice}>
        <View style={styles.restrictionContent}>
          <Ionicons name="filter-outline" size={16} color="#1A2533" />
          <Text style={styles.restrictionText}>
            Status filtering is available with Premium
          </Text>
          <TouchableOpacity 
            style={styles.upgradeButtonSmall}
            onPress={() => setShowUpgradeModal(true)}
          >
            <Text style={styles.upgradeButtonSmallText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isPremium]);

  // Render premium upgrade prompt
  const renderPremiumPrompt = useCallback(() => {
    if (isPremium || hiddenItemsCount === 0) return null;

    return (
      <View style={styles.premiumPrompt}>
        <View style={styles.premiumPromptContent}>
          <Ionicons name="lock-closed" size={20} color="#1A2533" />
          <Text style={styles.premiumPromptText}>
            {hiddenItemsCount} more booking{hiddenItemsCount !== 1 ? 's' : ''} available
          </Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => setShowUpgradeModal(true)}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isPremium, hiddenItemsCount]);

  // Empty state
  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={64} color="#E5E7EB" />
        <Text style={styles.emptyStateTitle}>No bookings found</Text>
        <Text style={styles.emptyStateSubtitle}>
          {selectedFilter === 'all' 
            ? "You don't have any bookings yet" 
            : `No ${selectedFilter} bookings found`
          }
        </Text>
      </View>
    );
  }, [selectedFilter]);

  // Payment render functions
  const renderPaymentItem = useCallback(({ item }: { item: Payment }) => (
    <TouchableOpacity 
      style={[
        styles.paymentItem, 
        item.payment_status === 'paid' && styles.paidPaymentItem
      ]}
      onPress={() => {
        Alert.alert(
          'Payment Details',
          `Service: ${item.service_title}\nClient: ${item.client_name}\nAmount: $${item.amount}\nStatus: ${item.payment_status?.toUpperCase()}`
        );
      }}
    >
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentService}>{item.service_title}</Text>
          <Text style={styles.paymentClient}>{item.client_name}</Text>
          <Text style={styles.paymentDate}>
            {new Date(item.service_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.paymentAmount}>
          <Text style={[
            styles.paymentAmountText,
            item.payment_status === 'paid' && styles.paidAmountText
          ]}>
            ${item.amount?.toFixed(2)}
          </Text>
          <View style={[
            styles.paymentStatusBadge,
            item.payment_status === 'paid' && styles.paidStatusBadge
          ]}>
            <Text style={[
              styles.paymentStatusText,
              item.payment_status === 'paid' && styles.paidStatusText
            ]}>
              {item.payment_status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      {item.payment_status === 'pending' && (
        <TouchableOpacity
          style={styles.markPaidButton}
          onPress={async () => {
            try {
              if (item.id) {
                const response = await normalizedShopService.updatePaymentStatus(item.id, 'paid');
                if (response.success) {
                  Alert.alert('Success', `Payment for ${item.client_name} marked as paid`);
                  await loadPayments();
                } else {
                  Alert.alert('Error', 'Failed to update payment status');
                }
              }
            } catch (error) {
              console.error('Error updating payment:', error);
              Alert.alert('Error', 'Failed to update payment');
            }
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
          <Text style={styles.markPaidText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  ), [loadPayments]);

  const renderEmptyPayments = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="card-outline" 
        size={64} 
        color="#E5E7EB" 
      />
      <Text style={styles.emptyStateTitle}>
        No {paymentStatusTab} payments
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {paymentStatusTab === 'pending' 
          ? 'Payments will appear here when jobs are completed.'
          : 'Paid payments will appear here once clients make payments.'
        }
      </Text>
    </View>
  ), [paymentStatusTab]);

  // Main tab navigation
  const renderMainTabs = useCallback(() => (
    <View style={styles.mainTabContainer}>
      <TouchableOpacity
        style={[styles.mainTab, activeTab === 'queue' && styles.activeMainTab]}
        onPress={() => setActiveTab('queue')}
      >
        <View style={styles.mainTabContent}>
          <Ionicons 
            name={activeTab === 'queue' ? 'list' : 'list-outline'} 
            size={20} 
            color={activeTab === 'queue' ? '#1A2533' : '#6B7280'} 
          />
          <Text style={[
            styles.mainTabText,
            activeTab === 'queue' && styles.activeMainTabText
          ]}>
            Service Queue
          </Text>
          {queueStats.totalBookings > 0 && (
            <View style={styles.mainTabBadge}>
              <Text style={styles.mainTabBadgeText}>{queueStats.totalBookings}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mainTab, activeTab === 'payments' && styles.activeMainTab]}
        onPress={() => setActiveTab('payments')}
      >
        <View style={styles.mainTabContent}>
          <Ionicons 
            name={activeTab === 'payments' ? 'card' : 'card-outline'} 
            size={20} 
            color={activeTab === 'payments' ? '#1A2533' : '#6B7280'} 
          />
          <Text style={[
            styles.mainTabText,
            activeTab === 'payments' && styles.activeMainTabText
          ]}>
            Payments
          </Text>
          {pendingPayments.length > 0 && (
            <View style={styles.mainTabBadge}>
              <Text style={styles.mainTabBadgeText}>{pendingPayments.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  ), [activeTab, queueStats.totalBookings, pendingPayments.length]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
      
      <CancellationBanner />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'queue' ? 'Service Queue' : 'Payment Management'}
        </Text>
        <View style={styles.headerRight}>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#1A2533" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={24} color="#1A2533" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tabs */}
      {renderMainTabs()}

      {activeTab === 'queue' ? (
        <>
          {/* Filters */}
          {renderFilterChips()}

          {/* Filter Restriction Notice */}
          {renderFilterRestrictionNotice()}

          {/* Premium Prompt */}
          {renderPremiumPrompt()}
        </>
      ) : (
        <>
          {/* Payment Status Sub-tabs */}
          <View style={styles.paymentSubTabs}>
            <TouchableOpacity
              style={[styles.subTab, paymentStatusTab === 'pending' && styles.activeSubTab]}
              onPress={() => setPaymentStatusTab('pending')}
            >
              <Text style={[
                styles.subTabText, 
                paymentStatusTab === 'pending' && styles.activeSubTabText
              ]}>
                Pending ({pendingPayments.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, paymentStatusTab === 'paid' && styles.activeSubTab]}
              onPress={() => setPaymentStatusTab('paid')}
            >
              <Text style={[
                styles.subTabText, 
                paymentStatusTab === 'paid' && styles.activeSubTabText
              ]}>
                Paid ({paidPayments.length})
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Content */}
      {activeTab === 'queue' ? (
        // Queue List
        isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading your bookings...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.queueList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#1A2533']}
                tintColor="#1A2533"
              />
            }
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        // Payment List
        isLoadingPayments ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading payments...</Text>
          </View>
        ) : (
          <FlatList
            data={paymentStatusTab === 'pending' ? pendingPayments : paidPayments}
            renderItem={renderPaymentItem}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.queueList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#1A2533']}
                tintColor="#1A2533"
              />
            }
            ListEmptyComponent={renderEmptyPayments}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* UpgradeModal Integration */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradeToPremium}
        title="Unlock Advanced Filtering"
        subtitle="Get access to status filters, unlimited bookings view, and premium queue management features"
        features={queueUpgradeFeatures}
        hiddenCount={hiddenItemsCount}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F0FFFE', // Changed to match background color
    // Removed border line
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
  },

  // Main Tab Styles
  mainTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainTab: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeMainTab: {
    backgroundColor: '#F5F5E9',
  },
  mainTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeMainTabText: {
    color: '#1A2533',
    fontWeight: '600',
  },
  mainTabBadge: {
    backgroundColor: '#1A2533',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  mainTabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Payment Sub-tabs Styles
  paymentSubTabs: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeSubTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeSubTabText: {
    color: '#1A2533',
    fontWeight: '600',
  },
  
  // Filter Styles
  filterContainer: {
    backgroundColor: '#F0FFFE', // Changed to match background color
    paddingVertical: 12,
    // Removed border line
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F5F5E9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  filterChipSelected: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  filterChipLocked: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.7,
  },
  filterChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterChipTextLocked: {
    color: '#9CA3AF',
  },
  filterChipBadge: {
    backgroundColor: '#1A2533',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipBadgeSelected: {
    backgroundColor: '#FFFFFF',
  },
  filterChipBadgeLocked: {
    backgroundColor: '#E5E7EB',
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterChipBadgeTextSelected: {
    color: '#1A2533',
  },
  filterChipBadgeTextLocked: {
    color: '#9CA3AF',
  },
  lockIcon: {
    marginLeft: 4,
  },

  // Premium Prompt
  premiumPrompt: {
    backgroundColor: '#F5F5E9',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  premiumPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumPromptText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  upgradeButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Queue List
  queueList: {
    padding: 16,
  },
  queueItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  queueTitleContainer: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 14,
    color: '#4B5563',
  },
  serviceOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  serviceOptionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  serviceOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
  serviceOptionPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Status Badge Styles with Honey Theme
  pendingBadge: { backgroundColor: '#F5F5E9' },
  pendingText: { color: '#92400E' },
  confirmedBadge: { backgroundColor: '#EFF6FF' },
  confirmedText: { color: '#2563EB' },
  inProgressBadge: { backgroundColor: '#F3E8FF' },
  inProgressText: { color: '#7C3AED' },
  completedBadge: { backgroundColor: '#10B981', borderWidth: 1, borderColor: '#059669' },
  completedText: { color: '#FFFFFF', fontWeight: '600' },
  cancelledBadge: { backgroundColor: '#FEE2E2' },
  cancelledText: { color: '#DC2626' },
  noShowBadge: { backgroundColor: '#F3F4F6' },
  noShowText: { color: '#4B5563' },

  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  bookingId: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  queueDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateRow: {
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  queueDate: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  upcomingDate: {
    color: '#059669',
    fontWeight: '700',
  },
  upcomingBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  queueTime: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  duration: {
    fontSize: 12,
    color: '#4B5563',
  },
  queueLocation: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  locationBadge: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  queuePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  notesContainer: {
    backgroundColor: '#F0FFFE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },

  // Action Buttons with Honey Theme
  queueActions: {
    gap: 12,
  },
  communicationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  communicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  communicationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2533',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  urgentAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2533',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  completedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  sendInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sendInvoiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  invoiceSentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  invoiceSentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  statusIndicatorButton: {
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  statusIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  loadingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#1A2533',
  },
  invoiceSentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  invoiceSentIndicatorText: {
    fontSize: 12,
    color: '#10B981',
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Filter Restriction Notice Styles
  restrictionNotice: {
    backgroundColor: '#F5F5E9',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  restrictionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restrictionText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    marginLeft: 8,
    marginRight: 8,
  },
  upgradeButtonSmall: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upgradeButtonSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Completed date styles
  completedDate: {
    color: '#10B981',
    fontWeight: '600',
  },
  completedDateBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completedDateBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Payment Item Styles
  paymentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paidPaymentItem: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentClient: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  paymentAmountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  paidAmountText: {
    color: '#10B981',
  },
  paymentStatusBadge: {
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  paidStatusBadge: {
    backgroundColor: '#10B981',
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  paidStatusText: {
    color: '#FFFFFF',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  markPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
});

export default ServiceQueueScreen;