// Development Configuration
// Toggle this flag to enable/disable mock data throughout the app

export const DEV_CONFIG = {
  // Main flag to enable/disable all mock data
  USE_MOCK_DATA: false, // Set to false for production/real data
  
  // Granular controls for different types of mock data
  MOCK_FLAGS: {
    // Authentication & User Data
    MOCK_AUTH: true,
    MOCK_USER_PROFILE: true,
    
    // Shop & Business Data
    MOCK_SHOPS: true,
    MOCK_SERVICES: true,
    MOCK_STAFF: true,
    MOCK_CATEGORIES: true,
    
    // Booking & Appointment Data
    MOCK_BOOKINGS: true,
    MOCK_AVAILABILITY: true,
    MOCK_SCHEDULE: true,
    
    // Reviews & Ratings
    MOCK_REVIEWS: true,
    MOCK_RATINGS: true,
    
    // Search & Discovery
    MOCK_SEARCH_RESULTS: true,
    MOCK_RECOMMENDATIONS: true,
    
    // Notifications & Messages
    MOCK_NOTIFICATIONS: true,
    MOCK_MESSAGES: true,
    
    // Payment & Transactions
    MOCK_PAYMENTS: true,
    MOCK_DISCOUNTS: true,
    
    // Location & Map Data
    MOCK_LOCATIONS: true,
    MOCK_NEARBY_SHOPS: true,
  },
  
  // Development helpers
  SHOW_DEV_INDICATORS: false, // Show visual indicators when using mock data
  LOG_MOCK_USAGE: true, // Log when mock data is being used
  MOCK_DELAY_MS: 500, // Simulate network delay for realistic testing
};

// Helper function to check if we should use mock data
export const shouldUseMockData = (flag?: keyof typeof DEV_CONFIG.MOCK_FLAGS): boolean => {
  if (!DEV_CONFIG.USE_MOCK_DATA) return false;
  if (!flag) return true;
  return DEV_CONFIG.MOCK_FLAGS[flag] ?? false;
};

// Helper function to simulate network delay
export const mockDelay = (): Promise<void> => {
  if (!DEV_CONFIG.USE_MOCK_DATA) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, DEV_CONFIG.MOCK_DELAY_MS));
};

// Helper function to log mock data usage
export const logMockUsage = (context: string, data?: any): void => {
  if (DEV_CONFIG.LOG_MOCK_USAGE && DEV_CONFIG.USE_MOCK_DATA) {
    console.log(`🎭 MOCK DATA: ${context}`, data ? data : '');
  }
};