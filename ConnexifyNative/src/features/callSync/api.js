import { leadsApi } from '../leads/api';
import { callsApi } from '../calls/api';
import { phoneKey } from '../../utils/phone';
import { CALL_TYPE } from '../../native/simCard';

const INDEX_PAGE_LIMIT = 200;
const INDEX_MAX_PAGES = 5; // caps the phone-match scan at ~1000 leads per workspace

/**
 * Builds a phoneKey → lead map for the active workspace so device call numbers
 * can be matched to a lead without a server-side phone search endpoint.
 */
export async function buildLeadPhoneIndex() {
  const index = new Map();
  let page = 1;
  while (page <= INDEX_MAX_PAGES) {
    const { data } = await leadsApi.list({ page, limit: INDEX_PAGE_LIMIT });
    const rows = Array.isArray(data) ? data : [];
    for (const lead of rows) {
      const primary = phoneKey(lead.phone);
      const alt = phoneKey(lead.altPhone);
      if (primary && !index.has(primary)) index.set(primary, lead);
      if (alt && !index.has(alt)) index.set(alt, lead);
    }
    if (rows.length < INDEX_PAGE_LIMIT) break;
    page += 1;
  }
  return index;
}

export function matchLeadForNumber(index, phoneNumber) {
  const key = phoneKey(phoneNumber);
  if (!key) return null;
  return index.get(key) || null;
}

/** incoming|outgoing|missed bucket for a raw android.provider.CallLog.Calls.TYPE. */
export function callDirection(callType) {
  if (callType === CALL_TYPE.OUTGOING) return 'outgoing';
  if (callType === CALL_TYPE.INCOMING) return 'incoming';
  return 'missed'; // MISSED, VOICEMAIL, REJECTED, BLOCKED all read as unanswered
}

const DIRECTION_TO_CALL_TYPE = {
  incoming: 'inbound',
  outgoing: 'outbound',
  missed: 'inbound',
};

function outcomeForDeviceCall(callType, durationSeconds) {
  if (callType === CALL_TYPE.VOICEMAIL) return 'voicemail';
  if (callDirection(callType) === 'missed') return 'no_answer';
  return durationSeconds > 0 ? 'connected' : 'no_answer';
}

/**
 * Creates a CallLog from a device call-log entry. leadId is optional — when the
 * number doesn't match any lead, the call still syncs as an orphan record
 * (callerName/phoneNumber kept) so it shows up in Calls under "No lead" and
 * can be converted into a Lead/Opportunity later.
 */
export function syncDeviceCall({ leadId, name, phoneNumber, callType, callDate, callDuration }) {
  return callsApi.create({
    leadId: leadId || undefined,
    callerName: name || undefined,
    phoneNumber: phoneNumber || undefined,
    callType: DIRECTION_TO_CALL_TYPE[callDirection(callType)] || 'outbound',
    outcome: outcomeForDeviceCall(callType, callDuration),
    duration: callDuration || 0,
    source: 'device_sync',
    notes: `Synced from device call log · ${new Date(callDate).toLocaleString()}`,
  });
}
