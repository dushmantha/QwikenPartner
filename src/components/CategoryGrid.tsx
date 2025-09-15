import React from 'react';
import { View, Text, StyleSheet, FlatList, ViewStyle, TextStyle, TouchableOpacity, ImageSourcePropType } from 'react-native';
import CategoryItem from './CategoryItem';

// Define the Category interface
export interface Category {
  id: string;
  name: string;
  image: string | ImageSourcePropType;
  service_count: number;
}




// Predefined colors for categories if not provided
const CATEGORY_COLORS = [
  '#F9D423', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B5DE5',
  '#00BBF9', '#00F5D4', '#F15BB5', '#FEE440'
];

// Props interface
interface CategoryGridProps {
  categories: Category[];
  onCategoryPress: (category: Category) => void;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, onCategoryPress }) => {
  // Handle category press
  const handleCategoryPress = (category: Category) => {
    onCategoryPress(category);
  };

  // If no categories, show empty state
  if (!categories.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No categories available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kategorier</Text>
      <FlatList
        data={categories}
        renderItem={({ item, index }) => (
          <TouchableOpacity 
            onPress={() => handleCategoryPress(item)}
            activeOpacity={0.7}
            style={styles.categoryItem}
          >
            <CategoryItem 
              title={item.name}
              categoryId={item.id}
              color={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
              image={typeof item.image === 'string' ? { uri: item.image } : item.image}
            />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

interface Styles {
  container: ViewStyle;
  title: TextStyle;
  listContent: ViewStyle;
  row: ViewStyle;
  categoryItem: ViewStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1A2533',
    paddingHorizontal: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryItem: {
    flex: 1,
    margin: 4,
    maxWidth: '31.33%', // 3 items per row with some margin
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CategoryGrid;
