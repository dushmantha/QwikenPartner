import { supabase } from '../../lib/supabase';
import { Platform } from 'react-native';

// Check if we're in simulator (for development fallback)
const isSimulator = __DEV__ && Platform.OS === 'ios';

// Try to import Apple Auth with error handling
let appleAuth: any = null;
try {
  const module = require('@invertase/react-native-apple-authentication');
  appleAuth = module.default || module;
  console.log('✅ Apple Auth module loaded:', !!appleAuth);
} catch (error) {
  console.warn('Apple Authentication module not found:', error);
}

export interface AppleSignInResult {
  success: boolean;
  user?: any;
  error?: string;
  isNewUser?: boolean;
}

export class AppleSignInService {
  private static instance: AppleSignInService;

  static getInstance(): AppleSignInService {
    if (!AppleSignInService.instance) {
      AppleSignInService.instance = new AppleSignInService();
    }
    return AppleSignInService.instance;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're on iOS first
      if (Platform.OS !== 'ios') {
        console.log('🚫 Apple Auth: Not on iOS platform');
        return false;
      }
      
      // Check if the Apple Auth module is available
      if (!appleAuth) {
        console.log('🚫 Apple Auth: Module not loaded');
        return false;
      }
      
      // Check if the native module is properly linked
      const nativeModule = appleAuth.native;
      if (!nativeModule) {
        console.log('🔄 Apple Auth: Native module is null - iOS app needs rebuild');
        return false;
      }
      
      // isSupported is a boolean property, not a function!
      const isSupported = nativeModule.isSupported;
      console.log('✅ Apple Auth: isSupported property value:', isSupported);
      return isSupported === true;
    } catch (error) {
      console.log('❌ Apple Sign-In availability check failed:', error);
      return false;
    }
  }

  async signIn(): Promise<AppleSignInResult> {
    try {
      console.log('🔄 Starting Apple Sign-In process...');
      
      // Check if Apple Sign-In is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device'
        };
      }

      // Perform the Apple Sign-In request
      const appleAuthRequestResponse = await appleAuth.native.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      console.log('✅ Apple Sign-In successful:', appleAuthRequestResponse);

      // Extract the identity token for Supabase authentication
      const { identityToken, nonce } = appleAuthRequestResponse;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Sign in with Supabase using Apple token
      const { data: supabaseUser, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce,
      });

      if (error) {
        console.error('❌ Supabase authentication failed:', error);
        throw error;
      }

      console.log('✅ Supabase authentication successful');

      // Check if this is a new user and create profile if needed
      let isNewUser = false;
      if (supabaseUser.user) {
        const { data: existingProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.user.id)
          .single();

        if (!existingProfile && !profileError) {
          // Extract name information from Apple response
          const fullName = appleAuthRequestResponse.fullName;
          const firstName = fullName?.givenName || '';
          const lastName = fullName?.familyName || '';
          const displayName = firstName && lastName ? `${firstName} ${lastName}` : '';

          // Create user profile
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: supabaseUser.user.id,
              email: supabaseUser.user.email || appleAuthRequestResponse.email,
              first_name: firstName,
              last_name: lastName,
              full_name: displayName || supabaseUser.user.user_metadata?.full_name || '',
              avatar_url: null, // Apple doesn't provide profile pictures
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              account_type: 'consumer', // Default to consumer
            });

          if (createError) {
            console.error('❌ Failed to create user profile:', createError);
          } else {
            console.log('✅ User profile created successfully');
            isNewUser = true;
          }
        }
      }

      return {
        success: true,
        user: supabaseUser.user,
        isNewUser,
      };

    } catch (error: any) {
      console.error('❌ Apple Sign-In error:', error);
      
      // Handle Apple Sign-In limitations on iOS Simulator (temporarily disabled for testing)
      if (false && isSimulator && (error.code === '1000' || error.code === 1000)) {
        console.log('🔧 Apple Sign-In failed on simulator - using development fallback');
        
        // Create a mock Apple Sign-In user for development testing
        const mockAppleUser = {
          user: '001234.fake.apple.user.id',
          email: 'user@privaterelay.appleid.com',
          fullName: {
            givenName: 'Test',
            familyName: 'User',
          },
          identityToken: 'mock.identity.token.for.development',
          authorizationCode: 'mock.authorization.code',
        };
        
        console.log('🧪 Using mock Apple Sign-In for simulator development');
        
        // For development, just return a success message without actual auth
        // This allows testing the UI flow without backend complications
        console.log('✅ Mock Apple Sign-In completed (development mode)');
        return {
          success: true,
          user: {
            id: 'mock-apple-user-id',
            email: 'apple.test@simulator.dev',
            user_metadata: {
              full_name: 'Apple Test User',
              email_verified: true,
            }
          },
          isNewUser: false,
        };
      }
      
      // Handle specific Apple Sign-In errors for real devices
      let errorMessage = 'An error occurred during Apple sign in';
      
      if (error.code === '1001') {
        errorMessage = 'Apple sign in was cancelled';
      } else if (error.code === '1000') {
        errorMessage = 'Apple Sign-In requires an Apple ID. Please sign in to your Apple ID in Settings → Sign in to your iPhone, then try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getCredentialState(userAppleId: string): Promise<string | null> {
    try {
      const credentialState = await appleAuth.native.getCredentialStateForUser(userAppleId);
      return credentialState;
    } catch (error) {
      console.error('❌ Failed to get Apple credential state:', error);
      return null;
    }
  }

  async signOut(): Promise<boolean> {
    try {
      console.log('🔄 Signing out from Apple...');
      
      // Apple doesn't have a direct sign out method
      // The sign out is handled by clearing the local session
      console.log('✅ Apple Sign-Out completed (local session cleared)');
      return true;
      
    } catch (error) {
      console.error('❌ Apple Sign-Out error:', error);
      return false;
    }
  }
}

export const appleSignInService = AppleSignInService.getInstance();