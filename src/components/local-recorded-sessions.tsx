import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Play, 
  Download, 
  Trash2, 
  Calendar, 
  Clock,
  FileVideo,
  Eye,
  MoreHorizontal,
  HardDrive,
  Wifi,
  WifiOff
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { localRecordingStorage, type StoredRecording } from '@/services/local-recording-storage';

export const LocalRecordedSessions: React.FC = () => {
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewRecording, setPreviewRecording] = useState<StoredRecording | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<{
    totalRecordings: number;
    totalSize: number;
    availableSpace?: number;
  } | null>(null);
  const { userId } = useAuth();

  // Load recordings from local storage
  const loadRecordings = async () => {
    if (!userId) {
      console.log('❌ No userId available, skipping recording fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading recordings from local storage for user:', userId);
      setRefreshing(true);
      
      const userRecordings = await localRecordingStorage.getUserRecordings(userId);
      const stats = await localRecordingStorage.getStorageStats();
      
      console.log('📊 Loaded recordings:', {
        count: userRecordings.length,
        totalSize: stats.totalSize,
        availableSpace: stats.availableSpace
      });
      
      setRecordings(userRecordings);
      setStorageStats(stats);
      
      if (userRecordings.length === 0) {
        toast.info('No local recordings found', {
          description: 'Complete an interview to see recordings here'
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading recordings:', error);
      toast.error('Error loading recordings', {
        description: 'Could not access local storage. Please check browser permissions.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, [userId]);

  // Handle recording deletion
  const handleDeleteRecording = async (recordingId: string, interviewName: string) => {
    try {
      await localRecordingStorage.deleteRecording(recordingId);
      toast.success('Recording deleted!', {
        description: `Deleted recording for "${interviewName}"`
      });
      
      // Reload recordings
      await loadRecordings();
      
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording', {
        description: 'Could not delete the recording from local storage.'
      });
    }
  };

  // Handle recording download
  const handleDownloadRecording = (recording: StoredRecording) => {
    try {
      const filename = `${recording.interviewName || 'Interview'}-${format(recording.createdAt, 'yyyy-MM-dd-HHmm')}.webm`;
      localRecordingStorage.downloadRecording(recording, filename);
      toast.success('Download started', {
        description: `Downloading ${filename}`
      });
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error('Download failed', {
        description: 'Could not download the recording file'
      });
    }
  };

  // Handle preview
  const handlePreviewRecording = (recording: StoredRecording) => {
    try {
      // Clean up previous URL
      if (previewUrl) {
        localRecordingStorage.revokeRecordingURL(previewUrl);
      }
      
      const url = localRecordingStorage.createRecordingURL(recording);
      setPreviewUrl(url);
      setPreviewRecording(recording);
    } catch (error) {
      console.error('Error creating preview:', error);
      toast.error('Preview failed', {
        description: 'Could not create video preview'
      });
    }
  };

  // Close preview
  const closePreview = () => {
    if (previewUrl) {
      localRecordingStorage.revokeRecordingURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewRecording(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">📹 Local Recorded Sessions</h2>
            <p className="text-gray-600 text-sm mt-1">Loading recordings from device storage...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">📹 Local Recorded Sessions</h2>
            <p className="text-gray-600 text-sm mt-1">Your interview recordings stored on this device</p>
          </div>
          <Button onClick={loadRecordings} disabled={refreshing} variant="outline" size="sm">
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </Button>
        </div>
        
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-16 w-16 text-gray-400" />
              <WifiOff className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Local Recordings Yet</h3>
              <p className="text-gray-500 text-sm max-w-md mb-4">
                Complete some interviews to see your recorded sessions here. 
                Recordings are saved locally on your device for privacy and performance.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div>✅ Recordings stored locally (no cloud dependency)</div>
                <div>✅ Instant playback and download</div>
                <div>✅ Private and secure on your device</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            📹 Local Recorded Sessions
            <Badge variant="secondary" className="text-xs">
              <HardDrive className="h-3 w-3 mr-1" />
              Local Storage
            </Badge>
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''} • 
            Total size: {storageStats ? formatFileSize(storageStats.totalSize) : 'Unknown'}
            {storageStats?.availableSpace && (
              <> • Available: {formatFileSize(storageStats.availableSpace)}</>
            )}
          </p>
        </div>
        <Button onClick={loadRecordings} disabled={refreshing} variant="outline" size="sm">
          {refreshing ? 'Refreshing...' : '🔄 Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recordings.map((recording) => (
          <Card key={recording.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate">
                    {recording.interviewName || 'Untitled Interview'}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {recording.interviewType && (
                      <Badge variant="secondary" className="text-xs">
                        {recording.interviewType}
                      </Badge>
                    )}
                    {recording.depthLevel && (
                      <Badge variant="outline" className="text-xs">
                        {recording.depthLevel}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <HardDrive className="h-3 w-3 mr-1" />
                      Local
                    </Badge>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleDownloadRecording(recording)}
                      className="cursor-pointer"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteRecording(recording.id, recording.interviewName || 'recording')}
                      className="cursor-pointer text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Recording Info */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(recording.createdAt, 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileVideo className="h-4 w-4" />
                  <span>{formatFileSize(recording.recordingSize)}</span>
                </div>
                {recording.duration && (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(recording.duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">
                        {recording.recordingType || 'video/webm'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail/Preview */}
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer"
                   onClick={() => handlePreviewRecording(recording)}>
                {recording.thumbnailBlob ? (
                  <>
                    <img 
                      src={localRecordingStorage.createThumbnailURL(recording) || ''}
                      alt={`Thumbnail for ${recording.interviewName}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.warn('Thumbnail failed to load');
                        // Hide the img and show fallback
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="bg-white bg-opacity-90 rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform duration-200">
                        <Play className="h-6 w-6 text-gray-800 fill-gray-800" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Play className="h-8 w-8 mb-2" />
                    <span className="text-sm font-medium">Interview Recording</span>
                    <span className="text-xs">{formatFileSize(recording.recordingSize)} • {recording.recordingType?.split('/')[1]?.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handlePreviewRecording(recording)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDownloadRecording(recording)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {recordings.length > 0 && (
        <div className="mt-6 text-center">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium mb-1">
              🔒 Privacy First: Your recordings are stored locally on your device
            </p>
            <p className="text-xs text-green-600">
              No cloud upload • Instant access • Full control over your data
            </p>
          </div>
        </div>
      )}
      
      {/* Video Preview Modal */}
      {previewRecording && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  {previewRecording.interviewName || 'Interview Recording'}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={closePreview}
                >
                  ✕ Close
                </Button>
              </div>
              
              <video 
                controls 
                className="w-full max-h-96 bg-black rounded"
                src={previewUrl}
                onError={(e) => {
                  console.error('Video playback error:', e);
                  toast.error('Video playback failed', {
                    description: 'Could not play the recording'
                  });
                }}
              >
                Your browser does not support video playback.
              </video>
              
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div><strong>Size:</strong> {formatFileSize(previewRecording.recordingSize)}</div>
                <div><strong>Type:</strong> {previewRecording.recordingType}</div>
                <div><strong>Created:</strong> {format(previewRecording.createdAt, 'MMM dd, HH:mm')}</div>
                <div><strong>Storage:</strong> Local Device</div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => handleDownloadRecording(previewRecording)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Recording
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleDeleteRecording(previewRecording.id, previewRecording.interviewName || 'recording')}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};