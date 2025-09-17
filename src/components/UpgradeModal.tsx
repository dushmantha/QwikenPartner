import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { stripeService, PRICING_PLANS } from '../lib/stripe/stripeService';
import { usePremium } from '../contexts/PremiumContext';
import StripeWebView from './StripeWebView';
import { CURRENCY } from '../utils/currency';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (planType: 'monthly' | 'yearly') => void;
  title?: string;
  subtitle?: string;
  features?: Array<{
    icon: string;
    iconColor: string;
    title: string;
    description: string;
  }>;
  hiddenCount?: number;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  title = "Upgrade to Pro",
  subtitle = "Get unlimited access to all your notifications and premium features",
  features,
  hiddenCount = 0
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const { refreshSubscription } = usePremium();
  
  const defaultFeatures = [
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
      iconColor: '#F59E0B',
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

  const featuresToShow = features || defaultFeatures;

  // Handle payment success from WebView
  const handlePaymentSuccess = async (sessionId: string) => {
    setShowWebView(false);
    setIsProcessing(true);
    
    try {
      const result = await stripeService.checkPaymentStatus(sessionId || currentSessionId || '');
      if (result.success) {
        // Refresh premium subscription data
        console.log('🔄 Refreshing premium subscription after payment success');
        await refreshSubscription();
        
        Alert.alert(
          'Payment Successful!',
          'Welcome to Qwiken Partner Pro! Your premium features are now active.',
          [{ 
            text: 'Get Started', 
            onPress: () => {
              onUpgrade(selectedPlan);
              onClose();
            }
          }]
        );
      } else {
        Alert.alert(
          'Payment Pending',
          'Your payment is being processed. You will receive a confirmation shortly.',
          [{ 
            text: 'OK',
            onPress: () => {
              // Still refresh to check if status changed
              refreshSubscription();
            }
          }]
        );
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      Alert.alert(
        'Payment Status Unknown',
        'Please check your subscription status in settings.',
        [{ 
          text: 'OK',
          onPress: () => {
            // Refresh in case payment went through
            refreshSubscription();
          }
        }]
      );
    } finally {
      setIsProcessing(false);
      setCurrentSessionId(null);
    }
  };

  // Handle payment cancellation from WebView
  const handlePaymentCancel = () => {
    setShowWebView(false);
    setIsProcessing(false);
    setCurrentSessionId(null);
    Alert.alert(
      'Payment Cancelled',
      'Your payment was cancelled. You can try again anytime.',
      [{ text: 'OK' }]
    );
  };

  // Handle WebView close
  const handleWebViewClose = () => {
    setShowWebView(false);
    setIsProcessing(false);
    setCheckoutUrl('');
  };

  const handleUpgrade = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Create payment session
      const paymentSession = await stripeService.createPaymentSession(selectedPlan);
      setCurrentSessionId(paymentSession.sessionId);
      
      // Get checkout URL and show WebView
      const url = stripeService.getCheckoutUrl(paymentSession);
      setCheckoutUrl(url);
      setShowWebView(true);
      setIsProcessing(false); // Allow user interaction with WebView
      
    } catch (error) {
      console.error('Error creating payment session:', error);
      setIsProcessing(false);
      setCurrentSessionId(null);
      
      Alert.alert(
        'Payment Error',
        'Unable to start payment process. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePlanSelect = (plan: 'monthly' | 'yearly') => {
    if (isProcessing) return;
    setSelectedPlan(plan);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#1A2533" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.modalContent} 
          contentContainerStyle={styles.modalContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="star" size={48} color="#1A2533" />
            </View>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
            
            {hiddenCount > 0 && (
              <View style={styles.hiddenCountBadge}>
                <Text style={styles.hiddenCountText}>
                  {hiddenCount} more notification{hiddenCount > 1 ? 's' : ''} waiting
                </Text>
              </View>
            )}
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            
            {featuresToShow.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: feature.iconColor + '20' }]}>
                  <Ionicons name={feature.icon as any} size={20} color={feature.iconColor} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <Text style={styles.pricingTitle}>Choose Your Plan</Text>
            
            {/* Monthly Option */}
            <TouchableOpacity
              style={[
                styles.pricingOption,
                selectedPlan === 'monthly' && styles.pricingOptionSelected
              ]}
              onPress={() => handlePlanSelect('monthly')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingLabel}>Monthly</Text>
                <View style={[
                  styles.radioButton,
                  selectedPlan === 'monthly' && styles.radioButtonSelected
                ]}>
                  {selectedPlan === 'monthly' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              <Text style={styles.pricingPrice}>{CURRENCY.symbol}{PRICING_PLANS.monthly.price}/month</Text>
              <Text style={styles.pricingDescription}>Perfect for trying out Pro features</Text>
            </TouchableOpacity>
            
            {/* Yearly Option - Recommended */}
            <TouchableOpacity
              style={[
                styles.pricingOption,
                styles.pricingOptionRecommended,
                selectedPlan === 'yearly' && styles.pricingOptionSelected
              ]}
              onPress={() => handlePlanSelect('yearly')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingLabel}>Yearly</Text>
                <View style={[
                  styles.radioButton,
                  selectedPlan === 'yearly' && styles.radioButtonSelected
                ]}>
                  {selectedPlan === 'yearly' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              <View style={styles.pricingYearlyContainer}>
                <Text style={styles.pricingPrice}>{CURRENCY.symbol}{PRICING_PLANS.yearly.price}/year</Text>
                <Text style={styles.pricingSavings}>Save 17%</Text>
              </View>
              <Text style={styles.pricingDescription}>Best value - 2 months free!</Text>
            </TouchableOpacity>

            {/* Benefits List */}
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.benefitText}>Cancel anytime</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.benefitText}>Instant activation</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.benefitText}>30-day money back guarantee</Text>
              </View>
            </View>
          </View>

          {/* Social Proof */}
          <View style={styles.socialProof}>
            <View style={styles.socialProofHeader}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#1A2533" />
                ))}
              </View>
              <Text style={styles.socialProofRating}>4.9/5 from 1,200+ users</Text>
            </View>
            <Text style={styles.socialProofText}>
              "The Pro features transformed how I manage my business notifications. Worth every penny!"
            </Text>
            <Text style={styles.socialProofAuthor}>- Sarah M., Salon Owner</Text>
          </View>
        </ScrollView>

        {/* Footer with Action Buttons */}
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={[
              styles.upgradeButton,
              isProcessing && styles.upgradeButtonDisabled
            ]}
            onPress={handleUpgrade}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>
                  {currentSessionId ? 'Complete Payment...' : 'Starting Payment...'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.upgradeButtonText}>
                  Upgrade to {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Pro
                </Text>
                <Ionicons name="star" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.laterButton}
            onPress={onClose}
            disabled={isProcessing}
            activeOpacity={0.6}
          >
            <Text style={[
              styles.laterButtonText,
              isProcessing && styles.laterButtonTextDisabled
            ]}>
              Maybe Later
            </Text>
          </TouchableOpacity>

          <Text style={styles.secureText}>
            <Ionicons name="shield-checkmark" size={14} color="#1A2533" /> Secure payment • Cancel anytime
          </Text>
          
          {selectedPlan && (
            <Text style={styles.selectedPlanText}>
              Selected: {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan - {CURRENCY.symbol}{selectedPlan === 'monthly' ? `${PRICING_PLANS.monthly.price}/month` : `${PRICING_PLANS.yearly.price}/year`}
            </Text>
          )}
        </View>
      </SafeAreaView>

      {/* Stripe WebView Modal */}
      <StripeWebView
        visible={showWebView}
        checkoutUrl={checkoutUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        onClose={handleWebViewClose}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#FEF3C7',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  hiddenCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  hiddenCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Features List
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#1A2533',
    lineHeight: 20,
  },

  // Pricing Section
  pricingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  pricingOptionSelected: {
    borderColor: '#1A2533',
    backgroundColor: '#F8F9FA',
  },
  pricingOptionRecommended: {
    borderColor: '#1A2533',
    backgroundColor: '#F8F9FA',
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#1A2533',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  pricingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533',
    marginBottom: 4,
  },
  pricingYearlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pricingSavings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pricingDescription: {
    fontSize: 12,
    color: '#1A2533',
  },

  // Benefits List
  benefitsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#1A2533',
  },

  // Social Proof
  socialProof: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1A2533',
  },
  socialProofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  socialProofRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
  },
  socialProofText: {
    fontSize: 14,
    color: '#1A2533',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 8,
  },
  socialProofAuthor: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },

  // Modal Footer
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  laterButtonText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '500',
  },
  laterButtonTextDisabled: {
    color: '#9CA3AF',
  },
  secureText: {
    fontSize: 12,
    color: '#1A2533',
    textAlign: 'center',
  },
  selectedPlanText: {
    fontSize: 12,
    color: '#1A2533',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Radio Button Styles
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#1A2533',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A2533',
  },
});

export default UpgradeModal;