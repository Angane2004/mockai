import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@clerk/clerk-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { toast } from 'sonner';

export const DebugRecordings: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();

  const runDebug = async () => {
    setLoading(true);
    const debug: any = {
      timestamp: new Date().toISOString(),
      userId,
      authState: !!userId,
      database: {
        connected: false,
        appName: '',
        projectId: ''
      },
      recordings: {
        total: 0,
        userRecordings: 0,
        allUserIds: [],
        sampleData: []
      },
      testWrite: {
        success: false,
        docId: null,
        error: null
      }
    };

    try {
      // Test database connection
      debug.database.connected = true;
      debug.database.appName = db.app.name;
      debug.database.projectId = db.app.options.projectId;

      // Check all recordings
      console.log(' Checking all recordings...');
      const allRecordingsQuery = collection(db, 'interviewRecordings');
      const allSnapshot = await getDocs(allRecordingsQuery);
      debug.recordings.total = allSnapshot.docs.length;
      debug.recordings.allUserIds = [...new Set(allSnapshot.docs.map(doc => doc.data().userId))];
      debug.recordings.sampleData = allSnapshot.docs.slice(0, 3).map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
        interviewId: doc.data().interviewId,
        size: doc.data().recordingSize,
        type: doc.data().recordingType,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'No timestamp',
        hasData: !!doc.data().recordingData
      }));

      if (userId) {
        // Check user-specific recordings
        console.log(' Checking user recordings for:', userId);
        const userRecordingsQuery = query(
          collection(db, 'interviewRecordings'),
          where('userId', '==', userId)
        );
        const userSnapshot = await getDocs(userRecordingsQuery);
        debug.recordings.userRecordings = userSnapshot.docs.length;

        // Test write capability
        console.log(' Testing write capability...');
        try {
          const testDoc = await addDoc(collection(db, 'debugTest'), {
            userId,
            timestamp: serverTimestamp(),
            test: 'Debug write test'
          });
          debug.testWrite.success = true;
          debug.testWrite.docId = testDoc.id;
        } catch (writeError) {
          debug.testWrite.error = writeError instanceof Error ? writeError.message : 'Unknown write error';
        }
      }

    } catch (error) {
      console.error('❌ Debug failed:', error);
      debug.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setDebugInfo(debug);
    setLoading(false);
    
    // Log everything to console
    console.log(' DEBUG REPORT:', debug);
  };

  const createTestRecording = async () => {
    if (!userId) {
      toast.error('Not authenticated');
      return;
    }

    try {
      // Create a small test recording
      const testData = 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibQSBgQFNAINkhP//RA==';
      
      const docRef = await addDoc(collection(db, 'interviewRecordings'), {
        interviewId: `test-${Date.now()}`,
        userId,
        recordingData: testData,
        recordingSize: 100,
        recordingType: 'video/webm',
        createdAt: serverTimestamp(),
        isTestRecording: true
      });

      toast.success(`Test recording created: ${docRef.id}`);
      
      // Refresh debug info
      await runDebug();
      
    } catch (error) {
      console.error('❌ Failed to create test recording:', error);
      toast.error('Failed to create test recording');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🔍 Recording Debug Tool</h1>
        <p className="text-gray-600">Diagnose recording visibility issues</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button onClick={runDebug} disabled={loading}>
          {loading ? 'Running Debug...' : '🔍 Run Debug Check'}
        </Button>
        <Button onClick={createTestRecording} variant="outline">
           Create Test Recording
        </Button>
      </div>

      {debugInfo && (
        <div className="space-y-4">
          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 Authentication Status
                <Badge variant={debugInfo.authState ? "default" : "destructive"}>
                  {debugInfo.authState ? "✅ Authenticated" : "❌ Not Authenticated"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>User ID:</strong> {debugInfo.userId || 'Not available'}
                </div>
                <div>
                  <strong>Timestamp:</strong> {debugInfo.timestamp}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 Database Status
                <Badge variant={debugInfo.database.connected ? "default" : "destructive"}>
                  {debugInfo.database.connected ? "✅ Connected" : "❌ Disconnected"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>App Name:</strong> {debugInfo.database.appName}
                </div>
                <div>
                  <strong>Project ID:</strong> {debugInfo.database.projectId}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recording Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 Recording Data
                <Badge variant={debugInfo.recordings.userRecordings > 0 ? "default" : "secondary"}>
                  {debugInfo.recordings.userRecordings} User Recordings
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Total Recordings:</strong> {debugInfo.recordings.total}
                  </div>
                  <div>
                    <strong>Your Recordings:</strong> {debugInfo.recordings.userRecordings}
                  </div>
                  <div>
                    <strong>Unique Users:</strong> {debugInfo.recordings.allUserIds.length}
                  </div>
                </div>
                
                {debugInfo.recordings.allUserIds.length > 0 && (
                  <div>
                    <strong>All User IDs in DB:</strong>
                    <div className="mt-2 space-y-1">
                      {debugInfo.recordings.allUserIds.map((uid: string, index: number) => (
                        <div key={index} className={`text-xs p-2 rounded ${uid === debugInfo.userId ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {uid} {uid === debugInfo.userId && '(YOU)'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {debugInfo.recordings.sampleData.length > 0 && (
                  <div>
                    <strong>Sample Recording Data:</strong>
                    <div className="mt-2 space-y-2">
                      {debugInfo.recordings.sampleData.map((recording: any, index: number) => (
                        <div key={index} className="text-xs p-3 bg-gray-50 rounded border">
                          <div><strong>ID:</strong> {recording.id}</div>
                          <div><strong>User ID:</strong> {recording.userId}</div>
                          <div><strong>Interview ID:</strong> {recording.interviewId}</div>
                          <div><strong>Size:</strong> {recording.size} bytes</div>
                          <div><strong>Type:</strong> {recording.type}</div>
                          <div><strong>Created:</strong> {recording.createdAt}</div>
                          <div><strong>Has Data:</strong> {recording.hasData ? '✅' : '❌'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Write Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 Write Test
                <Badge variant={debugInfo.testWrite.success ? "default" : "destructive"}>
                  {debugInfo.testWrite.success ? "✅ Success" : "❌ Failed"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {debugInfo.testWrite.success ? (
                  <div>
                    <strong>Test Document ID:</strong> {debugInfo.testWrite.docId}
                  </div>
                ) : (
                  <div className="text-red-600">
                    <strong>Error:</strong> {debugInfo.testWrite.error || 'Unknown error'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Raw Debug Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Debug Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};