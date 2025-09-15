import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type CategoryItemNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ServiceList'>;

interface CategoryItemProps {
  title: string;
  image?: ImageSourcePropType | { uri: string };
  color?: string;
  style?: any; // Accept style prop
  categoryId?: string; // Add categoryId prop
}

// Dummy image placeholders for each category
const categoryImages: { [key: string]: any } = {
  'Sista Minuten': { uri: 'https://via.placeholder.com/100x100/F9D423/000000?text=Last+Min' },
  'Frisör': { uri: 'https://via.placeholder.com/100x100/FF6B6B/FFFFFF?text=Hair' },
  'Massage': { uri: 'https://via.placeholder.com/100x100/4ECDC4/FFFFFF?text=Massage' },
  'Naglar': { uri: 'https://via.placeholder.com/100x100/45B7D1/FFFFFF?text=Nails' },
  'Fransar': { uri: 'https://via.placeholder.com/100x100/96CEB4/000000?text=Eyebrows' },
  'Fotvård': { uri: 'https://via.placeholder.com/100x100/FFEEAD/000000?text=Feet' },
  'Hudvård': { uri: 'https://via.placeholder.com/100x100/D4A5A5/000000?text=Skin' },
  'Fillers': { uri: 'https://via.placeholder.com/100x100/9B5DE5/FFFFFF?text=Fillers' },
  'Kiropraktik': { uri: 'https://via.placeholder.com/100x100/00BBF9/FFFFFF?text=Chiro' },
  'Naprapati': { uri: 'https://via.placeholder.com/100x100/00F5D4/000000?text=Therapy' },
  'Sjukgymnastik': { uri: 'https://via.placeholder.com/100x100/F15BB5/FFFFFF?text=Physio' },
  'Träning': { uri: 'https://via.placeholder.com/100x100/FEE440/000000?text=Gym' },
};

const CategoryItem: React.FC<CategoryItemProps> = ({ title, color, style, categoryId }) => {
  const navigation = useNavigation<CategoryItemNavigationProp>();
  
  // Get the image for this category, fallback to first letter if not found
  const imageSource = categoryImages[title] || null;

  const handlePress = () => {
    navigation.navigate('ServiceList', { 
      category: title,
      categoryId: categoryId || title.toLowerCase().replace(/\s+/g, '-')
    });
  };

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.imageContainer, { backgroundColor: color || '#F5F5F5' }]}>
        {imageSource ? (
          <Image 
            source={imageSource} 
            style={styles.image} 
            resizeMode="cover"
            onError={() => console.log('Failed to load image')}
          />
        ) : (
          <Text style={styles.letter}>{title.charAt(0)}</Text>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
    width: '31%',
    marginHorizontal: '1%',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  letter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
    paddingHorizontal: 4,
  },
});

export default CategoryItem;
