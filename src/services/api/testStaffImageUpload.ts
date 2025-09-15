// Test utility for staff image upload functionality
// Use this to verify that staff images are properly uploading to Supabase

import { ImageUploadService } from './imageUploadFix';
import { StaffImageUploadService } from './staffImageUpload';

export class StaffImageUploadTester {
  
  /**
   * Test the entire staff image upload process
   */
  static async testStaffImageUpload(): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    console.log('🧪 Testing staff image upload functionality...');
    
    try {
      // 1. Test storage setup
      console.log('📋 Step 1: Verifying storage setup...');
      const storageTest = await ImageUploadService.verifyStorageSetup();
      
      if (!storageTest.success) {
        return {
          success: false,
          message: 'Storage buckets not properly configured',
          details: storageTest
        };
      }
      
      console.log('✅ Storage setup verified');
      
      // 2. Test authentication
      console.log('🔐 Step 2: Testing authentication...');
      const authTest = await ImageUploadService.testUpload();
      
      if (!authTest.success) {
        return {
          success: false,
          message: 'Authentication or basic upload test failed',
          details: authTest
        };
      }
      
      console.log('✅ Authentication verified');
      
      // 3. Test staff avatar upload methods
      console.log('👤 Step 3: Testing staff avatar upload methods...');
      
      // Test with a dummy local URI (this will fail but we can see the error handling)
      const testUri = 'file:///test-avatar.jpg';
      const staffUploadResult = await StaffImageUploadService.uploadStaffAvatar(testUri);
      
      // Even if upload fails, the service should return a valid response structure
      if (typeof staffUploadResult.success !== 'boolean' || 
          typeof staffUploadResult.avatarUrl !== 'string' ||
          typeof staffUploadResult.uploadedToCloud !== 'boolean') {
        return {
          success: false,
          message: 'Staff avatar upload service returned invalid response format',
          details: staffUploadResult
        };
      }
      
      console.log('✅ Staff avatar upload service structure is correct');
      
      // 4. Test fallback avatar generation
      console.log('🔄 Step 4: Testing fallback avatar generation...');
      const fallbackUrl = StaffImageUploadService.getFallbackAvatarUrl('Test Staff');
      
      if (!fallbackUrl || !fallbackUrl.startsWith('http')) {
        return {
          success: false,
          message: 'Fallback avatar URL generation failed',
          details: { fallbackUrl }
        };
      }
      
      console.log('✅ Fallback avatar generation working');
      
      // 5. Test ensure staff avatar functionality
      console.log('🛡️ Step 5: Testing ensure staff avatar...');
      const ensureResult = await StaffImageUploadService.ensureStaffAvatar({
        name: 'Test Staff',
        avatar_url: testUri
      });
      
      if (!ensureResult.avatarUrl) {
        return {
          success: false,
          message: 'Ensure staff avatar failed to return a URL',
          details: ensureResult
        };
      }
      
      console.log('✅ Ensure staff avatar working');
      
      return {
        success: true,
        message: 'All staff image upload tests passed',
        details: {
          storageSetup: storageTest,
          authentication: authTest,
          staffUploadService: staffUploadResult,
          fallbackUrl,
          ensureAvatar: ensureResult
        }
      };
      
    } catch (error) {
      console.error('❌ Staff image upload test failed:', error);
      return {
        success: false,
        message: 'Test failed with exception',
        details: { error: error instanceof Error ? error.message : error }
      };
    }
  }
  
  /**
   * Quick test to check if staff image upload is working
   */
  static async quickTest(): Promise<boolean> {
    const result = await this.testStaffImageUpload();
    console.log(`🧪 Staff image upload test: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`📝 Message: ${result.message}`);
    return result.success;
  }
  
  /**
   * Test with a real image URI (use this when you have an actual image to test)
   */
  static async testWithRealImage(imageUri: string): Promise<{
    success: boolean;
    uploadedUrl?: string;
    uploadedToCloud: boolean;
    error?: string;
  }> {
    console.log('🧪📸 Testing with real image:', imageUri);
    
    try {
      const result = await StaffImageUploadService.uploadStaffAvatar(imageUri);
      
      return {
        success: result.success,
        uploadedUrl: result.avatarUrl,
        uploadedToCloud: result.uploadedToCloud,
        error: result.error
      };
      
    } catch (error) {
      return {
        success: false,
        uploadedUrl: undefined,
        uploadedToCloud: false,
        error: error instanceof Error ? error.message : 'Unknown test error'
      };
    }
  }
}

// Export a simple function for easy testing
export const testStaffImageUpload = () => StaffImageUploadTester.testStaffImageUpload();
export const quickTestStaffImageUpload = () => StaffImageUploadTester.quickTest();