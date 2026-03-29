import { useEffect } from 'react';
import { toast } from 'sonner';

interface SecurityMonitorProps {
    enabled?: boolean;
    interviewId: string;
    onViolation?: (type: string) => void;
}

/**
 * Security monitoring component to prevent cheating during interviews
 * - Disables right-click
 * - Detects tab switching
 * - Detects window/app switching
 */
export const SecurityMonitor: React.FC<SecurityMonitorProps> = ({
    enabled = true,
    interviewId,
    onViolation
}) => {
    useEffect(() => {
        if (!enabled) return;

        let violationCount = 0;
        const MAX_VIOLATIONS = 5;

        const logViolation = (type: string, message: string) => {
            violationCount++;
            console.warn(`🚨 Security Violation #${violationCount}: ${type}`);

            // Notify parent component
            if (onViolation) {
                onViolation(type);
            }

            // Store in sessionStorage for report
            const violations = JSON.parse(sessionStorage.getItem(`violations_${interviewId}`) || '[]');
            violations.push({
                type,
                timestamp: new Date().toISOString(),
                message
            });
            sessionStorage.setItem(`violations_${interviewId}`, JSON.stringify(violations));

            // Show warning
            toast.error('Security Violation Detected!', {
                description: message,
                duration: 3000
            });

            // Auto-submit if too many violations
            if (violationCount >= MAX_VIOLATIONS) {
                toast.error('Too Many Violations!', {
                    description: 'Test will be auto-submitted due to suspicious activity.',
                    duration: 5000
                });
                // Could trigger auto-submit here
            }
        };

        // 1. Disable right-click (context menu)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logViolation('right_click', 'Right-click is not allowed during the interview.');
            return false;
        };

        // 2. Detect tab switching
        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation('tab_switch', 'Tab switching detected! Please stay on the interview page.');
            }
        };

        // 3. Detect window/app switching (window blur)
        const handleWindowBlur = () => {
            logViolation('window_blur', 'Window switching detected! Please stay focused on the interview.');
        };

        // 4. Detect keyboard shortcuts that might be suspicious
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent Ctrl+C, Ctrl+V (copy/paste)
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
                e.preventDefault();
                toast.warning('Copy/Paste Disabled', {
                    description: 'Copy and paste operations are restricted during the interview.'
                });
                return false;
            }

            // Prevent F12 (DevTools)
            if (e.key === 'F12') {
                e.preventDefault();
                logViolation('devtools_attempt', 'Attempted to open developer tools.');
                return false;
            }

            // Prevent Ctrl+Shift+I (DevTools)
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                logViolation('devtools_attempt', 'Attempted to open developer tools.');
                return false;
            }
        };

        // Add event listeners
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('keydown', handleKeyDown);

        // Show initial warning toast
        toast.info('Security Monitoring Active', {
            description: 'Right-click, tab switching, and other actions are monitored.',
            duration: 5000
        });

        console.log('🔒 Security monitoring enabled for interview:', interviewId);

        // Cleanup
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('keydown', handleKeyDown);
            console.log('🔓 Security monitoring disabled');
        };
    }, [enabled, interviewId, onViolation]);

    // This component doesn't render anything visible
    return null;
};

/**
 * Get security violations for an interview
 */
export const getSecurityViolations = (interviewId: string) => {
    const violations = sessionStorage.getItem(`violations_${interviewId}`);
    return violations ? JSON.parse(violations) : [];
};

/**
 * Clear security violations for an interview
 */
export const clearSecurityViolations = (interviewId: string) => {
    sessionStorage.removeItem(`violations_${interviewId}`);
};
