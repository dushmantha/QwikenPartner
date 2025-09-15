import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount } from '../navigation/AppNavigator';

interface RefundPolicyScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
}

interface RefundExample {
  scenario: string;
  eligibility: 'full' | 'partial' | 'none';
  description: string;
  icon: string;
  color: string;
}

const { width } = Dimensions.get('window');

const RefundPolicyScreen: React.FC<RefundPolicyScreenProps> = ({ navigation }) => {
  const { accountType } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const refundExamples: RefundExample[] = [
    {
      scenario: 'Provider No-Show',
      eligibility: 'full',
      description: 'Provider doesn\'t show up for scheduled service without notice',
      icon: 'person-remove-outline',
      color: '#10B981',
    },
    {
      scenario: 'Service Quality Issues',
      eligibility: 'partial',
      description: 'Service completed but significantly below expectations',
      icon: 'star-half-outline',
      color: '#F59E0B',
    },
    {
      scenario: 'Cancellation (24h+)',
      eligibility: 'full',
      description: 'Customer cancels more than 24 hours before service',
      icon: 'calendar-outline',
      color: '#10B981',
    },
    {
      scenario: 'Late Cancellation',
      eligibility: 'partial',
      description: 'Customer cancels less than 24 hours before service',
      icon: 'time-outline',
      color: '#F59E0B',
    },
    {
      scenario: 'Customer No-Show',
      eligibility: 'none',
      description: 'Customer doesn\'t show up for scheduled service',
      icon: 'ban-outline',
      color: '#EF4444',
    },
    {
      scenario: 'Service Completed Successfully',
      eligibility: 'none',
      description: 'Service completed as agreed with no issues',
      icon: 'checkmark-circle-outline',
      color: '#EF4444',
    },
  ];

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to contact our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📧 Email',
          onPress: () => {
            Linking.openURL('mailto:support@qwiken.org?subject=Refund Request');
          }
        },
        {
          text: '💬 Chat',
          onPress: () => {
            navigation.navigate('HelpCenter');
          }
        }
      ]
    );
  };

  const handleSubmitRefundRequest = () => {
    Alert.alert(
      'Submit Refund Request',
      'To submit a refund request, please contact our support team with your booking details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contact Support',
          onPress: handleContactSupport
        }
      ]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderExpandableSection = (
    title: string,
    icon: string,
    children: React.ReactNode,
    sectionKey: string
  ) => {
    const isExpanded = expandedSection === sectionKey;
    
    return (
      <View style={styles.expandableSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name={icon} size={24} color="#1A2533" />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {children}
          </View>
        )}
      </View>
    );
  };

  const renderRefundExample = (example: RefundExample) => {
    let eligibilityText = '';
    let eligibilityColor = '';
    
    switch (example.eligibility) {
      case 'full':
        eligibilityText = 'Full Refund';
        eligibilityColor = '#10B981';
        break;
      case 'partial':
        eligibilityText = 'Partial Refund';
        eligibilityColor = '#F59E0B';
        break;
      case 'none':
        eligibilityText = 'No Refund';
        eligibilityColor = '#EF4444';
        break;
    }

    return (
      <View key={example.scenario} style={styles.exampleCard}>
        <View style={styles.exampleHeader}>
          <View style={[styles.exampleIcon, { backgroundColor: example.color + '20' }]}>
            <Ionicons name={example.icon} size={20} color={example.color} />
          </View>
          <View style={styles.exampleContent}>
            <Text style={styles.exampleTitle}>{example.scenario}</Text>
            <Text style={styles.exampleDescription}>{example.description}</Text>
          </View>
          <View style={[styles.eligibilityBadge, { backgroundColor: eligibilityColor + '20' }]}>
            <Text style={[styles.eligibilityText, { color: eligibilityColor }]}>
              {eligibilityText}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingEmoji}>💰</Text>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading Refund Policy</Text>
            <Text style={styles.loadingSubtext}>Getting the details ready...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Policy</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>💰</Text>
          </View>
          <Text style={styles.heroTitle}>Fair & Transparent Refunds</Text>
          <Text style={styles.heroSubtitle}>
            We believe in protecting both customers and service providers with clear, fair refund policies.
          </Text>
        </View>

        {/* Quick Reference */}
        <View style={styles.quickRefSection}>
          <Text style={styles.quickRefTitle}>📋 Quick Reference</Text>
          <Text style={styles.quickRefSubtitle}>Common refund scenarios and outcomes</Text>
          
          <View style={styles.examplesGrid}>
            {refundExamples.map(renderRefundExample)}
          </View>
        </View>

        {/* Detailed Policy Sections */}
        {renderExpandableSection(
          'Refund Timeline & Process',
          'time-outline',
          (
            <View>
              <Text style={styles.policyText}>
                <Text style={styles.bold}>Processing Time:</Text>{'\n'}
                • Refunds are processed within 5-7 business days{'\n'}
                • Credit card refunds may take 2-3 additional days to appear{'\n'}
                • Bank transfer refunds typically complete within 24-48 hours
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.bold}>How to Request:</Text>{'\n'}
                1. Contact our support team through the app or email{'\n'}
                2. Provide your booking reference number{'\n'}
                3. Explain the reason for your refund request{'\n'}
                4. Our team will review and respond within 24 hours
              </Text>
            </View>
          ),
          'timeline'
        )}

        {renderExpandableSection(
          'Full Refund Conditions',
          'checkmark-circle-outline',
          (
            <View>
              <Text style={styles.policyText}>
                You're eligible for a full refund in these situations:
              </Text>
              
              <View style={styles.conditionsList}>
                <View style={styles.conditionItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.conditionText}>
                    Provider cancels or doesn't show up without adequate notice
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.conditionText}>
                    You cancel more than 24 hours before the scheduled service
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.conditionText}>
                    Service cannot be completed due to provider's lack of necessary equipment or skills
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={styles.conditionText}>
                    Safety concerns prevent service completion
                  </Text>
                </View>
              </View>
            </View>
          ),
          'fullRefund'
        )}

        {renderExpandableSection(
          'Partial Refund Conditions',
          'star-half-outline',
          (
            <View>
              <Text style={styles.policyText}>
                Partial refunds (typically 50-75%) may be offered when:
              </Text>
              
              <View style={styles.conditionsList}>
                <View style={styles.conditionItem}>
                  <Ionicons name="remove" size={16} color="#F59E0B" />
                  <Text style={styles.conditionText}>
                    Service is completed but significantly below agreed standards
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="remove" size={16} color="#F59E0B" />
                  <Text style={styles.conditionText}>
                    You cancel within 24 hours of scheduled service
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="remove" size={16} color="#F59E0B" />
                  <Text style={styles.conditionText}>
                    Service is started but cannot be completed due to unforeseen circumstances
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="remove" size={16} color="#F59E0B" />
                  <Text style={styles.conditionText}>
                    Provider arrives late (more than 30 minutes) without prior notice
                  </Text>
                </View>
              </View>
            </View>
          ),
          'partialRefund'
        )}

        {renderExpandableSection(
          'When Refunds Aren\'t Available',
          'close-circle-outline',
          (
            <View>
              <Text style={styles.policyText}>
                Refunds are generally not available in these cases:
              </Text>
              
              <View style={styles.conditionsList}>
                <View style={styles.conditionItem}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                  <Text style={styles.conditionText}>
                    Customer no-show (doesn't show up at agreed time/location)
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                  <Text style={styles.conditionText}>
                    Service completed successfully as agreed
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                  <Text style={styles.conditionText}>
                    Customer changes requirements after service starts
                  </Text>
                </View>
                
                <View style={styles.conditionItem}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                  <Text style={styles.conditionText}>
                    Disputes about final price when scope was clearly defined
                  </Text>
                </View>
              </View>
            </View>
          ),
          'noRefund'
        )}

        {renderExpandableSection(
          'Dispute Resolution',
          'balance-outline',
          (
            <View>
              <Text style={styles.policyText}>
                If you disagree with a refund decision, we offer fair mediation:
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.bold}>Step 1: Direct Resolution</Text>{'\n'}
                Try communicating directly with the service provider to resolve the issue.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.bold}>Step 2: Platform Mediation</Text>{'\n'}
                Our support team will review all evidence and facilitate a fair resolution.
              </Text>
              
              <Text style={styles.policyText}>
                <Text style={styles.bold}>Step 3: Final Review</Text>{'\n'}
                Senior management reviews complex cases to ensure fairness for all parties.
              </Text>
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Our goal is always to find a solution that's fair to both customers and providers.
                </Text>
              </View>
            </View>
          ),
          'disputes'
        )}

        {/* Emergency Refunds */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning-outline" size={24} color="#EF4444" />
            <Text style={styles.emergencyTitle}>Emergency Situations</Text>
          </View>
          <Text style={styles.emergencyText}>
            In case of safety concerns, harassment, or other serious issues, contact us immediately. 
            Emergency refunds are processed within 24 hours for verified safety incidents.
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleContactSupport}>
            <Ionicons name="call-outline" size={16} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>Emergency Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Need Help with a Refund?</Text>
          <Text style={styles.contactDescription}>
            Our support team is here to help resolve any payment issues quickly and fairly.
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleSubmitRefundRequest}
            >
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Submit Refund Request</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={handleContactSupport}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#1A2533" />
              <Text style={styles.secondaryButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 280,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },

  // Header Styles
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    marginRight: 60,
  },

  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#F0FFFE',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Quick Reference Section
  quickRefSection: {
    margin: 16,
  },
  quickRefTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickRefSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },

  // Examples Grid
  examplesGrid: {
    gap: 12,
  },
  exampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exampleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exampleContent: {
    flex: 1,
    marginRight: 12,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  eligibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eligibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Expandable Sections
  expandableSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  // Policy Text Styles
  policyText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '600',
    color: '#1F2937',
  },

  // Conditions List
  conditionsList: {
    marginTop: 8,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  conditionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginLeft: 12,
    flex: 1,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF4FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },

  // Emergency Section
  emergencySection: {
    backgroundColor: '#FEF2F2',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  emergencyText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Contact Section
  contactSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactDescription: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533',
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FFFE',
    borderWidth: 1,
    borderColor: '#1A2533',
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#1A2533',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default RefundPolicyScreen;