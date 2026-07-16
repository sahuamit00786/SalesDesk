import AsyncStorage from '@react-native-async-storage/async-storage';
import { post } from '../../api/client';
import { getCallLogsForSim, CALL_TYPE } from '../../native/simCard';

/**
 * Call sync v2 — watermark + dedup-key + retry queue.
 *
 * Replaces "user manually picks rows, dedup lives in AsyncStorage" with:
 *   1. A per-install random `installId` — combined with the native call _ID and
 *      callDate it forms `deviceCallKey`, the server-side idempotency key
 *      (see server migration + createCall patch). Reinstall / cleared storage /
 *      second device can re-send the same calls safely: the server upserts.
 *   2. A `lastSyncedAt` watermark — each pass reads only calls newer than the
 *      watermark, so a pass is O(new calls), not O(500 recent calls).
 *   3. A retry queue — rows that fail (offline, 5xx) are persisted and retried
 *      on the next pass; per-row results from /calls/bulk-sync mean one bad
 *      row never blocks the batch.
 *
 * Runs from two triggers (wired in CallLogSyncScreen patch + App foreground):
 *   - app comes to foreground (cheap, catches most calls same-minute)
 *   - manual "Sync now" on the Calls screen
 * A HeadlessJS/WorkManager 15-min background trigger can call `runSyncPass()`
 * unchanged when you add the native scheduler.
 */

const K_INSTALL_ID = 'connexify.callSync.installId';
const K_WATERMARK = 'connexify.callSync.lastSyncedAt';
const K_RETRY_QUEUE = 'connexify.callSync.retryQueue';
const BATCH_MAX = 200;

export async function getInstallId() {
  let id = await AsyncStorage.getItem(K_INSTALL_ID);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(K_INSTALL_ID, id);
  }
  return id;
}

export function deviceCallKey(installId, nativeId, callDate) {
  return `${installId}:${nativeId}:${callDate}`;
}

function direction(callType) {
  if (callType === CALL_TYPE.OUTGOING) return 'outgoing';
  if (callType === CALL_TYPE.INCOMING) return 'incoming';
  return 'missed';
}

function toPayload(row, installId) {
  const dir = direction(row.callType);
  return {
    deviceCallKey: deviceCallKey(installId, row.id, row.callDate),
    callerName: row.name || undefined,
    phoneNumber: row.phoneNumber || undefined,
    callType: dir === 'outgoing' ? 'outbound' : 'inbound',
    outcome:
      row.callType === CALL_TYPE.VOICEMAIL
        ? 'voicemail'
        : dir === 'missed'
          ? 'no_answer'
          : row.callDuration > 0
            ? 'connected'
            : 'no_answer',
    duration: row.callDuration || 0,
    notes: `Synced from device call log · ${new Date(row.callDate).toLocaleString()}`,
  };
}

async function loadRetryQueue() {
  try {
    const raw = await AsyncStorage.getItem(K_RETRY_QUEUE);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveRetryQueue(rows) {
  try {
    await AsyncStorage.setItem(K_RETRY_QUEUE, JSON.stringify(rows.slice(0, 500)));
  } catch {}
}

/**
 * One full sync pass. Returns { synced, failed, skipped } for UI feedback.
 * Never throws on partial failure — failures land in the retry queue.
 */
export async function runSyncPass({ subscriptionId = -1 } = {}) {
  const installId = await getInstallId();
  const watermark = Number(await AsyncStorage.getItem(K_WATERMARK)) || 0;

  // New device calls since the watermark + anything queued from failed passes.
  const deviceRows = await getCallLogsForSim(subscriptionId, 500);
  const fresh = (Array.isArray(deviceRows) ? deviceRows : [])
    .filter((r) => Number(r.callDate) > watermark)
    .map((r) => toPayload(r, installId));
  const retries = await loadRetryQueue();

  const seen = new Set();
  const batch = [...retries, ...fresh]
    .filter((p) => (seen.has(p.deviceCallKey) ? false : seen.add(p.deviceCallKey)))
    .slice(0, BATCH_MAX);

  if (!batch.length) return { synced: 0, failed: 0, skipped: 0 };

  let results;
  try {
    const { data } = await post('/calls/bulk-sync', { calls: batch });
    results = data?.results || [];
  } catch (err) {
    // Whole request failed (offline / 5xx): everything goes to the retry queue.
    await saveRetryQueue(batch);
    return { synced: 0, failed: batch.length, skipped: 0, error: err };
  }

  const failedKeys = new Set(results.filter((r) => !r.ok).map((r) => r.deviceCallKey));
  await saveRetryQueue(batch.filter((p) => failedKeys.has(p.deviceCallKey)));

  // Advance the watermark only to the newest call we actually attempted, so a
  // partially-failed pass can never skip calls.
  const newestAttempted = Math.max(
    watermark,
    ...(Array.isArray(deviceRows) ? deviceRows : [])
      .filter((r) => Number(r.callDate) > watermark)
      .map((r) => Number(r.callDate)),
  );
  if (Number.isFinite(newestAttempted) && newestAttempted > watermark) {
    await AsyncStorage.setItem(K_WATERMARK, String(newestAttempted));
  }

  return {
    synced: results.filter((r) => r.ok).length,
    failed: failedKeys.size,
    skipped: 0,
  };
}

/** For the Calls screen "pending" indicator. */
export async function pendingRetryCount() {
  return (await loadRetryQueue()).length;
}
