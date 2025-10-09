import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, VideoOff, Play, Pause, Square, Download } from 'lucide-react';
import { toast } from 'sonner';

interface InterviewRecorderProps {
  isRecording: boolean;
  onStartRecording: (stream: MediaStream) => void;
  onStopRecording: () => void;
  onRecordingReady: (recordingBlob: Blob) => void;
  className?: string;
}

export const InterviewRecorder: React.FC<InterviewRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onRecordingReady,
  className = ''
}) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm; codecs=vp8,opus'
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordingBlob = new Blob(chunks, { type: 'video/webm' });
        setRecordedChunks([]);
        onRecordingReady(recordingBlob);
        
        // Stop all tracks to free up camera/microphone
        mediaStream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setStream(mediaStream);
      setRecordingDuration(0);
      
      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      onStartRecording(mediaStream);
      toast.success('Recording started', {
        description: 'Interview session is being recorded'
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Recording failed', {
        description: 'Could not access camera/microphone. Please check permissions.'
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      onStopRecording();
      toast.info('Recording stopped', {
        description: 'Interview session recording has ended'
      });
    }
  };

  // Auto-start/stop based on prop
  useEffect(() => {
    if (isRecording && !mediaRecorder) {
      startRecording();
    } else if (!isRecording && mediaRecorder) {
      stopRecording();
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`${className} border-2 ${isRecording ? 'border-red-300 shadow-red-100' : 'border-gray-300'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <Video className="h-5 w-5 text-red-500" />
            ) : (
              <VideoOff className="h-5 w-5 text-gray-500" />
            )}
            <span className="font-semibold text-gray-700">Session Recording</span>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-red-600 font-medium">REC</span>
            </div>
          )}
        </div>

        {/* Duration Display */}
        {isRecording && (
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-red-600">
              {formatDuration(recordingDuration)}
            </div>
            <div className="text-sm text-gray-500">
              Recording Duration
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-center text-sm">
          {isRecording ? (
            <div className="space-y-2">
              <span className="text-red-600 font-medium">🎥 Recording in Progress</span>
              <p className="text-gray-500 text-xs">
                Your interview session is being recorded for later review
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-gray-500">📹 Recording Ready</span>
              <p className="text-gray-400 text-xs">
                Recording will start automatically when interview begins
              </p>
            </div>
          )}
        </div>

        {/* Recording Info */}
        <div className="mt-4 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
          <div className="flex items-center gap-1 mb-1">
            <Video className="h-3 w-3" />
            <span className="font-medium">Privacy Notice:</span>
          </div>
          <p>Recordings are stored locally for your review and can be deleted anytime.</p>
        </div>
      </CardContent>
    </Card>
  );
};