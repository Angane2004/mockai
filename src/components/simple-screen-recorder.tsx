import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Monitor,
  Square,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface SimpleScreenRecorderProps {
  isRecording: boolean;
  onStartRecording: (stream: MediaStream) => void;
  onStopRecording: () => void;
  onRecordingReady: (recordingBlob: Blob) => void;
  className?: string;
}

export const SimpleScreenRecorder: React.FC<SimpleScreenRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onRecordingReady,
  className = ''
}) => {
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'preparing' | 'recording' | 'stopping'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  
  // Debug browser info on mount
  useEffect(() => {
    console.log('🔍 Simple Screen Recorder - Browser Check:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- getDisplayMedia available:', !!navigator.mediaDevices?.getDisplayMedia);
    console.log('- MediaRecorder available:', !!window.MediaRecorder);
    
    if (window.MediaRecorder) {
      // Test basic MIME types
      const testTypes = ['video/webm', 'video/mp4'];
      testTypes.forEach(type => {
        const supported = MediaRecorder.isTypeSupported(type);
        console.log(`- ${type} supported:`, supported);
      });
    }
    
    // Detect browser
    const ua = navigator.userAgent;
    if (ua.includes('Chrome/')) {
      const version = ua.match(/Chrome\/(\d+)/)?.[1] || 'unknown';
      console.log(`- Browser: Chrome ${version}`);
    } else if (ua.includes('Firefox/')) {
      const version = ua.match(/Firefox\/(\d+)/)?.[1] || 'unknown';
      console.log(`- Browser: Firefox ${version}`);
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      console.log('- Browser: Safari (limited support)');
    } else if (ua.includes('Edge/')) {
      const version = ua.match(/Edge\/(\d+)/)?.[1] || 'unknown';
      console.log(`- Browser: Edge ${version}`);
    } else {
      console.log('- Browser: Unknown/Unsupported');
    }
  }, []);

  // Simple screen capture - just get the screen, no complex combinations
  const captureScreen = async (): Promise<MediaStream | null> => {
    try {
      console.log('🖥️ Requesting simple screen capture...');
      
      // Request screen capture with basic settings
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen' as MediaStreamConstraints['video'],
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 15, max: 30 } // Lower framerate for compatibility
        },
        audio: false // Skip audio to avoid complications
      });

      console.log('✅ Screen capture successful');
      console.log('- Video tracks:', stream.getVideoTracks().length);
      console.log('- Audio tracks:', stream.getAudioTracks().length);
      
      setScreenStream(stream);
      
      // Set up preview
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(e => console.warn('Preview play failed:', e));
      }
      
      return stream;
    } catch (error) {
      console.error('❌ Screen capture failed:', error);
      
      let errorMessage = 'Screen capture failed';
      let errorDescription = 'Could not access screen recording';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          errorMessage = 'Screen sharing cancelled';
          errorDescription = 'Please select "Entire screen" and click "Share" to record your interview';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Screen sharing not supported';
          errorDescription = 'Your browser does not support screen recording';
        }
      }
      
      toast.error(errorMessage, { description: errorDescription });
      return null;
    }
  };

  // Create a very basic MediaRecorder with minimal options
  const createSimpleRecorder = (stream: MediaStream): MediaRecorder | null => {
    console.log('🎥 Creating simple MediaRecorder...');
    console.log('- Stream tracks available:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`));
    
    // First check if MediaRecorder exists
    if (!window.MediaRecorder) {
      console.error('❌ MediaRecorder not available in this browser');
      toast.error('Browser not supported', {
        description: 'Please use Google Chrome, Firefox, or Microsoft Edge for screen recording'
      });
      return null;
    }
    
    // Try multiple approaches with increasing simplicity
    const strategies = [
      // Strategy 1: Most basic - no options at all
      () => {
        console.log('Trying ultra-basic MediaRecorder (no options)...');
        return new MediaRecorder(stream);
      },
      // Strategy 2: Explicitly set video/webm
      () => {
        console.log('Trying with video/webm...');
        return new MediaRecorder(stream, { mimeType: 'video/webm' });
      },
      // Strategy 3: Try video/mp4 if webm fails
      () => {
        console.log('Trying with video/mp4...');
        return new MediaRecorder(stream, { mimeType: 'video/mp4' });
      }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        const recorder = strategies[i]();
        console.log(`✅ MediaRecorder created with strategy ${i + 1}`);
        return recorder;
      } catch (error) {
        console.warn(`⚠️ Strategy ${i + 1} failed:`, error);
        if (i === strategies.length - 1) {
          console.error('❌ All MediaRecorder strategies failed');
          toast.error('Recording not supported', {
            description: 'Your browser version cannot create video recordings. Please update to a newer version of Chrome, Firefox, or Edge.'
          });
        }
      }
    }
    
    return null;
  };

  // Start recording
  const startRecording = async () => {
    if (recordingStatus !== 'idle') return;
    
    setRecordingStatus('preparing');
    setChunks([]);
    
    // Capture screen
    const stream = await captureScreen();
    if (!stream) {
      setRecordingStatus('idle');
      return;
    }

    // Create recorder
    const recorder = createSimpleRecorder(stream);
    if (!recorder) {
      setRecordingStatus('idle');
      // Clean up stream
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    // Set up recorder events
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('📊 Recording chunk received:', event.data.size, 'bytes');
        setChunks(prev => [...prev, event.data]);
      }
    };

    recorder.onstart = () => {
      console.log('🎬 Recording started');
      setRecordingStatus('recording');
      setRecordingDuration(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast.success('Screen recording started!', {
        description: 'Recording your full screen'
      });
    };

    recorder.onstop = () => {
      console.log('🛑 Recording stopped');
      setRecordingStatus('stopping');
      
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Create blob from chunks
      setTimeout(() => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log('💾 Recording blob created:', blob.size, 'bytes');
        
        if (blob.size > 0) {
          onRecordingReady(blob);
          toast.success('Recording completed!', {
            description: `Recorded ${formatDuration(recordingDuration)} of your interview`
          });
        } else {
          toast.error('Recording failed', {
            description: 'No video data was captured'
          });
        }
        
        setRecordingStatus('idle');
        
        // Clean up
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
      }, 100);
    };

    recorder.onerror = (event) => {
      console.error('❌ Recording error:', event);
      toast.error('Recording error occurred');
      setRecordingStatus('idle');
    };

    // Start recording
    try {
      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every second
      onStartRecording(stream);
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      toast.error('Could not start recording');
      setRecordingStatus('idle');
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === 'recording') {
      console.log('🛑 Stopping recording...');
      mediaRecorderRef.current.stop();
      onStopRecording();
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start/stop based on prop
  useEffect(() => {
    if (isRecording && recordingStatus === 'idle') {
      startRecording();
    } else if (!isRecording && recordingStatus === 'recording') {
      stopRecording();
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card className={`${className} border-2 ${recordingStatus === 'recording' ? 'border-red-300 shadow-red-100' : 'border-gray-300'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Simple Screen Recording
          </CardTitle>
          
          {recordingStatus === 'recording' && (
            <Badge variant="destructive" className="animate-pulse">
              REC {formatDuration(recordingDuration)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
                <Monitor className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click Share to record full screen</p>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          {recordingStatus === 'idle' && (
            <div className="text-gray-600">
              <CheckCircle className="h-4 w-4 inline mr-1" />
              Ready for full screen recording
            </div>
          )}
          {recordingStatus === 'preparing' && (
            <div className="text-blue-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Click "Share" when prompted...
            </div>
          )}
          {recordingStatus === 'recording' && (
            <div className="text-red-600 font-medium">
              <div className="w-3 h-3 bg-red-500 rounded-full inline-block animate-pulse mr-2"></div>
              Recording full screen - {formatDuration(recordingDuration)}
            </div>
          )}
          {recordingStatus === 'stopping' && (
            <div className="text-orange-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
              Processing recording...
            </div>
          )}
        </div>

        {/* Manual Controls */}
        {recordingStatus === 'idle' && (
          <div className="flex justify-center gap-2">
            <Button 
              onClick={startRecording}
              className="bg-red-600 hover:bg-red-700"
              size="sm"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Record Full Screen
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
          Simple full-screen recording (no camera/microphone integration)
        </div>
      </CardContent>
    </Card>
  );
};