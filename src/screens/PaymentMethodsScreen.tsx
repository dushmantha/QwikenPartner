import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount } from '../navigation/AppNavigator';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'digital_wallet';
  provider: string;
  last_four?: string;
  card_brand?: 'visa' | 'mastercard' | 'amex' | 'discover';
  account_name?: string;
  bank_name?: string;
  is_default: boolean;
  expires_at?: string;
  created_at: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  account_type: 'checking' | 'savings';
  is_verified: boolean;
  is_default: boolean;
}

const PaymentMethodsScreen = ({ navigation }: { navigation: any }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [activeTab, setActiveTab] = useState<'payment' | 'payout'>('payment');
  
  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');

  // Mock API service
  const mockPaymentAPI = {
    async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        {
          id: '1',
          type: 'card',
          provider: 'Stripe',
          last_four: '4242',
          card_brand: 'visa',
          is_default: true,
          expires_at: '2027-12',
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          type: 'card',
          provider: 'Stripe',
          last_four: '1234',
          card_brand: 'mastercard',
          is_default: false,
          expires_at: '2026-08',
          created_at: '2024-02-20T14:15:00Z',
        },
        {
          id: '3',
          type: 'digital_wallet',
          provider: 'Apple Pay',
          is_default: false,
          created_at: '2024-03-10T09:45:00Z',
        },
      ];
    },

    async getBankAccounts(userId: string): Promise<BankAccount[]> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        {
          id: '1',
          bank_name: 'ANZ Bank',
          account_name: 'John Smith',
          account_number: '****1234',
          routing_number: '012345',
          account_type: 'checking',
          is_verified: true,
          is_default: true,
        },
        {
          id: '2',
          bank_name: 'Westpac',
          account_name: 'John Smith Business',
          account_number: '****5678',
          routing_number: '067890',
          account_type: 'checking',
          is_verified: false,
          is_default: false,
        },
      ];
    },

    async addPaymentMethod(method: Partial<PaymentMethod>): Promise<{ success: boolean; id?: string }> {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, id: `new_${Date.now()}` };
    },

    async addBankAccount(account: Partial<BankAccount>): Promise<{ success: boolean; id?: string }> {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, id: `bank_${Date.now()}` };
    },

    async deletePaymentMethod(methodId: string): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },

    async setDefaultMethod(methodId: string): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
  };

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      const [methods, accounts] = await Promise.all([
        mockPaymentAPI.getPaymentMethods('user-123'),
        mockPaymentAPI.getBankAccounts('user-123'),
      ]);
      setPaymentMethods(methods);
      setBankAccounts(accounts);
    } catch (error) {
      console.error('Error loading payment data:', error);
      Alert.alert('Error', 'Failed to load payment information');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ');
    return formatted.trim();
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateCard = () => {
    if (cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return false;
    }
    if (expiryDate.length !== 5) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY)');
      return false;
    }
    if (cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV');
      return false;
    }
    if (!cardholderName.trim()) {
      Alert.alert('Invalid Name', 'Please enter the cardholder name');
      return false;
    }
    return true;
  };

  const validateBankAccount = () => {
    if (!bankName.trim()) {
      Alert.alert('Invalid Bank', 'Please enter the bank name');
      return false;
    }
    if (!accountName.trim()) {
      Alert.alert('Invalid Name', 'Please enter the account holder name');
      return false;
    }
    if (accountNumber.length < 8) {
      Alert.alert('Invalid Account', 'Please enter a valid account number');
      return false;
    }
    if (routingNumber.length < 6) {
      Alert.alert('Invalid Routing', 'Please enter a valid routing number');
      return false;
    }
    return true;
  };

  const handleAddCard = async () => {
    if (!validateCard()) return;

    try {
      const response = await mockPaymentAPI.addPaymentMethod({
        type: 'card',
        provider: 'Stripe',
        last_four: cardNumber.slice(-4),
        card_brand: 'visa', // Would detect from card number
        is_default: paymentMethods.length === 0,
        expires_at: `20${expiryDate.slice(-2)}-${expiryDate.slice(0, 2)}`,
      });

      if (response.success) {
        Alert.alert('Success', 'Card added successfully');
        setShowAddModal(false);
        resetCardForm();
        loadPaymentData();
      } else {
        Alert.alert('Error', 'Failed to add card');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add card');
    }
  };

  const handleAddBankAccount = async () => {
    if (!validateBankAccount()) return;

    try {
      const response = await mockPaymentAPI.addBankAccount({
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        routing_number: routingNumber,
        account_type: accountType,
        is_verified: false,
        is_default: bankAccounts.length === 0,
      });

      if (response.success) {
        Alert.alert('Success', 'Bank account added successfully. Verification may take 1-2 business days.');
        setShowBankModal(false);
        resetBankForm();
        loadPaymentData();
      } else {
        Alert.alert('Error', 'Failed to add bank account');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add bank account');
    }
  };

  const resetCardForm = () => {
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
  };

  const resetBankForm = () => {
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setRoutingNumber('');
    setAccountType('checking');
  };

  const handleDeleteMethod = (methodId: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await mockPaymentAPI.deletePaymentMethod(methodId);
              if (response.success) {
                setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
                Alert.alert('Success', 'Payment method removed');
              } else {
                Alert.alert('Error', 'Failed to remove payment method');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove payment method');
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await mockPaymentAPI.setDefaultMethod(methodId);
      if (response.success) {
        setPaymentMethods(prev => prev.map(method => ({
          ...method,
          is_default: method.id === methodId
        })));
        Alert.alert('Success', 'Default payment method updated');
      } else {
        Alert.alert('Error', 'Failed to update default payment method');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const getCardIcon = (brand?: string) => {
    switch (brand) {
      case 'visa':
        return 'card-outline';
      case 'mastercard':
        return 'card-outline';
      case 'amex':
        return 'card-outline';
      default:
        return 'card-outline';
    }
  };

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.methodItem}>
      <View style={styles.methodContent}>
        <View style={[styles.methodIcon, { backgroundColor: getMethodColor(item.type) }]}>
          <Ionicons 
            name={item.type === 'digital_wallet' ? 'wallet-outline' : getCardIcon(item.card_brand)} 
            size={24} 
            color="#FFFFFF" 
          />
        </View>
        
        <View style={styles.methodDetails}>
          <Text style={styles.methodTitle}>
            {item.type === 'digital_wallet' ? item.provider : `${item.card_brand?.toUpperCase()} •••• ${item.last_four}`}
          </Text>
          <Text style={styles.methodSubtitle}>
            {item.type === 'digital_wallet' 
              ? 'Digital Wallet' 
              : `Expires ${item.expires_at}`
            }
          </Text>
          {item.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => {
          setSelectedMethod(item);
          showMethodOptions(item);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  const renderBankAccount = ({ item }: { item: BankAccount }) => (
    <View style={styles.methodItem}>
      <View style={styles.methodContent}>
        <View style={[styles.methodIcon, { backgroundColor: '#059669' }]}>
          <Ionicons name="business-outline" size={24} color="#FFFFFF" />
        </View>
        
        <View style={styles.methodDetails}>
          <Text style={styles.methodTitle}>
            {item.bank_name} •••• {item.account_number.slice(-4)}
          </Text>
          <Text style={styles.methodSubtitle}>
            {item.account_name} • {item.account_type}
          </Text>
          <View style={styles.badgeContainer}>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              item.is_verified ? styles.verifiedBadge : styles.pendingBadge
            ]}>
              <Text style={[
                styles.statusText,
                item.is_verified ? styles.verifiedText : styles.pendingText
              ]}>
                {item.is_verified ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => showBankOptions(item)}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'card':
        return '#3B82F6';
      case 'digital_wallet':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const showMethodOptions = (method: PaymentMethod) => {
    const options = [];
    
    if (!method.is_default) {
      options.push({ text: 'Set as Default', onPress: () => handleSetDefault(method.id) });
    }
    
    options.push(
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMethod(method.id) },
      { text: 'Cancel', style: 'cancel' }
    );

    Alert.alert('Payment Method Options', 'Choose an action', options);
  };

  const showBankOptions = (account: BankAccount) => {
    const options = [];
    
    if (!account.is_default) {
      options.push({ text: 'Set as Default', onPress: () => console.log('Set bank as default') });
    }
    
    if (!account.is_verified) {
      options.push({ text: 'Verify Account', onPress: () => console.log('Verify bank account') });
    }
    
    options.push(
      { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete bank account') },
      { text: 'Cancel', style: 'cancel' }
    );

    Alert.alert('Bank Account Options', 'Choose an action', options);
  };

  const renderAddCardModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Credit Card</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowAddModal(false);
              resetCardForm();
            }}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput
              style={styles.textInput}
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              placeholder="1234 5678 9012 3456"
              keyboardType="numeric"
              maxLength={19}
            />
          </View>
          
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Expiry Date</Text>
              <TextInput
                style={styles.textInput}
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                placeholder="MM/YY"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={styles.textInput}
                value={cvv}
                onChangeText={setCvv}
                placeholder="123"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.textInput}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="John Smith"
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <Text style={styles.securityText}>
              Your payment information is encrypted and secure
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.addButton, accountType === 'provider' && styles.providerAddButton]}
            onPress={handleAddCard}
          >
            <Text style={styles.addButtonText}>Add Card</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderAddBankModal = () => (
    <Modal
      visible={showBankModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Bank Account</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowBankModal(false);
              resetBankForm();
            }}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.textInput}
              value={bankName}
              onChangeText={setBankName}
              placeholder="ANZ Bank"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Holder Name</Text>
            <TextInput
              style={styles.textInput}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="John Smith"
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.textInput}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="12-3456-7890123-456"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Routing Number</Text>
            <TextInput
              style={styles.textInput}
              value={routingNumber}
              onChangeText={setRoutingNumber}
              placeholder="012345"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Type</Text>
            <View style={styles.accountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.accountTypeOption,
                  accountType === 'checking' && styles.selectedAccountType
                ]}
                onPress={() => setAccountType('checking')}
              >
                <Text style={[
                  styles.accountTypeText,
                  accountType === 'checking' && styles.selectedAccountTypeText
                ]}>
                  Checking
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.accountTypeOption,
                  accountType === 'savings' && styles.selectedAccountType
                ]}
                onPress={() => setAccountType('savings')}
              >
                <Text style={[
                  styles.accountTypeText,
                  accountType === 'savings' && styles.selectedAccountTypeText
                ]}>
                  Savings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.verificationNotice}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.verificationText}>
              Account verification may take 1-2 business days
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.addButton, accountType === 'provider' && styles.providerAddButton]}
            onPress={handleAddBankAccount}
          >
            <Text style={styles.addButtonText}>Add Bank Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading payment methods...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Tab Navigation for Providers */}
      {accountType === 'provider' && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
            onPress={() => setActiveTab('payment')}
          >
            <Ionicons 
              name={activeTab === 'payment' ? 'card' : 'card-outline'} 
              size={20} 
              color={activeTab === 'payment' ? '#059669' : '#6B7280'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'payment' && styles.activeTabText
            ]}>
              Payment Methods
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payout' && styles.activeTab]}
            onPress={() => setActiveTab('payout')}
          >
            <Ionicons 
              name={activeTab === 'payout' ? 'business' : 'business-outline'} 
              size={20} 
              color={activeTab === 'payout' ? '#059669' : '#6B7280'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'payout' && styles.activeTabText
            ]}>
              Payout Accounts
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        
        {/* Payment Methods Section */}
        {(accountType === 'consumer' || activeTab === 'payment') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Methods</Text>
              <Text style={styles.sectionDescription}>
                Manage your cards and digital wallets for payments
              </Text>
            </View>
            
            {paymentMethods.length > 0 ? (
              <FlatList
                data={paymentMethods}
                renderItem={renderPaymentMethod}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No payment methods</Text>
                <Text style={styles.emptyDescription}>
                  Add a card or digital wallet to make payments
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.addMethodButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#3B82F6" />
              <Text style={styles.addMethodText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bank Accounts Section (for providers) */}
        {accountType === 'provider' && activeTab === 'payout' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payout Accounts</Text>
              <Text style={styles.sectionDescription}>
                Bank accounts where you receive payments from customers
              </Text>
            </View>
            
            {bankAccounts.length > 0 ? (
              <FlatList
                data={bankAccounts}
                renderItem={renderBankAccount}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No bank accounts</Text>
                <Text style={styles.emptyDescription}>
                  Add a bank account to receive payments
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.addMethodButton}
              onPress={() => setShowBankModal(true)}
            >
              <Ionicons name="add" size={20} color="#059669" />
              <Text style={[styles.addMethodText, { color: '#059669' }]}>Add Bank Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Security Information */}
        <View style={styles.section}>
          <View style={styles.securitySection}>
            <Ionicons name="shield-checkmark" size={24} color="#059669" />
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Your information is secure</Text>
              <Text style={styles.securityDescription}>
                We use bank-level encryption to protect your payment information. 
                Your data is never stored on our servers.
              </Text>
            </View>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.helpText}>Payment Methods Help</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="document-text-outline" size={20} color="#6B7280" />
            <Text style={styles.helpText}>Payment Security Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {renderAddCardModal()}
      {renderAddBankModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#059669',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultBadge: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  defaultText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedText: {
    color: '#065F46',
  },
  pendingText: {
    color: '#92400E',
  },
  moreButton: {
    padding: 8,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addMethodText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  helpText: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
    marginLeft: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputHalf: {
    flex: 0.48,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A2533',
  },
  accountTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  accountTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedAccountType: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  accountTypeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedAccountTypeText: {
    color: '#1A2533',
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
  },
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  verificationText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  providerAddButton: {
    backgroundColor: '#059669',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PaymentMethodsScreen;