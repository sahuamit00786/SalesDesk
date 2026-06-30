import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL || 'http://10.0.2.2:4000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token + workspace header
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    const workspaceId = await AsyncStorage.getItem('workspaceId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (workspaceId) {
      config.headers['x-workspace-id'] = workspaceId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: 401 → clear storage + redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user', 'workspaceId']);
      // Navigation reset handled in authStore via listener
      if (global.__navigationRef?.isReady()) {
        global.__navigationRef.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

const normalizeError = (error) => {
  if (error.response) {
    return {
      success: false,
      data: null,
      message: error.response.data?.message || 'Server error',
      errors: error.response.data?.errors || [],
      status: error.response.status,
    };
  }
  if (error.request) {
    return {
      success: false,
      data: null,
      message: 'Network error — check your connection',
      errors: [],
      status: 0,
    };
  }
  return {
    success: false,
    data: null,
    message: error.message || 'Unknown error',
    errors: [],
    status: -1,
  };
};

export const setNavigationRef = (ref) => {
  global.__navigationRef = ref;
};

export default api;
