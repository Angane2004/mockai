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
    maxViolations = 2, // Changed to 2: warning at 1, terminate at 2
    enableWarnings = true,
    strictMode = true // Changed to true for stricter monitoring
  } = options;

  const [violations, setViolations] = useState({
    tabSwitches: 0,
    visibilityChanges: 0,
    focusLoss: 0,
    contextMenu: 0,
    keyboardShortcuts: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

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
          toast.warning(warningMessages[type], {
            description: "⚠️ WARNING: One more violation will end your interview!"
          });
        } else if (totalViolations >= maxViolations) {
          toast.error("❌ Interview Terminated", {
            description: "Multiple cheating violations detected. Interview session ended.",
            duration: 10000
          });
          
          // Trigger interview termination
          setTimeout(() => {
            if (onMaxViolationsReached) {
              onMaxViolationsReached();
            }
          }, 2000);
        }
      }

      // Call violation callback immediately with updated data
      const violationData = { count: newCount, totalViolations, details, timestamp: new Date() };
      console.log(`📡 Calling onViolation callback with:`, violationData);
      onViolation?.(type, violationData);
      onTabSwitch?.(totalViolations);
      
      return newViolations;
    });
  }, [maxViolations, enableWarnings, strictMode, onViolation, onTabSwitch, onMaxViolationsReached]);

  // Tab/Window visibility detection with improved logic
  const handleVisibilityChange = useCallback(() => {
    if (!isMonitoring) return;
    
    if (document.hidden) {
      console.log('👁️ Tab became hidden, starting violation timer...');
      
      // Shorter delay for faster detection but still avoiding false positives
      const timeoutId = setTimeout(() => {
        if (document.hidden) {
          // Only log if tab is still hidden after 1.5 seconds
          console.log('🚨 Confirmed tab switch - logging violation');
          logViolation('tabSwitches', { reason: 'tab_hidden', duration: 1500 });
        }
      }, 1500);
      
      // Clear timeout if visibility returns quickly
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

  // Window focus detection with debouncing to avoid false positives
  const handleFocusChange = useCallback((event: FocusEvent) => {
    if (!isMonitoring) return;

    if (event.type === 'blur') {
      // Add a delay to avoid false positives from legitimate interactions (like clicking address bar)
      const timeoutId = setTimeout(() => {
        if (!document.hasFocus()) {
          // Only log if window is still blurred after 3 seconds (likely intentional navigation away)
          logViolation('focusLoss', { reason: 'window_blur', duration: 3000 });
        }
      }, 3000);
      
      // Clear timeout if focus returns quickly
      const handleFocusReturn = () => {
        if (document.hasFocus()) {
          clearTimeout(timeoutId);
          window.removeEventListener('focus', handleFocusReturn);
        }
      };
      
      window.addEventListener('focus', handleFocusReturn, { once: true });
    }
  }, [isMonitoring, logViolation]);

  // Context menu (right-click) detection
  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (!isMonitoring) return;

    event.preventDefault();
    logViolation('contextMenu', { x: event.clientX, y: event.clientY });
  }, [isMonitoring, logViolation]);

  // Keyboard shortcut detection
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isMonitoring) return;

    // Detect common cheating shortcuts
    const prohibitedShortcuts = [
      // Alt+Tab (Windows task switching)
      { alt: true, key: 'Tab' },
      // Ctrl+Tab (Browser tab switching)
      { ctrl: true, key: 'Tab' },
      // Ctrl+Shift+Tab (Reverse browser tab switching)
      { ctrl: true, shift: true, key: 'Tab' },
      // Ctrl+T (New tab)
      { ctrl: true, key: 't' },
      // Ctrl+W (Close tab)
      { ctrl: true, key: 'w' },
      // Ctrl+N (New window)
      { ctrl: true, key: 'n' },
      // F5 (Refresh)
      { key: 'F5' },
      // Ctrl+R (Refresh)
      { ctrl: true, key: 'r' },
      // F12 (Developer tools)
      { key: 'F12' },
      // Ctrl+Shift+I (Developer tools)
      { ctrl: true, shift: true, key: 'I' },
      // Ctrl+U (View source)
      { ctrl: true, key: 'u' },
      // Ctrl+Shift+J (Console)
      { ctrl: true, shift: true, key: 'J' },
      // Ctrl+Shift+C (Inspector)
      { ctrl: true, shift: true, key: 'C' }
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

  // Page unload/beforeunload detection
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (!isMonitoring) return;

    const message = "Are you sure you want to leave? Your interview progress will be lost.";
    event.preventDefault();
    event.returnValue = message;
    return message;
  }, [isMonitoring]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    setStartTime(new Date());
    
    if (enableWarnings) {
      toast.success("🛡️ Anti-cheating monitoring activated", {
        description: "Tab switching and suspicious activity will be detected."
      });
    }
  }, [enableWarnings]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (enableWarnings) {
      toast.info("🛡️ Anti-cheating monitoring stopped", {
        description: `Session duration: ${startTime ? Math.round((Date.now() - startTime.getTime()) / 1000 / 60) : 0} minutes`
      });
    }
  }, [enableWarnings, startTime]);

  const resetViolations = useCallback(() => {
    setViolations({
      tabSwitches: 0,
      visibilityChanges: 0,
      focusLoss: 0,
      contextMenu: 0,
      keyboardShortcuts: 0
    });
  }, []);

  // Attach event listeners
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

  const getTotalViolations = useCallback(() => {
    return Object.values(violations).reduce((sum, count) => sum + count, 0);
  }, [violations]);

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