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
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@clerk/clerk-react';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface RecordedSession {
  id: string;
  interviewId: string;
  interviewName?: string;
  interviewType?: string;
  depthLevel?: string;
  recordingSize: number;
  recordingType: string;
  createdAt: any;
  duration?: number;
}

export const RecordedSessions: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const recordingsQuery = query(
      collection(db, 'interviewRecordings'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      recordingsQuery,
      async (snapshot) => {
        const recordingsList: RecordedSession[] = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const recordingData = { id: doc.id, ...doc.data() };
            
            // Fetch interview details to get name and type
            try {
              const interviewDocRef = doc(db, 'interviews', recordingData.interviewId);
              const interviewDoc = await getDoc(interviewDocRef);
              
              if (interviewDoc.exists()) {
                const interviewData = interviewDoc.data();
                recordingData.interviewName = interviewData.name;
                recordingData.interviewType = interviewData.interviewType;
                recordingData.depthLevel = interviewData.depthLevel;
              }
            } catch (error) {
              console.warn('Could not fetch interview details for recording:', error);
            }

            return recordingData as RecordedSession;
          })
        );
        
        // Sort by creation date, newest first
        recordingsList.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
        });
        
        setRecordings(recordingsList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching recordings:', error);
        toast.error('Error loading recordings', {
          description: 'Could not load your recorded sessions. Please try again later.'
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const handleDeleteRecording = async (recordingId: string, interviewName: string) => {
    try {
      await deleteDoc(doc(db, 'interviewRecordings', recordingId));
      toast.success('Recording deleted!', {
        description: `Deleted recording for "${interviewName}"`
      });
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording', {
        description: 'Could not delete the recording. Please try again.'
      });
    }
  };

  const handleDownloadRecording = (recording: RecordedSession) => {
    // This would need the actual recording data to work
    // For now, we'll show a message that directs to the watch page
    toast.info('Download from watch page', {
      description: 'Click "Watch Session" to view and download the recording.'
    });
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
            <h2 className="text-xl font-semibold text-gray-800">📹 Recorded Sessions</h2>
            <p className="text-gray-600 text-sm mt-1">Your interview recording library</p>
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
            <h2 className="text-xl font-semibold text-gray-800">📹 Recorded Sessions</h2>
            <p className="text-gray-600 text-sm mt-1">Your interview recording library</p>
          </div>
        </div>
        
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <FileVideo className="h-16 w-16 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Recordings Yet</h3>
              <p className="text-gray-500 text-sm max-w-md">
                Complete some interviews to see your recorded sessions here. 
                Recordings are automatically saved when you finish an interview.
              </p>
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
          <h2 className="text-xl font-semibold text-gray-800">📹 Recorded Sessions</h2>
          <p className="text-gray-600 text-sm mt-1">
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''} • 
            Total size: {formatFileSize(recordings.reduce((total, r) => total + (r.recordingSize || 0), 0))}
          </p>
        </div>
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
                    {recording.createdAt 
                      ? format(recording.createdAt.toDate(), 'MMM dd, yyyy')
                      : 'Unknown date'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileVideo className="h-4 w-4" />
                  <span>{formatFileSize(recording.recordingSize || 0)}</span>
                </div>
              </div>

              {/* Thumbnail/Preview */}
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center text-gray-500">
                  <Play className="h-8 w-8 mb-2" />
                  <span className="text-sm">Video Recording</span>
                  <span className="text-xs">{recording.recordingType || 'video/webm'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Link 
                  to={`/generate/watch-session/${recording.interviewId}`}
                  className="flex-1"
                >
                  <Button size="sm" className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Watch Session
                  </Button>
                </Link>
                <Link 
                  to={`/generate/feedback/${recording.interviewId}`}
                >
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {recordings.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            💡 Tip: Click "Watch Session" to view recordings with full video controls and download options
          </p>
        </div>
      )}
    </div>
  );
};