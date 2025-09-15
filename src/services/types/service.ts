// src/types/service.ts

export interface ServiceOption {
    id: string;
    service_id: string;
    name: string;
    description: string;
    duration: number; // in minutes
    price: number; // in currency units
    is_default: boolean;
    created_at: string;
  }
  
  export interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    category_id: string;
    category?: string; // Category display name for header
    image: string;
    rating: number;
    reviews_count: number;
    professional_name: string;
    salon_name: string;
    location: string;
    distance: string;
    available_times: string[];
    certificate_images: string[];
    before_after_images: string[];
    available_time_text: string;
    welcome_message: string;
    special_note: string;
    payment_methods: string[];
    is_favorite: boolean;
    created_at: string;
    logo_url?: string; // Shop logo separate from main image
    options?: ServiceOption[]; // Optional: when service includes options
    discounts?: any; // Discount information for header display
  }
  
  export interface ServiceWithOptions extends Service {
    options: ServiceOption[];
  }
  
  // For component state management
  export interface ServiceOptionState {
    id: string;
    name: string;
    description: string;
    duration: string;
    price: string;
    selected: boolean;
  }
  
  // API Response types
  export interface ApiResponse<T> {
    data: T;
    error: string | null;
    meta: {
      total?: number;
      page?: number;
      per_page?: number;
      total_pages?: number;
      service_id?: string;
      options_count?: number;
      message?: string;
    } | null;
  }
  
  export interface BookingService {
    id: string;
    name: string;
    price: string;
    duration: string;
  }
  
  export interface BookingSummaryParams {
    selectedServices: BookingService[];
    totalPrice: number;
  }