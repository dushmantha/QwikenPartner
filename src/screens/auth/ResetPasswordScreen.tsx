import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase/index';
import authAPI from '../../services/api/auth';

type AuthStackParamList = {
  ForgotPassword: undefined;
  OTPVerification: { email: string };
  ResetPassword: { email: string; userId: string; otpCode?: string };
  Login: undefined;
};

type ResetPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

interface Props {
  navigation: ResetPasswordScreenNavigationProp;
  route: ResetPasswordScreenRouteProp;
}

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email, userId, otpCode } = route.params;
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password validation
  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    
    if (password.length < minLength) {
      errors.push(`At least ${minLength} characters`);
    }
    if (!hasUpperCase) {
      errors.push('One uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('One lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('One number');
    }
    if (!hasSpecialChar) {
      errors.push('One special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleResetPassword = async () => {
    // Validate inputs
    if (!newPassword || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords are identical.');
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert(
        'Password Too Weak',
        `Your password must have:\n• ${passwordValidation.errors.join('\n• ')}`
      );
      return;
    }

    setIsLoading(true);

    try {
      // Use our Supabase function to reset password
      const result = await authAPI.resetPassword(email, newPassword, otpCode || '');

      if (result.error) {
        throw new Error(result.error.message || 'Failed to reset password');
      }

      // Show success message
      Alert.alert(
        'Password Reset Successful!',
        'Your password has been successfully updated. You can now log in with your new password.',
        [
          {
            text: 'Continue to Login',
            onPress: () => {
              // Navigate to login screen and reset the navigation stack
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert(
        'Reset Failed',
        error.message || 'Unable to reset password. Please try again or contact support.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#1A2533" />
              </TouchableOpacity>
              <Text style={styles.title}>Create New Password</Text>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={styles.illustration}>
                <Ionicons name="lock-closed" size={60} color="#1A2533" />
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionText}>
                Create a strong password for your account
              </Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    newPassword && !passwordValidation.isValid && styles.inputError
                  ]}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#1A2533"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Requirements */}
              {newPassword && (
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsTitle}>Password must have:</Text>
                  {passwordValidation.errors.map((error, index) => (
                    <View key={index} style={styles.requirementItem}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={styles.requirementText}>{error}</Text>
                    </View>
                  ))}
                  {passwordValidation.isValid && (
                    <View style={styles.requirementItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={[styles.requirementText, styles.requirementValid]}>
                        Password is strong!
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    confirmPassword && !passwordsMatch && styles.inputError
                  ]}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#1A2533"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <View style={styles.matchContainer}>
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordsMatch ? '#10B981' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.matchText,
                      passwordsMatch ? styles.matchValid : styles.matchInvalid,
                    ]}
                  >
                    {passwordsMatch ? 'Passwords match' : 'Passwords don\'t match'}
                  </Text>
                </View>
              )}
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={[
                styles.resetButton,
                (!passwordValidation.isValid || !passwordsMatch || isLoading) &&
                  styles.resetButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={!passwordValidation.isValid || !passwordsMatch || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.resetButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            {/* Security Note */}
            <View style={styles.securityContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#1A2533" />
              <Text style={styles.securityText}>
                Your password will be encrypted and stored securely.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A2533',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  illustration: {
    width: 120,
    height: 120,
    backgroundColor: '#F0FDF9',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A2533',
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  passwordInputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    padding: 4,
  },
  requirementsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 13,
    color: '#EF4444',
    marginLeft: 8,
  },
  requirementValid: {
    color: '#10B981',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  matchText: {
    fontSize: 14,
    marginLeft: 8,
  },
  matchValid: {
    color: '#10B981',
  },
  matchInvalid: {
    color: '#EF4444',
  },
  resetButton: {
    backgroundColor: '#1A2533',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  resetButtonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0FDF9',
    borderRadius: 8,
    marginTop: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
});

export default ResetPasswordScreen;