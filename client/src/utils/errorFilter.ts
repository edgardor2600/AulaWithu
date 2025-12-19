/**
 * Error Filter for Console
 * This script filters out known external errors that don't affect the application
 */

// Save original console.error
const originalError = console.error;

// Override console.error to filter out specific errors
console.error = function(...args) {
  const errorMessage = args.join(' ');
  
  // Filter out share-modal.js errors (external script)
  if (errorMessage.includes('share-modal.js')) {
    // Silently ignore this error
    return;
  }
  
  // Filter out other known external errors if needed
  // Add more filters here as needed
  
  // Call original console.error for all other errors
  originalError.apply(console, args);
};

// Optional: Also filter console.warn if needed
const originalWarn = console.warn;
console.warn = function(...args) {
  const warnMessage = args.join(' ');
  
  if (warnMessage.includes('share-modal.js')) {
    return;
  }
  
  originalWarn.apply(console, args);
};

export {};
