import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomBreadCrumb } from '@/components/custom-bread-crumb';
import { 
  Download,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase.config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@clerk/clerk-react';
import { LoaderPage } from './loader-page';
import { InterviewVideoViewer } from '@/components/interview-video-viewer';

export const WatchSession = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  
  const [recording, setRecording] = useState<any>(null);
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!interviewId || !userId) return;
      
      try {
        setLoading(true);
        
        // Try to fetch interview details, but don't fail if not found
        let interviewData = null;
        try {
          const interviewDoc = await getDoc(doc(db, 'interviews', interviewId));
          if (interviewDoc.exists()) {
            interviewData = { id: interviewDoc.id, ...interviewDoc.data() };
          }
        } catch (error) {
          console.warn('Could not fetch interview details:', error);
          // Try to get details from the report instead
          const reportQuery = query(
            collection(db, 'interviewReports'),
            where('interviewId', '==', interviewId),
            where('userId', '==', userId)
          );
          const reportSnapshot = await getDocs(reportQuery);
          if (!reportSnapshot.empty) {
            const reportData = reportSnapshot.docs[0].data();
            interviewData = {
              id: interviewId,
              name: reportData.interviewName || 'Interview Recording',
              interviewType: reportData.interviewType || 'Technical',
              depthLevel: reportData.depthLevel || 'Intermediate',
              duration: 30
            };
          }
        }
        
        if (!interviewData) {
          interviewData = {
            id: interviewId,
            name: 'Interview Recording',
            interviewType: 'Technical',
            depthLevel: 'Intermediate',
            duration: 30
          };
        }
        
        setInterview(interviewData);
        
        // Fetch recording
        const recordingQuery = query(
          collection(db, 'interviewRecordings'),
          where('interviewId', '==', interviewId),
          where('userId', '==', userId)
        );
        
        const recordingSnapshot = await getDocs(recordingQuery);
        
        if (recordingSnapshot.empty) {
          toast.error('No recording found for this interview');
          navigate('/');
          return;
        }
        
        const recordingData = recordingSnapshot.docs[0].data();
        setRecording(recordingData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load interview recording');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [interviewId, userId, navigate]);

  const handleDownload = () => {
    if (recording && recording.recordingData) {
      const link = document.createElement('a');
      link.href = recording.recordingData;
      link.download = `Interview-${interview?.name || 'Session'}-${new Date().toISOString().split('T')[0]}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started!', {
        description: 'Your interview recording is being downloaded'
      });
    }
  };

  // Utility functions removed - handled by InterviewVideoViewer component

  if (loading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  if (!recording || !interview) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <h2 className="text-xl font-semibold text-gray-600 mb-4">Recording Not Found</h2>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6 py-5">
      {/* Breadcrumb */}
      <CustomBreadCrumb
        breadCrumbPage="Watch Session"
        breadCrumpItems={[
          { label: "Dashboard", link: "/" },
          { label: interview.name || "Interview", link: `/generate/feedback/${interviewId}` }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Interview Recording
          </h1>
          <p className="text-gray-600 mt-1">
            {interview.name} • {new Date(recording.createdAt?.toDate()).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Video Player */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎥 Interview Session Recording
            <span className="text-sm font-normal text-gray-500">
              ({Math.round((recording.recordingSize || 0) / (1024 * 1024))}MB)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enhanced Video Player */}
          <InterviewVideoViewer 
            recordingData={recording?.recordingData || ''}
            recordingType={recording?.recordingType}
            interviewTitle={interview?.name || 'Interview Recording'}
            interviewDate={recording?.createdAt?.toDate()?.toISOString()}
            onError={(error) => {
              console.error('Video playback error:', error);
              toast.error('Video playback error', {
                description: error
              });
            }}
          />

          {/* Recording Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
            <div>
              <span className="font-medium text-gray-700">Interview Type:</span>
              <p className="text-gray-600">{interview.interviewType || 'Technical'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Difficulty Level:</span>
              <p className="text-gray-600">{interview.depthLevel || 'Intermediate'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Duration:</span>
              <p className="text-gray-600">{interview.duration || 30} minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 View Feedback Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Review your detailed AI-generated feedback and performance analysis.
            </p>
            <Button 
              onClick={() => navigate(`/generate/feedback/${interviewId}`)}
              className="w-full"
            >
              View Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🔄 Retake Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Practice with the same questions again to improve your performance.
            </p>
            <Button 
              onClick={() => navigate(`/generate/interview/${interviewId}/start`)}
              variant="outline"
              className="w-full"
            >
              Start Retake
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};