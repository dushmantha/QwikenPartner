// navigation/AppNavigator.tsx - FINAL FIXED VERSION

import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, ActivityIndicator, View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotificationService from '../services/pushNotificationService';

// FIXED IMPORTS - Use named imports from the corrected service
import { supabase, authService } from '../lib/supabase/index';
import type { User, Session } from '@supabase/supabase-js';
import api from '../services/api/auth';
import { usePremium } from '../contexts/PremiumContext';
import { QueueBadgeProvider, useQueueBadge } from '../contexts/QueueBadgeContext';
import SplashScreen from '../screens/SplashScreen';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import ServiceListScreen from '../screens/ServiceListScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import BookingSummaryScreen from '../screens/BookingSummaryScreen';
import BookingDateTimeScreen from '../screens/BookingDateTimeScreen';
import BookingDateTimeEnhancedScreen from '../screens/BookingDateTimeScreenEnhanced';
import BookingsScreen from '../screens/BookingsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';

import AllReviewsScreen from '../screens/AllReviewsScreen';

// Provider-specific screens
import ProviderHomeScreen from '../screens/provider/ProviderHomeScreen';
import ServiceQueueScreen from '../screens/provider/ServiceQueueScreen';
import ServiceManagementScreen from '../screens/provider/ServiceManagementScreen';
import EarningsScreen from '../screens/provider/EarningsScreen';
import ShopDetailsScreen from '../screens/provider/ShopDetailsScreen';
import ServiceOptionsScreen from '../screens/provider/ServiceOptionsScreen';
import InvoiceGeneratorScreen from '../screens/provider/InvoiceGeneratorScreen';
import CustomersScreen from '../screens/provider/CustomersScreen';
import AnalyticsScreen from '../screens/provider/AnalyticsScreen';

// Profile related screens
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import TermsConditionsScreen from '../screens/TermsConditionsScreen';
import RefundPolicyScreen from '../screens/RefundPolicyScreen';
import BusinessSignupScreen from '../screens/BusinessSignupScreen';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Import Service type with fallback
let Service;
try {
  Service = require('../services/types/service').Service;
} catch (error) {
  // Fallback if service types don't exist
  console.warn('Service types not found, using fallback');
}

// ==============================================
// AUTH CONTEXT (Supabase Integration)
// ==============================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forceCheckSession: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  forceCheckSession: async () => {},
  sendPasswordResetEmail: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Auth Provider Component with Supabase - FIXED VERSION
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session with proper error handling
    const getInitialSession = async () => {
      const startTime = Date.now();
      const minSplashTime = 2000; // Show splash for at least 2 seconds

      try {
        console.log('🔄 Getting initial session at app startup...');

        // Check if supabase is properly imported
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        // Get the current session from Supabase
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error getting initial session:', error);
          // Clear any invalid session
          if (mounted) {
            setSession(null);
            setUser(null);
          }
        } else {
          console.log('📱 Initial session found:', initialSession?.user?.email || 'No session');
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
          }
        }
      } catch (error) {
        console.error('❌ Critical error getting initial session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          // Ensure splash screen shows for minimum time
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minSplashTime - elapsedTime);

          setTimeout(() => {
            if (mounted) {
              setIsLoading(false);
              console.log('✅ Auth initialization complete');
            }
          }, remainingTime);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes with proper handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        console.log('🔐 Auth state changed:', event, currentSession?.user?.email || 'No user');
        console.log('🔐 Session exists:', !!currentSession);
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ SIGNED_IN event - User logged in');
            if (currentSession) {
              setSession(currentSession);
              setUser(currentSession.user);
              setIsLoading(false);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('👋 SIGNED_OUT event - User logged out');
            setSession(null);
            setUser(null);
            setIsLoading(false);
            // Clear all AsyncStorage data related to auth
            try {
              const keys = await AsyncStorage.getAllKeys();
              const authKeys = keys.filter(key => 
                key.includes('supabase') || 
                key.includes('profile') || 
                key.includes('accountType')
              );
              if (authKeys.length > 0) {
                await AsyncStorage.multiRemove(authKeys);
                console.log('🗑️ Cleared auth-related AsyncStorage keys');
              }
            } catch (error) {
              console.error('Error clearing AsyncStorage:', error);
            }
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 TOKEN_REFRESHED event');
            if (currentSession) {
              setSession(currentSession);
              setUser(currentSession.user);
            }
            break;
            
          case 'USER_UPDATED':
            console.log('👤 USER_UPDATED event');
            if (currentSession) {
              setSession(currentSession);
              setUser(currentSession.user);
            }
            break;
            
          default:
            console.log('🔐 Other auth event:', event);
        }
        
        // Always ensure loading is false after auth events
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('👋 Starting sign out process...');
      setIsLoading(true);
      
      // Clear AsyncStorage FIRST before signing out from Supabase
      console.log('🗑️ Step 1: Clearing all cached data...');
      try {
        const keys = await AsyncStorage.getAllKeys();
        const keysToRemove = keys.filter(key => 
          key.includes('supabase') ||
          key.includes('profile') || 
          key.includes('accountType') ||
          key.includes('user') ||
          key.includes('cached')
        );
        
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
          console.log('✅ Cleared AsyncStorage keys:', keysToRemove.length, 'items');
        }
      } catch (cacheError) {
        console.error('⚠️ Error clearing cache (non-critical):', cacheError);
      }
      
      // Clear local state BEFORE calling Supabase signOut
      console.log('🔄 Step 2: Clearing local state...');
      setSession(null);
      setUser(null);
      
      // Now sign out from Supabase
      console.log('🔐 Step 3: Signing out from Supabase...');
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error('⚠️ Supabase signOut error (continuing anyway):', error);
        } else {
          console.log('✅ Successfully signed out from Supabase');
        }
      } catch (supabaseError) {
        console.error('⚠️ Supabase signOut exception (continuing anyway):', supabaseError);
      }
      
      console.log('✅ Sign out process completed');
      
    } catch (error) {
      console.error('❌ Unexpected sign out error:', error);
    } finally {
      // Always ensure loading is false
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
    }
  };

  const forceCheckSession = async () => {
    try {
      console.log('🔄 Force checking session from Supabase...');
      
      // Don't set loading to true as this is a background check
      
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        setSession(null);
        setUser(null);
        return;
      }
      
      console.log('🔍 Force check result:', {
        hasSession: !!currentSession,
        userEmail: currentSession?.user?.email || 'None'
      });
      
      // Update auth state based on current session
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // If we have a session but were not authenticated, this is a fresh login
      if (currentSession && !session) {
        console.log('✅ Fresh login detected via force check');
      }
      
      // If we don't have a session but were authenticated, this is a logout
      if (!currentSession && session) {
        console.log('👋 Logout detected via force check');
      }
      
    } catch (error) {
      console.error('❌ Critical error in force session check:', error);
      setSession(null);
      setUser(null);
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    try {
      console.log('📧 Sending password reset email to:', email);
      const { error } = await api.sendPasswordResetEmail(email);
      
      if (error) {
        console.error('❌ Password reset error:', error);
        throw new Error(error.message || 'Failed to send password reset email');
      }
      
      console.log('✅ Password reset email sent successfully');
    } catch (error) {
      console.error('❌ Error in sendPasswordResetEmail:', error);
      throw error;
    }
  };

  const authContextValue = {
    user,
    session,
    isAuthenticated: !!session,
    isLoading,
    signOut,
    refreshUser,
    forceCheckSession,
    sendPasswordResetEmail,
  };

  console.log('🔐 AuthContext providing values:', {
    hasUser: !!user,
    hasSession: !!session,
    isAuthenticated: authContextValue.isAuthenticated,
    isLoading: authContextValue.isLoading
  });

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ==============================================
// ACCOUNT CONTEXT (Profile Management)
// ==============================================

interface AccountContextType {
  accountType: 'provider' | 'consumer';
  setAccountType: (type: 'provider' | 'consumer') => void;
  isLoading: boolean;
  userProfile: any;
  refreshProfile: () => Promise<void>;
  isPro: boolean;
}

const AccountContext = createContext<AccountContextType>({
  accountType: 'consumer',
  setAccountType: () => {},
  isLoading: false,
  userProfile: null,
  refreshProfile: async () => {},
  isPro: false,
});

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
};

// Account Provider Component with Supabase integration - Partner App Only
const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = usePremium();
  const [accountType, setAccountTypeState] = useState<'provider' | 'consumer'>('provider'); // Force provider for partner app
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const profileLoadedRef = useRef(false); // Track if profile has been loaded for this session

  useEffect(() => {
    // Reset initialization if user changes (logout/login with different account)
    if (user?.id !== lastUserIdRef.current) {
      console.log('👤 User changed, resetting initialization flags:', {
        oldUser: lastUserIdRef.current,
        newUser: user?.id
      });
      hasInitializedRef.current = false;
      isInitializingRef.current = false;
      profileLoadedRef.current = false; // Reset profile loaded flag
      lastUserIdRef.current = user?.id || null;
    }
    
    if (isAuthenticated && user && !isInitializingRef.current && !hasInitializedRef.current) {
      // Partner app always uses provider account type
      const initializeAccountType = async () => {
        console.log('🔄 Partner app - forcing provider account type');
        setAccountTypeState('provider');
        
        // Store provider type for this user
        const userAccountTypeKey = `accountType_${user.id}`;
        await AsyncStorage.setItem(userAccountTypeKey, 'provider');
      };
      
      // Handle pending push notification token with safe loading (non-blocking)
      const handlePushNotifications = () => {
        // Run this completely in the background without await
        (async () => {
          try {
            console.log('🔔 Handling push notifications for authenticated user (background)...');
            const SafePushNotificationService = await import('../services/safePushNotificationService');
            const configured = await SafePushNotificationService.default.configure();
            
            if (configured) {
              // Handle any pending tokens first
              await SafePushNotificationService.default.handlePendingToken();
              
              // Check current permission status
              const permissions = await SafePushNotificationService.default.checkPermissions();
              console.log('📱 Current push permissions:', permissions);
              
              if (!permissions.granted) {
                console.log('📱 Push permissions not granted, requesting permissions...');
                // Request permissions for authenticated user
                const granted = await SafePushNotificationService.default.requestPermissions();
                if (granted) {
                  console.log('✅ Push permissions granted and token should be registered');
                } else {
                  console.log('❌ Push permissions denied by user');
                }
              } else {
                console.log('✅ Push permissions already granted');
                // Permissions are granted but maybe we don't have a token registered
                // Let's trigger a token registration just to be sure
                const tokenExists = SafePushNotificationService.default.getDeviceToken();
                if (!tokenExists) {
                  console.log('📱 No device token found, requesting permissions to trigger registration...');
                  await SafePushNotificationService.default.requestPermissions();
                }
              }
            } else {
              console.log('⚠️ Push notification service could not be configured');
            }
          } catch (error) {
            console.error('❌ Error handling push notifications on login:', error);
          }
        })();
      };
      
      // Initialize only account type on login - profile loads on demand
      const initializeOnLogin = async () => {
        if (isInitializingRef.current) {
          console.log('⏭️ Initialization already in progress, skipping');
          return;
        }
        
        console.log('🔄 Starting login initialization (account type only)...');
        isInitializingRef.current = true;
        setIsLoading(true);
        
        try {
          console.log('🔄 Running account type initialization only...');
          
          // Shorter timeout for account type only initialization (no profile loading)
          const initializationTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout after 5 seconds')), 5000) // 5s is enough for account type only
          );
          
          // Only initialize account type on login - profile loads on demand when user navigates to profile tab
          console.log('📝 Initializing account type only - profile will load on demand');
          const initPromise = Promise.all([
            initializeAccountType().catch(e => { console.error('❌ Account type init failed:', e); return null; })
            // REMOVED loadUserProfile - it should only load when profile tab is accessed
          ]);
          
          try {
            const [accountTypeResult] = await Promise.race([
              initPromise,
              initializationTimeout
            ]);
            
            console.log('📊 Initialization results:', {
              accountType: accountTypeResult !== null ? 'Success' : 'Failed'
            });
            
            hasInitializedRef.current = true;
            console.log('✅ Coordinated initialization completed successfully');
          } catch (timeoutError) {
            console.warn('⚠️ Initialization timed out, proceeding anyway:', timeoutError.message);
            hasInitializedRef.current = true; // Mark as initialized to prevent retry loops
          }
        } catch (error) {
          console.error('❌ Critical error during initialization:', error);
          hasInitializedRef.current = true; // Mark as initialized to prevent retry loops
        } finally {
          console.log('🔄 LOGIN INIT CLEANUP: Setting isLoading to false...');
          setIsLoading(false);
          isInitializingRef.current = false;
          console.log('✅ Account type initialization completed - isLoading set to false');
          console.log('📊 Final loading state:', {
            isLoading: false,
            isInitializing: isInitializingRef.current,
            hasInitialized: hasInitializedRef.current,
            note: 'Profile will load on-demand when user navigates to profile tab'
          });
        }
      };
      
      initializeOnLogin();
      handlePushNotifications();
    } else {
      // Reset profile when user logs out - Partner app stays as provider
      console.log('👋 User logged out, resetting Account context state');
      setUserProfile(null);
      setAccountTypeState('provider'); // Partner app always provider
      setIsLoading(false); // Ensure loading is cleared on logout
      setIsProfileLoading(false);
      
      // Reset initialization flags for next login
      isInitializingRef.current = false;
      hasInitializedRef.current = false;
      profileLoadedRef.current = false;
      
      console.log('✅ Account context reset completed');
    }
  }, [isAuthenticated, user]);

  // Partner app - always provider even for guests
  useEffect(() => {
    if (!isAuthenticated) {
      const setPartnerAccountType = async () => {
        console.log('📱 Partner app - setting provider type for guest');
        setAccountTypeState('provider');
        await AsyncStorage.setItem('accountType', 'provider');
      };
      
      setPartnerAccountType();
    }
  }, [isAuthenticated]);

  const loadUserProfile = async (forceLoad = false) => {
    // Only load profile when explicitly requested or forced
    if (!forceLoad && profileLoadedRef.current) {
      console.log('📝 Profile already loaded for this session, skipping');
      return;
    }
    
    if (!user || !authService || isProfileLoading) {
      console.log('📝 Skipping profile load:', { 
        hasUser: !!user, 
        hasAuthService: !!authService, 
        isProfileLoading 
      });
      return;
    }
    
    try {
      setIsProfileLoading(true);
      console.log('📝 Loading user profile for:', user.id);
      // Note: setIsLoading is now handled by the coordination function
      
      // FIRST: Load saved account type for this specific user
      const userAccountTypeKey = `accountType_${user.id}`;
      const savedUserType = await AsyncStorage.getItem(userAccountTypeKey);
      console.log('📱 Saved account type for user:', savedUserType);
      
      // On fresh login, DO NOT read cache - only create fallback if API fails
      console.log('📡 Fresh login detected - skipping cache, using API only...');
      // DO NOT READ CACHE ON FRESH LOGIN
      let cachedProfile = null; // Keep null - no cache reading
      
      // Set longer timeout for profile loading to give API better chance
      console.log('⏱️ Setting 15-second timeout for fresh API data fetch...');
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile loading timeout')), 15000) // 15 seconds timeout - give API more time
      );
      
      try {
        console.log('🔄 Calling authService.getUserProfile() with user ID:', user.id);
        const response = await Promise.race([
          authService.getUserProfile(user.id),
          timeout
        ]);
        console.log('📝 Profile API response received:', response.success ? 'Success' : `Failed - ${response.error}`);
      
      if (response.success && response.data) {
        setUserProfile(response.data);
        profileLoadedRef.current = true; // Mark profile as loaded
        
        // DO NOT CACHE PROFILE - We want fresh data on every login
        console.log('🚫 Skipping profile caching - fresh data policy');
        console.log('✅ Profile loaded successfully for session');
        
        // Priority: User-specific saved type > Database account_type > default 'consumer'
        const userAccountTypeKey = `accountType_${user.id}`;
        const dbAccountType = response.data.account_type;
        
        // If user has a saved preference, use it regardless of DB
        if (savedUserType && (savedUserType === 'provider' || savedUserType === 'consumer')) {
          setAccountTypeState(savedUserType);
          console.log('✅ Using saved user preference:', savedUserType);
          
          // Update profile with saved type
          setUserProfile(prev => prev ? { ...prev, account_type: savedUserType } : response.data);
        } 
        // Otherwise, use DB account type if valid
        else if (dbAccountType && (dbAccountType === 'provider' || dbAccountType === 'consumer')) {
          setAccountTypeState(dbAccountType);
          await AsyncStorage.setItem(userAccountTypeKey, dbAccountType);
          console.log('✅ Profile loaded, account type from DB:', dbAccountType);
        } 
        // Final fallback to consumer
        else {
          const finalType = 'consumer';
          setAccountTypeState(finalType);
          await AsyncStorage.setItem(userAccountTypeKey, finalType);
          
          // Update the profile with the selected account type
          setUserProfile(prev => prev ? { ...prev, account_type: finalType } : {
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || 'User',
            last_name: user.user_metadata?.last_name || 'Name',
            account_type: finalType,
            is_premium: false
          });
          
          console.log('✅ Profile loaded, defaulting to:', finalType);
        }
      } else {
        console.warn('⚠️ Failed to load profile, creating fallback profile:', response.error);
        
        // Create a fallback profile from auth user data
        const userAccountTypeKey = `accountType_${user.id}`;
        const userSavedType = savedUserType || await AsyncStorage.getItem(userAccountTypeKey);
        const finalType = (userSavedType === 'provider' || userSavedType === 'consumer') ? userSavedType : 'consumer';
        
        const fallbackProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || 'Name',
          full_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || 'User'} ${user.user_metadata?.last_name || 'Name'}`,
          phone: user.phone || '',
          account_type: finalType,
          avatar_url: user.user_metadata?.avatar_url || null,
          is_premium: false,
          email_verified: user.email_confirmed_at ? true : false,
          phone_verified: false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setUserProfile(fallbackProfile);
        setAccountTypeState(finalType);
        await AsyncStorage.setItem('accountType', finalType);
        console.log('✅ Fallback profile created with account type:', finalType);
      }
      
      } catch (profileError) {
        console.warn('⚠️ Profile loading timed out or failed, creating fresh fallback profile:', profileError.message);
        
        // NO CACHE - Create fresh fallback profile from auth data
        console.log('🆕 Creating fresh fallback profile from authentication data...');
        
        // Otherwise create a basic fallback profile
        const userAccountTypeKey = `accountType_${user.id}`;
        const userSavedType = savedUserType || await AsyncStorage.getItem(userAccountTypeKey);
        const finalType = (userSavedType === 'provider' || userSavedType === 'consumer') ? userSavedType : 'consumer';
        
        const timeoutFallbackProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || 'Name',
          full_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || 'User'} ${user.user_metadata?.last_name || 'Name'}`,
          phone: user.phone || '',
          account_type: finalType,
          avatar_url: user.user_metadata?.avatar_url || null,
          is_premium: false,
          email_verified: user.email_confirmed_at ? true : false,
          phone_verified: false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setUserProfile(timeoutFallbackProfile);
        setAccountTypeState(finalType);
        await AsyncStorage.setItem(userAccountTypeKey, finalType);
        console.log('✅ Timeout fallback profile created with account type:', finalType);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      
      // Create emergency fallback profile - ensure this always completes
      try {
        const savedType = await AsyncStorage.getItem('accountType');
        const finalType = (savedType === 'provider' || savedType === 'consumer') ? savedType : 'consumer';
        
        const emergencyProfile = {
          id: user.id,
          email: user.email || 'user@example.com',
          first_name: 'User',
          last_name: 'Name',
          full_name: 'User Name',
          phone: '',
          account_type: finalType,
          avatar_url: null,
          is_premium: false,
          email_verified: false,
          phone_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setUserProfile(emergencyProfile);
        setAccountTypeState(finalType);
        console.log('❌ Emergency profile created with account type:', finalType);
      } catch (fallbackError) {
        console.error('❌ Critical error in fallback profile creation:', fallbackError);
        // Absolute fallback - just set consumer type to avoid infinite loading
        setAccountTypeState('consumer');
        setUserProfile({
          id: user.id,
          email: user.email || 'user@example.com',
          first_name: 'User',
          last_name: 'Name',
          full_name: 'User Name',
          phone: '',
          account_type: 'consumer',
          avatar_url: null,
          is_premium: false,
          email_verified: false,
          phone_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } finally {
      // Clear profile loading state (main loading state handled by coordination function)
      setIsProfileLoading(false);
      console.log('✅ Profile loading completed - setIsProfileLoading(false)');
      console.log('📊 Profile loading summary:', {
        hasProfile: !!userProfile,
        profileLoadingState: false,
        accountType: accountType
      });
    }
  };

  const setAccountType = async (type: 'provider' | 'consumer') => {
    // Partner app only - prevent account switching, always stay as provider
    console.log('🚫 Account switching disabled in partner app - staying as provider');
    return;
  };

  const refreshProfile = async () => {
    console.log('🔄 Manual profile refresh requested');
    await loadUserProfile(true); // Force load when explicitly requested
  };

  return (
    <AccountContext.Provider 
      value={{ 
        accountType, 
        setAccountType, 
        isLoading, 
        userProfile, 
        refreshProfile,
        isPro: isPremium 
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

// ==============================================
// NOTIFICATION CONTEXT
// ==============================================

interface NotificationContextType {
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notificationCount: 0,
  setNotificationCount: () => {},
  refreshNotifications: async () => {},
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Notification Provider Component
const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { accountType } = useAccount();
  const { user } = useAuth();

  const refreshNotifications = async () => {
    if (!user) return;
    
    try {
      // In a real app, this would fetch from Supabase
      // For now, set to 0 (no notifications) until actual notifications are implemented
      setNotificationCount(0);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      setNotificationCount(0);
    }
  }, [accountType, user]);

  return (
    <NotificationContext.Provider 
      value={{ 
        notificationCount, 
        setNotificationCount, 
        refreshNotifications 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// ==============================================
// TYPES & INTERFACES
// ==============================================

// Shop interface for ShopDetails
export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  isActive: boolean;
  openingHours: string;
  services: string[];
  imageUrl?: string;
  weeklyTemplate?: any;
  dailySchedules?: any[];
  advanceBookingDays?: number;
  slotDuration?: number;
  bufferTime?: number;
  autoApproval?: boolean;
  timeZone?: string;
}

// Navigation Types
export type RootStackParamList = {
  // Auth Screens
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OTPVerification: { email: string; fromScreen?: string };
  ResetPassword: { email: string; userId?: string };
  
  // Main App Screens - Partner Only
  ProviderTabs: {
    screen?: 'ProviderHomeTab' | 'QueueTab' | 'ServicesTab' | 'EarningsTab' | 'ProfileTab';
  } | undefined;
  
  // Provider Screens
  ProviderHome: undefined;
  ServiceQueue: undefined;
  ServiceManagement: undefined;
  Earnings: undefined;
  ShopDetails: {
    shop?: Shop;
    onSave?: (shop: Shop) => void;
  } | undefined;
  ServiceOptions: {
    serviceId?: string;
    serviceName: string;
    shopId: string;
    onGoBack?: () => void;
  };
  InvoiceGenerator: undefined;
  Customers: undefined;
  Analytics: undefined;
  
  // Profile Related Screens
  Notifications: undefined;
  Privacy: undefined;
  // PaymentMethods: undefined; // Removed as requested
  HelpCenter: undefined;
  TermsConditions: undefined;
  RefundPolicy: undefined;
  // BusinessSignup: undefined; // Removed as requested
  
  // Reviews Screen
  AllReviews: {
    reviews: any[];
    shopName: string;
  };
  
  // Search Screen (optional)
  Search?: { 
    query?: string;
    initialResults?: any;
    filter?: string;
  };
};

// Consumer tabs removed - Partner app only

type ProviderTabParamList = {
  ProviderHomeTab: undefined;
  QueueTab: undefined;
  ServicesTab: undefined;
  EarningsTab: undefined;
  ProfileTab: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const ProviderTab = createBottomTabNavigator<ProviderTabParamList>();

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// ==============================================
// COMPONENTS
// ==============================================

// Notification Badge Component
const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  
  return (
    <View style={{
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: '#845EC2',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }}>
      <Text style={{
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
      }}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
};

// Consumer tabs removed - Partner app only

// Provider Tab Navigator
const ProviderTabs = () => {
  const { notificationCount } = useNotifications();
  const { hasNewBooking } = useQueueBadge();
  const insets = useSafeAreaInsets();
  
  return (
    <ProviderTab.Navigator
      initialRouteName="ProviderHomeTab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'ProviderHomeTab') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'QueueTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ServicesTab') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'EarningsTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={{ position: 'relative' }}>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'ProfileTab' && notificationCount > 0 && (
                <NotificationBadge count={notificationCount} />
              )}
              {route.name === 'QueueTab' && hasNewBooking && (
                <View style={{
                  position: 'absolute',
                  right: -6,
                  top: -3,
                  backgroundColor: '#845EC2',
                  borderRadius: 6,
                  width: 12,
                  height: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }} />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: '#1A2533',
        tabBarInactiveTintColor: '#1A2533',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 12,
          height: Math.max(insets.bottom + 65, 85),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <ProviderTab.Screen 
        name="ProviderHomeTab" 
        component={ProviderHomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <ProviderTab.Screen 
        name="QueueTab" 
        component={ServiceQueueScreen}
        options={{ title: 'Queue' }}
      />
      <ProviderTab.Screen 
        name="ServicesTab" 
        component={ServiceManagementScreen}
        options={{ title: 'Services' }}
      />
      <ProviderTab.Screen 
        name="EarningsTab" 
        component={EarningsScreen}
        options={{ title: 'Earnings' }}
      />
      <ProviderTab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProviderTab.Navigator>
  );
};

// Loading Component for Account Switch
const AccountSwitchLoader = () => {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F0FFFE',
    }}>
      <ActivityIndicator size="large" color="#00C9A7" />
      <Text style={{
        marginTop: 16,
        fontSize: 16,
        color: '#1A2533',
        textAlign: 'center',
      }}>
        Loading your profile...
      </Text>
    </View>
  );
};

// Common header style configuration
const getHeaderStyle = () => ({
  headerStyle: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: 18,
    color: '#1F2937',
  },
  headerTintColor: '#1F2937',
  headerBackTitle: '',
  headerBackTitleVisible: false,
  headerShadowVisible: false,
});

// Auth Navigator
const AuthNavigator = () => {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F0FFFE' },
      }}
    >
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Register" component={RegisterScreen} />
      <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <RootStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </RootStack.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { accountType, isLoading } = useAccount();

  console.log('🏠 AppNavigator render - accountType:', accountType, 'isLoading:', isLoading);

  if (isLoading) {
    console.log('🏠 Showing AccountSwitchLoader due to account loading');
    return <AccountSwitchLoader />;
  }

  console.log('🏠 Account loading complete, showing main app navigation');

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F0FFFE' },
        ...getHeaderStyle(),
      }}
    >
      {/* Partner App - Only Provider Navigation */}
      <RootStack.Screen 
        name="ProviderTabs" 
        component={ProviderTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen 
        name="ShopDetails" 
        component={ShopDetailsScreen}
        options={({ route }) => ({
          title: route.params?.shop ? 'Edit Shop' : 'Add New Shop',
          headerShown: true,
          ...getHeaderStyle(),
          headerBackTitle: '',
        })}
      />
      <RootStack.Screen 
        name="ServiceOptions" 
        component={ServiceOptionsScreen}
        options={{
          title: 'Service Options',
          headerShown: false,
          presentation: 'card',
        }}
      />
      <RootStack.Screen 
        name="InvoiceGenerator" 
        component={InvoiceGeneratorScreen}
        options={{
          title: 'Generate Invoice',
          headerShown: true,
          presentation: 'modal',
          ...getHeaderStyle(),
          headerBackTitle: '',
        }}
      />
      <RootStack.Screen 
        name="Customers" 
        component={CustomersScreen}
        options={{
          title: 'Customers',
          headerShown: false,
          ...getHeaderStyle(),
        }}
      />
      <RootStack.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{
          title: 'Business Analytics',
          headerShown: false,
          ...getHeaderStyle(),
        }}
      />
      
      {/* Shared Profile Screens */}
      <RootStack.Screen 
        name="AllReviews" 
        component={AllReviewsScreen}
        options={{
          title: 'All Reviews',
          headerShown: false,
          presentation: 'card',
        }}
      />
      <RootStack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          headerShown: true,
          ...getHeaderStyle(),
          headerBackTitle: '',
        }}
      />
      <RootStack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{
          title: 'Privacy Settings',
          headerShown: true,
          ...getHeaderStyle(),
          headerBackTitle: '',
        }}
      />
      {/* Payment Methods screen removed as requested */}
      {/* <RootStack.Screen 
        name="PaymentMethods" 
        component={PaymentMethodsScreen}
        options={{
          title: 'Payment Methods',
          headerShown: true,
          ...getHeaderStyle(),
        }}
      /> */}
      <RootStack.Screen 
        name="HelpCenter" 
        component={HelpCenterScreen}
        options={{
          title: 'Help Center',
          headerShown: true,
          ...getHeaderStyle(),
          headerBackTitle: '',
          headerBackTitleVisible: false,
        }}
      />
      <RootStack.Screen 
        name="TermsConditions" 
        component={TermsConditionsScreen}
        options={{
          title: 'Terms & Conditions',
          headerShown: false,
          ...getHeaderStyle(),
        }}
      />
      <RootStack.Screen 
        name="RefundPolicy" 
        component={RefundPolicyScreen}
        options={{
          title: 'Refund Policy',
          headerShown: false,
          ...getHeaderStyle(),
        }}
      />
      {/* Business Signup screen removed as requested */}
      {/* <RootStack.Screen 
        name="BusinessSignup" 
        component={BusinessSignupScreen}
        options={{
          title: 'Join as Provider',
          headerShown: false,
          ...getHeaderStyle(),
        }}
      /> */}
    </RootStack.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  console.log('📱 RootNavigator render - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);

  if (authLoading) {
    console.log('📱 Showing SplashScreen due to auth loading');
    return <SplashScreen />;
  }

  console.log('📱 Auth loading complete, showing:', isAuthenticated ? 'AppNavigator (main app)' : 'AuthNavigator (login)');

  return (
    <AccountProvider>
      <NotificationProvider>
        <QueueBadgeProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#F0FFFE" translucent={false} />
          {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
        </QueueBadgeProvider>
      </NotificationProvider>
    </AccountProvider>
  );
};

// Main App Component with Auth Provider
const App = () => {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

export default App;
export { useAccount, useNotifications, useAuth };