import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { serviceOptionsAPI, ServiceOption } from '../../services/api/serviceOptions/serviceOptionsAPI';
import { formatCurrency, CURRENCY } from '../../utils/currency';

// Navigation types
type RootStackParamList = {
  ServiceOptions: {
    serviceId?: string;
    serviceName: string;
    shopId: string;
    onGoBack?: () => void;
  };
};

type ServiceOptionsRouteProp = RouteProp<RootStackParamList, 'ServiceOptions'>;
type ServiceOptionsNavigationProp = StackNavigationProp<RootStackParamList, 'ServiceOptions'>;

const ServiceOptionsScreen: React.FC = () => {
  const navigation = useNavigation<ServiceOptionsNavigationProp>();
  const route = useRoute<ServiceOptionsRouteProp>();
  const { serviceId, serviceName, shopId, onGoBack } = route.params;

  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadServiceOptions();
  }, []);

  const handleGoBack = () => {
    if (onGoBack) {
      // Call the callback to reopen the service modal
      onGoBack();
    }
    navigation.goBack();
  };

  const loadServiceOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await serviceOptionsAPI.getServiceOptions(serviceName, shopId);
      if (error) {
        console.error('Error loading service options:', error);
        // Don't show alert for empty results, just start with empty array
      }
      setOptions(data || []);
      
      // If no options exist, add a default empty option
      if (!data || data.length === 0) {
        setOptions([createEmptyOption()]);
      }
    } catch (error) {
      console.error('Error loading service options:', error);
      Alert.alert('Error', 'Failed to load service options');
    } finally {
      setLoading(false);
    }
  };

  const createEmptyOption = (): ServiceOption => ({
    service_name: serviceName,
    shop_id: shopId,
    option_name: '',
    option_description: '',
    price: 0,
    duration: 30,
    is_active: true,
    sort_order: options.length,
  });

  const handleAddOption = () => {
    setOptions([...options, createEmptyOption()]);
    setEditingIndex(options.length);
  };

  const handleUpdateOption = (index: number, field: keyof ServiceOption, value: any) => {
    const updatedOptions = [...options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: field === 'price' || field === 'duration' || field === 'sort_order' ? Number(value) || 0 : value,
    };
    setOptions(updatedOptions);
  };

  const handleDeleteOption = (index: number) => {
    Alert.alert(
      'Delete Option',
      'Are you sure you want to delete this option?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedOptions = options.filter((_, i) => i !== index);
            setOptions(updatedOptions);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // Validate options
    const validOptions = options.filter(opt => opt.option_name.trim() !== '');
    
    if (validOptions.length === 0) {
      Alert.alert('No Options', 'No options to save. Add at least one option with a name or go back.', [
        { text: 'Go Back', onPress: handleGoBack },
        { text: 'Add Option', onPress: handleAddOption },
      ]);
      return;
    }

    setSaving(true);
    try {
      const { error } = await serviceOptionsAPI.upsertServiceOptions(
        shopId,
        serviceName,
        validOptions.map((opt, index) => ({
          ...opt,
          sort_order: index,
        }))
      );

      if (error) {
        Alert.alert('Error', 'Failed to save service options');
        return;
      }

      Alert.alert('Success', 'Service options saved successfully!', [
        { text: 'OK', onPress: handleGoBack }
      ]);
    } catch (error) {
      console.error('Error saving service options:', error);
      Alert.alert('Error', 'Failed to save service options');
    } finally {
      setSaving(false);
    }
  };

  const renderOption = (item: ServiceOption, index: number) => (
    <View key={index} style={styles.optionCard}>
      <View style={styles.optionHeader}>
        <Text style={styles.optionNumber}>Option {index + 1}</Text>
        {options.length > 1 && (
          <TouchableOpacity
            onPress={() => handleDeleteOption(index)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.optionField}>
        <Text style={styles.fieldLabel}>Option Name *</Text>
        <TextInput
          style={styles.input}
          value={item.option_name}
          onChangeText={(text) => handleUpdateOption(index, 'option_name', text)}
          placeholder="e.g., Men's Hair Cut"
          placeholderTextColor="#9CA3AF"
          onFocus={() => setEditingIndex(index)}
        />
      </View>

      <View style={styles.optionField}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={item.option_description}
          onChangeText={(text) => handleUpdateOption(index, 'option_description', text)}
          placeholder="Brief description of this option"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          onFocus={() => setEditingIndex(index)}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.optionField, styles.halfField]}>
          <Text style={styles.fieldLabel}>Price ({CURRENCY.code})</Text>
          <TextInput
            style={styles.input}
            value={item.price.toString()}
            onChangeText={(text) => handleUpdateOption(index, 'price', text)}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            onFocus={() => setEditingIndex(index)}
          />
        </View>

        <View style={[styles.optionField, styles.halfField]}>
          <Text style={styles.fieldLabel}>Duration (min)</Text>
          <TextInput
            style={styles.input}
            value={item.duration.toString()}
            onChangeText={(text) => handleUpdateOption(index, 'duration', text)}
            placeholder="30"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            onFocus={() => setEditingIndex(index)}
          />
        </View>
      </View>

      <View style={styles.activeSwitch}>
        <Text style={styles.fieldLabel}>Active</Text>
        <TouchableOpacity
          style={[styles.switchButton, item.is_active && styles.switchButtonActive]}
          onPress={() => handleUpdateOption(index, 'is_active', !item.is_active)}
        >
          <Text style={[styles.switchText, item.is_active && styles.switchTextActive]}>
            {item.is_active ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A2533" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Service Options</Text>
            <Text style={styles.subtitle}>{serviceName}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Loading options...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                Add different variations of your service with specific pricing and duration.
              </Text>
            </View>

            {options.map((option, index) => renderOption(option, index))}

            <TouchableOpacity style={styles.addButton} onPress={handleAddOption}>
              <Ionicons name="add-circle-outline" size={24} color="#1A2533" />
              <Text style={styles.addButtonText}>Add Another Option</Text>
            </TouchableOpacity>

            <View style={styles.exampleSection}>
              <Text style={styles.exampleTitle}>Examples:</Text>
              <Text style={styles.exampleText}>
                • Hair Salon: Child Cut, Men's Cut, Women's Cut, Clipper Cut{'\n'}
                • Massage: 30 min, 60 min, 90 min{'\n'}
                • Maintenance: Basic, Deep, Move-in/out
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleGoBack}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Options</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
  },
  subtitle: {
    fontSize: 14,
    color: '#1A2533',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#1A2533',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1A2533',
  },
  infoText: {
    fontSize: 14,
    color: '#1A2533',
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  deleteButton: {
    padding: 4,
  },
  optionField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A2533',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfField: {
    flex: 1,
    marginRight: 8,
  },
  activeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  switchButtonActive: {
    backgroundColor: '#10B981',
  },
  switchText: {
    color: '#1A2533',
    fontWeight: '600',
    fontSize: 14,
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1A2533',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#F5F5E9',
  },
  addButtonText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exampleSection: {
    backgroundColor: '#F5F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#1A2533',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServiceOptionsScreen;