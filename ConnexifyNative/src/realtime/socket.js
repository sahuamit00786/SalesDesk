import { io } from 'socket.io-client';
import { AppState } from 'react-native';
import { API_BASE_URL } from '@env';

/**
 * Realtime client — one authenticated socket per signed-in session.
 *
 * Rules:
 *  - Connects ONLY while authed and the app is foregrounded (battery + no
 *    stale-token reconnect storms in the background). On background → disconnect;
 *    on foreground → reconnect with the CURRENT access token.
 *  - Token is provided lazily via `auth` callback, so every (re)connect uses
 *    the freshest token after interceptor refreshes.
 *  - Zero coupling to stores: bound once from bootstrap, same pattern as
 *    api/client.js bindSession().
 */

const SOCKET_URL = (API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');

let socket = null;
let getToken = () => null;
let appStateSub = null;
const listeners = new Map(); // event → Set<fn>

export function bindRealtimeSession({ getAccessToken }) {
  getToken = getAccessToken || getToken;
}

function attachRegisteredListeners(s) {
  for (const [event, fns] of listeners) {
    for (const fn of fns) s.on(event, fn);
  }
}

export function connectRealtime() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: (cb) => cb({ token: getToken() }), // evaluated on EVERY (re)connect
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    timeout: 10000,
  });
  attachRegisteredListeners(socket);

  // Foreground-only policy
  appStateSub?.remove();
  appStateSub = AppState.addEventListener('change', (state) => {
    if (!socket) return;
    if (state === 'active' && !socket.connected) socket.connect();
    if (state !== 'active' && socket.connected) socket.disconnect();
  });

  return socket;
}

export function disconnectRealtime() {
  appStateSub?.remove();
  appStateSub = null;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Subscribe; returns an unsubscribe fn. Safe to call before connect. */
export function onRealtime(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  socket?.on(event, fn);
  return () => {
    listeners.get(event)?.delete(fn);
    socket?.off(event, fn);
  };
}

export function isRealtimeConnected() {
  return Boolean(socket?.connected);
}
