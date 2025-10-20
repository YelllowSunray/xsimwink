/**
 * Console filter to suppress non-error informational messages from TensorFlow Lite
 * 
 * TensorFlow Lite (used by MediaPipe) outputs INFO messages that Next.js captures
 * as console errors. This filter suppresses those misleading "errors".
 */

// Store the original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Messages to filter out (these are INFO messages, not actual errors)
const FILTERED_MESSAGES = [
  'INFO: Created TensorFlow Lite XNNPACK delegate for CPU',
  'Created TensorFlow Lite XNNPACK delegate for CPU',
  'XNNPACK delegate',
];

/**
 * Check if a message should be filtered
 */
function shouldFilterMessage(args: any[]): boolean {
  const message = args.join(' ');
  return FILTERED_MESSAGES.some(filtered => 
    message.includes(filtered)
  );
}

/**
 * Initialize the console filter
 * Call this once at app startup
 */
export function initConsoleFilter() {
  // Override console.error
  console.error = (...args: any[]) => {
    if (!shouldFilterMessage(args)) {
      originalConsoleError.apply(console, args);
    }
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    if (!shouldFilterMessage(args)) {
      originalConsoleWarn.apply(console, args);
    }
  };
}

/**
 * Restore original console methods (for cleanup if needed)
 */
export function restoreConsole() {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}



