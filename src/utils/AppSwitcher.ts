import DeepLinkService from '../services/DeepLinkService';

export interface SwitchToMemberAppOptions {
  userEmail?: string;
  userId?: string;
  autoSwitch?: boolean;
}

class AppSwitcher {
  private static instance: AppSwitcher;
  
  public static getInstance(): AppSwitcher {
    if (!AppSwitcher.instance) {
      AppSwitcher.instance = new AppSwitcher();
    }
    return AppSwitcher.instance;
  }

  // Switch to member app with user credentials
  public async switchToMemberApp(options: SwitchToMemberAppOptions = {}): Promise<void> {
    try {
      const deepLinkService = DeepLinkService.getInstance();
      
      // Check if member app is available
      const isAvailable = await deepLinkService.isMemberAppAvailable();
      if (!isAvailable) {
        console.log('AppSwitcher: Member app not available');
        return;
      }
      
      // Use provided credentials or empty strings for basic app opening
      const email = options.userEmail || '';
      const userId = options.userId || '';
      
      if (email && userId) {
        console.log('AppSwitcher: Switching to member app with credentials');
        await deepLinkService.openMemberApp(email, userId);
      } else {
        console.log('AppSwitcher: Opening member app without credentials');
        await deepLinkService.openMemberApp('', '');
      }
      
    } catch (error) {
      console.error('AppSwitcher: Error switching to member app:', error);
    }
  }

  // Check if member app is installed
  public async isMemberAppInstalled(): Promise<boolean> {
    try {
      const deepLinkService = DeepLinkService.getInstance();
      return await deepLinkService.isMemberAppAvailable();
    } catch (error) {
      console.error('AppSwitcher: Error checking member app availability:', error);
      return false;
    }
  }
}

export default AppSwitcher;