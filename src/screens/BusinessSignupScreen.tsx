import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount } from '../navigation/AppNavigator';

interface BusinessSignupScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
}

interface BusinessFormData {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  description: string;
  serviceArea: string;
  website: string;
  experience: string;
  agreedToTerms: boolean;
  allowMarketing: boolean;
}

interface BusinessType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
}

const BusinessSignupScreen: React.FC<BusinessSignupScreenProps> = ({ navigation }) => {
  const { accountType } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BusinessFormData>({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    businessType: '',
    description: '',
    serviceArea: '',
    website: '',
    experience: '',
    agreedToTerms: false,
    allowMarketing: true,
  });

  const businessTypes: BusinessType[] = [
    {
      id: 'home_services',
      name: 'Home Services',
      description: 'Repairs, maintenance, landscaping',
      icon: 'home-outline',
      color: '#10B981',
      examples: ['Home Maintenance', 'Plumbing', 'Electrical', 'Gardening', 'Handyman'],
    },
    {
      id: 'personal_care',
      name: 'Personal Care',
      description: 'Beauty, wellness, fitness, health',
      icon: 'person-outline',
      color: '#8B5CF6',
      examples: ['Hair Styling', 'Massage', 'Personal Training', 'Makeup', 'Spa Services'],
    },
    {
      id: 'professional',
      name: 'Professional Services',
      description: 'Consulting, design, IT, business support',
      icon: 'briefcase-outline',
      color: '#3B82F6',
      examples: ['Web Design', 'Accounting', 'Legal', 'Marketing', 'IT Support'],
    },
    {
      id: 'learning',
      name: 'Education & Training',
      description: 'Tutoring, coaching, skill development',
      icon: 'school-outline',
      color: '#F59E0B',
      examples: ['Music Lessons', 'Language Tutoring', 'Driving Lessons', 'Cooking Classes'],
    },
    {
      id: 'events',
      name: 'Events & Entertainment',
      description: 'Planning, catering, photography, entertainment',
      icon: 'calendar-outline',
      color: '#EF4444',
      examples: ['Wedding Planning', 'Photography', 'Catering', 'DJ Services', 'Entertainment'],
    },
    {
      id: 'other',
      name: 'Other Services',
      description: 'Specialized or unique services',
      icon: 'ellipsis-horizontal-outline',
      color: '#6B7280',
      examples: ['Pet Services', 'Delivery', 'Moving', 'Custom Services'],
    },
  ];

  const experienceLevels = [
    { value: 'new', label: 'New to Business (0-1 years)', description: 'Just starting your service business' },
    { value: 'beginner', label: 'Getting Started (1-3 years)', description: 'Building your client base' },
    { value: 'experienced', label: 'Experienced (3-10 years)', description: 'Established service provider' },
    { value: 'expert', label: 'Expert (10+ years)', description: 'Seasoned professional with extensive experience' },
  ];

  const totalSteps = 4;

  const updateFormData = (field: keyof BusinessFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.businessName.trim() && formData.ownerName.trim());
      case 2:
        return !!(formData.email.trim() && formData.phone.trim() && formData.businessType);
      case 3:
        return !!(formData.description.trim() && formData.serviceArea.trim() && formData.experience);
      case 4:
        return formData.agreedToTerms;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      Alert.alert('Incomplete Information', 'Please fill in all required fields before continuing.');
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      Alert.alert('Incomplete Information', 'Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Application Submitted! 🎉',
        'Thank you for your interest in joining Qwiken as a service provider. We\'ll review your application and contact you within 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Submission Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(currentStep / totalSteps) * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>Step {currentStep} of {totalSteps}</Text>
    </View>
  );

  const renderBusinessTypeCard = (type: BusinessType) => {
    const isSelected = formData.businessType === type.id;
    
    return (
      <TouchableOpacity
        key={type.id}
        style={[
          styles.businessTypeCard,
          isSelected && styles.selectedBusinessType,
          { borderLeftColor: type.color }
        ]}
        onPress={() => updateFormData('businessType', type.id)}
      >
        <View style={styles.businessTypeHeader}>
          <View style={[styles.businessTypeIcon, { backgroundColor: type.color + '20' }]}>
            <Ionicons name={type.icon} size={24} color={type.color} />
          </View>
          <View style={styles.businessTypeContent}>
            <Text style={styles.businessTypeName}>{type.name}</Text>
            <Text style={styles.businessTypeDescription}>{type.description}</Text>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={type.color} />
          )}
        </View>
        
        <View style={styles.businessTypeExamples}>
          {type.examples.slice(0, 3).map((example, index) => (
            <View key={index} style={styles.exampleTag}>
              <Text style={styles.exampleText}>{example}</Text>
            </View>
          ))}
          {type.examples.length > 3 && (
            <Text style={styles.moreExamples}>+{type.examples.length - 3} more</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderExperienceOption = (level: any) => {
    const isSelected = formData.experience === level.value;
    
    return (
      <TouchableOpacity
        key={level.value}
        style={[
          styles.experienceOption,
          isSelected && styles.selectedExperience
        ]}
        onPress={() => updateFormData('experience', level.value)}
      >
        <View style={styles.experienceHeader}>
          <Text style={[styles.experienceLabel, isSelected && styles.selectedExperienceText]}>
            {level.label}
          </Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={20} color="#1A2533" />
          )}
        </View>
        <Text style={styles.experienceDescription}>{level.description}</Text>
      </TouchableOpacity>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Let's start with the basics</Text>
      <Text style={styles.stepSubtitle}>Tell us about your business</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Name *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.businessName}
          onChangeText={(text) => updateFormData('businessName', text)}
          placeholder="e.g., Smith's Home Services"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Your Full Name *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.ownerName}
          onChangeText={(text) => updateFormData('ownerName', text)}
          placeholder="e.g., John Smith"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3B82F6" />
        <Text style={styles.infoText}>
          This information will be used to verify your identity and set up your business profile.
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Contact & Service Details</Text>
      <Text style={styles.stepSubtitle}>How can customers reach you?</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.email}
          onChangeText={(text) => updateFormData('email', text)}
          placeholder="john@smithservices.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.phone}
          onChangeText={(text) => updateFormData('phone', text)}
          placeholder="+64 21 123 4567"
          keyboardType="phone-pad"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Website (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={formData.website}
          onChangeText={(text) => updateFormData('website', text)}
          placeholder="www.smithservices.com"
          autoCapitalize="none"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <Text style={styles.sectionTitle}>What type of services do you offer? *</Text>
      <ScrollView style={styles.businessTypesContainer} showsVerticalScrollIndicator={false}>
        {businessTypes.map(renderBusinessTypeCard)}
      </ScrollView>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us about your services</Text>
      <Text style={styles.stepSubtitle}>Help customers understand what you offer</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Service Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => updateFormData('description', text)}
          placeholder="Describe the services you provide, your specialties, and what makes your business unique..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Service Area *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.serviceArea}
          onChangeText={(text) => updateFormData('serviceArea', text)}
          placeholder="e.g., Auckland Central, North Shore, or Nationwide"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      <Text style={styles.sectionTitle}>Your Experience Level *</Text>
      <View style={styles.experienceContainer}>
        {experienceLevels.map(renderExperienceOption)}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Almost done!</Text>
      <Text style={styles.stepSubtitle}>Review and confirm your application</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Application Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Business:</Text>
          <Text style={styles.summaryValue}>{formData.businessName}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Owner:</Text>
          <Text style={styles.summaryValue}>{formData.ownerName}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Email:</Text>
          <Text style={styles.summaryValue}>{formData.email}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phone:</Text>
          <Text style={styles.summaryValue}>{formData.phone}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Area:</Text>
          <Text style={styles.summaryValue}>{formData.serviceArea}</Text>
        </View>
      </View>
      
      <View style={styles.agreementSection}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => updateFormData('agreedToTerms', !formData.agreedToTerms)}
        >
          <View style={[styles.checkbox, formData.agreedToTerms && styles.checkedBox]}>
            {formData.agreedToTerms && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the{' '}
            <Text 
              style={styles.linkText}
              onPress={() => navigation.navigate('TermsConditions')}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text 
              style={styles.linkText}
              onPress={() => navigation.navigate('PrivacyScreen')}
            >
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => updateFormData('allowMarketing', !formData.allowMarketing)}
        >
          <View style={[styles.checkbox, formData.allowMarketing && styles.checkedBox]}>
            {formData.allowMarketing && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.checkboxText}>
            I'd like to receive marketing emails about new features and business tips
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.nextStepsCard}>
        <Text style={styles.nextStepsTitle}>What happens next?</Text>
        <View style={styles.nextStep}>
          <Ionicons name="document-text-outline" size={20} color="#1A2533" />
          <Text style={styles.nextStepText}>We'll review your application within 24-48 hours</Text>
        </View>
        <View style={styles.nextStep}>
          <Ionicons name="call-outline" size={20} color="#1A2533" />
          <Text style={styles.nextStepText}>Our team may contact you for additional information</Text>
        </View>
        <View style={styles.nextStep}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#1A2533" />
          <Text style={styles.nextStepText}>Once approved, you can start accepting bookings!</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => currentStep > 1 ? prevStep() : navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
          <Text style={styles.backText}>{currentStep > 1 ? 'Back' : 'Close'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join as Provider</Text>
      </View>

      {renderProgressBar()}

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !validateStep(currentStep) && styles.disabledButton
              ]}
              onPress={nextStep}
              disabled={!validateStep(currentStep)}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!validateStep(currentStep) || isSubmitting) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={!validateStep(currentStep) || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
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

  // Progress Bar
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1A2533',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Content Styles
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },

  // Step Container
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },

  // Form Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },

  // Business Types
  businessTypesContainer: {
    maxHeight: 300,
  },
  businessTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedBusinessType: {
    borderColor: '#1A2533',
    backgroundColor: '#F0FFFE',
  },
  businessTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessTypeContent: {
    flex: 1,
  },
  businessTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  businessTypeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  businessTypeExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exampleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  moreExamples: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    alignSelf: 'center',
  },

  // Experience Options
  experienceContainer: {
    gap: 12,
  },
  experienceOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  selectedExperience: {
    borderColor: '#1A2533',
    backgroundColor: '#F0FFFE',
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  experienceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedExperienceText: {
    color: '#1A2533',
  },
  experienceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Summary Styles
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // Agreement Section
  agreementSection: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkedBox: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  linkText: {
    color: '#1A2533',
    fontWeight: '600',
  },

  // Next Steps Card
  nextStepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nextStepText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF4FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },

  // Action Container
  actionContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default BusinessSignupScreen;