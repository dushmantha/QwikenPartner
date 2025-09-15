import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { serviceOptionsAPI, ServiceOption } from '../services/api/serviceOptions/serviceOptionsAPI';

interface ServiceOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
  shopId: string;
  onSave?: () => void;
}

export const ServiceOptionsModal: React.FC<ServiceOptionsModalProps> = ({
  visible,
  onClose,
  serviceId,
  serviceName,
  shopId,
  onSave,
}) => {
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadServiceOptions();
    }
  }, [visible, serviceId, shopId]);

  const loadServiceOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await serviceOptionsAPI.getServiceOptions(serviceId, shopId);
      if (error) {
        Alert.alert('Error', 'Failed to load service options');
        return;
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
    service_id: serviceId,
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
      Alert.alert('Error', 'Please add at least one option with a name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await serviceOptionsAPI.upsertServiceOptions(
        shopId,
        serviceId,
        validOptions.map((opt, index) => ({
          ...opt,
          sort_order: index,
        }))
      );

      if (error) {
        Alert.alert('Error', 'Failed to save service options');
        return;
      }

      Alert.alert('Success', 'Service options saved successfully');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving service options:', error);
      Alert.alert('Error', 'Failed to save service options');
    } finally {
      setSaving(false);
    }
  };

  const renderOption = ({ item, index }: { item: ServiceOption; index: number }) => {
    const isEditing = editingIndex === index;

    return (
      <View style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <Text style={styles.optionNumber}>Option {index + 1}</Text>
          <TouchableOpacity
            onPress={() => handleDeleteOption(index)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.optionField}>
          <Text style={styles.fieldLabel}>Option Name *</Text>
          <TextInput
            style={styles.input}
            value={item.option_name}
            onChangeText={(text) => handleUpdateOption(index, 'option_name', text)}
            placeholder="e.g., Men's Hair Cut"
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
            multiline
            numberOfLines={2}
            onFocus={() => setEditingIndex(index)}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.optionField, styles.halfField]}>
            <Text style={styles.fieldLabel}>Price (NZD)</Text>
            <TextInput
              style={styles.input}
              value={item.price.toString()}
              onChangeText={(text) => handleUpdateOption(index, 'price', text)}
              placeholder="0"
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Service Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <Text style={styles.serviceName}>{serviceName}</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>Loading options...</Text>
            </View>
          ) : (
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {options.map((option, index) => (
                <View key={index}>
                  {renderOption({ item: option, index })}
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={handleAddOption}>
                <Ionicons name="add-circle-outline" size={24} color="#1A2533" />
                <Text style={styles.addButtonText}>Add Option</Text>
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

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, saving && styles.disabledButton]}
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2533',
    backgroundColor: '#F8F9FA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2533',
  },
  closeButton: {
    padding: 4,
  },
  serviceName: {
    fontSize: 16,
    color: '#1A2533',
    paddingHorizontal: 20,
    paddingTop: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#1A2533',
  },
  optionsList: {
    padding: 20,
    maxHeight: 400,
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionNumber: {
    fontSize: 14,
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
    fontSize: 13,
    color: '#1A2533',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
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
    paddingVertical: 6,
    borderRadius: 16,
  },
  switchButtonActive: {
    backgroundColor: '#1A2533',
  },
  switchText: {
    color: '#1A2533',
    fontWeight: '600',
    fontSize: 13,
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
  },
  addButtonText: {
    color: '#1A2533',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exampleSection: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  saveButton: {
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

export default ServiceOptionsModal;