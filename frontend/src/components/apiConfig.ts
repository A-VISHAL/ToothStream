/**
 * Resolves the backend API base URL from environment variables.
 *
 * Priority:
 *   1. REACT_APP_API_BASE_URL  — set in Vercel env vars for production
 *                                e.g. https://toothstream-production.up.railway.app
 *   2. Empty string fallback   — relative /api/... paths (local dev via proxy)
 *
 * Usage:
 *   import { apiBaseUrl } from './apiConfig';
 *   const endpoint = `${apiBaseUrl}/api/whisper-verify`;
 */
function resolveApiBaseUrl(): string {
  const url = (process.env.REACT_APP_API_BASE_URL ?? '').replace(/\/$/, '');

  console.info('API_BASE_URL_SELECTED', {
    url: url || '(relative — local dev)',
    source: process.env.REACT_APP_API_BASE_URL
      ? 'REACT_APP_API_BASE_URL'
      : 'fallback_relative',
  });

  return url;
}

export const apiBaseUrl = resolveApiBaseUrl();
