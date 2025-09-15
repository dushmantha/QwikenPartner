import { supabase } from '../../../lib/supabase/normalized';

export interface UserReview {
  review_id: string;
  booking_id: string;
  shop_id?: string;
  rating: number;
  comment: string;
  detailed_ratings: {
    service_quality: number;
    punctuality: number;
    cleanliness: number;
    value_for_money: number;
  };
  created_at: string;
}

export interface UserMetadataReviewsResponse {
  success: boolean;
  data: UserReview[];
  error?: string;
  total_reviews: number;
}

class UserMetadataReviewsService {
  
  /**
   * Get all reviews from user metadata
   */
  async getUserReviews(): Promise<UserMetadataReviewsResponse> {
    try {
      console.log('📖 Fetching user reviews from metadata...');

      // Get current user and their metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          data: [],
          error: 'User not authenticated',
          total_reviews: 0
        };
      }

      console.log('👤 User metadata:', user.user_metadata);

      const reviews: UserReview[] = [];
      const metadata = user.user_metadata || {};

      // Get the latest review
      if (metadata.latest_review) {
        reviews.push(metadata.latest_review);
        console.log('📝 Found latest review:', metadata.latest_review);
      }

      // Get review history if it exists (for future use)
      if (metadata.review_history && Array.isArray(metadata.review_history)) {
        reviews.push(...metadata.review_history);
        console.log('📝 Found review history:', metadata.review_history.length);
      }

      // Sort by created_at (newest first)
      reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Remove duplicates based on booking_id
      const uniqueReviews = reviews.filter((review, index, self) => 
        index === self.findIndex(r => r.booking_id === review.booking_id)
      );

      const totalReviews = metadata.review_count || uniqueReviews.length;

      console.log('✅ Retrieved', uniqueReviews.length, 'unique reviews from metadata');

      return {
        success: true,
        data: uniqueReviews,
        error: undefined,
        total_reviews: totalReviews
      };

    } catch (error) {
      console.error('❌ Error fetching user reviews:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        total_reviews: 0
      };
    }
  }

  /**
   * Get user review statistics
   */
  async getUserReviewStats(): Promise<{
    success: boolean;
    data?: {
      total_reviews: number;
      average_rating: number;
      last_review_date?: string;
      most_recent_rating?: number;
    };
    error?: string;
  }> {
    try {
      const reviewsResponse = await this.getUserReviews();
      
      if (!reviewsResponse.success) {
        return {
          success: false,
          error: reviewsResponse.error
        };
      }

      const reviews = reviewsResponse.data;
      
      if (reviews.length === 0) {
        return {
          success: true,
          data: {
            total_reviews: 0,
            average_rating: 0
          }
        };
      }

      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      // Get most recent review
      const mostRecent = reviews[0]; // Already sorted by date

      return {
        success: true,
        data: {
          total_reviews: reviews.length,
          average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          last_review_date: mostRecent.created_at,
          most_recent_rating: mostRecent.rating
        }
      };

    } catch (error) {
      console.error('❌ Error getting user review stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get review for a specific booking
   */
  async getReviewForBooking(bookingId: string): Promise<{
    success: boolean;
    data?: UserReview;
    error?: string;
  }> {
    try {
      const reviewsResponse = await this.getUserReviews();
      
      if (!reviewsResponse.success) {
        return {
          success: false,
          error: reviewsResponse.error
        };
      }

      const review = reviewsResponse.data.find(r => r.booking_id === bookingId);

      return {
        success: true,
        data: review
      };

    } catch (error) {
      console.error('❌ Error getting review for booking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const userMetadataReviewsService = new UserMetadataReviewsService();