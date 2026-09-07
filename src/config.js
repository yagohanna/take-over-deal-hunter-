// Public connection settings only. Never add credentials to browser code.
export const PRODUCTION_API_BASE_URL = 'https://takeover-deal-hunter-backend.onrender.com';
const local = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
export const API_BASE_URL = local ? 'http://127.0.0.1:8000' : PRODUCTION_API_BASE_URL;
export const REQUEST_TIMEOUT_MS = 75_000;
export const SLOW_REQUEST_MS = 4_000;
