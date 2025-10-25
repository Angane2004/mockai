import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@clerk/clerk-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { toast } from 'sonner';

export const DebugRecordings = () => {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [allRecordings, setAllRecordings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();
  
  console.log('🔍 Debug Page - Current userId:', userId);

  const fetchData = async () => {
    if (!userId) {
      console.log('❌ No userId available for fetching data');
      return;
    }
    
    setLoading(true);
    console.log('🔄 Starting comprehensive data fetch for userId:', userId);
    
    try {
      // Fetch ALL recordings first (for debugging)
      console.log('🔍 Fetching ALL recordings from database...');
      const allRecordingsQuery = collection(db, 'interviewRecordings');
      const allRecordingsSnapshot = await getDocs(allRecordingsQuery);
      const allRecordingsList = allRecordingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setAllRecordings(allRecordingsList);
      
      // Get all unique user IDs
      const uniqueUserIds = [...new Set(allRecordingsList.map((r: any) => r.userId))];
      setAllUsers(uniqueUserIds);
      
      console.log('📊 ALL RECORDINGS SUMMARY:');
      console.log('- Total recordings in database:', allRecordingsList.length);
      console.log('- Unique users:', uniqueUserIds.length);
      console.log('- All user IDs:', uniqueUserIds);
      console.log('- Current userId:', userId);
      console.log('- User ID match found:', uniqueUserIds.includes(userId));
      
      // Fetch user-specific recordings
      console.log('🔍 Fetching recordings for current user:', userId);
      const recordingsQuery = query(
        collection(db, 'interviewRecordings'),
        where('userId', '==', userId)
      );
      const recordingsSnapshot = await getDocs(recordingsQuery);
      const recordingsList = recordingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setRecordings(recordingsList);
      
      console.log('🎥 USER RECORDINGS SUMMARY:');
      console.log('- Found recordings for user:', recordingsList.length);
      console.log('- Recording details:', recordingsList.map((r: any) => ({
        id: r.id,
        interviewId: r.interviewId,
        size: r.recordingSize,
        type: r.recordingType,
        hasData: !!r.recordingData,
        created: r.createdAt?.toDate?.()?.toISOString()
      })));

      // Fetch reports
      console.log('🔍 Fetching reports for userId:', userId);
      const reportsQuery = query(
        collection(db, 'interviewReports'),
        where('userId', '==', userId)
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      const reportsList = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportsList);
      console.log('Found reports:', reportsList.length);

      toast.success(`Debug complete: ${recordingsList.length} user recordings, ${allRecordingsList.length} total recordings`, {
        description: `Found ${uniqueUserIds.length} unique users in database`
      });
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast.error('Error fetching data', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔍 Debug Recordings & Reports</h1>
        <div className="flex gap-2">
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Data'}
          </Button>
        </div>
      </div>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <p className="text-sm text-blue-800 mb-2">
          👨‍🔧 <strong>Debug Information:</strong> This page shows all recordings and reports in your database. 
          Use this to troubleshoot why recordings might not appear in the "Recorded Sessions" page.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><strong>Your User ID:</strong> {userId || 'Not available'}</div>
          <div><strong>Total DB Recordings:</strong> {allRecordings.length}</div>
          <div><strong>Your Recordings:</strong> {recordings.length}</div>
          <div><strong>Unique Users:</strong> {allUsers.length}</div>
        </div>
        {allUsers.length > 0 && (
          <div className="mt-2">
            <strong className="text-sm">User ID Match:</strong>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              allUsers.includes(userId || '') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {allUsers.includes(userId || '') ? '✅ Found' : '❌ Not Found'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recordings */}
        <Card>
          <CardHeader>
            <CardTitle>📹 Interview Recordings ({recordings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {recordings.length === 0 ? (
              <p className="text-gray-500">No recordings found</p>
            ) : (
              <div className="space-y-4">
                {recordings.map((recording, index) => (
                  <div key={recording.id} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>ID:</strong> {recording.id}</div>
                      <div><strong>Interview ID:</strong> {recording.interviewId}</div>
                      <div><strong>Size:</strong> {formatBytes(recording.recordingSize || 0)}</div>
                      <div><strong>Type:</strong> {recording.recordingType}</div>
                      <div><strong>Created:</strong> {recording.createdAt?.toDate()?.toLocaleString() || 'Unknown'}</div>
                      <div><strong>Has Data:</strong> {recording.recordingData ? 'Yes' : 'No'}</div>
                      <div><strong>Data Size:</strong> {recording.recordingData ? `${(recording.recordingData.length / 1024).toFixed(2)} KB` : 'N/A'}</div>
                      <div><strong>Data Type:</strong> {recording.recordingData ? recording.recordingData.substring(0, 50) + '...' : 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Interview Reports ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-gray-500">No reports found</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report, index) => (
                  <div key={report.id} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>ID:</strong> {report.id}</div>
                      <div><strong>Interview ID:</strong> {report.interviewId}</div>
                      <div><strong>Name:</strong> {report.interviewName || 'N/A'}</div>
                      <div><strong>Type:</strong> {report.interviewType || 'N/A'}</div>
                      <div><strong>Level:</strong> {report.depthLevel || 'N/A'}</div>
                      <div><strong>Rating:</strong> {report.overallRating || 'N/A'}</div>
                      <div><strong>Created:</strong> {report.createdAt?.toDate()?.toLocaleString() || 'Unknown'}</div>
                      <div><strong>Generated By:</strong> {report.generatedBy || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Recording Display */}
      {recordings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎥 Test Video Display - First Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p><strong>Recording ID:</strong> {recordings[0].id}</p>
                <p><strong>Size:</strong> {formatBytes(recordings[0].recordingSize || 0)}</p>
                <p><strong>Type:</strong> {recordings[0].recordingType}</p>
              </div>
              
              {recordings[0].recordingData ? (
                <div>
                  <p className="text-sm font-medium mb-2">Video Preview:</p>
                  <video 
                    controls 
                    className="w-full max-w-md h-48 bg-black rounded"
                    src={recordings[0].recordingData}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : (
                <p className="text-red-500">No video data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};