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
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  Share,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { useAccount } from '../../navigation/AppNavigator';
import { normalizedShopService } from '../../lib/supabase/normalized';
import { useAuth } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');
const chartWidth = width - 52; // Optimized width for better chart positioning

interface IncomeData {
  period: string;
  amount: number;
  bookings: number;
  growth: number;
}

interface CustomerEngagementData {
  newCustomers: number;
  returningCustomers: number;
  totalBookings: number;
  averageBookingValue: number;
  customerSatisfaction: number;
  repeatRate: number;
}

interface MonthlyStats {
  month: string;
  revenue: number;
  customers: number;
  bookings: number;
}

interface ServicePerformance {
  serviceName: string;
  bookings: number;
  revenue: number;
  averageRating: number;
  color: string;
}

interface PeakHours {
  hour: string;
  bookings: number;
}

const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { userProfile } = useAccount();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // Analytics data state
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [customerEngagement, setCustomerEngagement] = useState<CustomerEngagementData>({
    newCustomers: 0,
    returningCustomers: 0,
    totalBookings: 0,
    averageBookingValue: 0,
    customerSatisfaction: 0,
    repeatRate: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [servicePerformance, setServicePerformance] = useState<ServicePerformance[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHours[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch real analytics data from database
  const fetchAnalyticsData = useCallback(async () => {
    console.log('🔍 Analytics Debug - userProfile:', userProfile);
    console.log('🔍 Analytics Debug - userProfile.id:', userProfile?.id);
    console.log('🔍 Analytics Debug - user from auth:', user);
    console.log('🔍 Analytics Debug - user.id:', user?.id);
    console.log('🔍 Analytics Debug - user role:', user?.role);
    console.log('🔍 Analytics Debug - user account_type:', user?.account_type);
    console.log('🔍 Analytics Debug - selectedPeriod:', selectedPeriod);
    
    const userId = user?.id || userProfile?.id;
    if (!userId) {
      console.warn('⚠️ No user available for analytics');
      return null;
    }

    try {
      console.log('📊 Fetching real analytics data for provider:', userId, 'period:', selectedPeriod);
      const response = await normalizedShopService.getAnalyticsData(userId, selectedPeriod);
      
      console.log('🔍 Analytics API response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Analytics data fetched successfully:', response.data);
        return response.data;
      } else {
        console.error('❌ Analytics data fetch failed:', response.error);
        throw new Error(response.error || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      throw error;
    }
  }, [selectedPeriod, user?.id, userProfile?.id]);


  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const userId = user?.id || userProfile?.id;
      if (!userId) {
        console.warn('⚠️ No user available, cannot load analytics');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      
      // Fetch real analytics data from database
      const analyticsData = await fetchAnalyticsData();
      
      if (analyticsData) {
        // Use only real data
        setIncomeData(analyticsData.incomeData || []);
        setMonthlyStats(analyticsData.monthlyStats || []);
        setServicePerformance(analyticsData.servicePerformance || []);
        setPeakHours(analyticsData.peakHours || []);
        setCustomerEngagement(analyticsData.customerEngagement || {
          newCustomers: 0,
          returningCustomers: 0,
          totalBookings: 0,
          averageBookingValue: 0,
          customerSatisfaction: 0,
          repeatRate: 0,
        });
        setTotalRevenue(analyticsData.totalRevenue || 0);
        setRevenueGrowth(analyticsData.revenueGrowth || 0);
        
        console.log('✅ Real analytics data loaded successfully');
      } else {
        // Set empty data if no analytics data received
        setIncomeData([]);
        setMonthlyStats([]);
        setServicePerformance([]);
        setPeakHours([]);
        setCustomerEngagement({
          newCustomers: 0,
          returningCustomers: 0,
          totalBookings: 0,
          averageBookingValue: 0,
          customerSatisfaction: 0,
          repeatRate: 0,
        });
        setTotalRevenue(0);
        setRevenueGrowth(0);
        
        console.log('📊 No analytics data available');
      }
      
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      Alert.alert(
        'Analytics Error', 
        'Failed to load analytics data. Please check your connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod, fetchAnalyticsData, user?.id, userProfile?.id]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Chart configurations
  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#1A2533',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'System',
    },
  };

  const pieChartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
  };

  // Utility functions
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  // Export utility functions
  const generateCSVData = () => {
    const csvData = [];
    
    // Header
    csvData.push('Qwiken Analytics Report');
    csvData.push(`Generated on: ${new Date().toLocaleDateString()}`);
    csvData.push(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`);
    csvData.push('');
    
    // Overview Section
    csvData.push('OVERVIEW');
    csvData.push(`Total Revenue,${formatCurrency(totalRevenue)}`);
    csvData.push(`Revenue Growth,${formatPercentage(revenueGrowth)}`);
    csvData.push(`Total Bookings,${customerEngagement.totalBookings}`);
    csvData.push(`Customer Satisfaction,${customerEngagement.customerSatisfaction.toFixed(1)}/5`);
    csvData.push('');
    
    // Revenue Trend
    csvData.push('REVENUE TREND');
    csvData.push('Period,Amount,Bookings,Growth');
    incomeData.forEach(item => {
      csvData.push(`${item.period},${item.amount.toFixed(2)},${item.bookings},${item.growth.toFixed(1)}%`);
    });
    csvData.push('');
    
    // Customer Engagement
    csvData.push('CUSTOMER ENGAGEMENT');
    csvData.push(`New Customers,${customerEngagement.newCustomers}`);
    csvData.push(`Returning Customers,${customerEngagement.returningCustomers}`);
    csvData.push(`Average Booking Value,${formatCurrency(customerEngagement.averageBookingValue)}`);
    csvData.push(`Repeat Rate,${customerEngagement.repeatRate.toFixed(1)}%`);
    csvData.push('');
    
    // Service Performance
    csvData.push('SERVICE PERFORMANCE');
    csvData.push('Service,Bookings,Revenue,Rating');
    servicePerformance.forEach(service => {
      csvData.push(`${service.serviceName},${service.bookings},${service.revenue.toFixed(2)},${service.averageRating.toFixed(1)}`);
    });
    csvData.push('');
    
    // Peak Hours
    csvData.push('PEAK HOURS');
    csvData.push('Hour,Bookings');
    peakHours.forEach(hour => {
      csvData.push(`${hour.hour},${hour.bookings}`);
    });
    
    return csvData.join('\n');
  };

  const generateReportSummary = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
📊 Qwiken Analytics Report
Generated: ${currentDate}
Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}

💰 REVENUE OVERVIEW
Total Revenue: ${formatCurrency(totalRevenue)}
Growth: ${formatPercentage(revenueGrowth)} vs last period
Average Booking: ${formatCurrency(customerEngagement.averageBookingValue)}

👥 CUSTOMER INSIGHTS  
Total Bookings: ${customerEngagement.totalBookings}
New Customers: ${customerEngagement.newCustomers}
Returning Customers: ${customerEngagement.returningCustomers}
Satisfaction: ${customerEngagement.customerSatisfaction.toFixed(1)}/5 ⭐
Repeat Rate: ${customerEngagement.repeatRate.toFixed(1)}%

🏆 TOP SERVICES
${servicePerformance.slice(0, 3).map((service, index) => 
  `${index + 1}. ${service.serviceName} - ${service.bookings} bookings (${formatCurrency(service.revenue)})`
).join('\n')}

📈 KEY INSIGHTS
• ${customerEngagement.repeatRate > 60 ? 'Strong customer loyalty' : 'Opportunity to improve retention'}
• ${revenueGrowth > 0 ? 'Positive revenue growth' : 'Focus on revenue optimization'}
• ${customerEngagement.customerSatisfaction >= 4.5 ? 'Excellent customer satisfaction' : 'Room for service improvement'}

Generated with Qwiken Analytics
    `.trim();
  };

  // Export handler functions
  const handleExportSummary = async () => {
    try {
      setIsExporting(true);
      const reportSummary = generateReportSummary();
      
      await Share.share({
        message: reportSummary,
        title: 'Qwiken Analytics Report',
      });
      
      setShowExportModal(false);
    } catch (error) {
      console.error('❌ Error sharing summary:', error);
      Alert.alert('Export Error', 'Failed to export summary. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const csvData = generateCSVData();
      const fileName = `buzy-bees-analytics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      
      // For React Native, we'll use Share API to export CSV content
      await Share.share({
        message: csvData,
        title: fileName,
      });
      
      setShowExportModal(false);
    } catch (error) {
      console.error('❌ Error exporting CSV:', error);
      Alert.alert('Export Error', 'Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      // For now, we'll create a formatted text version
      // In a real app, you'd use a PDF generation library like react-native-html-to-pdf
      const pdfContent = `
📄 Qwiken Analytics Report (PDF Format)
${generateReportSummary()}

Note: This is a text-based export. For full PDF features, 
please use the web dashboard or contact support.
      `.trim();
      
      await Share.share({
        message: pdfContent,
        title: 'Qwiken Analytics Report (PDF)',
      });
      
      setShowExportModal(false);
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      Alert.alert('Export Error', 'Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Render components
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Analytics</Text>
      <TouchableOpacity 
        onPress={() => setShowExportModal(true)}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color="#1A2533" />
        ) : (
          <Ionicons name="download-outline" size={24} color="#1F2937" />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['week', 'month', 'year'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.activePeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.activePeriodButtonText,
            ]}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewCards = () => (
    <View style={styles.overviewContainer}>
      <View style={[styles.overviewCard, styles.primaryCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="trending-up" size={20} color="#FFFFFF" />
          <Text style={styles.primaryCardTitle}>
            Total Revenue
          </Text>
        </View>
        <Text style={styles.primaryCardValue}>{formatCurrency(totalRevenue)}</Text>
        <View style={styles.growthContainer}>
          <Ionicons 
            name={revenueGrowth > 0 ? "arrow-up" : "arrow-down"} 
            size={14} 
            color="#FFFFFF" 
          />
          <Text style={styles.growthText}>{formatPercentage(revenueGrowth)} vs last period</Text>
        </View>
      </View>

      <View style={styles.secondaryCardsContainer}>
        <View style={styles.overviewCard}>
          <View style={styles.cardIcon}>
            <Ionicons name="people" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.cardValue}>{customerEngagement.totalBookings}</Text>
          <Text style={styles.cardLabel}>Total Bookings</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <View style={styles.cardIcon}>
            <Ionicons name="star" size={20} color="#1A2533" />
          </View>
          <Text style={styles.cardValue}>{customerEngagement.customerSatisfaction.toFixed(1)}</Text>
          <Text style={styles.cardLabel}>Satisfaction</Text>
        </View>
      </View>
    </View>
  );

  const renderIncomeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Revenue Trend</Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={{
            labels: incomeData.slice(-6).map(item => item.period),
            datasets: [{
              data: incomeData.slice(-6).map(item => item.amount),
              color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
              strokeWidth: 3,
            }],
          }}
          width={chartWidth + 5}
          height={240}
          chartConfig={{
            ...chartConfig,
            propsForLabels: {
              fontSize: 10,
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withDots={true}
          withShadow={false}
        />
      </View>
    </View>
  );

  const renderBookingsChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Bookings Overview</Text>
      <View style={styles.chartWrapper}>
        <BarChart
          data={{
            labels: monthlyStats.slice(-6).map(item => item.month),
            datasets: [{
              data: monthlyStats.slice(-6).map(item => item.bookings),
            }],
          }}
          width={chartWidth + 5}
          height={240}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            propsForLabels: {
              fontSize: 10,
            },
          }}
          style={styles.chart}
          showValuesOnTopOfBars={true}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          fromZero={true}
        />
      </View>
    </View>
  );

  const renderServicePerformanceChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Service Performance</Text>
      <View style={styles.pieChartWrapper}>
        <PieChart
          data={servicePerformance.slice(0, 5).map((service, index) => ({
            name: service.serviceName.length > 8 ? service.serviceName.substring(0, 8) + '...' : service.serviceName,
            population: service.revenue,
            color: service.color,
            legendFontColor: '#4B5563',
            legendFontSize: 11,
          }))}
          width={chartWidth + 10}
          height={240}
          chartConfig={pieChartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="10"
          center={[0, 0]}
          style={styles.pieChart}
          hasLegend={true}
          avoidFalseZero={true}
        />
      </View>
    </View>
  );

  const renderCustomerEngagementMetrics = () => (
    <View style={styles.metricsContainer}>
      <Text style={styles.sectionTitle}>Customer Engagement</Text>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="person-add" size={16} color="#10B981" />
            <Text style={styles.metricLabel}>New Customers</Text>
          </View>
          <Text style={styles.metricValue}>{customerEngagement.newCustomers}</Text>
          <Text style={styles.metricSubtext}>This month</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="repeat" size={16} color="#3B82F6" />
            <Text style={styles.metricLabel}>Returning</Text>
          </View>
          <Text style={styles.metricValue}>{customerEngagement.returningCustomers}</Text>
          <Text style={styles.metricSubtext}>Loyal customers</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="cash" size={16} color="#1A2533" />
            <Text style={styles.metricLabel}>Avg. Booking</Text>
          </View>
          <Text style={styles.metricValue}>{formatCurrency(customerEngagement.averageBookingValue)}</Text>
          <Text style={styles.metricSubtext}>Per session</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="refresh" size={16} color="#8B5CF6" />
            <Text style={styles.metricLabel}>Repeat Rate</Text>
          </View>
          <Text style={styles.metricValue}>{customerEngagement.repeatRate.toFixed(0)}%</Text>
          <Text style={styles.metricSubtext}>Customer retention</Text>
        </View>
      </View>
    </View>
  );

  const renderPeakHoursChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Peak Hours</Text>
      <View style={styles.lineChartWrapper}>
        <LineChart
          data={{
            labels: peakHours.slice(0, 8).map(item => item.hour.replace(' ', '')),
            datasets: [{
              data: peakHours.slice(0, 8).map(item => item.bookings),
              color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
              strokeWidth: 3,
            }],
          }}
          width={chartWidth + 5}
          height={240}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
            propsForLabels: {
              fontSize: 10,
            },
          }}
          bezier
          style={styles.lineChart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withDots={true}
          withShadow={false}
          fromZero={true}
        />
      </View>
    </View>
  );

  const renderTopServices = () => (
    <View style={styles.servicesContainer}>
      <Text style={styles.sectionTitle}>Top Services</Text>
      {servicePerformance.slice(0, 5).map((service, index) => (
        <View key={service.serviceName} style={styles.serviceItem}>
          <View style={styles.serviceRank}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.serviceName}</Text>
            <Text style={styles.serviceStats}>
              {service.bookings} bookings • {formatCurrency(service.revenue)}
            </Text>
          </View>
          <View style={styles.serviceRating}>
            <Ionicons name="star" size={14} color="#1A2533" />
            <Text style={styles.ratingText}>{service.averageRating.toFixed(1)}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderExportModal = () => (
    <Modal
      visible={showExportModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowExportModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Export Analytics</Text>
            <TouchableOpacity 
              onPress={() => setShowExportModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Choose your preferred export format
          </Text>

          <View style={styles.exportOptions}>
            <TouchableOpacity 
              style={styles.exportOption}
              onPress={handleExportSummary}
              disabled={isExporting}
            >
              <View style={styles.exportOptionIcon}>
                <Ionicons name="document-text" size={24} color="#3B82F6" />
              </View>
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>Summary Report</Text>
                <Text style={styles.exportOptionDescription}>
                  Quick overview with key insights and metrics
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exportOption}
              onPress={handleExportCSV}
              disabled={isExporting}
            >
              <View style={styles.exportOptionIcon}>
                <Ionicons name="grid" size={24} color="#10B981" />
              </View>
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>CSV Data</Text>
                <Text style={styles.exportOptionDescription}>
                  Complete data export for spreadsheet analysis
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exportOption}
              onPress={handleExportPDF}
              disabled={isExporting}
            >
              <View style={styles.exportOptionIcon}>
                <Ionicons name="document" size={24} color="#EF4444" />
              </View>
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>PDF Report</Text>
                <Text style={styles.exportOptionDescription}>
                  Professional formatted report for presentations
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {isExporting && (
            <View style={styles.exportingIndicator}>
              <ActivityIndicator size="small" color="#1A2533" />
              <Text style={styles.exportingText}>Preparing export...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
          <Text style={styles.loadingSubtext}>Analyzing your business data</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
      
      {renderHeader()}
      {renderPeriodSelector()}
      

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
        {renderOverviewCards()}
        {renderIncomeChart()}
        {renderCustomerEngagementMetrics()}
        {renderBookingsChart()}
        {renderServicePerformanceChart()}
        {renderPeakHoursChart()}
        {renderTopServices()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {renderExportModal()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0FFFE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FFFE',
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
    color: '#4B5563',
  },
  overviewContainer: {
    marginBottom: 24,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCard: {
    backgroundColor: '#1A2533',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  primaryCardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
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
  secondaryCardsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginBottom: 20,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginLeft: -6,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    alignSelf: 'center',
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginLeft: -16,
  },
  pieChart: {
    borderRadius: 16,
    alignSelf: 'center',
  },
  lineChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginLeft: -8,
  },
  lineChart: {
    borderRadius: 16,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  servicesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2533',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  bottomSpacing: {
    height: 32,
  },
  // Export Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  exportOptions: {
    gap: 12,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    opacity: 1,
  },
  exportOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportOptionContent: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  exportingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F5F5E9',
    borderRadius: 12,
  },
  exportingText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#92400E',
  },
});

export default AnalyticsScreen;