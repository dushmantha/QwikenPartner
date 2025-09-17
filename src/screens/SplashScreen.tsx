import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform, StatusBar, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  useEffect(() => {
    console.log('🎨 SplashScreen mounted and displaying Qwiken Partner logo');
    console.log('📱 Screen dimensions:', { width, height });
    return () => {
      console.log('🎨 SplashScreen unmounted');
    };
  }, []);

  return (
    <LinearGradient
      colors={['#a8e6cf', '#7fcdcd', '#81c7d4', '#a8b5ff']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}
    >
      <StatusBar
        hidden={Platform.OS === 'ios'}
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent
      />

      {/* Center content container */}
      <View style={styles.centerContainer}>
        {/* Qwiken Partner Logo Image */}
        <Image
          source={require('../assets/images/splash-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: width * 0.8,
    height: height * 0.5,
    maxWidth: 400,
    maxHeight: 300,
  },
});

export default SplashScreen;
