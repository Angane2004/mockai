import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Video, 
  VideoOff, 
  Monitor,
  MonitorSpeaker,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Download,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface ScreenInterviewRecorderProps {
  isRecording: boolean;
  onStartRecording: (stream: MediaStream) => void;
  onStopRecording: () => void;
  onRecordingReady: (recordingBlob: Blob) => void;
  className?: string;
}

export const ScreenInterviewRecorder: React.FC<ScreenInterviewRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onRecordingReady,
  className = ''
}) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [combinedStream, setCombinedStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'preparing' | 'recording' | 'stopping'>('idle');
  const [permissions, setPermissions] = useState({
    screen: false,
    camera: false,
    microphone: false
  });
  const [browserSupported, setBrowserSupported] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Debug browser capabilities on mount
  useEffect(() => {
    console.log('🔍 Browser capabilities check:');
    console.log('- getDisplayMedia:', !!navigator.mediaDevices?.getDisplayMedia);
    console.log('- getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
    console.log('- MediaRecorder:', !!window.MediaRecorder);
    console.log('- User Agent:', navigator.userAgent);
    
    // Detect browser type
    const userAgent = navigator.userAgent;
    let browserInfo = 'Unknown browser';
    
    if (userAgent.includes('Chrome/')) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      const version = match ? parseInt(match[1]) : 0;
      browserInfo = `Chrome ${version}`;
      if (version < 50) {
        console.warn('⚠️ Chrome version too old for screen recording');
      }
    } else if (userAgent.includes('Firefox/')) {
      const match = userAgent.match(/Firefox\/(\d+)/);
      const version = match ? parseInt(match[1]) : 0;
      browserInfo = `Firefox ${version}`;
      if (version < 60) {
        console.warn('⚠️ Firefox version too old for screen recording');
      }
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browserInfo = 'Safari (limited screen recording support)';
    } else if (userAgent.includes('Edge/')) {
      const match = userAgent.match(/Edge\/(\d+)/);
      const version = match ? parseInt(match[1]) : 0;
      browserInfo = `Edge ${version}`;
    }
    
    console.log('- Browser:', browserInfo);
    
    if (window.MediaRecorder) {
      console.log('- MediaRecorder state:', window.MediaRecorder.prototype);
      const testFormats = [
        'video/webm', 
        'video/mp4', 
        'video/webm;codecs=vp9', 
        'video/webm;codecs=vp8',
        'video/webm;codecs=h264',
        'video/mp4;codecs=h264'
      ];
      testFormats.forEach(format => {
        console.log(`- ${format} supported:`, MediaRecorder.isTypeSupported(format));
      });
    } else {
      console.error('❌ MediaRecorder not available!');
      setBrowserSupported(false);
      toast.error('Browser not supported', {
        description: 'Please use Chrome, Firefox, or Edge for screen recording'
      });
    }
  }, []);

  // Check and request all permissions
  const requestAllPermissions = useCallback(async () => {
    setRecordingStatus('preparing');
    const newPermissions = { screen: false, camera: false, microphone: false };
    const streams = { screen: null as MediaStream | null, camera: null as MediaStream | null, audio: null as MediaStream | null };
    
    try {
      // Request screen capture (try with audio first, then without)
      console.log('🖥️ Requesting screen capture...');
      let screenCapture: MediaStream;
      
      try {
        // Try to get screen with system audio
        screenCapture = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          } as MediaTrackConstraints,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        console.log('✅ Screen capture with system audio granted');
      } catch (audioError) {
        console.warn('⚠️ System audio not available, trying video only:', audioError);
        // Fallback to video-only screen capture
        screenCapture = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          } as MediaTrackConstraints,
          audio: false
        });
        console.log('✅ Screen capture (video only) granted');
      }
      setScreenStream(screenCapture);
      streams.screen = screenCapture;
      newPermissions.screen = true;
      console.log('✅ Screen capture granted');
      
      // Wait a moment for stream to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Request camera
      console.log('📹 Requesting camera access...');
      try {
        const camera = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          }
        });
        setCameraStream(camera);
        streams.camera = camera;
        newPermissions.camera = true;
        console.log('✅ Camera access granted');
        // Wait for camera stream to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (cameraError) {
        console.warn('⚠️ Camera access denied:', cameraError);
        toast.warning('Camera access denied', {
          description: 'Recording will continue without camera feed'
        });
      }

      // Request microphone
      console.log('🎤 Requesting microphone access...');
      try {
        const microphone = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });
        setAudioStream(microphone);
        streams.audio = microphone;
        newPermissions.microphone = true;
        console.log('✅ Microphone access granted');
        // Wait for microphone stream to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (micError) {
        console.warn('⚠️ Microphone access denied:', micError);
        toast.warning('Microphone access denied', {
          description: 'Audio will be recorded from system only'
        });
      }

      setPermissions(newPermissions);
      return streams;

    } catch (error) {
      console.error('❌ Permission request failed:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Screen recording permission required';
      let errorDescription = 'Please allow screen capture to record your interview session';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Screen capture permission denied';
          errorDescription = 'Please click "Share" and select your screen to start recording';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No screen available for capture';
          errorDescription = 'Screen sharing is not available on this device';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Screen capture canceled';
          errorDescription = 'You need to select a screen to share for interview recording';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Screen capture not supported';
          errorDescription = 'Your browser does not support screen recording';
        } else {
          errorDescription = `Error: ${error.message}`;
        }
      }
      
      toast.error(errorMessage, { description: errorDescription });
      setRecordingStatus('idle');
      return null;
    }
  }, []);

  // Combine streams using direct references (bypassing state race condition)
  const combineStreamsFromRefs = useCallback(async (streamRefs: {
    screen: MediaStream | null;
    camera: MediaStream | null;
    audio: MediaStream | null;
  }) => {
    console.log('🔗 Attempting to combine streams with direct refs...', {
      screenStream: !!streamRefs.screen,
      cameraStream: !!streamRefs.camera, 
      audioStream: !!streamRefs.audio
    });
    
    if (!streamRefs.screen) {
      console.error('❌ No screen stream available for combination');
      return null;
    }

    try {
      // Ensure screen stream has active tracks
      const screenTracks = streamRefs.screen.getTracks();
      if (screenTracks.length === 0) {
        console.error('❌ Screen stream has no tracks');
        return null;
      }

      const combinedTracks = [...screenTracks];
      console.log('📺 Added screen tracks:', screenTracks.map(t => `${t.kind}:${t.label}`));
      
      // Add camera video track (picture-in-picture style)
      if (streamRefs.camera) {
        const cameraVideoTracks = streamRefs.camera.getVideoTracks();
        if (cameraVideoTracks.length > 0) {
          const cameraVideoTrack = cameraVideoTracks[0];
          if (cameraVideoTrack.readyState === 'live') {
            combinedTracks.push(cameraVideoTrack);
            console.log('📹 Added camera track:', cameraVideoTrack.label);
          } else {
            console.warn('⚠️ Camera track not ready:', cameraVideoTrack.readyState);
          }
        }
      }

      // Add microphone audio track (prefer microphone over system audio)
      if (streamRefs.audio) {
        const micAudioTracks = streamRefs.audio.getAudioTracks();
        if (micAudioTracks.length > 0) {
          const micAudioTrack = micAudioTracks[0];
          if (micAudioTrack.readyState === 'live') {
            // Remove system audio if microphone is available
            const systemAudioIndex = combinedTracks.findIndex(track => 
              track.kind === 'audio' && track.label.includes('System Audio')
            );
            if (systemAudioIndex !== -1) {
              combinedTracks.splice(systemAudioIndex, 1);
              console.log('🔄 Replaced system audio with microphone');
            }
            
            combinedTracks.push(micAudioTrack);
            console.log('🎤 Added microphone track:', micAudioTrack.label);
          } else {
            console.warn('⚠️ Microphone track not ready:', micAudioTrack.readyState);
          }
        }
      }

      console.log('🎬 Final combined tracks:', combinedTracks.map(t => `${t.kind}:${t.label}`));
      
      const combined = new MediaStream(combinedTracks);
      setCombinedStream(combined);
      
      // Set preview
      if (previewVideoRef.current && streamRefs.screen) {
        previewVideoRef.current.srcObject = streamRefs.screen;
        await previewVideoRef.current.play().catch(e => console.warn('Preview play failed:', e));
      }
      
      return combined;
    } catch (error) {
      console.error('❌ Error combining streams:', error);
      return null;
    }
  }, []);

  // Combine all streams with better error handling
  const combineStreams = useCallback(async () => {
    console.log('🔗 Attempting to combine streams...', {
      screenStream: !!screenStream,
      cameraStream: !!cameraStream, 
      audioStream: !!audioStream
    });
    
    if (!screenStream) {
      console.error('❌ No screen stream available for combination');
      return null;
    }

    try {
      // Ensure screen stream has active tracks
      const screenTracks = screenStream.getTracks();
      if (screenTracks.length === 0) {
        console.error('❌ Screen stream has no tracks');
        return null;
      }

      const combinedTracks = [...screenTracks];
      console.log('📺 Added screen tracks:', screenTracks.map(t => `${t.kind}:${t.label}`));
      
      // Add camera video track (picture-in-picture style)
      if (cameraStream) {
        const cameraVideoTracks = cameraStream.getVideoTracks();
        if (cameraVideoTracks.length > 0) {
          const cameraVideoTrack = cameraVideoTracks[0];
          if (cameraVideoTrack.readyState === 'live') {
            combinedTracks.push(cameraVideoTrack);
            console.log('📹 Added camera track:', cameraVideoTrack.label);
          } else {
            console.warn('⚠️ Camera track not ready:', cameraVideoTrack.readyState);
          }
        }
      }

      // Add microphone audio track (prefer microphone over system audio)
      if (audioStream) {
        const micAudioTracks = audioStream.getAudioTracks();
        if (micAudioTracks.length > 0) {
          const micAudioTrack = micAudioTracks[0];
          if (micAudioTrack.readyState === 'live') {
            // Remove system audio if microphone is available
            const systemAudioIndex = combinedTracks.findIndex(track => 
              track.kind === 'audio' && track.label.includes('System Audio')
            );
            if (systemAudioIndex !== -1) {
              combinedTracks.splice(systemAudioIndex, 1);
              console.log('🔄 Replaced system audio with microphone');
            }
            
            combinedTracks.push(micAudioTrack);
            console.log('🎤 Added microphone track:', micAudioTrack.label);
          } else {
            console.warn('⚠️ Microphone track not ready:', micAudioTrack.readyState);
          }
        }
      }

      console.log('🎬 Final combined tracks:', combinedTracks.map(t => `${t.kind}:${t.label}`));
      
      const combined = new MediaStream(combinedTracks);
      setCombinedStream(combined);
      
      // Set preview
      if (previewVideoRef.current && screenStream) {
        previewVideoRef.current.srcObject = screenStream;
        await previewVideoRef.current.play().catch(e => console.warn('Preview play failed:', e));
      }
      
      return combined;
    } catch (error) {
      console.error('❌ Error combining streams:', error);
      return null;
    }
  }, [screenStream, cameraStream, audioStream]);

  // Start recording
  const startRecording = async () => {
    if (recordingStatus !== 'idle') return;

    const streamRefs = await requestAllPermissions();
    if (!streamRefs) {
      console.error('❌ Failed to get permissions');
      return;
    }

    // Small delay to ensure streams are ready
    setTimeout(async () => {
      console.log('🎥 Starting stream combination...');
      let stream = await combineStreamsFromRefs(streamRefs);
      
      // Fallback: if combination fails, try screen-only recording
      if (!stream && streamRefs.screen) {
        console.warn('⚠️ Stream combination failed, falling back to screen-only recording');
        stream = streamRefs.screen;
        toast.warning('Using simplified recording', {
          description: 'Recording screen only due to compatibility issues'
        });
      }
      
      if (!stream) {
        console.error('❌ Failed to get any recording stream');
        toast.error('Recording not available', {
          description: 'Could not access screen recording'
        });
        setRecordingStatus('idle');
        cleanupStreams();
        return;
      }
      
      console.log('✅ Stream combination successful, tracks:', stream.getTracks().length);
      
      // Validate that we have at least a video track
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.error('❌ No video tracks in combined stream');
        toast.error('No video source available', {
          description: 'Screen capture is required for recording'
        });
        setRecordingStatus('idle');
        cleanupStreams();
        return;
      }

      try {
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
          throw new Error('MediaRecorder not supported in this browser');
        }
        
        // Choose best codec for screen recording with more fallback options
        let mimeType = 'video/webm';
        const codecOptions = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus', 
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/mp4;codecs=h264,aac',
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4',
          'video/webm'
        ];
        
        for (const codec of codecOptions) {
          if (MediaRecorder.isTypeSupported(codec)) {
            mimeType = codec;
            break;
          }
        }

        console.log('🎥 Starting recording with MIME type:', mimeType);
        console.log('🔍 Available stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`));

        // Create MediaRecorder with extensive fallback options
        let recorder: MediaRecorder | null = null;
        
        console.log('🎬 Attempting to create MediaRecorder...');
        console.log('- Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.label}`));
        console.log('- Selected MIME type:', mimeType);
        
        // Try multiple MediaRecorder creation strategies
        const strategies = [
          // Strategy 1: Full options
          () => {
            const options = {
              mimeType,
              videoBitsPerSecond: 5000000,
              audioBitsPerSecond: 128000
            };
            console.log('Trying strategy 1 (full options):', options);
            return new MediaRecorder(stream, options);
          },
          // Strategy 2: MIME type only
          () => {
            const options = { mimeType };
            console.log('Trying strategy 2 (MIME only):', options);
            return new MediaRecorder(stream, options);
          },
          // Strategy 3: No options
          () => {
            console.log('Trying strategy 3 (no options)');
            return new MediaRecorder(stream);
          },
          // Strategy 4: Force WebM
          () => {
            const options = { mimeType: 'video/webm' };
            console.log('Trying strategy 4 (force WebM):', options);
            return new MediaRecorder(stream, options);
          }
        ];
        
        let lastError: Error | null = null;
        for (let i = 0; i < strategies.length; i++) {
          try {
            recorder = strategies[i]();
            console.log(`✅ MediaRecorder created successfully with strategy ${i + 1}`);
            break;
          } catch (error) {
            lastError = error as Error;
            console.warn(`⚠️ Strategy ${i + 1} failed:`, error);
            if (i === strategies.length - 1) {
              console.error('❌ All MediaRecorder strategies failed');
              throw new Error(`MediaRecorder creation failed: ${lastError.message}`);
            }
          }
        }

        if (!recorder) {
          throw new Error('Failed to create MediaRecorder');
        }

        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
            console.log('📊 Recording chunk:', event.data.size, 'bytes');
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
        };

        recorder.onstop = () => {
          console.log('🛑 Recording stopped, creating blob...');
          setRecordingStatus('stopping');
          
          const blob = new Blob(chunks, { type: mimeType });
          console.log('💾 Recording blob created:', blob.size, 'bytes');
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          onRecordingReady(blob);
          setRecordingStatus('idle');
          
          // Cleanup streams
          cleanupStreams();
          
          toast.success('Screen recording completed!', {
            description: `Recorded ${formatDuration(recordingDuration)} of content`
          });
        };

        recorder.onerror = (event) => {
          console.error('❌ Recording error:', event);
          toast.error('Recording failed', {
            description: 'An error occurred during screen recording'
          });
          setRecordingStatus('idle');
          cleanupStreams();
        };

        setMediaRecorder(recorder);
        recorder.start(1000); // Collect data every second
        onStartRecording(stream);

      } catch (error) {
        console.error('❌ Failed to start recording:', error);
        
        let errorMessage = 'Recording failed to start';
        let errorDescription = 'Could not initialize screen recording';
        
        if (error instanceof Error) {
          if (error.message.includes('MediaRecorder')) {
            errorMessage = 'MediaRecorder not supported';
            errorDescription = 'Your browser version does not support video recording';
          } else if (error.message.includes('codec') || error.message.includes('MIME')) {
            errorMessage = 'Video format not supported';
            errorDescription = 'Try using a different browser (Chrome/Edge recommended)';
          } else {
            errorDescription = `Error: ${error.message}`;
          }
        }
        
        toast.error(errorMessage, { description: errorDescription });
        setRecordingStatus('idle');
        cleanupStreams();
      }
    }, 1000); // Increased timeout to ensure all streams are ready
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && recordingStatus === 'recording') {
      console.log('🛑 Stopping recording...');
      mediaRecorder.stop();
      onStopRecording();
    }
  };

  // Cleanup all streams
  const cleanupStreams = useCallback(() => {
    [screenStream, cameraStream, audioStream, combinedStream].forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🔌 Stopped track:', track.kind, track.label);
        });
      }
    });
    
    setScreenStream(null);
    setCameraStream(null);
    setAudioStream(null);
    setCombinedStream(null);
    setPermissions({ screen: false, camera: false, microphone: false });
    
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  }, [screenStream, cameraStream, audioStream, combinedStream]);

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
      cleanupStreams();
    };
  }, [cleanupStreams]);

  return (
    <Card className={`${className} border-2 ${recordingStatus === 'recording' ? 'border-red-300 shadow-red-100' : 'border-gray-300'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Screen + Video Recording
          </CardTitle>
          
          {recordingStatus === 'recording' && (
            <Badge variant="destructive" className="animate-pulse">
              REC {formatDuration(recordingDuration)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Browser Compatibility Warning */}
        {!browserSupported && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800 mb-2">Browser Not Supported</h3>
                <p className="text-sm text-red-700 mb-3">
                  Your current browser doesn't support screen recording. Please use one of these recommended browsers:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    🌐 <strong>Chrome</strong> (version 50+) - Recommended
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    🤊 <strong>Microsoft Edge</strong> (Chromium-based) - Recommended
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    🤊 <strong>Firefox</strong> (version 60+) - Good support
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <strong>Quick fix:</strong> Download Chrome from <code>chrome.google.com</code> and try again.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Permission Status */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className={`flex items-center gap-1 p-2 rounded ${permissions.screen ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
            <Monitor className="h-3 w-3" />
            Screen {permissions.screen ? '✓' : '✗'}
          </div>
          <div className={`flex items-center gap-1 p-2 rounded ${permissions.camera ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
            <Video className="h-3 w-3" />
            Camera {permissions.camera ? '✓' : '✗'}
          </div>
          <div className={`flex items-center gap-1 p-2 rounded ${permissions.microphone ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
            <Mic className="h-3 w-3" />
            Audio {permissions.microphone ? '✓' : '✗'}
          </div>
        </div>

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
                <MonitorSpeaker className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Screen Recording Ready</p>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          {recordingStatus === 'idle' && (
            <div className="text-gray-600">
              <Settings className="h-4 w-4 inline mr-1" />
              Ready to record screen + camera + audio
            </div>
          )}
          {recordingStatus === 'preparing' && (
            <div className="text-blue-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Requesting permissions...
            </div>
          )}
          {recordingStatus === 'recording' && (
            <div className="text-red-600 font-medium">
              <div className="w-3 h-3 bg-red-500 rounded-full inline-block animate-pulse mr-2"></div>
              Recording in progress - {formatDuration(recordingDuration)}
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
        {recordingStatus === 'idle' && browserSupported && (
          <div className="flex justify-center gap-2">
            <Button 
              onClick={startRecording}
              className="bg-red-600 hover:bg-red-700"
              size="sm"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Start Screen Recording
            </Button>
          </div>
        )}
        
        {!browserSupported && (
          <div className="flex justify-center">
            <Button disabled size="sm" className="opacity-50">
              <AlertCircle className="h-4 w-4 mr-2" />
              Browser Not Compatible
            </Button>
          </div>
        )}

        {/* Recording Info */}
        <div className="text-xs text-gray-500 text-center p-2 bg-blue-50 rounded">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Records your screen, camera feed (picture-in-picture), and microphone audio
        </div>
      </CardContent>
    </Card>
  );
};