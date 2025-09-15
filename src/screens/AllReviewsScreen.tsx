import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

interface RouteParams {
  reviews: any[];
  shopName: string;
}

const AllReviewsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={16} color="#1A2533" />);
    }
    
    if (hasHalfStar && fullStars < 5) {
      stars.push(<Ionicons key="star-half" name="star-half" size={16} color="#1A2533" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`star-empty-${i}`} name="star-outline" size={16} color="#D1D5DB" />);
    }
    
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
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
          <Text style={styles.headerTitle}>All Reviews</Text>
          <Text style={styles.headerSubtitle}>{params.shopName}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Reviews List */}
      <ScrollView 
        style={styles.reviewsScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.reviewsContainer}>
          {params.reviews.map((review, index) => (
            <View key={review.id || index} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <View style={styles.reviewerAvatar}>
                    <Ionicons name="person-circle" size={40} color="#D1D5DB" />
                  </View>
                  <View style={styles.reviewerDetails}>
                    <Text style={styles.reviewerName}>Customer</Text>
                    <View style={styles.reviewRating}>
                      {renderStars(review.overall_rating || 5)}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
              </View>
              
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              
              {(review.service_quality_rating || review.punctuality_rating || 
                review.cleanliness_rating || review.value_rating) && (
                <View style={styles.reviewDetailsGrid}>
                  {review.service_quality_rating && (
                    <View style={styles.reviewDetailItem}>
                      <Text style={styles.reviewDetailLabel}>Service</Text>
                      <Text style={styles.reviewDetailValue}>{review.service_quality_rating}/5</Text>
                    </View>
                  )}
                  {review.punctuality_rating && (
                    <View style={styles.reviewDetailItem}>
                      <Text style={styles.reviewDetailLabel}>Punctuality</Text>
                      <Text style={styles.reviewDetailValue}>{review.punctuality_rating}/5</Text>
                    </View>
                  )}
                  {review.cleanliness_rating && (
                    <View style={styles.reviewDetailItem}>
                      <Text style={styles.reviewDetailLabel}>Cleanliness</Text>
                      <Text style={styles.reviewDetailValue}>{review.cleanliness_rating}/5</Text>
                    </View>
                  )}
                  {review.value_rating && (
                    <View style={styles.reviewDetailItem}>
                      <Text style={styles.reviewDetailLabel}>Value</Text>
                      <Text style={styles.reviewDetailValue}>{review.value_rating}/5</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
        
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
  reviewsScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  reviewsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    marginRight: 12,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reviewDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
  },
  reviewDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 6,
  },
  reviewDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default AllReviewsScreen;