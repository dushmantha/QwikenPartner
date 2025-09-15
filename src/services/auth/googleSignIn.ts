// Safely import Google Sign-In with fallback
let GoogleSignin: any;
let statusCodes: any;
let isGoogleSignInAvailable = false;

try {
  // Try to directly import the module first
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  
  // Check if React Native is available
  const { NativeModules } = require('react-native');
  
  console.log('🔍 Available native modules:', Object.keys(NativeModules || {}));
  
  // Try to load the Google Sign-In module - check multiple possible module names
  const possibleModuleNames = ['RNGoogleSignin', 'GoogleSignin', 'RNGoogleSignIn'];
  let moduleFound = false;
  
  for (const moduleName of possibleModuleNames) {
    if (NativeModules && NativeModules[moduleName]) {
      console.log(`✅ Found Google Sign-In native module: ${moduleName}`);
      moduleFound = true;
      break;
    }
  }
  
  // Even if native module not found, try to use the GoogleSignin object
  if (moduleFound || googleSignInModule.GoogleSignin) {
    GoogleSignin = googleSignInModule.GoogleSignin;
    statusCodes = googleSignInModule.statusCodes;
    isGoogleSignInAvailable = true;
    console.log('✅ Google Sign-In module loaded successfully');
  } else {
    console.log('❌ Google Sign-In native module not found in:', Object.keys(NativeModules || {}));
    throw new Error('Google Sign-In native module not found');
  }
} catch (error) {
  console.warn('⚠️ Google Sign-In module not available. Using fallback implementation.');
  console.warn('To enable Google Sign-In, please rebuild the app after installing the module.');
  
  // Mock implementation for development
  statusCodes = {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  };
  
  GoogleSignin = {
    configure: async () => {
      console.log('Mock: Google Sign-In configure - Module not available');
      // Don't throw error in configure, just log
    },
    hasPlayServices: async () => {
      console.log('Mock: Checking Play Services');
      return true;
    },
    signIn: async () => {
      throw new Error('Google Sign-In is not available. Please rebuild the app after proper installation.');
    },
    signOut: async () => {
      console.log('Mock: Google Sign-In signOut');
    },
    isSignedIn: async () => {
      console.log('Mock: Checking if signed in');
      return false;
    },
    getCurrentUser: async () => {
      console.log('Mock: Getting current user');
      return null;
    },
    revokeAccess: async () => {
      console.log('Mock: Revoking access');
    },
  };
}

import { supabase } from '../../lib/supabase';

// Safely import Config
let Config: any;
try {
  Config = require('react-native-config').default;
} catch (error) {
  console.warn('react-native-config not available');
  Config = {};
}

export interface GoogleSignInResult {
  success: boolean;
  user?: any;
  error?: string;
  isNewUser?: boolean;
}

export class GoogleSignInService {
  private static instance: GoogleSignInService;
  private isConfigured: boolean = false;

  static getInstance(): GoogleSignInService {
    if (!GoogleSignInService.instance) {
      GoogleSignInService.instance = new GoogleSignInService();
    }
    return GoogleSignInService.instance;
  }

  async configure(): Promise<void> {
    if (this.isConfigured) return;

    try {
      // Check if Google Sign-In is available
      if (!isGoogleSignInAvailable) {
        console.log('⚠️ Google Sign-In module not available, skipping configuration');
        this.isConfigured = false;
        return;
      }

      // Import Platform to detect iOS vs Android
      const { Platform } = require('react-native');
      
      // Google Client IDs from Google Cloud Console
      const WEB_CLIENT_ID = Config?.GOOGLE_WEB_CLIENT_ID || '102120087810-25kbtdpa2gsb1c5vhnauknrk3mi5qnkm.apps.googleusercontent.com';
      const IOS_CLIENT_ID = Config?.GOOGLE_IOS_CLIENT_ID || '102120087810-skijc4hnkckmpd6aquk72djbsohsfp76.apps.googleusercontent.com';
      
      if (Platform.OS === 'ios') {
        console.log('📱 Configuring iOS Google Sign-In with explicit client IDs');
        await GoogleSignin.configure({
          iosClientId: IOS_CLIENT_ID, // iOS-specific client ID
          webClientId: WEB_CLIENT_ID, // Also needed for iOS backend auth
          offlineAccess: true, // Enables server-side access
          scopes: ['profile', 'email'], // Requested permissions
          forceCodeForRefreshToken: true, // Forces refresh token generation
        });
      } else {
        console.log('🤖 Configuring Android Google Sign-In');
        await GoogleSignin.configure({
          webClientId: WEB_CLIENT_ID, // Use Web Client ID for Android
          offlineAccess: true, // Enables server-side access
          scopes: ['profile', 'email'], // Requested permissions
          forceCodeForRefreshToken: true, // Forces refresh token generation
        });
      }
      
      this.isConfigured = true;
      console.log('✅ Google Sign-In configured successfully with Web Client ID');
    } catch (error: any) {
      console.warn('⚠️ Google Sign-In configuration failed:', error?.message || error);
      // Don't throw error, just log it
      this.isConfigured = false;
    }
  }

  async signIn(): Promise<GoogleSignInResult> {
    try {
      console.log('🔄 Starting Google Sign-In process...');
      
      // Check if Google Sign-In is available
      if (!isGoogleSignInAvailable) {
        console.error('❌ Google Sign-In module is not available');
        return {
          success: false,
          error: 'Google Sign-In is not available. The app needs to be rebuilt with the Google Sign-In module properly installed.'
        };
      }
      
      // Ensure Google Sign-In is configured
      await this.configure();
      
      // Sign out first to ensure we can switch accounts
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          console.log('🔄 User already signed in with Google, signing out first to allow account selection...');
          await GoogleSignin.signOut();
        }
      } catch (error) {
        console.log('⚠️ Could not check sign-in status:', error);
      }
      
      // Check if device has Google Play Services (Android)
      try {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      } catch (error) {
        console.log('Play Services check failed, continuing anyway');
      }

      // Sign in with Google - this will now show account picker
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In successful. Full response:', JSON.stringify(userInfo, null, 2));
      
      // The response structure from Google Sign-In might be different
      // Let's handle both possible structures: userInfo.user or direct userInfo
      let user = null;
      
      if (userInfo?.user) {
        // Structure: { user: { email, name, etc } }
        user = userInfo.user;
        console.log('✅ Using userInfo.user structure');
      } else if (userInfo?.data?.user) {
        // Structure: { data: { user: { email, name, etc } } }
        user = userInfo.data.user;
        console.log('✅ Using userInfo.data.user structure');
      } else if (userInfo?.email) {
        // Structure: direct user object { email, name, etc }
        user = userInfo;
        console.log('✅ Using direct userInfo structure');
      } else {
        console.error('❌ Unknown user info structure:', userInfo);
        throw new Error('Unable to extract user information from Google Sign-In response');
      }
      
      console.log('✅ Extracted user data:', {
        email: user?.email,
        name: user?.name,
        id: user?.id,
        givenName: user?.givenName,
        familyName: user?.familyName
      });

      // Get the ID token for authentication
      const { idToken } = userInfo;
      
      // Option 1: Try to authenticate with Supabase using Google token
      let supabaseUser = null;
      let authSuccess = false;
      
      if (idToken) {
        try {
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });
          
          if (!error && data?.user) {
            supabaseUser = data.user;
            authSuccess = true;
            console.log('✅ Supabase authentication successful');
          }
        } catch (supabaseError) {
          console.log('⚠️ Supabase Google auth not configured, using email/password fallback');
        }
      }
      
      // Option 2: Fallback - Create or sign in with email/password
      if (!authSuccess) {
        const email = user.email;
        if (!email) {
          throw new Error('No email address provided by Google Sign-In');
        }
        
        const tempPassword = `Google_${user.id}_${email}`; // Generate consistent password
        
        // Try to sign in first
        console.log('🔄 Attempting to sign in with email:', email);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: tempPassword,
        });
        
        if (signInData?.user) {
          supabaseUser = signInData.user;
          authSuccess = true;
          console.log('✅ Signed in with existing Google account');
        } else {
          console.log('⚠️ Sign in failed:', signInError?.message);
          
          // If sign-in fails, try to create new account
          console.log('🔄 Attempting to create new account...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: tempPassword,
            options: {
              data: {
                first_name: user.givenName || '',
                last_name: user.familyName || '',
                full_name: user.name || '',
                avatar_url: user.photo || null,
                provider: 'google',
              }
            }
          });
          
          if (signUpData?.user) {
            supabaseUser = signUpData.user;
            authSuccess = true;
            console.log('✅ Created new account with Google credentials');
          } else {
            console.log('❌ Sign up failed:', signUpError?.message);
            
            // If user already exists, try a different approach
            if (signUpError?.message?.includes('already registered') || 
                signUpError?.message?.includes('already exists')) {
              
              console.log('🔄 User exists, trying to reset/update password...');
              
              // Option 1: Try with a simpler password format
              const simplePassword = `google_${user.id?.substring(0, 8) || 'user'}`;
              const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
                email: email,
                password: simplePassword,
              });
              
              if (retrySignIn?.user) {
                supabaseUser = retrySignIn.user;
                authSuccess = true;
                console.log('✅ Signed in with alternative password format');
              } else {
                // If all attempts fail, provide clear guidance
                throw new Error(`Google Sign-In account exists but password mismatch. Please use email/password login or contact support. Email: ${email}`);
              }
            } else {
              throw new Error(signUpError?.message || 'Failed to create account');
            }
          }
        }
      }

      // Check if this is a new user and create/update profile
      let isNewUser = false;
      if (supabaseUser) {
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (!existingProfile) {
          // Create user profile
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: supabaseUser.id,
              email: supabaseUser.email,
              first_name: user.givenName || '',
              last_name: user.familyName || '',
              full_name: user.name || '',
              avatar_url: user.photo || null,
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              account_type: 'consumer', // Default to consumer
            });

          if (!createError) {
            console.log('✅ User profile created successfully');
            isNewUser = true;
          }
        } else {
          // Update profile with latest Google info
          await supabase
            .from('users')
            .update({
              avatar_url: user.photo || existingProfile.avatar_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', supabaseUser.id);
        }
      }

      return {
        success: true,
        user: supabaseUser,
        isNewUser,
      };

    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      
      // Handle specific Google Sign-In errors
      let errorMessage = 'An error occurred during sign in';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services is not available';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async signOut(): Promise<boolean> {
    try {
      console.log('🔄 Signing out from Google...');
      await GoogleSignin.signOut();
      console.log('✅ Google Sign-Out successful');
      return true;
    } catch (error) {
      console.error('❌ Google Sign-Out error:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo;
    } catch (error) {
      console.log('No current Google user found');
      return null;
    }
  }

  async revokeAccess(): Promise<boolean> {
    try {
      await GoogleSignin.revokeAccess();
      console.log('✅ Google access revoked');
      return true;
    } catch (error) {
      console.error('❌ Failed to revoke Google access:', error);
      return false;
    }
  }
}

export const googleSignInService = GoogleSignInService.getInstance();