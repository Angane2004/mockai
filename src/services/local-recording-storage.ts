// local-recording-storage.ts
// Stores interview video recordings in the browser's IndexedDB (not Firebase Storage).
// IndexedDB can handle large files (50–500MB+) which Firebase Storage isn't ideal for.
// Only the metadata (no video blob) is also saved to Firestore for cross-device tracking.

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
  thumbnailBlob?: Blob;
}

interface StoredRecording extends RecordingMetadata {
  videoBlob: Blob;
}

class LocalRecordingStorage {
  private dbName = 'InterviewRecordings';
  private dbVersion = 1;
  private storeName = 'recordings';

  // Opens the IndexedDB database and creates the object store if it doesn't exist yet
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

      // Runs only on first setup or version upgrade — creates the store and indexes
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

  // Grabs a frame from the video at 2 seconds and saves it as a small JPEG thumbnail
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
          const maxWidth = 320;
          const maxHeight = 180;
          
          let { videoWidth, videoHeight } = video;
          
          // Scale down proportionally if the video is larger than 320x180
          if (videoWidth > maxWidth || videoHeight > maxHeight) {
            const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
            videoWidth *= scale;
            videoHeight *= scale;
          }
          
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          
          // Seek to 2s or 10% of duration — avoids black frames at the very start
          const seekTime = Math.min(2, video.duration * 0.1);
          video.currentTime = seekTime;
        };
        
        video.onseeked = () => {
          // Draw that video frame onto the canvas, then export as JPEG
          ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((thumbnailBlob) => {
            console.log('✅ Thumbnail generated:', {
              originalSize: videoBlob.size,
              thumbnailSize: thumbnailBlob?.size || 0,
              dimensions: `${canvas.width}x${canvas.height}`
            });
            
            URL.revokeObjectURL(video.src);
            resolve(thumbnailBlob);
          }, 'image/jpeg', 0.8);
        };
        
        video.onerror = () => {
          console.warn('⚠️ Could not generate thumbnail from video');
          URL.revokeObjectURL(video.src);
          resolve(null);
        };
        
        video.src = URL.createObjectURL(videoBlob);
        video.load();
      });
    } catch (error) {
      console.warn('⚠️ Error generating thumbnail:', error);
      return null;
    }
  }

  // Saves a recording to IndexedDB along with its thumbnail, then syncs metadata to Firestore
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

  // Saves lightweight metadata (no video blob) to Firestore
  // This lets other devices know a recording exists even if they can't access the local file
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

  // Returns all recordings for a given user, sorted newest first
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

  // Fetches a single recording by its ID
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

  // Permanently deletes a recording from IndexedDB
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

  // Returns total recordings count, total size used, and available browser storage
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

  // Creates a temporary URL from the video blob — use this as the <video> src
  // Always call revokeRecordingURL() after you're done to free memory
  createRecordingURL(recording: StoredRecording): string {
    return URL.createObjectURL(recording.videoBlob);
  }

  // Creates a temporary URL for the thumbnail image — returns null if no thumbnail exists
  createThumbnailURL(recording: StoredRecording): string | null {
    if (recording.thumbnailBlob) {
      return URL.createObjectURL(recording.thumbnailBlob);
    }
    return null;
  }

  // Releases a blob URL from memory — always call this after you're done with the URL
  revokeRecordingURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  // Triggers a file download in the browser for the given recording
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

// Singleton — import this wherever you need to save, load, or delete recordings
export const localRecordingStorage = new LocalRecordingStorage();

export type { RecordingMetadata, StoredRecording };