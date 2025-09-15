import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, SafeAreaView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Update the RootStackParamList to include the new screen params
type RootStackParamList = {
  BookingSummary: {
    selectedServices: Array<{
      id: string;
      name: string;
      price: string;
      duration: string;
    }>;
    totalPrice: number;
    selectedStaff?: any;
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
  BookingDateTimeEnhanced: {
    selectedServices: Array<{
      id: string;
      name: string;
      price: string;
      duration: string;
    }>;
    totalPrice: number;
    selectedStaff: any;
    selectedDiscount?: any;
    priceBreakdown?: {
      subtotal: number;
      discountAmount: number;
      discountedSubtotal: number;
      finalTotal: number;
      hasDiscount: boolean;
    };
    bookingDetails: {
      serviceId: string;
      shopId: string;
      shopName: string;
      shopAddress: string;
      shopContact: string;
    };
  };
  // Add other screen params as needed
  [key: string]: any;
};

type BookingSummaryScreenRouteProp = RouteProp<RootStackParamList, 'BookingSummary'>;

type BookingSummaryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookingSummary'>;

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

const BookingSummaryScreen = () => {
  const navigation = useNavigation<BookingSummaryScreenNavigationProp>();
  const route = useRoute<BookingSummaryScreenRouteProp>();
  const { selectedServices, totalPrice, selectedStaff, selectedDiscount, priceBreakdown, bookingDetails } = route.params;

  // Single API service function for booking data
  const apiService = {
    async validateBookingData(bookingData: {
      selectedServices: any[];
      totalPrice: number;
    }): Promise<ApiResponse<{ isValid: boolean; fees?: any }>> {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock validation logic
        const isValid = bookingData.selectedServices.length > 0 && bookingData.totalPrice > 0;
        
        return {
          data: {
            isValid,
            fees: {
              serviceFee: 0,
              tax: 0, // No tax
              discount: 0
            }
          },
          success: true
        };
      } catch (error) {
        console.error('Validation error:', error);
        return {
          data: { isValid: false },
          success: false,
          error: 'Failed to validate booking data'
        };
      }
    }
  };

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      Alert.alert('Navigation', 'Go back to previous screen');
    }
  };

  const handleContinue = async () => {
    try {
      // Validate booking data before proceeding
      const response = await apiService.validateBookingData({
        selectedServices,
        totalPrice
      });

      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to validate booking');
        return;
      }

      if (!response.data.isValid) {
        Alert.alert('Invalid Booking', 'Please check your selected services');
        return;
      }

      if (navigation?.navigate) {
        navigation.navigate('BookingDateTimeEnhanced', {
          selectedServices,
          totalPrice,
          selectedStaff,
          selectedDiscount,
          priceBreakdown,
          bookingDetails: bookingDetails || {
            serviceId: 'unknown',
            shopId: 'unknown',
            shopName: 'Qwiken Partner',
            shopAddress: 'Address not available',
            shopContact: 'Contact not available'
          }
        });
      } else {
        Alert.alert('Navigation', 'Continue to Date & Time selection');
      }
    } catch (error) {
      console.error('Continue error:', error);
      Alert.alert('Error', 'Failed to proceed with booking');
    }
  };

  // Calculate total duration
  const totalDuration = selectedServices.reduce((total, service) => {
    const duration = parseInt(service.duration, 10) || 0;
    return total + duration;
  }, 0);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      }
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toFixed(2);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent={true} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A2533" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Booking Summary</Text>
          <Text style={styles.headerSubtitle}>
            {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Services List */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Selected Services</Text>
          
          {selectedServices.map((service, index) => (
            <View key={index} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceNumber}>
                  <Text style={styles.serviceNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.serviceMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color="#1A2533" />
                      <Text style={styles.metaText}>{formatDuration(parseInt(service.duration))}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#1A2533" />
                      <Text style={styles.metaText}>Professional</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.servicePrice}>${formatPrice(service.price)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Breakdown */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
          
          <View style={styles.pricingCard}>
            {/* Service Items */}
            {selectedServices.map((service, index) => (
              <View key={index} style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>{service.name}</Text>
                <Text style={styles.pricingValue}>${formatPrice(service.price)}</Text>
              </View>
            ))}
            
            {/* Divider */}
            <View style={styles.pricingDivider} />
            
            {/* Duration Summary */}
            <View style={styles.pricingRow}>
              <View style={styles.pricingLabelContainer}>
                <Ionicons name="time-outline" size={16} color="#1A2533" />
                <Text style={styles.pricingLabel}>Total Duration</Text>
              </View>
              <Text style={styles.pricingValue}>{formatDuration(totalDuration)}</Text>
            </View>
            
            {/* Pricing Breakdown */}
            {priceBreakdown ? (
              <>
                {/* Subtotal */}
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Subtotal</Text>
                  <Text style={styles.pricingValue}>${priceBreakdown.subtotal.toFixed(2)}</Text>
                </View>
                
                {/* Discount */}
                {priceBreakdown.hasDiscount && (
                  <View style={styles.pricingRow}>
                    <Text style={[styles.pricingLabel, styles.discountLabel]}>
                      Discount ({selectedDiscount?.percentage}%)
                    </Text>
                    <Text style={[styles.pricingValue, styles.discountValue]}>
                      -${priceBreakdown.discountAmount.toFixed(2)}
                    </Text>
                  </View>
                )}
                
                {/* After Discount */}
                {priceBreakdown.hasDiscount && (
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>After Discount</Text>
                    <Text style={styles.pricingValue}>${priceBreakdown.discountedSubtotal.toFixed(2)}</Text>
                  </View>
                )}
                
                
                {/* Total */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>${priceBreakdown.finalTotal.toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <>
                {/* Fallback - Original calculation */}
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Subtotal</Text>
                  <Text style={styles.pricingValue}>${totalPrice.toFixed(2)}</Text>
                </View>
                
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>${totalPrice.toFixed(2)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#1A2533" />
              <Text style={styles.infoTitle}>What's Next?</Text>
            </View>
            <Text style={styles.infoText}>
              After confirming your booking, you'll be able to select your preferred date and time, 
              and receive a confirmation with all the details.
            </Text>
            
            <View style={styles.infoItems}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={16} color="#1A2533" />
                <Text style={styles.infoItemText}>Choose date & time</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="card-outline" size={16} color="#1A2533" />
                <Text style={styles.infoItemText}>Secure payment</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#1A2533" />
                <Text style={styles.infoItemText}>Instant confirmation</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Policy Section */}
        <View style={styles.policySection}>
          <View style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#1A2533" />
              <Text style={styles.policyTitle}>Booking Policy</Text>
            </View>
            <View style={styles.policyItems}>
              <Text style={styles.policyItem}>• Free cancellation up to 24 hours before appointment</Text>
              <Text style={styles.policyItem}>• Reschedule up to 2 hours before your appointment</Text>
              <Text style={styles.policyItem}>• Professional guarantee on all services</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing for fixed footer */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerTotalLabel}>
              Total: ${priceBreakdown ? priceBreakdown.finalTotal.toFixed(2) : totalPrice.toFixed(2)}
            </Text>
            <Text style={styles.footerDuration}>{formatDuration(totalDuration)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue to Date & Time</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50, // Account for transparent status bar
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent', // Transparent header
    // Removed all borders and shadows for transparent effect
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
  servicesSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A2533',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 6,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  priceTag: {
    backgroundColor: '#F0FFFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  pricingSection: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pricingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  pricingValue: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
  },
  discountLabel: {
    color: '#059669', // Green for discount label
  },
  discountValue: {
    color: '#059669', // Green for discount value
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#F0FFFE',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#F8FFFE',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2533',
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FAFAFA',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1A2533',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoItems: {
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoItemText: {
    fontSize: 13,
    color: '#1A2533',
    fontWeight: '500',
  },
  policySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  policyCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 8,
  },
  policyItems: {
    gap: 6,
  },
  policyItem: {
    fontSize: 13,
    color: '#1A2533',
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 120, // Space for fixed footer
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
  },
  footerContent: {
    padding: 16,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2533',
  },
  footerDuration: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#1A2533',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

export default BookingSummaryScreen;