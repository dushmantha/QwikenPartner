import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import authAPI from '../../services/api/auth';

type AuthStackParamList = {
  ForgotPassword: undefined;
  OTPVerification: { email: string };
  ResetPassword: { email: string; userId: string };
  Login: undefined;
};

type OTPVerificationScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPVerificationScreenRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

interface Props {
  navigation: OTPVerificationScreenNavigationProp;
  route: OTPVerificationScreenRouteProp;
}

const OTPVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((timer) => {
          if (timer <= 1) {
            setCanResend(true);
            return 0;
          }
          return timer - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleOTPChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-verify when all 4 digits are entered
    if (index === 3 && value && newOtp.every(digit => digit)) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const codeToVerify = otpCode || otp.join('');
    
    if (codeToVerify.length !== 4) {
      Alert.alert('Invalid Code', 'Please enter all 4 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authAPI.verifyOTP(email, codeToVerify);
      
      if (!result.error) {
        // Navigate to reset password screen
        navigation.navigate('ResetPassword', { 
          email: email,
          userId: 'verified', // Pass a flag that OTP was verified
          otpCode: codeToVerify // Pass the verified OTP code
        });
      } else {
        Alert.alert(
          'Verification Failed', 
          result.error?.message || 'Invalid verification code. Please try again.'
        );
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setIsResending(true);
    
    try {
      const result = await authAPI.sendPasswordResetEmail(email);
      
      if (!result.error) {
        Alert.alert(
          'Code Sent', 
          'A new verification code has been sent to your email address.'
        );
        setResendTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert(
          'Failed to Send', 
          result.error?.message || 'Unable to send verification code. Please try again.'
        );
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#1A2533" />
            </TouchableOpacity>
            <Text style={styles.title}>Enter Verification Code</Text>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustration}>
              <Ionicons name="mail" size={60} color="#1A2533" />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionText}>
              We've sent a 4-digit verification code to
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.subInstructionText}>
              Enter the code below to continue with password reset
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null
                ]}
                value={digit}
                onChangeText={(value) => handleOTPChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (isLoading || otp.join('').length !== 4) && styles.verifyButtonDisabled
            ]}
            onPress={() => handleVerifyOTP()}
            disabled={isLoading || otp.join('').length !== 4}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            
            {canResend ? (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={isResending}
                style={styles.resendButton}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color="#1A2533" />
                ) : (
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend in {formatTimer(resendTimer)}
              </Text>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              The verification code will expire in 10 minutes. If you're having trouble, 
              please check your spam folder or try again.
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
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
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  subInstructionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A2533',
    backgroundColor: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: '#1A2533',
    backgroundColor: '#F0FDF9',
  },
  verifyButton: {
    backgroundColor: '#1A2533',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  verifyButtonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '600',
  },
  timerText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  helpContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default OTPVerificationScreen;