import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../navigation/AppNavigator';
import { authService } from '../../lib/supabase/index';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { googleSignInService } from '../../services/auth/googleSignIn';
import { appleSignInService } from '../../services/auth/appleSignIn';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface ValidationErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

// Brand Theme Colors - Updated to Navy Blue Theme
const colors = {
  primary: '#1A2533',
  secondary: '#1A2533', 
  darkAccent: '#1A2533',
  lightAccent: '#F0FFFE',
  success: '#10B981',
  warning: '#F97316',
  error: '#EF4444',
  info: '#1A2533',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#1A2533',
  gray600: '#1A2533',
  gray700: '#1A2533',
  gray800: '#1A2533',
  gray900: '#111827',
};


const LoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { forceCheckSession, isAuthenticated } = useAuth();

  // Monitor auth state changes to clear loading when login succeeds
  useEffect(() => {
    if (isAuthenticated && loading) {
      console.log('✅ Auth state changed to authenticated, clearing login loading');
      setLoading(false);
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isAuthenticated, loading]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Validation functions
  const validateIdentifier = (value: string): string | null => {
    if (!value.trim()) return 'Email or phone number is required';
    
    // Check if it's an email
    if (value.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
    } else {
      // Check if it's a phone number
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        return 'Please enter a valid phone number or email';
      }
    }
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'identifier') {
      setIdentifier(value);
    } else if (field === 'password') {
      setPassword(value);
    }

    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
        general: undefined
      }));
    }

    // Real-time validation for touched fields
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    const value = field === 'identifier' ? identifier : password;
    validateField(field, value);
  };

  const validateField = (field: string, value: string) => {
    let error: string | null = null;

    if (field === 'identifier') {
      error = validateIdentifier(value);
    } else if (field === 'password') {
      error = validatePassword(value);
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateAllFields = (): boolean => {
    const newErrors: ValidationErrors = {};

    newErrors.identifier = validateIdentifier(identifier);
    newErrors.password = validatePassword(password);

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== null);
  };


  const handleLogin = async () => {
    setErrors({});

    if (!validateAllFields()) {
      return;
    }

    setLoading(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      const response = await authService.signIn(identifier, password);
      
      if (response.success) {
        console.log('✅ Login successful - user:', response.user?.email);
        console.log('✅ Session exists:', !!response.session);
        console.log('✅ Auth service login completed');
        
        // Simple approach: trust that the auth state change will handle the navigation
        // Add a single safety timeout in case auth state doesn't change
        setTimeout(async () => {
          console.log('🔄 Safety check - ensuring auth state updated...');
          await forceCheckSession();
          setLoading(false); // Always clear loading after a reasonable time
        }, 2000); // 2 second timeout
        
      } else {
        setErrors({ 
          general: response.error || 'Invalid credentials. Please try again.' 
        });
        setLoading(false);
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setErrors({ 
        general: error.message || 'Network error. Please check your connection and try again.' 
      });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrors({});
    setGoogleLoading(true);
    
    try {
      console.log('🔄 Starting Google Sign-In process...');
      const result = await googleSignInService.signIn();
      
      if (result.success) {
        console.log('✅ Google Sign-In successful, waiting for auth state change...');
        
        // Show welcome message for new users
        if (result.isNewUser) {
          Alert.alert(
            'Welcome!',
            'Your account has been created successfully. Welcome to Qwiken!',
            [{ text: 'Get Started', style: 'default' }]
          );
        }
        
        // Keep loading until auth state changes, with timeout
        setTimeout(() => {
          console.warn('⚠️ Google auth state change timeout');
          setGoogleLoading(false);
          setErrors({ 
            general: 'Sign-in completed but navigation failed. Please restart the app.' 
          });
        }, 8000);
        
        // Don't set loading to false here - let auth state change handle it
      } else {
        console.error('❌ Google Sign-In failed:', result.error);
        
        // Show user-friendly error message for module not available
        if (result.error?.includes('Google Sign-In is not available')) {
          Alert.alert(
            'Google Sign-In Setup Required',
            'Google Sign-In needs to be configured. Please rebuild the app or use email/password login.',
            [
              { text: 'OK', style: 'default' }
            ]
          );
        } else {
          setErrors({ 
            general: result.error || 'Google sign-in failed. Please try again.' 
          });
        }
        setGoogleLoading(false);
      }
      
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      Alert.alert(
        'Sign-In Error',
        'Unable to complete Google sign-in. Please try using email/password instead.',
        [{ text: 'OK', style: 'default' }]
      );
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setErrors({});
    setAppleLoading(true);
    
    try {
      console.log('🔄 Starting Apple Sign-In process...');
      const result = await appleSignInService.signIn();
      
      if (result.success) {
        console.log('✅ Apple Sign-In successful');
        // Navigation is handled by AuthContext state change in AppNavigator
        
        // Show welcome message for new users
        if (result.isNewUser) {
          Alert.alert(
            'Welcome!',
            'Your account has been created successfully. Welcome to Qwiken!',
            [{ text: 'Get Started', style: 'default' }]
          );
        }
      } else {
        console.error('❌ Apple Sign-In failed:', result.error);
        setErrors({ 
          general: result.error || 'Apple sign-in failed. Please try again.' 
        });
      }
      
    } catch (error: any) {
      console.error('❌ Apple Sign-In error:', error);
      setErrors({ 
        general: error.message || 'An error occurred during Apple sign-in. Please try again.' 
      });
    } finally {
      setAppleLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="calendar" size={32} color={colors.primary} />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue booking services</Text>
            </View>
          </View>


          {errors.general && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    errors.identifier && styles.inputError,
                    !errors.identifier && touched.identifier && identifier && styles.inputSuccess
                  ]}
                  placeholder="Enter your email or phone"
                  placeholderTextColor={colors.gray500}
                  value={identifier}
                  onChangeText={(text) => handleInputChange('identifier', text)}
                  onBlur={() => handleBlur('identifier')}
                  autoCapitalize="none"
                  keyboardType="default"
                  autoComplete="off"
                  autoCorrect={false}
                  editable={!loading && !googleLoading && !appleLoading}
                />
                <View style={styles.inputIcon}>
                  <Ionicons 
                    name={identifier.includes('@') ? 'mail-outline' : 'call-outline'} 
                    size={20} 
                    color={colors.gray500} 
                  />
                </View>
              </View>
              {errors.identifier && <Text style={styles.fieldError}>{errors.identifier}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Password *</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                    !errors.password && touched.password && password && styles.inputSuccess
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.gray500}
                  value={password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  onBlur={() => handleBlur('password')}
                  secureTextEntry={!showPassword}
                  editable={!loading && !googleLoading && !appleLoading}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading || googleLoading || appleLoading}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={24} 
                    color={colors.gray500} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || googleLoading || appleLoading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || googleLoading || appleLoading}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Signing In...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity 
              style={[styles.googleButton, (loading || googleLoading || appleLoading) && styles.socialButtonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading || appleLoading}
            >
              {googleLoading ? (
                <View style={styles.googleButtonContent}>
                  <ActivityIndicator size="small" color="#4285F4" style={{ marginRight: 12 }} />
                  <Text style={styles.googleButtonText}>Signing in...</Text>
                </View>
              ) : (
                <View style={styles.googleButtonContent}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={[styles.socialButtonSecondary, (loading || googleLoading || appleLoading) && styles.socialButtonDisabled]}
                onPress={handleAppleSignIn}
                disabled={loading || googleLoading || appleLoading}
              >
                {appleLoading ? (
                  <View style={styles.socialButtonContent}>
                    <ActivityIndicator size="small" color={colors.gray900} style={{ marginRight: 12 }} />
                    <Text style={styles.socialButtonText}>Signing in...</Text>
                  </View>
                ) : (
                  <View style={styles.socialButtonContent}>
                    <Ionicons name="logo-apple" size={20} color={colors.gray900} />
                    <Text style={styles.socialButtonText}>Continue with Apple</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpContainer}>
              <TouchableOpacity style={styles.helpButton}>
                <Ionicons name="help-circle-outline" size={16} color={colors.gray500} />
                <Text style={styles.helpText}>Need Help?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightAccent,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.darkAccent,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: colors.darkAccent,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.darkAccent,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  inputSuccess: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  fieldError: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.gray400,
    fontSize: 12,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1A2533',
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.darkAccent,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  footerText: {
    color: colors.gray500,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  helpText: {
    color: colors.gray500,
    fontSize: 14,
    marginLeft: 4,
  },
});

export default LoginScreen;