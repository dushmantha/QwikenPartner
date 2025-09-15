import React, { memo } from 'react';
import { StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import FastImage, { FastImageProps, ResizeMode } from 'react-native-fast-image';

interface OptimizedImageProps extends Omit<FastImageProps, 'source'> {
  source: { uri?: string } | number;
  style?: ViewStyle | ImageStyle;
  resizeMode?: ResizeMode;
  placeholder?: string;
  fallback?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  source,
  style,
  resizeMode = FastImage.resizeMode.cover,
  placeholder,
  fallback,
  ...props
}) => {
  // Handle different source types
  let imageSource;
  
  if (typeof source === 'number') {
    // Local image
    imageSource = source;
  } else if (source?.uri) {
    // Remote image with caching
    imageSource = {
      uri: source.uri,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    };
  } else {
    // Fallback or placeholder
    imageSource = fallback ? { uri: fallback } : undefined;
  }

  if (!imageSource) {
    return null;
  }

  return (
    <FastImage
      source={imageSource}
      style={[styles.defaultStyle, style]}
      resizeMode={resizeMode}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  defaultStyle: {
    backgroundColor: '#f0f0f0',
  },
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;