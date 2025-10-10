/**
 * Local Recording Storage Service
 * Stores video recordings locally using IndexedDB for persistence
 * Much more suitable for large video files than Firebase
 */

interface RecordingMetadata {
  id: string;
  interviewId: string;
  userId: string;
  recordingSize: number;
  recordingType: string;
  createdAt: Date;
  duration?: number;
  interviewName?: string;
  interviewType?: string;
  depthLevel?: string;
  thumbnailBlob?: Blob; // Video thumbnail for preview
}

interface StoredRecording extends RecordingMetadata {
  videoBlob: Blob;
}

class LocalRecordingStorage {
  private dbName = 'InterviewRecordings';
  private dbVersion = 1;
  private storeName = 'recordings';

  /**
   * Initialize IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('✅ IndexedDB opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔧 Creating IndexedDB object store...');
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('interviewId', 'interviewId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('✅ Object store created with indexes');
        }
      };
    });
  }

  /**
   * Generate video thumbnail from recording blob
   */
  private async generateThumbnail(videoBlob: Blob): Promise<Blob | null> {
    try {
      console.log('🖼️ Generating video thumbnail...');
      
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          // Set canvas dimensions to video dimensions (scaled down)
          const maxWidth = 320;
          const maxHeight = 180;
          
          let { videoWidth, videoHeight } = video;
          
          // Scale down to max dimensions while maintaining aspect ratio
          if (videoWidth > maxWidth || videoHeight > maxHeight) {
            const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
            videoWidth *= scale;
            videoHeight *= scale;
          }
          
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          
          // Seek to 2 seconds or 10% of video duration for better thumbnail
          const seekTime = Math.min(2, video.duration * 0.1);
          video.currentTime = seekTime;
        };
        
        video.onseeked = () => {
          // Draw the video frame to canvas
          ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to blob
          canvas.toBlob((thumbnailBlob) => {
            console.log('✅ Thumbnail generated:', {
              originalSize: videoBlob.size,
              thumbnailSize: thumbnailBlob?.size || 0,
              dimensions: `${canvas.width}x${canvas.height}`
            });
            
            // Clean up
            URL.revokeObjectURL(video.src);
            resolve(thumbnailBlob);
          }, 'image/jpeg', 0.8);
        };
        
        video.onerror = () => {
          console.warn('⚠️ Could not generate thumbnail from video');
          URL.revokeObjectURL(video.src);
          resolve(null);
        };
        
        // Start loading the video
        video.src = URL.createObjectURL(videoBlob);
        video.load();
      });
    } catch (error) {
      console.warn('⚠️ Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Save recording to local storage with thumbnail
   */
  async saveRecording(
    recordingBlob: Blob,
    metadata: Omit<RecordingMetadata, 'id' | 'createdAt' | 'recordingSize'>
  ): Promise<string> {
    try {
      console.log('💾 Saving recording to local storage...', {
        size: recordingBlob.size,
        type: recordingBlob.type,
        interviewId: metadata.interviewId
      });

      const db = await this.initDB();
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate thumbnail if it's a video recording
      let thumbnailBlob: Blob | null = null;
      if (recordingBlob.type.startsWith('video/')) {
        console.log('🖼️ Generating thumbnail for video recording...');
        thumbnailBlob = await this.generateThumbnail(recordingBlob);
      }
      
      const recording: StoredRecording = {
        id: recordingId,
        ...metadata,
        recordingSize: recordingBlob.size,
        recordingType: recordingBlob.type,
        createdAt: new Date(),
        videoBlob: recordingBlob,
        thumbnailBlob: thumbnailBlob || undefined
      };

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(recording);

        request.onsuccess = () => {
          console.log('✅ Recording saved locally:', recordingId);
          resolve();
        };

        request.onerror = () => {
          console.error('❌ Failed to save recording:', request.error);
          reject(request.error);
        };
      });

      // Also save metadata to Firebase for syncing across devices (optional)
      await this.saveMetadataToFirebase(recording);

      return recordingId;
    } catch (error) {
      console.error('❌ Error saving recording:', error);
      throw error;
    }
  }

  /**
   * Save only metadata to Firebase (for cross-device visibility)
   */
  private async saveMetadataToFirebase(recording: StoredRecording): Promise<void> {
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase.config');

      const metadata = {
        localRecordingId: recording.id,
        interviewId: recording.interviewId,
        userId: recording.userId,
        recordingSize: recording.recordingSize,
        recordingType: recording.recordingType,
        createdAt: serverTimestamp(),
        duration: recording.duration,
        interviewName: recording.interviewName,
        interviewType: recording.interviewType,
        depthLevel: recording.depthLevel,
        storageType: 'local',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      };

      const docRef = await addDoc(collection(db, 'interviewRecordingMeta'), metadata);
      console.log('✅ Recording metadata saved to Firebase:', docRef.id);
    } catch (error) {
      console.warn('⚠️ Could not save metadata to Firebase (continuing with local storage):', error);
    }
  }

  /**
   * Get all recordings for a user
   */
  async getUserRecordings(userId: string): Promise<StoredRecording[]> {
    try {
      console.log('🔍 Fetching recordings for user:', userId);
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('userId');
        const request = index.getAll(userId);

        request.onsuccess = () => {
          const recordings = request.result;
          console.log('📊 Found recordings locally:', recordings.length);
          
          // Sort by creation date (newest first)
          recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          resolve(recordings);
        };

        request.onerror = () => {
          console.error('❌ Error fetching recordings:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error getting user recordings:', error);
      return [];
    }
  }

  /**
   * Get a specific recording by ID
   */
  async getRecording(recordingId: string): Promise<StoredRecording | null> {
    try {
      console.log('🔍 Fetching recording:', recordingId);
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(recordingId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('❌ Error fetching recording:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error getting recording:', error);
      return null;
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting recording:', recordingId);
      const db = await this.initDB();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(recordingId);

        request.onsuccess = () => {
          console.log('✅ Recording deleted locally');
          resolve();
        };

        request.onerror = () => {
          console.error('❌ Error deleting recording:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error deleting recording:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalRecordings: number;
    totalSize: number;
    availableSpace?: number;
  }> {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = async () => {
          const recordings = request.result;
          const totalSize = recordings.reduce((sum, rec) => sum + (rec.recordingSize || 0), 0);
          
          let availableSpace: number | undefined;
          try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
              const estimate = await navigator.storage.estimate();
              availableSpace = (estimate.quota || 0) - (estimate.usage || 0);
            }
          } catch (error) {
            console.warn('Could not estimate storage:', error);
          }

          resolve({
            totalRecordings: recordings.length,
            totalSize,
            availableSpace
          });
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return { totalRecordings: 0, totalSize: 0 };
    }
  }

  /**
   * Create a downloadable URL for a recording
   */
  createRecordingURL(recording: StoredRecording): string {
    return URL.createObjectURL(recording.videoBlob);
  }

  /**
   * Create a thumbnail URL for a recording preview
   */
  createThumbnailURL(recording: StoredRecording): string | null {
    if (recording.thumbnailBlob) {
      return URL.createObjectURL(recording.thumbnailBlob);
    }
    return null;
  }

  /**
   * Clean up URL after use
   */
  revokeRecordingURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Export recording as file download
   */
  downloadRecording(recording: StoredRecording, filename?: string): void {
    const url = this.createRecordingURL(recording);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `interview-${recording.interviewId}-${recording.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.revokeRecordingURL(url);
  }
}

// Export singleton instance
export const localRecordingStorage = new LocalRecordingStorage();

// Export types for use in components
export type { RecordingMetadata, StoredRecording };