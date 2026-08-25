import { useEffect } from 'react';

export const DevToolsProtection = () => {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return;

    let devtools = { open: false, orientation: null };
    const threshold = 160;

    // Detect developer tools
    const detectDevTools = () => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        if (!devtools.open) {
          devtools.open = true;
          // Clear console and show warning
          console.clear();
          console.log(
            '%cStop!',
            'color: red; font-size: 50px; font-weight: bold;'
          );
          console.log(
            '%cThis is a browser feature intended for developers. If someone told you to copy-paste something here, it is a scam and will give them access to your account.',
            'color: red; font-size: 16px;'
          );
        }
      } else {
        devtools.open = false;
      }
    };

    // Disable right-click context menu
    const disableContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const disableKeyboardShortcuts = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
      }
    };

    // Disable text selection
    const disableSelection = () => {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';
    };

    // Detect debugger
    const detectDebugger = () => {
      const start = performance.now();
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        // Debugger was likely open
        console.clear();
        window.location.reload();
      }
    };

    // Set up intervals and event listeners
    const devToolsInterval = setInterval(detectDevTools, 500);
    const debuggerInterval = setInterval(detectDebugger, 1000);

    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('keydown', disableKeyboardShortcuts);
    
    // Apply selection disable
    disableSelection();

    // Cleanup
    return () => {
      clearInterval(devToolsInterval);
      clearInterval(debuggerInterval);
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', disableKeyboardShortcuts);
      
      // Re-enable selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
    };
  }, []);

  return null; // This component doesn't render anything
};