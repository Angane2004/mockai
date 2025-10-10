import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Video, 
  VideoOff, 
  Play, 
  Pause, 
  Square, 
  Download, 
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedVideoRecorderProps {
  onRecordingComplete?: (blob: Blob, url: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number; // in seconds
  videoConstraints?: MediaTrackConstraints;
  audioConstraints?: MediaTrackConstraints;
}

export const EnhancedVideoRecorder: React.FC<EnhancedVideoRecorderProps> = ({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 3600, // 1 hour default
  videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize media stream
  const initializeStream = useCallback(async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      });

      setStream(mediaStream);
      
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
        liveVideoRef.current.muted = true; // Always mute preview to avoid feedback
        await liveVideoRef.current.play();
      }

      toast.success('Camera and microphone ready!', {
        description: 'You can now start recording.'
      });

    } catch (err) {
      const error = err as Error;
      setError(error.message);
      
      let errorMessage = 'Failed to access camera/microphone';
      let description = 'Please check your permissions and try again.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/Microphone access denied';
        description = 'Please allow access in your browser settings and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Camera/Microphone not found';
        description = 'Please ensure your devices are connected and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/Microphone in use';
        description = 'Close other applications using your camera/microphone.';
      }

      toast.error(errorMessage, { description });
    }
  }, [videoConstraints, audioConstraints]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!stream) {
      toast.error('No media stream available', {
        description: 'Please initialize camera first.'
      });
      return;
    }

    try {
      chunksRef.current = [];
      
      // Create MediaRecorder with optimal settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm',
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000   // 128 kbps for audio
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        
        onRecordingComplete?.(blob, url);
        
        toast.success('Recording completed!', {
          description: `Recorded ${formatTime(recordingTime)} of content.`
        });
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording failed', {
          description: 'An error occurred during recording. Please try again.'
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            toast.warning('Maximum recording duration reached', {
              description: `Recording stopped at ${formatTime(maxDuration)}.`
            });
          }
          return newTime;
        });
      }, 1000);

      onRecordingStart?.();
      
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording', {
        description: 'Please check your browser compatibility and try again.'
      });
    }
  }, [stream, maxDuration, onRecordingStart, onRecordingComplete, recordingTime]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      onRecordingStop?.();
    }
  }, [isRecording, onRecordingStop]);

  // Playback controls
  const togglePlayback = useCallback(() => {
    if (playbackVideoRef.current) {
      if (isPlaying) {
        playbackVideoRef.current.pause();
      } else {
        playbackVideoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (playbackVideoRef.current) {
      if (!isFullscreen) {
        playbackVideoRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      setIsFullscreen(!isFullscreen);
    }
  }, [isFullscreen]);

  // Download recording
  const downloadRecording = useCallback(() => {
    if (recordedBlob && recordedUrl) {
      const a = document.createElement('a');
      a.href = recordedUrl;
      a.download = `interview-recording-${new Date().toISOString().slice(0, 19)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Download started!', {
        description: 'Your recording is being downloaded.'
      });
    }
  }, [recordedBlob, recordedUrl]);

  // Reset recording
  const resetRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl('');
    setIsPlaying(false);
    setRecordingTime(0);
    
    if (playbackVideoRef.current) {
      playbackVideoRef.current.src = '';
    }
    
    toast.info('Recording reset', {
      description: 'Ready to record again.'
    });
  }, [recordedUrl]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize on mount
  useEffect(() => {
    initializeStream();
    
    return () => {
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Live Preview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {isRecording ? 'Recording...' : 'Live Preview'}
            </CardTitle>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                REC {formatTime(recordingTime)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <video
              ref={liveVideoRef}
              className="w-full h-64 bg-gray-900 rounded-lg object-cover"
              autoPlay
              muted
              playsInline
            />
            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Camera not initialized</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg">
                <div className="text-center">
                  <VideoOff className="h-12 w-12 text-red-400 mx-auto mb-2" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {!stream ? (
              <Button onClick={initializeStream} variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Initialize Camera
              </Button>
            ) : !isRecording ? (
              <Button 
                onClick={startRecording} 
                className="bg-red-600 hover:bg-red-700"
                disabled={!stream}
              >
                <div className="w-3 h-3 bg-white rounded-full mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button 
                onClick={stopRecording}
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Playback Card */}
      {recordedBlob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Recorded Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <video
                ref={playbackVideoRef}
                src={recordedUrl}
                className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                controls
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadRecording}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetRecording}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
            
            {/* Recording Info */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Duration:</span> {formatTime(recordingTime)}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};