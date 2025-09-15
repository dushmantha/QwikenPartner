import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time: string) => void;
  currentTime?: string;
  title?: string;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onSelectTime,
  currentTime = '09:00',
  title = 'Select Time',
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (currentTime) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      setSelectedDate(date);
    }
  }, [currentTime, visible]);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date && event.type !== 'dismissed') {
      setSelectedDate(date);
    }
  };

  // Android-specific function to open the imperative API picker
  const openAndroidTimePicker = () => {
    DateTimePickerAndroid.open({
      value: selectedDate,
      onChange: handleTimeChange,
      mode: 'time',
      is24Hour: false,
      display: 'default',
    });
  };

  const handleConfirm = () => {
    const hours = selectedDate.getHours().toString().padStart(2, '0');
    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
    onSelectTime(`${hours}:${minutes}`);
    onClose();
  };

  // Quick time presets
  const timePresets = [
    { label: 'Early Morning', times: ['06:00', '06:30', '07:00', '07:30'] },
    { label: 'Morning', times: ['08:00', '08:30', '09:00', '09:30'] },
    { label: 'Late Morning', times: ['10:00', '10:30', '11:00', '11:30'] },
    { label: 'Afternoon', times: ['12:00', '13:00', '14:00', '15:00'] },
    { label: 'Late Afternoon', times: ['16:00', '17:00', '18:00', '19:00'] },
    { label: 'Evening', times: ['20:00', '20:30', '21:00', '21:30'] },
    { label: 'Night', times: ['22:00', '22:30', '23:00', '23:30'] },
  ];

  const selectPresetTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    setSelectedDate(date);
  };

  // Remove the conditional return for Android - use imperative API instead

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1A2533" />
            </TouchableOpacity>
          </View>

          {/* Current Selection */}
          <View style={styles.currentTimeContainer}>
            <Text style={styles.currentTimeLabel}>Selected Time</Text>
            <TouchableOpacity 
              style={styles.currentTimeButton}
              onPress={() => Platform.OS === 'android' ? openAndroidTimePicker() : null}
            >
              <Ionicons name="time-outline" size={24} color="#1A2533" />
              <Text style={styles.currentTimeText}>{formatTime(selectedDate)}</Text>
              {Platform.OS === 'android' && (
                <Ionicons name="create-outline" size={20} color="#1A2533" />
              )}
            </TouchableOpacity>
          </View>

          {/* iOS Time Picker - Always visible in modal for iOS */}
          {Platform.OS === 'ios' && (
            <View style={[styles.pickerContainer, { backgroundColor: 'white' }]}>
              <DateTimePicker
                value={selectedDate}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                themeVariant="light"
                locale="en"
              />
            </View>
          )}

          {/* Quick Select Presets */}
          <ScrollView style={styles.presetsContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.presetsTitle}>Quick Select</Text>
            {timePresets.map((preset) => (
              <View key={preset.label} style={styles.presetSection}>
                <Text style={styles.presetLabel}>{preset.label}</Text>
                <View style={styles.presetTimesRow}>
                  {preset.times.map((time) => {
                    const [h, m] = time.split(':').map(Number);
                    const isSelected = 
                      selectedDate.getHours() === h && 
                      selectedDate.getMinutes() === m;
                    
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.presetTimeButton,
                          isSelected && styles.presetTimeButtonSelected
                        ]}
                        onPress={() => selectPresetTime(time)}
                      >
                        <Text style={[
                          styles.presetTimeText,
                          isSelected && styles.presetTimeTextSelected
                        ]}>
                          {formatTime(new Date(2024, 0, 1, h, m))}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  currentTimeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  currentTimeLabel: {
    fontSize: 12,
    color: '#1A2533',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1A2533',
    gap: 12,
  },
  currentTimeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  pickerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iosPicker: {
    height: 200,
    backgroundColor: '#FFFFFF',
  },
  presetsContainer: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 12,
  },
  presetSection: {
    marginBottom: 16,
  },
  presetLabel: {
    fontSize: 12,
    color: '#1A2533',
    marginBottom: 8,
  },
  presetTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  presetTimeButtonSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#1A2533',
  },
  presetTimeText: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  presetTimeTextSelected: {
    color: '#1A2533',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#1A2533',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});