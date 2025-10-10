import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2,
  SkipBack,
  SkipForward,
  RotateCcw,
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface InterviewVideoViewerProps {
  recordingData: string; // Base64 data or URL
  recordingType?: string;
  interviewTitle?: string;
  interviewDate?: string;
  onError?: (error: string) => void;
}

export const InterviewVideoViewer: React.FC<InterviewVideoViewerProps> = ({
  recordingData,
  recordingType = 'video/webm',
  interviewTitle = 'Interview Recording',
  interviewDate,
  onError
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoUrl, setVideoUrl] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Convert base64 to blob URL
  const convertToVideoUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      let url: string;
      
      if (recordingData.startsWith('data:')) {
        // Already a data URL
        url = recordingData;
      } else if (recordingData.startsWith('blob:')) {
        // Already a blob URL
        url = recordingData;
      } else if (recordingData.startsWith('http')) {
        // HTTP URL
        url = recordingData;
      } else {
        // Assume base64, convert to blob URL
        try {
          const byteString = atob(recordingData.split(',')[1] || recordingData);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([ab], { type: recordingType });
          url = URL.createObjectURL(blob);
        } catch (decodeError) {
          throw new Error('Invalid base64 recording data');
        }
      }

      setVideoUrl(url);
      
      // Test if video can be loaded
      if (videoRef.current) {
        videoRef.current.src = url;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load video';
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error('Video loading failed', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [recordingData, recordingType, onError]);

  // Initialize video
  useEffect(() => {
    if (recordingData) {
      convertToVideoUrl();
    }
    
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [recordingData, convertToVideoUrl]);

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const errorMessage = video.error 
      ? `Video error (${video.error.code}): ${video.error.message}`
      : 'Unknown video playback error';
    
    setError(errorMessage);
    setIsLoading(false);
    onError?.(errorMessage);
    
    toast.error('Video playback error', {
      description: errorMessage
    });
  }, [onError]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current || error) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => {
        console.error('Play error:', err);
        toast.error('Playback failed', {
          description: 'Unable to start video playback'
        });
      });
    }
  }, [isPlaying, error]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const changeVolume = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    
    const vol = Math.max(0, Math.min(100, newVolume)) / 100;
    videoRef.current.volume = vol;
    setVolume(newVolume);
    
    if (vol === 0 && !isMuted) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else if (vol > 0 && isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  }, [isMuted]);

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current || !duration) return;
    
    const seekTime = Math.max(0, Math.min(duration, time));
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, [duration]);

  const skipBackward = useCallback(() => {
    seekTo(currentTime - 10);
  }, [currentTime, seekTo]);

  const skipForward = useCallback(() => {
    seekTo(currentTime + 10);
  }, [currentTime, seekTo]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  const downloadVideo = useCallback(() => {
    if (!videoUrl) return;

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${interviewTitle}-${interviewDate || new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success('Download started', {
      description: 'Video file is being downloaded'
    });
  }, [videoUrl, interviewTitle, interviewDate]);

  const resetVideo = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    seekTo(newTime);
  }, [duration, seekTo]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!recordingData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>No recording data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              {interviewTitle}
            </CardTitle>
            {interviewDate && (
              <p className="text-sm text-gray-500 mt-1">
                Recorded on {new Date(interviewDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {formatTime(duration)}
            </Badge>
            <Badge variant="outline">
              {playbackRate}x
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-64 bg-gray-900 rounded-lg object-cover"
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            onError={handleError}
          />
          
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded-lg">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading video...</p>
              </div>
            </div>
          )}
          
          {/* Error Overlay */}
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75 rounded-lg">
              <div className="text-center text-white">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Video playback error</p>
                <p className="text-xs opacity-75 mt-1">{error}</p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={convertToVideoUrl}
                  className="mt-2"
                >
                  Retry Loading
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="w-full h-2 bg-gray-200 rounded-full mt-4 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-200"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={skipBackward}
              disabled={!videoUrl || !!error}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayPause}
              disabled={!videoUrl || !!error}
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
              onClick={skipForward}
              disabled={!videoUrl || !!error}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetVideo}
              disabled={!videoUrl || !!error}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMute}
              disabled={!videoUrl || !!error}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            <select
              value={playbackRate}
              onChange={(e) => changePlaybackRate(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
              disabled={!videoUrl || !!error}
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              disabled={!videoUrl || !!error}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={downloadVideo}
              disabled={!videoUrl || !!error}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Volume Control */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">Volume:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="flex-1 h-2"
            disabled={!videoUrl || !!error}
          />
          <span className="text-xs text-gray-500 w-8">{volume}%</span>
        </div>
      </CardContent>
    </Card>
  );
};