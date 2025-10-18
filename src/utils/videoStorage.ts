// Video storage utilities with Firebase Storage integration
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface VideoUploadResult {
  url: string;
  thumbnailUrl?: string;
  duration: number;
  size: number;
  recordingId: string;
}

export interface RecordingMetadata {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  partnerId?: string;
  partnerName?: string;
  duration: number;
  size: number;
  price: number;
  isPublic: boolean;
  tags: string[];
  thumbnailUrl?: string;
  videoUrl: string;
  views: number;
  purchases: number;
  earnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoStorageService {
  private static storage = getStorage();

  // Profile images
  static async uploadProfileImage(userId: string, file: Blob): Promise<string> {
    const imageRef = ref(this.storage, `users/${userId}/profile.jpg`);
    const snapshot = await uploadBytes(imageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    
    // Add cache-busting timestamp so browsers reload the new image
    return `${url}?t=${Date.now()}`;
  }

  static async uploadRecording(
    videoBlob: Blob,
    metadata: {
      title: string;
      description?: string;
      ownerId: string;
      ownerName: string;
      partnerId?: string;
      partnerName?: string;
      price: number;
      isPublic: boolean;
      tags?: string[];
    }
  ): Promise<VideoUploadResult> {
    try {
      console.log('📹 Starting recording upload...');
      console.log('📦 Blob size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('👤 Owner ID:', metadata.ownerId);
      
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Recording ID:', recordingId);
      
      // Create video file reference with userId in path to match storage rules
      const videoPath = `recordings/${metadata.ownerId}/${recordingId}/video.webm`;
      console.log('📂 Upload path:', videoPath);
      const videoRef = ref(this.storage, videoPath);
      
      // Upload video
      console.log('⬆️ Uploading video to Firebase Storage...');
      try {
        const videoSnapshot = await uploadBytes(videoRef, videoBlob);
        console.log('✅ Video uploaded successfully');
        const videoUrl = await getDownloadURL(videoSnapshot.ref);
        console.log('🔗 Video URL:', videoUrl);
        
        // Generate thumbnail (simplified - in production use video processing service)
        console.log('🖼️ Generating thumbnail...');
        const thumbnailBlob = await this.generateThumbnailBlob(videoBlob);
        let thumbnailUrl: string | undefined;
        
        if (thumbnailBlob) {
          console.log('⬆️ Uploading thumbnail...');
          const thumbnailRef = ref(this.storage, `recordings/${metadata.ownerId}/${recordingId}/thumbnail.jpg`);
          const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailBlob);
          thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
          console.log('✅ Thumbnail uploaded');
        }
        
        // Get video duration (simplified)
        console.log('⏱️ Getting video duration...');
        const duration = await this.getVideoDuration(videoBlob);
        console.log('⏱️ Duration:', duration, 'seconds');
        
        // Save recording metadata to Firestore
        console.log('💾 Saving metadata to Firestore...');
        const recordingData: any = {
          title: metadata.title,
          ownerId: metadata.ownerId,
          ownerName: metadata.ownerName,
          duration,
          size: videoBlob.size,
          price: metadata.price,
          isPublic: metadata.isPublic,
          tags: metadata.tags || [],
          videoUrl,
          views: 0,
          purchases: 0,
          earnings: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Only add optional fields if they have values (Firestore doesn't allow undefined)
        if (metadata.description) recordingData.description = metadata.description;
        if (metadata.partnerId) recordingData.partnerId = metadata.partnerId;
        if (metadata.partnerName) recordingData.partnerName = metadata.partnerName;
        if (thumbnailUrl) recordingData.thumbnailUrl = thumbnailUrl;
        
        const docRef = await addDoc(collection(db, 'recordings'), recordingData);
        console.log('✅ Metadata saved to Firestore');
        
        console.log('🎉 Recording upload complete!');
        
        return {
          url: videoUrl,
          thumbnailUrl,
          duration,
          size: videoBlob.size,
          recordingId: docRef.id
        };
      } catch (uploadError) {
        console.error('❌ Upload error details:', uploadError);
        if (uploadError instanceof Error) {
          console.error('Error name:', uploadError.name);
          console.error('Error message:', uploadError.message);
          console.error('Error stack:', uploadError.stack);
        }
        throw uploadError;
      }
    } catch (error) {
      console.error('❌ Fatal error uploading recording:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for common Firebase errors
        if (errorMessage.includes('storage/unauthorized')) {
          errorMessage = 'Permission denied. Check your Firebase Storage rules.';
        } else if (errorMessage.includes('storage/quota-exceeded')) {
          errorMessage = 'Storage quota exceeded. Upgrade your Firebase plan.';
        } else if (errorMessage.includes('storage/unauthenticated')) {
          errorMessage = 'Not authenticated. Please sign in and try again.';
        }
      }
      
      throw new Error(`Failed to upload recording: ${errorMessage}`);
    }
  }

  static async deleteRecording(recordingId: string, ownerId: string): Promise<void> {
    try {
      console.log(`🗑️ VideoStorageService: Deleting recording ${recordingId} for user ${ownerId}`);
      
      // Try to delete from Firestore (but don't fail if it doesn't exist)
      try {
        await deleteDoc(doc(db, 'recordings', recordingId));
        console.log('✅ Deleted from Firestore recordings collection');
      } catch (firestoreError) {
        console.warn('⚠️ Could not delete from Firestore (document may not exist):', firestoreError);
        // Continue - this is okay, recording might only be in user profile
      }
      
      // Delete files from Storage with correct path (includes ownerId)
      const videoRef = ref(this.storage, `recordings/${ownerId}/${recordingId}/video.webm`);
      const thumbnailRef = ref(this.storage, `recordings/${ownerId}/${recordingId}/thumbnail.jpg`);
      
      await Promise.all([
        deleteObject(videoRef).catch((err) => {
          console.warn('⚠️ Could not delete video file:', err.code);
        }),
        deleteObject(thumbnailRef).catch((err) => {
          console.warn('⚠️ Could not delete thumbnail:', err.code);
        })
      ]);
      
      console.log(`✅ VideoStorageService: Completed delete for ${recordingId}`);
    } catch (error) {
      console.error('❌ Error deleting recording:', error);
      // Don't throw - we want to continue even if storage deletion fails
      console.warn('⚠️ Continuing despite storage deletion errors');
    }
  }

  // Get user's recordings
  static async getUserRecordings(userId: string): Promise<RecordingMetadata[]> {
    try {
      const q = query(
        collection(db, 'recordings'),
        where('ownerId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as RecordingMetadata));
    } catch (error) {
      console.error('Error fetching user recordings:', error);
      return [];
    }
  }

  // Get public recordings
  static async getPublicRecordings(limit: number = 20): Promise<RecordingMetadata[]> {
    try {
      const q = query(
        collection(db, 'recordings'),
        where('isPublic', '==', true)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as RecordingMetadata)).slice(0, limit);
    } catch (error) {
      console.error('Error fetching public recordings:', error);
      return [];
    }
  }

  // Update recording views
  static async incrementViews(recordingId: string): Promise<void> {
    try {
      const recordingRef = doc(db, 'recordings', recordingId);
      await updateDoc(recordingRef, {
        views: (await import('firebase/firestore')).increment(1),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }

  // Helper method to generate thumbnail from video blob
  private static async generateThumbnailBlob(videoBlob: Blob): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = Math.min(5, video.duration / 2); // Seek to 5 seconds or middle
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        } else {
          resolve(null);
        }
      };
      
      video.onerror = () => resolve(null);
      
      video.src = URL.createObjectURL(videoBlob);
    });
  }

  // Helper method to get video duration
  private static async getVideoDuration(videoBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        resolve(Math.floor(video.duration));
      };
      
      video.onerror = () => resolve(300); // Default 5 minutes
      
      video.src = URL.createObjectURL(videoBlob);
    });
  }

  static generateThumbnail(videoElement: HTMLVideoElement): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailUrl);
      } else {
        resolve('');
      }
    });
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
