import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface StripeWebViewProps {
  visible: boolean;
  checkoutUrl: string;
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
  onCancel: () => void;
}

const StripeWebView: React.FC<StripeWebViewProps> = ({
  visible,
  checkoutUrl,
  onClose,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    console.log('WebView navigation:', url);
    
    // Check for success URL pattern
    if (url.includes('payment-success') || url.includes('qwiken-success.com/payment-success')) {
      const sessionIdMatch = url.match(/session_id=([^&]+)/);
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        console.log('Payment successful, session ID:', sessionId);
        onSuccess(sessionId);
      } else {
        console.log('Payment successful but no session ID found');
        onSuccess('');
      }
      return;
    }
    
    // Check for cancel URL pattern
    if (url.includes('payment-cancelled') || url.includes('qwiken-success.com/payment-cancelled')) {
      console.log('Payment cancelled');
      onCancel();
      return;
    }
  };

  const handleError = () => {
    console.error('WebView error occurred');
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    console.log('WebView loaded successfully');
    setLoading(false);
    setError(false);
  };

  const handleLoadStart = () => {
    console.log('WebView load started');
    setLoading(true);
    setError(false);
  };

  const handleClose = () => {
    setLoading(true);
    setError(false);
    onClose();
  };

  const retryLoad = () => {
    setError(false);
    setLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color="#1A2533" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading secure payment...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Payment Error</Text>
            <Text style={styles.errorMessage}>
              Unable to load the payment page. Please check your connection and try again.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WebView */}
        {!error && checkoutUrl && (
          <WebView
            ref={webViewRef}
            source={{ uri: checkoutUrl }}
            style={styles.webview}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoad}
            onError={handleError}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            userAgent="Qwiken-iOS/1.0"
          />
        )}

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#059669" />
          <Text style={styles.securityText}>Secured by Stripe</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '500',
  },
  webview: {
    flex: 1,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  securityText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
});

export default StripeWebView;