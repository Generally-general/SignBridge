/**
 * Constants used throughout the application
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const AUTH_TOKEN_KEY = 'signbridge_token';
export const AUTH_USER_KEY = 'signbridge_user';

export const CALL_STATUS = {
  IDLE: 'idle',
  RINGING: 'ringing',
  ACTIVE: 'active',
  ENDED: 'ended',
};

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',

  // Calls
  CALLS_INITIATE: '/calls/initiate',
  CALLS_ANSWER: '/calls/:id/answer',
  CALLS_REJECT: '/calls/:id/reject',
  CALLS_END: '/calls/:id/end',
  CALLS_HISTORY: '/calls/history',
  CALLS_TRANSLATION: '/calls/:id/translation',

  // Contacts
  CONTACTS: '/contacts',
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_EXISTS: 'Email already registered.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email.',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters.',
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  SIGNUP_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully!',
};
