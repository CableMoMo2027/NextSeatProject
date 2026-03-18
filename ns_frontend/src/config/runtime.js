const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const browserOrigin = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'http://localhost:5173';

export const MAIN_API_BASE = trimTrailingSlash(
  import.meta.env.VITE_API_BASE || 'https://api.cableskr.space',
) || 'https://api.cableskr.space';

export const PAYMENT_API_BASE = trimTrailingSlash(import.meta.env.VITE_PAYMENT_API_BASE || '');

export const AUTH_ACTION_URL = String(import.meta.env.VITE_AUTH_ACTION_URL || '').trim()
  || `${browserOrigin}/login`;

export const AUTH_ACTION_SETTINGS = {
  url: AUTH_ACTION_URL,
  handleCodeInApp: false,
};
