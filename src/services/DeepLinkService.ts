import { Linking, Alert } from 'react-native';

export interface UserCredentials {
  email: string;
  userId: string;
  timestamp: number;
  source: string;
}

class DeepLinkService {
  private static instance: DeepLinkService;
  
  public static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  // Open member app with user credentials
  public async openMemberApp(userEmail: string, userId: string): Promise<void> {
    try {
      if (!userEmail || !userId) {
        throw new Error('Missing user credentials');
      }
      
      const credentials: UserCredentials = {
        email: userEmail,
        userId: userId,
        timestamp: Date.now(),
        source: 'partner-app'
      };
      
      // Encode credentials
      const encodedCredentials = encodeURIComponent(JSON.stringify(credentials));
      
      // Try different URL schemes for the member app
      const deepLinkUrls = [
        `qwiken://auto-login?credentials=${encodedCredentials}`,
        `org.app.qwiken://auto-login?credentials=${encodedCredentials}`
      ];
      
      console.log('DeepLinkService: Attempting to open member app for user:', userEmail);
      
      // Try each URL scheme
      let appOpened = false;
      for (const url of deepLinkUrls) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          console.log(`DeepLinkService: Can open ${url}:`, canOpen);
          
          if (canOpen) {
            await Linking.openURL(url);
            appOpened = true;
            console.log('DeepLinkService: Successfully opened member app');
            break;
          }
        } catch (urlError) {
          console.log('DeepLinkService: Failed to check/open URL:', url, urlError);
          continue;
        }
      }
      
      if (!appOpened) {
        // Fallback: Try to open without credentials
        console.log('DeepLinkService: Credential-based deep linking failed, trying basic open');
        const basicUrls = ['qwiken://', 'org.app.qwiken://'];
        
        for (const url of basicUrls) {
          try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
              appOpened = true;
              console.log('DeepLinkService: Opened member app without credentials');
              break;
            }
          } catch (basicError) {
            continue;
          }
        }
      }
      
      if (!appOpened) {
        throw new Error('Unable to open member app');
      }
      
    } catch (error) {
      console.error('DeepLinkService: Error opening member app:', error);
      Alert.alert(
        'Unable to Open Member App',
        'The member app could not be opened automatically. Please open it manually from your home screen.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  }

  // Check if member app is available
  public async isMemberAppAvailable(): Promise<boolean> {
    try {
      // For development/testing, return true to allow testing without member app installed
      if (__DEV__) {
        console.log('DeepLinkService: Development mode - allowing member app access for testing');
        return true;
      }
      
      const urls = ['qwiken://', 'org.app.qwiken://'];
      
      for (const url of urls) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('DeepLinkService: Error checking member app availability:', error);
      // In development, return true to allow testing
      if (__DEV__) {
        return true;
      }
      return false;
    }
  }
}

export default DeepLinkService;