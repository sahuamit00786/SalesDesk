import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data.data || response.data;

    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(user)],
    ]);

    // Save first workspace id if present
    if (user.workspaceId) {
      await AsyncStorage.setItem('workspaceId', user.workspaceId);
    }

    return { accessToken, refreshToken, user };
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user', 'workspaceId']);
  },

  async refreshToken() {
    const refresh = await AsyncStorage.getItem('refreshToken');
    if (!refresh) throw new Error('No refresh token');
    const response = await api.post('/auth/refresh', { refreshToken: refresh });
    const { accessToken } = response.data.data || response.data;
    await AsyncStorage.setItem('accessToken', accessToken);
    return accessToken;
  },

  async getStoredUser() {
    const userStr = await AsyncStorage.getItem('user');
    const token   = await AsyncStorage.getItem('accessToken');
    if (!userStr || !token) return null;
    return { user: JSON.parse(userStr), token };
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data.data || response.data;
  },
};
