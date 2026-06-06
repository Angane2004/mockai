// useAntiCheating.ts
// Custom hook that monitors the user during an interview to detect cheating.
// It tracks tab switches, focus loss, right-clicks, and blocked keyboard shortcuts.
// At 1 violation → warning toast. At 2 violations → interview is terminated.

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface AntiCheatingOptions {
  onTabSwitch?: (count: number) => void;
  onViolation?: (type: string, details: any) => void;
  onMaxViolationsReached?: () => void;
  maxViolations?: number;
  enableWarnings?: boolean;
  strictMode?: boolean;
}

export const useAntiCheating = (options: AntiCheatingOptions = {}) => {
  const {
    onTabSwitch,
    onViolation,
    onMaxViolationsReached,
    maxViolations = 2, // 1 = warning, 2 = terminate
    enableWarnings = true,
    strictMode = true
  } = options;

  // Tracks how many times each type of violation has occurred
  const [violations, setViolations] = useState({
    tabSwitches: 0,
    visibilityChanges: 0,
    focusLoss: 0,
    contextMenu: 0,
    keyboardShortcuts: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Called every time a violation is detected — increments the count and shows a toast
  const logViolation = useCallback((type: keyof typeof violations, details?: any) => {
    console.log(`👁️ BEFORE violation - Current violations:`, violations);
    
    setViolations(prev => {
      const newCount = prev[type] + 1;
      const newViolations = { ...prev, [type]: newCount };
      const totalViolations = Object.values(newViolations).reduce((sum, count) => sum + count, 0);

      console.warn(`🚨 Anti-cheating violation: ${type}`, {
        type,
        count: newCount,
        totalViolations,
        details,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📊 AFTER violation - New violations:`, newViolations);

      if (enableWarnings) {
        const warningMessages = {
          tabSwitches: `⚠️ Tab switch detected! (${totalViolations}/${maxViolations})`,
          visibilityChanges: `⚠️ Window hidden detected! (${totalViolations}/${maxViolations})`,
          focusLoss: `⚠️ Browser focus lost for extended time! (${totalViolations}/${maxViolations})`,
          contextMenu: `⚠️ Right-click detected! (${totalViolations}/${maxViolations})`,
          keyboardShortcuts: `⚠️ Prohibited shortcut! (${totalViolations}/${maxViolations})`
        };

        if (totalViolations === 1) {
          // First offence — warn the user
          toast.warning(warningMessages[type], {
            description: "⚠️ WARNING: One more violation will end your interview!"
          });
        } else if (totalViolations >= maxViolations) {
          // Second offence — end the interview
          toast.error("❌ Interview Terminated", {
            description: "Multiple cheating violations detected. Interview session ended.",
            duration: 10000
          });
          
          // Small delay so the error toast is visible before the interview closes
          setTimeout(() => {
            if (onMaxViolationsReached) {
              onMaxViolationsReached();
            }
          }, 2000);
        }
      }

      const violationData = { count: newCount, totalViolations, details, timestamp: new Date() };
      console.log(`📡 Calling onViolation callback with:`, violationData);
      onViolation?.(type, violationData);
      onTabSwitch?.(totalViolations);
      
      return newViolations;
    });
  }, [maxViolations, enableWarnings, strictMode, onViolation, onTabSwitch, onMaxViolationsReached]);

  // Fires when the user switches to another tab
  // Uses a 1.5s delay to avoid false positives (e.g. quick alt-tab back)
  const handleVisibilityChange = useCallback(() => {
    if (!isMonitoring) return;
    
    if (document.hidden) {
      console.log('👁️ Tab became hidden, starting violation timer...');
      
      const timeoutId = setTimeout(() => {
        if (document.hidden) {
          console.log('🚨 Confirmed tab switch - logging violation');
          logViolation('tabSwitches', { reason: 'tab_hidden', duration: 1500 });
        }
      }, 1500);
      
      const handleVisibilityReturn = () => {
        if (!document.hidden) {
          console.log('👁️ Tab became visible again - clearing violation timer');
          clearTimeout(timeoutId);
          document.removeEventListener('visibilitychange', handleVisibilityReturn);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityReturn);
    }
  }, [isMonitoring, logViolation]);

  // Fires when the browser window loses focus
  // 3s delay to avoid flagging things like clicking the address bar
  const handleFocusChange = useCallback((event: FocusEvent) => {
    if (!isMonitoring) return;

    if (event.type === 'blur') {
      const timeoutId = setTimeout(() => {
        if (!document.hasFocus()) {
          logViolation('focusLoss', { reason: 'window_blur', duration: 3000 });
        }
      }, 3000);
      
      const handleFocusReturn = () => {
        if (document.hasFocus()) {
          clearTimeout(timeoutId);
          window.removeEventListener('focus', handleFocusReturn);
        }
      };
      
      window.addEventListener('focus', handleFocusReturn, { once: true });
    }
  }, [isMonitoring, logViolation]);

  // Blocks right-click (context menu) during the interview
  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (!isMonitoring) return;

    event.preventDefault();
    logViolation('contextMenu', { x: event.clientX, y: event.clientY });
  }, [isMonitoring, logViolation]);

  // Blocks keyboard shortcuts that could let the user navigate away or open dev tools
  // e.g. Alt+Tab, Ctrl+Tab, F12, Ctrl+U, Ctrl+Shift+I etc.
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isMonitoring) return;

    const prohibitedShortcuts = [
      { alt: true, key: 'Tab' },           // Alt+Tab — task switch
      { ctrl: true, key: 'Tab' },           // Ctrl+Tab — browser tab switch
      { ctrl: true, shift: true, key: 'Tab' },
      { ctrl: true, key: 't' },             // Ctrl+T — new tab
      { ctrl: true, key: 'w' },             // Ctrl+W — close tab
      { ctrl: true, key: 'n' },             // Ctrl+N — new window
      { key: 'F5' },                        // F5 — refresh
      { ctrl: true, key: 'r' },             // Ctrl+R — refresh
      { key: 'F12' },                       // F12 — dev tools
      { ctrl: true, shift: true, key: 'I' },// Ctrl+Shift+I — dev tools
      { ctrl: true, key: 'u' },             // Ctrl+U — view source
      { ctrl: true, shift: true, key: 'J' },// Ctrl+Shift+J — console
      { ctrl: true, shift: true, key: 'C' } // Ctrl+Shift+C — inspector
    ];

    const isProhibited = prohibitedShortcuts.some(shortcut => {
      return (
        (!shortcut.ctrl || event.ctrlKey) &&
        (!shortcut.alt || event.altKey) &&
        (!shortcut.shift || event.shiftKey) &&
        event.key.toLowerCase() === shortcut.key.toLowerCase()
      );
    });

    if (isProhibited) {
      event.preventDefault();
      logViolation('keyboardShortcuts', { 
        key: event.key, 
        ctrl: event.ctrlKey, 
        alt: event.altKey, 
        shift: event.shiftKey 
      });
    }
  }, [isMonitoring, logViolation]);

  // Shows a browser dialog if the user tries to close/refresh the page mid-interview
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (!isMonitoring) return;

    const message = "Are you sure you want to leave? Your interview progress will be lost.";
    event.preventDefault();
    event.returnValue = message;
    return message;
  }, [isMonitoring]);

  // Call this to start monitoring — attaches all event listeners
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    setStartTime(new Date());
    
    if (enableWarnings) {
      toast.success("🛡️ Anti-cheating monitoring activated", {
        description: "Tab switching and suspicious activity will be detected."
      });
    }
  }, [enableWarnings]);

  // Call this to stop monitoring — event listeners get cleaned up via useEffect
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (enableWarnings) {
      toast.info("🛡️ Anti-cheating monitoring stopped", {
        description: `Session duration: ${startTime ? Math.round((Date.now() - startTime.getTime()) / 1000 / 60) : 0} minutes`
      });
    }
  }, [enableWarnings, startTime]);

  // Resets all violation counters back to zero
  const resetViolations = useCallback(() => {
    setViolations({
      tabSwitches: 0,
      visibilityChanges: 0,
      focusLoss: 0,
      contextMenu: 0,
      keyboardShortcuts: 0
    });
  }, []);

  // Attach all event listeners when monitoring starts, remove them when it stops
  useEffect(() => {
    if (isMonitoring) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleFocusChange);
      window.addEventListener('focus', handleFocusChange);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleFocusChange);
        window.removeEventListener('focus', handleFocusChange);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isMonitoring, handleVisibilityChange, handleFocusChange, handleContextMenu, handleKeyDown, handleBeforeUnload]);

  // Returns the total number of violations across all types
  const getTotalViolations = useCallback(() => {
    return Object.values(violations).reduce((sum, count) => sum + count, 0);
  }, [violations]);

  // Returns a summary object — used to save integrity data at the end of the interview
  const getViolationSummary = useCallback(() => {
    const total = getTotalViolations();
    const duration = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000 / 60) : 0;
    
    return {
      total,
      duration,
      breakdown: violations,
      riskLevel: total === 0 ? 'low' : total <= 2 ? 'medium' : 'high',
      timestamp: new Date()
    };
  }, [violations, getTotalViolations, startTime]);

  return {
    violations,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetViolations,
    getTotalViolations,
    getViolationSummary,
    startTime
  };
};