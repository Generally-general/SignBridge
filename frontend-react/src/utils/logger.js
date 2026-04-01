/**
 * Logger utility for consistent console output
 */

const isDev = import.meta.env.DEV;

const colors = {
  reset: '\x1b[0m',
  info: '\x1b[36m',
  success: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const log = {
  info: (message, data) => {
    if (isDev) {
      console.log(`${colors.info}[INFO]${colors.reset}`, message, data || '');
    }
  },

  success: (message, data) => {
    if (isDev) {
      console.log(`${colors.success}[SUCCESS]${colors.reset}`, message, data || '');
    }
  },

  warn: (message, data) => {
    if (isDev) {
      console.warn(`${colors.warn}[WARN]${colors.reset}`, message, data || '');
    }
  },

  error: (message, data) => {
    console.error(`${colors.error}[ERROR]${colors.reset}`, message, data || '');
  },
};

export default log;
