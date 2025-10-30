import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Video, 
  Square,
  Monitor,
  AlertCircle,
  CheckCircle,
  Camera,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface ContainerRecorderProps {
  isRecording: boolean;
  onStartRecording: (stream: MediaStream) => void;
  onStopRecording: () => void;
  onRecordingReady: (recordingBlob: Blob) => void;
  className?: string;
}

export const ContainerRecorder: React.FC<ContainerRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onRecordingReady,
  className = ''
}) => {
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'preparing' | 'recording' | 'stopping'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [combinedStream, setCombinedStream] = useState<MediaStream | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Create a recording that captures both screen content and webcam
  const createContainerRecording = useCallback(async (): Promise<MediaStream | null> => {
    try {
      console.log(' Creating screen + camera recording...');
      
      let screenStream: MediaStream | null = null;
      let cameraStream: MediaStream | null = null;
      
      try {
        // First try to get screen capture (for questions/answers)
        console.log('🗺️ Requesting screen capture...');
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: false // We'll get audio from camera
        });
        console.log('✅ Screen capture obtained');
      } catch (screenError) {
        console.warn('⚠️ Screen capture failed, will use camera only:', screenError);
      }
      
      try {
        // Get webcam stream for camera and audio
        console.log('📹 Requesting camera and microphone access...');
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('✅ Camera stream obtained');
      } catch (cameraError) {
        console.warn('⚠️ Camera access failed:', cameraError);
        if (!screenStream) {
          throw new Error('Both screen and camera capture failed');
        }
      }
      
      // If we have screen capture, use it as primary; otherwise use camera
      if (screenStream && cameraStream) {
        console.log(' Combining screen capture with camera audio...');
        
        // Use screen video + camera audio
        const combinedTracks = [
          ...screenStream.getVideoTracks(),
          ...cameraStream.getAudioTracks()
        ];
        
        const combinedStream = new MediaStream(combinedTracks);
        
        console.log('✅ Combined screen+camera stream ready:', {
          videoTracks: combinedStream.getVideoTracks().length,
          audioTracks: combinedStream.getAudioTracks().length,
          source: 'screen_capture_with_camera_audio'
        });
        
        return combinedStream;
      } else if (screenStream) {
        console.log('✅ Screen-only stream ready');
        return screenStream;
      } else if (cameraStream) {
        console.log('✅ Camera-only stream ready');
        return cameraStream;
      } else {
        throw new Error('No recording stream available');
      }
      
    } catch (error) {
      console.error('❌ Error creating container recording:', error);
      return null;
    }
  }, [recordingStatus]);

  // Start recording with timeout
  const startRecording = async () => {
    if (recordingStatus !== 'idle') {
      console.log('⚠️ Recording not idle, current status:', recordingStatus);
      return;
    }

    console.log('🎥 Starting recording preparation...');
    setRecordingStatus('preparing');
    toast.info('Starting interview recording...', {
      description: 'Setting up screen capture and camera recording',
      id: 'recording-prep',
      duration: 2000
    });

    try {
      // Add short timeout to prevent getting stuck in preparing state
      const streamPromise = createContainerRecording();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Recording preparation timed out after 3 seconds')), 3000)
      );
      
      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream | null;
      
      if (!stream) {
        throw new Error('Failed to create recording stream');
      }
      
      console.log('✅ Recording stream created successfully');
      
      // Dismiss preparation toast
      toast.dismiss('recording-prep');

      setCombinedStream(stream);

      // Set up preview
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstart = () => {
        console.log('Container recording started');
        setRecordingStatus('recording');
        setRecordingDuration(0);
        
        // Start timer
        intervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);

        toast.success('Screen recording started! 🎥', {
          description: 'Recording your screen and audio for the interview',
          id: 'recording-active'
        });
      };

      recorder.onstop = () => {
        console.log('🛑 Container recording stopped');
        setRecordingStatus('stopping');
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log('💾 Recording blob created:', blob.size, 'bytes');
        
        onRecordingReady(blob);
        setRecordingStatus('idle');
        
        // Cleanup
        if (combinedStream) {
          combinedStream.getTracks().forEach(track => track.stop());
          setCombinedStream(null);
        }

        toast.success('Container recording completed!', {
          description: `Recorded ${formatDuration(recordingDuration)}`
        });
      };

      setMediaRecorder(recorder);
      recorder.start(1000);
      onStartRecording(stream);

    } catch (error) {
      console.error('❌ Failed to start container recording:', error);
      
      // Try fallback recording (screen capture or camera)
      console.log('🔄 Attempting fallback recording methods...');
      try {
        let fallbackStream: MediaStream;
        
        try {
          // First try screen capture as fallback
          console.log('Trying screen capture fallback...');
          fallbackStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
          });
          console.log('✅ Screen capture fallback successful');
        } catch {
          // If screen capture fails, use basic camera
          console.log('📹 Trying camera fallback...');
          fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
          });
          console.log('✅ Camera fallback successful');
        }
        setCombinedStream(fallbackStream);
        
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = fallbackStream;
        }
        
        // Create MediaRecorder with fallback stream
        const recorder = new MediaRecorder(fallbackStream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
            ? 'video/webm;codecs=vp9,opus' 
            : 'video/webm'
        });
        
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        recorder.onstart = () => {
          console.log('Fallback recording started');
          setRecordingStatus('recording');
          setRecordingDuration(0);
          
          intervalRef.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
          }, 1000);
          
        toast.success('Recording started!', {
          description: 'Interview recording is now active',
          id: 'fallback-recording'
        });
        };
        
        recorder.onstop = () => {
          console.log('🛑 Fallback recording stopped');
          setRecordingStatus('stopping');
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log('Fallback recording blob created:', blob.size, 'bytes');
          
          onRecordingReady(blob);
          setRecordingStatus('idle');
          
          if (fallbackStream) {
            fallbackStream.getTracks().forEach(track => track.stop());
            setCombinedStream(null);
          }
          
          toast.success('Recording completed!', {
            description: `Recorded ${formatDuration(recordingDuration)}`,
            id: 'recording-completed'
          });
        };
        
        setMediaRecorder(recorder);
        recorder.start(1000);
        onStartRecording(fallbackStream);
        
      } catch (fallbackError) {
        console.error('❌ Fallback recording also failed:', fallbackError);
        toast.error('Recording failed to start', {
          description: 'Could not initialize any recording method. Please check camera/microphone permissions.'
        });
        setRecordingStatus('idle');
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && recordingStatus === 'recording') {
      console.log('🛑 Stopping container recording...');
      mediaRecorder.stop();
      onStopRecording();
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start/stop based on prop with better error handling
  useEffect(() => {
    console.log('📊 Recording prop changed:', {
      isRecording,
      recordingStatus,
      shouldStart: isRecording && recordingStatus === 'idle',
      shouldStop: !isRecording && recordingStatus === 'recording'
    });
    
    if (isRecording && recordingStatus === 'idle') {
      console.log('Auto-starting recording...');
      startRecording().catch(error => {
        console.error('❌ Auto-start failed:', error);
        toast.error('Recording failed to start', {
          description: 'Please try starting manually or check permissions'
        });
        setRecordingStatus('idle');
      });
    } else if (!isRecording && recordingStatus === 'recording') {
      console.log('🛑 Auto-stopping recording...');
      stopRecording();
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (combinedStream) {
        combinedStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card className={`${className} border-2 ${recordingStatus === 'recording' ? 'border-green-300 shadow-green-100' : 'border-gray-300'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Interview Recording
          </CardTitle>
          
          {recordingStatus === 'recording' && (
            <Badge variant="destructive" className="animate-pulse">
              REC {formatDuration(recordingDuration)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Canvas for combining containers (hidden) */}
        <canvas 
          ref={canvasRef} 
          className="hidden" 
          width={1280} 
          height={720}
        />

        {/* Preview */}
        <div className="relative">
          <video
            ref={previewVideoRef}
            className="w-full h-32 bg-gray-900 rounded object-cover"
            autoPlay
            muted
            playsInline
          />
          {recordingStatus === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Camera className="h-6 w-6 text-gray-400" />
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">Container Recording Ready</p>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          {recordingStatus === 'idle' && (
            <div className="text-gray-600">
              <CheckCircle className="h-4 w-4 inline mr-1" />
              Ready to record containers
            </div>
          )}
          {recordingStatus === 'preparing' && (
            <div className="text-blue-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Preparing container recording...
            </div>
          )}
          {recordingStatus === 'recording' && (
            <div className="text-green-600 font-medium">
              <div className="w-3 h-3 bg-green-500 rounded-full inline-block animate-pulse mr-2"></div>
              Recording containers - {formatDuration(recordingDuration)}
            </div>
          )}
          {recordingStatus === 'stopping' && (
            <div className="text-orange-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
              Finalizing recording...
            </div>
          )}
        </div>

        {/* Manual Controls */}
        {recordingStatus === 'idle' && (
          <div className="flex justify-center gap-2">
            <Button 
              onClick={startRecording}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Video className="h-4 w-4 mr-2" />
              Record Containers
            </Button>
          </div>
        )}

        {recordingStatus === 'recording' && (
          <div className="flex justify-center gap-2">
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size="sm"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          </div>
        )}

        {/* Recording Info */}
        <div className="text-xs text-gray-500 text-center p-2 bg-blue-50 rounded">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Records your screen (questions/answers) and audio during the interview
        </div>
      </CardContent>
    </Card>
  );
};