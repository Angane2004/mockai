import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, Pause, Square, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface InterviewTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  autoStart?: boolean;
  className?: string;
}

export const InterviewTimer: React.FC<InterviewTimerProps> = ({
  durationMinutes,
  onTimeUp,
  autoStart = false,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getTimeColor = useCallback((seconds: number) => {
    const totalSeconds = durationMinutes * 60;
    const percentage = (seconds / totalSeconds) * 100;
    
    if (percentage <= 10) return 'text-red-600 animate-pulse';
    if (percentage <= 25) return 'text-orange-600';
    if (percentage <= 50) return 'text-yellow-600';
    return 'text-green-600';
  }, [durationMinutes]);

  const getProgressColor = useCallback((seconds: number) => {
    const totalSeconds = durationMinutes * 60;
    const percentage = (seconds / totalSeconds) * 100;
    
    if (percentage <= 10) return 'bg-red-500';
    if (percentage <= 25) return 'bg-orange-500';
    if (percentage <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [durationMinutes]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Show warnings
          if (newTime === 300) { // 5 minutes left
            setShowWarning(true);
            toast.warning('5 minutes remaining! ⏰', {
              description: 'You have 5 minutes left to complete the interview',
              duration: 5000,
            });
          } else if (newTime === 120) { // 2 minutes left
            toast.warning('2 minutes remaining! ⚠️', {
              description: 'Interview will end automatically in 2 minutes',
              duration: 5000,
            });
          } else if (newTime === 30) { // 30 seconds left
            toast.error('30 seconds remaining! 🚨', {
              description: 'Interview ending very soon!',
              duration: 10000,
            });
          }

          if (newTime <= 0) {
            setIsRunning(false);
            toast.error('Time\'s up! Interview ended automatically 🕐', {
              description: 'Your interview has been completed and feedback is being generated',
              duration: 5000,
            });
            onTimeUp();
            return 0;
          }

          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, isPaused, timeLeft, onTimeUp]);

  const startTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    setIsPaused(true);
  };

  const resumeTimer = () => {
    setIsPaused(false);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(durationMinutes * 60);
  };

  const totalSeconds = durationMinutes * 60;
  const progressPercentage = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <Card className={`${className} border-2 ${timeLeft <= 300 ? 'border-red-300 shadow-red-100' : 'border-blue-300 shadow-blue-100'} shadow-lg`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${getTimeColor(timeLeft)}`} />
            <span className="font-semibold text-gray-700">Interview Timer</span>
          </div>
          
          {showWarning && timeLeft <= 300 && (
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
          )}
        </div>

        {/* Time Display */}
        <div className="text-center mb-4">
          <div className={`text-3xl font-bold ${getTimeColor(timeLeft)} transition-colors`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {Math.ceil(timeLeft / 60)} minutes remaining
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor(timeLeft)}`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-2">
          {!isRunning && (
            <Button
              onClick={startTimer}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}

          {isRunning && !isPaused && (
            <Button
              onClick={pauseTimer}
              size="sm"
              variant="outline"
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}

          {isRunning && isPaused && (
            <Button
              onClick={resumeTimer}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}

          <Button
            onClick={stopTimer}
            size="sm"
            variant="destructive"
            disabled={!isRunning && timeLeft === totalSeconds}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </div>

        {/* Status */}
        <div className="text-center mt-3 text-sm">
          {!isRunning && timeLeft === totalSeconds && (
            <span className="text-gray-500">Ready to start</span>
          )}
          {isRunning && !isPaused && (
            <span className="text-green-600">• Interview in progress</span>
          )}
          {isPaused && (
            <span className="text-yellow-600">⏸️ Interview paused</span>
          )}
          {timeLeft === 0 && (
            <span className="text-red-600">⏰ Time expired</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};