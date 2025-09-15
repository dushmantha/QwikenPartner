import React, { useState, useCallback, useEffect } from 'react';
import { useAuth, useAccount, useNotifications } from '../navigation/AppNavigator';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Modal,
  Linking,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useImagePicker from '../hooks/useImagePicker';
import UpgradeModal from '../components/UpgradeModal';
import { authService } from '../lib/supabase/index';
import { normalizedShopService } from '../lib/supabase/normalized';
import { usePremium } from '../contexts/PremiumContext';
import { stripeService } from '../lib/stripe/stripeService';
import { CancellationBanner } from '../components/CancellationBanner';
import { ImageUploadService } from '../services/api/imageUploadFix';
import { shouldUseMockData, logMockUsage } from '../config/devConfig';
import { MOCK_USERS } from '../data/mockData';
import AppSwitcher from '../utils/AppSwitcher';

interface ProfileData {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender?: string;
  birth_date?: string;
  address?: string;
  bio?: string;
  avatar_url?: string;
  account_type: 'provider' | 'consumer';
  is_premium: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  
  // Location data from user_locations table
  location?: {
    id: string;
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    is_primary: boolean;
  };
  
  // Provider-specific data from provider_businesses table
  provider_business?: {
    id: string;
    name: string; // business name
    category: string; // service category
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    website_url?: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    provider_skills?: Array<{
      skill_name: string;
      experience_level: string;
    }>;
    provider_certifications?: Array<{
      certification_name: string;
      issued_by: string;
      issue_date: string;
      expiry_date?: string;
    }>;
  };
  
  // Consumer-specific data from consumer_details table
  consumer_details?: {
    id: string;
    budget_range: string;
    location_preference: string;
    service_history: number;
    total_spent: number;
    average_rating_given: number;
    created_at: string;
    updated_at: string;
    consumer_preferred_services?: Array<{
      service_category: string;
    }>;
  };
  
  // User preferences from user_preferences table
  preferences?: {
    id: string;
    email_notifications: boolean;
    push_notifications: boolean;
    sms_notifications: boolean;
    profile_visibility: string;
    location_sharing: boolean;
    theme: string;
    language: string;
    timezone: string;
    marketing_emails: boolean;
    created_at: string;
    updated_at: string;
  };
}


interface ApiResponse<T> {
  data: T;
  success: boolean;
  total_count?: number;
  has_more?: boolean;
}

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  // Removed tab functionality - ProfileScreen now only shows profile content
  
  // Use the global account context and notifications
  const { accountType, setAccountType, isLoading, userProfile } = useAccount();
  const { notificationCount } = useNotifications();
  const { isPremium, subscription, refreshSubscription } = usePremium();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tempProfile, setTempProfile] = useState<ProfileData | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [isCancelingSubscription, setIsCancelingSubscription] = useState(false);
  const [isReactivatingSubscription, setIsReactivatingSubscription] = useState(false);
  const [providerSkills, setProviderSkills] = useState<any[]>([]);
  const [providerCertifications, setProviderCertifications] = useState<any[]>([]);
  const [isLoadingSkills, setIsProfileLoadingSkills] = useState(false);
  const [isLoadingCerts, setIsProfileLoadingCerts] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    uploading: false,
    message: '',
    progress: 0
  });
  
  // Form states for adding skills
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    experience_level: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
    years_experience: 0,
    is_certified: false
  });
  
  // Form states for adding certifications
  const [newCert, setNewCert] = useState({
    certification_name: '',
    issued_by: '',
    issue_date: '',
    expiry_date: '',
    certificate_number: '',
    verification_url: ''
  });
  
  
  const { signOut, user, isAuthenticated } = useAuth();
  const { showImagePickerOptions, isLoading: isImageLoading } = useImagePicker();

  // Use real user ID from auth context
  const userId = user?.id || null;
  
  console.log('👤 ProfileScreen - User ID:', userId);
  console.log('👤 ProfileScreen - User object:', user);


  // Default mock profile data for fallback scenarios
  const mockProfileData = {
    id: 'mock-user-id',
    email: 'mock@example.com',
    phone: '1234567890',
    first_name: 'Demo',
    last_name: 'User',
    full_name: 'Demo User',
    account_type: accountType as 'provider' | 'consumer',
    is_premium: false,
    email_verified: false,
    phone_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Add default provider_business for provider accounts
    provider_business: accountType === 'provider' ? {
      id: 'mock-provider-id',
      name: '',
      category: '',
      description: '',
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : undefined,
    // Add default consumer_details for consumer accounts
    consumer_details: accountType === 'consumer' ? {
      id: 'mock-consumer-id',
      budget_range: '',
      location_preference: '',
      service_history: 0,
      total_spent: 0,
      average_rating_given: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : undefined
  };


  // Fetch real user profile from Supabase
  useEffect(() => {
    console.log('👤 ProfileScreen useEffect - User states:', {
      user: !!user,
      userId: user?.id,
      isAuthenticated,
      userProfile: !!userProfile
    });
    
    const fetchUserProfile = async () => {
      try {
        setIsProfileLoading(true);
        console.log('🔄 Fetching user profile...');
        
        // Use user from auth context instead of calling getCurrentUser
        const currentUser = user;
        
        // Use mock data if enabled, regardless of authentication status
        if (shouldUseMockData('MOCK_AUTH')) {
          console.log('🎭 Using mock profile data');
          logMockUsage('Loading mock profile data');
          const mockUser = MOCK_USERS[0];
          
          const mockProfile = {
            id: currentUser?.id || mockUser.id,
            email: mockUser.email,
            phone: mockUser.phone || '1234567890',
            first_name: mockUser.firstName,
            last_name: mockUser.lastName,
            full_name: `${mockUser.firstName} ${mockUser.lastName}`,
            avatar_url: mockUser.avatar,
            account_type: accountType,
            is_premium: false,
            email_verified: true,
            phone_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            bio: 'This is a mock profile for development and testing purposes.',
            address: '123 Mock Street, Demo City, DC 12345',
            gender: 'prefer-not-to-say',
            birth_date: '1990-01-01',
            provider_business: accountType === 'provider' ? {
              id: 'mock-provider-id',
              name: 'Demo Beauty Salon',
              category: 'Beauty & Wellness',
              description: 'A mock beauty salon for testing purposes',
              is_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined,
            consumer_details: accountType === 'consumer' ? {
              id: 'mock-consumer-id',
              budget_range: '$50-$100',
              location_preference: 'Within 10 miles',
              service_history: 15,
              total_spent: 750,
              average_rating_given: 4.5,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined
          };
          
          setProfile(mockProfile);
          setProfileImageError(false);
          console.log('✅ Mock profile loaded successfully');
          setIsProfileLoading(false);
          return;
        }
        
        if (!currentUser) {
          console.warn('⚠️ No authenticated user found, using default profile data');
          const mockUser = MOCK_USERS[0];
          
          if (mockUser) {
            logMockUsage('Loading fallback mock profile data');
          }
          
          const defaultProfile = {
            id: mockUser?.id || 'temp-user-id',
            email: mockUser?.email || 'user@example.com',
            phone: mockUser?.phone || '1234567890',
            first_name: mockUser?.firstName || 'Demo',
            last_name: mockUser?.lastName || 'User', 
            full_name: mockUser ? `${mockUser.firstName} ${mockUser.lastName}` : 'Demo User',
            avatar_url: mockUser?.avatar || null,
            account_type: accountType,
            is_premium: false,
            email_verified: false,
            phone_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            provider_business: accountType === 'provider' ? {
              id: 'temp-provider-id',
              name: '',
              category: '',
              description: '',
              is_verified: false,
                            created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined,
            consumer_details: accountType === 'consumer' ? {
              id: 'temp-consumer-id',
              budget_range: '',
              location_preference: '',
              service_history: 0,
              total_spent: 0,
              average_rating_given: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined
          };
          setProfile(defaultProfile);
          
          // Reset image error state when profile is loaded
          setProfileImageError(false);
          
          // Profile loaded successfully - no invoice loading needed
          console.log('✅ Fallback profile created successfully');
          
          setIsProfileLoading(false);
          return;
        }
        
        // Get real user profile from normalizedShopService
        const profileResponse = await normalizedShopService.getUserProfile();
        
        if (profileResponse.success && profileResponse.data) {
          console.log('✅ Real profile loaded:', JSON.stringify(profileResponse.data, null, 2));
          
          // Ensure the profile has all required fields with safe defaults
          const safeProfileData = {
            ...profileResponse.data,
            full_name: profileResponse.data.full_name || `${profileResponse.data.first_name || ''} ${profileResponse.data.last_name || ''}`.trim() || 'User',
            first_name: profileResponse.data.first_name || '',
            last_name: profileResponse.data.last_name || '', 
            email: profileResponse.data.email || currentUser.email || '',
            phone: profileResponse.data.phone || '',
            address: profileResponse.data.address || '',
            bio: profileResponse.data.bio || '',
            avatar_url: profileResponse.data.avatar_url || null,
            gender: profileResponse.data.gender || '',
            birth_date: profileResponse.data.birth_date || '',
            account_type: profileResponse.data.account_type || accountType,
            is_premium: profileResponse.data.is_premium || false,
            email_verified: profileResponse.data.email_verified || false,
            phone_verified: profileResponse.data.phone_verified || false,
            provider_business: profileResponse.data.provider_business || null
          };
          
          // Reset image error state when profile is loaded
          setProfileImageError(false);
          
          // Respect user's current account type preference - don't auto-switch
          // The account type should only be changed by explicit user action
          console.log('📝 Profile account type from DB:', safeProfileData.account_type, 'Current context:', accountType);
          
          // Update profile data to use current context account type instead of DB value
          // This prevents random switching and respects user's saved preference
          setProfile({
            ...safeProfileData,
            account_type: accountType // Use the persisted account type from context
          });
        } else {
          console.error('❌ Failed to load profile:', profileResponse.error);
          // Fall back to default profile instead of throwing error
          console.warn('⚠️ Falling back to default profile data');
          const defaultProfile = {
            id: currentUser.id,
            email: currentUser.email || 'user@example.com',
            phone: '1234567890',
            first_name: 'User',
            last_name: 'Profile', 
            full_name: 'User Profile',
            account_type: accountType,
            is_premium: false,
            email_verified: false,
            phone_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            provider_business: accountType === 'provider' ? {
              id: `${currentUser.id}-provider`,
              name: '',
              category: '',
              description: '',
              is_verified: false,
                            created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined,
            consumer_details: accountType === 'consumer' ? {
              id: `${currentUser.id}-consumer`,
              budget_range: '',
              location_preference: '',
              service_history: 0,
              total_spent: 0,
              average_rating_given: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined
          };
          setProfile(defaultProfile);
        }
        
        // Profile loaded - no invoice data needed in profile screen
        console.log('✅ Profile data loaded successfully');
        
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
        // Instead of showing alert, fall back to default data
        console.warn('⚠️ Error occurred, using fallback profile data');
        const defaultProfile = {
          id: 'fallback-user-id',
          email: 'fallback@example.com',
          phone: '1234567890',
          first_name: 'Demo',
          last_name: 'User', 
          full_name: 'Demo User',
          account_type: accountType,
          is_premium: false,
          email_verified: false,
          phone_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider_business: accountType === 'provider' ? {
            id: 'fallback-provider-id',
            name: '',
            category: '',
            description: '',
            is_verified: false,
                        created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } : undefined,
          consumer_details: accountType === 'consumer' ? {
            id: 'fallback-consumer-id',
            budget_range: '',
            location_preference: '',
            service_history: 0,
            total_spent: 0,
            average_rating_given: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } : undefined
        };
        setProfile(defaultProfile);
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]); // Only re-run when user changes, not when account type changes

  // Load skills and certifications for provider accounts
  useEffect(() => {
    if (accountType === 'provider' && profile) {
      loadProviderSkills();
      loadProviderCertifications();
    }
  }, [profile]); // Remove accountType dependency to prevent circular updates

  const loadProviderSkills = async () => {
    try {
      setIsProfileLoadingSkills(true);
      
      // Use mock data if enabled
      if (shouldUseMockData('MOCK_AUTH')) {
        logMockUsage('Loading mock provider skills');
        const mockSkills = [
          {
            id: 'skill-1',
            skill_name: 'Hair Cutting & Styling',
            experience_level: 'Expert',
            years_experience: 8,
            is_certified: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'skill-2',
            skill_name: 'Hair Coloring',
            experience_level: 'Advanced',
            years_experience: 6,
            is_certified: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'skill-3',
            skill_name: 'Makeup Application',
            experience_level: 'Intermediate',
            years_experience: 4,
            is_certified: false,
            created_at: new Date().toISOString()
          },
          {
            id: 'skill-4',
            skill_name: 'Nail Art',
            experience_level: 'Advanced',
            years_experience: 5,
            is_certified: true,
            created_at: new Date().toISOString()
          }
        ];
        setProviderSkills(mockSkills);
        return;
      }
      
      const response = await normalizedShopService.getProviderSkills();
      if (response.success) {
        setProviderSkills(response.data);
      } else {
        console.error('Failed to load skills:', response.error);
      }
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setIsProfileLoadingSkills(false);
    }
  };

  const loadProviderCertifications = async () => {
    try {
      setIsProfileLoadingCerts(true);
      
      // Use mock data if enabled
      if (shouldUseMockData('MOCK_AUTH')) {
        logMockUsage('Loading mock provider certifications');
        const mockCertifications = [
          {
            id: 'cert-1',
            certification_name: 'Professional Hair Stylist Certification',
            issued_by: 'International Beauty Academy',
            issue_date: '2020-06-15',
            expiry_date: '2025-06-15',
            certificate_number: 'IBA-2020-HS-12345',
            verification_url: 'https://iba.org/verify/12345',
            created_at: new Date().toISOString()
          },
          {
            id: 'cert-2',
            certification_name: 'Advanced Color Theory',
            issued_by: 'Professional Colorists Association',
            issue_date: '2021-03-20',
            expiry_date: '2026-03-20',
            certificate_number: 'PCA-2021-CT-67890',
            verification_url: 'https://pca.org/verify/67890',
            created_at: new Date().toISOString()
          },
          {
            id: 'cert-3',
            certification_name: 'Organic Hair Treatment Specialist',
            issued_by: 'Green Beauty Institute',
            issue_date: '2022-01-10',
            expiry_date: '2027-01-10',
            certificate_number: 'GBI-2022-OT-54321',
            verification_url: 'https://gbi.org/verify/54321',
            created_at: new Date().toISOString()
          }
        ];
        setProviderCertifications(mockCertifications);
        return;
      }
      
      const response = await normalizedShopService.getProviderCertifications();
      if (response.success) {
        setProviderCertifications(response.data);
      } else {
        console.error('Failed to load certifications:', response.error);
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      setIsProfileLoadingCerts(false);
    }
  };


  // Handle upgrade to premium
  const handleUpgrade = async () => {
    try {
      setShowUpgradeModal(false);
      
      Alert.alert('Processing', 'Upgrading your account...', [], { cancelable: false });
      
      // Update user profile to set is_premium to true
      const response = await normalizedShopService.updateUserProfile({ is_premium: true });
      
      if (response.success) {
        // Reload the profile to get updated data
        const profileResponse = await normalizedShopService.getUserProfile();
        if (profileResponse.success) {
          setProfile(profileResponse.data);
        }
        Alert.alert('Success!', 'Your account has been upgraded to Pro. You now have unlimited access to all payments and premium features.');
        
      } else {
        throw new Error(response.error || 'Upgrade failed');
      }
    } catch (error) {
      console.error('Error upgrading account:', error);
      Alert.alert('Error', 'Failed to upgrade account. Please try again.');
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    console.log('📱 Cancel subscription button pressed');
    console.log('📊 Current subscription status:', subscription?.subscription_status);
    
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? You will continue to have access to premium features until the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => {
            // Use immediate function to handle async properly
            (async () => {
              try {
                console.log('🔄 Starting subscription cancellation...');
                console.log('📊 User subscription data:', subscription);
                setIsCancelingSubscription(true);
                
                // Cancel subscription through Stripe
                console.log('📞 Calling stripeService.cancelSubscription()');
                await stripeService.cancelSubscription();
                console.log('✅ Stripe cancellation successful');
                
                // Wait for database to update
                console.log('⏳ Waiting for database update...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Refresh subscription status
                console.log('🔄 Refreshing subscription status...');
                await refreshSubscription();
                
                console.log('✅ Subscription cancellation completed');
                
                Alert.alert(
                  'Subscription Cancelled',
                  'Your subscription has been cancelled. You will continue to have access to premium features until the end of your current billing period.',
                  [{ text: 'OK' }]
                );
                
              } catch (error: any) {
                console.error('❌ Error canceling subscription:', error);
                console.error('Error details:', {
                  message: error.message,
                  stack: error.stack,
                  response: error.response,
                  name: error.name
                });
                
                Alert.alert(
                  'Cancellation Error',
                  `Failed to cancel subscription: ${error.message || 'Unknown error'}. Please check your internet connection and try again.`,
                  [{ text: 'OK' }]
                );
              } finally {
                setIsCancelingSubscription(false);
              }
            })();
          }
        }
      ]
    );
  };

  // Handle reactivate subscription
  const handleReactivateSubscription = async () => {
    console.log('📱 Reactivate subscription button pressed');
    console.log('📊 Current subscription status:', subscription?.subscription_status);
    
    Alert.alert(
      'Continue Subscription',
      'Would you like to continue your premium subscription? This will reactivate your subscription and you will be charged according to your previous plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue Subscription',
          style: 'default',
          onPress: () => {
            // Use immediate function to handle async properly
            (async () => {
              try {
                console.log('🔄 Starting subscription reactivation...');
                console.log('📊 User subscription data:', subscription);
                setIsReactivatingSubscription(true);
                
                // Reactivate subscription through Stripe
                console.log('📞 Calling stripeService.reactivateSubscription()');
                await stripeService.reactivateSubscription();
                console.log('✅ Stripe reactivation successful');
                
                // Wait for database to update
                console.log('⏳ Waiting for database update...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Refresh subscription status
                console.log('🔄 Refreshing subscription status...');
                await refreshSubscription();
                
                console.log('✅ Subscription reactivation completed');
                
                Alert.alert(
                  'Subscription Reactivated',
                  'Your subscription has been successfully reactivated. Welcome back to premium!',
                  [{ text: 'OK' }]
                );
                
              } catch (error: any) {
                console.error('❌ Error reactivating subscription:', error);
                console.error('Error details:', {
                  message: error.message,
                  stack: error.stack,
                  response: error.response,
                  name: error.name
                });
                
                Alert.alert(
                  'Reactivation Error',
                  `Failed to reactivate subscription: ${error.message || 'Unknown error'}. Please check your internet connection and try again.`,
                  [{ text: 'OK' }]
                );
              } finally {
                setIsReactivatingSubscription(false);
              }
            })();
          }
        }
      ]
    );
  };

  // Handle upgrade plan (monthly to yearly)
  const handleUpgradePlan = async () => {
    Alert.alert(
      'Upgrade to Yearly Plan',
      'Upgrade to our yearly plan and save 17% (2 months free)! You\'ll be charged the prorated difference for the remainder of your current billing period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade to Yearly',
          style: 'default',
          onPress: async () => {
            try {
              setIsCancelingSubscription(true); // Reuse the loading state
              
              // Update subscription through Stripe
              const result = await stripeService.updateSubscriptionPlan('yearly');
              
              if (result.success) {
                // Refresh premium context to get updated status
                await refreshSubscription();
                
                Alert.alert(
                  'Upgrade Successful!',
                  'You\'ve been upgraded to the yearly plan. Thank you for your continued support!',
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error('Upgrade failed');
              }
              
            } catch (error) {
              console.error('Error upgrading subscription:', error);
              Alert.alert(
                'Upgrade Failed',
                'Failed to upgrade your subscription. Please try again or contact support.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsCancelingSubscription(false);
            }
          }
        }
      ]
    );
  };

  // Skills and Certifications Management
  const handleDeleteSkill = async (skillId: string) => {
    Alert.alert(
      'Delete Skill',
      'Are you sure you want to delete this skill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await normalizedShopService.deleteProviderSkill(skillId);
              if (response.success) {
                loadProviderSkills(); // Reload skills
                Alert.alert('Success', 'Skill deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete skill');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete skill');
            }
          }
        }
      ]
    );
  };

  const handleDeleteCertification = async (certId: string) => {
    Alert.alert(
      'Delete Certification',
      'Are you sure you want to delete this certification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await normalizedShopService.deleteProviderCertification(certId);
              if (response.success) {
                loadProviderCertifications(); // Reload certifications
                Alert.alert('Success', 'Certification deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete certification');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete certification');
            }
          }
        }
      ]
    );
  };

  const handleAddSkill = async (skillData?: any) => {
    try {
      const dataToAdd = skillData || newSkill;
      
      // Validate required fields
      if (!dataToAdd.skill_name.trim()) {
        Alert.alert('Validation Error', 'Please enter a skill name');
        return;
      }
      
      const response = await normalizedShopService.addProviderSkill(dataToAdd);
      if (response.success) {
        loadProviderSkills(); // Reload skills
        setShowSkillModal(false);
        // Reset form
        setNewSkill({
          skill_name: '',
          experience_level: 'Beginner',
          years_experience: 0,
          is_certified: false
        });
        Alert.alert('Success', 'Skill added successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to add skill');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add skill');
    }
  };

  const handleAddCertification = async (certData?: any) => {
    try {
      const dataToAdd = certData || newCert;
      
      // Validate required fields
      if (!dataToAdd.certification_name.trim()) {
        Alert.alert('Validation Error', 'Please enter a certification name');
        return;
      }
      if (!dataToAdd.issued_by.trim()) {
        Alert.alert('Validation Error', 'Please enter the issuing organization');
        return;
      }
      if (!dataToAdd.issue_date.trim()) {
        Alert.alert('Validation Error', 'Please enter the issue date');
        return;
      }
      
      const response = await normalizedShopService.addProviderCertification(dataToAdd);
      if (response.success) {
        loadProviderCertifications(); // Reload certifications
        setShowCertModal(false);
        // Reset form
        setNewCert({
          certification_name: '',
          issued_by: '',
          issue_date: '',
          expiry_date: '',
          certificate_number: '',
          verification_url: ''
        });
        Alert.alert('Success', 'Certification added successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to add certification');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add certification');
    }
  };



  // Navigation handlers
  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const handlePrivacyPress = () => {
    navigation.navigate('Privacy');
  };

  const handleHelpCenterPress = () => {
    navigation.navigate('HelpCenter');
  };

  const handleTermsConditionsPress = () => {
    navigation.navigate('TermsConditions');
  };

  const handleRefundPolicyPress = () => {
    navigation.navigate('RefundPolicy');
  };

  const handleMemberAppPress = async () => {
    try {
      const userEmail = profile?.email || user?.email;
      const userId = profile?.id || user?.id;
      
      if (!userEmail || !userId) {
        Alert.alert(
          'Missing Information', 
          'User information is required to switch to the member app.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const appSwitcher = AppSwitcher.getInstance();
      await appSwitcher.switchToMemberApp({
        userEmail,
        userId,
        autoSwitch: true
      });
      
    } catch (error) {
      console.error('Error switching to member app:', error);
      Alert.alert(
        'Switch Failed',
        'Unable to switch to the member app. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // handleBusinessSignupPress removed as Business Signup option was removed

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleEdit = useCallback(() => {
    console.log('🔧 Starting edit mode, current profile:', JSON.stringify(profile, null, 2));
    
    if (profile) {
      // Ensure all required fields have safe defaults
      const safeProfile = {
        ...profile,
        full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User Name',
        email: profile.email || '',
        phone: profile.phone || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        address: profile.address || '',
        bio: profile.bio || '',
        gender: profile.gender || '',
        birth_date: profile.birth_date || '',
        provider_business: profile.provider_business ? {
          ...profile.provider_business,
          name: profile.provider_business.name || '',
          description: profile.provider_business.description || '',
          category: profile.provider_business.category || '',
          address: profile.provider_business.address || '',
          city: profile.provider_business.city || '',
          state: profile.provider_business.state || '',
          country: profile.provider_business.country || '',
          phone: profile.provider_business.phone || '',
          email: profile.provider_business.email || '',
          website_url: profile.provider_business.website_url || ''
        } : null
      };
      
      console.log('🔧 Setting temp profile:', JSON.stringify(safeProfile, null, 2));
      setTempProfile(safeProfile);
      setIsEditing(true);
    } else {
      console.error('❌ No profile data available for editing');
      Alert.alert('Error', 'Profile data not loaded. Please refresh the screen.');
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    if (!tempProfile) return;

    const validateForm = (): boolean => {
      console.log('🔍 Validating form with tempProfile:', JSON.stringify(tempProfile, null, 2));
      
      if (!tempProfile.full_name || !tempProfile.full_name.trim()) {
        console.log('❌ Validation failed: full_name is empty or undefined');
        Alert.alert('Validation Error', 'Please enter your name');
        return false;
      }
      if (!tempProfile.email || !/^\S+@\S+\.\S+$/.test(tempProfile.email)) {
        console.log('❌ Validation failed: email is invalid');
        Alert.alert('Validation Error', 'Please enter a valid email address');
        return false;
      }
      if (!tempProfile.phone || !tempProfile.phone.trim()) {
        console.log('❌ Validation failed: phone is empty or undefined');
        Alert.alert('Validation Error', 'Please enter your phone number');
        return false;
      }
      
      console.log('✅ Form validation passed');
      return true;
    };

    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      
      // Split the update into user profile and provider business
      // Clean up data - convert empty strings to null for optional fields, keep required fields as strings
      const userProfileData = {
        first_name: tempProfile.first_name || '',
        last_name: tempProfile.last_name || '',
        full_name: tempProfile.full_name || '',
        phone: tempProfile.phone || '',
        address: tempProfile.address?.trim() || null,
        bio: tempProfile.bio?.trim() || null,
        avatar_url: tempProfile.avatar_url?.trim() || null,
        gender: tempProfile.gender?.trim() || null,
        birth_date: tempProfile.birth_date?.trim() || null
      };

      // Update user profile
      const userResponse = await normalizedShopService.updateUserProfile(userProfileData);
      
      if (!userResponse.success) {
        throw new Error(userResponse.error || 'Failed to update user profile');
      }

      // Update provider business if it exists
      if (tempProfile.provider_business && tempProfile.account_type === 'provider') {
        const businessData = {
          name: tempProfile.provider_business.name || '',
          description: tempProfile.provider_business.description?.trim() || null,
          category: tempProfile.provider_business.category?.trim() || null,
          address: tempProfile.provider_business.address?.trim() || null,
          city: tempProfile.provider_business.city?.trim() || null,
          state: tempProfile.provider_business.state?.trim() || null,
          country: tempProfile.provider_business.country?.trim() || null,
          phone: tempProfile.provider_business.phone?.trim() || null,
          email: tempProfile.provider_business.email?.trim() || null,
          website_url: tempProfile.provider_business.website_url?.trim() || null
        };

        const businessResponse = await normalizedShopService.updateProviderBusiness(businessData);
        
        if (!businessResponse.success) {
          throw new Error(businessResponse.error || 'Failed to update business profile');
        }
      }

      // Reload the profile to get the updated data
      const profileResponse = await normalizedShopService.getUserProfile();
      
      if (profileResponse.success) {
        setProfile(profileResponse.data);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error('Failed to reload profile');
      }
      
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [tempProfile]);

  const handleCancel = () => {
    setIsEditing(false);
    setTempProfile(null);
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    if (tempProfile) {
      setTempProfile(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const updateProviderField = (field: string, value: any) => {
    if (tempProfile && tempProfile.provider_business) {
      setTempProfile(prev => prev ? {
        ...prev,
        provider_business: {
          ...prev.provider_business!,
          [field]: value
        }
      } : null);
    }
  };

  const updateConsumerField = (field: string, value: any) => {
    if (tempProfile && tempProfile.consumer_details) {
      setTempProfile(prev => prev ? {
        ...prev,
        consumer_details: {
          ...prev.consumer_details!,
          [field]: value
        }
      } : null);
    }
  };

  const handleChoosePhoto = useCallback(async () => {
    try {
      const imageUri = await showImagePickerOptions();
      if (imageUri && userId) {
        console.log('📷 Selected image URI:', imageUri);
        
        // Show upload progress
        setIsUploadingImage(true);
        setUploadProgress({
          uploading: true,
          message: 'Uploading profile image...',
          progress: 0
        });
        
        try {
          // First try to upload to user-avatars bucket
          console.log('📷 Starting profile image upload to user-avatars bucket:', imageUri);
          let uploadResult = await ImageUploadService.uploadImage(imageUri, 'user-avatars', 'profiles');
          
          // If that fails, try avatars bucket as fallback
          if (!uploadResult.success) {
            console.log('📷 Retrying with avatars bucket as fallback:', imageUri);
            uploadResult = await ImageUploadService.uploadImage(imageUri, 'avatars', 'profiles');
          }
          
          if (uploadResult.success && uploadResult.data) {
            console.log('✅ Profile image uploaded successfully:', uploadResult.data);
            
            const uploadedUrl = uploadResult.data;
            
            // Update tempProfile if it exists (editing mode)
            if (tempProfile) {
              setTempProfile(prev => prev ? { ...prev, avatar_url: uploadedUrl } : null);
            }
            
            // Also update the main profile
            setProfile(prev => prev ? { ...prev, avatar_url: uploadedUrl } : null);
            
            // Reset image error state
            setProfileImageError(false);
            
            // Show success message
            setUploadProgress({
              uploading: false,
              message: '✅ Profile image uploaded successfully!',
              progress: 100
            });
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              setUploadProgress(prev => ({ ...prev, message: '' }));
            }, 3000);
            
            return true;
          } else {
            console.warn('⚠️ Profile image upload failed:', uploadResult.error);
            
            // Fall back to local URI for immediate display
            if (tempProfile) {
              setTempProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
            }
            setProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
            
            setUploadProgress({
              uploading: false,
              message: '⚠️ Upload failed, using local image: ' + (uploadResult.error || 'Unknown error'),
              progress: 0
            });
            
            return true;
          }
        } catch (uploadError: any) {
          console.error('❌ Profile image upload error:', uploadError);
          
          // Fall back to local URI for immediate display
          if (tempProfile) {
            setTempProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
          }
          setProfile(prev => prev ? { ...prev, avatar_url: imageUri } : null);
          
          setUploadProgress({
            uploading: false,
            message: '⚠️ Upload error, using local image: ' + (uploadError.message || 'Network error'),
            progress: 0
          });
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error in image picker:', error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
      return false;
    } finally {
      setIsUploadingImage(false);
    }
  }, [showImagePickerOptions, tempProfile, userId]);






  const renderField = (label: string, field: keyof ProfileData, isTextArea = false, isReadOnly = false) => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile) return null;

    // Handle nested fields properly
    let value = currentProfile[field];
    if (field === 'full_name' && !value) {
      value = `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim();
    }

    const handleVerificationPress = () => {
      if (field === 'email') {
        Alert.alert(
          'Email Verification Required',
          'To change your email address, please verify your new email. This helps keep your account secure.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Email', onPress: () => {
              // Navigate to email verification or show verification modal
              Alert.alert('Feature Coming Soon', 'Email verification feature will be available soon.');
            }}
          ]
        );
      } else if (field === 'phone') {
        Alert.alert(
          'Phone Verification Required', 
          'To change your phone number, please verify your new number via SMS. This helps keep your account secure.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Phone', onPress: () => {
              // Navigate to phone verification or show verification modal
              Alert.alert('Feature Coming Soon', 'Phone verification feature will be available soon.');
            }}
          ]
        );
      }
    };

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing && !isReadOnly ? (
          <TextInput
            style={[styles.input, isTextArea && styles.textArea]}
            value={String(value || '')}
            onChangeText={(text) => updateField(field, text)}
            multiline={isTextArea}
            numberOfLines={isTextArea ? 3 : 1}
          />
        ) : (
          <View style={styles.readOnlyContainer}>
            <Text style={[styles.value, isReadOnly && styles.readOnlyValue]}>
              {value || 'Not provided'}
            </Text>
            {isReadOnly && isEditing && (
              <TouchableOpacity 
                style={styles.verifyButton}
                onPress={handleVerificationPress}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#1A2533" />
                <Text style={styles.verifyButtonText}>Verify to change</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderProviderField = (label: string, field: string, isTextArea = false, fieldType: 'text' | 'boolean' | 'numeric' = 'text') => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile) return null;

    // Initialize provider_business if it doesn't exist
    if (!currentProfile.provider_business) {
      currentProfile.provider_business = {
        id: '',
        name: '',
        category: '',
        description: '',
        is_verified: false,
                created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    const value = currentProfile.provider_business[field as keyof typeof currentProfile.provider_business];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          fieldType === 'boolean' ? (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => updateProviderField(field, !value)}
            >
              <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                {value && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                {value ? 'Yes' : 'No'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={[styles.input, isTextArea && styles.textArea]}
              value={String(value || '')}
              onChangeText={(text) => updateProviderField(field, text)}
              multiline={isTextArea}
              numberOfLines={isTextArea ? 3 : 1}
              keyboardType={fieldType === 'numeric' ? 'numeric' : 'default'}
            />
          )
        ) : (
          <Text style={styles.value}>
            {fieldType === 'boolean' 
              ? (value ? 'Yes' : 'No')
              : String(value || 'Not provided')
            }
          </Text>
        )}
      </View>
    );
  };

  const renderConsumerField = (label: string, field: string, isTextArea = false) => {
    const currentProfile = isEditing ? tempProfile : profile;
    if (!currentProfile || !currentProfile.consumer_details) return null;

    const value = currentProfile.consumer_details[field as keyof typeof currentProfile.consumer_details];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, isTextArea && styles.textArea]}
            value={Array.isArray(value) ? value.join(', ') : String(value)}
            onChangeText={(text) => updateConsumerField(field, field === 'preferred_services' ? text.split(', ') : text)}
            multiline={isTextArea}
            numberOfLines={isTextArea ? 3 : 1}
          />
        ) : (
          <Text style={styles.value}>
            {Array.isArray(value) ? value.join(', ') : value || 'Not provided'}
          </Text>
        )}
      </View>
    );
  };


  const renderEmptyInvoices = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={accountType === 'provider' ? 'card-outline' : 'receipt-outline'} 
        size={64} 
        color="#D1D5DB" 
      />
      <Text style={styles.emptyTitle}>
        {accountType === 'provider' ? 'No payments yet' : 'No invoices yet'}
      </Text>
      <Text style={styles.emptyDescription}>
        {accountType === 'provider' 
          ? 'Your payment history will appear here once you complete jobs.'
          : 'Your service invoices will appear here when you book services.'
        }
      </Text>
    </View>
  );


  const renderSubscriptionSection = () => {
    if (accountType !== 'provider') return null;

    // Show upgrade prompt for non-premium users
    if (!isPremium) {
      return (
        <TouchableOpacity 
          style={styles.upgradePrompt}
          onPress={() => setShowUpgradeModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.upgradePromptContent}>
            <View style={styles.upgradePromptIcon}>
              <Ionicons name="star" size={20} color="#1A2533" />
            </View>
            <View style={styles.upgradePromptText}>
              <Text style={styles.upgradePromptTitle}>
                Upgrade to Premium
              </Text>
              <Text style={styles.upgradePromptSubtitle}>
                Unlock unlimited features and premium tools
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1A2533" />
          </View>
        </TouchableOpacity>
      );
    }

    // Show subscription management for premium users
    return (
      <View style={styles.subscriptionSection}>
        {/* Premium status indicator */}
        <View style={styles.premiumStatusCard}>
          <View style={styles.premiumStatusHeader}>
            <View style={styles.premiumStatusIcon}>
              <Ionicons name="star" size={20} color="#1A2533" />
            </View>
            <View style={styles.premiumStatusText}>
              <Text style={styles.premiumStatusTitle}>Premium Active</Text>
              <Text style={styles.premiumStatusSubtitle}>
                {subscription?.subscription_status === 'cancelled' 
                  ? `Cancelled - access until ${subscription?.subscription_end_date 
                      ? new Date(subscription.subscription_end_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })
                      : 'period end'}`
                  : 'All premium features unlocked'
                }
              </Text>
            </View>
          </View>
          
          {/* Subscription details */}
          {subscription && (
            <View style={styles.subscriptionDetails}>
              <Text style={styles.subscriptionDetailText}>
                Plan: {subscription.subscription_type === 'monthly' ? 'Monthly' : 'Yearly'} Pro
              </Text>
              {subscription.subscription_end_date && (
                <Text style={styles.subscriptionDetailText}>
                  {subscription.subscription_status === 'cancelled' 
                    ? `Access until: ${new Date(subscription.subscription_end_date).toLocaleDateString()}`
                    : `Renews: ${new Date(subscription.subscription_end_date).toLocaleDateString()}`
                  }
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Upgrade button for monthly subscribers */}
        {subscription?.subscription_type === 'monthly' && subscription?.subscription_status !== 'cancel_at_period_end' && (
          <TouchableOpacity 
            style={styles.upgradePlanButton}
            onPress={handleUpgradePlan}
            disabled={isCancelingSubscription}
            activeOpacity={0.8}
          >
            {isCancelingSubscription ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up-circle-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.upgradePlanText}>
              Upgrade to Yearly (Save 17%)
            </Text>
          </TouchableOpacity>
        )}

        {/* Cancel subscription button - only show if not cancelled */}
        {subscription?.subscription_status !== 'cancel_at_period_end' && subscription?.subscription_status !== 'cancelled' && (
          <TouchableOpacity 
            style={styles.cancelSubscriptionButton}
            onPress={handleCancelSubscription}
            disabled={isCancelingSubscription}
            activeOpacity={0.8}
          >
            {isCancelingSubscription ? (
              <ActivityIndicator size="small" color="#845EC2" />
            ) : (
              <Ionicons name="close-circle-outline" size={20} color="#845EC2" />
            )}
            <Text style={styles.cancelSubscriptionText}>
              {isCancelingSubscription ? 'Processing...' : 'Cancel Subscription'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Reactivate subscription button - only show if cancelled */}
        {subscription?.subscription_status === 'cancelled' && (
          <TouchableOpacity 
            style={styles.reactivateSubscriptionButton}
            onPress={handleReactivateSubscription}
            disabled={isReactivatingSubscription}
            activeOpacity={0.8}
          >
            {isReactivatingSubscription ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Ionicons name="refresh-circle-outline" size={20} color="#059669" />
            )}
            <Text style={styles.reactivateSubscriptionText}>
              {isReactivatingSubscription ? 'Processing...' : 'Continue Subscription'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };




  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#845EC2" />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentProfile = isEditing ? tempProfile : profile;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
      <CancellationBanner />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        {/* Switch Mode button hidden in partner app */}
      </View>

      {/* Account Type Indicator */}
      <View style={styles.accountTypeIndicator}>
        <View style={[
          styles.accountTypeBadge,
          accountType === 'provider' && styles.providerBadge
        ]}>
          <Ionicons 
            name={accountType === 'provider' ? 'briefcase' : 'person'} 
            size={16} 
            color="#1A2533"
          />
          <Text style={[
            styles.accountTypeText,
            accountType === 'provider' && styles.providerBadgeText
          ]}>
            {accountType === 'provider' ? 'Qwiken Partner' : 'Qwiken Member'}
          </Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#1A2533" />
              <Text style={styles.premiumText}>PRO</Text>
            </View>
          )}
        </View>
      </View>


      {/* Content */}
      <ScrollView style={styles.content}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: '#1A2533', justifyContent: 'center', alignItems: 'center' }]}>
              {currentProfile?.avatar_url && !profileImageError ? (
                <Image 
                  source={{ uri: currentProfile.avatar_url }} 
                  style={[styles.avatar, { position: 'absolute' }]}
                  onError={(error) => {
                    console.log('Error loading profile image:', error.nativeEvent?.error || 'Unknown error');
                    setProfileImageError(true);
                  }}
                  onLoad={() => {
                    console.log('Profile image loaded successfully');
                    setProfileImageError(false);
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: 'white', fontSize: 40, fontWeight: 'bold' }}>
                  {currentProfile?.full_name ? currentProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            {isEditing && (
              <TouchableOpacity 
                style={[
                  styles.editPhotoButton,
                  (isUploadingImage || uploadProgress.uploading) && styles.editPhotoButtonDisabled
                ]}
                onPress={handleChoosePhoto}
                disabled={isSaving || isImageLoading || isUploadingImage || uploadProgress.uploading}
              >
                {isSaving || isImageLoading || isUploadingImage || uploadProgress.uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
            
            {/* Upload Progress Message */}
            {uploadProgress.message && (
              <View style={styles.uploadProgressContainer}>
                <Text style={[
                  styles.uploadProgressText,
                  { color: uploadProgress.message.includes('✅') ? '#1A2533' : 
                           uploadProgress.message.includes('⚠️') ? '#FFA500' : '#333' }
                ]}>
                  {uploadProgress.message}
                </Text>
              </View>
            )}
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            {renderField('First Name', 'first_name')}
            {renderField('Last Name', 'last_name')}
            {renderField('Email', 'email', false, true)}
            {renderField('Phone', 'phone', false, true)}
            {renderField('Address', 'address')}
            {renderField('Bio', 'bio', true)}
            
            {/* Location Information */}
            {currentProfile?.location && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Location</Text>
                <Text style={styles.value}>
                  {currentProfile.location.city}, {currentProfile.location.state}, {currentProfile.location.country}
                </Text>
              </View>
            )}
          </View>

          {/* Account-specific fields */}
          {accountType === 'provider' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Provider Information</Text>
              {renderProviderField('Business Name', 'name')}
              {renderProviderField('Service Category', 'category')}
              {renderProviderField('Business Description', 'description', true)}
              {renderProviderField('Website URL', 'website_url')}
              
              {/* Skills Management */}
              <View style={styles.fieldContainer}>
                <View style={styles.managementHeader}>
                  <Text style={styles.label}>Skills</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowSkillModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#1A2533" />
                    <Text style={styles.addButtonText}>Add Skill</Text>
                  </TouchableOpacity>
                </View>
                {isLoadingSkills ? (
                  <ActivityIndicator size="small" color="#1A2533" />
                ) : providerSkills.length > 0 ? (
                  <View style={styles.skillsList}>
                    {providerSkills.map((skill, index) => (
                      <View key={skill.id || index} style={styles.skillItem}>
                        <View style={styles.skillInfo}>
                          <Text style={styles.skillName}>{skill.skill_name}</Text>
                          <Text style={styles.skillLevel}>
                            {skill.experience_level} • {skill.years_experience || 0} years
                            {skill.is_certified && ' • Certified'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteSkill(skill.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#845EC2" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.value}>No skills added yet</Text>
                )}
              </View>
              
              {/* Certifications Management */}
              <View style={styles.fieldContainer}>
                <View style={styles.managementHeader}>
                  <Text style={styles.label}>Certifications</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowCertModal(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#1A2533" />
                    <Text style={styles.addButtonText}>Add Certification</Text>
                  </TouchableOpacity>
                </View>
                {isLoadingCerts ? (
                  <ActivityIndicator size="small" color="#1A2533" />
                ) : providerCertifications.length > 0 ? (
                  <View style={styles.certsList}>
                    {providerCertifications.map((cert, index) => (
                      <View key={cert.id || index} style={styles.certItem}>
                        <View style={styles.certInfo}>
                          <Text style={styles.certName}>{cert.certification_name}</Text>
                          <Text style={styles.certDetails}>
                            {cert.issued_by} • {new Date(cert.issue_date).getFullYear()}
                            {cert.is_verified && ' • Verified'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteCertification(cert.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#845EC2" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.value}>No certifications added yet</Text>
                )}
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Account Status</Text>
                <Text style={styles.value}>
                  Verified: {currentProfile?.provider_business?.is_verified ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          )}

          {accountType === 'consumer' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consumer Information</Text>
              
              {/* Personal Information for Consumers */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Gender</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={currentProfile?.gender || ''}
                    onChangeText={(text) => updateField('gender', text)}
                    placeholder="e.g., Male, Female, Non-binary, Prefer not to say"
                  />
                ) : (
                  <Text style={styles.value}>{currentProfile?.gender || 'Not specified'}</Text>
                )}
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={currentProfile?.birth_date || ''}
                    onChangeText={(text) => updateField('birth_date', text)}
                    placeholder="YYYY-MM-DD"
                  />
                ) : (
                  <Text style={styles.value}>
                    {currentProfile?.birth_date 
                      ? new Date(currentProfile.birth_date).toLocaleDateString('en-NZ', {
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric'
                        })
                      : 'Not provided'
                    }
                  </Text>
                )}
              </View>

              {/* Service Preferences */}
              <Text style={styles.subsectionTitle}>Service Preferences</Text>
              {renderConsumerField('Budget Range', 'budget_range')}
              {renderConsumerField('Location Preference', 'location_preference')}
              
              {/* Preferred Services from consumer_preferred_services table */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Preferred Services</Text>
                <Text style={styles.value}>
                  {currentProfile?.consumer_details?.consumer_preferred_services?.length > 0
                    ? currentProfile.consumer_details.consumer_preferred_services
                        .map(service => service.service_category)
                        .join(', ')
                    : 'No preferred services set'
                  }
                </Text>
              </View>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Service History & Stats</Text>
                <Text style={styles.value}>
                  Services Booked: {currentProfile?.consumer_details?.service_history || 0}
                </Text>
                <Text style={styles.value}>
                  Total Spent: ${currentProfile?.consumer_details?.total_spent || 0}
                </Text>
                <Text style={styles.value}>
                  Average Rating Given: {currentProfile?.consumer_details?.average_rating_given || 0}/5
                </Text>
              </View>
            </View>
          )}

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleNotificationsPress}>
              <Ionicons name="notifications-outline" size={20} color="#1A2533" />
              <Text style={styles.preferenceText}>Notifications</Text>
              {notificationCount > 0 && (
                <View style={styles.preferenceNotificationBadge}>
                  <Text style={styles.preferenceNotificationText}>{notificationCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            {/* Payment Methods removed as requested */}
            <TouchableOpacity style={styles.preferenceItem} onPress={handlePrivacyPress}>
              <Ionicons name="lock-closed-outline" size={20} color="#1A2533" />
              <Text style={styles.preferenceText}>Privacy</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleMemberAppPress}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#1A2533" />
              <Text style={styles.preferenceText}>Switch to Member App</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleHelpCenterPress}>
              <Ionicons name="help-circle-outline" size={20} color="#1A2533" />
              <Text style={styles.preferenceText}>Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleTermsConditionsPress}>
              <Ionicons name="document-text-outline" size={20} color="#1A2533" />
              <Text style={styles.preferenceText}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.preferenceItem} onPress={handleRefundPolicyPress}>
              <Ionicons name="card-outline" size={20} color="#1A2533" />
              <Text style={styles.preferenceText}>Refund Policy</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
            {/* Business Signup removed as requested */}
          </View>

          {/* Subscription Section */}
          {renderSubscriptionSection()}

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>

      {/* Bottom Action Buttons */}
          {isEditing ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.saveButton, 
                  isSaving && styles.disabledButton,
                  accountType === 'provider' && styles.providerSaveButton
                ]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.editButton,
                accountType === 'provider' && styles.providerEditButton
              ]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}


      {/* Account switch modal removed for partner app */}
      
      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        title="Upgrade to Pro"
        subtitle="Unlock unlimited payments and premium business features"
        hiddenCount={0}
        features={[
          {
            icon: 'card-outline',
            iconColor: '#1A2533',
            title: 'Unlimited Payment History',
            description: 'View all your payments and earnings without any restrictions'
          },
          {
            icon: 'trending-up-outline',
            iconColor: '#10B981',
            title: 'Advanced Analytics',
            description: 'Detailed income reports, earning trends, and business insights'
          },
          {
            icon: 'document-text-outline',
            iconColor: '#1A2533',
            title: 'Professional Invoices',
            description: 'Custom branded invoices with digital signatures and templates'
          },
          {
            icon: 'notifications-outline',
            iconColor: '#F97316',
            title: 'Priority Support',
            description: 'Fast-track customer support and business consultation'
          }
        ]}
      />

      {/* Add Skill Modal */}
      <Modal
        visible={showSkillModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Skill</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowSkillModal(false);
                // Reset form when closing
                setNewSkill({
                  skill_name: '',
                  experience_level: 'Beginner',
                  years_experience: 0,
                  is_certified: false
                });
              }}
            >
              <Ionicons name="close" size={24} color="#1A2533" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {/* Skill Name */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Skill Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newSkill.skill_name}
                onChangeText={(text) => setNewSkill(prev => ({...prev, skill_name: text}))}
                placeholder="e.g., React Native Development"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Experience Level */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Experience Level *</Text>
              <View style={styles.pickerContainer}>
                {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.pickerOption,
                      newSkill.experience_level === level && styles.pickerOptionSelected
                    ]}
                    onPress={() => setNewSkill(prev => ({...prev, experience_level: level as any}))}
                  >
                    <Text style={[
                      styles.pickerText,
                      newSkill.experience_level === level && styles.pickerTextSelected
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Years of Experience */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Years of Experience</Text>
              <TextInput
                style={styles.formInput}
                value={newSkill.years_experience.toString()}
                onChangeText={(text) => setNewSkill(prev => ({...prev, years_experience: parseInt(text) || 0}))}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Is Certified */}
            <View style={styles.formField}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setNewSkill(prev => ({...prev, is_certified: !prev.is_certified}))}
              >
                <View style={[styles.checkbox, newSkill.is_certified && styles.checkboxChecked]}>
                  {newSkill.is_certified && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>I have certification for this skill</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => {
                  setShowSkillModal(false);
                  setNewSkill({
                    skill_name: '',
                    experience_level: 'Beginner',
                    years_experience: 0,
                    is_certified: false
                  });
                }}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.addActionButton]}
                onPress={() => handleAddSkill()}
              >
                <Text style={styles.addActionText}>Add Skill</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Certification Modal */}
      <Modal
        visible={showCertModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Certification</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowCertModal(false);
                // Reset form when closing
                setNewCert({
                  certification_name: '',
                  issued_by: '',
                  issue_date: '',
                  expiry_date: '',
                  certificate_number: '',
                  verification_url: ''
                });
              }}
            >
              <Ionicons name="close" size={24} color="#1A2533" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {/* Certification Name */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Certification Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.certification_name}
                onChangeText={(text) => setNewCert(prev => ({...prev, certification_name: text}))}
                placeholder="e.g., Professional Mobile Developer"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Issued By */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Issued By *</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.issued_by}
                onChangeText={(text) => setNewCert(prev => ({...prev, issued_by: text}))}
                placeholder="e.g., Tech Certification Board"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Issue Date */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Issue Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.issue_date}
                onChangeText={(text) => setNewCert(prev => ({...prev, issue_date: text}))}
                placeholder="2024-01-15"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Expiry Date */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.expiry_date}
                onChangeText={(text) => setNewCert(prev => ({...prev, expiry_date: text}))}
                placeholder="2027-01-15 (optional)"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Certificate Number */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Certificate Number</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.certificate_number}
                onChangeText={(text) => setNewCert(prev => ({...prev, certificate_number: text}))}
                placeholder="e.g., PMD-2024-001"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Verification URL */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Verification URL</Text>
              <TextInput
                style={styles.formInput}
                value={newCert.verification_url}
                onChangeText={(text) => setNewCert(prev => ({...prev, verification_url: text}))}
                placeholder="https://verify.example.com/cert123"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => {
                  setShowCertModal(false);
                  setNewCert({
                    certification_name: '',
                    issued_by: '',
                    issue_date: '',
                    expiry_date: '',
                    certificate_number: '',
                    verification_url: ''
                  });
                }}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.addActionButton]}
                onPress={() => handleAddCertification()}
              >
                <Text style={styles.addActionText}>Add Certification</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// Fixed styles with consistent color palette
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Changed to match app background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0FFFE', // Changed from white to app background
    // Removed borderBottomWidth to eliminate separator line
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A2533',
  },
  switchAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0FFFE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  providerSwitchButton: {
    backgroundColor: '#F0FFFE',
    borderColor: '#F5F5E9',
  },
  switchAccountText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
    marginLeft: 6,
  },
  providerSwitchText: {
    color: '#1A2533',
  },
  accountTypeIndicator: {
    backgroundColor: '#F0FFFE', // Changed from white to app background
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Removed borderBottomWidth
  },
  accountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FFFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  providerBadge: {
    backgroundColor: '#F0FFFE',
    borderColor: '#F5F5E9',
  },
  accountTypeText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '600',
    marginLeft: 8,
  },
  providerBadgeText: {
    color: '#1A2533',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2533',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  premiumText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0FFFE', // Changed from white to app background
    // Removed borderBottomWidth
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1A2533',
  },
  tabIconContainer: {
    position: 'relative',
    marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    color: '#1A2533',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#1A2533',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
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
    color: '#1A2533',
    textAlign: 'center',
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
    color: '#845EC2',
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#F5F5E9',
    backgroundColor: '#F3F4F6',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#1A2533',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editPhotoButtonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
  uploadProgressContainer: {
    marginTop: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  uploadProgressText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: '#1A2533',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5E9',
  },
  input: {
    fontSize: 16,
    color: '#1A2533',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5F5E9',
    ...Platform.select({
      ios: {
        paddingVertical: 12,
      },
      android: {
        paddingVertical: 8,
      },
    }),
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#FFFBF7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 20,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5E9',
  },
  ratingText: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '600',
    marginLeft: 6,
  },
  ratingSubText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFBF7',
  },
  preferenceText: {
    flex: 1,
    fontSize: 15,
    color: '#1A2533',
    marginLeft: 12,
  },
  preferenceNotificationBadge: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  preferenceNotificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },
  logoutButton: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
    marginBottom: 100,
  },
  logoutText: {
    color: '#845EC2',
    fontSize: 16,
    fontWeight: '600',
  },
  // Invoice Styles
  invoicesContainer: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Changed from #F8FAFC to app background
  },
  invoicesContent: {
    flex: 1,
  },
  invoicesList: {
    padding: 16,
  },
  invoiceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFFBF7',
  },
  newInvoiceItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#1A2533',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  invoiceDate: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 2,
  },
  invoiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1A2533',
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  invoiceDescription: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 12,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#F0FFFE',
  },
  statusOverdue: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextPaid: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextOverdue: {
    color: '#991B1B',
  },
  // Upgrade Prompt Styles
  upgradePrompt: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1A2533',
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  upgradePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradePromptIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F0FFFE',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradePromptText: {
    flex: 1,
  },
  upgradePromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  upgradePromptSubtitle: {
    fontSize: 14,
    color: '#1A2533',
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Changed from #F8FAFC to app background
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  invoiceDetail: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFFBF7',
  },
  detailLabel: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  paidButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  contactButton: {
    backgroundColor: '#F0FFFE',
    borderColor: '#F5F5E9',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 8,
  },
  paidButtonText: {
    color: '#FFFFFF',
  },
  contactButtonText: {
    color: '#1A2533',
  },
  // Bottom Action Buttons
  editButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1A2533',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerEditButton: {
    backgroundColor: '#1A2533',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#F0FFFE',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  saveButton: {
    backgroundColor: '#1A2533',
    marginLeft: 8,
  },
  providerSaveButton: {
    backgroundColor: '#1A2533',
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#1A2533',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  // New styles for read-only fields and verification
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyValue: {
    flex: 1,
    color: '#1A2533',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5E9',
    marginLeft: 12,
  },
  verifyButtonText: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Checkbox styles for boolean fields
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  // Skills and Certifications Management Styles
  managementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5E9',
  },
  addButtonText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
    marginLeft: 4,
  },
  skillsList: {
    marginTop: 8,
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  skillLevel: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  certsList: {
    marginTop: 8,
  },
  certItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  certInfo: {
    flex: 1,
  },
  certName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  certDetails: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 2,
  },
  // Form styles for modals
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A2533',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pickerOptionSelected: {
    backgroundColor: '#F0FFFE',
    borderColor: '#1A2533',
  },
  pickerText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  pickerTextSelected: {
    color: '#1A2533',
    fontWeight: '600',
  },
  // Modal action buttons
  cancelActionButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  addActionButton: {
    backgroundColor: '#1A2533',
    borderWidth: 1,
    borderColor: '#1A2533',
  },
  cancelActionText: {
    color: '#1A2533',
    fontWeight: '600',
  },
  addActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Subscription Section Styles
  subscriptionSection: {
    marginBottom: 16,
  },
  premiumStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#1A2533',
  },
  premiumStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumStatusIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F0FFFE',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumStatusText: {
    flex: 1,
  },
  premiumStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 2,
  },
  premiumStatusSubtitle: {
    fontSize: 14,
    color: '#1A2533',
  },
  subscriptionDetails: {
    backgroundColor: '#F0FFFE',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  subscriptionDetailText: {
    fontSize: 14,
    color: '#1A2533',
  },
  cancelSubscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#845EC2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    gap: 8,
  },
  cancelSubscriptionText: {
    fontSize: 16,
    color: '#845EC2',
    fontWeight: '500',
  },
  reactivateSubscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    gap: 8,
  },
  reactivateSubscriptionText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '500',
  },
  upgradePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#1A2533',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradePlanText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ProfileScreen;