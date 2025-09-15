import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { favoritesAPI, FavoriteShop } from '../services/api/favorites/favoritesAPI';
import { useAuth } from '../navigation/AppNavigator';
import { createFavoritesTable } from '../utils/createFavoritesTable';
import { shouldUseMockData, mockDelay, logMockUsage } from '../config/devConfig';
import { getMockShops } from '../data/mockData';

type FavoritesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Favorites'>;

const FavoritesScreen = () => {
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteShop[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get user ID from auth context - use mock ID if no user authenticated
  const userId = user?.id || '12345678-1234-1234-1234-123456789012';
  
  console.log('❤️ FavoritesScreen - User ID:', userId);
  console.log('❤️ FavoritesScreen - User object:', user);
  console.log('❤️ FavoritesScreen - isAuthenticated:', isAuthenticated);
  console.log('❤️ FavoritesScreen - isLoading (auth):', isLoading);

  const loadFavorites = useCallback(async (showLoader = true) => {
    if (!userId) {
      console.log('❤️ No user ID available, skipping favorites load');
      setFavoritesLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (showLoader) setFavoritesLoading(true);
      
      // Check if we should use mock data
      if (shouldUseMockData('MOCK_SHOPS')) {
        await mockDelay();
        logMockUsage('Loading mock favorites');
        
        // Get mock shops and mark first 3 as favorites
        const mockShops = getMockShops();
        const mockFavorites: FavoriteShop[] = mockShops.slice(0, 3).map(shop => ({
          id: `fav_${shop.id}`,
          user_id: userId,
          shop_id: shop.id,
          shop_name: shop.name,
          shop_image_url: shop.images?.[0] || shop.logo || '',
          shop_rating: shop.rating || 0,
          shop_category: shop.category,
          shop_address: shop.address,
          created_at: new Date().toISOString(),
        }));
        
        console.log('❤️ Mock favorites loaded:', mockFavorites.length);
        setFavorites(mockFavorites);
      } else {
        console.log('❤️ Loading favorites for user:', userId);
        const response = await favoritesAPI.getUserFavorites(userId);
        
        if (!response.success) {
          Alert.alert('Error', response.error || 'Failed to load favorites');
          return;
        }

        setFavorites(response.data || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setFavoritesLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const handleRemoveFavorite = async (shopId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this shop from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userId) {
                Alert.alert('Error', 'Please log in to manage favorites');
                return;
              }
              
              const response = await favoritesAPI.removeFavorite(userId, shopId);
              
              if (!response.success) {
                Alert.alert('Error', response.error || 'Failed to remove favorite');
                return;
              }
              
              // Remove from local state
              setFavorites(prev => prev.filter(fav => fav.shop_id !== shopId));
              Alert.alert('Success', 'Removed from favorites');
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove favorite');
            }
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites(false);
  }, [loadFavorites]);

  const renderFavoriteItem = ({ item }: { item: FavoriteShop }) => (
    <TouchableOpacity
      style={styles.favoriteCard}
      onPress={() => {
        // Navigate to service detail
        navigation.navigate('ServiceDetail', { serviceId: item.shop_id });
      }}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {item.shop_image_url ? (
          <Image source={{ uri: item.shop_image_url }} style={styles.shopImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color="#9CA3AF" />
          </View>
        )}
        {item.shop_logo_url && (
          <Image source={{ uri: item.shop_logo_url }} style={styles.shopLogo} />
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.shopName} numberOfLines={1}>{item.shop_name}</Text>
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleRemoveFavorite(item.shop_id)}
          >
            <Ionicons name="heart" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.category}>{item.shop_category}</Text>
        
        <View style={styles.detailsRow}>
          {item.shop_rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFC107" />
              <Text style={styles.rating}>{item.shop_rating.toFixed(1)}</Text>
            </View>
          )}
          
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color="#1A2533" />
            <Text style={styles.location} numberOfLines={1}>
              {item.shop_city}, {item.shop_country}
            </Text>
          </View>
        </View>
        
        <Text style={styles.addedDate}>
          Added {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptyText}>
        Start adding your favorite shops to see them here
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('HomeTab' as never)}
      >
        <Text style={styles.browseButtonText}>Browse Shops</Text>
      </TouchableOpacity>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && userId) {
        loadFavorites();
      }
    }, [loadFavorites, isAuthenticated, userId])
  );

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Favorites</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show login required if not authenticated
  if (!isAuthenticated || !user || !userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Favorites</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptyText}>
            Please log in to view your favorites
          </Text>
          <Text style={[styles.emptyText, { marginTop: 10, fontSize: 12, color: '#9CA3AF' }]}>
            Debug: user={!!user}, userId={!!userId}, isAuth={isAuthenticated}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (favoritesLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Favorites</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A2533" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorites</Text>
        {favorites.length > 0 && (
          <Text style={styles.headerCount}>{favorites.length} shops</Text>
        )}
      </View>
      
      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={item => item.favorite_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1A2533"
            colors={['#1A2533']}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
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
    paddingVertical: 16,
    backgroundColor: '#F0FFFE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A2533',
  },
  headerCount: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F8FFFE',
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopLogo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2533',
    flex: 1,
    marginRight: 8,
  },
  heartButton: {
    padding: 4,
  },
  category: {
    fontSize: 14,
    color: '#1A2533',
    fontWeight: '500',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2533',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  location: {
    fontSize: 14,
    color: '#1A2533',
    marginLeft: 4,
    flex: 1,
  },
  addedDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2533',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#1A2533',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#1A2533',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FavoritesScreen;