import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { SimCardModule } = NativeModules;

// android.provider.CallLog.Calls.TYPE values.
export const CALL_TYPE = {
  INCOMING: 1,
  OUTGOING: 2,
  MISSED: 3,
  VOICEMAIL: 4,
  REJECTED: 5,
  BLOCKED: 6,
};

export async function requestCallLogPermissions() {
  if (Platform.OS !== 'android') return false;
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  ]);
  return (
    granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED &&
    granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export async function hasCallLogPermissions() {
  if (Platform.OS !== 'android') return false;
  const [callLog, phoneState] = await Promise.all([
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG),
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE),
  ]);
  return callLog && phoneState;
}

/** [{ subscriptionId, slotIndex, carrierName, displayName, number, iconTint }] */
export function getSimCards() {
  if (!SimCardModule) return Promise.resolve([]);
  return SimCardModule.getSimCards();
}

/** subscriptionId -1 = all SIMs. Returns [{ id, phoneNumber, name, callType, callDate, callDuration, subscriptionId }] */
export function getCallLogsForSim(subscriptionId, limit = 500) {
  if (!SimCardModule) return Promise.resolve([]);
  return SimCardModule.getCallLogsForSim(subscriptionId, limit);
}
