import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { normalizedShopService } from '../../lib/supabase/normalized';
import { useAccount, useAuth } from '../../navigation/AppNavigator';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  status: 'active' | 'inactive';
  joinDate: string;
  selected?: boolean;
}

interface PromotionData {
  type: 'email' | 'sms';
  subject: string;
  message: string;
  customerIds: string[];
}

interface NewCustomerData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

const CustomersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { userProfile } = useAccount();
  const { user } = useAuth();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionData, setPromotionData] = useState<PromotionData>({
    type: 'email',
    subject: '',
    message: '',
    customerIds: []
  });
  const [isSendingPromotion, setIsSendingPromotion] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [pressedCustomerId, setPressedCustomerId] = useState<string | null>(null);

  // Mock data for now - replace with real API call
  const mockCustomers: Customer[] = [
    {
      id: '1',
      name: 'Anna Andersson',
      email: 'anna.andersson@email.com',
      phone: '+46701234567',
      totalBookings: 8,
      totalSpent: 2400,
      lastBooking: '2025-08-03',
      status: 'active',
      joinDate: '2024-06-15',
    },
    {
      id: '2',
      name: 'Erik Johansson',
      email: 'erik.johansson@email.com',
      phone: '+46702345678',
      totalBookings: 12,
      totalSpent: 3600,
      lastBooking: '2025-08-01',
      status: 'active',
      joinDate: '2024-04-20',
    },
    {
      id: '3',
      name: 'Maria Garcia',
      email: 'maria.garcia@email.com',
      phone: '+46703456789',
      totalBookings: 5,
      totalSpent: 1500,
      lastBooking: '2025-07-28',
      status: 'active',
      joinDate: '2024-08-10',
    },
    {
      id: '4',
      name: 'David Wilson',
      email: 'david.wilson@email.com',
      phone: '+46704567890',
      totalBookings: 3,
      totalSpent: 900,
      lastBooking: '2025-06-15',
      status: 'inactive',
      joinDate: '2024-05-05',
    },
    {
      id: '5',
      name: 'Lisa Chen',
      email: 'lisa.chen@email.com',
      phone: '+46705678901',
      totalBookings: 15,
      totalSpent: 4500,
      lastBooking: '2025-08-04',
      status: 'active',
      joinDate: '2024-03-12',
    },
  ];

  // Load customers data from real bookings
  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📋 Loading real customer data from bookings...');
      
      const userId = user?.id || userProfile?.id;
      if (!userId) {
        console.warn('⚠️ No authenticated user found');
        setCustomers([]);
        setFilteredCustomers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      
      // Get provider bookings to extract customer data
      console.log('📋 Fetching provider bookings for user:', userId);
      
      // Use direct database query
      const { data: bookings, error } = await supabase
        .from('shop_bookings')
        .select('*')
        .eq('provider_id', userId)
        .order('booking_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching bookings:', error);
        throw new Error(`Failed to fetch bookings: ${error.message}`);
      }
      
      const response = { success: true, data: bookings };
      
      if (response.success && response.data) {
        const bookings = response.data;
        console.log('📋 Found', bookings.length, 'bookings to extract customers from');
        
        // Debug: Check first booking structure
        if (bookings.length > 0) {
          console.log('🔍 Sample booking data:', JSON.stringify(bookings[0], null, 2));
          console.log('🔍 Available fields:', Object.keys(bookings[0]));
          console.log('🔍 customer_name field:', bookings[0].customer_name);
          console.log('🔍 customer_id field:', bookings[0].customer_id);
        }
        
        // Create customer map to aggregate data
        const customerMap = new Map<string, Customer>();
        
        // Get unique customer IDs to fetch real names
        const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))];
        console.log('📋 Found unique customer IDs:', customerIds);
        
        // Fetch customer profiles for real names
        const customerProfiles = new Map();
        if (customerIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, first_name, last_name')
            .in('user_id', customerIds);
          
          if (!profileError && profiles) {
            profiles.forEach(profile => {
              const fullName = profile.full_name || 
                             (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : '') ||
                             profile.first_name || '';
              customerProfiles.set(profile.user_id, fullName);
            });
            console.log('📋 Fetched customer profiles:', customerProfiles.size);
          }
        }

        bookings.forEach(booking => {
          // Use customer_id as primary identifier, fallback to phone/email
          const customerId = booking.customer_id || booking.customer_phone || booking.customer_email || `customer_${booking.id}`;
          
          if (!customerMap.has(customerId)) {
            // Get real customer name from profile data
            const realCustomerName = booking.customer_id ? customerProfiles.get(booking.customer_id) : null;
            
            // Create new customer entry
            customerMap.set(customerId, {
              id: customerId,
              name: realCustomerName || booking.customer_name || 'Unknown Customer',
              email: booking.customer_email || '',
              phone: booking.customer_phone || '',
              totalBookings: 0,
              totalSpent: 0,
              lastBooking: booking.booking_date,
              status: 'active',
              joinDate: booking.booking_date, // Use first booking as join date
            });
          }
          
          const customer = customerMap.get(customerId)!;
          
          // Update customer statistics
          customer.totalBookings += 1;
          
          // Add to total spent (all bookings since payment_status doesn't exist)
          customer.totalSpent += booking.total_price || 0;
          
          // Update last booking date if this booking is more recent
          if (new Date(booking.booking_date) > new Date(customer.lastBooking)) {
            customer.lastBooking = booking.booking_date;
          }
          
          // Update join date if this booking is earlier
          if (new Date(booking.booking_date) < new Date(customer.joinDate)) {
            customer.joinDate = booking.booking_date;
          }
        });
        
        const realCustomers = Array.from(customerMap.values());
        console.log('👥 Extracted', realCustomers.length, 'unique customers');
        
        setCustomers(realCustomers);
        setFilteredCustomers(realCustomers);
      } else {
        console.log('❌ Failed to load bookings:', response.error);
        // Fallback to empty array instead of mock data
        setCustomers([]);
        setFilteredCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
      // Fallback to empty array instead of mock data
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, userProfile?.id]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Filter customers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
      
      // Clean up selections for customers that are no longer visible
      const visibleIds = new Set(filtered.map(c => c.id));
      setSelectedCustomers(prev => {
        const newSet = new Set();
        prev.forEach(id => {
          if (visibleIds.has(id)) {
            newSet.add(id);
          }
        });
        return newSet;
      });
    }
  }, [searchQuery, customers]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCustomers();
  }, [loadCustomers]);

  const toggleCustomerSelection = useCallback((customerId: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  }, []);

  const selectAllCustomers = useCallback(() => {
    // Only select from currently filtered/visible customers
    const allIds = new Set(filteredCustomers.map(c => c.id));
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      allIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [filteredCustomers]);

  const deselectAllCustomers = useCallback(() => {
    // Only deselect from currently filtered/visible customers
    const visibleIds = new Set(filteredCustomers.map(c => c.id));
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      visibleIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, [filteredCustomers]);

  const handleSendPromotion = useCallback(() => {
    if (selectedCustomers.size === 0) {
      Alert.alert(
        'No Customers Selected', 
        'Please select at least one customer to send promotions.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // Validate that selected customers still exist (in case data changed)
    const validSelectedIds = Array.from(selectedCustomers).filter(id => 
      customers.some(customer => customer.id === id)
    );
    
    if (validSelectedIds.length === 0) {
      Alert.alert(
        'Invalid Selection',
        'The selected customers are no longer available. Please select again.',
        [{ 
          text: 'OK', 
          style: 'default',
          onPress: () => setSelectedCustomers(new Set())
        }]
      );
      return;
    }
    
    setPromotionData({
      type: 'email',
      subject: '',
      message: '',
      customerIds: validSelectedIds
    });
    setShowPromotionModal(true);
  }, [selectedCustomers, customers]);

  const handleAddCustomer = useCallback(() => {
    setNewCustomerData({
      name: '',
      email: '',
      phone: '',
      notes: ''
    });
    setShowAddCustomerModal(true);
  }, []);

  const createCustomer = useCallback(async () => {
    // Validate required fields
    if (!newCustomerData.name.trim()) {
      Alert.alert('Validation Error', 'Customer name is required.');
      return;
    }
    
    if (!newCustomerData.email.trim()) {
      Alert.alert('Validation Error', 'Customer email is required.');
      return;
    }
    
    if (!newCustomerData.phone.trim()) {
      Alert.alert('Validation Error', 'Customer phone is required.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomerData.email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsCreatingCustomer(true);
      
      // Save customer to Supabase database
      const response = await normalizedShopService.createCustomer({
        email: newCustomerData.email.trim(),
        full_name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim(),
        user_type: 'customer',
        account_type: 'consumer',
        notes: newCustomerData.notes?.trim() || '',
        provider_id: userProfile?.id
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create customer');
      }
      
      // Create new customer object for local state using real DB data
      const newCustomer: Customer = {
        id: response.data?.id || Date.now().toString(),
        name: newCustomerData.name.trim(),
        email: newCustomerData.email.trim(),
        phone: newCustomerData.phone.trim(),
        totalBookings: 0,
        totalSpent: 0,
        lastBooking: new Date().toISOString(),
        status: 'active',
        joinDate: response.data?.created_at || new Date().toISOString()
      };
      
      // Add to customers list
      setCustomers(prev => [newCustomer, ...prev]);
      setFilteredCustomers(prev => [newCustomer, ...prev]);
      
      Alert.alert(
        'Success!',
        `${newCustomerData.name} has been added as a new customer.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            setShowAddCustomerModal(false);
            setNewCustomerData({
              name: '',
              email: '',
              phone: '',
              notes: ''
            });
          }
        }]
      );
      
    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', 'Failed to create customer. Please try again.');
    } finally {
      setIsCreatingCustomer(false);
    }
  }, [newCustomerData, userProfile?.id]);

  const sendPromotionToCustomers = useCallback(async () => {
    if (!promotionData.subject.trim() || !promotionData.message.trim()) {
      Alert.alert('Missing Information', 'Please fill in both subject and message.');
      return;
    }

    try {
      setIsSendingPromotion(true);
      
      // Get selected customers data
      const selectedCustomersData = customers.filter(customer => 
        selectedCustomers.has(customer.id)
      );

      // Prepare provider info
      const providerInfo = {
        id: userProfile?.id,
        name: userProfile?.full_name || userProfile?.first_name || 'Qwiken',
        email: userProfile?.email,
        phone: userProfile?.phone
      };

      let response;
      let successMessage;

      if (promotionData.type === 'email') {
        // Send emails using Supabase Edge Function
        response = await normalizedShopService.sendEmails({
          customers: selectedCustomersData,
          subject: promotionData.subject.trim(),
          message: promotionData.message.trim(),
          providerInfo
        });
        successMessage = `Successfully sent ${response.totalSent || 0} emails`;
        if (response.totalFailed > 0) {
          successMessage += `, ${response.totalFailed} failed`;
        }
      } else {
        // Send SMS using Supabase Edge Function
        response = await normalizedShopService.sendSMS({
          customers: selectedCustomersData,
          message: `${promotionData.subject.trim()}\n\n${promotionData.message.trim()}`,
          providerInfo
        });
        successMessage = `Successfully sent ${response.totalSent || 0} SMS messages`;
        if (response.totalFailed > 0) {
          successMessage += `, ${response.totalFailed} failed`;
        }
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to send promotion');
      }
      
      Alert.alert(
        'Promotion Sent!',
        successMessage,
        [{ text: 'OK', onPress: () => {
          setShowPromotionModal(false);
          setSelectedCustomers(new Set());
          setPromotionData({
            type: 'email',
            subject: '',
            message: '',
            customerIds: []
          });
        }}]
      );
    } catch (error) {
      console.error('Error sending promotion:', error);
      Alert.alert('Error', `Failed to send promotion: ${error.message}`);
    } finally {
      setIsSendingPromotion(false);
    }
  }, [promotionData, selectedCustomers, customers, userProfile]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} kr`;
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => {
    const isSelected = selectedCustomers.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.customerCard, 
          isSelected && styles.selectedCustomerCard,
          pressedCustomerId === item.id && styles.pressedCustomerCard
        ]}
        onPress={() => toggleCustomerSelection(item.id)}
        onPressIn={() => setPressedCustomerId(item.id)}
        onPressOut={() => setPressedCustomerId(null)}
        activeOpacity={0.9}
      >
        {/* Header: Avatar + Name + Status + Selection */}
        <View style={styles.customerHeader}>
          <View style={[styles.customerAvatar, isSelected && styles.selectedAvatar]}>
            <Text style={styles.customerAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.customerMainInfo}>
            <View style={styles.customerTopRow}>
              <Text style={[styles.customerName, isSelected && styles.selectedCustomerName]}>{item.name}</Text>
              <View style={styles.selectionButton}>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={28} color="#059669" />
                ) : (
                  <View style={styles.unselectedCircle} />
                )}
              </View>
            </View>
            
            <View style={[styles.statusBadge, 
              item.status === 'active' ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[styles.statusText,
                item.status === 'active' ? styles.activeText : styles.inactiveText
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={16} color="#1A2533" />
            <Text style={styles.contactText}>{item.email}</Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="call" size={16} color="#1A2533" />
            <Text style={styles.contactText}>{item.phone}</Text>
          </View>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="calendar" size={14} color="#1A2533" />
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <Text style={styles.statValue}>{item.totalBookings}</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="cash" size={14} color="#059669" />
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <Text style={styles.statValue}>{formatCurrency(item.totalSpent)}</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="time" size={14} color="#1A2533" />
              <Text style={styles.statLabel}>Last Booking</Text>
            </View>
            <Text style={styles.statValue}>{formatDate(item.lastBooking)}</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Ionicons name="person" size={14} color="#1A2533" />
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <Text style={styles.statValue}>{formatDate(item.joinDate)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAddCustomerModal = () => (
    <Modal
      visible={showAddCustomerModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddCustomerModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddCustomerModal(false)}>
            <Ionicons name="close" size={24} color="#1A2533" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add New Customer</Text>
          <TouchableOpacity
            onPress={createCustomer}
            disabled={isCreatingCustomer}
          >
            <Text style={[styles.sendButton, isCreatingCustomer && styles.disabledButton]}>
              Create
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Customer Name *</Text>
            <TextInput
              style={styles.textInput}
              value={newCustomerData.name}
              onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, name: text }))}
              placeholder="Enter full name..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              value={newCustomerData.email}
              onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, email: text }))}
              placeholder="Enter email address..."
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              value={newCustomerData.phone}
              onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter phone number..."
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={newCustomerData.notes}
              onChangeText={(text) => setNewCustomerData(prev => ({ ...prev, notes: text }))}
              placeholder="Add any notes about this customer..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.formNote}>
            <Text style={styles.formNoteText}>
              * Required fields
            </Text>
          </View>
        </ScrollView>
        
        {isCreatingCustomer && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Creating customer...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderPromotionModal = () => (
    <Modal
      visible={showPromotionModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPromotionModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPromotionModal(false)}>
            <Ionicons name="close" size={24} color="#1A2533" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Send Promotion</Text>
          <TouchableOpacity
            onPress={sendPromotionToCustomers}
            disabled={isSendingPromotion}
          >
            <Text style={[styles.sendButton, isSendingPromotion && styles.disabledButton]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.promotionTypeSection}>
            <Text style={styles.sectionTitle}>Promotion Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, 
                  promotionData.type === 'email' && styles.activeTypeButton
                ]}
                onPress={() => setPromotionData(prev => ({ ...prev, type: 'email' }))}
              >
                <Ionicons name="mail" size={20} color={
                  promotionData.type === 'email' ? '#FFFFFF' : '#1A2533'
                } />
                <Text style={[styles.typeButtonText,
                  promotionData.type === 'email' && styles.activeTypeButtonText
                ]}>
                  Email
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.typeButton,
                  promotionData.type === 'sms' && styles.activeTypeButton
                ]}
                onPress={() => setPromotionData(prev => ({ ...prev, type: 'sms' }))}
              >
                <Ionicons name="chatbubble" size={20} color={
                  promotionData.type === 'sms' ? '#FFFFFF' : '#1A2533'
                } />
                <Text style={[styles.typeButtonText,
                  promotionData.type === 'sms' && styles.activeTypeButtonText
                ]}>
                  SMS
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {promotionData.type === 'email' ? 'Subject' : 'Message Title'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={promotionData.subject}
              onChangeText={(text) => setPromotionData(prev => ({ ...prev, subject: text }))}
              placeholder="Enter subject..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              value={promotionData.message}
              onChangeText={(text) => setPromotionData(prev => ({ ...prev, message: text }))}
              placeholder="Enter your promotion message..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.selectedCustomersSection}>
            <Text style={styles.sectionTitle}>
              Selected Customers ({selectedCustomers.size})
            </Text>
            {selectedCustomers.size === 0 ? (
              <View style={styles.noSelectionContainer}>
                <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                <Text style={styles.noSelectionText}>No customers selected</Text>
                <Text style={styles.noSelectionSubtext}>Go back and select customers to send promotions</Text>
              </View>
            ) : (
              <ScrollView style={styles.selectedCustomersList} showsVerticalScrollIndicator={false}>
                {Array.from(selectedCustomers).map(customerId => {
                  const customer = customers.find(c => c.id === customerId);
                  return customer ? (
                    <View key={customerId} style={styles.selectedCustomerItem}>
                      <View style={styles.selectedCustomerInfo}>
                        <Text style={styles.selectedCustomerName}>{customer.name}</Text>
                        <Text style={styles.selectedCustomerEmail}>{customer.email}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeCustomerButton}
                        onPress={() => toggleCustomerSelection(customer.id)}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </ScrollView>
            )}
          </View>
        </ScrollView>
        
        {isSendingPromotion && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Sending promotion...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1A2533" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customers</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddCustomer}
          >
            <Ionicons name="add" size={24} color="#1A2533" />
          </TouchableOpacity>
        </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Selection Controls */}
      <View style={styles.selectionControls}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedCustomers.size} of {filteredCustomers.length} selected
          </Text>
          {searchQuery.length > 0 && (
            <Text style={styles.filterNote}>
              Showing {filteredCustomers.length} of {customers.length} customers
            </Text>
          )}
        </View>
        <View style={styles.selectionButtons}>
          <TouchableOpacity
            style={[
              styles.selectButton, 
              styles.selectAllButton,
              // Show different state if all visible customers are selected
              selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 && styles.allSelectedButton
            ]}
            onPress={selectAllCustomers}
            disabled={filteredCustomers.length === 0}
          >
            <Ionicons 
              name={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? "checkmark-circle" : "checkbox"} 
              size={16} 
              color={filteredCustomers.length === 0 ? "#9CA3AF" : "#059669"} 
            />
            <Text style={[
              styles.selectButtonText, 
              styles.selectAllText,
              filteredCustomers.length === 0 && styles.disabledText
            ]}>
              {selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? "All Selected" : "Select All"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectButton, styles.clearButton]}
            onPress={deselectAllCustomers}
            disabled={selectedCustomers.size === 0}
          >
            <Ionicons name="close-circle" size={16} color={selectedCustomers.size === 0 ? "#9CA3AF" : "#EF4444"} />
            <Text style={[styles.selectButtonText, styles.clearText, selectedCustomers.size === 0 && styles.disabledText]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id}
        style={styles.customerList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1A2533']}
            tintColor="#1A2533"
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      {/* Send Promotion Button */}
      {selectedCustomers.size > 0 && (
        <View style={styles.promotionButtonContainer}>
          <TouchableOpacity
            style={styles.promotionButton}
            onPress={handleSendPromotion}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.promotionButtonText}>
              Send Promotion to {selectedCustomers.size} customers
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
        {renderAddCustomerModal()}
        {renderPromotionModal()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  safeArea: {
    flex: 1,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0FFFE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0FFFE',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1A2533',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0FFFE',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  selectAllButton: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  clearButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  allSelectedButton: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
  },
  selectAllText: {
    color: '#059669',
  },
  clearText: {
    color: '#EF4444',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  filterNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  customerList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Customer Card Styles
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  selectedCustomerCard: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
    shadowColor: '#059669',
    shadowOpacity: 0.2,
    transform: [{ scale: 1.02 }],
  },
  pressedCustomerCard: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05,
  },

  // Header Section (Avatar + Name + Status + Selection)
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A2533',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedAvatar: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    transform: [{ scale: 1.05 }],
  },
  customerAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customerMainInfo: {
    flex: 1,
  },
  customerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2533',
    flex: 1,
  },
  selectedCustomerName: {
    color: '#059669',
  },
  selectionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeText: {
    color: '#065F46',
  },
  inactiveText: {
    color: '#991B1B',
  },

  // Contact Section
  contactSection: {
    marginBottom: 20,
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 12,
    flex: 1,
  },

  // Statistics Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2533',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2533',
    textAlign: 'center',
  },
  promotionButtonContainer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#F0FFFE',
  },
  promotionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  promotionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  sendButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  promotionTypeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  activeTypeButton: {
    backgroundColor: '#1A2533',
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A2533',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  selectedCustomersSection: {
    marginTop: 12,
  },
  selectedCustomersList: {
    maxHeight: 200,
  },
  selectedCustomerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedCustomerInfo: {
    flex: 1,
  },
  removeCustomerButton: {
    padding: 4,
    marginLeft: 8,
  },
  noSelectionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noSelectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 12,
    textAlign: 'center',
  },
  noSelectionSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  selectedCustomerEmail: {
    fontSize: 12,
    color: '#1A2533',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formNote: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  formNoteText: {
    fontSize: 12,
    color: '#1A2533',
    fontStyle: 'italic',
  },
});

export default CustomersScreen;