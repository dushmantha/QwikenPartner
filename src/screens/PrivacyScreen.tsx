import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccount } from '../navigation/AppNavigator';
import { normalizedShopService } from '../lib/supabase/normalized';

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts_only';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  shareLocationData: boolean;
  allowDataAnalytics: boolean;
  marketingEmails: boolean;
  pushNotifications: boolean;
  twoFactorAuth: boolean;
  dataCollection: {
    usage: boolean;
    performance: boolean;
    crashReports: boolean;
  };
  visibility: {
    phone: boolean;
    email: boolean;
    address: boolean;
    workHistory: boolean;
  };
}

const PrivacyScreen = ({ navigation }: { navigation: any }) => {
  const { accountType } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showOnlineStatus: true,
    allowDirectMessages: true,
    shareLocationData: false,
    allowDataAnalytics: true,
    marketingEmails: false,
    pushNotifications: true,
    twoFactorAuth: false,
    dataCollection: {
      usage: true,
      performance: true,
      crashReports: true,
    },
    visibility: {
      phone: true,
      email: false,
      address: false,
      workHistory: true,
    },
  });

  // Mock API service
  const mockPrivacyAPI = {
    async getPrivacySettings(userId: string): Promise<PrivacySettings> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },

    async updatePrivacySettings(userId: string, newSettings: PrivacySettings): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true };
    },

    async deleteAccount(userId: string): Promise<{ success: boolean }> {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },

    async downloadData(userId: string): Promise<{ success: boolean; downloadUrl?: string }> {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { success: true, downloadUrl: 'https://example.com/user-data.zip' };
    },
  };

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const response = await normalizedShopService.getPrivacySettings();
      
      if (response.success && response.data) {
        // Map database fields to local state
        setSettings({
          profileVisibility: response.data.profile_visibility || 'public',
          showOnlineStatus: response.data.show_online_status ?? true,
          allowDirectMessages: response.data.allow_direct_messages ?? true,
          shareLocationData: response.data.location_sharing ?? false,
          allowDataAnalytics: response.data.allow_data_analytics ?? true,
          marketingEmails: response.data.marketing_emails ?? false,
          pushNotifications: response.data.push_notifications ?? true,
          twoFactorAuth: response.data.two_factor_auth ?? false,
          dataCollection: {
            usage: response.data.allow_data_analytics ?? true,
            performance: response.data.allow_data_analytics ?? true,
            crashReports: response.data.allow_data_analytics ?? true,
          },
          visibility: {
            phone: response.data.visibility_phone ?? true,
            email: response.data.visibility_email ?? false,
            address: response.data.visibility_address ?? false,
            workHistory: response.data.visibility_work_history ?? true,
          },
        });
      } else {
        console.error('Failed to load privacy settings:', response.error);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      Alert.alert('Error', 'Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings: Partial<PrivacySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateDataCollection = (field: keyof PrivacySettings['dataCollection'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      dataCollection: {
        ...prev.dataCollection,
        [field]: value,
      },
    }));
  };

  const updateVisibility = (field: keyof PrivacySettings['visibility'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [field]: value,
      },
    }));
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Map local state to database fields
      const privacyData = {
        profile_visibility: settings.profileVisibility,
        show_online_status: settings.showOnlineStatus,
        allow_direct_messages: settings.allowDirectMessages,
        location_sharing: settings.shareLocationData,
        allow_data_analytics: settings.allowDataAnalytics,
        marketing_emails: settings.marketingEmails,
        push_notifications: settings.pushNotifications,
        two_factor_auth: settings.twoFactorAuth,
        visibility_phone: settings.visibility.phone,
        visibility_email: settings.visibility.email,
        visibility_address: settings.visibility.address,
        visibility_work_history: settings.visibility.workHistory,
      };
      
      const response = await normalizedShopService.updatePrivacySettings(privacyData);
      
      if (response.success) {
        Alert.alert('Success', 'Privacy settings updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Alert.alert('Error', 'Failed to update privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Coming Soon',
      'Account deletion feature is not available yet. This feature will be available in a future update.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleDownloadData = async () => {
    Alert.alert(
      'Coming Soon',
      'Data download feature is not available yet. This feature will be available in a future update.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const renderSectionHeader = (title: string, description?: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
    </View>
  );

  const renderSettingItem = (
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    icon?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        {icon && (
          <View style={styles.settingIcon}>
            <Ionicons name={icon} size={20} color="#6B7280" />
          </View>
        )}
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ 
          false: '#F3F4F6', 
          true: '#BBF7D0'
        }}
        thumbColor={value ? '#1A2533' : '#FFFFFF'}
      />
    </View>
  );

  const renderProfileVisibilityOption = (
    value: 'public' | 'private' | 'contacts_only',
    label: string,
    description: string
  ) => (
    <TouchableOpacity
      style={[
        styles.visibilityOption,
        settings.profileVisibility === value && styles.selectedVisibilityOption
      ]}
      onPress={() => updateSettings({ profileVisibility: value })}
    >
      <View style={styles.visibilityContent}>
        <Text style={[
          styles.visibilityLabel,
          settings.profileVisibility === value && styles.selectedVisibilityLabel
        ]}>
          {label}
        </Text>
        <Text style={styles.visibilityDescription}>{description}</Text>
      </View>
      {settings.profileVisibility === value && (
        <Ionicons 
          name="checkmark-circle" 
          size={24} 
          color="#1A2533" 
        />
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Visibility */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Profile Visibility',
            'Control who can see your profile information'
          )}
          
          {renderProfileVisibilityOption(
            'public',
            'Public',
            'Anyone can view your profile'
          )}
          
          {renderProfileVisibilityOption(
            'contacts_only',
            'Contacts Only',
            'Only people you have booked with can see your profile'
          )}
          
          {renderProfileVisibilityOption(
            'private',
            'Private',
            'Your profile is hidden from searches'
          )}
        </View>

        {/* Contact Information Visibility */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Contact Information',
            'Choose what contact details are visible to others'
          )}
          
          {renderSettingItem(
            'Show Phone Number',
            'Allow others to see your phone number',
            settings.visibility.phone,
            (value) => updateVisibility('phone', value),
            'call-outline'
          )}
          
          {renderSettingItem(
            'Show Email Address',
            'Allow others to see your email address',
            settings.visibility.email,
            (value) => updateVisibility('email', value),
            'mail-outline'
          )}
          
          {renderSettingItem(
            'Show Address',
            'Allow others to see your address',
            settings.visibility.address,
            (value) => updateVisibility('address', value),
            'location-outline'
          )}
          
          {accountType === 'provider' && renderSettingItem(
            'Show Work History',
            'Display your previous jobs and reviews',
            settings.visibility.workHistory,
            (value) => updateVisibility('workHistory', value),
            'briefcase-outline'
          )}
        </View>

        {/* Communication & Activity */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Communication & Activity',
            'Manage how others can communicate with you'
          )}
          
          {renderSettingItem(
            'Show Online Status',
            'Let others know when you are active',
            settings.showOnlineStatus,
            (value) => updateSettings({ showOnlineStatus: value }),
            'radio-button-on-outline'
          )}
          
          {renderSettingItem(
            'Allow Direct Messages',
            'Allow users to send you direct messages',
            settings.allowDirectMessages,
            (value) => updateSettings({ allowDirectMessages: value }),
            'chatbubble-outline'
          )}
        </View>

        {/* Location & Data */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Location & Data',
            'Control location sharing and data usage'
          )}
          
          {renderSettingItem(
            'Share Location Data',
            'Help improve service recommendations based on your location',
            settings.shareLocationData,
            (value) => updateSettings({ shareLocationData: value }),
            'location-outline'
          )}
          
          {renderSettingItem(
            'Allow Data Analytics',
            'Help us improve our services with anonymous usage data',
            settings.allowDataAnalytics,
            (value) => updateSettings({ allowDataAnalytics: value }),
            'analytics-outline'
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Notifications & Marketing',
            'Manage your notification preferences'
          )}
          
          {renderSettingItem(
            'Push Notifications',
            'Receive notifications about bookings and messages',
            settings.pushNotifications,
            (value) => updateSettings({ pushNotifications: value }),
            'notifications-outline'
          )}
          
          {renderSettingItem(
            'Marketing Emails',
            'Receive promotional emails and service updates',
            settings.marketingEmails,
            (value) => updateSettings({ marketingEmails: value }),
            'mail-outline'
          )}
        </View>

        {/* Data Collection */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Data Collection',
            'Help us improve our app with the following data'
          )}
          
          {renderSettingItem(
            'Usage Analytics',
            'Anonymous data about how you use the app',
            settings.dataCollection.usage,
            (value) => updateDataCollection('usage', value),
            'trending-up-outline'
          )}
          
          {renderSettingItem(
            'Performance Data',
            'Help us optimize app performance',
            settings.dataCollection.performance,
            (value) => updateDataCollection('performance', value),
            'speedometer-outline'
          )}
          
          {renderSettingItem(
            'Crash Reports',
            'Automatically send crash reports to help fix bugs',
            settings.dataCollection.crashReports,
            (value) => updateDataCollection('crashReports', value),
            'bug-outline'
          )}
        </View>

        {/* Security */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Security',
            'Additional security measures for your account'
          )}
          
          {renderSettingItem(
            'Two-Factor Authentication',
            'Add an extra layer of security to your account',
            settings.twoFactorAuth,
            (value) => {
              Alert.alert(
                'Coming Soon',
                'Two-Factor Authentication feature is not available yet. This feature will be available in a future update.',
                [{ text: 'OK', style: 'default' }]
              );
            },
            'shield-checkmark-outline'
          )}
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => {
              Alert.alert(
                'Coming Soon',
                'Change password feature is not available yet. This feature will be available in a future update.',
                [{ text: 'OK', style: 'default' }]
              );
            }}
          >
            <View style={styles.actionContent}>
              <Ionicons name="key-outline" size={20} color="#6B7280" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Change Password</Text>
                <Text style={styles.actionDescription}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          {renderSectionHeader(
            'Data Management',
            'Manage your personal data and account'
          )}
          
          <TouchableOpacity style={styles.actionItem} onPress={handleDownloadData}>
            <View style={styles.actionContent}>
              <Ionicons name="download-outline" size={20} color="#3B82F6" />
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: '#3B82F6' }]}>Download My Data</Text>
                <Text style={styles.actionDescription}>Get a copy of all your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleDeleteAccount}>
            <View style={styles.actionContent}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Delete Account</Text>
                <Text style={styles.actionDescription}>Permanently delete your account and data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Privacy Policy Link */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.policyLink}
            onPress={() => navigation.navigate('TermsConditions')}
          >
            <Ionicons name="document-text-outline" size={16} color="#6B7280" />
            <Text style={styles.policyText}>Read our Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            accountType === 'provider' && styles.providerSaveButton,
            isSaving && styles.disabledButton
          ]}
          onPress={saveSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE', // Light accent cream
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533', // Dark accent
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FFFE', // Secondary
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533', // Dark accent
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FFFE', // Secondary
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FFFE', // Light accent cream
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F8FFFE', // Secondary
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#1A2533', // Dark accent
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FFFE', // Secondary
  },
  selectedVisibilityOption: {
    backgroundColor: '#F0FFFE', // Light accent cream
  },
  visibilityContent: {
    flex: 1,
    marginRight: 12,
  },
  visibilityLabel: {
    fontSize: 16,
    color: '#1A2533', // Dark accent
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedVisibilityLabel: {
    fontWeight: '600',
    color: '#1A2533', // Primary Navy Blue
  },
  visibilityDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FFFE', // Secondary
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    color: '#1A2533', // Dark accent
    fontWeight: '500',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  policyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 8,
  },
  saveContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F8FFFE', // Secondary
    paddingBottom: 24,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2533', // Primary Navy Blue
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  providerSaveButton: {
    backgroundColor: '#1A2533', // Primary Navy Blue
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text for button
    marginLeft: 8,
  },
});

export default PrivacyScreen;