import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ServiceOption {
  id: string;
  name: string;
  duration: string;
  price: number;
  description?: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  options?: ServiceOption[];
  category?: string;
}

interface RouteParams {
  services: Service[];
  shopName: string;
  shopId: string;
  categories?: string[];
}

const AllServicesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params?.services) {
      setServices(params.services);
    }
  }, [params]);


  const handleBookService = (service: Service) => {
    // Check if service has options
    if (service.options && service.options.length > 0) {
      // Navigate to service options selection
      navigation.navigate('ServiceOptions', {
        service: service,
        shopId: params.shopId,
        shopName: params.shopName,
      });
    } else {
      // Navigate directly to staff selection
      navigation.navigate('StaffSelection', {
        selectedServices: [{ service }],
        shopId: params.shopId,
        shopName: params.shopName,
      });
    }
  };


  const filteredServices = services;

  const renderService = (service: Service) => {
    return (
      <View key={service.id} style={styles.serviceItem}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceDuration}>{service.duration} mins</Text>
          <Text style={styles.servicePrice}>${service.price}</Text>
        </View>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => handleBookService(service)}
          activeOpacity={0.7}
        >
          <Text style={styles.bookButtonText}>Book</Text>
        </TouchableOpacity>
      </View>
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
          <Text style={styles.headerTitle}>All Services</Text>
          <Text style={styles.headerSubtitle}>{params.shopName}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>


      {/* Services List */}
      <ScrollView 
        style={styles.servicesScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        ) : filteredServices.length > 0 ? (
          <View style={styles.servicesContainer}>
            {filteredServices.map(service => renderService(service))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptyText}>Try selecting a different category</Text>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

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
  servicesScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  servicesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  bookButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default AllServicesScreen;