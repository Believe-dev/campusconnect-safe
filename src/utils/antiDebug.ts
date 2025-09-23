// Anti-debugging and source protection utilities

export const initAntiDebug = () => {
  if (process.env.NODE_ENV !== 'production') return;

  // Disable console methods
  const noop = () => {};
  const methods = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml', 'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];
  
  methods.forEach(method => {
    (console as any)[method] = noop;
  });

  // Detect and prevent debugging
  let devtools = { open: false };
  
  const detectDevTools = () => {
    const threshold = 160;
    if (
      window.outerHeight - window.innerHeight > threshold ||
      window.outerWidth - window.innerWidth > threshold
    ) {
      if (!devtools.open) {
        devtools.open = true;
        // Redirect or reload page
        window.location.href = 'about:blank';
      }
    } else {
      devtools.open = false;
    }
  };

  // Check for debugging every 100ms
  setInterval(detectDevTools, 100);

  // Detect debugger statement
  const detectDebugger = () => {
    const start = performance.now();
    debugger;
    const end = performance.now();
    if (end - start > 100) {
      // Debugger detected, redirect
      window.location.href = 'about:blank';
    }
  };

  setInterval(detectDebugger, 1000);

  // Disable right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable key combinations
  document.addEventListener('keydown', (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
    if (
      e.keyCode === 123 ||
      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
      (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83))
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Disable text selection
  document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable drag
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  // Clear console periodically
  setInterval(() => {
    console.clear();
  }, 1000);

  // Obfuscate global variables
  Object.defineProperty(window, 'console', {
    get: () => ({}),
    set: () => {},
  });
};

// Initialize on load
if (typeof window !== 'undefined') {
  initAntiDebug();
}