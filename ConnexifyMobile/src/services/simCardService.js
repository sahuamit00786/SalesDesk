import { NativeModules, Platform } from 'react-native';
import api from './api';

const { SimCardModule } = NativeModules;

// Returns [{subscriptionId, slotIndex, carrierName, displayName, number}]
export const getSimCards = async () => {
  if (Platform.OS !== 'android' || !SimCardModule) return [];
  try {
    return await SimCardModule.getSimCards();
  } catch {
    return [];
  }
};

// subscriptionId = -1 → all SIMs
export const getCallLogsForSim = async (subscriptionId = -1, limit = 1000) => {
  if (Platform.OS !== 'android' || !SimCardModule) return [];
  try {
    return await SimCardModule.getCallLogsForSim(subscriptionId, limit);
  } catch {
    return [];
  }
};

// Push a single call record to the CRM /calls endpoint
export const syncCallToCrm = async ({ leadId, callType, duration, outcome, notes, simLabel }) => {
  const res = await api.post('/calls', {
    leadId,
    callType,
    duration,
    outcome,
    notes: notes || null,
    simLabel: simLabel || null,
  });
  return res.data;
};

// Fetch CRM call logs
export const getCrmCallLogs = async (params = {}) => {
  const res = await api.get('/calls', { params });
  return res.data;
};
