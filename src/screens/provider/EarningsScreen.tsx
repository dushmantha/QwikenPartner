import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import the UpgradeModal component
import UpgradeModal from '../../components/UpgradeModal'; // Adjust the import path as needed
// Import Supabase service
import { normalizedShopService } from '../../lib/supabase/normalized';
import { useAuth } from '../../navigation/AppNavigator';
import { usePremium } from '../../contexts/PremiumContext';
import { CancellationBanner } from '../../components/CancellationBanner';
import { shouldUseMockData, logMockUsage } from '../../config/devConfig';
import { getMockBookings } from '../../data/mockData';

const { width, height } = Dimensions.get('window');

const EarningsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // API data states
  const [earningsData, setEarningsData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track where upgrade was triggered from
  const [upgradeSource, setUpgradeSource] = useState('general');
  
  // Helper function to convert mock bookings to payments/earnings data
  const getMockPaymentsFromBookings = () => {
    const mockBookings = getMockBookings();
    
    // Convert bookings to payments - treat confirmed as paid (completed services), pending as pending payments
    const mockPayments = mockBookings.map(booking => ({
      id: booking.id,
      booking_id: booking.id,
      client_name: ['Sarah Williams', 'Emma Thompson', 'John Miller', 'Maria Garcia', 'David Chen'][Math.floor(Math.random() * 5)],
      service_title: Array.isArray(booking.serviceNames) ? booking.serviceNames[0] : booking.serviceNames,
      service_type: 'Beauty Service',
      amount: booking.totalPrice,
      service_date: booking.bookingDate,
      booking_date: booking.createdAt,
      // Treat 'confirmed' bookings as 'paid' (completed services) for earnings calculation
      payment_status: booking.status === 'confirmed' ? 'paid' : 'pending',
      payment_method: 'card',
      location: booking.shopName || 'Shop Location',
      duration: '60 min',
      notes: booking.notes || ''
    }));
    
    return mockPayments;
  };
  
  // Helper function to get date ranges
  const getDateRange = (period) => {
    const now = new Date();
    const startDate = new Date();
    let endDate = new Date();
    
    switch (period) {
      case 'week':
        const dayOfWeek = now.getDay() || 7;
        startDate.setDate(now.getDate() - dayOfWeek + 1);
        startDate.setHours(0, 0, 0, 0);
        // End of week
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        // End of month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        // End of year
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      default:
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        // End of month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Real API functions connected to Supabase
  const fetchEarningsData = async (period) => {
    try {
      const { startDate, endDate } = getDateRange(period);
      
      console.log('🔄 Fetching earnings data for period:', period, 'from', startDate, 'to', endDate);
      console.log('🔄 User ID:', user?.id);
      
      // Use mock data if enabled
      if (shouldUseMockData('MOCK_PAYMENTS')) {
        console.log('🎭 Using mock earnings data');
        logMockUsage('Loading mock earnings data');
        
        const mockPayments = getMockPaymentsFromBookings();
        console.log('💰 Mock payments data:', mockPayments.length, 'payments');
        
        // Filter paid payments for earnings calculation
        const paidPayments = mockPayments.filter(p => p.payment_status === 'paid');
        const pendingPayments = mockPayments.filter(p => p.payment_status === 'pending');
        
        // Calculate totals
        const totalForPeriod = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const thisMonthTotal = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const thisWeekTotal = paidPayments.slice(0, 3).reduce((sum, payment) => sum + payment.amount, 0); // Mock recent week data
        const pendingTotal = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        console.log('💵 Mock totals - Period:', totalForPeriod, 'Month:', thisMonthTotal, 'Week:', thisWeekTotal, 'Pending:', pendingTotal);
        
        setEarningsData({
          total: totalForPeriod,
          thisMonth: thisMonthTotal,
          thisWeek: thisWeekTotal,
          pending: pendingTotal,
          period: period,
          dateRange: { startDate, endDate },
          rawData: mockPayments
        });
        return;
      }
      
      // Get provider earnings from Supabase using getPayments method
      const response = await normalizedShopService.getPayments(undefined, undefined, startDate, endDate);
      
      console.log('📊 Earnings response:', response.success ? 'Success' : 'Failed', response.data ? 'Has data' : 'No data');
      
      if (response.success && response.data) {
        const earningsData = response.data;
        console.log('💰 Raw earnings data:', earningsData);
        
        // Use the payment data directly from response
        const payments = response.data || [];
        console.log('📋 Found', payments.length, 'payments');
        // Debug payment status breakdown
        console.log('📋 Payment status breakdown:', payments.reduce((acc, p) => {
          acc[p.payment_status || 'null'] = (acc[p.payment_status || 'null'] || 0) + 1;
          return acc;
        }, {}));
        
        // Calculate total for selected period
        const paidPayments = payments.filter(p => p.payment_status === 'paid');
        console.log('💰 Paid payments:', paidPayments.length, 'out of', payments.length);
        
        const totalForPeriod = paidPayments.reduce((sum, payment) => {
            const amount = Number(payment.amount) || 0;
            return sum + amount;
          }, 0);
          
        // Calculate this month and this week totals
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Use same week calculation as getDateRange to ensure consistency
        const dayOfWeek = now.getDay() || 7;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const thisMonthTotal = payments
          .filter(p => p.payment_status === 'paid' && new Date(p.service_date || p.booking_date) >= startOfMonth)
          .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
          
        const thisWeekTotal = payments
          .filter(p => p.payment_status === 'paid' && new Date(p.service_date || p.booking_date) >= startOfWeek)
          .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
          
        const pendingTotal = payments
          .filter(p => p.payment_status === 'pending')
          .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
          
        console.log('💵 Week calculation - API date range:', startDate, 'to', endDate);
        console.log('💵 Week calculation - JS startOfWeek:', startOfWeek.toISOString().split('T')[0]);
        console.log('💵 Totals - Period:', totalForPeriod, 'Month:', thisMonthTotal, 'Week:', thisWeekTotal, 'Pending:', pendingTotal);
        
        setEarningsData({
          total: totalForPeriod,
          thisMonth: thisMonthTotal,
          thisWeek: thisWeekTotal,
          pending: pendingTotal,
          period: period,
          dateRange: { startDate, endDate },
          rawData: response.data
        });
      } else {
        console.error('❌ Failed to fetch earnings data:', response.error);
        // Don't set error immediately, try fallback with empty data
        setEarningsData({
          total: 0,
          thisMonth: 0,
          thisWeek: 0,
          pending: 0,
          period: period,
          dateRange: { startDate, endDate },
          rawData: null
        });
      }
    } catch (err) {
      console.error('❌ Error fetching earnings:', err);
      // Set fallback data instead of error
      setEarningsData({
        total: 0,
        thisMonth: 0,
        thisWeek: 0,
        pending: 0,
        period: period,
        dateRange: { startDate: '', endDate: '' },
        rawData: null
      });
    }
  };

  const fetchTransactions = async (period) => {
    try {
      const { startDate, endDate } = getDateRange(period);
      
      console.log('🔄 Fetching transactions for period:', period);
      
      // Use mock data if enabled
      if (shouldUseMockData('MOCK_PAYMENTS')) {
        console.log('🎭 Using mock transaction data');
        logMockUsage('Loading mock transaction data');
        
        const mockPayments = getMockPaymentsFromBookings();
        
        // Transform mock payment data to match expected format
        let transformedTransactions = mockPayments.map(payment => ({
          id: payment.id,
          client: payment.client_name,
          service: payment.service_title,
          amount: payment.amount,
          date: payment.service_date,
          status: payment.payment_status === 'paid' ? 'completed' : 'pending',
          category: payment.service_type?.toLowerCase() || 'beauty',
          bookingId: payment.booking_id,
          paymentMethod: payment.payment_method,
          location: payment.location,
          duration: payment.duration,
          notes: payment.notes
        }));
        
        // Sort by date (newest first)
        transformedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('✅ Mock transactions loaded:', transformedTransactions.length);
        setTransactions(transformedTransactions);
        return;
      }
      
      // Get all payments from Supabase
      const response = await normalizedShopService.getPayments(undefined, undefined, startDate, endDate);
      
      console.log('📄 Transactions response:', response.success ? 'Success' : 'Failed', response.data?.length || 0, 'transactions');
      
      if (response.success && response.data && response.data.length > 0) {
        // Transform Supabase payment data to match expected format
        let transformedTransactions = response.data.map(payment => ({
          id: payment.id,
          client: payment.client_name || 'Unknown Client',
          service: payment.service_title || 'Service',
          amount: Number(payment.amount) || 0,
          date: payment.service_date || payment.booking_date,
          status: payment.payment_status === 'paid' ? 'completed' : 'pending',
          category: payment.service_type?.toLowerCase() || 'other',
          bookingId: payment.booking_id,
          paymentMethod: payment.payment_method,
          location: payment.location,
          duration: payment.duration,
          notes: payment.notes
        }));
        
        
        // Sort by date (newest first)
        transformedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('✅ Transformed transactions:', transformedTransactions.length);
        setTransactions(transformedTransactions);
      } else {
        console.log('📄 No transactions found or error:', response.error);
        setTransactions([]);
      }
    } catch (err) {
      console.error('❌ Error fetching transactions:', err);
      setTransactions([]);
    }
  };

  const fetchMonthlyData = async (period) => {
    try {
      console.log('🔄 Fetching monthly breakdown data for period:', period);
      
      // Use mock data if enabled
      if (shouldUseMockData('MOCK_PAYMENTS')) {
        console.log('🎭 Using mock monthly breakdown data');
        logMockUsage('Loading mock monthly breakdown data');
        
        const mockPayments = getMockPaymentsFromBookings();
        const payments = mockPayments.filter(p => p.payment_status === 'paid');
        
        console.log('💰 Mock paid payments for breakdown:', payments.length);
        
        let groupedData = [];
        
        if (period === 'week') {
          // Create weekly breakdown with mock data
          groupedData = [
            { id: 'week-1', month: 'This Week', amount: 1240, jobs: 8, status: 'completed', date: new Date().toISOString().split('T')[0] },
            { id: 'week-2', month: 'Last Week', amount: 965, jobs: 6, status: 'completed', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
          ];
        } else if (period === 'month') {
          // Create monthly breakdown with mock data
          groupedData = [
            { id: 'month-1', month: 'December 2024', amount: 4850, jobs: 32, status: 'completed', date: '2024-12-01' },
            { id: 'month-2', month: 'November 2024', amount: 3920, jobs: 28, status: 'completed', date: '2024-11-01' },
            { id: 'month-3', month: 'October 2024', amount: 4180, jobs: 30, status: 'completed', date: '2024-10-01' }
          ];
        } else {
          // Year view
          groupedData = [
            { id: 'year-1', month: '2024', amount: 52840, jobs: 365, status: 'completed', date: '2024-01-01' },
            { id: 'year-2', month: '2023', amount: 48200, jobs: 340, status: 'completed', date: '2023-01-01' }
          ];
        }
        
        console.log('📊 Mock grouped data:', groupedData.length, 'items');
        setMonthlyData(groupedData);
        setLoading(false);
        return;
      }
      
      // Get all payments for the provider
      const response = await normalizedShopService.getPayments();
      
      console.log('📊 Monthly data response:', response.success ? 'Success' : 'Failed', response.data?.length || 0, 'payments');
      
      if (response.success && response.data && response.data.length > 0) {
        console.log('📊 All monthly payments:', response.data.length);
        console.log('📊 Monthly payment statuses:', response.data.reduce((acc, p) => {
          acc[p.payment_status || 'null'] = (acc[p.payment_status || 'null'] || 0) + 1;
          return acc;
        }, {}));
        
        const payments = response.data.filter(p => p.payment_status === 'paid');
        console.log('💰 Paid payments for breakdown:', payments.length);
        
        // Also check for payments with any payment status (for debugging)
        const paymentsWithStatus = response.data.filter(p => p.payment_status);
        console.log('💰 Payments with any status:', paymentsWithStatus.length);
        
        let groupedData = [];
        
        if (period === 'week') {
          // Create some sample data for week view if no real data
          if (payments.length === 0) {
            groupedData = [
              { id: 'sample-1', month: 'Today', amount: 0, jobs: 0, status: 'completed', date: new Date().toISOString().split('T')[0] }
            ];
          } else {
            // Group by days for the week view
            const today = new Date();
            const dailyData = {};
            
            // Initialize last 7 days
            for (let i = 6; i >= 0; i--) {
              const date = new Date(today);
              date.setDate(today.getDate() - i);
              const dateStr = date.toISOString().split('T')[0];
              dailyData[dateStr] = { amount: 0, jobs: 0, date: dateStr };
            }
            
            // Group payments by day
            payments.forEach(payment => {
              const paymentDate = payment.service_date || payment.booking_date;
              if (dailyData[paymentDate]) {
                dailyData[paymentDate].amount += Number(payment.amount) || 0;
                dailyData[paymentDate].jobs += 1;
              }
            });
            
            groupedData = Object.values(dailyData)
              .filter(day => day.amount > 0 || day.jobs > 0)
              .map((day, index) => ({
                id: `day-${index}`,
                month: formatDateLabel(day.date),
                amount: day.amount,
                jobs: day.jobs,
                status: 'completed',
                date: day.date
              }));
          }
            
        } else if (period === 'month') {
          // Show current month data or sample
          if (payments.length === 0) {
            groupedData = [
              { id: 'sample-1', month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), amount: 0, jobs: 0, status: 'completed', date: new Date().toISOString().split('T')[0] }
            ];
          } else {
            // Group by weeks for the month view
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const monthlyPayments = payments.filter(payment => {
              const paymentDate = new Date(payment.service_date || payment.booking_date);
              return paymentDate.getMonth() === currentMonth && 
                     paymentDate.getFullYear() === currentYear;
            });
            
            if (monthlyPayments.length > 0) {
              const weeklyData = {};
              monthlyPayments.forEach(payment => {
                const paymentDate = new Date(payment.service_date || payment.booking_date);
                const weekStart = getWeekStart(paymentDate);
                const weekKey = weekStart.toISOString().split('T')[0];
                
                if (!weeklyData[weekKey]) {
                  weeklyData[weekKey] = { amount: 0, jobs: 0, date: weekKey };
                }
                
                weeklyData[weekKey].amount += Number(payment.amount) || 0;
                weeklyData[weekKey].jobs += 1;
              });
              
              groupedData = Object.values(weeklyData).map((week, index) => ({
                id: `week-${index}`,
                month: `Week of ${new Date(week.date).toLocaleDateString()}`,
                amount: week.amount,
                jobs: week.jobs,
                status: 'completed',
                date: week.date
              }));
            } else {
              groupedData = [
                { id: 'sample-1', month: 'This Month', amount: 0, jobs: 0, status: 'completed', date: new Date().toISOString().split('T')[0] }
              ];
            }
          }
          
        } else {
          // Year view
          if (payments.length === 0) {
            groupedData = [
              { id: 'sample-1', month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), amount: 0, jobs: 0, status: 'completed', date: new Date().toISOString().split('T')[0] }
            ];
          } else {
            // Group by months for the year view
            const monthlyData = {};
            
            payments.forEach(payment => {
              const paymentDate = new Date(payment.service_date || payment.booking_date);
              const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
              const monthLabel = paymentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              
              if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { amount: 0, jobs: 0, month: monthLabel, date: payment.service_date };
              }
              
              monthlyData[monthKey].amount += Number(payment.amount) || 0;
              monthlyData[monthKey].jobs += 1;
            });
            
            groupedData = Object.values(monthlyData)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((month, index) => ({
                id: `month-${index}`,
                month: month.month,
                amount: month.amount,
                jobs: month.jobs,
                status: 'completed',
                date: month.date
              }));
          }
        }
        
        console.log('📊 Final grouped data:', groupedData.length, 'items');
        setMonthlyData(groupedData);
      } else {
        console.log('📊 No payment data available, using empty state');
        // Set empty state data
        setMonthlyData([
          { id: 'empty-1', month: 'No data available', amount: 0, jobs: 0, status: 'completed', date: new Date().toISOString().split('T')[0] }
        ]);
      }
    } catch (err) {
      console.error('❌ Error fetching monthly data:', err);
      setMonthlyData([
        { id: 'error-1', month: 'Error loading data', amount: 0, jobs: 0, status: 'completed', date: new Date().toISOString().split('T')[0] }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper functions
  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };
  
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Fetch data when component mounts or period changes
  useEffect(() => {
    if (!user?.id) {
      console.log('⚠️ No user available, showing empty state');
      setEarningsData({
        total: 0,
        thisMonth: 0,
        thisWeek: 0,
        pending: 0,
        period: selectedPeriod,
        dateRange: { startDate: '', endDate: '' },
        rawData: null
      });
      setTransactions([]);
      setMonthlyData([
        { id: 'no-user', month: 'No data available', amount: 0, jobs: 0, status: 'completed', date: new Date().toISOString().split('T')[0] }
      ]);
      setLoading(false);
      return;
    }
    
    console.log('🔄 Starting data fetch for user:', user.id, 'period:', selectedPeriod);
    
    const fetchAllData = async () => {
      try {
        await Promise.all([
          fetchEarningsData(selectedPeriod),
          fetchTransactions(selectedPeriod),
          fetchMonthlyData(selectedPeriod)
        ]);
        console.log('✅ All data fetched successfully');
      } catch (error) {
        console.error('❌ Error in fetchAllData:', error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedPeriod, user?.id]);

  // Refresh data when screen comes into focus (e.g., after marking payment as paid)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        console.log('🔄 Screen focused, refreshing earnings data');
        const fetchAllData = async () => {
          try {
            await Promise.all([
              fetchEarningsData(selectedPeriod),
              fetchTransactions(selectedPeriod),
              fetchMonthlyData()
            ]);
          } catch (error) {
            console.error('❌ Error refreshing data on focus:', error);
            setError('Failed to refresh earnings data');
          }
        };
        fetchAllData();
      }
    }, [selectedPeriod, user?.id])
  );

  const periodButtons = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ];


  const getDisplayedTransactions = () => {
    if (!isPremium) {
      return transactions.slice(0, 3);
    }
    return transactions;
  };

  const getDisplayedMonthlyData = () => {
    if (!isPremium) {
      return monthlyData.slice(0, 3);
    }
    return monthlyData;
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };


  const handleUpgradePress = (source = 'general') => {
    setUpgradeSource(source);
    setShowUpgradeModal(true);
  };

  const handleUpgrade = () => {
    console.log('Upgrade initiated from:', upgradeSource);
    // Implement your upgrade logic here
    setShowUpgradeModal(false);
    // You can redirect to payment screen or handle subscription
  };

  const getPeriodDisplayText = () => {
    switch (selectedPeriod) {
      case 'week':
        return 'This week';
      case 'month':
        return 'This month';
      case 'year':
        return 'This year';
      default:
        return 'This period';
    }
  };

  // Get hidden count for upgrade modal
  const getHiddenCount = () => {
    if (upgradeSource === 'transactions') {
      return Math.max(0, transactions.length - 3);
    } else if (upgradeSource === 'monthly') {
      return Math.max(0, monthlyData.length - 3);
    }
    return 0;
  };

  // Get upgrade modal content based on source
  const getUpgradeModalContent = () => {
    const baseFeatures = [
      {
        icon: 'people-outline',
        iconColor: '#3B82F6',
        title: 'Unlimited Customer Requests',
        description: 'View and manage unlimited booking requests from customers without any restrictions'
      },
      {
        icon: 'trending-up-outline',
        iconColor: '#059669',
        title: 'Income Analytics & Reports',
        description: 'Advanced income analysis, earning trends, and detailed financial insights for your business'
      },
      {
        icon: 'document-text-outline',
        iconColor: '#1A2533',
        title: 'Premium Invoices',
        description: 'Professional invoices with custom logo, digital signature, and branded templates'
      },
      {
        icon: 'notifications-outline',
        iconColor: '#8B5CF6',
        title: 'Unlimited Notifications',
        description: 'Access all your notifications, reminders, and important business updates without limits'
      }
    ];

    switch (upgradeSource) {
      case 'filter':
        return {
          title: 'Upgrade for Advanced Filtering',
          subtitle: 'Unlock powerful filtering options to organize your transactions by status, category, and more',
          features: [
            {
              icon: 'filter-outline',
              iconColor: '#EF4444',
              title: 'Advanced Transaction Filtering',
              description: 'Filter by status, category, date range, amount, and custom criteria'
            },
            ...baseFeatures.slice(1)
          ]
        };
      case 'transactions':
        return {
          title: 'See All Your Transactions',
          subtitle: 'Access your complete transaction history without limits',
          features: [
            {
              icon: 'list-outline',
              iconColor: '#8B5CF6',
              title: 'Complete Transaction History',
              description: 'View all your transactions without any restrictions or limits'
            },
            ...baseFeatures
          ]
        };
      case 'monthly':
        return {
          title: 'Complete Monthly Breakdown',
          subtitle: 'Access detailed monthly analytics and historical data',
          features: [
            {
              icon: 'bar-chart-outline',
              iconColor: '#059669',
              title: 'Complete Monthly Analytics',
              description: 'View detailed monthly breakdowns and historical performance data'
            },
            ...baseFeatures
          ]
        };
      default:
        return {
          title: 'Upgrade to Pro',
          subtitle: 'Get unlimited access to all your earnings data and premium features',
          features: baseFeatures
        };
    }
  };


  const renderMonthItem = ({ item, index }) => {
    const isBlurred = !isPremium && index >= 3;
    
    return (
      <View style={[styles.monthItem, isBlurred && styles.blurredItem]}>
        <View style={styles.monthInfo}>
          <Text style={[styles.monthName, isBlurred && styles.blurredText]}>
            {item.month}
          </Text>
          <Text style={[styles.jobCount, isBlurred && styles.blurredText]}>
            {item.jobs} jobs
          </Text>
        </View>
        <Text style={[styles.monthAmount, isBlurred && styles.blurredText]}>
          ${item.amount.toFixed(2)}
        </Text>
        {isBlurred && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={20} color="#1A2533" />
          </View>
        )}
      </View>
    );
  };

  const renderTransactionItem = ({ item, index }) => {
    const isBlurred = !isPremium && index >= 3;
    
    return (
      <View style={[styles.transactionItem, isBlurred && styles.blurredItem]}>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionClient, isBlurred && styles.blurredText]}>
            {item.client}
          </Text>
          <Text style={[styles.transactionService, isBlurred && styles.blurredText]}>
            {item.service}
          </Text>
          <Text style={[styles.transactionDate, isBlurred && styles.blurredText]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[styles.amountText, isBlurred && styles.blurredText]}>
            ${item.amount}
          </Text>
          <View style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.completedBadge : styles.pendingBadge,
            isBlurred && styles.blurredBadge
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'completed' ? styles.completedText : styles.pendingText,
              isBlurred && styles.blurredText
            ]}>
              {item.status === 'completed' ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
        {isBlurred && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color="#1A2533" />
          </View>
        )}
      </View>
    );
  };


  const renderPremiumPrompt = (type) => {
    if (isPremium) return null;
    
    const remainingCount = type === 'transactions' 
      ? Math.max(0, transactions.length - 3)
      : Math.max(0, monthlyData.length - 3);
    
    if (remainingCount <= 0) return null;

    return (
      <TouchableOpacity
        style={styles.premiumPrompt}
        onPress={() => handleUpgradePress(type)}
      >
        <View style={styles.premiumPromptContent}>
          <Ionicons name="lock-closed" size={20} color="#1A2533" />
          <Text style={styles.premiumPromptText}>
            {remainingCount} more {type} available with Premium
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#1A2533" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const upgradeModalContent = getUpgradeModalContent();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
      
      <CancellationBanner />
      
      {/* Updated Header with matching background */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Earnings</Text>
          {!isPremium && (
            <View style={styles.freeUserBadge}>
              <Text style={styles.freeUserText}>Free</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={async () => {
              setLoading(true);
              try {
                await Promise.all([
                  fetchEarningsData(selectedPeriod),
                  fetchTransactions(selectedPeriod),
                  fetchMonthlyData()
                ]);
              } catch (error) {
                console.error('❌ Error refreshing data:', error);
                setError('Failed to refresh earnings data');
              } finally {
                setLoading(false);
              }
            }}
          >
            <Ionicons 
              name="refresh-outline" 
              size={24} 
              color="#10B981" 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => !isPremium && handleUpgradePress('export')}
          >
          <Ionicons 
            name="download-outline" 
            size={24} 
            color={isPremium ? "#10B981" : "#1A2533"} 
          />
          {!isPremium && (
            <Ionicons 
              name="lock-closed" 
              size={12} 
              color="#1A2533" 
              style={styles.lockIcon} 
            />
          )}
        </TouchableOpacity>
      </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Main Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Total Earnings</Text>
          <Text style={styles.earningsAmount}>
            ${earningsData?.total?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.earningsSubtext}>{getPeriodDisplayText()}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statAmount}>${earningsData?.thisMonth || 0}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statAmount}>${earningsData?.thisWeek || 0}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statAmount, styles.pendingAmount]}>
              ${earningsData?.pending || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periodButtons.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.activePeriodButton
              ]}
              onPress={() => handlePeriodChange(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.activePeriodButtonText
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monthly/Period Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedPeriod === 'week' ? 'Daily Breakdown' : 
             selectedPeriod === 'month' ? 'Monthly Breakdown' : 
             'Monthly Breakdown'}
          </Text>
          <FlatList
            data={getDisplayedMonthlyData()}
            renderItem={renderMonthItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
          {renderPremiumPrompt('monthly')}
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>


          <FlatList
            data={getDisplayedTransactions()}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
          {renderPremiumPrompt('transactions')}
        </View>
      </ScrollView>

      {/* Updated UpgradeModal with dynamic content */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        title={upgradeModalContent.title}
        subtitle={upgradeModalContent.subtitle}
        features={upgradeModalContent.features}
        hiddenCount={getHiddenCount()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0FFFE', // Updated to match container background
    // Removed border to create seamless look
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  freeUserBadge: {
    backgroundColor: '#F5F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  freeUserText: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
  },
  exportButton: {
    padding: 8,
    position: 'relative',
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Earnings Styles
  earningsCard: {
    backgroundColor: '#1A2533',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  earningsSubtext: {
    fontSize: 14,
    color: '#F5F5E9',
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  pendingAmount: {
    color: '#F97316',
  },
  statLabel: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  
  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activePeriodButton: {
    backgroundColor: '#1A2533',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  
  // Section Styles
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  
  // Filter Button
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Active Filter Display
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeFilterLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginRight: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginRight: 4,
  },
  
  // Monthly Breakdown
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  monthInfo: {
    flex: 1,
  },
  monthName: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
  jobCount: {
    fontSize: 12,
    color: '#4B5563',
  },
  monthAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  
  // Transaction Styles
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionClient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionService: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  pendingBadge: {
    backgroundColor: '#F5F5E9',
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  completedText: {
    color: '#10B981',
  },
  pendingText: {
    color: '#1A2533',
  },
  
  // Blurred/Locked Items
  blurredItem: {
    opacity: 0.5,
  },
  blurredText: {
    color: '#9CA3AF',
  },
  blurredBadge: {
    backgroundColor: '#F3F4F6',
  },
  lockOverlay: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  
  // Premium Prompt
  premiumPrompt: {
    backgroundColor: '#F5F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  premiumPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPromptText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
    marginHorizontal: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Filter Modal
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: width * 0.85,
    maxHeight: height * 0.7,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterOption: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  lockedFilterOption: {
    backgroundColor: '#F5F5E9',
    borderColor: '#F5F5E9',
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  activeFilterOptionText: {
    color: '#FFFFFF',
  },
  upgradeButton: {
    backgroundColor: '#1A2533',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EarningsScreen;