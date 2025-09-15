import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase/index';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ServiceSelection {
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
    options?: {
      id: string;
      name: string;
      price: number;
      duration: string;
    }[];
  };
  optionId?: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  rating: number;
  profileImage?: string;
  isOwner?: boolean;
}

interface RouteParams {
  selectedServices: ServiceSelection[];
  shopId: string;
  shopName: string;
}

const StaffSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);

  useEffect(() => {
    fetchStaffMembers();
  }, [params.shopId]);

  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch staff members from database
      const { data: staffData, error } = await supabase
        .from('shop_staff')
        .select('*')
        .eq('shop_id', params.shopId)
        .order('name');

      if (error) {
        console.error('Error fetching staff:', error);
        // Use fallback data with some sample staff
        setStaffMembers([
          {
            id: 'any',
            name: 'Any professional',
            role: 'for maximum availability',
            rating: 0,
            profileImage: undefined,
          },
          {
            id: 'staff-1',
            name: 'Sarah Johnson',
            role: 'Senior Stylist',
            rating: 4.8,
            profileImage: undefined,
            isOwner: false,
          },
          {
            id: 'staff-2',
            name: 'Mike Davis',
            role: 'Hair Specialist',
            rating: 4.6,
            profileImage: undefined,
            isOwner: false,
          },
        ]);
      } else if (staffData && staffData.length > 0) {
        // Add "Any professional" option first
        const formattedStaff: Staff[] = [
          {
            id: 'any',
            name: 'Any professional',
            role: 'for maximum availability',
            rating: 0,
            profileImage: undefined,
          },
          ...staffData.map(staff => ({
            id: staff.id,
            name: staff.name,
            role: staff.role || 'Professional',
            rating: staff.rating || 5.0,
            profileImage: staff.profile_image,
            isOwner: false, // Default to false since column doesn't exist
          }))
        ];
        setStaffMembers(formattedStaff);
      } else {
        // No staff found, use default with sample data
        setStaffMembers([
          {
            id: 'any',
            name: 'Any professional',
            role: 'for maximum availability',
            rating: 0,
            profileImage: undefined,
          },
          {
            id: 'default-staff',
            name: 'Professional Stylist',
            role: 'Hair Specialist',
            rating: 4.5,
            profileImage: undefined,
            isOwner: false,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaffMembers([
        {
          id: 'any',
          name: 'Any professional',
          role: 'for maximum availability',
          rating: 0,
          profileImage: undefined,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId);
  };

  const handleContinue = () => {
    if (!selectedStaff) return;

    // Prepare selected services for booking
    const selectedServicesArray: any[] = [];
    let totalPrice = 0;
    
    params.selectedServices?.forEach(({ service, optionId }) => {
      if (optionId) {
        const option = service.options?.find(opt => opt.id === optionId);
        if (option) {
          selectedServicesArray.push({
            id: option.id,
            name: `${service.name} - ${option.name}`,
            price: option.price.toString(),
            duration: option.duration,
          });
          totalPrice += option.price;
        }
      } else {
        selectedServicesArray.push({
          id: service.id,
          name: service.name,
          price: service.price.toString(),
          duration: `${service.duration} mins`,
        });
        totalPrice += service.price;
      }
    });

    const selectedStaffMember = staffMembers.find(staff => staff.id === selectedStaff);

    // Navigate to booking summary
    navigation.navigate('BookingSummary', {
      selectedServices: selectedServicesArray,
      totalPrice: totalPrice,
      selectedStaff: selectedStaffMember,
      shopId: params.shopId,
      shopName: params.shopName,
    });
  };

  const calculateTotal = () => {
    let total = 0;
    let totalDuration = 0;
    
    params.selectedServices?.forEach(({ service, optionId }) => {
      if (optionId) {
        const option = service.options?.find(opt => opt.id === optionId);
        if (option) {
          total += option.price;
          totalDuration += parseInt(option.duration) || 0;
        }
      } else {
        total += service.price;
        totalDuration += service.duration;
      }
    });
    
    return { total, totalDuration, count: params.selectedServices?.length || 0 };
  };

  const renderStaffMember = (staff: Staff) => {
    const isSelected = selectedStaff === staff.id;
    const isAnyProfessional = staff.id === 'any';
    
    return (
      <TouchableOpacity
        key={staff.id}
        style={[styles.staffCard, isSelected && styles.staffCardSelected]}
        onPress={() => handleStaffSelect(staff.id)}
        activeOpacity={0.7}
      >
        <View style={styles.staffContent}>
          <View style={styles.staffImageContainer}>
            {staff.profileImage && !isAnyProfessional ? (
              <Image source={{ uri: staff.profileImage }} style={styles.staffImage} />
            ) : (
              <View style={[styles.staffImagePlaceholder, isAnyProfessional && styles.anyProfessionalImage]}>
                <Ionicons 
                  name={isAnyProfessional ? "people" : "person"} 
                  size={isAnyProfessional ? 28 : 32} 
                  color={isAnyProfessional ? "#8B5CF6" : "#9CA3AF"} 
                />
              </View>
            )}
            {staff.rating > 0 && !isAnyProfessional && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{staff.rating.toFixed(1)}</Text>
                <Ionicons name="star" size={12} color="#F59E0B" />
              </View>
            )}
            {isSelected && (
              <View style={styles.selectedOverlay}>
                <View style={styles.selectedCheckmark}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.staffInfo}>
            <Text style={[styles.staffName, isAnyProfessional && styles.anyProfessionalName]}>
              {staff.name}
            </Text>
            <Text style={[styles.staffRole, isAnyProfessional && styles.anyProfessionalRole]}>
              {staff.role}
            </Text>
            {staff.role === 'Owner' && !isAnyProfessional && (
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerText}>Owner</Text>
              </View>
            )}
          </View>
        </View>

        {isSelected && (
          <View style={styles.selectionCheckmark}>
            <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choose Professional</Text>
          <Text style={styles.headerSubtitle}>{params.shopName}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.navigate('ServiceDetail')}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Staff List */}
      <ScrollView 
        style={styles.staffScrollView}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading team members...</Text>
          </View>
        ) : (
          <>
            <View style={styles.staffContainer}>
              <Text style={styles.sectionTitle}>Who would you like to book with?</Text>
              {staffMembers.map(staff => renderStaffMember(staff))}
            </View>
            
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>

      {/* Bottom Continue Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryPrice}>${calculateTotal().total}</Text>
          <Text style={styles.summaryServices}>{calculateTotal().count} service{calculateTotal().count !== 1 ? 's' : ''} • {calculateTotal().totalDuration} mins</Text>
        </View>
        <TouchableOpacity 
          style={[styles.continueButton, !selectedStaff && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedStaff}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  closeButton: {
    padding: 8,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  staffScrollView: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  staffContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  staffCardSelected: {
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.15,
  },
  staffContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  staffImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  staffImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  staffImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  anyProfessionalImage: {
    backgroundColor: '#F3F0FF',
    borderColor: '#E4D4F4',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.7)',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckmark: {
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 4,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  anyProfessionalName: {
    color: '#8B5CF6',
  },
  staffRole: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  anyProfessionalRole: {
    color: '#A855F7',
  },
  ownerBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  ownerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectionCheckmark: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryServices: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  bottomSpacing: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
});

export default StaffSelectionScreen;