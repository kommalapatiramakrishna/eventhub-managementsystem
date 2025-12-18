/**
 * Logger Utility
 * Centralized logging for the application
 */

class Logger {
  static info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data ? data : '');
  }

  static error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error ? error : '');
  }

  static warn(message, data = null) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data ? data : '');
  }

  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] DEBUG: ${message}`, data ? data : '');
    }
  }
}

module.exports = Logger;