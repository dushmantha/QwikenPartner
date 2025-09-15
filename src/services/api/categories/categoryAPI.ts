import { supabaseService } from '../../../lib/supabase/index';
import { shouldUseMockData, mockDelay, logMockUsage } from '../../../config/devConfig';
import { getMockCategories } from '../../../data/mockData';

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  service_count: number;
  is_active: boolean;
  sort_order: number;
}

export interface CategoryApiResponse {
  data: Category[] | null;
  error: string | null;
  status: number;
}

class CategoryAPI {
  private supabase = supabaseService;

  // Predefined categories with images and colors - always shown
  private getDefaultCategories(): Category[] {
    return [
      {
        id: 'hair-styling',
        name: 'Hair & styling',
        description: 'Haircuts, styling, coloring, and treatments',
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300&h=200&fit=crop',
        color: '#FFE0EC',
        service_count: 0,
        is_active: true,
        sort_order: 1
      },
      {
        id: 'nails',
        name: 'Nails',
        description: 'Manicure, pedicure, nail art, gel polish',
        image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=200&fit=crop',
        color: '#FFE8CC',
        service_count: 0,
        is_active: true,
        sort_order: 2
      },
      {
        id: 'eyebrows-eyelashes',
        name: 'Eyebrows & eyelashes',
        description: 'Eyebrow shaping, tinting, lash extensions',
        image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=300&h=200&fit=crop',
        color: '#F8E6FF',
        service_count: 0,
        is_active: true,
        sort_order: 3
      },
      {
        id: 'massage',
        name: 'Massage',
        description: 'Therapeutic massage, deep tissue, relaxation',
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&h=200&fit=crop',
        color: '#E0F7FA',
        service_count: 0,
        is_active: true,
        sort_order: 4
      },
      {
        id: 'barbering',
        name: 'Barbering',
        description: 'Men\'s haircuts, beard trimming, hot shaves',
        image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=200&fit=crop',
        color: '#F5F5E9',
        service_count: 0,
        is_active: true,
        sort_order: 5
      },
      {
        id: 'hair-removal',
        name: 'Hair removal',
        description: 'Waxing, laser hair removal, threading',
        image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=300&h=200&fit=crop',
        color: '#FFE5E5',
        service_count: 0,
        is_active: true,
        sort_order: 6
      },
      {
        id: 'facials-skincare',
        name: 'Facials & skincare',
        description: 'Deep cleansing, anti-aging treatments, facials',
        image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=300&h=200&fit=crop',
        color: '#E8F5E8',
        service_count: 0,
        is_active: true,
        sort_order: 7
      },
      {
        id: 'injectables-fillers',
        name: 'Injectables & fillers',
        description: 'Botox, dermal fillers, cosmetic injections',
        image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=200&fit=crop',
        color: '#F3E5F5',
        service_count: 0,
        is_active: true,
        sort_order: 8
      },
      {
        id: 'body',
        name: 'Body',
        description: 'Body treatments, scrubs, wraps, tanning',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&h=200&fit=crop',
        color: '#FFEFD5',
        service_count: 0,
        is_active: true,
        sort_order: 9
      },
      {
        id: 'tattoo-piercing',
        name: 'Tattoo & piercing',
        description: 'Tattoos, body piercing, permanent makeup',
        image: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=300&h=200&fit=crop',
        color: '#E5E5E5',
        service_count: 0,
        is_active: true,
        sort_order: 10
      },
      {
        id: 'makeup',
        name: 'Makeup',
        description: 'Professional makeup, bridal, special occasions',
        image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=300&h=200&fit=crop',
        color: '#FFE0F2',
        service_count: 0,
        is_active: true,
        sort_order: 11
      },
      {
        id: 'medical-dental',
        name: 'Medical & dental',
        description: 'Medical aesthetics, dental services, health treatments',
        image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=300&h=200&fit=crop',
        color: '#E6F3FF',
        service_count: 0,
        is_active: true,
        sort_order: 12
      },
      {
        id: 'counseling-holistic',
        name: 'Counseling & holistic',
        description: 'Wellness counseling, holistic therapies, alternative medicine',
        image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=300&h=200&fit=crop',
        color: '#F0E8FF',
        service_count: 0,
        is_active: true,
        sort_order: 13
      },
      {
        id: 'fitness',
        name: 'Fitness',
        description: 'Personal training, gym sessions, fitness classes',
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=200&fit=crop',
        color: '#E8FFE8',
        service_count: 0,
        is_active: true,
        sort_order: 14
      }
    ];
  }

  async getAllCategories(): Promise<CategoryApiResponse> {
    try {
      console.log('📋 Fetching all categories...');
      
      // Check if we should use mock data
      if (shouldUseMockData('MOCK_CATEGORIES')) {
        logMockUsage('Categories API');
        await mockDelay();
        
        const mockCategories = getMockCategories();
        console.log('🎭 Using mock categories:', mockCategories.length);
        
        return {
          data: mockCategories,
          error: null,
          status: 200
        };
      }
      
      // Get default categories (always shown)
      const defaultCategories = this.getDefaultCategories();
      
      // Try to get business categories from database to update service counts
      try {
        const result = await this.supabase.client
          .from('provider_businesses')
          .select('category')
          .eq('is_active', true);

        if (result.data && !result.error) {
          // Count businesses per category
          const categoryCounts: { [key: string]: number } = {};
          result.data.forEach((business: any) => {
            const category = business.category;
            if (category) {
              // Map database categories to our predefined category IDs
              const categoryId = this.mapCategoryNameToId(category);
              categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
            }
          });

          // Update service counts in default categories
          defaultCategories.forEach(category => {
            category.service_count = categoryCounts[category.id] || 0;
          });

          console.log('✅ Successfully updated category counts from database:', categoryCounts);
        } else {
          console.warn('⚠️ Could not fetch business categories from database, using defaults');
        }
      } catch (dbError) {
        console.warn('⚠️ Database unavailable, using default categories:', dbError);
      }

      // Sort by sort_order
      const sortedCategories = defaultCategories.sort((a, b) => a.sort_order - b.sort_order);

      return {
        data: sortedCategories,
        error: null,
        status: 200
      };

    } catch (error) {
      console.error('❌ Unexpected error fetching categories:', error);
      return {
        data: this.getDefaultCategories(), // Always return default categories as fallback
        error: null, // Don't show error to user, just use defaults
        status: 200
      };
    }
  }

  async getCategoriesWithServices(): Promise<CategoryApiResponse> {
    const allCategories = await this.getAllCategories();
    
    if (!allCategories.data) {
      return allCategories;
    }

    // Filter to only show categories that have services
    const categoriesWithServices = allCategories.data.filter(category => category.service_count > 0);

    return {
      data: categoriesWithServices,
      error: allCategories.error,
      status: allCategories.status
    };
  }

  async getCategoryById(categoryId: string): Promise<{ data: Category | null; error: string | null; status: number }> {
    const allCategories = await this.getAllCategories();
    
    if (!allCategories.data) {
      return {
        data: null,
        error: allCategories.error,
        status: allCategories.status
      };
    }

    const category = allCategories.data.find(cat => cat.id === categoryId);

    return {
      data: category || null,
      error: category ? null : 'Category not found',
      status: category ? 200 : 404
    };
  }

  private mapCategoryNameToId(categoryName: string): string {
    const mappings: { [key: string]: string } = {
      'Hair & styling': 'hair-styling',
      'Nails': 'nails',
      'Eyebrows & eyelashes': 'eyebrows-eyelashes',
      'Massage': 'massage',
      'Barbering': 'barbering',
      'Hair removal': 'hair-removal',
      'Facials & skincare': 'facials-skincare',
      'Injectables & fillers': 'injectables-fillers',
      'Body': 'body',
      'Tattoo & piercing': 'tattoo-piercing',
      'Makeup': 'makeup',
      'Medical & dental': 'medical-dental',
      'Counseling & holistic': 'counseling-holistic',
      'Fitness': 'fitness',
      // Legacy mappings for compatibility
      'Beauty & Wellness': 'hair-styling',
      'Hair Salon': 'hair-styling',
      'Spa & Wellness': 'massage',
      'Nail Care': 'nails',
      'Massage Therapy': 'massage',
      'Skincare': 'facials-skincare',
      'Fitness & Health': 'fitness',
      'Spa & Massage': 'massage',
      'Nails & Manicure': 'nails',
      'Facial & Skincare': 'facials-skincare',
      'Fitness & Gym': 'fitness',
      'Barbershop': 'barbering',
      'Makeup & Lashes': 'makeup'
    };

    return mappings[categoryName] || 'fitness';
  }

  async searchCategories(query: string): Promise<CategoryApiResponse> {
    const allCategories = await this.getAllCategories();
    
    if (!allCategories.data) {
      return allCategories;
    }

    const filteredCategories = allCategories.data.filter(category =>
      category.name.toLowerCase().includes(query.toLowerCase()) ||
      category.description.toLowerCase().includes(query.toLowerCase())
    );

    return {
      data: filteredCategories,
      error: null,
      status: 200
    };
  }
}

export const categoryAPI = new CategoryAPI();
export default categoryAPI;
export type { Category };