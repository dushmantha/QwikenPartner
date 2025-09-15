import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  FlatList
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatCurrency } from '../utils/currency';

// Types
interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  rating: number;
  reviews_count: number;
  professional_name: string;
  salon_name: string;
  location: string;
  distance: string;
  image: string;
  category_id: string;
  available_time_text: string;
  welcome_message: string;
  special_note: string;
  payment_methods: string[];
  is_favorite: boolean;
}

interface Category {
  id: string;
  name: string;
  image: string;
  service_count: number;
  color: string;
  description?: string;
}

interface Professional {
  id: string;
  name: string;
  salon: string;
  rating: number;
  location: string;
  image: string;
}

interface SearchResults {
  services: Service[];
  categories: Category[];
  professionals: Professional[];
}

type RootStackParamList = {
  Search: {
    query?: string;
    initialResults?: SearchResults;
    filter?: string;
  };
  ServiceDetail: { serviceId: string; service?: Service };
  ServiceList: { category: string; categoryId: string };
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;
type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute<SearchScreenRouteProp>();
  
  const initialQuery = route.params?.query || '';
  const initialResults = route.params?.initialResults;
  const filterType = route.params?.filter;

  // State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResults>(
    initialResults || { services: [], categories: [], professionals: [] }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'services' | 'categories' | 'professionals'>(
    filterType === 'professional' ? 'professionals' : 'all'
  );

  // Search function
  const performSearch = useCallback(async (query: string, showLoader = true) => {
    if (!query.trim()) {
      setSearchResults({ services: [], categories: [], professionals: [] });
      return;
    }

    try {
      if (showLoader) setIsLoading(true);

      // TODO: Replace with real API calls to Supabase
      console.log('TODO: Implement search for query:', query);
      
      // Return empty results for now
      const services = [];
      const categories = [];

      // Extract professionals from services
      const professionals = services.map(service => ({
        id: `${service.professional_name}-${service.salon_name}`,
        name: service.professional_name,
        salon: service.salon_name,
        rating: service.rating,
        location: service.location,
        image: service.image
      }));

      // Remove duplicate professionals
      const uniqueProfessionals = professionals.filter((prof, index, self) =>
        index === self.findIndex(p => p.id === prof.id)
      );

      setSearchResults({
        services,
        categories,
        professionals: uniqueProfessionals
      });

    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch(text);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    performSearch(searchQuery, false);
  }, [searchQuery, performSearch]);

  // Handle navigation back
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Filter results based on active filter
  const getFilteredResults = () => {
    switch (activeFilter) {
      case 'services':
        return { services: searchResults.services, categories: [], professionals: [] };
      case 'categories':
        return { services: [], categories: searchResults.categories, professionals: [] };
      case 'professionals':
        return { services: [], categories: [], professionals: searchResults.professionals };
      default:
        return searchResults;
    }
  };

  // Get result counts
  const getResultCounts = () => ({
    total: searchResults.services.length + searchResults.categories.length + searchResults.professionals.length,
    services: searchResults.services.length,
    categories: searchResults.categories.length,
    professionals: searchResults.professionals.length
  });

  // Handle item press
  const handleItemPress = (type: string, item: any) => {
    switch (type) {
      case 'service':
        navigation.navigate('ServiceDetail', { serviceId: item.id, service: item });
        break;
      case 'category':
        navigation.navigate('ServiceList', { category: item.name, categoryId: item.id });
        break;
      case 'professional':
        // You could navigate to a professional profile or filter services by professional
        performSearch(item.name);
        break;
    }
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }
    
    return stars.join('');
  };

  // Render service item
  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleItemPress('service', item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.resultImage} />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.professional_name} • {item.salon_name}
        </Text>
        <View style={styles.resultMeta}>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.stars}>{renderStars(item.rating)}</Text>
            <Text style={styles.reviews}>({item.reviews_count})</Text>
          </View>
          <Text style={styles.price}>{formatCurrency(item.price)}</Text>
        </View>
        <Text style={styles.location} numberOfLines={1}>{item.location}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render category item
  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleItemPress('category', item)}
      activeOpacity={0.8}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color || '#1A2533' }]}>
        <Ionicons name="grid-outline" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultSubtitle}>{item.service_count} services available</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render professional item
  const renderProfessionalItem = ({ item }: { item: Professional }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleItemPress('professional', item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.resultImage} />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultSubtitle}>{item.salon}</Text>
        <View style={styles.resultMeta}>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.stars}>{renderStars(item.rating)}</Text>
          </View>
        </View>
        <Text style={styles.location} numberOfLines={1}>{item.location}</Text>
      </View>
    </TouchableOpacity>
  );

  // Load initial search if query exists
  useEffect(() => {
    if (initialQuery && !initialResults) {
      performSearch(initialQuery);
    }
  }, []);

  const filteredResults = getFilteredResults();
  const counts = getResultCounts();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F0FFFE" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1A2533" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Results</Text>
        <View style={styles.headerRight}>
          <Text style={styles.resultsCount}>{counts.total} results</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#1A2533" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, categories, professionals..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setSearchResults({ services: [], categories: [], professionals: [] });
              }}
            >
              <Ionicons name="close-circle" size={20} color="#1A2533" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {[
            { key: 'all', label: 'All', count: counts.total },
            { key: 'services', label: 'Services', count: counts.services },
            { key: 'categories', label: 'Categories', count: counts.categories },
            { key: 'professionals', label: 'Professionals', count: counts.professionals }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                activeFilter === filter.key && styles.activeFilterTab
              ]}
              onPress={() => setActiveFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === filter.key && styles.activeFilterTabText
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1A2533"
            colors={['#1A2533']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A2533" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <>
            {/* Services */}
            {(activeFilter === 'all' || activeFilter === 'services') && filteredResults.services.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Services</Text>
                <FlatList
                  data={filteredResults.services}
                  renderItem={renderServiceItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Categories */}
            {(activeFilter === 'all' || activeFilter === 'categories') && filteredResults.categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <FlatList
                  data={filteredResults.categories}
                  renderItem={renderCategoryItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Professionals */}
            {(activeFilter === 'all' || activeFilter === 'professionals') && filteredResults.professionals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professionals</Text>
                <FlatList
                  data={filteredResults.professionals}
                  renderItem={renderProfessionalItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* No Results */}
            {counts.total === 0 && searchQuery.length > 0 && !isLoading && (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsText}>
                  Try adjusting your search terms or browse categories
                </Text>
              </View>
            )}

            {/* Empty State */}
            {counts.total === 0 && searchQuery.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Start searching</Text>
                <Text style={styles.emptyText}>
                  Search for services, categories, or professionals
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#F0FFFE',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  resultsCount: {
    fontSize: 12,
    color: '#1A2533',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0FFFE',
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A2533',
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    backgroundColor: '#F0FFFE',
    paddingBottom: 12,
  },
  filterTabs: {
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterTab: {
    backgroundColor: '#1A2533',
    borderColor: '#1A2533',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2533',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F0FFFE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A2533',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2533',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F8FFFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#1A2533',
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginRight: 4,
  },
  stars: {
    color: '#1A2533',
    fontSize: 12,
    marginRight: 4,
  },
  reviews: {
    fontSize: 12,
    color: '#1A2533',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
  },
  location: {
    fontSize: 12,
    color: '#1A2533',
  },
  description: {
    fontSize: 13,
    color: '#1A2533',
    lineHeight: 18,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default SearchScreen;