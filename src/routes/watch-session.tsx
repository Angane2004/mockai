import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomBreadCrumb } from '@/components/custom-bread-crumb';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Download,
  ArrowLeft,
  RotateCcw,
  SkipForward,
  SkipBack,
  Maximize
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/config/firebase.config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@clerk/clerk-react';
import { LoaderPage } from './loader-page';

export const WatchSession = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  
  const [recording, setRecording] = useState<any>(null);
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!interviewId || !userId) return;
      
      try {
        setLoading(true);
        
        // Fetch interview details
        const interviewDoc = await getDoc(doc(db, 'interviews', interviewId));
        if (!interviewDoc.exists()) {
          toast.error('Interview not found');
          navigate('/');
          return;
        }
        
        const interviewData = { id: interviewDoc.id, ...interviewDoc.data() };
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
        
        // Create video blob URL from base64
        if (recordingData.recordingData) {
          const base64Data = recordingData.recordingData.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: recordingData.recordingType || 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          
          if (videoRef.current) {
            videoRef.current.src = videoUrl;
          }
        }
        
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

  // Video event handlers
  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

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

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
          {/* Video Element */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-auto max-h-[500px] object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              poster="/assets/svg/video-placeholder.svg"
            >
              Your browser does not support video playback.
            </video>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 relative">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = parseFloat(e.target.value);
                }
              }}
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSeek(-10)}
              className="h-10 w-10"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            {isPlaying ? (
              <Button
                variant="outline"
                size="icon"
                onClick={handlePause}
                className="h-12 w-12"
              >
                <Pause className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={handlePlay}
                className="h-12 w-12"
              >
                <Play className="w-5 h-5 ml-1" />
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={handleStop}
              className="h-10 w-10"
            >
              <Square className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSeek(10)}
              className="h-10 w-10"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className="h-10 w-10"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="h-10 w-10"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-500" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

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