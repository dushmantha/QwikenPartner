// Staff Image Upload Service - Ensures reliable uploads to Supabase
// This service handles staff avatar uploads with proper error handling and fallbacks

import { ImageUploadService } from './imageUploadFix';

export interface StaffImageUploadResult {
  success: boolean;
  avatarUrl: string;
  uploadedToCloud: boolean;
  error?: string;
  warning?: string;
}

export class StaffImageUploadService {
  
  /**
   * Upload staff avatar and ensure it's ready before saving to database
   */
  static async uploadStaffAvatar(localUri: string): Promise<StaffImageUploadResult> {
    console.log('👤📤 Starting staff avatar upload process:', localUri);
    
    try {
      // Validate input
      if (!localUri || typeof localUri !== 'string') {
        return {
          success: false,
          avatarUrl: '',
          uploadedToCloud: false,
          error: 'No image URI provided for staff avatar'
        };
      }

      // Use the enhanced safe upload method
      const uploadResult = await ImageUploadService.uploadStaffAvatarSafely(localUri);
      
      // Return structured result
      return {
        success: uploadResult.success || uploadResult.finalUrl !== '', // Success if we have a URL
        avatarUrl: uploadResult.finalUrl,
        uploadedToCloud: uploadResult.uploadedToCloud,
        error: uploadResult.error,
        warning: !uploadResult.uploadedToCloud && uploadResult.finalUrl ? 
          'Image upload to cloud failed, using local URL as fallback' : undefined
      };
      
    } catch (error) {
      console.error('❌ Staff image upload service error:', error);
      return {
        success: false,
        avatarUrl: localUri, // Try to preserve original URI
        uploadedToCloud: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Batch upload multiple staff avatars
   */
  static async uploadMultipleStaffAvatars(staffData: Array<{id: string, avatar_url: string}>): Promise<{
    results: Array<{id: string, result: StaffImageUploadResult}>;
    allSuccessful: boolean;
  }> {
    console.log('👥📤 Uploading multiple staff avatars:', staffData.length);
    
    const results = await Promise.all(
      staffData.map(async (staff) => ({
        id: staff.id,
        result: await this.uploadStaffAvatar(staff.avatar_url)
      }))
    );
    
    const allSuccessful = results.every(r => r.result.success);
    
    console.log(`👥✅ Staff avatar upload results: ${results.filter(r => r.result.success).length}/${results.length} successful`);
    
    return {
      results,
      allSuccessful
    };
  }

  /**
   * Verify staff avatar URL is accessible
   */
  static async verifyStaffAvatarUrl(avatarUrl: string): Promise<boolean> {
    if (!avatarUrl) return false;
    
    try {
      if (avatarUrl.startsWith('http')) {
        // For remote URLs, try a simple fetch
        const response = await fetch(avatarUrl, { method: 'HEAD' });
        return response.ok;
      } else {
        // For local URIs, assume they exist (React Native will handle loading)
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Avatar URL verification failed:', error);
      return false;
    }
  }

  /**
   * Get fallback avatar URL if upload fails
   */
  static getFallbackAvatarUrl(staffName: string): string {
    // Generate a fallback avatar URL using initials or a placeholder service
    const initials = staffName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
      
    // Use a placeholder service that generates avatars based on initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1A2533&color=fff&size=200`;
  }

  /**
   * Ensure staff has a valid avatar URL (upload or fallback)
   */
  static async ensureStaffAvatar(staffData: {name: string, avatar_url?: string}): Promise<{
    avatarUrl: string;
    uploadedToCloud: boolean;
    usedFallback: boolean;
  }> {
    // If no avatar provided, use fallback
    if (!staffData.avatar_url) {
      const fallbackUrl = this.getFallbackAvatarUrl(staffData.name);
      return {
        avatarUrl: fallbackUrl,
        uploadedToCloud: false,
        usedFallback: true
      };
    }

    // Try to upload the provided avatar
    const uploadResult = await this.uploadStaffAvatar(staffData.avatar_url);
    
    if (uploadResult.success && uploadResult.avatarUrl) {
      return {
        avatarUrl: uploadResult.avatarUrl,
        uploadedToCloud: uploadResult.uploadedToCloud,
        usedFallback: false
      };
    } else {
      // Upload failed, use fallback
      const fallbackUrl = this.getFallbackAvatarUrl(staffData.name);
      console.warn('⚠️ Using fallback avatar for staff:', staffData.name);
      return {
        avatarUrl: fallbackUrl,
        uploadedToCloud: false,
        usedFallback: true
      };
    }
  }
}