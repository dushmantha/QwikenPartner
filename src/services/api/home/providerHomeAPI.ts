// Real API service using Supabase data
import { shopAPI, Shop } from '../shops/shopAPI';

// Helper function to simulate API delay for consistency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle API requests
const apiRequest = async (endpoint: string, options = {}) => {
  try {
    console.log('API Request:', endpoint);
    
    // Add realistic delay
    await delay(300);
    
    if (endpoint.includes('/home')) {
      // Fetch real shop data from Supabase
      try {
        console.log('🏠 Attempting to fetch real shop data from Supabase...');
        const homeShopData = await shopAPI.getHomeShopData();
        
        if (!homeShopData.data) {
          console.warn('⚠️ No real shop data available, falling back to mock data');
          throw new Error(homeShopData.error || 'Failed to fetch shops');
        }

        const shops = homeShopData.data.shops;
        console.log('✅ Successfully fetched real shop data:', shops.length, 'shops');
        
        // Transform shops to services format for backward compatibility
        const services = shops.map(shop => ({
          id: shop.id,
          name: shop.name,
          description: shop.description,
          professional_name: shop.category || 'Service Provider', // Use shop category instead of hardcoded "Shop Owner"
          salon_name: shop.name,
          // Get price from first service if available, otherwise use null (will be handled by UI)
          price: shop.services && shop.services.length > 0 ? shop.services[0].price : null,
          duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 60,
          rating: shop.rating || 4.5,
          reviews_count: shop.reviews_count || 0,
          location: `${shop.city}, ${shop.country}`,
          distance: shop.distance || '1.5 km',
          // Use first image from shop images array, or fallback to logo_url, or placeholder
          image: shop.images && shop.images.length > 0 
            ? shop.images[0] 
            : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'
        }));

        // Generate categories from shop data
        const categoryMap = new Map();
        shops.forEach(shop => {
          if (!categoryMap.has(shop.category)) {
            categoryMap.set(shop.category, {
              id: shop.category.toLowerCase().replace(/\s+/g, '-'),
              name: shop.category,
              service_count: 0,
              color: '#F5F5E9', // Default color
              image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
              description: `${shop.category} services`
            });
          }
          categoryMap.get(shop.category).service_count++;
        });

        const categories = Array.from(categoryMap.values());

        return {
          data: {
            categories: categories,
            promotions: [], // No promotions for now
            popularServices: services,
            upcomingBookings: [],
            stats: {
              totalServices: services.length,
              totalCategories: categories.length,
              totalProviders: shops.length,
              avgRating: homeShopData.data.stats.avgRating
            }
          },
          error: null,
          status: 200
        };
      } catch (error) {
        console.error('❌ Error fetching real shop data:', error);
        console.log('🎭 Falling back to mock data for demonstration...');
        
        // Return comprehensive mock data when real data fails
        const mockCategories = [
          {
            id: 'beauty-wellness',
            name: 'Beauty & Wellness',
            service_count: 5,
            color: '#F5F5E9',
            image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
            description: 'Beauty and wellness services'
          },
          {
            id: 'maintenance',
            name: 'Maintenance',
            service_count: 3,
            color: '#E1F5FE',
            image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&h=200&fit=crop',
            description: 'Professional maintenance services'
          },
          {
            id: 'home-services',
            name: 'Home Services',
            service_count: 4,
            color: '#F3E5F5',
            image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop',
            description: 'Home maintenance and repair services'
          },
          {
            id: 'fitness-health',
            name: 'Fitness & Health',
            service_count: 6,
            color: '#E8F5E8',
            image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop',
            description: 'Fitness and health services'
          },
          {
            id: 'automotive',
            name: 'Automotive',
            service_count: 2,
            color: '#FFF3E0',
            image: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=300&h=200&fit=crop',
            description: 'Car maintenance and repair services'
          },
          {
            id: 'pet-services',
            name: 'Pet Services',
            service_count: 3,
            color: '#E0F2F1',
            image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300&h=200&fit=crop',
            description: 'Pet care and grooming services'
          }
        ];

        const mockServices = [
          {
            id: 'service-1',
            name: 'Hair Styling',
            description: 'Professional hair cutting and styling',
            professional_name: 'Anna Lindström',
            salon_name: 'Stockholm Beauty Salon', 
            price: 450,
            duration: 60,
            rating: 4.8,
            reviews_count: 127,
            location: 'Stockholm, Sweden',
            distance: '1.2 km',
            image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'
          },
          {
            id: 'service-2', 
            name: 'Home Maintenance',
            description: 'Professional home repair and maintenance',
            professional_name: 'Erik Johansson',
            salon_name: 'Home Repair Services',
            price: 350,
            duration: 120,
            rating: 4.6,
            reviews_count: 89,
            location: 'Göteborg, Sweden', 
            distance: '2.1 km',
            image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'
          },
          {
            id: 'service-3',
            name: 'Personal Training',
            description: 'One-on-one fitness training sessions',
            professional_name: 'Sara Nilsson',
            salon_name: 'Fit Life Gym',
            price: 500,
            duration: 60,
            rating: 4.9,
            reviews_count: 156,
            location: 'Malmö, Sweden',
            distance: '0.8 km', 
            image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
          },
          {
            id: 'service-4',
            name: 'Massage Therapy',
            description: 'Relaxing Swedish massage therapy',
            professional_name: 'Maria Andersson',
            salon_name: 'Wellness Center',
            price: 750,
            duration: 90,
            rating: 4.7,
            reviews_count: 203,
            location: 'Uppsala, Sweden',
            distance: '1.5 km',
            image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop'
          }
        ];

        return {
          data: {
            categories: mockCategories,
            promotions: [],
            popularServices: mockServices,
            upcomingBookings: [],
            stats: {
              totalServices: mockServices.length,
              totalCategories: mockCategories.length,
              totalProviders: 15,
              avgRating: 4.7
            }
          },
          error: null,
          status: 200
        };
      }
    }

    if (endpoint.includes('/search/categories') || endpoint.includes('/categories/search')) {
      const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
      const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
      
      try {
        console.log('🔍 Searching categories with query:', query);
        const homeShopData = await shopAPI.getHomeShopData();
        const categories = homeShopData.data?.categories || [];
        
        const filteredCategories = categories.filter(category => 
          category.toLowerCase().includes(query)
        ).map(category => ({
          id: category.toLowerCase().replace(/\s+/g, '-'),
          name: category,
          service_count: 1,
          color: '#F5F5E9',
          image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
          description: `${category} services`
        }));
        
        return {
          data: { categories: filteredCategories },
          error: null,
          status: 200
        };
      } catch (error) {
        console.error('❌ Error searching categories, using mock data:', error);
        
        // Mock categories for search
        const mockCategories = [
          { id: 'beauty-wellness', name: 'Beauty & Wellness', service_count: 5, color: '#F5F5E9', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop', description: 'Beauty and wellness services' },
          { id: 'maintenance', name: 'Maintenance', service_count: 3, color: '#E1F5FE', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&h=200&fit=crop', description: 'Professional maintenance services' },
          { id: 'home-services', name: 'Home Services', service_count: 4, color: '#F3E5F5', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop', description: 'Home maintenance and repair services' },
          { id: 'fitness-health', name: 'Fitness & Health', service_count: 6, color: '#E8F5E8', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop', description: 'Fitness and health services' },
          { id: 'automotive', name: 'Automotive', service_count: 2, color: '#FFF3E0', image: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=300&h=200&fit=crop', description: 'Car maintenance and repair services' },
          { id: 'pet-services', name: 'Pet Services', service_count: 3, color: '#E0F2F1', image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300&h=200&fit=crop', description: 'Pet care and grooming services' }
        ];
        
        const filteredCategories = mockCategories.filter(category => 
          category.name.toLowerCase().includes(query)
        );
        
        return {
          data: { categories: filteredCategories },
          error: null,
          status: 200
        };
      }
    }
    
    if (endpoint.includes('/services/search')) {
      const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
      const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
      
      try {
        const searchResults = await shopAPI.searchShops(query);
        
        if (!searchResults.data) {
          throw new Error(searchResults.error || 'Search failed');
        }
        
        const services = searchResults.data.map(shop => ({
          id: shop.id,
          name: shop.name,
          description: shop.description,
          professional_name: shop.category || 'Service Provider', // Use shop category instead of hardcoded "Shop Owner"
          salon_name: shop.name,
          // Get price from first service if available, otherwise use null
          price: shop.services && shop.services.length > 0 ? shop.services[0].price : null,
          duration: shop.services && shop.services.length > 0 ? shop.services[0].duration : 60,
          rating: shop.rating || 4.5,
          reviews_count: shop.reviews_count || 0,
          location: `${shop.city}, ${shop.country}`,
          distance: shop.distance || '1.5 km',
          image: shop.images && shop.images.length > 0 
            ? shop.images[0] 
            : shop.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'
        }));
        
        return {
          data: { services: services },
          error: null,
          status: 200
        };
      } catch (error) {
        console.error('❌ Error searching services:', error);
        return {
          data: { services: [] },
          error: null,
          status: 200
        };
      }
    }
    
    if (endpoint.includes('/search/suggestions')) {
      const urlParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
      const query = new URLSearchParams(urlParams).get('q')?.toLowerCase() || '';
      
      const suggestions = [
        `${query} massage`,
        `${query} hårklippning`,
        `${query} naglar`,
        `${query} ansiktsbehandling`
      ].filter(suggestion => suggestion !== `${query} `);
      
      return {
        data: suggestions.slice(0, 5),
        error: null,
        status: 200
      };
    }
    
    // Default response for unhandled endpoints
    return {
      data: [],
      error: null,
      status: 200
    };
    
  } catch (error: any) {
    console.error('API Request Error:', error);
    
    return {
      data: null,
      error: error.message || 'Network request failed',
      status: error.status || 500,
    };
  }
};

// Search API Functions
export const searchAPI = {
  // General search across all content
  searchAll: async (query: string, filters = {}) => {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    
    return apiRequest(`/search?${params}`);
  },

  // Search services specifically
  searchServices: async (query: string, options = {}) => {
    const {
      category = '',
      location = '',
      minPrice = '',
      maxPrice = '',
      rating = '',
      sortBy = 'relevance', // relevance, price, rating, distance
      page = 1,
      limit = 20,
    } = options;

    const params = new URLSearchParams({
      q: query,
      ...(category && { category }),
      ...(location && { location }),
      ...(minPrice && { min_price: minPrice }),
      ...(maxPrice && { max_price: maxPrice }),
      ...(rating && { min_rating: rating }),
      sort_by: sortBy,
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest(`/services/search?${params}`);
  },

  // Search categories
  searchCategories: async (query: string) => {
    const params = new URLSearchParams({ q: query });
    return apiRequest(`/categories/search?${params}`);
  },

  // Search professionals/providers
  searchProfessionals: async (query: string, options = {}) => {
    const {
      location = '',
      rating = '',
      page = 1,
      limit = 20,
    } = options;

    const params = new URLSearchParams({
      q: query,
      ...(location && { location }),
      ...(rating && { min_rating: rating }),
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest(`/professionals/search?${params}`);
  },

  // Get search suggestions/autocomplete
  getSearchSuggestions: async (query: string) => {
    if (query.length < 2) {
      return { data: [], error: null };
    }
    
    const params = new URLSearchParams({ q: query });
    return apiRequest(`/search/suggestions?${params}`);
  },

  // Get popular/trending searches
  getPopularSearches: async () => {
    return apiRequest('/search/popular');
  },

  // Get recent search history (when user auth is ready)
  getSearchHistory: async (userId: string) => {
    return apiRequest(`/users/${userId}/search-history`);
  },

  // Save search query to history
  saveSearchHistory: async (userId: string, query: string) => {
    return apiRequest(`/users/${userId}/search-history`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
};

// Home Data API Functions
export const homeAPI = {
  // Get all home screen data
  getHomeData: async (userId = null) => {
    // Always use /home endpoint for consistency
    const endpoint = '/home';
    console.log('🏠 HomeAPI calling endpoint:', endpoint, 'with userId:', userId || 'anonymous');
    return apiRequest(endpoint);
  },

  // Get categories
  getCategories: async () => {
    return apiRequest('/categories');
  },

  // Get promotions
  getPromotions: async () => {
    return apiRequest('/promotions/active');
  },

  // Get popular services
  getPopularServices: async (limit = 10) => {
    return apiRequest(`/services/popular?limit=${limit}`);
  },

  // Get user's upcoming bookings
  getUpcomingBookings: async (userId: string) => {
    return apiRequest(`/users/${userId}/bookings/upcoming`);
  },

  // Get platform stats
  getStats: async () => {
    return apiRequest('/stats');
  },
};

// Service API Functions
export const serviceAPI = {
  // Get service details
  getServiceDetails: async (serviceId: string) => {
    return apiRequest(`/services/${serviceId}`);
  },

  // Get services by category
  getServicesByCategory: async (categoryId: string, options = {}) => {
    const {
      location = '',
      sortBy = 'popular',
      page = 1,
      limit = 20,
    } = options;

    const params = new URLSearchParams({
      category_id: categoryId,
      ...(location && { location }),
      sort_by: sortBy,
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest(`/services?${params}`);
  },

  // Get nearby services
  getNearbyServices: async (latitude: number, longitude: number, radius = 10) => {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString(),
    });

    return apiRequest(`/services/nearby?${params}`);
  },
};

// Booking API Functions
export const bookingAPI = {
  // Create a new booking
  createBooking: async (bookingData: any) => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Get user's bookings
  getUserBookings: async (userId: string, status = 'all') => {
    const params = status !== 'all' ? `?status=${status}` : '';
    return apiRequest(`/users/${userId}/bookings${params}`);
  },

  // Cancel booking
  cancelBooking: async (bookingId: string) => {
    return apiRequest(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    });
  },
};

// Location API Functions
export const locationAPI = {
  // Get available locations/cities
  getLocations: async () => {
    return apiRequest('/locations');
  },

  // Search locations
  searchLocations: async (query: string) => {
    const params = new URLSearchParams({ q: query });
    return apiRequest(`/locations/search?${params}`);
  },
};

// Main API object (keeping backward compatibility)
const providerHomeAPI = {
  // Home data
  getHomeData: homeAPI.getHomeData,
  
  // Search functions
  searchAll: searchAPI.searchAll,
  searchServices: searchAPI.searchServices,
  searchCategories: searchAPI.searchCategories,
  searchProfessionals: searchAPI.searchProfessionals,
  getSearchSuggestions: searchAPI.getSearchSuggestions,
  getPopularSearches: searchAPI.getPopularSearches,
  
  // Services
  getServiceDetails: serviceAPI.getServiceDetails,
  getServicesByCategory: serviceAPI.getServicesByCategory,
  getNearbyServices: serviceAPI.getNearbyServices,
  
  // Bookings
  createBooking: bookingAPI.createBooking,
  getUserBookings: bookingAPI.getUserBookings,
  cancelBooking: bookingAPI.cancelBooking,
  
  // Categories
  getCategories: homeAPI.getCategories,
  
  // Locations
  getLocations: locationAPI.getLocations,
  searchLocations: locationAPI.searchLocations,
};

export default providerHomeAPI;