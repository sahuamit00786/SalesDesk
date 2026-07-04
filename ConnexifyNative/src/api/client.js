import axios from 'axios';
import { API_BASE_URL } from '@env';
import { unwrap, toApiError } from './envelope';
import { refreshSession } from './refresh';

const BASE_URL = API_BASE_URL || 'http://localhost:4000/api/v1';

// Set by stores at bootstrap — keeps this module free of store imports (no cycles).
let getAccessToken = () => null;
let getWorkspaceId = () => null;
let onSessionRefreshed = () => {};
let onSessionExpired = () => {};

export function bindSession(handlers) {
  getAccessToken = handlers.getAccessToken || getAccessToken;
  getWorkspaceId = handlers.getWorkspaceId || getWorkspaceId;
  onSessionRefreshed = handlers.onSessionRefreshed || onSessionRefreshed;
  onSessionExpired = handlers.onSessionExpired || onSessionExpired;
}

const REFRESH_EXEMPT = /\/auth\/(login|register|refresh|resend-verification|verify-email|forgot-password|reset-password|invitations)/;

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const ws = getWorkspaceId();
  if (ws && !config.headers['x-workspace-id']) config.headers['x-workspace-id'] = ws;
  config.headers['Cache-Control'] = 'no-store';
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const is401 = response?.status === 401;
    const exempt = REFRESH_EXEMPT.test(config?.url || '');

    if (is401 && !exempt && config && !config._retried) {
      try {
        const session = await refreshSession(); // single-flight; rotates both tokens
        onSessionRefreshed(session);
        config._retried = true;
        config.headers.Authorization = `Bearer ${session.accessToken}`;
        return http(config);
      } catch {
        onSessionExpired();
      }
    }
    return Promise.reject(toApiError(error));
  },
);

// Convenience verbs returning { data, meta }
export const get = (url, params, config) =>
  http.get(url, { params, ...config }).then(unwrap);
export const post = (url, body, config) => http.post(url, body, config).then(unwrap);
export const put = (url, body, config) => http.put(url, body, config).then(unwrap);
export const patch = (url, body, config) => http.patch(url, body, config).then(unwrap);
export const del = (url, config) => http.delete(url, config).then(unwrap);

/** Multipart helper — fields: plain values; files: { field: {uri,name,type} | array }. */
export const postMultipart = (url, { fields = {}, files = {} }, config = {}) => {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
  });
  Object.entries(files).forEach(([field, file]) => {
    (Array.isArray(file) ? file : [file]).forEach((f) => {
      if (f?.uri) form.append(field, { uri: f.uri, name: f.name || 'file', type: f.type || 'application/octet-stream' });
    });
  });
  return http
    .post(url, form, {
      ...config,
      headers: { ...(config.headers || {}), 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
    .then(unwrap);
};
