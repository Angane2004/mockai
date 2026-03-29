import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImprovedTimebarProps {
    elapsedSeconds: number;
    totalSeconds: number;
    variant?: 'default' | 'aptitude' | 'coding';
}

export const ImprovedTimebar = ({ elapsedSeconds, totalSeconds, variant = 'default' }: ImprovedTimebarProps) => {
    const [showWarning, setShowWarning] = useState(false);

    const remainingSeconds = totalSeconds - elapsedSeconds;
    const progress = (elapsedSeconds / totalSeconds) * 100;

    // Calculate time remaining
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    // Warning at 25% time remaining
    const isLowTime = remainingSeconds <= totalSeconds * 0.25;
    const isCriticalTime = remainingSeconds <= 60; // Last minute

    // Pulse effect for low time
    useEffect(() => {
        if (isLowTime) {
            const interval = setInterval(() => {
                setShowWarning(prev => !prev);
            }, 500);
            return () => clearInterval(interval);
        }
    }, [isLowTime]);

    // Color scheme based on variant
    const getColorScheme = () => {
        if (isCriticalTime) {
            return {
                bar: 'from-red-500 via-red-600 to-red-700',
                glow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
                text: 'text-red-600',
                badge: 'bg-red-100 border-red-300 text-red-700'
            };
        }
        if (isLowTime) {
            return {
                bar: 'from-orange-500 via-orange-600 to-orange-700',
                glow: 'shadow-[0_0_15px_rgba(249,115,22,0.4)]',
                text: 'text-orange-600',
                badge: 'bg-orange-100 border-orange-300 text-orange-700'
            };
        }

        // Default colors based on variant
        switch (variant) {
            case 'aptitude':
                return {
                    bar: 'from-purple-500 via-purple-600 to-indigo-600',
                    glow: 'shadow-[0_0_15px_rgba(147,51,234,0.3)]',
                    text: 'text-purple-700',
                    badge: 'bg-purple-100 border-purple-300 text-purple-700'
                };
            case 'coding':
                return {
                    bar: 'from-blue-500 via-blue-600 to-cyan-600',
                    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
                    text: 'text-blue-700',
                    badge: 'bg-blue-100 border-blue-300 text-blue-700'
                };
            default:
                return {
                    bar: 'from-green-500 via-green-600 to-emerald-600',
                    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
                    text: 'text-green-700',
                    badge: 'bg-green-100 border-green-300 text-green-700'
                };
        }
    };

    const colors = getColorScheme();

    // Format time string
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Format elapsed time
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedSecs = elapsedSeconds % 60;
    const elapsedString = `${elapsedMinutes.toString().padStart(2, '0')}:${elapsedSecs.toString().padStart(2, '0')}`;

    // Total time string
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalSecs = totalSeconds % 60;
    const totalString = `${totalMinutes.toString().padStart(2, '0')}:${totalSecs.toString().padStart(2, '0')}`;

    return (
        <div className="w-full space-y-3 animate-fade-in">
            {/* Time Display Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-2 rounded-full transition-all duration-300",
                        colors.badge,
                        isCriticalTime && showWarning && "scale-110"
                    )}>
                        {isCriticalTime ? (
                            <AlertCircle className={cn("h-5 w-5", colors.text, "animate-pulse")} />
                        ) : (
                            <Clock className={cn("h-5 w-5", colors.text)} />
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Elapsed</p>
                        <p className={cn("font-mono font-bold text-lg", colors.text)}>
                            {elapsedString}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium">Remaining</p>
                    <p className={cn(
                        "font-mono font-bold text-2xl transition-all duration-300",
                        colors.text,
                        isCriticalTime && "animate-pulse"
                    )}>
                        {timeString}
                    </p>
                </div>

                <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500 font-medium">Total</p>
                    <p className="font-mono text-sm text-gray-600">
                        ~{totalString}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
                {/* Background track */}
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    {/* Filled progress with gradient */}
                    <div
                        className={cn(
                            "h-full bg-gradient-to-r transition-all duration-1000 ease-linear rounded-full",
                            colors.bar,
                            colors.glow
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    >
                        {/* Shimmer effect */}
                        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                </div>

                {/* Milestone markers */}
                <div className="absolute top-0 w-full h-full flex justify-between px-1">
                    {[25, 50, 75].map((milestone) => (
                        <div
                            key={milestone}
                            className={cn(
                                "w-0.5 h-full bg-gray-400/50 transition-opacity duration-300",
                                progress >= milestone && "opacity-0"
                            )}
                            style={{ marginLeft: `${milestone}%` }}
                        />
                    ))}
                </div>
            </div>

            {/* Warning message */}
            {isCriticalTime && (
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-300",
                    "bg-red-50 border-red-300",
                    showWarning && "bg-red-100 border-red-400"
                )}>
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-red-700">
                        Time running out! Submit your answers soon.
                    </p>
                </div>
            )}
        </div>
    );
};

// Add shimmer animation to index.css
/*
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
*/
