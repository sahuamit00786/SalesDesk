import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// react-native-call-log exposes CallLog module
const CallLog = NativeModules.CallLog;

export const CALL_TYPES = {
  1: 'incoming',
  2: 'outgoing',
  3: 'missed',
  4: 'voicemail',
  5: 'rejected',
  6: 'blocked',
};

export const requestCallLogPermission = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: 'Call Log Permission',
        message: 'Connexify needs access to your call history to sync call records with leads.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

export const getCallLogs = async (options = {}) => {
  if (Platform.OS !== 'android') return [];
  const { limit = 500, offset = 0 } = options;
  try {
    // react-native-call-log API: CallLog.load(limit, offset, filter, successCb, errorCb)
    return await new Promise((resolve, reject) => {
      CallLog.load(limit, offset, null, (data) => resolve(JSON.parse(data)), (err) => reject(new Error(err)));
    });
  } catch {
    return [];
  }
};

export const callSyncService = { requestCallLogPermission, getCallLogs, CALL_TYPES };
