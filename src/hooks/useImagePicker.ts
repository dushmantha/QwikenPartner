import { useState } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { 
  launchImageLibrary, 
  launchCamera, 
  CameraOptions, 
  ImageLibraryOptions,
  ImagePickerResponse
} from 'react-native-image-picker';

interface UseImagePickerResult {
  showImagePickerOptions: () => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export const useImagePicker = (): UseImagePickerResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs access to your camera',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return cameraPermission === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }
    return true; // On iOS, permissions are handled at the time of access
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // For Android 10 (API 29) and above, we need READ_EXTERNAL_STORAGE
        // For Android 13 (API 33) and above, we need READ_MEDIA_IMAGES
        let permissions = [];
        
        if (Platform.Version >= 33) {
          permissions = [
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          ];
        } else {
          permissions = [
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ];
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        // Check if all requested permissions are granted
        return Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Storage permission error:', err);
        return false;
      }
    }
    return true; // On iOS, permissions are handled at the time of access
  };

  const handleImagePicked = (response: ImagePickerResponse): string | null => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
      return null;
    }
    
    if (response.errorCode || response.errorMessage) {
      const errorMessage = response.errorMessage || 'Failed to pick image';
      console.log('ImagePicker Error: ', errorMessage);
      setError(errorMessage);
      return null;
    }
    
    if (!response.assets || response.assets.length === 0) {
      return null;
    }
    
    const asset = response.assets[0];
    if (asset.uri) {
      return asset.uri;
    }
    
    return null;
  };

  const pickImageFromLibrary = async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Storage permission is required to select photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return null;
      }

      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        includeBase64: false,
        selectionLimit: 1,
      };

      const response = await launchImageLibrary(options);
      return handleImagePicked(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pick image from library';
      console.error('Error picking image from library:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return null;
      }

      const options: CameraOptions = {
        mediaType: 'photo',
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        includeBase64: false,
        saveToPhotos: true,
      };

      const response = await launchCamera(options);
      return handleImagePicked(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to take photo';
      console.error('Error taking photo:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const showImagePickerOptions = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Photo',
        'Choose an option',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await takePhoto();
              resolve(result);
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await pickImageFromLibrary();
              resolve(result);
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });
  };

  return {
    showImagePickerOptions,
    isLoading,
    error,
    reset: () => {
      setError(null);
    },
  };
};

export default useImagePicker;
