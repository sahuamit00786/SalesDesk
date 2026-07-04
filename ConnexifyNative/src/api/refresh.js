import axios from 'axios';
import { API_BASE_URL } from '@env';
import { loadTokens, saveTokens } from './tokenStore';
import { toApiError } from './envelope';

const BASE_URL = API_BASE_URL || 'http://localhost:4000/api/v1';

// Single-flight refresh — port of web baseQueryWithReauth (client/src/features/api/baseApi.js).
// Server rotates BOTH tokens and returns the user (authController.refresh).
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh() {
  const tokens = await loadTokens();
  if (!tokens?.refreshToken) {
    const err = new Error('No refresh token');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  try {
    // Bare axios: no interceptors → no recursion into the 401 handler
    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refreshToken: tokens.refreshToken },
      { timeout: 15000 },
    );
    const data = res.data?.data;
    if (!data?.accessToken) throw new Error('Malformed refresh response');
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data; // { user, accessToken, refreshToken }
  } catch (e) {
    throw toApiError(e);
  }
}
