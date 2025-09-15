// Enhanced Image Upload Service for Production Use
// Handles proper Supabase storage uploads with React Native support

import { supabase } from '../../lib/supabase/index';

export interface ImageUploadResult {
  success: boolean;
  data?: string;
  error?: string;
  warning?: string;
}

// Supabase configuration
const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

export class ImageUploadService {
  
  /**
   * Upload image with multiple methods for React Native compatibility
   */
  static async uploadImage(
    localUri: string, 
    bucket: string = 'shop-images',
    folder: string = 'shops'
  ): Promise<ImageUploadResult> {
    
    console.log(`📸 Starting enhanced image upload: ${localUri}`);
    
    try {
      // Validate input
      if (!localUri) {
        return {
          success: false,
          error: 'No image URI provided'
        };
      }

      // If it's already a remote URL, return it
      if (localUri.startsWith('http')) {
        console.log('🌐 Remote URL detected, using as-is');
        return {
          success: true,
          data: localUri
        };
      }

      // Get current user for folder structure
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User authentication failed:', userError);
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Create unique filename with proper structure
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileExtension = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}_${randomId}.${fileExtension}`;
      const filePath = `${user.id}/${folder}/${fileName}`;

      console.log('📁 Upload path:', filePath);

      // Method 1: Try React Native FormData upload
      try {
        const formData = new FormData();
        const fileObject = {
          uri: localUri,
          type: `image/${fileExtension}`,
          name: fileName
        };
        formData.append('file', fileObject as any);

        const { data: session } = await supabase.auth.getSession();
        const token = session?.access_token || SUPABASE_ANON_KEY;

        const response = await fetch(
          `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
            },
            body: formData
          }
        );

        if (response.ok) {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          
          console.log('✅ FormData upload successful:', urlData.publicUrl);
          return {
            success: true,
            data: urlData.publicUrl
          };
        } else {
          const errorText = await response.text();
          console.warn('⚠️ FormData upload failed:', response.status, errorText);
        }
      } catch (formError) {
        console.warn('⚠️ FormData method failed:', formError);
      }

      // Method 2: Convert to blob and use Supabase client
      try {
        console.log('🔄 Trying blob method...');
        
        const response = await fetch(localUri);
        const blob = await response.blob();

        if (!blob || blob.size === 0) {
          throw new Error('Failed to create blob from image');
        }

        console.log('📦 Blob size:', blob.size, 'bytes');

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, blob, {
            contentType: `image/${fileExtension}`,
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('❌ Blob upload error:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        console.log('✅ Blob upload successful:', urlData.publicUrl);
        return {
          success: true,
          data: urlData.publicUrl
        };

      } catch (blobError) {
        console.warn('⚠️ Blob method failed:', blobError);
      }

      // Method 3: XMLHttpRequest fallback for React Native
      try {
        console.log('🔄 Trying XMLHttpRequest fallback...');
        
        const blob = await new Promise<Blob>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.responseType = 'blob';
          
          xhr.onload = () => {
            if (xhr.status === 200 && xhr.response) {
              resolve(xhr.response);
            } else {
              reject(new Error(`XMLHttpRequest failed: ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('XMLHttpRequest network error'));
          xhr.open('GET', localUri, true);
          xhr.send();
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, blob, {
            contentType: `image/${fileExtension}`,
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        console.log('✅ XMLHttpRequest upload successful:', urlData.publicUrl);
        return {
          success: true,
          data: urlData.publicUrl
        };

      } catch (xhrError) {
        console.error('❌ XMLHttpRequest method failed:', xhrError);
      }

      // If all upload methods fail, return error
      return {
        success: false,
        error: 'All upload methods failed. Please check storage bucket configuration and network connection.'
      };
      
    } catch (error) {
      console.error('❌ Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }
  
  /**
   * Upload multiple images in parallel with proper error handling
   */
  static async uploadImages(
    localUris: string[], 
    bucket: string = 'shop-images',
    folder: string = 'shops'
  ): Promise<{
    results: ImageUploadResult[];
    successUrls: string[];
    errors: string[];
  }> {
    
    console.log(`📸 Uploading ${localUris.length} images in parallel...`);
    
    // Filter out empty/invalid URIs
    const validUris = localUris.filter(uri => uri && uri.trim());
    
    if (validUris.length === 0) {
      return {
        results: [],
        successUrls: [],
        errors: ['No valid image URIs provided']
      };
    }
    
    // Upload all images in parallel for better performance
    const uploadPromises = validUris.map(uri => 
      this.uploadImage(uri, bucket, folder)
    );
    
    const results = await Promise.all(uploadPromises);
    
    // Separate successful uploads from errors
    const successUrls: string[] = [];
    const errors: string[] = [];
    
    results.forEach((result, index) => {
      if (result.success && result.data) {
        successUrls.push(result.data);
      } else {
        errors.push(`Image ${index + 1}: ${result.error || 'Upload failed'}`);
      }
    });
    
    console.log(`📊 Upload results: ${successUrls.length} successful, ${errors.length} failed`);
    
    return {
      results,
      successUrls,
      errors
    };
  }
  
  /**
   * Upload shop logo
   */
  static async uploadShopLogo(localUri: string): Promise<ImageUploadResult> {
    return this.uploadImage(localUri, 'shop-images', 'logos');
  }

  /**
   * Upload staff avatar with enhanced fallback buckets and validation
   */
  static async uploadStaffAvatar(localUri: string): Promise<ImageUploadResult> {
    console.log('👤 Starting staff avatar upload:', localUri);
    
    // Validate input
    if (!localUri || typeof localUri !== 'string') {
      return {
        success: false,
        error: 'Invalid image URI provided for staff avatar'
      };
    }

    // If it's already a remote URL, return it
    if (localUri.startsWith('http')) {
      console.log('🌐 Staff avatar is already remote URL, using as-is');
      return {
        success: true,
        data: localUri
      };
    }

    // Try shop-images bucket first (most likely to exist)
    console.log('📤 Uploading staff avatar to shop-images bucket...');
    const result = await this.uploadImage(localUri, 'shop-images', 'staff-avatars');
    
    if (result.success) {
      console.log('✅ Staff avatar uploaded to shop-images bucket:', result.data);
      return result;
    }
    
    console.warn('⚠️ Shop-images bucket upload failed:', result.error);
    
    // Fallback to user-avatars bucket if it exists
    console.log('🔄 Trying user-avatars bucket as fallback...');
    const fallbackResult = await this.uploadImage(localUri, 'user-avatars', 'staff');
    
    if (fallbackResult.success) {
      console.log('✅ Staff avatar uploaded to user-avatars bucket:', fallbackResult.data);
      return fallbackResult;
    }
    
    console.warn('⚠️ User-avatars bucket upload failed:', fallbackResult.error);
    
    // Final fallback - try avatars bucket
    console.log('🔄 Trying avatars bucket as final fallback...');
    const finalFallbackResult = await this.uploadImage(localUri, 'avatars', 'staff');
    
    if (finalFallbackResult.success) {
      console.log('✅ Staff avatar uploaded to avatars bucket:', finalFallbackResult.data);
      return finalFallbackResult;
    }
    
    // If all fail, return detailed error
    console.error('❌ All staff avatar upload attempts failed');
    return {
      success: false,
      error: `Staff avatar upload failed: ${result.error}. Tried buckets: shop-images, user-avatars, avatars`
    };
  }
  
  /**
   * Upload shop gallery images and return URLs for database storage
   */
  static async uploadShopImages(localUris: string[]): Promise<{
    urls: string[];
    errors: string[];
  }> {
    const uploadResult = await this.uploadImages(localUris, 'shop-images', 'gallery');
    return {
      urls: uploadResult.successUrls,
      errors: uploadResult.errors
    };
  }

  /**
   * Enhanced staff avatar upload with comprehensive error handling
   * Returns both success status and final URL to use (either uploaded or fallback)
   */
  static async uploadStaffAvatarSafely(localUri: string): Promise<{
    success: boolean;
    finalUrl: string;
    uploadedToCloud: boolean;
    error?: string;
  }> {
    console.log('👤🔒 Safe staff avatar upload starting:', localUri);
    
    try {
      // Always return a URL, either uploaded or original
      if (!localUri || typeof localUri !== 'string') {
        return {
          success: false,
          finalUrl: '',
          uploadedToCloud: false,
          error: 'Invalid image URI'
        };
      }

      // If already remote, use as-is
      if (localUri.startsWith('http')) {
        return {
          success: true,
          finalUrl: localUri,
          uploadedToCloud: false // Already remote
        };
      }

      // Attempt cloud upload
      const uploadResult = await this.uploadStaffAvatar(localUri);
      
      if (uploadResult.success && uploadResult.data) {
        console.log('✅ Staff avatar safely uploaded to cloud:', uploadResult.data);
        return {
          success: true,
          finalUrl: uploadResult.data,
          uploadedToCloud: true
        };
      } else {
        console.warn('⚠️ Cloud upload failed, using local URL as fallback:', uploadResult.error);
        return {
          success: false,
          finalUrl: localUri, // Use local URL as fallback
          uploadedToCloud: false,
          error: uploadResult.error
        };
      }
      
    } catch (error) {
      console.error('❌ Staff avatar upload error:', error);
      return {
        success: false,
        finalUrl: localUri, // Use local URL as fallback
        uploadedToCloud: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Verify that storage buckets exist and are properly configured
   */
  static async verifyStorageSetup(): Promise<{
    success: boolean;
    buckets: {
      shopImages: boolean;
      userAvatars: boolean;
      shopLogos: boolean;
    };
    error?: string;
  }> {
    try {
      console.log('🔍 Verifying storage bucket setup...');
      
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ Failed to list buckets:', error);
        return {
          success: false,
          buckets: {
            shopImages: false,
            userAvatars: false,
            shopLogos: false
          },
          error: error.message
        };
      }
      
      const bucketIds = buckets?.map(b => b.id) || [];
      
      const bucketStatus = {
        shopImages: bucketIds.includes('shop-images'),
        userAvatars: bucketIds.includes('user-avatars'),
        shopLogos: bucketIds.includes('shop-logos')
      };
      
      const allBucketsExist = bucketStatus.shopImages && 
                             bucketStatus.userAvatars && 
                             bucketStatus.shopLogos;
      
      console.log('📋 Storage bucket status:', bucketStatus);
      
      if (!allBucketsExist) {
        console.warn('⚠️ Missing storage buckets. Please run the setup-storage-buckets.sql script.');
      }
      
      return {
        success: allBucketsExist,
        buckets: bucketStatus,
        error: allBucketsExist ? undefined : 'Missing required storage buckets'
      };
      
    } catch (error) {
      console.error('❌ Storage verification error:', error);
      return {
        success: false,
        buckets: {
          shopImages: false,
          userAvatars: false,
          shopLogos: false
        },
        error: error instanceof Error ? error.message : 'Unknown verification error'
      };
    }
  }

  /**
   * Test upload functionality (useful for debugging)
   */
  static async testUpload(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testing image upload functionality...');
      
      // First verify storage setup
      const storageStatus = await this.verifyStorageSetup();
      if (!storageStatus.success) {
        return {
          success: false,
          message: 'Storage buckets not properly configured',
          details: storageStatus
        };
      }
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return {
          success: false,
          message: 'User not authenticated',
          details: { authError }
        };
      }
      
      return {
        success: true,
        message: 'Image upload system is ready',
        details: {
          userId: user.id,
          storageStatus
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Test failed with error',
        details: { error: error instanceof Error ? error.message : error }
      };
    }
  }
}